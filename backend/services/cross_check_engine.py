"""
Capraz Kontrol Motoru - LYNTOS v2

Mizan <-> KDV Beyanname <-> E-Fatura <-> Banka <-> Muhtasar <-> SGK

MUHASEBE KONTROL KURALLARI:
1. Mizan 600 (Net Satışlar) ≈ KDV Beyannamesi Matrah
2. Mizan 191 (İndirilecek KDV) ≈ KDV Beyannamesi İndirilecek KDV
3. Mizan 391 (Hesaplanan KDV) ≈ KDV Beyannamesi Hesaplanan KDV
4. Mizan 102 (Banka) ≈ Banka Ekstresi Kapanış Bakiyesi
5. E-Fatura Toplam ≈ Mizan 600
6. Muhtasar (MPHB) ≈ SGK APHB (Personel brüt ücret)
7. Mizan vs Geçici Vergi Beyannamesi
8. Mizan vs Kurumlar Vergisi Beyannamesi

TEKNİK KONTROLLER (SMMM KRİTİK):
- Ters Bakiye: Aktif hesapların alacak, pasif hesapların borç bakiyeli olması
- Eksi Hesap: Negatif bakiye olmaması gereken hesapların kontrolü
- Mizan Denklği: Toplam Borç = Toplam Alacak

KDV MATRAH FORMÜLÜ:
Matrah = Mizan 600 - İhracat (601) - İstisna Satışlar (602) + Diğer Gelirler

TEK DÜZEN HESAP PLANI - HESAP KURALLARI:
- 1xx: Dönen Varlıklar (Aktif - Borç bakiyeli)
- 2xx: Duran Varlıklar (Aktif - Borç bakiyeli)
- 3xx: Kısa Vadeli Yabancı Kaynaklar (Pasif - Alacak bakiyeli)
- 4xx: Uzun Vadeli Yabancı Kaynaklar (Pasif - Alacak bakiyeli)
- 5xx: Özkaynaklar (Pasif - Alacak bakiyeli)
- 6xx: Gelir Tablosu (Gelir: Alacak, Gider: Borç)
- 7xx: Maliyet Hesapları (Borç bakiyeli)

ÖNEMLI:
- 600 hesap: NET SATIŞLAR (tüm satışlar - iadeler) - Alacak bakiyeli
- 601 hesap: Yurtdışı satışlar (İhracat - KDV'siz) - Alacak bakiyeli
- 602 hesap: Diğer indirimler (İstisna satışlar) - Alacak bakiyeli
- 391 hesap: Hesaplanan KDV - ALACAK bakiyeli (Pasif hesap)
- 191 hesap: İndirilecek KDV - BORÇ bakiyeli (Aktif hesap)
- 100 hesap: Kasa - BORÇ bakiyeli (eksi olamaz!)
- 102 hesap: Bankalar - BORÇ bakiyeli (eksi olamaz!)
- 500 hesap: Sermaye - ALACAK bakiyeli

Trust Score: 1.0 (gerçek veriden hesaplama)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class CheckCategory(str, Enum):
    """Çapraz kontrol kategorileri"""
    MIZAN_VS_BEYANNAME = "mizan_vs_beyanname"
    MIZAN_VS_EFATURA = "mizan_vs_efatura"
    MIZAN_VS_BANKA = "mizan_vs_banka"
    BEYANNAME_VS_BEYANNAME = "beyanname_vs_beyanname"
    TEKNIK_KONTROL = "teknik_kontrol"
    MIZAN_VS_MALI_TABLO = "mizan_vs_mali_tablo"


class DataStatus(str, Enum):
    """Veri durumu"""
    LOADED = "loaded"          # Veri yüklü
    NOT_LOADED = "not_loaded"  # Veri yüklenmemiş
    PARTIAL = "partial"        # Kısmen yüklü
    ERROR = "error"            # Hatalı veri


@dataclass
class CrossCheckResult:
    """Capraz kontrol sonucu"""
    check_type: str  # "mizan_vs_beyanname", "mizan_vs_efatura", ...
    check_id: str  # Unique ID for this check
    category: str  # CheckCategory value
    status: str  # "ok", "warning", "error", "no_data"
    severity: str  # "info", "low", "medium", "high", "critical"
    difference: float
    reason_tr: str
    evidence_refs: List[str]
    actions: List[str]
    legal_basis_refs: List[str]  # ["SRC-0045", ...]
    trust_score: float = 1.0
    # Detaylı bilgi
    source_label: str = ""
    target_label: str = ""
    mizan_value: Optional[float] = None
    beyan_value: Optional[float] = None
    percent_diff: Optional[float] = None
    breakdown: Dict = field(default_factory=dict)
    # Veri durumu uyarıları
    data_warnings: List[str] = field(default_factory=list)


@dataclass
class KDVMutabakatResult:
    """KDV Beyannamesi ile Mizan mutabakat detayı"""
    # Mizan tarafı
    mizan_600_satislar: float = 0.0
    mizan_601_ihracat: float = 0.0
    mizan_602_istisna: float = 0.0
    mizan_391_hesaplanan_kdv: float = 0.0
    mizan_191_indirilecek_kdv: float = 0.0
    # Hesaplanan KDV matrahı
    hesaplanan_matrah: float = 0.0

    # Beyanname tarafı
    beyan_matrah: float = 0.0
    beyan_hesaplanan_kdv: float = 0.0
    beyan_indirilecek_kdv: float = 0.0
    beyan_odenecek_kdv: float = 0.0

    # Farklar
    matrah_farki: float = 0.0
    hesaplanan_kdv_farki: float = 0.0
    indirilecek_kdv_farki: float = 0.0

    # Sonuç
    status: str = "pending"
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


@dataclass
class TeknikKontrolResult:
    """Teknik kontrol sonucu (ters bakiye, eksi hesap vb.)"""
    check_type: str  # "ters_bakiye", "eksi_hesap", "mizan_denklik"
    status: str  # "ok", "warning", "error"
    hesap_kodu: str
    hesap_adi: str
    beklenen_yon: str  # "borc", "alacak"
    gercek_yon: str
    bakiye: float
    reason_tr: str
    severity: str  # "critical", "high", "medium", "low"
    actions: List[str]
    legal_basis_refs: List[str]


# TEK DÜZEN HESAP PLANI - HESAP BAKIYE YÖNLERİ
# SMMM için kritik: Bu kurallar VUK ve TMS'ye göre kesindir
HESAP_BAKIYE_KURALLARI = {
    # Dönen Varlıklar (1xx) - Aktif - Borç bakiyeli
    "100": {"yon": "borc", "ad": "Kasa", "eksi_olabilir": False, "grup": "donen_varlik"},
    "101": {"yon": "borc", "ad": "Alınan Çekler", "eksi_olabilir": False, "grup": "donen_varlik"},
    "102": {"yon": "borc", "ad": "Bankalar", "eksi_olabilir": False, "grup": "donen_varlik"},
    "103": {"yon": "borc", "ad": "Verilen Çekler ve Ödeme Emirleri (-)", "eksi_olabilir": True, "grup": "donen_varlik"},
    "108": {"yon": "borc", "ad": "Diğer Hazır Değerler", "eksi_olabilir": False, "grup": "donen_varlik"},
    "110": {"yon": "borc", "ad": "Hisse Senetleri", "eksi_olabilir": False, "grup": "donen_varlik"},
    "120": {"yon": "borc", "ad": "Alıcılar", "eksi_olabilir": False, "grup": "donen_varlik"},
    "121": {"yon": "borc", "ad": "Alacak Senetleri", "eksi_olabilir": False, "grup": "donen_varlik"},
    "126": {"yon": "borc", "ad": "Verilen Depozito ve Teminatlar", "eksi_olabilir": False, "grup": "donen_varlik"},
    "127": {"yon": "borc", "ad": "Diğer Ticari Alacaklar", "eksi_olabilir": False, "grup": "donen_varlik"},
    "128": {"yon": "alacak", "ad": "Şüpheli Ticari Alacaklar Karşılığı (-)", "eksi_olabilir": True, "grup": "donen_varlik"},
    "129": {"yon": "alacak", "ad": "Şüpheli Diğer Alacaklar Karşılığı (-)", "eksi_olabilir": True, "grup": "donen_varlik"},
    "131": {"yon": "borc", "ad": "Ortaklardan Alacaklar", "eksi_olabilir": False, "grup": "donen_varlik"},
    "135": {"yon": "borc", "ad": "Personelden Alacaklar", "eksi_olabilir": False, "grup": "donen_varlik"},
    "136": {"yon": "borc", "ad": "Diğer Çeşitli Alacaklar", "eksi_olabilir": False, "grup": "donen_varlik"},
    "150": {"yon": "borc", "ad": "İlk Madde ve Malzeme", "eksi_olabilir": False, "grup": "donen_varlik"},
    "151": {"yon": "borc", "ad": "Yarı Mamuller", "eksi_olabilir": False, "grup": "donen_varlik"},
    "152": {"yon": "borc", "ad": "Mamuller", "eksi_olabilir": False, "grup": "donen_varlik"},
    "153": {"yon": "borc", "ad": "Ticari Mallar", "eksi_olabilir": False, "grup": "donen_varlik"},
    "157": {"yon": "borc", "ad": "Diğer Stoklar", "eksi_olabilir": False, "grup": "donen_varlik"},
    "159": {"yon": "borc", "ad": "Verilen Sipariş Avansları", "eksi_olabilir": False, "grup": "donen_varlik"},
    "180": {"yon": "borc", "ad": "Gelecek Aylara Ait Giderler", "eksi_olabilir": False, "grup": "donen_varlik"},
    "181": {"yon": "borc", "ad": "Gelir Tahakkukları", "eksi_olabilir": False, "grup": "donen_varlik"},
    "190": {"yon": "borc", "ad": "Devreden KDV", "eksi_olabilir": False, "grup": "donen_varlik"},
    "191": {"yon": "borc", "ad": "İndirilecek KDV", "eksi_olabilir": False, "grup": "donen_varlik"},
    "192": {"yon": "borc", "ad": "Diğer KDV", "eksi_olabilir": False, "grup": "donen_varlik"},
    "193": {"yon": "borc", "ad": "Peşin Ödenen Vergiler ve Fonlar", "eksi_olabilir": False, "grup": "donen_varlik"},
    "195": {"yon": "borc", "ad": "İş Avansları", "eksi_olabilir": False, "grup": "donen_varlik"},
    "196": {"yon": "borc", "ad": "Personel Avansları", "eksi_olabilir": False, "grup": "donen_varlik"},

    # Duran Varlıklar (2xx) - Aktif - Borç bakiyeli
    "250": {"yon": "borc", "ad": "Arazi ve Arsalar", "eksi_olabilir": False, "grup": "duran_varlik"},
    "251": {"yon": "borc", "ad": "Yeraltı ve Yerüstü Düzenleri", "eksi_olabilir": False, "grup": "duran_varlik"},
    "252": {"yon": "borc", "ad": "Binalar", "eksi_olabilir": False, "grup": "duran_varlik"},
    "253": {"yon": "borc", "ad": "Tesis, Makine ve Cihazlar", "eksi_olabilir": False, "grup": "duran_varlik"},
    "254": {"yon": "borc", "ad": "Taşıtlar", "eksi_olabilir": False, "grup": "duran_varlik"},
    "255": {"yon": "borc", "ad": "Demirbaşlar", "eksi_olabilir": False, "grup": "duran_varlik"},
    "256": {"yon": "borc", "ad": "Diğer Maddi Duran Varlıklar", "eksi_olabilir": False, "grup": "duran_varlik"},
    "257": {"yon": "alacak", "ad": "Birikmiş Amortismanlar (-)", "eksi_olabilir": True, "grup": "duran_varlik"},
    "258": {"yon": "borc", "ad": "Yapılmakta Olan Yatırımlar", "eksi_olabilir": False, "grup": "duran_varlik"},
    "259": {"yon": "borc", "ad": "Verilen Avanslar", "eksi_olabilir": False, "grup": "duran_varlik"},
    "260": {"yon": "borc", "ad": "Haklar", "eksi_olabilir": False, "grup": "duran_varlik"},
    "261": {"yon": "borc", "ad": "Şerefiye", "eksi_olabilir": False, "grup": "duran_varlik"},
    "262": {"yon": "borc", "ad": "Kuruluş ve Örgütlenme Giderleri", "eksi_olabilir": False, "grup": "duran_varlik"},
    "263": {"yon": "borc", "ad": "Araştırma ve Geliştirme Giderleri", "eksi_olabilir": False, "grup": "duran_varlik"},
    "264": {"yon": "borc", "ad": "Özel Maliyetler", "eksi_olabilir": False, "grup": "duran_varlik"},
    "267": {"yon": "borc", "ad": "Diğer Maddi Olmayan Duran Varlıklar", "eksi_olabilir": False, "grup": "duran_varlik"},
    "268": {"yon": "alacak", "ad": "Birikmiş Amortismanlar (-)", "eksi_olabilir": True, "grup": "duran_varlik"},

    # Kısa Vadeli Yabancı Kaynaklar (3xx) - Pasif - Alacak bakiyeli
    "300": {"yon": "alacak", "ad": "Banka Kredileri", "eksi_olabilir": False, "grup": "kvyk"},
    "303": {"yon": "alacak", "ad": "Uzun Vadeli Kredilerin Anapara Taksitleri ve Faizleri", "eksi_olabilir": False, "grup": "kvyk"},
    "320": {"yon": "alacak", "ad": "Satıcılar", "eksi_olabilir": False, "grup": "kvyk"},
    "321": {"yon": "alacak", "ad": "Borç Senetleri", "eksi_olabilir": False, "grup": "kvyk"},
    "326": {"yon": "alacak", "ad": "Alınan Depozito ve Teminatlar", "eksi_olabilir": False, "grup": "kvyk"},
    "329": {"yon": "alacak", "ad": "Diğer Ticari Borçlar", "eksi_olabilir": False, "grup": "kvyk"},
    "331": {"yon": "alacak", "ad": "Ortaklara Borçlar", "eksi_olabilir": False, "grup": "kvyk"},
    "335": {"yon": "alacak", "ad": "Personele Borçlar", "eksi_olabilir": False, "grup": "kvyk"},
    "336": {"yon": "alacak", "ad": "Diğer Çeşitli Borçlar", "eksi_olabilir": False, "grup": "kvyk"},
    "340": {"yon": "alacak", "ad": "Alınan Sipariş Avansları", "eksi_olabilir": False, "grup": "kvyk"},
    "349": {"yon": "alacak", "ad": "Alınan Diğer Avanslar", "eksi_olabilir": False, "grup": "kvyk"},
    "360": {"yon": "alacak", "ad": "Ödenecek Vergi ve Fonlar", "eksi_olabilir": False, "grup": "kvyk"},
    "361": {"yon": "alacak", "ad": "Ödenecek Sosyal Güvenlik Kesintileri", "eksi_olabilir": False, "grup": "kvyk"},
    "368": {"yon": "alacak", "ad": "Vadesi Geçmiş, Ertelenmiş veya Taksitlendirilmiş Vergi ve Diğer Yükümlülükler", "eksi_olabilir": False, "grup": "kvyk"},
    "369": {"yon": "alacak", "ad": "Ödenecek Diğer Yükümlülükler", "eksi_olabilir": False, "grup": "kvyk"},
    "370": {"yon": "alacak", "ad": "Dönem Karı Vergi ve Diğer Yasal Yükümlülük Karşılıkları", "eksi_olabilir": False, "grup": "kvyk"},
    "371": {"yon": "alacak", "ad": "Dönem Karının Peşin Ödenen Vergi ve Diğer Yükümlülükleri (-)", "eksi_olabilir": True, "grup": "kvyk"},
    "372": {"yon": "alacak", "ad": "Kıdem Tazminatı Karşılığı", "eksi_olabilir": False, "grup": "kvyk"},
    "373": {"yon": "alacak", "ad": "Maliyet Giderleri Karşılığı", "eksi_olabilir": False, "grup": "kvyk"},
    "379": {"yon": "alacak", "ad": "Diğer Borç ve Gider Karşılıkları", "eksi_olabilir": False, "grup": "kvyk"},
    "380": {"yon": "alacak", "ad": "Gelecek Aylara Ait Gelirler", "eksi_olabilir": False, "grup": "kvyk"},
    "381": {"yon": "alacak", "ad": "Gider Tahakkukları", "eksi_olabilir": False, "grup": "kvyk"},
    "391": {"yon": "alacak", "ad": "Hesaplanan KDV", "eksi_olabilir": False, "grup": "kvyk"},
    "392": {"yon": "alacak", "ad": "Diğer KDV", "eksi_olabilir": False, "grup": "kvyk"},

    # Uzun Vadeli Yabancı Kaynaklar (4xx) - Pasif - Alacak bakiyeli
    "400": {"yon": "alacak", "ad": "Banka Kredileri", "eksi_olabilir": False, "grup": "uvyk"},
    "420": {"yon": "alacak", "ad": "Satıcılar", "eksi_olabilir": False, "grup": "uvyk"},
    "421": {"yon": "alacak", "ad": "Borç Senetleri", "eksi_olabilir": False, "grup": "uvyk"},
    "426": {"yon": "alacak", "ad": "Alınan Depozito ve Teminatlar", "eksi_olabilir": False, "grup": "uvyk"},
    "431": {"yon": "alacak", "ad": "Ortaklara Borçlar", "eksi_olabilir": False, "grup": "uvyk"},
    "432": {"yon": "alacak", "ad": "İştiraklere Borçlar", "eksi_olabilir": False, "grup": "uvyk"},
    "436": {"yon": "alacak", "ad": "Diğer Çeşitli Borçlar", "eksi_olabilir": False, "grup": "uvyk"},
    "440": {"yon": "alacak", "ad": "Alınan Sipariş Avansları", "eksi_olabilir": False, "grup": "uvyk"},
    "449": {"yon": "alacak", "ad": "Alınan Diğer Avanslar", "eksi_olabilir": False, "grup": "uvyk"},
    "472": {"yon": "alacak", "ad": "Kıdem Tazminatı Karşılığı", "eksi_olabilir": False, "grup": "uvyk"},
    "479": {"yon": "alacak", "ad": "Diğer Borç ve Gider Karşılıkları", "eksi_olabilir": False, "grup": "uvyk"},
    "480": {"yon": "alacak", "ad": "Gelecek Yıllara Ait Gelirler", "eksi_olabilir": False, "grup": "uvyk"},
    "481": {"yon": "alacak", "ad": "Gider Tahakkukları", "eksi_olabilir": False, "grup": "uvyk"},
    "492": {"yon": "alacak", "ad": "Gelecek Yıllara Ertelenen veya Terkin Edilecek KDV", "eksi_olabilir": False, "grup": "uvyk"},
    "493": {"yon": "alacak", "ad": "Tesise Katılma Payları", "eksi_olabilir": False, "grup": "uvyk"},

    # Özkaynaklar (5xx) - Pasif - Alacak bakiyeli
    "500": {"yon": "alacak", "ad": "Sermaye", "eksi_olabilir": False, "grup": "ozkaynak"},
    "501": {"yon": "borc", "ad": "Ödenmemiş Sermaye (-)", "eksi_olabilir": True, "grup": "ozkaynak"},
    "502": {"yon": "alacak", "ad": "Sermaye Düzeltmesi Olumlu Farkları", "eksi_olabilir": False, "grup": "ozkaynak"},
    "503": {"yon": "borc", "ad": "Sermaye Düzeltmesi Olumsuz Farkları (-)", "eksi_olabilir": True, "grup": "ozkaynak"},
    "520": {"yon": "alacak", "ad": "Hisse Senedi İhraç Primleri", "eksi_olabilir": False, "grup": "ozkaynak"},
    "521": {"yon": "alacak", "ad": "Hisse Senedi İptal Karları", "eksi_olabilir": False, "grup": "ozkaynak"},
    "522": {"yon": "alacak", "ad": "M.D.V. Yeniden Değerleme Artışları", "eksi_olabilir": False, "grup": "ozkaynak"},
    "523": {"yon": "alacak", "ad": "İştirakler Yeniden Değerleme Artışları", "eksi_olabilir": False, "grup": "ozkaynak"},
    "529": {"yon": "alacak", "ad": "Diğer Sermaye Yedekleri", "eksi_olabilir": False, "grup": "ozkaynak"},
    "540": {"yon": "alacak", "ad": "Yasal Yedekler", "eksi_olabilir": False, "grup": "ozkaynak"},
    "541": {"yon": "alacak", "ad": "Statü Yedekleri", "eksi_olabilir": False, "grup": "ozkaynak"},
    "542": {"yon": "alacak", "ad": "Olağanüstü Yedekler", "eksi_olabilir": False, "grup": "ozkaynak"},
    "548": {"yon": "alacak", "ad": "Diğer Kar Yedekleri", "eksi_olabilir": False, "grup": "ozkaynak"},
    "549": {"yon": "alacak", "ad": "Özel Fonlar", "eksi_olabilir": False, "grup": "ozkaynak"},
    "570": {"yon": "alacak", "ad": "Geçmiş Yıllar Karları", "eksi_olabilir": False, "grup": "ozkaynak"},
    "580": {"yon": "borc", "ad": "Geçmiş Yıllar Zararları (-)", "eksi_olabilir": True, "grup": "ozkaynak"},
    "590": {"yon": "alacak", "ad": "Dönem Net Karı", "eksi_olabilir": False, "grup": "ozkaynak"},
    "591": {"yon": "borc", "ad": "Dönem Net Zararı (-)", "eksi_olabilir": True, "grup": "ozkaynak"},

    # Gelir Tablosu - Gelirler (6xx) - Alacak bakiyeli
    "600": {"yon": "alacak", "ad": "Yurtiçi Satışlar", "eksi_olabilir": False, "grup": "gelir"},
    "601": {"yon": "alacak", "ad": "Yurtdışı Satışlar", "eksi_olabilir": False, "grup": "gelir"},
    "602": {"yon": "alacak", "ad": "Diğer Gelirler", "eksi_olabilir": False, "grup": "gelir"},
    "610": {"yon": "borc", "ad": "Satıştan İadeler (-)", "eksi_olabilir": True, "grup": "gelir"},
    "611": {"yon": "borc", "ad": "Satış İskontoları (-)", "eksi_olabilir": True, "grup": "gelir"},
    "612": {"yon": "borc", "ad": "Diğer İndirimler (-)", "eksi_olabilir": True, "grup": "gelir"},
    "620": {"yon": "borc", "ad": "Satılan Mamuller Maliyeti", "eksi_olabilir": False, "grup": "gider"},
    "621": {"yon": "borc", "ad": "Satılan Ticari Mallar Maliyeti", "eksi_olabilir": False, "grup": "gider"},
    "622": {"yon": "borc", "ad": "Satılan Hizmet Maliyeti", "eksi_olabilir": False, "grup": "gider"},
    "623": {"yon": "borc", "ad": "Diğer Satışların Maliyeti", "eksi_olabilir": False, "grup": "gider"},
    "630": {"yon": "borc", "ad": "Araştırma ve Geliştirme Giderleri", "eksi_olabilir": False, "grup": "gider"},
    "631": {"yon": "borc", "ad": "Pazarlama Satış ve Dağıtım Giderleri", "eksi_olabilir": False, "grup": "gider"},
    "632": {"yon": "borc", "ad": "Genel Yönetim Giderleri", "eksi_olabilir": False, "grup": "gider"},
    "640": {"yon": "alacak", "ad": "İştiraklerden Temettü Gelirleri", "eksi_olabilir": False, "grup": "gelir"},
    "642": {"yon": "alacak", "ad": "Faiz Gelirleri", "eksi_olabilir": False, "grup": "gelir"},
    "644": {"yon": "alacak", "ad": "Konusu Kalmayan Karşılıklar", "eksi_olabilir": False, "grup": "gelir"},
    "645": {"yon": "alacak", "ad": "Menkul Kıymet Satış Karları", "eksi_olabilir": False, "grup": "gelir"},
    "646": {"yon": "alacak", "ad": "Kambiyo Karları", "eksi_olabilir": False, "grup": "gelir"},
    "647": {"yon": "alacak", "ad": "Reeskont Faiz Gelirleri", "eksi_olabilir": False, "grup": "gelir"},
    "648": {"yon": "alacak", "ad": "Enflasyon Düzeltmesi Karları", "eksi_olabilir": False, "grup": "gelir"},
    "649": {"yon": "alacak", "ad": "Diğer Olağan Gelir ve Karlar", "eksi_olabilir": False, "grup": "gelir"},
    "653": {"yon": "borc", "ad": "Komisyon Giderleri", "eksi_olabilir": False, "grup": "gider"},
    "654": {"yon": "borc", "ad": "Karşılık Giderleri", "eksi_olabilir": False, "grup": "gider"},
    "655": {"yon": "borc", "ad": "Menkul Kıymet Satış Zararları", "eksi_olabilir": False, "grup": "gider"},
    "656": {"yon": "borc", "ad": "Kambiyo Zararları", "eksi_olabilir": False, "grup": "gider"},
    "657": {"yon": "borc", "ad": "Reeskont Faiz Giderleri", "eksi_olabilir": False, "grup": "gider"},
    "658": {"yon": "borc", "ad": "Enflasyon Düzeltmesi Zararları", "eksi_olabilir": False, "grup": "gider"},
    "659": {"yon": "borc", "ad": "Diğer Olağan Gider ve Zararlar", "eksi_olabilir": False, "grup": "gider"},
    "660": {"yon": "borc", "ad": "Kısa Vadeli Borçlanma Giderleri", "eksi_olabilir": False, "grup": "gider"},
    "661": {"yon": "borc", "ad": "Uzun Vadeli Borçlanma Giderleri", "eksi_olabilir": False, "grup": "gider"},
    "671": {"yon": "alacak", "ad": "Önceki Dönem Gelir ve Karları", "eksi_olabilir": False, "grup": "gelir"},
    "679": {"yon": "alacak", "ad": "Diğer Olağandışı Gelir ve Karlar", "eksi_olabilir": False, "grup": "gelir"},
    "680": {"yon": "borc", "ad": "Çalışmayan Kısım Gider ve Zararları", "eksi_olabilir": False, "grup": "gider"},
    "681": {"yon": "borc", "ad": "Önceki Dönem Gider ve Zararları", "eksi_olabilir": False, "grup": "gider"},
    "689": {"yon": "borc", "ad": "Diğer Olağandışı Gider ve Zararlar", "eksi_olabilir": False, "grup": "gider"},
    "690": {"yon": "borc", "ad": "Dönem Karı veya Zararı", "eksi_olabilir": True, "grup": "sonuc"},
    "691": {"yon": "borc", "ad": "Dönem Karı Vergi ve Diğer Yasal Yükümlülük Karşılıkları", "eksi_olabilir": False, "grup": "gider"},
    "692": {"yon": "alacak", "ad": "Dönem Net Karı veya Zararı", "eksi_olabilir": True, "grup": "sonuc"},

    # Maliyet Hesapları (7xx) - Borç bakiyeli
    "700": {"yon": "borc", "ad": "Maliyet Muhasebesi Bağlantı Hesabı", "eksi_olabilir": False, "grup": "maliyet"},
    "710": {"yon": "borc", "ad": "Direkt İlk Madde ve Malzeme Giderleri", "eksi_olabilir": False, "grup": "maliyet"},
    "720": {"yon": "borc", "ad": "Direkt İşçilik Giderleri", "eksi_olabilir": False, "grup": "maliyet"},
    "730": {"yon": "borc", "ad": "Genel Üretim Giderleri", "eksi_olabilir": False, "grup": "maliyet"},
    "740": {"yon": "borc", "ad": "Hizmet Üretim Maliyeti", "eksi_olabilir": False, "grup": "maliyet"},
    "750": {"yon": "borc", "ad": "Araştırma ve Geliştirme Giderleri", "eksi_olabilir": False, "grup": "maliyet"},
    "760": {"yon": "borc", "ad": "Pazarlama Satış ve Dağıtım Giderleri", "eksi_olabilir": False, "grup": "maliyet"},
    "770": {"yon": "borc", "ad": "Genel Yönetim Giderleri", "eksi_olabilir": False, "grup": "maliyet"},
    "780": {"yon": "borc", "ad": "Finansman Giderleri", "eksi_olabilir": False, "grup": "maliyet"},
}


class CrossCheckEngine:
    """
    Capraz Kontrol Motoru - LYNTOS v2

    Kontroller:
    1. Mizan 600 (Net Satışlar) vs KDV Beyanı Matrah
    2. Mizan 391 (Hesaplanan KDV) vs KDV Beyanı Hesaplanan KDV
    3. Mizan 191 (İndirilecek KDV) vs KDV Beyanı İndirilecek KDV
    4. Mizan 600 vs E-Fatura Toplam
    5. Mizan 102 (Banka) vs Banka Ekstresi
    6. Muhtasar (MPHB) vs SGK APHB
    7. Teknik Kontroller: Ters Bakiye, Eksi Hesap, Mizan Denklik

    MUHASEBE KURALLARI:
    - 600: Net satışlar (Gelir hesabı - alacak bakiyeli)
    - 601: Yurtdışı satışlar / İhracat (KDV matrahından düşülür)
    - 602: Diğer indirimler / İstisna satışlar
    - 391: Hesaplanan KDV (Pasif - alacak bakiyeli)
    - 191: İndirilecek KDV (Aktif - borç bakiyeli)
    """

    # Tolerans değerleri
    TOLERANCE_TL = 100  # 100 TL'ye kadar fark tolere edilir (yuvarlama)
    TOLERANCE_PERCENT_WARNING = 0.05  # %5 fark için uyarı
    TOLERANCE_PERCENT_ERROR = 0.10  # %10 fark için hata

    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    def check_mizan_vs_beyanname(
        self,
        mizan_600: float,
        kdv_beyan_satis: float,
        mizan_601_ihracat: float = 0.0,
        mizan_602_istisna: float = 0.0
    ) -> CrossCheckResult:
        """
        Mizan satışlar vs KDV beyanı matrah karşılaştır

        KDV MATRAHI FORMÜLÜ:
        KDV Matrahı = Mizan 600 - İhracat (601) - İstisna (602)

        Args:
            mizan_600: Net satışlar (600 hesap grubu toplamı)
            kdv_beyan_satis: KDV Beyannamesindeki matrah
            mizan_601_ihracat: Yurtdışı satışlar (KDV'siz)
            mizan_602_istisna: İstisna satışlar (KDV'siz)
        """
        # KDV matrahını hesapla (ihracat ve istisnaları düş)
        hesaplanan_matrah = mizan_600 - mizan_601_ihracat - mizan_602_istisna
        diff = hesaplanan_matrah - kdv_beyan_satis

        # Yüzdelik fark
        base_value = max(abs(hesaplanan_matrah), abs(kdv_beyan_satis), 1)  # div by zero engelle
        percent_diff = abs(diff) / base_value

        # Breakdown bilgisi
        breakdown = {
            "mizan_600_net_satislar": mizan_600,
            "mizan_601_ihracat": mizan_601_ihracat,
            "mizan_602_istisna": mizan_602_istisna,
            "hesaplanan_kdv_matrahi": hesaplanan_matrah,
            "beyan_matrahi": kdv_beyan_satis,
            "fark_tl": diff,
            "fark_yuzde": percent_diff * 100
        }

        if abs(diff) <= self.TOLERANCE_TL:
            status = "ok"
            reason = "Mizan ve KDV beyanı uyumlu"
            actions = []
        elif percent_diff <= self.TOLERANCE_PERCENT_WARNING:
            status = "warning"
            reason = f"Mizan ve KDV beyanı arasında {abs(diff):,.0f} TL fark var (%{percent_diff*100:.1f})"
            actions = [
                "E-Fatura kayıtlarını kontrol edin",
                "İhracat/İstisna satışlar doğru kaydedildi mi?",
                "İade/iskonto kayıtlarını kontrol edin"
            ]
        elif percent_diff <= self.TOLERANCE_PERCENT_ERROR:
            status = "warning"
            reason = f"UYARI: {abs(diff):,.0f} TL fark ({percent_diff*100:.1f}%) - Kontrol gerekli"
            actions = [
                "Tüm satış faturalarını kontrol edin",
                "601 (İhracat) ve 602 (İstisna) hesaplarını doğrulayın",
                "KDV oranı farklılıkları olabilir"
            ]
        else:
            status = "error"
            reason = f"KRİTİK FARK: {abs(diff):,.0f} TL ({percent_diff*100:.1f}%)"
            actions = [
                "ACİL: Tüm satış faturalarını inceleyin",
                "E-Fatura sistemi ile mizan karşılaştırın",
                "Kayıt dışı satış riski - VDK incelemesi olabilir",
                "Beyan düzeltmesi gerekebilir"
            ]

        self.logger.info(
            f"Mizan vs Beyanname: Mizan={hesaplanan_matrah:,.0f}, Beyan={kdv_beyan_satis:,.0f}, "
            f"Fark={diff:,.0f} ({percent_diff*100:.1f}%), Status={status}"
        )

        # Severity belirleme
        if status == "ok":
            severity = "info"
        elif status == "warning":
            severity = "medium" if percent_diff > 0.05 else "low"
        else:
            severity = "critical" if percent_diff > 0.15 else "high"

        return CrossCheckResult(
            check_type="mizan_vs_kdv_beyanname",
            check_id="CC-001",
            category=CheckCategory.MIZAN_VS_BEYANNAME.value,
            status=status,
            severity=severity,
            difference=diff,
            reason_tr=reason,
            source_label="Mizan (600-601-602)",
            target_label="KDV-1 Beyannamesi Matrah",
            evidence_refs=[],  # SAHTE DOSYA İSİMLERİ YASAK
            actions=actions,
            legal_basis_refs=["SRC-0045"],  # VUK Madde 227
            mizan_value=hesaplanan_matrah,
            beyan_value=kdv_beyan_satis,
            percent_diff=percent_diff * 100,
            breakdown=breakdown
        )

    def check_mizan_vs_efatura(
        self,
        mizan_600: float,
        efatura_total: float
    ) -> CrossCheckResult:
        """Mizan satislar vs E-Fatura toplam"""

        diff = mizan_600 - efatura_total

        if abs(diff) <= self.TOLERANCE_TL:
            status = "ok"
            reason = "Mizan ve E-Fatura uyumlu"
            actions = []
        else:
            status = "warning"
            reason = f"E-Fatura toplami mizandan {abs(diff):,.0f} TL {'dusuk' if diff > 0 else 'yuksek'}"
            actions = [
                "E-Fatura gonderim tarihlerini kontrol edin",
                "Iptal/duzeltme faturalarini kontrol edin",
                "Mizan kayit tarihlerini dogrulayin"
            ]

        # Severity belirleme
        base_value = max(abs(mizan_600), abs(efatura_total), 1)
        percent_diff = abs(diff) / base_value
        if status == "ok":
            severity = "info"
        else:
            severity = "high" if percent_diff > 0.05 else "medium"

        return CrossCheckResult(
            check_type="mizan_vs_efatura",
            check_id="CC-004",
            category=CheckCategory.MIZAN_VS_EFATURA.value,
            status=status,
            severity=severity,
            difference=diff,
            reason_tr=reason,
            source_label="Mizan 600 (Net Satışlar)",
            target_label="e-Fatura Satış Toplamı",
            evidence_refs=[],  # SAHTE DOSYA İSİMLERİ YASAK
            actions=actions,
            legal_basis_refs=["SRC-0012"],  # E-Fatura Teknik Kilavuzu
            mizan_value=mizan_600,
            beyan_value=efatura_total,
            percent_diff=percent_diff * 100
        )

    def check_mizan_vs_bank(
        self,
        mizan_102: float,
        bank_balance: float
    ) -> CrossCheckResult:
        """
        Mizan 102 (Banka) vs Banka ekstresi kapanış bakiyesi

        NOT: 102 hesap AKTİF hesaptır (Borç bakiyeli)
        Banka ekstre bakiyesi ile eşleşmeli
        """
        diff = mizan_102 - bank_balance

        # Yüzdelik fark
        base_value = max(abs(mizan_102), abs(bank_balance), 1)
        percent_diff = abs(diff) / base_value

        if abs(diff) <= self.TOLERANCE_TL:
            status = "ok"
            reason = "Mizan ve banka ekstresi uyumlu"
            actions = []
        elif percent_diff <= self.TOLERANCE_PERCENT_WARNING:
            status = "warning"
            reason = f"Banka bakiyesi ile mizan arasında {abs(diff):,.0f} TL fark var"
            actions = [
                "Banka dekontlarını mizan ile eşleştirin",
                "Tarih farkı (valör) olabilir",
                "Havale/EFT kayıtlarını kontrol edin"
            ]
        else:
            status = "error"
            reason = f"KRİTİK FARK: Banka bakiyesi {abs(diff):,.0f} TL ({percent_diff*100:.1f}%) farklı"
            actions = [
                "ACİL: Tüm banka hareketlerini kontrol edin",
                "Mizan kayıtları ile ekstre satır satır eşleştirin",
                "Eksik/fazla kayıt olabilir"
            ]

        self.logger.info(
            f"Mizan vs Banka: Mizan 102={mizan_102:,.0f}, Banka={bank_balance:,.0f}, "
            f"Fark={diff:,.0f} ({percent_diff*100:.1f}%), Status={status}"
        )

        # Severity belirleme
        if status == "ok":
            severity = "info"
        elif status == "warning":
            severity = "medium"
        else:
            severity = "critical" if percent_diff > 0.10 else "high"

        return CrossCheckResult(
            check_type="mizan_vs_bank",
            check_id="CC-005",
            category=CheckCategory.MIZAN_VS_BANKA.value,
            status=status,
            severity=severity,
            difference=diff,
            reason_tr=reason,
            source_label="Mizan 102 (Bankalar)",
            target_label="Banka Ekstresi Bakiye",
            evidence_refs=[],  # SAHTE DOSYA İSİMLERİ YASAK
            actions=actions,
            legal_basis_refs=["SRC-0046"],  # VUK Madde 219
            mizan_value=mizan_102,
            beyan_value=bank_balance,
            percent_diff=percent_diff * 100
        )

    def check_kdv_hesaplanan(
        self,
        mizan_391: float,
        beyan_hesaplanan_kdv: float
    ) -> CrossCheckResult:
        """
        Mizan 391 (Hesaplanan KDV) vs KDV Beyannamesi Hesaplanan KDV

        KRİTİK: 391 hesap PASİF hesaptır (Alacak bakiyeli)
        Mizan'da alacak-borç farkı pozitif olmalı
        """
        diff = mizan_391 - beyan_hesaplanan_kdv

        base_value = max(abs(mizan_391), abs(beyan_hesaplanan_kdv), 1)
        percent_diff = abs(diff) / base_value

        if abs(diff) <= self.TOLERANCE_TL:
            status = "ok"
            reason = "Hesaplanan KDV mizan ve beyan uyumlu"
            actions = []
        elif percent_diff <= self.TOLERANCE_PERCENT_WARNING:
            status = "warning"
            reason = f"Hesaplanan KDV'de {abs(diff):,.0f} TL fark var"
            actions = [
                "KDV oranlarını kontrol edin (1%, 10%, 20%)",
                "Fatura bazlı KDV hesaplamasını doğrulayın"
            ]
        else:
            status = "error"
            reason = f"KRİTİK: Hesaplanan KDV {abs(diff):,.0f} TL ({percent_diff*100:.1f}%) farklı"
            actions = [
                "ACİL: Tüm satış faturalarının KDV tutarlarını kontrol edin",
                "391 hesap hareketlerini inceleyin",
                "KDV beyannamesi düzeltmesi gerekebilir"
            ]

        # Severity belirleme
        if status == "ok":
            severity = "info"
        elif status == "warning":
            severity = "medium"
        else:
            severity = "critical" if percent_diff > 0.10 else "high"

        return CrossCheckResult(
            check_type="mizan_391_vs_beyan_hesaplanan_kdv",
            check_id="CC-002",
            category=CheckCategory.MIZAN_VS_BEYANNAME.value,
            status=status,
            severity=severity,
            difference=diff,
            reason_tr=reason,
            source_label="Mizan 391 (Hesaplanan KDV)",
            target_label="KDV-1 Hesaplanan KDV",
            evidence_refs=[],  # SAHTE DOSYA İSİMLERİ YASAK
            actions=actions,
            legal_basis_refs=["SRC-0047"],  # KDV Kanunu
            mizan_value=mizan_391,
            beyan_value=beyan_hesaplanan_kdv,
            percent_diff=percent_diff * 100
        )

    def check_kdv_indirilecek(
        self,
        mizan_191: float,
        beyan_indirilecek_kdv: float
    ) -> CrossCheckResult:
        """
        Mizan 191 (İndirilecek KDV) vs KDV Beyannamesi İndirilecek KDV

        KRİTİK: 191 hesap AKTİF hesaptır (Borç bakiyeli)
        """
        diff = mizan_191 - beyan_indirilecek_kdv

        base_value = max(abs(mizan_191), abs(beyan_indirilecek_kdv), 1)
        percent_diff = abs(diff) / base_value

        if abs(diff) <= self.TOLERANCE_TL:
            status = "ok"
            reason = "İndirilecek KDV mizan ve beyan uyumlu"
            actions = []
        elif percent_diff <= self.TOLERANCE_PERCENT_WARNING:
            status = "warning"
            reason = f"İndirilecek KDV'de {abs(diff):,.0f} TL fark var"
            actions = [
                "Alış faturalarının KDV tutarlarını kontrol edin",
                "İndirim hakkı olmayan KDV'ler var mı?"
            ]
        else:
            status = "error"
            reason = f"KRİTİK: İndirilecek KDV {abs(diff):,.0f} TL ({percent_diff*100:.1f}%) farklı"
            actions = [
                "ACİL: Tüm alış faturalarını kontrol edin",
                "191 hesap hareketlerini inceleyin",
                "İndirim konusu yapılamayan KDV var mı?",
                "Sahte fatura riski - dikkatli inceleyin"
            ]

        # Severity belirleme
        if status == "ok":
            severity = "info"
        elif status == "warning":
            severity = "medium"
        else:
            severity = "critical" if percent_diff > 0.10 else "high"

        return CrossCheckResult(
            check_type="mizan_191_vs_beyan_indirilecek_kdv",
            check_id="CC-003",
            category=CheckCategory.MIZAN_VS_BEYANNAME.value,
            status=status,
            severity=severity,
            difference=diff,
            reason_tr=reason,
            source_label="Mizan 191 (İndirilecek KDV)",
            target_label="KDV-1 İndirilecek KDV",
            evidence_refs=[],  # SAHTE DOSYA İSİMLERİ YASAK
            actions=actions,
            legal_basis_refs=["SRC-0048"],  # KDV Kanunu Md. 29
            mizan_value=mizan_191,
            beyan_value=beyan_indirilecek_kdv,
            percent_diff=percent_diff * 100
        )

    # ==========================================================================
    # TEKNİK KONTROLLER - SMMM İÇİN KRİTİK
    # ==========================================================================

    def check_ters_bakiye(
        self,
        mizan_entries: List[Dict]
    ) -> List[TeknikKontrolResult]:
        """
        Ters bakiye kontrolü - Hesapların beklenen bakiye yönünde olup olmadığını kontrol eder

        TEK DÜZEN HESAP PLANI KURALLARI:
        - 1xx-2xx (Aktif): Borç bakiyeli olmalı
        - 3xx-4xx-5xx (Pasif): Alacak bakiyeli olmalı
        - Bazı istisnalar var (karşılık hesapları, düzeltme hesapları)

        KRİTİK: Bu kontrol SMMM için çok önemli.
        Ters bakiye genellikle yanlış kayıt veya hata göstergesidir.
        """
        results = []

        for entry in mizan_entries:
            hesap_kodu = str(entry.get("hesap_kodu", ""))[:3]  # İlk 3 hane
            hesap_adi = entry.get("hesap_adi", "")
            borc_bakiye = float(entry.get("borc_bakiye", 0) or 0)
            alacak_bakiye = float(entry.get("alacak_bakiye", 0) or 0)
            net_bakiye = borc_bakiye - alacak_bakiye

            # Hesap kuralını bul
            kural = HESAP_BAKIYE_KURALLARI.get(hesap_kodu)
            if not kural:
                # Ana hesap grubuna göre genel kural uygula
                if hesap_kodu.startswith("1") or hesap_kodu.startswith("2"):
                    beklenen_yon = "borc"
                elif hesap_kodu.startswith(("3", "4", "5")):
                    beklenen_yon = "alacak"
                elif hesap_kodu.startswith("6"):
                    # Gelir/Gider hesapları - özel kontrol gerekir
                    continue
                elif hesap_kodu.startswith("7"):
                    beklenen_yon = "borc"
                else:
                    continue
                eksi_olabilir = False
            else:
                beklenen_yon = kural["yon"]
                eksi_olabilir = kural.get("eksi_olabilir", False)

            # Bakiye yönünü kontrol et
            if net_bakiye == 0:
                continue  # Bakiye sıfır, sorun yok

            gercek_yon = "borc" if net_bakiye > 0 else "alacak"

            # Ters bakiye var mı?
            if beklenen_yon != gercek_yon and not eksi_olabilir:
                severity = "critical" if abs(net_bakiye) > 10000 else "high"

                results.append(TeknikKontrolResult(
                    check_type="ters_bakiye",
                    status="error",
                    hesap_kodu=hesap_kodu,
                    hesap_adi=hesap_adi,
                    beklenen_yon=beklenen_yon,
                    gercek_yon=gercek_yon,
                    bakiye=net_bakiye,
                    reason_tr=f"{hesap_kodu} - {hesap_adi} hesabı ters bakiye veriyor. "
                             f"Beklenen: {beklenen_yon.upper()} bakiye, "
                             f"Gerçek: {gercek_yon.upper()} bakiye ({abs(net_bakiye):,.0f} TL)",
                    severity=severity,
                    actions=[
                        f"Hesap hareketlerini kontrol edin",
                        "Yanlış kayıt olup olmadığını araştırın",
                        "Mahsup fişlerini inceleyin"
                    ],
                    legal_basis_refs=["VUK 175", "VUK 177"]
                ))

        return results

    def check_eksi_hesap(
        self,
        mizan_entries: List[Dict]
    ) -> List[TeknikKontrolResult]:
        """
        Eksi hesap kontrolü - Negatif bakiye olmaması gereken hesapların kontrolü

        KRİTİK HESAPLAR:
        - 100 (Kasa): ASLA eksi olamaz - hırsızlık veya kayıt hatası göstergesi
        - 102 (Banka): Normalde eksi olmamalı (kredili mevduat hariç)
        - 153 (Ticari Mallar): Stok eksiye düşemez

        SMMM NOTU: Eksi kasa ve eksi stok Maliye incelemesinde
        ciddi sorunlara yol açar.
        """
        results = []

        # Eksi olmaması gereken kritik hesaplar
        kritik_hesaplar = ["100", "101", "102", "108", "150", "151", "152", "153", "157"]

        for entry in mizan_entries:
            hesap_kodu = str(entry.get("hesap_kodu", ""))[:3]
            hesap_adi = entry.get("hesap_adi", "")
            borc_bakiye = float(entry.get("borc_bakiye", 0) or 0)
            alacak_bakiye = float(entry.get("alacak_bakiye", 0) or 0)
            net_bakiye = borc_bakiye - alacak_bakiye

            if hesap_kodu not in kritik_hesaplar:
                continue

            # Borç bakiyeli olması gereken hesap alacak bakiye veriyorsa
            if net_bakiye < 0:
                if hesap_kodu == "100":
                    severity = "critical"
                    message = "KRİTİK: Kasa hesabı eksi bakiye veriyor! " \
                             "Bu durum VUK 359 kapsamında sahte belge riski oluşturabilir."
                elif hesap_kodu == "102":
                    severity = "high"
                    message = "Banka hesabı eksi bakiye veriyor. " \
                             "Kredili mevduat yoksa kayıt hatası olabilir."
                elif hesap_kodu.startswith("15"):
                    severity = "critical"
                    message = f"Stok hesabı ({hesap_kodu}) eksi bakiye veriyor! " \
                             "Eksik alış kaydı veya fazla satış kaydı olabilir."
                else:
                    severity = "high"
                    message = f"{hesap_kodu} hesabı beklenmedik eksi bakiye veriyor."

                results.append(TeknikKontrolResult(
                    check_type="eksi_hesap",
                    status="error",
                    hesap_kodu=hesap_kodu,
                    hesap_adi=hesap_adi,
                    beklenen_yon="borc",
                    gercek_yon="alacak",
                    bakiye=net_bakiye,
                    reason_tr=f"{hesap_kodu} - {hesap_adi}: {net_bakiye:,.0f} TL (EKSİ). {message}",
                    severity=severity,
                    actions=[
                        "ACİL: Hesap hareketlerini kontrol edin",
                        "Eksik kayıt olup olmadığını araştırın",
                        "Tarih sırasına göre hareketleri inceleyin",
                        "Gerekirse düzeltme kaydı yapın"
                    ],
                    legal_basis_refs=["VUK 227", "VUK 359"]
                ))

        return results

    def check_mizan_denklik(
        self,
        toplam_borc: float,
        toplam_alacak: float
    ) -> CrossCheckResult:
        """
        Mizan denklik kontrolü - Toplam Borç = Toplam Alacak

        TEMEL MUHASEBE KURALI:
        Çift taraflı kayıt sisteminde her borç bir alacağa eşittir.
        Mizan denk değilse kayıt hatası vardır.
        """
        diff = abs(toplam_borc - toplam_alacak)

        if diff <= 0.01:  # 1 kuruş tolerans
            status = "ok"
            severity = "info"
            reason = "Mizan denk - Borç ve Alacak toplamları eşit"
            actions = []
        else:
            status = "error"
            severity = "critical"
            reason = f"MİZAN DENK DEĞİL! Fark: {diff:,.2f} TL. " \
                    f"Borç: {toplam_borc:,.2f} TL, Alacak: {toplam_alacak:,.2f} TL"
            actions = [
                "ACİL: Tüm yevmiye kayıtlarını kontrol edin",
                "Eksik veya fazla kayıt olup olmadığını araştırın",
                "Muhasebe yazılımı hata vermiş olabilir"
            ]

        return CrossCheckResult(
            check_type="mizan_denklik",
            check_id="TECH-001",
            category=CheckCategory.TEKNIK_KONTROL.value,
            status=status,
            severity=severity,
            difference=diff,
            reason_tr=reason,
            source_label="Toplam Borç",
            target_label="Toplam Alacak",
            mizan_value=toplam_borc,
            beyan_value=toplam_alacak,
            evidence_refs=[],
            actions=actions,
            legal_basis_refs=["VUK 175", "VUK 177"]
        )

    # ==========================================================================
    # E-FATURA VE MALİ TABLO UYARILARI
    # ==========================================================================

    def create_missing_data_warning(
        self,
        check_type: str,
        check_id: str,
        category: str,
        missing_data: str,
        upload_instruction: str
    ) -> CrossCheckResult:
        """
        Eksik veri uyarısı oluştur - SMMM'ye yükleme talimatı ver

        Bu fonksiyon, çapraz kontrol için gerekli veri yüklenmemişse
        SMMM'ye net bir uyarı ve yükleme talimatı verir.
        """
        return CrossCheckResult(
            check_type=check_type,
            check_id=check_id,
            category=category,
            status="no_data",
            severity="medium",
            difference=0,
            reason_tr=f"⚠️ {missing_data} yüklenmemiş. Çapraz kontrol yapılamıyor.",
            source_label="",
            target_label="",
            mizan_value=None,
            beyan_value=None,
            evidence_refs=[],
            actions=[upload_instruction],
            legal_basis_refs=[],
            data_warnings=[
                f"{missing_data} yüklendiğinde bu kontrol otomatik çalışacaktır.",
                "Çapraz kontrol için tüm belgelerin yüklenmesi önerilir."
            ]
        )

    def check_efatura_yuklu_mu(self, efatura_loaded: bool) -> Optional[CrossCheckResult]:
        """E-Fatura yüklenmiş mi kontrolü"""
        if not efatura_loaded:
            return self.create_missing_data_warning(
                check_type="efatura_eksik",
                check_id="WARN-001",
                category=CheckCategory.MIZAN_VS_EFATURA.value,
                missing_data="e-Fatura verileri",
                upload_instruction="📤 e-Fatura XML dosyalarını yükleyiniz. "
                                  "Mizan ile e-Fatura karşılaştırması için gereklidir."
            )
        return None

    def check_mali_tablo_yuklu_mu(self, mali_tablo_loaded: bool) -> Optional[CrossCheckResult]:
        """Mali tablo yüklenmiş mi kontrolü"""
        if not mali_tablo_loaded:
            return self.create_missing_data_warning(
                check_type="mali_tablo_eksik",
                check_id="WARN-002",
                category=CheckCategory.MIZAN_VS_MALI_TABLO.value,
                missing_data="Mali tablolar (Bilanço/Gelir Tablosu)",
                upload_instruction="📤 Bilanço ve Gelir Tablosu yükleyiniz. "
                                  "Mizan ile mali tablo karşılaştırması için gereklidir."
            )
        return None

    def check_banka_ekstre_yuklu_mu(self, banka_loaded: bool) -> Optional[CrossCheckResult]:
        """Banka ekstresi yüklenmiş mi kontrolü"""
        if not banka_loaded:
            return self.create_missing_data_warning(
                check_type="banka_ekstre_eksik",
                check_id="WARN-003",
                category=CheckCategory.MIZAN_VS_BANKA.value,
                missing_data="Banka ekstreleri",
                upload_instruction="📤 Banka ekstrelerini yükleyiniz. "
                                  "102 Banka hesabı ile ekstre karşılaştırması için gereklidir."
            )
        return None

    # ==========================================================================
    # DİĞER BEYANNAMELER (MUHTASAR, KURUMLAR, GEÇİCİ VERGİ)
    # ==========================================================================

    def check_muhtasar_vs_sgk(
        self,
        muhtasar_brut_ucret: float,
        sgk_aphb_brut_ucret: float
    ) -> CrossCheckResult:
        """
        Muhtasar (MPHB) vs SGK APHB karşılaştırması

        KONTROL: İşverenlerin bildirdiği brüt ücret tutarları
        her iki kurumda da eşit olmalıdır.

        SMMM NOTU: Bu uyumsuzluk VDK-RAM'da yüksek risk puanı oluşturur.
        """
        diff = muhtasar_brut_ucret - sgk_aphb_brut_ucret
        base_value = max(abs(muhtasar_brut_ucret), abs(sgk_aphb_brut_ucret), 1)
        percent_diff = abs(diff) / base_value

        if abs(diff) <= self.TOLERANCE_TL:
            status = "ok"
            severity = "info"
            reason = "Muhtasar ve SGK APHB brüt ücret tutarları uyumlu"
            actions = []
        elif percent_diff <= 0.02:  # %2 tolerans
            status = "warning"
            severity = "low"
            reason = f"Muhtasar ve SGK APHB arasında küçük fark: {abs(diff):,.0f} TL (%{percent_diff*100:.1f})"
            actions = [
                "Fark kaynağını kontrol edin",
                "Prim günü hesaplaması farklı olabilir"
            ]
        else:
            status = "error"
            severity = "high"
            reason = f"KRİTİK: Muhtasar ve SGK APHB uyumsuz! Fark: {abs(diff):,.0f} TL (%{percent_diff*100:.1f})"
            actions = [
                "ACİL: Her iki bildirimi karşılaştırın",
                "Personel listelerini kontrol edin",
                "Eksik/fazla bildirim olup olmadığını araştırın",
                "Düzeltme beyannamesi gerekebilir"
            ]

        return CrossCheckResult(
            check_type="muhtasar_vs_sgk",
            check_id="CC-006",
            category=CheckCategory.BEYANNAME_VS_BEYANNAME.value,
            status=status,
            severity=severity,
            difference=diff,
            reason_tr=reason,
            source_label="Muhtasar (MPHB) Brüt Ücret",
            target_label="SGK APHB Brüt Ücret",
            mizan_value=muhtasar_brut_ucret,
            beyan_value=sgk_aphb_brut_ucret,
            percent_diff=percent_diff * 100,
            evidence_refs=[],
            actions=actions,
            legal_basis_refs=["GVK 94", "5510 SK 86"]
        )

    def check_gecici_vergi(
        self,
        mizan_gelir_toplam: float,
        mizan_gider_toplam: float,
        gecici_vergi_matrahi: float
    ) -> CrossCheckResult:
        """
        Mizan vs Geçici Vergi Beyannamesi karşılaştırması

        KONTROL: Mizandaki kar/zarar ile geçici vergi matrahı uyumlu olmalıdır.

        Hesaplama: Gelir (6xx alacak) - Gider (6xx/7xx borç) ≈ GV Matrahı
        """
        mizan_kar_zarar = mizan_gelir_toplam - mizan_gider_toplam
        diff = mizan_kar_zarar - gecici_vergi_matrahi
        base_value = max(abs(mizan_kar_zarar), abs(gecici_vergi_matrahi), 1)
        percent_diff = abs(diff) / base_value

        if abs(diff) <= self.TOLERANCE_TL:
            status = "ok"
            severity = "info"
            reason = "Mizan kar/zarar ile geçici vergi matrahı uyumlu"
            actions = []
        elif percent_diff <= self.TOLERANCE_PERCENT_WARNING:
            status = "warning"
            severity = "low"
            reason = f"Mizan ve Geçici Vergi arasında fark: {abs(diff):,.0f} TL (%{percent_diff*100:.1f})"
            actions = [
                "KKEG (Kanunen Kabul Edilmeyen Giderler) kontrol edin",
                "İstisna gelirler kontrol edin"
            ]
        else:
            status = "error"
            severity = "high"
            reason = f"Mizan ve Geçici Vergi matrahı uyumsuz! Fark: {abs(diff):,.0f} TL (%{percent_diff*100:.1f})"
            actions = [
                "Tüm gelir/gider hesaplarını kontrol edin",
                "KKEG listesini gözden geçirin",
                "İndirimler ve istisnalar kontrol edin"
            ]

        return CrossCheckResult(
            check_type="mizan_vs_gecici_vergi",
            check_id="CC-007",
            category=CheckCategory.MIZAN_VS_BEYANNAME.value,
            status=status,
            severity=severity,
            difference=diff,
            reason_tr=reason,
            source_label="Mizan Kar/Zarar",
            target_label="Geçici Vergi Matrahı",
            mizan_value=mizan_kar_zarar,
            beyan_value=gecici_vergi_matrahi,
            percent_diff=percent_diff * 100,
            evidence_refs=[],
            actions=actions,
            legal_basis_refs=["GVK Mük. 120", "KVK 32"],
            breakdown={
                "mizan_gelir": mizan_gelir_toplam,
                "mizan_gider": mizan_gider_toplam,
                "mizan_kar_zarar": mizan_kar_zarar,
                "gv_matrahi": gecici_vergi_matrahi
            }
        )

    def check_kurumlar_vergisi(
        self,
        mizan_donem_kari: float,
        kv_matrahi: float
    ) -> CrossCheckResult:
        """
        Mizan Dönem Karı vs Kurumlar Vergisi Matrahı karşılaştırması

        KONTROL: 590/591 hesap bakiyesi ile KV matrahı arasındaki
        fark KKEG ve istisnalardan kaynaklanmalıdır.
        """
        diff = mizan_donem_kari - kv_matrahi
        base_value = max(abs(mizan_donem_kari), abs(kv_matrahi), 1)
        percent_diff = abs(diff) / base_value

        if abs(diff) <= self.TOLERANCE_TL:
            status = "ok"
            severity = "info"
            reason = "Mizan dönem karı ile KV matrahı uyumlu"
            actions = []
        else:
            # KV matrahı genellikle KKEG nedeniyle mizan karından yüksektir
            if kv_matrahi > mizan_donem_kari:
                status = "ok"  # Bu normal - KKEG eklenmiş
                severity = "info"
                reason = f"KV matrahı mizan karından {abs(diff):,.0f} TL yüksek (KKEG eklenmesi normal)"
                actions = [
                    "KKEG tutarını doğrulayın",
                    "Kanunen kabul edilmeyen giderleri listeleyin"
                ]
            else:
                status = "warning"
                severity = "medium"
                reason = f"KV matrahı mizan karından {abs(diff):,.0f} TL düşük. İstisna/indirim kontrol edin."
                actions = [
                    "İstisna kazançları kontrol edin",
                    "AR-GE indirimi, yatırım indirimi vb. kontrol edin",
                    "Zarar mahsubu yapılmış mı kontrol edin"
                ]

        return CrossCheckResult(
            check_type="mizan_vs_kurumlar_vergisi",
            check_id="CC-008",
            category=CheckCategory.MIZAN_VS_BEYANNAME.value,
            status=status,
            severity=severity,
            difference=diff,
            reason_tr=reason,
            source_label="Mizan Dönem Karı (590/591)",
            target_label="KV Matrahı",
            mizan_value=mizan_donem_kari,
            beyan_value=kv_matrahi,
            percent_diff=percent_diff * 100,
            evidence_refs=[],
            actions=actions,
            legal_basis_refs=["KVK 6", "KVK 32", "KVK 10"]
        )

    # ==========================================================================
    # TÜM KONTROLLERİ ÇALIŞTIR
    # ==========================================================================

    def run_all_checks(self, data: Dict) -> List[CrossCheckResult]:
        """
        Tüm çapraz kontrolleri çalıştır

        Beklenen data anahtarları:
        - mizan_600: Net satışlar
        - mizan_601: Yurtdışı satışlar (ihracat)
        - mizan_602: Diğer indirimler (istisna)
        - mizan_391: Hesaplanan KDV
        - mizan_191: İndirilecek KDV
        - mizan_102: Banka hesabı
        - kdv_beyan_satis / kdv_beyan_matrah: KDV beyanı matrah
        - kdv_beyan_hesaplanan: Hesaplanan KDV
        - kdv_beyan_indirilecek: İndirilecek KDV
        - efatura_total: E-Fatura toplam
        - bank_balance: Banka ekstre bakiyesi
        - mizan_entries: Tüm mizan satırları (teknik kontroller için)
        - toplam_borc: Mizan toplam borç
        - toplam_alacak: Mizan toplam alacak
        - efatura_loaded: E-Fatura yüklü mü (bool)
        - mali_tablo_loaded: Mali tablo yüklü mü (bool)
        - banka_loaded: Banka ekstresi yüklü mü (bool)
        - muhtasar_brut_ucret: Muhtasar brüt ücret
        - sgk_aphb_brut_ucret: SGK APHB brüt ücret
        - gecici_vergi_matrahi: Geçici vergi matrahı
        - mizan_gelir_toplam: Mizan gelir toplamı
        - mizan_gider_toplam: Mizan gider toplamı
        - kv_matrahi: Kurumlar vergisi matrahı
        - mizan_donem_kari: Mizan dönem karı (590-591)
        """
        results = []

        # ==========================================================================
        # 1. TEMEL ÇAPRAZ KONTROLLER
        # ==========================================================================

        # 1.1 Mizan Denklik Kontrolü (her zaman çalıştır)
        if "toplam_borc" in data and "toplam_alacak" in data:
            results.append(
                self.check_mizan_denklik(
                    toplam_borc=data["toplam_borc"],
                    toplam_alacak=data["toplam_alacak"]
                )
            )

        # 1.2 Mizan 600 vs KDV Beyanı Matrah (ihracat/istisna dikkate alınarak)
        kdv_beyan_matrah = data.get("kdv_beyan_satis") or data.get("kdv_beyan_matrah")
        if "mizan_600" in data and kdv_beyan_matrah is not None:
            result = self.check_mizan_vs_beyanname(
                mizan_600=data["mizan_600"],
                kdv_beyan_satis=kdv_beyan_matrah,
                mizan_601_ihracat=data.get("mizan_601", 0.0),
                mizan_602_istisna=data.get("mizan_602", 0.0)
            )
            # Yeni alanları ekle
            result.check_id = "CC-001"
            result.category = CheckCategory.MIZAN_VS_BEYANNAME.value
            result.source_label = "Mizan (600-601-602)"
            result.target_label = "KDV-1 Beyannamesi Matrah"
            results.append(result)

        # 1.3 Mizan 391 vs KDV Beyanı Hesaplanan KDV
        if "mizan_391" in data and "kdv_beyan_hesaplanan" in data:
            result = self.check_kdv_hesaplanan(
                mizan_391=data["mizan_391"],
                beyan_hesaplanan_kdv=data["kdv_beyan_hesaplanan"]
            )
            result.check_id = "CC-002"
            result.category = CheckCategory.MIZAN_VS_BEYANNAME.value
            result.source_label = "Mizan 391 (Hesaplanan KDV)"
            result.target_label = "KDV-1 Hesaplanan KDV"
            results.append(result)

        # 1.4 Mizan 191 vs KDV Beyanı İndirilecek KDV
        if "mizan_191" in data and "kdv_beyan_indirilecek" in data:
            result = self.check_kdv_indirilecek(
                mizan_191=data["mizan_191"],
                beyan_indirilecek_kdv=data["kdv_beyan_indirilecek"]
            )
            result.check_id = "CC-003"
            result.category = CheckCategory.MIZAN_VS_BEYANNAME.value
            result.source_label = "Mizan 191 (İndirilecek KDV)"
            result.target_label = "KDV-1 İndirilecek KDV"
            results.append(result)

        # ==========================================================================
        # 2. E-FATURA KONTROLLER
        # ==========================================================================

        efatura_loaded = data.get("efatura_loaded", False)
        if not efatura_loaded:
            warning = self.check_efatura_yuklu_mu(efatura_loaded)
            if warning:
                results.append(warning)
        elif "mizan_600" in data and "efatura_total" in data:
            result = self.check_mizan_vs_efatura(
                data["mizan_600"],
                data["efatura_total"]
            )
            result.check_id = "CC-004"
            result.category = CheckCategory.MIZAN_VS_EFATURA.value
            result.source_label = "Mizan 600 (Net Satışlar)"
            result.target_label = "e-Fatura Satış Toplamı"
            results.append(result)

        # ==========================================================================
        # 3. BANKA KONTROLÜ
        # ==========================================================================

        banka_loaded = data.get("banka_loaded", False)
        if not banka_loaded:
            warning = self.check_banka_ekstre_yuklu_mu(banka_loaded)
            if warning:
                results.append(warning)
        elif "mizan_102" in data and "bank_balance" in data:
            result = self.check_mizan_vs_bank(
                data["mizan_102"],
                data["bank_balance"]
            )
            result.check_id = "CC-005"
            result.category = CheckCategory.MIZAN_VS_BANKA.value
            result.source_label = "Mizan 102 (Bankalar)"
            result.target_label = "Banka Ekstresi Bakiye"
            results.append(result)

        # ==========================================================================
        # 4. MALİ TABLO KONTROLÜ
        # ==========================================================================

        mali_tablo_loaded = data.get("mali_tablo_loaded", False)
        if not mali_tablo_loaded:
            warning = self.check_mali_tablo_yuklu_mu(mali_tablo_loaded)
            if warning:
                results.append(warning)

        # ==========================================================================
        # 5. DİĞER BEYANNAMELER
        # ==========================================================================

        # 5.1 Muhtasar vs SGK APHB
        if "muhtasar_brut_ucret" in data and "sgk_aphb_brut_ucret" in data:
            results.append(
                self.check_muhtasar_vs_sgk(
                    muhtasar_brut_ucret=data["muhtasar_brut_ucret"],
                    sgk_aphb_brut_ucret=data["sgk_aphb_brut_ucret"]
                )
            )

        # 5.2 Mizan vs Geçici Vergi
        if all(k in data for k in ["mizan_gelir_toplam", "mizan_gider_toplam", "gecici_vergi_matrahi"]):
            results.append(
                self.check_gecici_vergi(
                    mizan_gelir_toplam=data["mizan_gelir_toplam"],
                    mizan_gider_toplam=data["mizan_gider_toplam"],
                    gecici_vergi_matrahi=data["gecici_vergi_matrahi"]
                )
            )

        # 5.3 Mizan vs Kurumlar Vergisi
        if "mizan_donem_kari" in data and "kv_matrahi" in data:
            results.append(
                self.check_kurumlar_vergisi(
                    mizan_donem_kari=data["mizan_donem_kari"],
                    kv_matrahi=data["kv_matrahi"]
                )
            )

        return results

    def run_teknik_kontroller(self, mizan_entries: List[Dict]) -> Dict:
        """
        Teknik kontrolleri çalıştır (ters bakiye, eksi hesap)

        Args:
            mizan_entries: Tüm mizan satırları

        Returns:
            {
                "ters_bakiye": List[TeknikKontrolResult],
                "eksi_hesap": List[TeknikKontrolResult],
                "toplam_sorun": int,
                "kritik_sorun": int
            }
        """
        ters_bakiye = self.check_ters_bakiye(mizan_entries)
        eksi_hesap = self.check_eksi_hesap(mizan_entries)

        toplam_sorun = len(ters_bakiye) + len(eksi_hesap)
        kritik_sorun = (
            sum(1 for r in ters_bakiye if r.severity == "critical") +
            sum(1 for r in eksi_hesap if r.severity == "critical")
        )

        return {
            "ters_bakiye": ters_bakiye,
            "eksi_hesap": eksi_hesap,
            "toplam_sorun": toplam_sorun,
            "kritik_sorun": kritik_sorun
        }


# Singleton instance
cross_check_engine = CrossCheckEngine()
