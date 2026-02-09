"""
e-Fatura Kayıtlı Mükellef Sorgulama Servisi

GİB e-Belge portalından e-Fatura'ya kayıtlı mükellefleri sorgular.
Bu liste PUBLIC ve YASAL olarak erişilebilir.

Kaynak: https://ebelge.gib.gov.tr/efaturakayitlikullanicilar.html

⚠️ HARDCODED/MOCK/DEMO YASAK - SADECE GERÇEK VERİ
"""

import asyncio
import aiohttp
import logging
import re
import sqlite3
import ssl
import certifi
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from pathlib import Path
from bs4 import BeautifulSoup
import json

logger = logging.getLogger(__name__)


@dataclass
class EFaturaKayitliMukellef:
    """e-Fatura kayıtlı mükellef bilgisi"""
    vkn: str
    unvan: str
    kayit_tarihi: Optional[str] = None
    posta_kutusu: Optional[str] = None
    entegrator: Optional[str] = None
    aktif: bool = True
    sorgulama_tarihi: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class EFaturaSorguSonucu:
    """e-Fatura sorgulama sonucu"""
    vkn: str
    kayitli_mi: bool
    mukellef: Optional[EFaturaKayitliMukellef] = None
    sorgulama_tarihi: str = field(default_factory=lambda: datetime.now().isoformat())
    kaynak: str = "GIB_EBELGE"
    hata: Optional[str] = None


class EFaturaKayitliSorgulamaServisi:
    """
    e-Fatura Kayıtlı Mükellef Sorgulama Servisi

    GİB'in e-Belge portalından e-Fatura'ya kayıtlı mükellefleri sorgular.
    """

    EBELGE_URL = "https://ebelge.gib.gov.tr"
    EFATURA_KAYITLI_URL = "https://ebelge.gib.gov.tr/efaturakayitlikullanicilar.html"
    EFATURA_SORGULAMA_URL = "https://ebelge.gib.gov.tr/anasayfa.html"

    # Alternatif endpoint (iFrame içi)
    SORGU_EFATURA_URL = "https://sorgu.efatura.gov.tr/kullanicilar/xliste.php"

    # NOT: xliste.php CAPTCHA gerektiriyor
    # Tekil VKN sorgulaması için kullanılabilir ama CAPTCHA bypass edilemez
    # KVKK uyumu: Toplu scraping YASAK

    # e-Fatura zorunluluk sınırı (2024 itibariyle)
    ZORUNLULUK_SINIRI_BRUT = 3_000_000  # 3M TL brüt satış

    def __init__(self, db_path: str = None):
        """
        Args:
            db_path: SQLite veritabanı yolu
        """
        self.db_path = db_path or ":memory:"
        self._init_database()
        self._cache: Dict[str, EFaturaSorguSonucu] = {}
        self._cache_ttl = timedelta(hours=6)

    def _init_database(self):
        """Veritabanını oluştur"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS efatura_kayitli_mukellefler (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vkn TEXT UNIQUE NOT NULL,
                unvan TEXT,
                kayit_tarihi TEXT,
                posta_kutusu TEXT,
                entegrator TEXT,
                aktif INTEGER DEFAULT 1,
                sorgulama_tarihi TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_efatura_vkn ON efatura_kayitli_mukellefler(vkn)
        """)

        conn.commit()
        conn.close()
        logger.info(f"[EFaturaKayitli] Veritabanı hazır: {self.db_path}")

    async def sorgula_canli(self, vkn: str) -> EFaturaSorguSonucu:
        """
        GİB e-Belge portalından canlı sorgulama yap

        Args:
            vkn: Vergi kimlik numarası

        Returns:
            EFaturaSorguSonucu
        """
        # VKN doğrulama
        if not vkn or not re.match(r'^\d{10,11}$', vkn):
            return EFaturaSorguSonucu(
                vkn=vkn,
                kayitli_mi=False,
                hata="Geçersiz VKN formatı"
            )

        # Cache kontrolü
        cache_key = f"efatura_{vkn}"
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            cache_time = datetime.fromisoformat(cached.sorgulama_tarihi)
            if datetime.now() - cache_time < self._cache_ttl:
                return cached

        try:
            ssl_ctx = ssl.create_default_context(cafile=certifi.where())
            async with aiohttp.ClientSession() as session:
                # GİB e-Belge sayfasına istek
                # Not: GİB'in AJAX endpoint'i
                headers = {
                    "User-Agent": "LYNTOS/2.0 SMMM Mali Analiz Platformu",
                    "Accept": "application/json, text/html",
                    "Referer": self.EFATURA_KAYITLI_URL
                }

                # Sorgulama sayfasından VKN kontrolü
                # GİB'in kullandığı endpoint'i reverse-engineer ettik
                sorgulama_url = f"https://ebelge.gib.gov.tr/dosya/efatura/efaturakayitlikullanicilar/{vkn[:2]}.html"

                async with session.get(
                    sorgulama_url,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30),
                    ssl=ssl_ctx
                ) as response:
                    if response.status == 200:
                        html = await response.text()

                        # VKN'yi sayfada ara
                        if vkn in html:
                            # Detayları çıkar
                            mukellef = self._parse_kayitli_mukellef(html, vkn)

                            if mukellef:
                                # Veritabanına kaydet
                                self._kaydet_veritabanina(mukellef)

                                sonuc = EFaturaSorguSonucu(
                                    vkn=vkn,
                                    kayitli_mi=True,
                                    mukellef=mukellef,
                                    kaynak="GIB_EBELGE"
                                )

                                self._cache[cache_key] = sonuc
                                return sonuc

                # VKN bulunamadı - kayıtlı değil
                sonuc = EFaturaSorguSonucu(
                    vkn=vkn,
                    kayitli_mi=False,
                    kaynak="GIB_EBELGE"
                )

                self._cache[cache_key] = sonuc
                return sonuc

        except Exception as e:
            logger.error(f"[EFaturaKayitli] Sorgulama hatası: {vkn} - {e}")

            # Veritabanından dene
            return self._sorgula_veritabanindan(vkn)

    def _parse_kayitli_mukellef(self, html: str, vkn: str) -> Optional[EFaturaKayitliMukellef]:
        """HTML'den mükellef bilgilerini çıkar"""
        try:
            soup = BeautifulSoup(html, 'html.parser')

            # VKN'yi içeren satırı bul
            for row in soup.find_all('tr'):
                cells = row.find_all('td')
                row_text = row.get_text()

                if vkn in row_text:
                    # Hücreleri parse et
                    unvan = ""
                    kayit_tarihi = None
                    posta_kutusu = None

                    for i, cell in enumerate(cells):
                        cell_text = cell.get_text().strip()

                        if cell_text == vkn:
                            # Sonraki hücre genelde unvan
                            if i + 1 < len(cells):
                                unvan = cells[i + 1].get_text().strip()

                        # Tarih formatı: DD.MM.YYYY
                        if re.match(r'\d{2}\.\d{2}\.\d{4}', cell_text):
                            kayit_tarihi = cell_text

                        # Posta kutusu: urn:mail:xxx
                        if 'urn:mail:' in cell_text or '@' in cell_text:
                            posta_kutusu = cell_text

                    return EFaturaKayitliMukellef(
                        vkn=vkn,
                        unvan=unvan or "Bilinmiyor",
                        kayit_tarihi=kayit_tarihi,
                        posta_kutusu=posta_kutusu,
                        aktif=True
                    )

        except Exception as e:
            logger.error(f"[EFaturaKayitli] Parse hatası: {e}")

        return None

    def _kaydet_veritabanina(self, mukellef: EFaturaKayitliMukellef):
        """Mükellefi veritabanına kaydet"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT OR REPLACE INTO efatura_kayitli_mukellefler
            (vkn, unvan, kayit_tarihi, posta_kutusu, entegrator, aktif, sorgulama_tarihi, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            mukellef.vkn, mukellef.unvan, mukellef.kayit_tarihi,
            mukellef.posta_kutusu, mukellef.entegrator,
            1 if mukellef.aktif else 0,
            mukellef.sorgulama_tarihi,
            datetime.now().isoformat()
        ))

        conn.commit()
        conn.close()

    def _sorgula_veritabanindan(self, vkn: str) -> EFaturaSorguSonucu:
        """Veritabanından sorgula (offline fallback)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT vkn, unvan, kayit_tarihi, posta_kutusu, entegrator, aktif, sorgulama_tarihi
            FROM efatura_kayitli_mukellefler
            WHERE vkn = ?
        """, (vkn,))

        row = cursor.fetchone()
        conn.close()

        if row:
            mukellef = EFaturaKayitliMukellef(
                vkn=row[0],
                unvan=row[1],
                kayit_tarihi=row[2],
                posta_kutusu=row[3],
                entegrator=row[4],
                aktif=bool(row[5]),
                sorgulama_tarihi=row[6]
            )

            return EFaturaSorguSonucu(
                vkn=vkn,
                kayitli_mi=True,
                mukellef=mukellef,
                kaynak="GIB_EBELGE_CACHE"
            )

        return EFaturaSorguSonucu(
            vkn=vkn,
            kayitli_mi=False,
            kaynak="GIB_EBELGE_CACHE"
        )

    def sorgula_vkn(self, vkn: str) -> EFaturaSorguSonucu:
        """
        Senkron VKN sorgulaması (önce cache/db, sonra canlı)
        """
        # Önce veritabanından dene
        sonuc = self._sorgula_veritabanindan(vkn)

        if sonuc.kayitli_mi:
            return sonuc

        # Cache'de de yoksa, canlı sorgulamayı async olarak başlat
        # Senkron context'te async çağrı
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Event loop zaten çalışıyorsa, veritabanı sonucunu döndür
                return sonuc
            else:
                return loop.run_until_complete(self.sorgula_canli(vkn))
        except RuntimeError:
            # Yeni event loop oluştur
            return asyncio.run(self.sorgula_canli(vkn))

    async def sorgula_toplu_async(self, vkn_listesi: List[str]) -> Dict[str, EFaturaSorguSonucu]:
        """
        Toplu VKN sorgulaması (async)
        """
        sonuclar = {}
        tasks = [self.sorgula_canli(vkn) for vkn in vkn_listesi]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for vkn, result in zip(vkn_listesi, results):
            if isinstance(result, Exception):
                sonuclar[vkn] = EFaturaSorguSonucu(
                    vkn=vkn,
                    kayitli_mi=False,
                    hata=str(result)
                )
            else:
                sonuclar[vkn] = result

        return sonuclar

    def kontrol_zorunluluk(self, brut_satis: float) -> Dict:
        """
        e-Fatura zorunluluğu kontrolü

        Args:
            brut_satis: Brüt satış hasılatı (TL)

        Returns:
            Zorunluluk durumu
        """
        zorunlu = brut_satis >= self.ZORUNLULUK_SINIRI_BRUT

        return {
            "brut_satis": brut_satis,
            "zorunluluk_siniri": self.ZORUNLULUK_SINIRI_BRUT,
            "zorunlu_mu": zorunlu,
            "aciklama": "Brüt satış hasılatı 3 Milyon TL'yi aşan mükellefler e-Fatura uygulamasına geçmek zorundadır." if zorunlu else "e-Fatura zorunluluğu bulunmuyor, isteğe bağlı geçiş yapılabilir.",
            "mevzuat": "VUK Genel Tebliği (Sıra No: 509)"
        }

    def istatistikler(self) -> Dict:
        """Veritabanı istatistikleri"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM efatura_kayitli_mukellefler")
        toplam = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM efatura_kayitli_mukellefler WHERE aktif = 1")
        aktif = cursor.fetchone()[0]

        cursor.execute("SELECT MAX(sorgulama_tarihi) FROM efatura_kayitli_mukellefler")
        son_sorgulama = cursor.fetchone()[0]

        conn.close()

        return {
            "toplam_kayitli": toplam,
            "aktif_kayitli": aktif,
            "son_sorgulama": son_sorgulama,
            "kaynak": "GİB e-Belge Portalı"
        }


# Singleton instance
_efatura_servisi: Optional[EFaturaKayitliSorgulamaServisi] = None

def get_efatura_servisi(db_path: str = None) -> EFaturaKayitliSorgulamaServisi:
    """e-Fatura servisi singleton'ı al"""
    global _efatura_servisi
    if _efatura_servisi is None:
        if db_path is None:
            data_dir = Path(__file__).parent.parent / "data"
            data_dir.mkdir(exist_ok=True)
            db_path = str(data_dir / "efatura_kayitli.db")
        _efatura_servisi = EFaturaKayitliSorgulamaServisi(db_path)
    return _efatura_servisi


# Test
if __name__ == "__main__":
    async def test():
        servis = get_efatura_servisi()

        # Örnek sorgulama
        test_vkn = "1234567890"
        print(f"{test_vkn} sorgulanıyor...")
        sonuc = await servis.sorgula_canli(test_vkn)
        print(f"Sonuç: {sonuc}")

        # Zorunluluk kontrolü
        print("\nZorunluluk kontrolü:")
        print(servis.kontrol_zorunluluk(5_000_000))

    asyncio.run(test())
