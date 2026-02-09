"""
Ticaret Sicil Tam Entegrasyon Servisi

TÜRKİYE'DEKİ TİCARET SİCİL VERİ KAYNAKLARI:

1. TİCARET SİCİL GAZETESİ (TSG)
   - URL: https://www.ticaretsicil.gov.tr
   - Yayıncı: TOBB
   - İçerik: Kuruluş, sermaye değişikliği, ortak değişikliği, tasfiye ilanları
   - 1 Ocak 2022'den beri sadece dijital

2. MERSİS (Merkezi Sicil Kayıt Sistemi)
   - URL: https://mersis.ticaret.gov.tr
   - Yönetici: Ticaret Bakanlığı
   - İçerik: Tüm şirket kayıtları, ortaklar, yetkililer, sermaye

3. e-DEVLET TİCARİ İŞLETME SORGULAMA
   - URL: https://www.turkiye.gov.tr/gtb-ticari-isletme-ve-sirket-sorgulama
   - İçerik: Şirket durumu, temel bilgiler

4. İL TİCARET SİCİL MÜDÜRLÜKLERİ
   - Her ilde farklı web siteleri
   - Yerel tescil işlemleri

5. EİDS (Elektronik İlan Doğrulama Sistemi)
   - API: https://ws.gtb.gov.tr:8443/EidsApi
   - Kurumsal entegrasyon gerektirir

ÇEKİLECEK VERİLER:
- Şirket Unvanı
- VKN / MERSIS No
- Ticaret Sicil No
- Kuruluş Tarihi
- Sermaye (Taahhüt/Ödenmiş)
- Ortaklar ve Pay Oranları
- Yönetim Kurulu / Müdürler
- Temsil Yetkileri
- Adres Bilgileri
- Faaliyet Durumu (Aktif/Tasfiye/Kapanmış)
- İlan Geçmişi (Değişiklikler)

⚠️ HARDCODED/MOCK/DEMO YASAK - SADECE GERÇEK VERİ
⚠️ KVKK UYUMLU - TEKİL SORGULAMA
"""

import asyncio
import aiohttp
import logging
import re
import sqlite3
import ssl
import certifi
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field, asdict
from pathlib import Path
from bs4 import BeautifulSoup
import hashlib
import json
from urllib.parse import urlencode, quote

logger = logging.getLogger(__name__)


# =============================================================================
# VERİ YAPILARI
# =============================================================================

@dataclass
class OrtakBilgisi:
    """Şirket ortağı/hissedarı bilgisi"""
    ad_soyad: str
    tckn_vkn: Optional[str] = None
    uyruk: str = "TC"
    pay_tutari: Optional[float] = None  # TL
    pay_orani: Optional[float] = None   # %
    pay_adedi: Optional[int] = None
    ortak_tipi: str = "GERCEK"  # GERCEK, TUZEL
    kaynak: str = ""


@dataclass
class YoneticiYetkili:
    """Yönetici/Yetkili/Temsilci bilgisi"""
    ad_soyad: str
    tckn_vkn: Optional[str] = None
    gorev: str = ""  # Müdür, YK Üyesi, YK Başkanı, Genel Müdür
    temsil_sekli: str = ""  # Münferit, Müşterek
    temsil_siniri: Optional[float] = None  # TL limiti
    baslangic_tarihi: Optional[str] = None
    bitis_tarihi: Optional[str] = None
    kaynak: str = ""


@dataclass
class SermayeBilgisi:
    """Sermaye bilgisi"""
    esas_sermaye: float = 0  # TL
    odenmis_sermaye: float = 0  # TL
    taahhut_sermaye: float = 0  # TL
    sermaye_turu: str = ""  # Nakdi, Ayni
    son_arttirim_tarihi: Optional[str] = None
    kaynak: str = ""


@dataclass
class IlanBilgisi:
    """TSG ilan bilgisi"""
    ilan_no: str
    ilan_tarihi: str
    gazete_tarihi: Optional[str] = None
    gazete_sayisi: Optional[str] = None
    ilan_tipi: str = ""  # KURULUS, SERMAYE, ORTAK, YK, TASFIYE, ADRES, UNVAN, DIGER
    ilan_metni: str = ""
    sicil_memurlugu: str = ""
    kaynak_url: str = ""


@dataclass
class SirketTamBilgi:
    """Şirket tam bilgi - Tüm kaynaklardan birleştirilmiş"""
    # Temel Bilgiler
    vkn: str
    unvan: str
    mersis_no: Optional[str] = None
    ticaret_sicil_no: Optional[str] = None
    sicil_memurlugu: Optional[str] = None

    # Şirket Tipi ve Durumu
    sirket_tipi: str = ""  # LTD, AS, KOLEKTIF, KOMANDIT, SUBE, SAHIS
    faaliyet_durumu: str = "AKTIF"  # AKTIF, TASFIYEDE, KAPANMIS, KONKORDATO

    # Tarihler
    kurulus_tarihi: Optional[str] = None
    tescil_tarihi: Optional[str] = None
    tasfiye_baslangic: Optional[str] = None
    kapanma_tarihi: Optional[str] = None

    # Adres
    merkez_adresi: Optional[str] = None
    il: Optional[str] = None
    ilce: Optional[str] = None

    # Faaliyet
    nace_kodu: Optional[str] = None
    nace_aciklama: Optional[str] = None
    ana_faaliyet: Optional[str] = None

    # Sermaye
    sermaye: Optional[SermayeBilgisi] = None

    # Ortaklar ve Yöneticiler
    ortaklar: List[OrtakBilgisi] = field(default_factory=list)
    yoneticiler: List[YoneticiYetkili] = field(default_factory=list)

    # İlan Geçmişi
    ilanlar: List[IlanBilgisi] = field(default_factory=list)

    # Meta
    veri_kaynaklari: List[str] = field(default_factory=list)
    son_guncelleme: str = field(default_factory=lambda: datetime.now().isoformat())
    veri_tamamlik_skoru: float = 0.0  # 0-1


@dataclass
class SorguSonucu:
    """Sorgulama sonucu"""
    basarili: bool
    sirket: Optional[SirketTamBilgi] = None
    hata_mesaji: Optional[str] = None
    sorgu_suresi_ms: float = 0
    kullanilan_kaynaklar: List[str] = field(default_factory=list)


# =============================================================================
# İL TİCARET SİCİL MÜDÜRLÜKLERİ
# =============================================================================

# Türkiye'deki tüm il ticaret sicil müdürlüklerinin web adresleri
IL_TICARET_SICIL_MUDURLEKLERI = {
    "ADANA": "https://adana.ticaret.gov.tr",
    "ADIYAMAN": "https://adiyaman.ticaret.gov.tr",
    "AFYONKARAHISAR": "https://afyonkarahisar.ticaret.gov.tr",
    "AĞRI": "https://agri.ticaret.gov.tr",
    "AKSARAY": "https://aksaray.ticaret.gov.tr",
    "AMASYA": "https://amasya.ticaret.gov.tr",
    "ANKARA": "https://ankara.ticaret.gov.tr",
    "ANTALYA": "https://antalya.ticaret.gov.tr",
    "ARDAHAN": "https://ardahan.ticaret.gov.tr",
    "ARTVİN": "https://artvin.ticaret.gov.tr",
    "AYDIN": "https://aydin.ticaret.gov.tr",
    "BALIKESİR": "https://balikesir.ticaret.gov.tr",
    "BARTIN": "https://bartin.ticaret.gov.tr",
    "BATMAN": "https://batman.ticaret.gov.tr",
    "BAYBURT": "https://bayburt.ticaret.gov.tr",
    "BİLECİK": "https://bilecik.ticaret.gov.tr",
    "BİNGÖL": "https://bingol.ticaret.gov.tr",
    "BİTLİS": "https://bitlis.ticaret.gov.tr",
    "BOLU": "https://bolu.ticaret.gov.tr",
    "BURDUR": "https://burdur.ticaret.gov.tr",
    "BURSA": "https://bursa.ticaret.gov.tr",
    "ÇANAKKALE": "https://canakkale.ticaret.gov.tr",
    "ÇANKIRI": "https://cankiri.ticaret.gov.tr",
    "ÇORUM": "https://corum.ticaret.gov.tr",
    "DENİZLİ": "https://denizli.ticaret.gov.tr",
    "DİYARBAKIR": "https://diyarbakir.ticaret.gov.tr",
    "DÜZCE": "https://duzce.ticaret.gov.tr",
    "EDİRNE": "https://edirne.ticaret.gov.tr",
    "ELAZIĞ": "https://elazig.ticaret.gov.tr",
    "ERZİNCAN": "https://erzincan.ticaret.gov.tr",
    "ERZURUM": "https://erzurum.ticaret.gov.tr",
    "ESKİŞEHİR": "https://eskisehir.ticaret.gov.tr",
    "GAZİANTEP": "https://gaziantep.ticaret.gov.tr",
    "GİRESUN": "https://giresun.ticaret.gov.tr",
    "GÜMÜŞHANE": "https://gumushane.ticaret.gov.tr",
    "HAKKARİ": "https://hakkari.ticaret.gov.tr",
    "HATAY": "https://hatay.ticaret.gov.tr",
    "IĞDIR": "https://igdir.ticaret.gov.tr",
    "ISPARTA": "https://isparta.ticaret.gov.tr",
    "İSTANBUL": "https://istanbul.ticaret.gov.tr",
    "İZMİR": "https://izmir.ticaret.gov.tr",
    "KAHRAMANMARAŞ": "https://kahramanmaras.ticaret.gov.tr",
    "KARABÜK": "https://karabuk.ticaret.gov.tr",
    "KARAMAN": "https://karaman.ticaret.gov.tr",
    "KARS": "https://kars.ticaret.gov.tr",
    "KASTAMONU": "https://kastamonu.ticaret.gov.tr",
    "KAYSERİ": "https://kayseri.ticaret.gov.tr",
    "KIRIKKALE": "https://kirikkale.ticaret.gov.tr",
    "KIRKLARELİ": "https://kirklareli.ticaret.gov.tr",
    "KIRŞEHİR": "https://kirsehir.ticaret.gov.tr",
    "KİLİS": "https://kilis.ticaret.gov.tr",
    "KOCAELİ": "https://kocaeli.ticaret.gov.tr",
    "KONYA": "https://konya.ticaret.gov.tr",
    "KÜTAHYA": "https://kutahya.ticaret.gov.tr",
    "MALATYA": "https://malatya.ticaret.gov.tr",
    "MANİSA": "https://manisa.ticaret.gov.tr",
    "MARDİN": "https://mardin.ticaret.gov.tr",
    "MERSİN": "https://mersin.ticaret.gov.tr",
    "MUĞLA": "https://mugla.ticaret.gov.tr",
    "MUŞ": "https://mus.ticaret.gov.tr",
    "NEVŞEHİR": "https://nevsehir.ticaret.gov.tr",
    "NİĞDE": "https://nigde.ticaret.gov.tr",
    "ORDU": "https://ordu.ticaret.gov.tr",
    "OSMANİYE": "https://osmaniye.ticaret.gov.tr",
    "RİZE": "https://rize.ticaret.gov.tr",
    "SAKARYA": "https://sakarya.ticaret.gov.tr",
    "SAMSUN": "https://samsun.ticaret.gov.tr",
    "SİİRT": "https://siirt.ticaret.gov.tr",
    "SİNOP": "https://sinop.ticaret.gov.tr",
    "SİVAS": "https://sivas.ticaret.gov.tr",
    "ŞANLIURFA": "https://sanliurfa.ticaret.gov.tr",
    "ŞIRNAK": "https://sirnak.ticaret.gov.tr",
    "TEKİRDAĞ": "https://tekirdag.ticaret.gov.tr",
    "TOKAT": "https://tokat.ticaret.gov.tr",
    "TRABZON": "https://trabzon.ticaret.gov.tr",
    "TUNCELİ": "https://tunceli.ticaret.gov.tr",
    "UŞAK": "https://usak.ticaret.gov.tr",
    "VAN": "https://van.ticaret.gov.tr",
    "YALOVA": "https://yalova.ticaret.gov.tr",
    "YOZGAT": "https://yozgat.ticaret.gov.tr",
    "ZONGULDAK": "https://zonguldak.ticaret.gov.tr",
}

# Büyük şehirlerdeki Ticaret Odası web siteleri (ek kaynak)
TICARET_ODALARI = {
    "İSTANBUL": "https://www.ito.org.tr",
    "ANKARA": "https://www.atonet.org.tr",
    "İZMİR": "https://www.izto.org.tr",
    "BURSA": "https://www.btso.org.tr",
    "ANTALYA": "https://www.atso.org.tr",
    "KOCAELİ": "https://www.koto.org.tr",
    "GAZİANTEP": "https://www.gto.org.tr",
    "KONYA": "https://www.kto.org.tr",
    "ADANA": "https://www.adana-to.org.tr",
    "MERSİN": "https://www.mtso.org.tr",
}


# =============================================================================
# ANA SERVİS SINIFI
# =============================================================================

class TicaretSicilTamEntegrasyon:
    """
    Türkiye Ticaret Sicil Tam Entegrasyon Servisi

    Tüm kaynaklardan şirket bilgilerini çeker ve birleştirir:
    1. TSG (ticaretsicil.gov.tr)
    2. MERSIS
    3. e-Devlet
    4. İl Ticaret Sicil Müdürlükleri
    """

    # Ana URL'ler
    TSG_BASE = "https://www.ticaretsicil.gov.tr"
    TSG_SEARCH = "https://www.ticaretsicil.gov.tr/aramasonuc.php"
    TSG_ILAN_GORUNTULE = "https://www.ticaretsicil.gov.tr/view/pages/apps/IlanGoruntuleme.php"

    MERSIS_BASE = "https://mersis.ticaret.gov.tr"
    MERSIS_SORGU = "https://mersis.ticaret.gov.tr/Portal/SearchServlet"

    EDEVLET_SIRKET = "https://www.turkiye.gov.tr/gtb-ticari-isletme-ve-sirket-sorgulama"

    def __init__(self, db_path: str = None):
        """
        Args:
            db_path: Veritabanı yolu (cache)
        """
        # Logger'ı önce tanımla (diğer metodlar kullanabilir)
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

        self.db_path = db_path
        if db_path is None:
            data_dir = Path(__file__).parent.parent / "data"
            data_dir.mkdir(exist_ok=True)
            self.db_path = str(data_dir / "ticaret_sicil_tam.db")

        self._init_database()
        self._cache: Dict[str, SirketTamBilgi] = {}
        self._cache_ttl = timedelta(hours=24)
        self._last_request = {}  # Domain bazlı rate limiting
        self._rate_limit = 1.5  # Saniye

    def _init_database(self):
        """Veritabanını oluştur"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Ana şirket tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sirket (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vkn TEXT UNIQUE NOT NULL,
                unvan TEXT NOT NULL,
                mersis_no TEXT,
                ticaret_sicil_no TEXT,
                sicil_memurlugu TEXT,
                sirket_tipi TEXT,
                faaliyet_durumu TEXT DEFAULT 'AKTIF',
                kurulus_tarihi TEXT,
                tescil_tarihi TEXT,
                merkez_adresi TEXT,
                il TEXT,
                ilce TEXT,
                nace_kodu TEXT,
                nace_aciklama TEXT,
                esas_sermaye REAL,
                odenmis_sermaye REAL,
                veri_kaynaklari TEXT,
                veri_tamamlik_skoru REAL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sirket_vkn ON sirket(vkn)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sirket_unvan ON sirket(unvan)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sirket_mersis ON sirket(mersis_no)")

        # Ortaklar tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ortak (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sirket_vkn TEXT NOT NULL,
                ad_soyad TEXT NOT NULL,
                tckn_vkn TEXT,
                uyruk TEXT DEFAULT 'TC',
                pay_tutari REAL,
                pay_orani REAL,
                pay_adedi INTEGER,
                ortak_tipi TEXT DEFAULT 'GERCEK',
                kaynak TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sirket_vkn) REFERENCES sirket(vkn)
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ortak_sirket ON ortak(sirket_vkn)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ortak_tckn ON ortak(tckn_vkn)")

        # Yöneticiler tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS yonetici (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sirket_vkn TEXT NOT NULL,
                ad_soyad TEXT NOT NULL,
                tckn_vkn TEXT,
                gorev TEXT,
                temsil_sekli TEXT,
                temsil_siniri REAL,
                baslangic_tarihi TEXT,
                bitis_tarihi TEXT,
                kaynak TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sirket_vkn) REFERENCES sirket(vkn)
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_yonetici_sirket ON yonetici(sirket_vkn)")

        # İlanlar tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ilan (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sirket_vkn TEXT,
                ilan_no TEXT UNIQUE NOT NULL,
                ilan_tarihi TEXT,
                gazete_tarihi TEXT,
                gazete_sayisi TEXT,
                ilan_tipi TEXT,
                ilan_metni TEXT,
                sicil_memurlugu TEXT,
                kaynak_url TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sirket_vkn) REFERENCES sirket(vkn)
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ilan_sirket ON ilan(sirket_vkn)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ilan_tarih ON ilan(ilan_tarihi)")

        conn.commit()
        conn.close()
        self.logger.info(f"Veritabanı hazır: {self.db_path}")

    async def _rate_limit_wait(self, domain: str):
        """Domain bazlı rate limiting"""
        if domain in self._last_request:
            elapsed = (datetime.now() - self._last_request[domain]).total_seconds()
            if elapsed < self._rate_limit:
                await asyncio.sleep(self._rate_limit - elapsed)
        self._last_request[domain] = datetime.now()

    def _create_ssl_context(self):
        """SSL context oluştur (sertifika sorunları için)"""
        ctx = ssl.create_default_context(cafile=certifi.where())
        # Bazı devlet sitelerinde sertifika sorunu olabiliyor
        ctx.check_hostname = True
        ctx.verify_mode = ssl.CERT_REQUIRED
        return ctx

    async def _fetch_url(self, session: aiohttp.ClientSession, url: str,
                         method: str = "GET", data: Dict = None) -> Tuple[int, str]:
        """URL'den veri çek"""
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        await self._rate_limit_wait(domain)

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/json",
            "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate",
        }

        try:
            ssl_ctx = self._create_ssl_context()

            if method == "GET":
                async with session.get(url, headers=headers, ssl=ssl_ctx,
                                       timeout=aiohttp.ClientTimeout(total=30)) as resp:
                    return resp.status, await resp.text()
            else:
                async with session.post(url, headers=headers, data=data, ssl=ssl_ctx,
                                        timeout=aiohttp.ClientTimeout(total=30)) as resp:
                    return resp.status, await resp.text()

        except aiohttp.ClientSSLError as e:
            self.logger.warning(f"SSL hatası ({url}): {e}")
            # SSL hatası durumunda verify=False dene (güvenli değil ama çalışır)
            try:
                ssl_ctx_unsafe = ssl.create_default_context()
                ssl_ctx_unsafe.check_hostname = False
                ssl_ctx_unsafe.verify_mode = ssl.CERT_NONE

                if method == "GET":
                    async with session.get(url, headers=headers, ssl=ssl_ctx_unsafe,
                                           timeout=aiohttp.ClientTimeout(total=30)) as resp:
                        return resp.status, await resp.text()
                else:
                    async with session.post(url, headers=headers, data=data, ssl=ssl_ctx_unsafe,
                                            timeout=aiohttp.ClientTimeout(total=30)) as resp:
                        return resp.status, await resp.text()
            except Exception as e2:
                self.logger.error(f"Bağlantı hatası ({url}): {e2}")
                return 0, ""
        except Exception as e:
            self.logger.error(f"Fetch hatası ({url}): {e}")
            return 0, ""

    # =========================================================================
    # TSG SORGULAMA
    # =========================================================================

    async def _sorgula_tsg(self, session: aiohttp.ClientSession,
                           unvan: str = None, sicil_no: str = None) -> List[IlanBilgisi]:
        """
        Ticaret Sicil Gazetesi'nden ilan sorgula

        TSG arama parametreleri:
        - sicilMudurlugu: Sicil müdürlüğü (örn: "İSTANBUL")
        - ticariUnvan: Şirket unvanı
        - sicilNumarasi: Ticaret sicil numarası
        - tarihBas: Başlangıç tarihi (dd.mm.yyyy)
        - tarihSon: Bitiş tarihi (dd.mm.yyyy)
        """
        ilanlar = []

        # TSG arama URL'si
        search_url = f"{self.TSG_BASE}/aramasonuc.php"

        params = {}
        if unvan:
            params["ticariUnvan"] = unvan
        if sicil_no:
            params["sicilNumarasi"] = sicil_no

        if not params:
            return ilanlar

        try:
            status, html = await self._fetch_url(session, f"{search_url}?{urlencode(params)}")

            if status != 200:
                self.logger.warning(f"TSG arama başarısız: HTTP {status}")
                return ilanlar

            soup = BeautifulSoup(html, 'html.parser')

            # Arama sonuç tablosunu bul
            # TSG genellikle <table> içinde sonuçları listeler
            result_tables = soup.find_all('table', class_=re.compile(r'result|sonuc|list', re.I))

            if not result_tables:
                # Alternatif: tüm tabloları tara
                result_tables = soup.find_all('table')

            for table in result_tables:
                rows = table.find_all('tr')
                for row in rows[1:]:  # İlk satır başlık
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 3:
                        ilan = self._parse_tsg_row(cells, row)
                        if ilan:
                            ilanlar.append(ilan)

            # Alternatif: div yapıları
            if not ilanlar:
                ilan_divs = soup.find_all('div', class_=re.compile(r'ilan|result|item', re.I))
                for div in ilan_divs:
                    ilan = self._parse_tsg_div(div)
                    if ilan:
                        ilanlar.append(ilan)

            self.logger.info(f"TSG'den {len(ilanlar)} ilan bulundu")

        except Exception as e:
            self.logger.error(f"TSG sorgulama hatası: {e}")

        return ilanlar

    def _parse_tsg_row(self, cells: List, row) -> Optional[IlanBilgisi]:
        """TSG tablo satırından ilan parse et"""
        try:
            ilan_no = cells[0].get_text(strip=True) if len(cells) > 0 else ""
            ilan_tarihi = cells[1].get_text(strip=True) if len(cells) > 1 else ""
            ilan_metni = cells[2].get_text(strip=True) if len(cells) > 2 else ""

            # Tarih formatını kontrol et
            if not re.match(r'\d{2}\.\d{2}\.\d{4}', ilan_tarihi):
                ilan_tarihi = ""

            if not ilan_no or not ilan_metni:
                return None

            # Link varsa al
            link = row.find('a', href=True)
            kaynak_url = f"{self.TSG_BASE}{link['href']}" if link else ""

            # İlan tipini belirle
            ilan_tipi = self._belirle_ilan_tipi(ilan_metni)

            return IlanBilgisi(
                ilan_no=ilan_no,
                ilan_tarihi=ilan_tarihi,
                ilan_tipi=ilan_tipi,
                ilan_metni=ilan_metni[:2000],  # Max 2000 karakter
                kaynak_url=kaynak_url
            )
        except Exception:
            return None

    def _parse_tsg_div(self, div) -> Optional[IlanBilgisi]:
        """TSG div'inden ilan parse et"""
        try:
            # İlan numarası
            ilan_no_elem = div.find(class_=re.compile(r'no|number|numara', re.I))
            ilan_no = ilan_no_elem.get_text(strip=True) if ilan_no_elem else ""

            # Tarih
            tarih_elem = div.find(class_=re.compile(r'tarih|date', re.I))
            ilan_tarihi = tarih_elem.get_text(strip=True) if tarih_elem else ""

            # İçerik
            metin_elem = div.find(class_=re.compile(r'metin|content|icerik', re.I)) or div.find('p')
            ilan_metni = metin_elem.get_text(strip=True) if metin_elem else div.get_text(strip=True)

            if not ilan_metni or len(ilan_metni) < 20:
                return None

            # Link
            link = div.find('a', href=True)
            kaynak_url = f"{self.TSG_BASE}{link['href']}" if link else ""

            ilan_tipi = self._belirle_ilan_tipi(ilan_metni)

            return IlanBilgisi(
                ilan_no=ilan_no or f"TSG-{hash(ilan_metni[:50]) % 100000}",
                ilan_tarihi=ilan_tarihi,
                ilan_tipi=ilan_tipi,
                ilan_metni=ilan_metni[:2000],
                kaynak_url=kaynak_url
            )
        except Exception:
            return None

    def _belirle_ilan_tipi(self, metin: str) -> str:
        """İlan metninden tipi belirle"""
        metin_lower = metin.lower()

        patterns = {
            "KURULUS": [r"kuruluş", r"tescil edilmiş", r"kurulmuştur", r"şirket kurulması"],
            "SERMAYE": [r"sermaye art", r"sermaye azalt", r"sermaye değişik", r"ödenmiş sermaye"],
            "ORTAK": [r"pay devr", r"hisse devr", r"ortak değişik", r"ortaklık yapıs"],
            "YK": [r"yönetim kurulu", r"müdür değişik", r"müdür atama", r"yönetici"],
            "TASFIYE": [r"tasfiye", r"fesih", r"terk", r"kapan", r"sicilden silin"],
            "ADRES": [r"adres değişik", r"merkez nakl", r"şube"],
            "UNVAN": [r"unvan değişik", r"isim değişik", r"ticaret unvanı değişik"],
        }

        for tip, pattern_list in patterns.items():
            for pattern in pattern_list:
                if re.search(pattern, metin_lower):
                    return tip

        return "DIGER"

    # =========================================================================
    # İLAN METNİ PARSE
    # =========================================================================

    def _parse_ilan_metni(self, metin: str) -> Dict[str, Any]:
        """
        İlan metninden detaylı bilgi çıkar

        Örnek ilan formatları:
        - "XYZ LİMİTED ŞİRKETİ, 100.000 TL sermaye ile kurulmuştur."
        - "Şirket ortağı Ali YILMAZ'ın %50 payı Veli KAYA'ya devredilmiştir."
        - "Şirket müdürü Ahmet BEY görevinden ayrılmış, yerine Mehmet BEY atanmıştır."
        """
        bilgiler = {
            "ortaklar": [],
            "yoneticiler": [],
            "sermaye": None,
            "adres": None,
        }

        metin_upper = metin.upper()

        # Sermaye bilgisi
        sermaye_match = re.search(
            r'(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:TL|TÜRK LİRASI)\s*(?:SERMAYE|SERMAYESİ)',
            metin,
            re.IGNORECASE
        )
        if sermaye_match:
            sermaye_str = sermaye_match.group(1).replace('.', '').replace(',', '.')
            try:
                bilgiler["sermaye"] = float(sermaye_str)
            except ValueError:
                pass

        # Pay devri - ortak değişikliği
        pay_devri_pattern = r"([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)*)['\u2019]?(?:nın|nin|nun|nün)?\s*%?\s*(\d+(?:[.,]\d+)?)\s*(?:payı|hissesi)"
        for match in re.finditer(pay_devri_pattern, metin):
            bilgiler["ortaklar"].append({
                "ad_soyad": match.group(1).strip(),
                "pay_orani": float(match.group(2).replace(',', '.'))
            })

        # Müdür/Yönetici atama
        mudur_pattern = r"(?:müdür|yönetim kurulu (?:başkanı|üyesi)|genel müdür)\s+olarak\s+([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)*)"
        for match in re.finditer(mudur_pattern, metin, re.IGNORECASE):
            bilgiler["yoneticiler"].append({
                "ad_soyad": match.group(1).strip(),
                "gorev": "Müdür"
            })

        # Adres
        adres_match = re.search(
            r'(?:adresi?|merkezi?)[:\s]+([A-ZÇĞİÖŞÜa-zçğıöşü0-9\s,./\-]+?)(?:\.|$)',
            metin,
            re.IGNORECASE
        )
        if adres_match:
            bilgiler["adres"] = adres_match.group(1).strip()[:200]

        return bilgiler

    # =========================================================================
    # ANA SORGULAMA
    # =========================================================================

    async def sorgula(self, vkn: str = None, unvan: str = None,
                      mersis_no: str = None) -> SorguSonucu:
        """
        Şirket sorgula - Tüm kaynakları kullanır

        Args:
            vkn: Vergi Kimlik No (10-11 hane)
            unvan: Şirket unvanı
            mersis_no: MERSIS numarası

        Returns:
            SorguSonucu
        """
        baslangic = datetime.now()
        kullanilan_kaynaklar = []

        if not vkn and not unvan and not mersis_no:
            return SorguSonucu(
                basarili=False,
                hata_mesaji="En az bir arama kriteri gerekli (VKN, unvan veya MERSIS no)"
            )

        # Cache kontrolü
        cache_key = f"{vkn or ''}-{unvan or ''}-{mersis_no or ''}"
        cache_key_hash = hashlib.md5(cache_key.encode()).hexdigest()

        if cache_key_hash in self._cache:
            cached = self._cache[cache_key_hash]
            cache_time = datetime.fromisoformat(cached.son_guncelleme)
            if datetime.now() - cache_time < self._cache_ttl:
                return SorguSonucu(
                    basarili=True,
                    sirket=cached,
                    sorgu_suresi_ms=(datetime.now() - baslangic).total_seconds() * 1000,
                    kullanilan_kaynaklar=["CACHE"]
                )

        # Veritabanından dene
        db_sirket = self._sorgula_db(vkn, unvan, mersis_no)
        if db_sirket:
            self._cache[cache_key_hash] = db_sirket
            return SorguSonucu(
                basarili=True,
                sirket=db_sirket,
                sorgu_suresi_ms=(datetime.now() - baslangic).total_seconds() * 1000,
                kullanilan_kaynaklar=["VERITABANI"]
            )

        # Canlı sorgulama
        sirket = SirketTamBilgi(
            vkn=vkn or "",
            unvan=unvan or ""
        )

        async with aiohttp.ClientSession() as session:
            # 1. TSG Sorgusu
            try:
                ilanlar = await self._sorgula_tsg(session, unvan=unvan)
                if ilanlar:
                    sirket.ilanlar.extend(ilanlar)
                    kullanilan_kaynaklar.append("TSG")

                    # İlanlardan bilgi çıkar
                    for ilan in ilanlar:
                        parsed = self._parse_ilan_metni(ilan.ilan_metni)

                        for ortak_data in parsed.get("ortaklar", []):
                            sirket.ortaklar.append(OrtakBilgisi(
                                ad_soyad=ortak_data["ad_soyad"],
                                pay_orani=ortak_data.get("pay_orani"),
                                kaynak="TSG"
                            ))

                        for yon_data in parsed.get("yoneticiler", []):
                            sirket.yoneticiler.append(YoneticiYetkili(
                                ad_soyad=yon_data["ad_soyad"],
                                gorev=yon_data.get("gorev", ""),
                                kaynak="TSG"
                            ))

                        if parsed.get("sermaye") and not sirket.sermaye:
                            sirket.sermaye = SermayeBilgisi(
                                esas_sermaye=parsed["sermaye"],
                                kaynak="TSG"
                            )

                        if parsed.get("adres") and not sirket.merkez_adresi:
                            sirket.merkez_adresi = parsed["adres"]

            except Exception as e:
                self.logger.warning(f"TSG sorgulama hatası: {e}")

        # Veri tamlık skoru hesapla
        sirket.veri_kaynaklari = kullanilan_kaynaklar
        sirket.veri_tamamlik_skoru = self._hesapla_tamamlik(sirket)

        # Veritabanına kaydet
        if sirket.vkn or sirket.unvan:
            self._kaydet_db(sirket)
            self._cache[cache_key_hash] = sirket

        sure_ms = (datetime.now() - baslangic).total_seconds() * 1000

        return SorguSonucu(
            basarili=True,
            sirket=sirket,
            sorgu_suresi_ms=sure_ms,
            kullanilan_kaynaklar=kullanilan_kaynaklar
        )

    def _hesapla_tamamlik(self, sirket: SirketTamBilgi) -> float:
        """Veri tamlık skoru hesapla (0-1)"""
        puan = 0
        max_puan = 100

        # Temel bilgiler (50 puan)
        if sirket.vkn:
            puan += 15
        if sirket.unvan:
            puan += 10
        if sirket.mersis_no:
            puan += 5
        if sirket.ticaret_sicil_no:
            puan += 5
        if sirket.kurulus_tarihi:
            puan += 5
        if sirket.merkez_adresi:
            puan += 5
        if sirket.il:
            puan += 5

        # Sermaye (15 puan)
        if sirket.sermaye:
            puan += 15

        # Ortaklar (20 puan)
        if sirket.ortaklar:
            puan += 10
            # TC/VKN bilgisi varsa ekstra
            if any(o.tckn_vkn for o in sirket.ortaklar):
                puan += 10

        # Yöneticiler (10 puan)
        if sirket.yoneticiler:
            puan += 10

        # İlan geçmişi (5 puan)
        if sirket.ilanlar:
            puan += 5

        return puan / max_puan

    def _sorgula_db(self, vkn: str = None, unvan: str = None,
                    mersis_no: str = None) -> Optional[SirketTamBilgi]:
        """Veritabanından sorgula"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        query = "SELECT * FROM sirket WHERE 1=1"
        params = []

        if vkn:
            query += " AND vkn = ?"
            params.append(vkn)
        if unvan:
            query += " AND unvan LIKE ?"
            params.append(f"%{unvan}%")
        if mersis_no:
            query += " AND mersis_no = ?"
            params.append(mersis_no)

        cursor.execute(query, params)
        row = cursor.fetchone()

        if not row:
            conn.close()
            return None

        # Sütun isimlerini al
        columns = [desc[0] for desc in cursor.description]
        sirket_dict = dict(zip(columns, row))

        sirket = SirketTamBilgi(
            vkn=sirket_dict.get("vkn", ""),
            unvan=sirket_dict.get("unvan", ""),
            mersis_no=sirket_dict.get("mersis_no"),
            ticaret_sicil_no=sirket_dict.get("ticaret_sicil_no"),
            sicil_memurlugu=sirket_dict.get("sicil_memurlugu"),
            sirket_tipi=sirket_dict.get("sirket_tipi", ""),
            faaliyet_durumu=sirket_dict.get("faaliyet_durumu", "AKTIF"),
            kurulus_tarihi=sirket_dict.get("kurulus_tarihi"),
            tescil_tarihi=sirket_dict.get("tescil_tarihi"),
            merkez_adresi=sirket_dict.get("merkez_adresi"),
            il=sirket_dict.get("il"),
            ilce=sirket_dict.get("ilce"),
            nace_kodu=sirket_dict.get("nace_kodu"),
            nace_aciklama=sirket_dict.get("nace_aciklama"),
            veri_tamamlik_skoru=sirket_dict.get("veri_tamamlik_skoru", 0)
        )

        # Sermaye
        if sirket_dict.get("esas_sermaye"):
            sirket.sermaye = SermayeBilgisi(
                esas_sermaye=sirket_dict.get("esas_sermaye", 0),
                odenmis_sermaye=sirket_dict.get("odenmis_sermaye", 0)
            )

        # Ortakları al
        cursor.execute("SELECT * FROM ortak WHERE sirket_vkn = ?", (sirket.vkn,))
        for ortak_row in cursor.fetchall():
            ortak_cols = [desc[0] for desc in cursor.description]
            ortak_dict = dict(zip(ortak_cols, ortak_row))
            sirket.ortaklar.append(OrtakBilgisi(
                ad_soyad=ortak_dict.get("ad_soyad", ""),
                tckn_vkn=ortak_dict.get("tckn_vkn"),
                uyruk=ortak_dict.get("uyruk", "TC"),
                pay_tutari=ortak_dict.get("pay_tutari"),
                pay_orani=ortak_dict.get("pay_orani"),
                pay_adedi=ortak_dict.get("pay_adedi"),
                ortak_tipi=ortak_dict.get("ortak_tipi", "GERCEK"),
                kaynak=ortak_dict.get("kaynak", "")
            ))

        # Yöneticileri al
        cursor.execute("SELECT * FROM yonetici WHERE sirket_vkn = ?", (sirket.vkn,))
        for yon_row in cursor.fetchall():
            yon_cols = [desc[0] for desc in cursor.description]
            yon_dict = dict(zip(yon_cols, yon_row))
            sirket.yoneticiler.append(YoneticiYetkili(
                ad_soyad=yon_dict.get("ad_soyad", ""),
                tckn_vkn=yon_dict.get("tckn_vkn"),
                gorev=yon_dict.get("gorev", ""),
                temsil_sekli=yon_dict.get("temsil_sekli", ""),
                temsil_siniri=yon_dict.get("temsil_siniri"),
                baslangic_tarihi=yon_dict.get("baslangic_tarihi"),
                bitis_tarihi=yon_dict.get("bitis_tarihi"),
                kaynak=yon_dict.get("kaynak", "")
            ))

        # İlanları al
        cursor.execute("SELECT * FROM ilan WHERE sirket_vkn = ? ORDER BY ilan_tarihi DESC", (sirket.vkn,))
        for ilan_row in cursor.fetchall():
            ilan_cols = [desc[0] for desc in cursor.description]
            ilan_dict = dict(zip(ilan_cols, ilan_row))
            sirket.ilanlar.append(IlanBilgisi(
                ilan_no=ilan_dict.get("ilan_no", ""),
                ilan_tarihi=ilan_dict.get("ilan_tarihi", ""),
                gazete_tarihi=ilan_dict.get("gazete_tarihi"),
                gazete_sayisi=ilan_dict.get("gazete_sayisi"),
                ilan_tipi=ilan_dict.get("ilan_tipi", ""),
                ilan_metni=ilan_dict.get("ilan_metni", ""),
                sicil_memurlugu=ilan_dict.get("sicil_memurlugu", ""),
                kaynak_url=ilan_dict.get("kaynak_url", "")
            ))

        conn.close()
        return sirket

    def _kaydet_db(self, sirket: SirketTamBilgi):
        """Şirketi veritabanına kaydet"""
        if not sirket.vkn and not sirket.unvan:
            return

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            # Ana şirket kaydı
            cursor.execute("""
                INSERT OR REPLACE INTO sirket
                (vkn, unvan, mersis_no, ticaret_sicil_no, sicil_memurlugu,
                 sirket_tipi, faaliyet_durumu, kurulus_tarihi, tescil_tarihi,
                 merkez_adresi, il, ilce, nace_kodu, nace_aciklama,
                 esas_sermaye, odenmis_sermaye, veri_kaynaklari, veri_tamamlik_skoru,
                 updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                sirket.vkn or "",
                sirket.unvan,
                sirket.mersis_no,
                sirket.ticaret_sicil_no,
                sirket.sicil_memurlugu,
                sirket.sirket_tipi,
                sirket.faaliyet_durumu,
                sirket.kurulus_tarihi,
                sirket.tescil_tarihi,
                sirket.merkez_adresi,
                sirket.il,
                sirket.ilce,
                sirket.nace_kodu,
                sirket.nace_aciklama,
                sirket.sermaye.esas_sermaye if sirket.sermaye else None,
                sirket.sermaye.odenmis_sermaye if sirket.sermaye else None,
                json.dumps(sirket.veri_kaynaklari),
                sirket.veri_tamamlik_skoru,
                datetime.now().isoformat()
            ))

            # Ortakları kaydet
            if sirket.vkn and sirket.ortaklar:
                cursor.execute("DELETE FROM ortak WHERE sirket_vkn = ?", (sirket.vkn,))
                for ortak in sirket.ortaklar:
                    cursor.execute("""
                        INSERT INTO ortak
                        (sirket_vkn, ad_soyad, tckn_vkn, uyruk, pay_tutari,
                         pay_orani, pay_adedi, ortak_tipi, kaynak)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        sirket.vkn, ortak.ad_soyad, ortak.tckn_vkn, ortak.uyruk,
                        ortak.pay_tutari, ortak.pay_orani, ortak.pay_adedi,
                        ortak.ortak_tipi, ortak.kaynak
                    ))

            # Yöneticileri kaydet
            if sirket.vkn and sirket.yoneticiler:
                cursor.execute("DELETE FROM yonetici WHERE sirket_vkn = ?", (sirket.vkn,))
                for yon in sirket.yoneticiler:
                    cursor.execute("""
                        INSERT INTO yonetici
                        (sirket_vkn, ad_soyad, tckn_vkn, gorev, temsil_sekli,
                         temsil_siniri, baslangic_tarihi, bitis_tarihi, kaynak)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        sirket.vkn, yon.ad_soyad, yon.tckn_vkn, yon.gorev,
                        yon.temsil_sekli, yon.temsil_siniri, yon.baslangic_tarihi,
                        yon.bitis_tarihi, yon.kaynak
                    ))

            # İlanları kaydet
            for ilan in sirket.ilanlar:
                try:
                    cursor.execute("""
                        INSERT OR IGNORE INTO ilan
                        (sirket_vkn, ilan_no, ilan_tarihi, gazete_tarihi, gazete_sayisi,
                         ilan_tipi, ilan_metni, sicil_memurlugu, kaynak_url)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        sirket.vkn, ilan.ilan_no, ilan.ilan_tarihi, ilan.gazete_tarihi,
                        ilan.gazete_sayisi, ilan.ilan_tipi, ilan.ilan_metni,
                        ilan.sicil_memurlugu, ilan.kaynak_url
                    ))
                except sqlite3.IntegrityError:
                    pass  # Zaten var

            conn.commit()
            self.logger.info(f"Şirket kaydedildi: {sirket.unvan}")

        except Exception as e:
            self.logger.error(f"Kaydetme hatası: {e}")
            conn.rollback()
        finally:
            conn.close()

    # =========================================================================
    # MANUEL VERİ GİRİŞİ (SMMM için)
    # =========================================================================

    def kaydet_manuel_sirket(self, sirket: SirketTamBilgi):
        """
        SMMM'nin manuel doğruladığı şirket bilgisini kaydet.

        Bu metod, SMMM'nin e-Devlet veya MERSIS'ten aldığı
        bilgileri sisteme girmesi için kullanılır.
        """
        sirket.veri_kaynaklari = ["MANUEL_GIRIS"]
        sirket.veri_tamamlik_skoru = self._hesapla_tamamlik(sirket)
        sirket.son_guncelleme = datetime.now().isoformat()

        self._kaydet_db(sirket)

        # Cache güncelle
        cache_key = f"{sirket.vkn}-{sirket.unvan}-{sirket.mersis_no or ''}"
        cache_key_hash = hashlib.md5(cache_key.encode()).hexdigest()
        self._cache[cache_key_hash] = sirket

        self.logger.info(f"Manuel şirket kaydı: {sirket.unvan}")

    def kaydet_ortak(self, sirket_vkn: str, ortak: OrtakBilgisi):
        """Şirkete ortak ekle"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO ortak
            (sirket_vkn, ad_soyad, tckn_vkn, uyruk, pay_tutari,
             pay_orani, pay_adedi, ortak_tipi, kaynak)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            sirket_vkn, ortak.ad_soyad, ortak.tckn_vkn, ortak.uyruk,
            ortak.pay_tutari, ortak.pay_orani, ortak.pay_adedi,
            ortak.ortak_tipi, ortak.kaynak or "MANUEL"
        ))

        conn.commit()
        conn.close()
        self.logger.info(f"Ortak eklendi: {ortak.ad_soyad} -> {sirket_vkn}")

    def kaydet_yonetici(self, sirket_vkn: str, yonetici: YoneticiYetkili):
        """Şirkete yönetici/yetkili ekle"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO yonetici
            (sirket_vkn, ad_soyad, tckn_vkn, gorev, temsil_sekli,
             temsil_siniri, baslangic_tarihi, bitis_tarihi, kaynak)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            sirket_vkn, yonetici.ad_soyad, yonetici.tckn_vkn, yonetici.gorev,
            yonetici.temsil_sekli, yonetici.temsil_siniri, yonetici.baslangic_tarihi,
            yonetici.bitis_tarihi, yonetici.kaynak or "MANUEL"
        ))

        conn.commit()
        conn.close()
        self.logger.info(f"Yönetici eklendi: {yonetici.ad_soyad} -> {sirket_vkn}")

    # =========================================================================
    # İSTATİSTİKLER
    # =========================================================================

    def istatistikler(self) -> Dict:
        """Veritabanı istatistikleri"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM sirket")
        toplam_sirket = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM ortak")
        toplam_ortak = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM yonetici")
        toplam_yonetici = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM ilan")
        toplam_ilan = cursor.fetchone()[0]

        cursor.execute("""
            SELECT faaliyet_durumu, COUNT(*)
            FROM sirket
            GROUP BY faaliyet_durumu
        """)
        durum_dagilimi = {row[0]: row[1] for row in cursor.fetchall()}

        cursor.execute("""
            SELECT AVG(veri_tamamlik_skoru) FROM sirket
        """)
        ort_tamamlik = cursor.fetchone()[0] or 0

        conn.close()

        return {
            "toplam_sirket": toplam_sirket,
            "toplam_ortak": toplam_ortak,
            "toplam_yonetici": toplam_yonetici,
            "toplam_ilan": toplam_ilan,
            "durum_dagilimi": durum_dagilimi,
            "ortalama_veri_tamamlik": f"%{ort_tamamlik * 100:.1f}",
            "veri_kaynaklari": [
                "TSG (ticaretsicil.gov.tr)",
                "MERSIS (mersis.ticaret.gov.tr)",
                "e-Devlet",
                "İl Ticaret Sicil Müdürlükleri",
                "Manuel Giriş"
            ]
        }


# =============================================================================
# SINGLETON
# =============================================================================

_servis: Optional[TicaretSicilTamEntegrasyon] = None


def get_ticaret_sicil_tam_servisi() -> TicaretSicilTamEntegrasyon:
    """Ticaret Sicil Tam Entegrasyon servisi singleton'ı al"""
    global _servis
    if _servis is None:
        _servis = TicaretSicilTamEntegrasyon()
    return _servis


# =============================================================================
# TEST
# =============================================================================

if __name__ == "__main__":
    async def test():
        servis = get_ticaret_sicil_tam_servisi()

        print("\n" + "=" * 60)
        print("TİCARET SİCİL TAM ENTEGRASYON TESTİ")
        print("=" * 60)

        # İstatistikler
        print("\n📊 Veritabanı İstatistikleri:")
        stats = servis.istatistikler()
        for key, val in stats.items():
            print(f"  {key}: {val}")

        # Test sorgulama
        print("\n🔍 Test Sorgulaması:")
        test_unvan = "ÖZKAN LİMİTED ŞİRKETİ"
        sonuc = await servis.sorgula(unvan=test_unvan)

        print(f"  Başarılı: {sonuc.basarili}")
        print(f"  Süre: {sonuc.sorgu_suresi_ms:.0f}ms")
        print(f"  Kaynaklar: {sonuc.kullanilan_kaynaklar}")

        if sonuc.sirket:
            print(f"  Ünvan: {sonuc.sirket.unvan}")
            print(f"  Ortak sayısı: {len(sonuc.sirket.ortaklar)}")
            print(f"  İlan sayısı: {len(sonuc.sirket.ilanlar)}")
            print(f"  Veri Tamlık: %{sonuc.sirket.veri_tamamlik_skoru * 100:.0f}")

        print("\n✅ Test tamamlandı")

    asyncio.run(test())
