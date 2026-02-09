"""
GİB 5 Milyon TL Üstü Vergi Borçluları Listesi Servisi

VUK Md.5 kapsamında GİB tarafından kamuoyuyla paylaşılan vergi borçluları listesini
çeker ve veritabanında indeksler.

Kaynak: https://www.gib.gov.tr/duyurular
Yasal Dayanak: 213 Sayılı VUK Madde 5

⚠️ HARDCODED/MOCK/DEMO YASAK - SADECE GERÇEK VERİ
"""

import asyncio
import aiohttp
import logging
import re
import hashlib
import ssl
import certifi
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import json
import sqlite3
from bs4 import BeautifulSoup
import io

# PDF parsing
try:
    import pdfplumber
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

# Excel parsing
try:
    import openpyxl
    EXCEL_AVAILABLE = True
except ImportError:
    EXCEL_AVAILABLE = False

logger = logging.getLogger(__name__)

@dataclass
class BorcluMukellef:
    """Vergi borçlusu mükellef bilgisi"""
    vkn: str
    unvan: str
    vergi_dairesi: str
    il: str
    borc_tutari: float
    borc_turu: str  # "kesinlesen" veya "vadesi_gecmis"
    liste_tarihi: str
    kaynak_url: str
    guven_skoru: float = 1.0  # GİB resmi kaynak = %100 güvenilir

@dataclass
class BorcluListesiSonuc:
    """Borçlu listesi sorgulama sonucu"""
    vkn: str
    borclu_mu: bool
    mukellef: Optional[BorcluMukellef] = None
    sorgulama_tarihi: str = field(default_factory=lambda: datetime.now().isoformat())
    kaynak: str = "GIB_VUK_MD5"
    hata: Optional[str] = None


class GibBorcluListesiServisi:
    """
    GİB Vergi Borçluları Listesi Servisi

    VUK Md.5 kapsamında 5 milyon TL ve üzeri vergi borcu olan mükelleflerin
    listesini GİB'den çeker ve yerel veritabanında indeksler.
    """

    GIB_DUYURULAR_URL = "https://www.gib.gov.tr/duyurular"
    GIB_BASE_URL = "https://www.gib.gov.tr"

    # Borçlu listesi arama pattern'leri
    BORCLU_LISTE_PATTERNS = [
        r"5.*milyon.*tl.*borç",
        r"vergi.*borcu.*bulunan.*mükellef",
        r"vuk.*5.*madde",
        r"kesinleşen.*vergi.*ceza",
    ]

    def __init__(self, db_path: str = None):
        """
        Args:
            db_path: SQLite veritabanı yolu. None ise bellekte tutulur.
        """
        self.db_path = db_path or ":memory:"
        self._init_database()
        self._cache: Dict[str, BorcluListesiSonuc] = {}
        self._cache_ttl = timedelta(hours=24)  # 24 saat cache
        self._last_update: Optional[datetime] = None

    def _init_database(self):
        """Veritabanını oluştur"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Borçlu mükellefler tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS gib_borclu_mukellefler (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vkn TEXT UNIQUE NOT NULL,
                unvan TEXT,
                vergi_dairesi TEXT,
                il TEXT,
                borc_tutari REAL,
                borc_turu TEXT,
                liste_tarihi TEXT,
                kaynak_url TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # VKN indeksi
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_borclu_vkn ON gib_borclu_mukellefler(vkn)
        """)

        # Güncelleme log tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS gib_liste_guncelleme_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guncelleme_tarihi TEXT,
                kaynak_url TEXT,
                mukellef_sayisi INTEGER,
                toplam_borc REAL,
                durum TEXT,
                hata_mesaji TEXT
            )
        """)

        conn.commit()
        conn.close()
        logger.info(f"[GibBorcluListesi] Veritabanı hazır: {self.db_path}")

    async def guncelle_liste(self, force: bool = False) -> Dict:
        """
        GİB'den borçlu listesini güncelle

        Args:
            force: True ise cache'i yoksay, zorla güncelle

        Returns:
            Güncelleme sonucu
        """
        # Son güncelleme kontrolü
        if not force and self._last_update:
            if datetime.now() - self._last_update < timedelta(hours=6):
                logger.info("[GibBorcluListesi] Liste güncel, güncelleme atlanıyor")
                return {"durum": "guncel", "son_guncelleme": self._last_update.isoformat()}

        logger.info("[GibBorcluListesi] GİB'den borçlu listesi güncelleniyor...")

        try:
            # 1. GİB duyurular sayfasından borçlu listesi linklerini bul
            liste_linkleri = await self._bul_borclu_liste_linkleri()

            if not liste_linkleri:
                logger.warning("[GibBorcluListesi] Borçlu listesi linki bulunamadı")
                return {"durum": "hata", "mesaj": "Liste linki bulunamadı"}

            # 2. Her listeyi indir ve parse et
            toplam_mukellef = 0
            toplam_borc = 0.0

            for link_info in liste_linkleri[:3]:  # Son 3 listeyi al
                try:
                    mukellefler = await self._indir_ve_parse_liste(link_info)

                    if mukellefler:
                        # Veritabanına kaydet
                        kaydedilen = self._kaydet_veritabanina(mukellefler, link_info["url"])
                        toplam_mukellef += kaydedilen
                        toplam_borc += sum(m.borc_tutari for m in mukellefler)

                except Exception as e:
                    logger.error(f"[GibBorcluListesi] Liste parse hatası: {link_info['url']} - {e}")
                    continue

            # Güncelleme logla
            self._logla_guncelleme(
                kaynak_url=liste_linkleri[0]["url"] if liste_linkleri else "",
                mukellef_sayisi=toplam_mukellef,
                toplam_borc=toplam_borc,
                durum="basarili"
            )

            self._last_update = datetime.now()
            self._cache.clear()  # Cache'i temizle

            return {
                "durum": "basarili",
                "mukellef_sayisi": toplam_mukellef,
                "toplam_borc": toplam_borc,
                "guncelleme_tarihi": self._last_update.isoformat()
            }

        except Exception as e:
            logger.error(f"[GibBorcluListesi] Güncelleme hatası: {e}")
            self._logla_guncelleme(
                kaynak_url="",
                mukellef_sayisi=0,
                toplam_borc=0,
                durum="hata",
                hata_mesaji=str(e)
            )
            return {"durum": "hata", "mesaj": str(e)}

    def _create_ssl_context(self):
        """SSL context oluştur (certifi ile)"""
        return ssl.create_default_context(cafile=certifi.where())

    async def _bul_borclu_liste_linkleri(self) -> List[Dict]:
        """GİB duyurular sayfasından borçlu listesi linklerini bul"""
        linkleri = []
        ssl_ctx = self._create_ssl_context()

        try:
            async with aiohttp.ClientSession() as session:
                # GİB duyurular sayfasını çek
                async with session.get(
                    self.GIB_DUYURULAR_URL,
                    headers={"User-Agent": "LYNTOS/2.0 SMMM Mali Analiz Platformu"},
                    timeout=aiohttp.ClientTimeout(total=30),
                    ssl=ssl_ctx
                ) as response:
                    if response.status != 200:
                        logger.error(f"[GibBorcluListesi] GİB sayfası erişilemedi: {response.status}")
                        return linkleri

                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')

                    # Duyuru linklerini tara
                    for link in soup.find_all('a', href=True):
                        href = link.get('href', '')
                        text = link.get_text().lower()

                        # Borçlu listesi pattern'lerini kontrol et
                        for pattern in self.BORCLU_LISTE_PATTERNS:
                            if re.search(pattern, text, re.IGNORECASE):
                                full_url = href if href.startswith('http') else f"{self.GIB_BASE_URL}{href}"
                                linkleri.append({
                                    "url": full_url,
                                    "baslik": link.get_text().strip(),
                                    "tarih": self._extract_tarih(text)
                                })
                                break

                    # Alternatif: Bilinen URL pattern'leri
                    # GİB genelde şu formatta yayınlıyor:
                    # /5-milyon-tlyi-asan-vergi-ve-ceza-borcu-bulunan-mukelleflerin-listesi

        except Exception as e:
            logger.error(f"[GibBorcluListesi] Link arama hatası: {e}")

        # Bilinen URL'leri de ekle (fallback)
        known_urls = [
            {
                "url": "https://www.gib.gov.tr/5-milyon-tlyi-asan-vergi-ve-ceza-borcu-bulunan-mukelleflerin-listesi",
                "baslik": "5 Milyon TL'yi Aşan Vergi ve Ceza Borcu Bulunan Mükelleflerin Listesi",
                "tarih": "2024"
            }
        ]

        for known in known_urls:
            if not any(l["url"] == known["url"] for l in linkleri):
                linkleri.append(known)

        logger.info(f"[GibBorcluListesi] {len(linkleri)} borçlu listesi linki bulundu")
        return linkleri

    async def _indir_ve_parse_liste(self, link_info: Dict) -> List[BorcluMukellef]:
        """Borçlu listesini indir ve parse et"""
        mukellefler = []
        url = link_info["url"]
        ssl_ctx = self._create_ssl_context()

        try:
            async with aiohttp.ClientSession() as session:
                # Önce sayfayı çek
                async with session.get(
                    url,
                    headers={"User-Agent": "LYNTOS/2.0 SMMM Mali Analiz Platformu"},
                    timeout=aiohttp.ClientTimeout(total=60),
                    ssl=ssl_ctx
                ) as response:
                    if response.status != 200:
                        return mukellefler

                    content_type = response.headers.get('content-type', '')

                    # PDF dosyası
                    if 'pdf' in content_type.lower() or url.endswith('.pdf'):
                        if PDF_AVAILABLE:
                            content = await response.read()
                            mukellefler = self._parse_pdf(content, link_info)

                    # Excel dosyası
                    elif 'excel' in content_type.lower() or url.endswith(('.xlsx', '.xls')):
                        if EXCEL_AVAILABLE:
                            content = await response.read()
                            mukellefler = self._parse_excel(content, link_info)

                    # HTML sayfası - içinde tablo veya dosya linki olabilir
                    else:
                        html = await response.text()
                        mukellefler = await self._parse_html_sayfa(html, link_info, session)

        except Exception as e:
            logger.error(f"[GibBorcluListesi] İndirme hatası: {url} - {e}")

        return mukellefler

    async def _parse_html_sayfa(self, html: str, link_info: Dict, session: aiohttp.ClientSession) -> List[BorcluMukellef]:
        """HTML sayfasından borçlu bilgilerini çıkar"""
        mukellefler = []
        soup = BeautifulSoup(html, 'html.parser')

        # 1. Tablolardan veri çıkar
        for table in soup.find_all('table'):
            rows = table.find_all('tr')
            for row in rows[1:]:  # Başlık satırını atla
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 4:
                    try:
                        mukellef = self._parse_tablo_satiri(cells, link_info)
                        if mukellef:
                            mukellefler.append(mukellef)
                    except Exception:
                        continue

        # 2. İçerideki dosya linklerini bul ve indir
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            if any(ext in href.lower() for ext in ['.pdf', '.xlsx', '.xls']):
                try:
                    full_url = href if href.startswith('http') else f"{self.GIB_BASE_URL}{href}"
                    async with session.get(full_url, timeout=aiohttp.ClientTimeout(total=60)) as resp:
                        if resp.status == 200:
                            content = await resp.read()

                            if '.pdf' in href.lower() and PDF_AVAILABLE:
                                mukellefler.extend(self._parse_pdf(content, link_info))
                            elif any(ext in href.lower() for ext in ['.xlsx', '.xls']) and EXCEL_AVAILABLE:
                                mukellefler.extend(self._parse_excel(content, link_info))
                except Exception as e:
                    logger.warning(f"[GibBorcluListesi] Dosya indirme hatası: {href} - {e}")

        return mukellefler

    def _parse_pdf(self, content: bytes, link_info: Dict) -> List[BorcluMukellef]:
        """PDF dosyasından borçlu bilgilerini çıkar"""
        mukellefler = []

        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    # Tabloları çıkar
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table[1:]:  # Başlık satırını atla
                            if row and len(row) >= 4:
                                mukellef = self._parse_tablo_satiri_raw(row, link_info)
                                if mukellef:
                                    mukellefler.append(mukellef)

                    # Metin olarak da tara (tablo yoksa)
                    if not tables:
                        text = page.extract_text()
                        if text:
                            mukellefler.extend(self._parse_text_icerigi(text, link_info))

        except Exception as e:
            logger.error(f"[GibBorcluListesi] PDF parse hatası: {e}")

        return mukellefler

    def _parse_excel(self, content: bytes, link_info: Dict) -> List[BorcluMukellef]:
        """Excel dosyasından borçlu bilgilerini çıkar"""
        mukellefler = []

        try:
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True)

            for sheet in wb.worksheets:
                rows = list(sheet.iter_rows(values_only=True))

                # Başlık satırını bul
                header_row = None
                for i, row in enumerate(rows[:5]):
                    if row and any('vkn' in str(cell).lower() or 'vergi' in str(cell).lower() for cell in row if cell):
                        header_row = i
                        break

                start_row = (header_row + 1) if header_row is not None else 1

                for row in rows[start_row:]:
                    if row and any(cell for cell in row):
                        mukellef = self._parse_excel_satiri(row, link_info)
                        if mukellef:
                            mukellefler.append(mukellef)

        except Exception as e:
            logger.error(f"[GibBorcluListesi] Excel parse hatası: {e}")

        return mukellefler

    def _parse_tablo_satiri(self, cells, link_info: Dict) -> Optional[BorcluMukellef]:
        """HTML tablo satırından mükellef bilgisi çıkar"""
        try:
            # Hücre içeriklerini al
            values = [cell.get_text().strip() for cell in cells]
            return self._parse_tablo_satiri_raw(values, link_info)
        except Exception:
            return None

    def _parse_tablo_satiri_raw(self, values: List, link_info: Dict) -> Optional[BorcluMukellef]:
        """Ham tablo satırından mükellef bilgisi çıkar"""
        try:
            if len(values) < 4:
                return None

            # VKN'yi bul (10-11 haneli sayı)
            vkn = None
            unvan = None
            vergi_dairesi = None
            il = None
            borc_tutari = 0.0

            for i, val in enumerate(values):
                val_str = str(val).strip() if val else ""

                # VKN: 10-11 haneli sayı
                if re.match(r'^\d{10,11}$', val_str):
                    vkn = val_str

                # Tutar: Sayısal değer (TL içerebilir)
                elif re.search(r'[\d.,]+', val_str) and ('tl' in val_str.lower() or re.search(r'^\d{1,3}([.,]\d{3})*([.,]\d{2})?$', val_str)):
                    try:
                        tutar_str = re.sub(r'[^\d,.]', '', val_str)
                        tutar_str = tutar_str.replace('.', '').replace(',', '.')
                        tutar = float(tutar_str)
                        if tutar > borc_tutari:
                            borc_tutari = tutar
                    except ValueError:
                        pass

                # Unvan: En uzun metin (VKN ve tutar değilse)
                elif len(val_str) > 10 and not re.match(r'^[\d.,]+$', val_str):
                    if not unvan or len(val_str) > len(unvan):
                        unvan = val_str

            if vkn and borc_tutari >= 5_000_000:  # 5M TL minimum
                return BorcluMukellef(
                    vkn=vkn,
                    unvan=unvan or "Bilinmiyor",
                    vergi_dairesi=vergi_dairesi or "",
                    il=il or "",
                    borc_tutari=borc_tutari,
                    borc_turu="kesinlesen",
                    liste_tarihi=link_info.get("tarih", datetime.now().strftime("%Y-%m-%d")),
                    kaynak_url=link_info["url"]
                )

        except Exception:
            pass

        return None

    def _parse_excel_satiri(self, row: tuple, link_info: Dict) -> Optional[BorcluMukellef]:
        """Excel satırından mükellef bilgisi çıkar"""
        return self._parse_tablo_satiri_raw(list(row), link_info)

    def _parse_text_icerigi(self, text: str, link_info: Dict) -> List[BorcluMukellef]:
        """Metin içeriğinden borçlu bilgilerini çıkar (regex ile)"""
        mukellefler = []

        # VKN + Unvan + Tutar pattern'i
        # Örnek: "1234567890 ABC LTD ŞTİ 15.000.000,00 TL"
        pattern = r'(\d{10,11})\s+(.+?)\s+([\d.,]+)\s*(?:TL|tl)?'

        for match in re.finditer(pattern, text):
            try:
                vkn = match.group(1)
                unvan = match.group(2).strip()
                tutar_str = match.group(3).replace('.', '').replace(',', '.')
                tutar = float(tutar_str)

                if tutar >= 5_000_000:
                    mukellefler.append(BorcluMukellef(
                        vkn=vkn,
                        unvan=unvan,
                        vergi_dairesi="",
                        il="",
                        borc_tutari=tutar,
                        borc_turu="kesinlesen",
                        liste_tarihi=link_info.get("tarih", ""),
                        kaynak_url=link_info["url"]
                    ))
            except Exception:
                continue

        return mukellefler

    def _kaydet_veritabanina(self, mukellefler: List[BorcluMukellef], kaynak_url: str) -> int:
        """Mükellefleri veritabanına kaydet"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        kaydedilen = 0

        for m in mukellefler:
            try:
                cursor.execute("""
                    INSERT OR REPLACE INTO gib_borclu_mukellefler
                    (vkn, unvan, vergi_dairesi, il, borc_tutari, borc_turu, liste_tarihi, kaynak_url, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    m.vkn, m.unvan, m.vergi_dairesi, m.il,
                    m.borc_tutari, m.borc_turu, m.liste_tarihi,
                    kaynak_url, datetime.now().isoformat()
                ))
                kaydedilen += 1
            except Exception as e:
                logger.warning(f"[GibBorcluListesi] Kayıt hatası: {m.vkn} - {e}")

        conn.commit()
        conn.close()

        logger.info(f"[GibBorcluListesi] {kaydedilen} mükellef kaydedildi")
        return kaydedilen

    def _logla_guncelleme(self, kaynak_url: str, mukellef_sayisi: int, toplam_borc: float, durum: str, hata_mesaji: str = None):
        """Güncelleme logla"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO gib_liste_guncelleme_log
            (guncelleme_tarihi, kaynak_url, mukellef_sayisi, toplam_borc, durum, hata_mesaji)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (datetime.now().isoformat(), kaynak_url, mukellef_sayisi, toplam_borc, durum, hata_mesaji))

        conn.commit()
        conn.close()

    def _extract_tarih(self, text: str) -> str:
        """Metinden tarih çıkar"""
        # 2024, 2025 gibi yıl
        year_match = re.search(r'20\d{2}', text)
        if year_match:
            return year_match.group()
        return datetime.now().strftime("%Y")

    # ═══════════════════════════════════════════════════════════════════════════
    # PUBLIC API
    # ═══════════════════════════════════════════════════════════════════════════

    def sorgula_vkn(self, vkn: str) -> BorcluListesiSonuc:
        """
        VKN ile borçlu sorgulama

        Args:
            vkn: Vergi kimlik numarası (10-11 hane)

        Returns:
            BorcluListesiSonuc
        """
        # VKN doğrulama
        if not vkn or not re.match(r'^\d{10,11}$', vkn):
            return BorcluListesiSonuc(
                vkn=vkn,
                borclu_mu=False,
                hata="Geçersiz VKN formatı"
            )

        # Cache kontrolü
        cache_key = f"vkn_{vkn}"
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            # Cache TTL kontrolü
            cache_time = datetime.fromisoformat(cached.sorgulama_tarihi)
            if datetime.now() - cache_time < self._cache_ttl:
                return cached

        # Veritabanından sorgula
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT vkn, unvan, vergi_dairesi, il, borc_tutari, borc_turu, liste_tarihi, kaynak_url
            FROM gib_borclu_mukellefler
            WHERE vkn = ?
        """, (vkn,))

        row = cursor.fetchone()
        conn.close()

        if row:
            mukellef = BorcluMukellef(
                vkn=row[0],
                unvan=row[1],
                vergi_dairesi=row[2],
                il=row[3],
                borc_tutari=row[4],
                borc_turu=row[5],
                liste_tarihi=row[6],
                kaynak_url=row[7]
            )

            sonuc = BorcluListesiSonuc(
                vkn=vkn,
                borclu_mu=True,
                mukellef=mukellef,
                kaynak="GIB_VUK_MD5"
            )
        else:
            sonuc = BorcluListesiSonuc(
                vkn=vkn,
                borclu_mu=False,
                kaynak="GIB_VUK_MD5"
            )

        # Cache'e ekle
        self._cache[cache_key] = sonuc

        return sonuc

    def sorgula_toplu(self, vkn_listesi: List[str]) -> Dict[str, BorcluListesiSonuc]:
        """
        Toplu VKN sorgulaması

        Args:
            vkn_listesi: VKN listesi

        Returns:
            VKN -> Sonuç eşleşmesi
        """
        sonuclar = {}
        for vkn in vkn_listesi:
            sonuclar[vkn] = self.sorgula_vkn(vkn)
        return sonuclar

    def istatistikler(self) -> Dict:
        """Veritabanı istatistikleri"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Toplam mükellef sayısı
        cursor.execute("SELECT COUNT(*) FROM gib_borclu_mukellefler")
        toplam_mukellef = cursor.fetchone()[0]

        # Toplam borç
        cursor.execute("SELECT SUM(borc_tutari) FROM gib_borclu_mukellefler")
        toplam_borc = cursor.fetchone()[0] or 0

        # Son güncelleme
        cursor.execute("SELECT MAX(guncelleme_tarihi) FROM gib_liste_guncelleme_log WHERE durum = 'basarili'")
        son_guncelleme = cursor.fetchone()[0]

        # İl bazında dağılım
        cursor.execute("""
            SELECT il, COUNT(*), SUM(borc_tutari)
            FROM gib_borclu_mukellefler
            WHERE il != ''
            GROUP BY il
            ORDER BY SUM(borc_tutari) DESC
            LIMIT 10
        """)
        il_dagilimi = [{"il": row[0], "mukellef": row[1], "borc": row[2]} for row in cursor.fetchall()]

        conn.close()

        return {
            "toplam_mukellef": toplam_mukellef,
            "toplam_borc": toplam_borc,
            "son_guncelleme": son_guncelleme,
            "il_dagilimi": il_dagilimi,
            "kaynak": "GİB VUK Md.5 Listesi"
        }


# Singleton instance
_borclu_servisi: Optional[GibBorcluListesiServisi] = None

def get_borclu_servisi(db_path: str = None) -> GibBorcluListesiServisi:
    """Borçlu listesi servisi singleton'ı al"""
    global _borclu_servisi
    if _borclu_servisi is None:
        # Default: backend/data klasörüne kaydet
        if db_path is None:
            data_dir = Path(__file__).parent.parent / "data"
            data_dir.mkdir(exist_ok=True)
            db_path = str(data_dir / "gib_borclu_listesi.db")
        _borclu_servisi = GibBorcluListesiServisi(db_path)
    return _borclu_servisi


# Test
if __name__ == "__main__":
    import asyncio

    async def test():
        servis = get_borclu_servisi()

        # Listeyi güncelle
        print("Liste güncelleniyor...")
        sonuc = await servis.guncelle_liste()
        print(f"Güncelleme sonucu: {sonuc}")

        # İstatistikler
        print("\nİstatistikler:")
        print(servis.istatistikler())

        # Örnek sorgulama
        test_vkn = "1234567890"
        print(f"\n{test_vkn} sorgulanıyor...")
        sonuc = servis.sorgula_vkn(test_vkn)
        print(f"Sonuç: {sonuc}")

    asyncio.run(test())
