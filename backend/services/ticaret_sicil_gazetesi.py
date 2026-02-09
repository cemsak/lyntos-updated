"""
Ticaret Sicil Gazetesi Sorgulama Servisi

Ticaret Sicil Gazetesi (ticaretsicil.gov.tr) üzerinden:
- Şirket kuruluş ilanları
- Ortak/Yönetici değişiklikleri
- Sermaye değişiklikleri
- Tasfiye ilanları

⚠️ HARDCODED/MOCK/DEMO YASAK - SADECE GERÇEK VERİ
⚠️ KVKK UYUMLU - TOPLU VERİ TOPLAMA YASAK
⚠️ Rate limiting ve robots.txt kurallarına uygun
"""

import asyncio
import aiohttp
import logging
import re
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from pathlib import Path
from bs4 import BeautifulSoup
import hashlib
import json

logger = logging.getLogger(__name__)


@dataclass
class TsgIlan:
    """TSG ilan bilgisi"""
    ilan_no: str
    ilan_tarihi: str
    ilan_tipi: str  # KURULUS, SERMAYE_DEGISIKLIGI, ORTAK_DEGISIKLIGI, TASFIYE, DIGER
    sirket_unvan: str
    vkn: Optional[str] = None
    ticaret_sicil_no: Optional[str] = None
    ticaret_sicil_memurlugu: Optional[str] = None
    ilan_ozeti: str = ""
    kaynak_url: str = ""


@dataclass
class OrtakDegisikligi:
    """Ortak değişikliği bilgisi"""
    eski_ortak: Optional[str] = None
    yeni_ortak: Optional[str] = None
    pay_orani: Optional[float] = None
    degisiklik_tarihi: Optional[str] = None
    ilan_no: Optional[str] = None


@dataclass
class TsgSorguSonucu:
    """TSG sorgulama sonucu"""
    vkn: Optional[str]
    unvan: str
    bulundu: bool
    ilanlar: List[TsgIlan] = field(default_factory=list)
    ortak_degisiklikleri: List[OrtakDegisikligi] = field(default_factory=list)
    son_sermaye: Optional[float] = None
    faaliyet_durumu: str = "AKTIF"  # AKTIF, TASFIYEDE, KAPALI
    sorgulama_tarihi: str = field(default_factory=lambda: datetime.now().isoformat())
    kaynak: str = "TSG"
    hata: Optional[str] = None


class TicaretSicilGazetesiServisi:
    """
    Ticaret Sicil Gazetesi Sorgulama Servisi

    Kaynak: https://www.ticaretsicil.gov.tr

    ⚠️ KVKK UYUMLU:
    - Sadece tekil sorgulama (VKN veya ünvan bazlı)
    - Toplu veri toplama/scraping yapılmaz
    - Rate limiting uygulanır (1 istek/saniye)
    - Sadece kamuya açık ilan bilgileri
    """

    TSG_BASE_URL = "https://www.ticaretsicil.gov.tr"
    TSG_SEARCH_URL = "https://www.ticaretsicil.gov.tr/view/pages/SearchResult.php"

    # İlan tipi pattern'leri
    ILAN_TIPLERI = {
        "KURULUS": [
            r"kuruluş",
            r"tescil",
            r"limited şirket[i]? kurulmuştur",
            r"anonim şirket[i]? kurulmuştur"
        ],
        "SERMAYE_DEGISIKLIGI": [
            r"sermaye artırım",
            r"sermaye azaltım",
            r"sermaye değişikli",
            r"ödenmiş sermaye"
        ],
        "ORTAK_DEGISIKLIGI": [
            r"pay devr",
            r"hisse devr",
            r"ortak değişikli",
            r"ortaklık yapıs",
            r"müdür değişikli",
            r"yönetim kurulu"
        ],
        "TASFIYE": [
            r"tasfiye",
            r"fesih",
            r"terk",
            r"kapanış",
            r"sicilden silin"
        ],
        "ADRES_DEGISIKLIGI": [
            r"adres değişikli",
            r"merkez nakli",
            r"şube açılış"
        ]
    }

    def __init__(self, db_path: str = None):
        """
        Args:
            db_path: SQLite veritabanı yolu (cache için)
        """
        self.db_path = db_path or ":memory:"
        self._init_database()
        self._cache: Dict[str, TsgSorguSonucu] = {}
        self._cache_ttl = timedelta(hours=24)
        self._last_request_time = None
        self._rate_limit_delay = 1.0  # Saniye - robots.txt'e uygun

    def _init_database(self):
        """Veritabanını oluştur (cache amaçlı)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # TSG ilanları cache
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tsg_ilan_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ilan_no TEXT UNIQUE NOT NULL,
                ilan_tarihi TEXT,
                ilan_tipi TEXT,
                sirket_unvan TEXT,
                vkn TEXT,
                ticaret_sicil_no TEXT,
                ticaret_sicil_memurlugu TEXT,
                ilan_ozeti TEXT,
                kaynak_url TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_tsg_vkn ON tsg_ilan_cache(vkn)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_tsg_unvan ON tsg_ilan_cache(sirket_unvan)
        """)

        # Ortak değişiklikleri cache
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tsg_ortak_degisikligi_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ilan_no TEXT,
                vkn TEXT,
                eski_ortak TEXT,
                yeni_ortak TEXT,
                pay_orani REAL,
                degisiklik_tarihi TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ilan_no) REFERENCES tsg_ilan_cache(ilan_no)
            )
        """)

        conn.commit()
        conn.close()
        logger.info(f"[TicaretSicilGazetesi] Veritabanı hazır: {self.db_path}")

    async def _rate_limit_wait(self):
        """Rate limiting için bekle"""
        if self._last_request_time:
            elapsed = (datetime.now() - self._last_request_time).total_seconds()
            if elapsed < self._rate_limit_delay:
                await asyncio.sleep(self._rate_limit_delay - elapsed)
        self._last_request_time = datetime.now()

    async def sorgula_unvan(self, unvan: str) -> TsgSorguSonucu:
        """
        Şirket ünvanı ile TSG sorgulaması

        Args:
            unvan: Şirket ünvanı

        Returns:
            TsgSorguSonucu
        """
        if not unvan or len(unvan) < 3:
            return TsgSorguSonucu(
                vkn=None,
                unvan=unvan,
                bulundu=False,
                hata="Geçersiz ünvan"
            )

        # Cache kontrolü
        cache_key = f"tsg_unvan_{hashlib.md5(unvan.encode()).hexdigest()}"
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            cache_time = datetime.fromisoformat(cached.sorgulama_tarihi)
            if datetime.now() - cache_time < self._cache_ttl:
                return cached

        # Önce veritabanı cache'inden dene
        db_sonuc = self._sorgula_cache_unvan(unvan)
        if db_sonuc.bulundu:
            self._cache[cache_key] = db_sonuc
            return db_sonuc

        # Canlı sorgulama
        try:
            sonuc = await self._sorgula_tsg_canli(unvan=unvan)

            if sonuc.bulundu and sonuc.ilanlar:
                self._kaydet_cache(sonuc)

            self._cache[cache_key] = sonuc
            return sonuc

        except Exception as e:
            logger.error(f"[TicaretSicilGazetesi] Sorgulama hatası: {unvan} - {e}")
            return TsgSorguSonucu(
                vkn=None,
                unvan=unvan,
                bulundu=False,
                hata=str(e)
            )

    async def _sorgula_tsg_canli(self, unvan: str = None, vkn: str = None) -> TsgSorguSonucu:
        """
        TSG web sitesinden canlı sorgulama

        Not: TSG'nin arama formu sınırlı - sonuçlar kısmen çıkabilir
        """
        await self._rate_limit_wait()

        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "User-Agent": "LYNTOS/2.0 SMMM Mali Analiz Platformu (ticaretsicil.gov.tr uyumlu)",
                    "Accept": "text/html,application/xhtml+xml",
                    "Accept-Language": "tr-TR,tr;q=0.9"
                }

                # TSG arama sayfası
                search_params = {}
                if unvan:
                    search_params["unvan"] = unvan

                async with session.get(
                    self.TSG_SEARCH_URL,
                    params=search_params,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        logger.warning(f"[TSG] HTTP {response.status}")
                        return TsgSorguSonucu(
                            vkn=vkn,
                            unvan=unvan or "",
                            bulundu=False,
                            hata=f"HTTP {response.status}"
                        )

                    html = await response.text()
                    return self._parse_search_results(html, unvan, vkn)

        except aiohttp.ClientError as e:
            logger.error(f"[TSG] Bağlantı hatası: {e}")
            return TsgSorguSonucu(
                vkn=vkn,
                unvan=unvan or "",
                bulundu=False,
                hata=f"Bağlantı hatası: {e}"
            )

    def _parse_search_results(self, html: str, unvan: str, vkn: str) -> TsgSorguSonucu:
        """Arama sonuçlarını parse et"""
        try:
            soup = BeautifulSoup(html, 'html.parser')
            ilanlar = []

            # İlan listesini bul (TSG formatına göre)
            # Not: TSG'nin HTML yapısı değişebilir
            results = soup.find_all('div', class_='ilan-item') or soup.find_all('tr', class_='result-row')

            if not results:
                # Alternatif: tablo satırları
                tables = soup.find_all('table')
                for table in tables:
                    rows = table.find_all('tr')[1:]  # Başlık satırını atla
                    for row in rows:
                        ilan = self._parse_ilan_row(row, unvan)
                        if ilan:
                            ilanlar.append(ilan)
            else:
                for item in results:
                    ilan = self._parse_ilan_item(item, unvan)
                    if ilan:
                        ilanlar.append(ilan)

            # İlanlardan ortak değişikliklerini çıkar
            ortak_degisiklikleri = []
            for ilan in ilanlar:
                if ilan.ilan_tipi == "ORTAK_DEGISIKLIGI":
                    degisiklikler = self._extract_ortak_degisiklikleri(ilan)
                    ortak_degisiklikleri.extend(degisiklikler)

            # Faaliyet durumunu belirle
            faaliyet_durumu = "AKTIF"
            for ilan in ilanlar:
                if ilan.ilan_tipi == "TASFIYE":
                    faaliyet_durumu = "TASFIYEDE"
                    break

            return TsgSorguSonucu(
                vkn=vkn,
                unvan=unvan or "",
                bulundu=len(ilanlar) > 0,
                ilanlar=ilanlar,
                ortak_degisiklikleri=ortak_degisiklikleri,
                faaliyet_durumu=faaliyet_durumu,
                kaynak="TSG"
            )

        except Exception as e:
            logger.error(f"[TSG] Parse hatası: {e}")
            return TsgSorguSonucu(
                vkn=vkn,
                unvan=unvan or "",
                bulundu=False,
                hata=f"Parse hatası: {e}"
            )

    def _parse_ilan_item(self, item, unvan: str) -> Optional[TsgIlan]:
        """Tek bir ilan öğesini parse et"""
        try:
            # İlan numarası
            ilan_no_elem = item.find(class_='ilan-no') or item.find('span', text=re.compile(r'\d+'))
            ilan_no = ilan_no_elem.get_text().strip() if ilan_no_elem else ""

            # Tarih
            tarih_elem = item.find(class_='ilan-tarih') or item.find('span', text=re.compile(r'\d{2}\.\d{2}\.\d{4}'))
            ilan_tarihi = tarih_elem.get_text().strip() if tarih_elem else ""

            # İlan içeriği/özeti
            ozet_elem = item.find(class_='ilan-ozet') or item.find('p')
            ilan_ozeti = ozet_elem.get_text().strip() if ozet_elem else ""

            # İlan tipini belirle
            ilan_tipi = self._belirle_ilan_tipi(ilan_ozeti)

            # Link
            link_elem = item.find('a', href=True)
            kaynak_url = f"{self.TSG_BASE_URL}{link_elem['href']}" if link_elem else ""

            if ilan_no or ilan_ozeti:
                return TsgIlan(
                    ilan_no=ilan_no,
                    ilan_tarihi=ilan_tarihi,
                    ilan_tipi=ilan_tipi,
                    sirket_unvan=unvan,
                    ilan_ozeti=ilan_ozeti[:1000],  # İlk 1000 karakter
                    kaynak_url=kaynak_url
                )
        except Exception as e:
            logger.debug(f"[TSG] İlan parse hatası: {e}")

        return None

    def _parse_ilan_row(self, row, unvan: str) -> Optional[TsgIlan]:
        """Tablo satırından ilan parse et"""
        try:
            cells = row.find_all(['td', 'th'])
            if len(cells) < 2:
                return None

            ilan_no = cells[0].get_text().strip() if len(cells) > 0 else ""
            ilan_tarihi = cells[1].get_text().strip() if len(cells) > 1 else ""
            ilan_ozeti = cells[2].get_text().strip() if len(cells) > 2 else ""

            ilan_tipi = self._belirle_ilan_tipi(ilan_ozeti)

            link_elem = row.find('a', href=True)
            kaynak_url = f"{self.TSG_BASE_URL}{link_elem['href']}" if link_elem else ""

            if ilan_no:
                return TsgIlan(
                    ilan_no=ilan_no,
                    ilan_tarihi=ilan_tarihi,
                    ilan_tipi=ilan_tipi,
                    sirket_unvan=unvan,
                    ilan_ozeti=ilan_ozeti[:1000],
                    kaynak_url=kaynak_url
                )
        except Exception:
            pass

        return None

    def _belirle_ilan_tipi(self, metin: str) -> str:
        """İlan metninden ilan tipini belirle"""
        metin_lower = metin.lower()

        for tip, patterns in self.ILAN_TIPLERI.items():
            for pattern in patterns:
                if re.search(pattern, metin_lower):
                    return tip

        return "DIGER"

    def _extract_ortak_degisiklikleri(self, ilan: TsgIlan) -> List[OrtakDegisikligi]:
        """İlan metninden ortak değişikliklerini çıkar"""
        degisiklikler = []

        metin = ilan.ilan_ozeti
        if not metin:
            return degisiklikler

        # Pay devri pattern'leri
        # Örnek: "A'dan B'ye %50 pay devri"
        pay_devri_pattern = r"([A-ZÇĞİÖŞÜa-zçğıöşü\s]+)'[nıiuü]?[dn]an?\s+([A-ZÇĞİÖŞÜa-zçğıöşü\s]+)'[eyaıiuü]?\s+%?\s*(\d+(?:[.,]\d+)?)"

        for match in re.finditer(pay_devri_pattern, metin):
            eski_ortak = match.group(1).strip()
            yeni_ortak = match.group(2).strip()
            pay_str = match.group(3).replace(',', '.')

            try:
                pay_orani = float(pay_str)
                degisiklikler.append(OrtakDegisikligi(
                    eski_ortak=eski_ortak,
                    yeni_ortak=yeni_ortak,
                    pay_orani=pay_orani,
                    degisiklik_tarihi=ilan.ilan_tarihi,
                    ilan_no=ilan.ilan_no
                ))
            except ValueError:
                pass

        return degisiklikler

    def _sorgula_cache_unvan(self, unvan: str) -> TsgSorguSonucu:
        """Veritabanı cache'inden ünvan ile sorgula"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # LIKE ile benzer ünvanları ara
        cursor.execute("""
            SELECT ilan_no, ilan_tarihi, ilan_tipi, sirket_unvan, vkn,
                   ticaret_sicil_no, ticaret_sicil_memurlugu, ilan_ozeti, kaynak_url
            FROM tsg_ilan_cache
            WHERE sirket_unvan LIKE ?
            ORDER BY ilan_tarihi DESC
            LIMIT 20
        """, (f"%{unvan}%",))

        rows = cursor.fetchall()
        conn.close()

        if rows:
            ilanlar = [
                TsgIlan(
                    ilan_no=row[0],
                    ilan_tarihi=row[1],
                    ilan_tipi=row[2],
                    sirket_unvan=row[3],
                    vkn=row[4],
                    ticaret_sicil_no=row[5],
                    ticaret_sicil_memurlugu=row[6],
                    ilan_ozeti=row[7],
                    kaynak_url=row[8]
                )
                for row in rows
            ]

            return TsgSorguSonucu(
                vkn=ilanlar[0].vkn if ilanlar else None,
                unvan=unvan,
                bulundu=True,
                ilanlar=ilanlar,
                kaynak="TSG_CACHE"
            )

        return TsgSorguSonucu(
            vkn=None,
            unvan=unvan,
            bulundu=False
        )

    def _kaydet_cache(self, sonuc: TsgSorguSonucu):
        """Sonucu cache'e kaydet"""
        if not sonuc.ilanlar:
            return

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        for ilan in sonuc.ilanlar:
            try:
                cursor.execute("""
                    INSERT OR REPLACE INTO tsg_ilan_cache
                    (ilan_no, ilan_tarihi, ilan_tipi, sirket_unvan, vkn,
                     ticaret_sicil_no, ticaret_sicil_memurlugu, ilan_ozeti, kaynak_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    ilan.ilan_no, ilan.ilan_tarihi, ilan.ilan_tipi, ilan.sirket_unvan,
                    ilan.vkn, ilan.ticaret_sicil_no, ilan.ticaret_sicil_memurlugu,
                    ilan.ilan_ozeti, ilan.kaynak_url
                ))
            except sqlite3.Error as e:
                logger.warning(f"[TSG] Cache kayıt hatası: {e}")

        # Ortak değişikliklerini kaydet
        for degisiklik in sonuc.ortak_degisiklikleri:
            try:
                cursor.execute("""
                    INSERT INTO tsg_ortak_degisikligi_cache
                    (ilan_no, vkn, eski_ortak, yeni_ortak, pay_orani, degisiklik_tarihi)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    degisiklik.ilan_no, sonuc.vkn, degisiklik.eski_ortak,
                    degisiklik.yeni_ortak, degisiklik.pay_orani, degisiklik.degisiklik_tarihi
                ))
            except sqlite3.Error as e:
                logger.warning(f"[TSG] Ortak değişikliği cache hatası: {e}")

        conn.commit()
        conn.close()

    def kaydet_manuel_ilan(self, ilan: TsgIlan, ortak_degisiklikleri: List[OrtakDegisikligi] = None):
        """
        SMMM'nin manuel girdiği ilan bilgisini kaydet

        Args:
            ilan: Manuel girilen ilan bilgisi
            ortak_degisiklikleri: Ortak değişiklikleri listesi
        """
        sonuc = TsgSorguSonucu(
            vkn=ilan.vkn,
            unvan=ilan.sirket_unvan,
            bulundu=True,
            ilanlar=[ilan],
            ortak_degisiklikleri=ortak_degisiklikleri or [],
            kaynak="MANUEL_GIRIS"
        )
        self._kaydet_cache(sonuc)
        logger.info(f"[TSG] Manuel ilan kaydedildi: {ilan.ilan_no}")

    def get_ortak_gecmisi(self, unvan: str) -> List[OrtakDegisikligi]:
        """Şirketin ortak değişiklik geçmişini al"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT o.eski_ortak, o.yeni_ortak, o.pay_orani, o.degisiklik_tarihi, o.ilan_no
            FROM tsg_ortak_degisikligi_cache o
            JOIN tsg_ilan_cache i ON o.ilan_no = i.ilan_no
            WHERE i.sirket_unvan LIKE ?
            ORDER BY o.degisiklik_tarihi DESC
        """, (f"%{unvan}%",))

        rows = cursor.fetchall()
        conn.close()

        return [
            OrtakDegisikligi(
                eski_ortak=row[0],
                yeni_ortak=row[1],
                pay_orani=row[2],
                degisiklik_tarihi=row[3],
                ilan_no=row[4]
            )
            for row in rows
        ]

    def istatistikler(self) -> Dict:
        """Veritabanı istatistikleri"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM tsg_ilan_cache")
        toplam_ilan = cursor.fetchone()[0]

        cursor.execute("""
            SELECT ilan_tipi, COUNT(*)
            FROM tsg_ilan_cache
            GROUP BY ilan_tipi
        """)
        tip_dagilimi = {row[0]: row[1] for row in cursor.fetchall()}

        cursor.execute("SELECT COUNT(*) FROM tsg_ortak_degisikligi_cache")
        toplam_ortak_degisikligi = cursor.fetchone()[0]

        conn.close()

        return {
            "toplam_ilan": toplam_ilan,
            "tip_dagilimi": tip_dagilimi,
            "toplam_ortak_degisikligi": toplam_ortak_degisikligi,
            "kaynak": "Ticaret Sicil Gazetesi"
        }


# Singleton instance
_tsg_servisi: Optional[TicaretSicilGazetesiServisi] = None


def get_tsg_servisi(db_path: str = None) -> TicaretSicilGazetesiServisi:
    """TSG servisi singleton'ı al"""
    global _tsg_servisi
    if _tsg_servisi is None:
        if db_path is None:
            data_dir = Path(__file__).parent.parent / "data"
            data_dir.mkdir(exist_ok=True)
            db_path = str(data_dir / "tsg_cache.db")
        _tsg_servisi = TicaretSicilGazetesiServisi(db_path)
    return _tsg_servisi


# Test
if __name__ == "__main__":
    async def test():
        servis = get_tsg_servisi()

        # Test sorgulaması
        test_unvan = "ÖZKAN LİMİTED ŞİRKETİ"
        print(f"\n{test_unvan} sorgulanıyor...")
        sonuc = await servis.sorgula_unvan(test_unvan)
        print(f"Sonuç: bulundu={sonuc.bulundu}, ilan sayısı={len(sonuc.ilanlar)}")

        # İstatistikler
        print("\nİstatistikler:")
        print(servis.istatistikler())

    asyncio.run(test())
