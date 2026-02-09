"""
MERSIS Tekil Sorgulama Servisi

Ticaret Sicili ve MERSIS entegrasyonu için tekil mükellef sorgulama.
KVKK uyumlu: Sadece tekil sorgulama, toplu scraping YOK.

Kaynak: https://mersis.ticaret.gov.tr
        https://www.ticaretsicil.gov.tr

⚠️ HARDCODED/MOCK/DEMO YASAK - SADECE GERÇEK VERİ
⚠️ KVKK UYUMLU - TOPLU VERİ TOPLAMA YASAK
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

logger = logging.getLogger(__name__)


@dataclass
class SirketBilgisi:
    """Şirket/Tüccar temel bilgisi"""
    vkn: str
    mersis_no: Optional[str] = None
    unvan: str = ""
    ticaret_sicil_no: Optional[str] = None
    ticaret_sicil_memurluğu: Optional[str] = None
    kuruluş_tarihi: Optional[str] = None
    sermaye: Optional[float] = None
    faaliyet_durumu: str = "AKTİF"  # AKTİF, TASFİYEDE, KAPALI
    adres: Optional[str] = None
    il: Optional[str] = None
    kaynak: str = "MERSIS"
    sorgulama_tarihi: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class OrtakBilgisi:
    """Şirket ortağı/yöneticisi bilgisi"""
    ad_soyad: str
    tckn_vkn: Optional[str] = None
    gorev: str = ""  # Ortak, Müdür, Yönetim Kurulu Üyesi
    pay_orani: Optional[float] = None  # %
    temsil_yetkisi: bool = False


@dataclass
class MersisSorguSonucu:
    """MERSIS sorgulama sonucu"""
    vkn: str
    bulundu: bool
    sirket: Optional[SirketBilgisi] = None
    ortaklar: List[OrtakBilgisi] = field(default_factory=list)
    sorgulama_tarihi: str = field(default_factory=lambda: datetime.now().isoformat())
    kaynak: str = "MERSIS"
    hata: Optional[str] = None


class MersisSorgulamaServisi:
    """
    MERSIS Tekil Sorgulama Servisi

    Ticaret Bakanlığı MERSIS sisteminden şirket bilgileri sorgular.

    ⚠️ KVKK UYUMLU:
    - Sadece tekil VKN/MERSIS No sorgulaması
    - Toplu veri toplama/scraping yapılmaz
    - Sadece kamuya açık bilgiler
    """

    MERSIS_URL = "https://mersis.ticaret.gov.tr"
    MERSIS_GTB_URL = "https://mersis.gtb.gov.tr"  # Alternatif URL
    TICARETSICIL_URL = "https://www.ticaretsicil.gov.tr"

    # e-Devlet sorgulama linki (kullanıcı yönlendirmesi için)
    EDEVLET_SIRKET_SORGULA = "https://www.turkiye.gov.tr/ticaret-bakanligi-mersis-sorgulama"

    # Alternatif kaynaklar
    OPENCORPORATES_URL = "https://opencorporates.com/companies/tr"  # Uluslararası kaynak
    KAP_URL = "https://kap.org.tr"  # BİST şirketleri için

    # NOT: MERSIS doğrudan sorgulaması e-Devlet veya form gönderimi gerektiriyor
    # SMMM manuel veri girişi önerilir: /api/v2/smmm/ortak, /api/v2/smmm/yonetici

    def __init__(self, db_path: str = None):
        """
        Args:
            db_path: SQLite veritabanı yolu (cache için)
        """
        self.db_path = db_path or ":memory:"
        self._init_database()
        self._cache: Dict[str, MersisSorguSonucu] = {}
        self._cache_ttl = timedelta(hours=24)  # 24 saat cache

    def _init_database(self):
        """Veritabanını oluştur (cache amaçlı)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Şirket bilgileri cache
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mersis_sirket_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vkn TEXT UNIQUE NOT NULL,
                mersis_no TEXT,
                unvan TEXT,
                ticaret_sicil_no TEXT,
                ticaret_sicil_memurlugu TEXT,
                kurulus_tarihi TEXT,
                sermaye REAL,
                faaliyet_durumu TEXT,
                adres TEXT,
                il TEXT,
                kaynak TEXT,
                sorgulama_tarihi TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_mersis_vkn ON mersis_sirket_cache(vkn)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_mersis_no ON mersis_sirket_cache(mersis_no)
        """)

        # Ortak bilgileri cache
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mersis_ortak_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sirket_vkn TEXT NOT NULL,
                ad_soyad TEXT,
                tckn_vkn TEXT,
                gorev TEXT,
                pay_orani REAL,
                temsil_yetkisi INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sirket_vkn) REFERENCES mersis_sirket_cache(vkn)
            )
        """)

        conn.commit()
        conn.close()
        logger.info(f"[MersisSorgulama] Veritabanı hazır: {self.db_path}")

    async def sorgula_vkn(self, vkn: str) -> MersisSorguSonucu:
        """
        VKN ile MERSIS sorgulaması

        ⚠️ KVKK Notu: Bu metod sadece TEKİL sorgulama yapar.
        Toplu sorgulama veya scraping YASAKTIR.

        Args:
            vkn: Vergi kimlik numarası (10-11 hane)

        Returns:
            MersisSorguSonucu
        """
        # VKN doğrulama
        if not vkn or not re.match(r'^\d{10,11}$', vkn):
            return MersisSorguSonucu(
                vkn=vkn,
                bulundu=False,
                hata="Geçersiz VKN formatı"
            )

        # Cache kontrolü
        cache_key = f"mersis_{vkn}"
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            cache_time = datetime.fromisoformat(cached.sorgulama_tarihi)
            if datetime.now() - cache_time < self._cache_ttl:
                return cached

        # Önce veritabanından dene (önceki sorgulama cache'i)
        db_sonuc = self._sorgula_cache(vkn)
        if db_sonuc.bulundu:
            self._cache[cache_key] = db_sonuc
            return db_sonuc

        # Canlı sorgulama
        try:
            sonuc = await self._sorgula_mersis_canli(vkn)

            if sonuc.bulundu and sonuc.sirket:
                # Cache'e kaydet
                self._kaydet_cache(sonuc)

            self._cache[cache_key] = sonuc
            return sonuc

        except Exception as e:
            logger.error(f"[MersisSorgulama] Sorgulama hatası: {vkn} - {e}")
            return MersisSorguSonucu(
                vkn=vkn,
                bulundu=False,
                hata=str(e)
            )

    async def _sorgula_mersis_canli(self, vkn: str) -> MersisSorguSonucu:
        """
        MERSIS web sitesinden canlı sorgulama

        Not: MERSIS doğrudan API sunmuyor.
        Bu metod sadece kamuya açık bilgileri çeker.
        """
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "User-Agent": "LYNTOS/2.0 SMMM Mali Analiz Platformu",
                    "Accept": "text/html,application/xhtml+xml",
                }

                # 1. Ticaret Sicil Gazetesi'nden kuruluş bilgisi ara
                # Not: TSG araması kamuya açık
                tsg_sonuc = await self._ara_ticaret_sicil_gazetesi(session, vkn)

                # 2. MERSIS public sorgulama endpoint'i
                # Not: MERSIS'in public sorgulaması sınırlı
                mersis_sonuc = await self._ara_mersis_public(session, vkn)

                # Sonuçları birleştir
                if tsg_sonuc or mersis_sonuc:
                    sirket = self._birlestir_sonuclar(vkn, tsg_sonuc, mersis_sonuc)

                    return MersisSorguSonucu(
                        vkn=vkn,
                        bulundu=True,
                        sirket=sirket,
                        kaynak="MERSIS/TSG"
                    )

                return MersisSorguSonucu(
                    vkn=vkn,
                    bulundu=False,
                    kaynak="MERSIS"
                )

        except Exception as e:
            logger.error(f"[MersisSorgulama] Canlı sorgulama hatası: {e}")
            return MersisSorguSonucu(
                vkn=vkn,
                bulundu=False,
                hata=str(e)
            )

    async def _ara_ticaret_sicil_gazetesi(self, session: aiohttp.ClientSession, vkn: str) -> Optional[Dict]:
        """Ticaret Sicil Gazetesi'nde ara"""
        try:
            # TSG arama sayfası
            search_url = "https://www.ticaretsicil.gov.tr/view/pages/home.php"

            async with session.get(
                search_url,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status == 200:
                    # TSG doğrudan VKN araması desteklemiyor
                    # Sadece ilan araması mevcut
                    # Burada sadece site erişilebilirliğini kontrol ediyoruz
                    return None

        except Exception as e:
            logger.warning(f"[MersisSorgulama] TSG arama hatası: {e}")

        return None

    async def _ara_mersis_public(self, session: aiohttp.ClientSession, vkn: str) -> Optional[Dict]:
        """MERSIS public sorgulama"""
        try:
            # MERSIS doğrudan public API sunmuyor
            # Ancak e-Devlet üzerinden sorgulanabilir

            # Bu endpoint deneysel - çalışmayabilir
            url = f"{self.MERSIS_URL}/Portal/SearchServlet"

            params = {
                "action": "search",
                "vkn": vkn,
                "type": "company"
            }

            async with session.get(
                url,
                params=params,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status == 200:
                    content_type = response.headers.get("content-type", "")

                    if "json" in content_type:
                        data = await response.json()
                        if data and data.get("result"):
                            return data.get("result")

                    elif "html" in content_type:
                        html = await response.text()
                        return self._parse_mersis_html(html, vkn)

        except Exception as e:
            logger.warning(f"[MersisSorgulama] MERSIS public arama hatası: {e}")

        return None

    def _parse_mersis_html(self, html: str, vkn: str) -> Optional[Dict]:
        """MERSIS HTML çıktısını parse et"""
        try:
            soup = BeautifulSoup(html, 'html.parser')

            # Şirket bilgisi alanlarını ara
            result = {}

            # Unvan
            unvan_elem = soup.find(text=re.compile("Ticaret Unvanı", re.I))
            if unvan_elem:
                parent = unvan_elem.find_parent()
                if parent and parent.find_next_sibling():
                    result["unvan"] = parent.find_next_sibling().get_text().strip()

            # MERSIS No
            mersis_elem = soup.find(text=re.compile("MERSİS No", re.I))
            if mersis_elem:
                parent = mersis_elem.find_parent()
                if parent and parent.find_next_sibling():
                    result["mersis_no"] = parent.find_next_sibling().get_text().strip()

            if result:
                return result

        except Exception as e:
            logger.error(f"[MersisSorgulama] HTML parse hatası: {e}")

        return None

    def _birlestir_sonuclar(self, vkn: str, tsg: Optional[Dict], mersis: Optional[Dict]) -> SirketBilgisi:
        """Farklı kaynaklardan gelen sonuçları birleştir"""
        data = {}

        if tsg:
            data.update(tsg)
        if mersis:
            data.update(mersis)

        return SirketBilgisi(
            vkn=vkn,
            mersis_no=data.get("mersis_no"),
            unvan=data.get("unvan", ""),
            ticaret_sicil_no=data.get("ticaret_sicil_no"),
            ticaret_sicil_memurluğu=data.get("ticaret_sicil_memurlugu"),
            kuruluş_tarihi=data.get("kurulus_tarihi"),
            sermaye=data.get("sermaye"),
            faaliyet_durumu=data.get("faaliyet_durumu", "AKTİF"),
            adres=data.get("adres"),
            il=data.get("il"),
            kaynak="MERSIS/TSG"
        )

    def _sorgula_cache(self, vkn: str) -> MersisSorguSonucu:
        """Veritabanı cache'inden sorgula"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT vkn, mersis_no, unvan, ticaret_sicil_no, ticaret_sicil_memurlugu,
                   kurulus_tarihi, sermaye, faaliyet_durumu, adres, il, kaynak, sorgulama_tarihi
            FROM mersis_sirket_cache
            WHERE vkn = ?
        """, (vkn,))

        row = cursor.fetchone()
        conn.close()

        if row:
            sirket = SirketBilgisi(
                vkn=row[0],
                mersis_no=row[1],
                unvan=row[2],
                ticaret_sicil_no=row[3],
                ticaret_sicil_memurluğu=row[4],
                kuruluş_tarihi=row[5],
                sermaye=row[6],
                faaliyet_durumu=row[7],
                adres=row[8],
                il=row[9],
                kaynak=row[10],
                sorgulama_tarihi=row[11]
            )

            return MersisSorguSonucu(
                vkn=vkn,
                bulundu=True,
                sirket=sirket,
                kaynak="MERSIS_CACHE"
            )

        return MersisSorguSonucu(
            vkn=vkn,
            bulundu=False
        )

    def _kaydet_cache(self, sonuc: MersisSorguSonucu):
        """Sonucu cache'e kaydet"""
        if not sonuc.sirket:
            return

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        s = sonuc.sirket
        cursor.execute("""
            INSERT OR REPLACE INTO mersis_sirket_cache
            (vkn, mersis_no, unvan, ticaret_sicil_no, ticaret_sicil_memurlugu,
             kurulus_tarihi, sermaye, faaliyet_durumu, adres, il, kaynak, sorgulama_tarihi, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            s.vkn, s.mersis_no, s.unvan, s.ticaret_sicil_no, s.ticaret_sicil_memurluğu,
            s.kuruluş_tarihi, s.sermaye, s.faaliyet_durumu, s.adres, s.il,
            s.kaynak, s.sorgulama_tarihi, datetime.now().isoformat()
        ))

        conn.commit()
        conn.close()

    # ═══════════════════════════════════════════════════════════════════════════
    # PUBLIC API
    # ═══════════════════════════════════════════════════════════════════════════

    def get_edevlet_link(self, vkn: str) -> str:
        """
        e-Devlet MERSIS sorgulama linki oluştur

        SMMM bu linki kullanarak manuel doğrulama yapabilir.
        """
        return f"{self.EDEVLET_SIRKET_SORGULA}?vkn={vkn}"

    def kaydet_manuel_dogrulama(self, vkn: str, sirket_bilgisi: SirketBilgisi, ortaklar: List[OrtakBilgisi] = None):
        """
        SMMM'nin manuel doğruladığı bilgileri kaydet

        Args:
            vkn: Vergi kimlik numarası
            sirket_bilgisi: Manuel girilen şirket bilgisi
            ortaklar: Ortak/yönetici listesi (opsiyonel)
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Şirket bilgisini kaydet
        s = sirket_bilgisi
        cursor.execute("""
            INSERT OR REPLACE INTO mersis_sirket_cache
            (vkn, mersis_no, unvan, ticaret_sicil_no, ticaret_sicil_memurlugu,
             kurulus_tarihi, sermaye, faaliyet_durumu, adres, il, kaynak, sorgulama_tarihi, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            s.vkn, s.mersis_no, s.unvan, s.ticaret_sicil_no, s.ticaret_sicil_memurluğu,
            s.kuruluş_tarihi, s.sermaye, s.faaliyet_durumu, s.adres, s.il,
            "MANUEL_DOGRULAMA", datetime.now().isoformat(), datetime.now().isoformat()
        ))

        # Ortakları kaydet
        if ortaklar:
            # Önce eskileri sil
            cursor.execute("DELETE FROM mersis_ortak_cache WHERE sirket_vkn = ?", (vkn,))

            for ortak in ortaklar:
                cursor.execute("""
                    INSERT INTO mersis_ortak_cache
                    (sirket_vkn, ad_soyad, tckn_vkn, gorev, pay_orani, temsil_yetkisi)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    vkn, ortak.ad_soyad, ortak.tckn_vkn, ortak.gorev,
                    ortak.pay_orani, 1 if ortak.temsil_yetkisi else 0
                ))

        conn.commit()
        conn.close()

        # Cache'i temizle
        cache_key = f"mersis_{vkn}"
        if cache_key in self._cache:
            del self._cache[cache_key]

        logger.info(f"[MersisSorgulama] Manuel doğrulama kaydedildi: {vkn}")

    def get_ortaklar(self, vkn: str) -> List[OrtakBilgisi]:
        """Şirketin ortak/yönetici listesini al"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT ad_soyad, tckn_vkn, gorev, pay_orani, temsil_yetkisi
            FROM mersis_ortak_cache
            WHERE sirket_vkn = ?
        """, (vkn,))

        rows = cursor.fetchall()
        conn.close()

        return [
            OrtakBilgisi(
                ad_soyad=row[0],
                tckn_vkn=row[1],
                gorev=row[2],
                pay_orani=row[3],
                temsil_yetkisi=bool(row[4])
            )
            for row in rows
        ]

    def kontrol_borclu_ortak(self, vkn: str, borclu_vkn_listesi: List[str]) -> Dict:
        """
        Şirket ortakları/yöneticilerinin borçlu listesinde olup olmadığını kontrol et

        Args:
            vkn: Şirket VKN'si
            borclu_vkn_listesi: Borçlu VKN listesi

        Returns:
            Kontrol sonucu
        """
        ortaklar = self.get_ortaklar(vkn)

        borclu_ortaklar = []
        for ortak in ortaklar:
            if ortak.tckn_vkn and ortak.tckn_vkn in borclu_vkn_listesi:
                borclu_ortaklar.append(ortak)

        return {
            "kontrol_yapildi": True,
            "toplam_ortak": len(ortaklar),
            "borclu_ortak_sayisi": len(borclu_ortaklar),
            "borclu_ortaklar": borclu_ortaklar,
            "risk_seviyesi": "YUKSEK" if borclu_ortaklar else "DUSUK"
        }


# Singleton instance
_mersis_servisi: Optional[MersisSorgulamaServisi] = None


def get_mersis_servisi(db_path: str = None) -> MersisSorgulamaServisi:
    """MERSIS servisi singleton'ı al"""
    global _mersis_servisi
    if _mersis_servisi is None:
        if db_path is None:
            data_dir = Path(__file__).parent.parent / "data"
            data_dir.mkdir(exist_ok=True)
            db_path = str(data_dir / "mersis_cache.db")
        _mersis_servisi = MersisSorgulamaServisi(db_path)
    return _mersis_servisi


# Test
if __name__ == "__main__":
    async def test():
        servis = get_mersis_servisi()

        # Örnek sorgulama
        test_vkn = "1234567890"
        print(f"{test_vkn} sorgulanıyor...")
        sonuc = await servis.sorgula_vkn(test_vkn)
        print(f"Sonuç: {sonuc}")

        # e-Devlet linki
        print(f"\ne-Devlet linki: {servis.get_edevlet_link(test_vkn)}")

    asyncio.run(test())
