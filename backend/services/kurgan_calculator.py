"""
KURGAN Risk Calculator Service - V2 (Genisletilmis)

VDK Genelgesi (18.04.2025, E-55935724-010.06-7361) bazli
13 kriter risk analizi + Tavsiye Belgesindeki TUM hesap kontrolleri.

Mali Milat: 1 Ekim 2025

Kategoriler:
1. LIKIDITE (100, 102, 108)
2. ORTAKLAR (131, 231, 331, 431)
3. KDV (190, 191)
4. TICARI ALACAK/BORC (120, 128/129, 320)
5. VERGI/SGK (360, 361, 368)
6. SERMAYE/OZKAYNAK (500, 502/503, 540, 570/580, 522)
7. GELIR/GIDER (642, 689, 770)
8. STOK (153, 157)
9. DURAN VARLIK (254/255/260, 257)
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
from decimal import Decimal
import logging

# GİB Risk Servisi - KRG-01, KRG-02, KRG-12, KRG-16 için
# ⚠️ KRİTİK: GERÇEK VERİ SERVİSİ - SİMÜLASYON DEĞİL
try:
    from services.gib_risk_service import GibRiskService
    GIB_SERVICE_AVAILABLE = True
except ImportError:
    try:
        from gib_risk_service import GibRiskService
        GIB_SERVICE_AVAILABLE = True
    except ImportError:
        GIB_SERVICE_AVAILABLE = False
        GibRiskService = None

# KURGAN Veri Entegrasyon Servisi - Tüm veri kaynaklarını birleştirir
try:
    from services.kurgan_veri_entegrasyon import get_kurgan_veri_servisi
    KURGAN_ENTEGRASYON_MEVCUT = True
except ImportError:
    try:
        from kurgan_veri_entegrasyon import get_kurgan_veri_servisi
        KURGAN_ENTEGRASYON_MEVCUT = True
    except ImportError:
        KURGAN_ENTEGRASYON_MEVCUT = False
        get_kurgan_veri_servisi = None

# TCMB EVDS Servisi - Sektör finansal oranları (GERÇEK VERİ!)
try:
    from services.tcmb_evds_service import get_sector_data_for_nace
    TCMB_EVDS_MEVCUT = True
except ImportError:
    try:
        from tcmb_evds_service import get_sector_data_for_nace
        TCMB_EVDS_MEVCUT = True
    except ImportError:
        TCMB_EVDS_MEVCUT = False
        get_sector_data_for_nace = None

# Türkçe metin desteği - encoding sorunlarını önler
try:
    from turkish_text import TR, format_currency, format_percentage
except ImportError:
    # Fallback - modül yüklenemezse basit sınıf
    class TR:
        class KURGAN:
            KRG_07_GECTI = "Karşılıklı ödeme döngüsü için cari hesap analizi yapıldı. Risk tespit edilmedi."
        class UI:
            DURUM_NORMAL = "Normal"

logger = logging.getLogger(__name__)


# =============================================================================
# HESAP KATEGORI ANALIZ YAPILARI
# =============================================================================

@dataclass
class HesapKontrol:
    """Tek bir hesap kontrolu sonucu"""
    hesap_kodu: str
    hesap_adi: str
    kontrol_adi: str
    deger: float
    esik_uyari: float
    esik_kritik: float
    durum: str  # "NORMAL", "UYARI", "KRITIK"
    risk_puani: int  # 0-100
    aciklama: str
    oneri: str
    mevzuat_ref: List[str] = field(default_factory=list)


@dataclass
class KategoriAnalizi:
    """Bir kategori icin analiz sonucu"""
    kategori_id: str
    kategori_adi: str
    toplam_risk: int  # 0-100
    kontroller: List[HesapKontrol] = field(default_factory=list)
    uyarilar: List[str] = field(default_factory=list)
    aksiyonlar: List[str] = field(default_factory=list)
    kritik_sayisi: int = 0
    uyari_sayisi: int = 0
    normal_sayisi: int = 0


@dataclass
class KurganSenaryo:
    """KURGAN 16 senaryo yapisi"""
    senaryo_id: str
    senaryo_adi: str
    risk_puani: int
    aksiyon: str  # "TAKIP", "BILGI_ISTEME", "IZAHA_DAVET", "INCELEME"
    sure: Optional[str]  # "15 gun", "30 gun", None
    tetiklendi: bool = False
    tetikleme_nedeni: Optional[str] = None
    oneriler: List[str] = field(default_factory=list)


@dataclass
class TTK376Sonucu:
    """TTK 376 Sermaye Kaybi Analizi"""
    sermaye: float
    yasal_yedekler: float
    ozkaynaklar: float
    sermaye_kaybi_orani: float
    durum: str  # "NORMAL", "YARI_KAYIP", "UCTE_IKI_KAYIP", "BORCA_BATIK"
    aksiyon: Optional[str]
    aciklama: str


@dataclass
class OrtulSermayeSonucu:
    """KVK 12 Ortulu Sermaye Analizi"""
    donem_basi_ozkaynak: float
    sinir: float  # 3x ozkaynak
    iliskili_borc: float
    ortulu_sermaye_tutari: float
    durum: str  # "SINIR_ALTINDA", "SINIR_UZERINDE"
    kkeg_tutari: float
    aksiyon: Optional[str]


@dataclass
class FinansmanGiderKisitlamasi:
    """KVK 11/1-i Finansman Gider Kisitlamasi"""
    ozkaynak: float
    yabanci_kaynak: float
    toplam_finansman_gideri: float
    asan_kisim: float
    kisitlamaya_tabi_gider: float
    kkeg_tutari: float
    uygulanir_mi: bool


@dataclass
class AcilAksiyon:
    """Acil yapilacak is"""
    aksiyon: str
    oncelik: str  # "high", "medium", "low"
    tahmini_sure: str
    kategori: str
    ilgili_hesap: Optional[str] = None


# =============================================================================
# KURGAN 16 SENARYO TANIMLARI
# =============================================================================

KURGAN_SENARYOLARI = {
    "KRG-01": {
        "ad": "Riskli Satıcıdan Alım",
        "risk": 85,
        "aksiyon": "IZAHA_DAVET",
        "sure": "30 gün",
        "mevzuat": ["VUK 359", "VUK 370", "KURGAN Rehberi"],
        "aciklama": "Kod-3/Kod-4 veya VTR düzenlenen satıcıdan alım yapılması"
    },
    "KRG-02": {
        "ad": "Zincirleme Riskli Alım",
        "risk": 75,
        "aksiyon": "BILGI_ISTEME",
        "sure": "15 gün",
        "mevzuat": ["VUK 359", "KDV Genel Uygulama Tebliği"],
        "aciklama": "Tedarik zincirinde 2. veya 3. kademe riskli mükellef"
    },
    "KRG-03": {
        "ad": "Mal/Hizmet Akışı Tutarsızlığı",
        "risk": 80,
        "aksiyon": "IZAHA_DAVET",
        "sure": "30 gün",
        "mevzuat": ["VUK 359", "VUK 3/B"],
        "aciklama": "NACE faaliyet kodu ile alım yapılan mal/hizmet uyumsuzluğu"
    },
    "KRG-04": {
        "ad": "Stok-Satış Uyumsuzluğu",
        "risk": 85,
        "aksiyon": "IZAHA_DAVET",
        "sure": "30 gün",
        "mevzuat": ["VUK 186", "VUK 257", "VUK 359"],
        "aciklama": "Satış tutarı > (Alış + Açılış Stoku), olası kayıtdışı satış"
    },
    "KRG-05": {
        "ad": "Sevk Belgesi Eksikliği",
        "risk": 70,
        "aksiyon": "BILGI_ISTEME",
        "sure": "15 gün",
        "mevzuat": ["VUK 230", "VUK 359"],
        "aciklama": "Yüksek tutarlı mal alımında sevk irsaliyesi/taşıma belgesi eksikliği"
    },
    "KRG-06": {
        "ad": "Ödeme Yöntemi Uyumsuzluğu",
        "risk": 75,
        "aksiyon": "BILGI_ISTEME",
        "sure": "15 gün",
        "mevzuat": ["VUK 232", "VUK 234", "VUK 359"],
        "aciklama": "7.000 TL üstü faturalarda banka ödeme kaydı eksikliği"
    },
    "KRG-07": {
        "ad": "Karşılıklı Ödeme Döngüsü",
        "risk": 80,
        "aksiyon": "IZAHA_DAVET",
        "sure": "30 gün",
        "mevzuat": ["VUK 359", "KVK 13"],
        "aciklama": "Aynı gün karşılıklı ödeme/tahsilat (Ciro dolandırıcılığı şüphesi)"
    },
    "KRG-08": {
        "ad": "Sektörel Kârlılık Anomalisi",
        "risk": 65,
        "aksiyon": "TAKIP",
        "sure": None,
        "mevzuat": ["VUK 134", "KVK 6"],
        "aciklama": "Brüt/Net kâr marjı sektör ortalamasının %25 altında"
    },
    "KRG-09": {
        "ad": "Beyan-Yaşam Standardı Uyumsuzluğu",
        "risk": 70,
        "aksiyon": "BILGI_ISTEME",
        "sure": "15 gün",
        "mevzuat": ["VUK 134", "GVK 30"],
        "aciklama": "Ortakların lüks tüketimi ile beyan edilen gelir uyumsuzluğu"
    },
    "KRG-10": {
        "ad": "KDV Beyan-Fatura Uyumsuzluğu",
        "risk": 85,
        "aksiyon": "IZAHA_DAVET",
        "sure": "30 gün",
        "mevzuat": ["KDVK 29", "VUK 341", "VUK 344"],
        "aciklama": "KDV beyanname matrahı ile e-Fatura/e-Arşiv toplamı arasında fark"
    },
    "KRG-11": {
        "ad": "Riskli KDV İade Talebi",
        "risk": 90,
        "aksiyon": "INCELEME",
        "sure": "Derhal",
        "mevzuat": ["KDVK 32", "KDV Genel Uygulama Tebliği"],
        "aciklama": "İade matrahında riskli satıcı veya yüksek yüklenilen KDV"
    },
    "KRG-12": {
        "ad": "Sahte Belge Şüphesi",
        "risk": 95,
        "aksiyon": "INCELEME",
        "sure": "Derhal",
        "mevzuat": ["VUK 359 (Kaçakçılık)", "VUK 341-344", "CMK"],
        "aciklama": "SMİYB düzenleyen/kullanan mükellef ile işlem - HAPİS CEZASI RİSKİ"
    },
    "KRG-13": {
        "ad": "Transfer Fiyatlandırması Riski",
        "risk": 80,
        "aksiyon": "IZAHA_DAVET",
        "sure": "30 gün",
        "mevzuat": ["KVK 12 (Örtülü Sermaye)", "KVK 13 (Transfer Fiyatlandırması)", "1 Seri No'lu TF Tebliği"],
        "aciklama": "İlişkili kişi işlemleri/Ciro > %25, ortaklara borç faizi eksikliği",
        "hesap_kodlari": ["131", "231", "331", "431"],
        "esik": 0.25
    },
    "KRG-14": {
        "ad": "Sürekli Zarar Beyanı",
        "risk": 70,
        "aksiyon": "BILGI_ISTEME",
        "sure": "15 gün",
        "mevzuat": ["VUK 134", "KVK 6", "TTK 376"],
        "aciklama": "3+ yıl üst üste zarar beyanı, teknik iflas riski"
    },
    "KRG-15": {
        "ad": "Düşük Vergi Yükü",
        "risk": 75,
        "aksiyon": "BILGI_ISTEME",
        "sure": "15 gün",
        "mevzuat": ["VUK 134", "KVK 6", "GVK 40-41"],
        "aciklama": "Efektif vergi yükü sektör ortalamasının %50'sinin altında"
    },
    "KRG-16": {
        "ad": "Ortak/Yönetici Risk Geçmişi",
        "risk": 80,
        "aksiyon": "IZAHA_DAVET",
        "sure": "30 gün",
        "mevzuat": ["VUK 359", "VUK 3/B", "KURGAN Rehberi"],
        "aciklama": "Ortağın başka şirketinde VTR veya sahte belge tespiti"
    },
}


# =============================================================================
# LEGACY YAPILAR (Geriye Uyumluluk)
# =============================================================================

@dataclass
class KurganCriteria:
    """13 KURGAN kriteri icin veri yapisi (Legacy)"""
    faaliyet_uyumu: bool = True
    faaliyet_uyum_score: int = 100
    organik_temas: bool = False
    atif_var: bool = False
    vergiye_uyum_score: int = 100
    surekli_zarar: bool = False
    devreden_kdv_yuksek: bool = False
    dusuk_vergi_beyani: bool = False
    devamlilik_var: bool = False
    tekrar_alim_sayisi: int = 0
    iliskili_kisi_var: bool = False
    ayni_smmm: bool = False
    depolama_kapasitesi: bool = True
    e_imza_uyumu: bool = True
    e_imza_gap_days: int = 0
    emtia_tespiti_var: bool = False
    sevkiyat_belgeleri: bool = True
    irsaliye_var: bool = True
    plaka_takip: bool = True
    odeme_seffafligi_score: int = 100
    fiktif_odeme_riski: bool = False
    cek_ciro_karmasik: bool = False
    dbs_kullanimi: bool = True
    gecmis_inceleme_var: bool = False
    smiyb_gecmisi_var: bool = False
    ortak_gecmisi_temiz: bool = True


@dataclass
class KurganRiskResult:
    """KURGAN risk analizi sonucu (Legacy + V2)"""
    score: int
    risk_level: str
    warnings: List[str]
    action_items: List[str]
    criteria_scores: Dict[str, int]
    criteria_details: Dict[str, Any]
    vdk_reference: str = "E-55935724-010.06-7361"
    effective_date: str = "2025-10-01"
    calculated_at: str = ""

    # V2 Yeni Alanlar
    risk_summary: Optional[Dict] = None
    urgent_actions: Optional[Dict] = None
    category_analysis: Optional[Dict] = None
    kurgan_scenarios: Optional[List[Dict]] = None
    ttk_376: Optional[Dict] = None
    ortulu_sermaye: Optional[Dict] = None
    finansman_gider_kisitlamasi: Optional[Dict] = None
    muhtemel_cezalar: Optional[Dict] = None  # Müfettiş Gözü için ceza hesaplaması
    mukellef_finansal_oranlari: Optional[Dict] = None  # Sektör karşılaştırması için mükellef oranları

    def __post_init__(self):
        if not self.calculated_at:
            self.calculated_at = datetime.utcnow().isoformat() + "Z"


# =============================================================================
# ANA HESAPLAYICI SINIF
# =============================================================================

class KurganCalculator:
    """KURGAN 13 kriter + Kategori bazli hesap analizi"""

    WEIGHTS: Dict[str, int] = {
        "vergiye_uyum": 25,
        "odeme_seffafligi": 20,
        "sevkiyat": 10,
        "e_imza_uyumu": 10,
        "gecmis_inceleme": 15,
        "ortak_gecmisi": 10,
        "diger": 10
    }

    # Hesap esikleri
    ESIKLER = {
        # LIKIDITE
        "100_siskinlik_uyari": 0.05,      # %5
        "100_siskinlik_kritik": 0.15,     # %15
        # ORTAKLAR
        "131_sermaye_uyari": 0.10,        # %10
        "131_sermaye_kritik": 0.30,       # %30
        "331_ortulu_katsayi": 3.0,        # 3x ozkaynak
        # KDV
        "190_devreden_ay": 36,            # 36 ay
        # TICARI
        "120_yaslandirma_uyari": 90,      # 90 gun
        "120_yaslandirma_kritik": 180,    # 180 gun
        "320_yaslandirma_uyari": 90,      # 90 gun
        # STOK
        "153_devir_uyari": 180,           # 180 gun
        # DURAN VARLIK
        "dogrudan_gider_haddi_2026": 12000,  # 12.000 TL
    }

    # Aksiyon bazında tahmini puan etkisi (düşüş)
    PUAN_ETKISI = {
        "kasa_sayim": -12,          # Kasa sayım tutanağı hazırla
        "kasa_adat": -15,           # Kasa adat hesabı yap
        "adat_faizi": -18,          # 131 hesap için adat faizi hesapla
        "ortulu_sermaye_kkeg": -10, # Örtülü sermaye KKEG hesapla
        "banka_kmh": -8,            # KMH belgesi temin et
        "ttk_376_bildirim": -5,     # TTK 376 bildirimi yap
        "stok_sayim": -10,          # Stok sayım tutanağı hazırla
        "sgk_mutabakat": -8,        # SGK mutabakatı yap
        "kdv_beyan_kontrol": -12,   # KDV beyan kontrolü
        "default": -5,              # Varsayılan etki
    }

    # Vergi ceza oranları — VUK madde 112 gecikme faizi
    # NOT: Bu oranlar config/economic_rates.json'daki oranlardan FARKLIDIR.
    # gecikme_faizi_aylik (%1.8) = VUK 112 gecikme faizi (vergi aslı üzerinden)
    # economic_rates.json gecikme_zammi_aylik (%4.4) = 6183 sayılı kanun gecikme zammı
    CEZA_ORANLARI = {
        "vergi_ziyai_cezasi": 0.50,  # %50 VZC
        "gecikme_faizi_aylik": 0.018,  # %1.8 aylık (VUK 112)
        "kurumlar_vergisi": 0.25,    # %25 KV oranı
        "kdv_orani": 0.20,           # %20 KDV oranı
    }

    def __init__(self) -> None:
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        # GİB Risk Servisi - KRG-01, KRG-02, KRG-12, KRG-16 için
        self.gib_service = GibRiskService() if GIB_SERVICE_AVAILABLE else None
        if self.gib_service:
            self.logger.info("GİB Risk Servisi aktif")
        else:
            self.logger.warning("GİB Risk Servisi yüklenemedi - simülasyon modu")

        # KURGAN Veri Entegrasyon Servisi - Vergi Levhası + MERSIS + TSG + GİB
        self.veri_entegrasyon_servisi = None
        if KURGAN_ENTEGRASYON_MEVCUT:
            try:
                self.veri_entegrasyon_servisi = get_kurgan_veri_servisi()
                self.logger.info("KURGAN Veri Entegrasyon Servisi aktif")
                servis_durumu = self.veri_entegrasyon_servisi.get_servis_durumu()
                self.logger.info(f"  Aktif servisler: {servis_durumu.get('aktif_servisler', [])}")
            except Exception as e:
                self.logger.warning(f"KURGAN Veri Entegrasyon Servisi yüklenemedi: {e}")

    def calculate(
        self,
        portfolio_data: Dict,
        e_fatura_data: Optional[Dict] = None,
        banka_data: Optional[Dict] = None,
        sgk_data: Optional[Dict] = None
    ) -> KurganRiskResult:
        """
        Tam KURGAN + Kategori analizi yapar
        """
        try:
            self.logger.info("KURGAN V2 risk hesaplamasi basladi")

            # Input validation
            if not portfolio_data:
                raise ValueError("portfolio_data bos olamaz")

            if not isinstance(portfolio_data, dict):
                raise TypeError(f"portfolio_data dict olmali, {type(portfolio_data).__name__} verildi")

            # Validate numeric fields if present
            self._validate_financial_data(portfolio_data)

            # 1. Legacy KURGAN kriterleri (geri uyumluluk için)
            criteria = self._extract_criteria(portfolio_data, e_fatura_data, banka_data, sgk_data)
            legacy_score, warnings, action_items = self._calculate_risk_score(criteria)
            criteria_scores = self._get_criteria_scores(criteria)

            # 2. Kategori bazli analizler - GERCEK MIZAN VERISI
            category_analysis = self._analyze_all_categories(portfolio_data, banka_data, sgk_data)

            # 3. KURGAN 16 senaryo kontrolu
            kurgan_scenarios = self._check_kurgan_scenarios(portfolio_data, category_analysis)

            # 4. YENİ: Gerçek verilere dayalı risk skoru
            # Kategori analizlerinden ortalama risk al (gerçek mizan verisi)
            category_risks = [cat.get("toplam_risk", 0) for cat in category_analysis.values()]
            avg_category_risk = sum(category_risks) / len(category_risks) if category_risks else 0

            # KURGAN senaryolarından tetiklenen sayısı
            triggered_count = len([s for s in kurgan_scenarios if s.get("tetiklendi")])

            # Gerçek risk skoru: 100'den kategori riskleri ve tetiklenen senaryolar düşülür
            # Her tetiklenen senaryo -5 puan
            real_score = max(0, min(100, 100 - int(avg_category_risk) - (triggered_count * 5)))

            # Eğer gerçek kategori verisi varsa onu kullan, yoksa legacy
            has_real_data = portfolio_data.get("data_source") == "database"
            score = real_score if has_real_data else legacy_score
            risk_level = self._determine_risk_level(score)

            self.logger.info(f"Risk skoru: legacy={legacy_score}, real={real_score}, used={score}, has_real_data={has_real_data}")

            # 4. TTK 376 Sermaye kaybi analizi
            ttk_376 = self._calculate_ttk_376(portfolio_data)

            # 5. Ortulu sermaye analizi
            ortulu_sermaye = self._calculate_ortulu_sermaye(portfolio_data)

            # 6. Finansman gider kisitlamasi
            finansman_gider = self._calculate_finansman_gider_kisitlamasi(portfolio_data)

            # 7. Acil aksiyonlari hesapla
            urgent_actions = self._calculate_urgent_actions(
                category_analysis, kurgan_scenarios, ttk_376, ortulu_sermaye
            )

            # 8. Risk ozeti olustur
            risk_summary = self._create_risk_summary(
                score, category_analysis, kurgan_scenarios, urgent_actions
            )

            # 9. Muhtemel cezalari hesapla (Mufettis Gozu icin)
            muhtemel_cezalar = self.calculate_potential_penalties(
                category_analysis, ortulu_sermaye, ttk_376
            )

            # 10. Mükellef finansal oranları (Sektör karşılaştırması için)
            mukellef_finansal_oranlari = self._calculate_mukellef_finansal_oranlari(portfolio_data)

            # Tum uyarilari birlestir
            all_warnings = warnings.copy()
            all_actions = action_items.copy()

            for cat_id, cat_data in category_analysis.items():
                all_warnings.extend(cat_data.get("uyarilar", []))
                all_actions.extend(cat_data.get("aksiyonlar", []))

            result = KurganRiskResult(
                score=score,
                risk_level=risk_level,
                warnings=all_warnings,
                action_items=all_actions,
                criteria_scores=criteria_scores,
                criteria_details=asdict(criteria),
                risk_summary=risk_summary,
                urgent_actions=urgent_actions,
                category_analysis=category_analysis,
                kurgan_scenarios=kurgan_scenarios,
                ttk_376=ttk_376,
                ortulu_sermaye=ortulu_sermaye,
                finansman_gider_kisitlamasi=finansman_gider,
                muhtemel_cezalar=muhtemel_cezalar,
                mukellef_finansal_oranlari=mukellef_finansal_oranlari
            )

            self.logger.info(f"KURGAN V2 hesaplandi: {score}/100 - {risk_level}")
            return result

        except Exception as e:
            self.logger.error(f"KURGAN hesaplama hatasi: {e}", exc_info=True)
            raise

    def _validate_financial_data(self, portfolio_data: Dict) -> None:
        """
        Finansal verileri doğrula.
        Negatif değerler veya geçersiz tipler için uyarı logla.
        """
        numeric_fields = [
            ("aktif_toplam", 0),
            ("pasif_toplam", 0),
            ("net_satis", 0),
        ]

        for field, min_value in numeric_fields:
            value = portfolio_data.get(field)
            if value is not None:
                if not isinstance(value, (int, float, Decimal)):
                    self.logger.warning(
                        f"Gecersiz tip: {field}={value} (tip: {type(value).__name__}). "
                        f"int, float veya Decimal bekleniyor."
                    )
                elif value < min_value:
                    self.logger.warning(
                        f"Beklenmeyen deger: {field}={value} < {min_value}. "
                        f"Negatif degerler yanlis hesaplamalara yol acabilir."
                    )

        # Validate hesaplar dict structure
        hesaplar = portfolio_data.get("hesaplar", {})
        if hesaplar and not isinstance(hesaplar, dict):
            self.logger.warning(
                f"hesaplar dict olmali, {type(hesaplar).__name__} verildi. "
                f"Varsayilan bos dict kullanilacak."
            )
            portfolio_data["hesaplar"] = {}

        # Validate individual account values
        for hesap_kodu, hesap_data in portfolio_data.get("hesaplar", {}).items():
            if isinstance(hesap_data, dict):
                bakiye = hesap_data.get("bakiye")
                if bakiye is not None and not isinstance(bakiye, (int, float, Decimal)):
                    self.logger.warning(
                        f"Gecersiz bakiye tipi: hesap {hesap_kodu}, "
                        f"bakiye={bakiye} (tip: {type(bakiye).__name__})"
                    )

    # =========================================================================
    # KATEGORI ANALIZ METODLARI
    # =========================================================================

    def _analyze_all_categories(
        self,
        portfolio_data: Dict,
        banka_data: Optional[Dict],
        sgk_data: Optional[Dict]
    ) -> Dict:
        """Tum kategorileri analiz et"""

        return {
            "likidite": self._analyze_likidite(portfolio_data, banka_data),
            "ortaklar": self._analyze_ortaklar(portfolio_data),
            "kdv": self._analyze_kdv(portfolio_data),
            "ticari": self._analyze_ticari(portfolio_data),
            "vergi_sgk": self._analyze_vergi_sgk(portfolio_data, sgk_data),
            "sermaye": self._analyze_sermaye(portfolio_data),
            "gelir_gider": self._analyze_gelir_gider(portfolio_data),
            "stok": self._analyze_stok(portfolio_data),
            "duran_varlik": self._analyze_duran_varlik(portfolio_data),
        }

    def _analyze_likidite(self, data: Dict, banka_data: Optional[Dict]) -> Dict:
        """LIKIDITE kategorisi: 100, 102, 108"""
        kontroller = []
        uyarilar = []
        aksiyonlar = []

        # 100 KASA - Siskinlik
        kasa_bakiye = data.get("hesaplar", {}).get("100", {}).get("bakiye", 0)
        aktif_toplam = data.get("aktif_toplam", 1)
        kasa_orani = kasa_bakiye / aktif_toplam if aktif_toplam > 0 else 0

        kasa_durum = "NORMAL"
        kasa_risk = 0
        if kasa_orani >= self.ESIKLER["100_siskinlik_kritik"]:
            kasa_durum = "KRITIK"
            kasa_risk = 90
            uyarilar.append(f"⚠️ KRITIK: Kasa bakiyesi aktifin %{kasa_orani*100:.1f}'i (Esik: %15)")
            aksiyonlar.append("ACIL: Kasa sayim tutanagi hazirlayin, adat hesabi yapin")
        elif kasa_orani >= self.ESIKLER["100_siskinlik_uyari"]:
            kasa_durum = "UYARI"
            kasa_risk = 60
            uyarilar.append(f"Kasa bakiyesi aktifin %{kasa_orani*100:.1f}'i (Esik: %5)")
            aksiyonlar.append("Kasa sayim tutanagi hazirlayin")

        kontroller.append({
            "hesap_kodu": "100",
            "hesap_adi": "Kasa",
            "kontrol_adi": "Siskinlik Orani",
            "deger": kasa_orani * 100,
            "raw_bakiye": kasa_bakiye,  # Ceza hesaplama için ham değer
            "raw_aktif": aktif_toplam,  # Ceza hesaplama için ham değer
            "esik_uyari": 5,
            "esik_kritik": 15,
            "durum": kasa_durum,
            "risk_puani": kasa_risk,
            "aciklama": f"Kasa bakiyesi: {kasa_bakiye:,.0f} TL, Aktif: {aktif_toplam:,.0f} TL",
            "oneri": "100 hesabi alt kirilimlar (100.01 Elden Nakit, 100.02 Kasada Tutulan, 100.03 Ortaga Verilen) acilin",
            "mevzuat_ref": ["VUK 134", "VDK Genelge"]
        })

        # 100 KASA - Negatif bakiye (FIZIKSEL IMKANSIZ)
        if kasa_bakiye < 0:
            kontroller.append({
                "hesap_kodu": "100",
                "hesap_adi": "Kasa",
                "kontrol_adi": "Negatif Bakiye",
                "deger": kasa_bakiye,
                "esik_uyari": 0,
                "esik_kritik": 0,
                "durum": "KRITIK",
                "risk_puani": 100,
                "aciklama": "FIZIKSEL IMKANSIZ - Kasada negatif para olamaz!",
                "oneri": "Derhal duzeltme kaydi yapin, ortaklardan alacaklar olarak siniflandirin",
                "mevzuat_ref": ["VUK 171", "VUK 219"]
            })
            uyarilar.append("🔴 KRITIK: Negatif kasa bakiyesi - FIZIKSEL IMKANSIZ!")
            aksiyonlar.append("ACIL: Negatif kasa bakiyesini duzeltin")

        # 100 KASA - Alt kirilim kontrolu
        kasa_alt_kirilim = data.get("hesaplar", {}).get("100", {}).get("alt_kirilim_var", False)
        if not kasa_alt_kirilim and kasa_bakiye > 50000:
            kontroller.append({
                "hesap_kodu": "100",
                "hesap_adi": "Kasa",
                "kontrol_adi": "Alt Kirilim",
                "deger": 0,
                "esik_uyari": 1,
                "esik_kritik": 1,
                "durum": "UYARI",
                "risk_puani": 40,
                "aciklama": "Kasa hesabi alt kirilimlara ayrilmamis",
                "oneri": "100.01/02/03 alt hesaplari acin - adat riskini azaltir",
                "mevzuat_ref": ["VDK Uygulamasi"]
            })
            uyarilar.append("Kasa hesabi alt kirilimlara ayrilmamis - adat riski")

        # 102 BANKALAR - Negatif bakiye
        banka_bakiye = data.get("hesaplar", {}).get("102", {}).get("bakiye", 0)
        if banka_bakiye < 0:
            kontroller.append({
                "hesap_kodu": "102",
                "hesap_adi": "Bankalar",
                "kontrol_adi": "Negatif Bakiye",
                "deger": banka_bakiye,
                "esik_uyari": 0,
                "esik_kritik": 0,
                "durum": "UYARI",
                "risk_puani": 50,
                "aciklama": f"Banka hesabi negatif: {banka_bakiye:,.0f} TL",
                "oneri": "KMH (Kredili Mevduat Hesabi) belgesi temin edin",
                "mevzuat_ref": ["VUK 227"]
            })
            uyarilar.append("Banka hesabi negatif - KMH belgesi gerekli")
            aksiyonlar.append("Bankadan KMH belgesi temin edin")

        # 108 DIGER HAZIR DEGERLER - POS uyumu
        pos_tutari = data.get("hesaplar", {}).get("108", {}).get("pos_tutari", 0)
        beyan_tutari = data.get("kdv_beyan_tutari", 0)
        if pos_tutari > 0 and beyan_tutari > 0:
            fark_orani = abs(pos_tutari - beyan_tutari) / beyan_tutari if beyan_tutari > 0 else 0
            if fark_orani > 0.01:  # %1'den fazla fark
                kontroller.append({
                    "hesap_kodu": "108",
                    "hesap_adi": "Diger Hazir Degerler",
                    "kontrol_adi": "POS-Beyan Uyumu",
                    "deger": fark_orani * 100,
                    "esik_uyari": 1,
                    "esik_kritik": 5,
                    "durum": "UYARI" if fark_orani < 0.05 else "KRITIK",
                    "risk_puani": 60 if fark_orani < 0.05 else 85,
                    "aciklama": f"POS tutari ile KDV beyani arasinda %{fark_orani*100:.1f} fark",
                    "oneri": "E-fatura capraz kontrolu yapin",
                    "mevzuat_ref": ["KDVK 29", "VUK 230"]
                })
                uyarilar.append(f"POS-Beyan uyumsuzlugu: %{fark_orani*100:.1f}")

        # Kategori toplam risk hesapla
        toplam_risk = 0
        kritik_sayisi = 0
        uyari_sayisi = 0
        normal_sayisi = 0

        for k in kontroller:
            toplam_risk += k["risk_puani"]
            if k["durum"] == "KRITIK":
                kritik_sayisi += 1
            elif k["durum"] == "UYARI":
                uyari_sayisi += 1
            else:
                normal_sayisi += 1

        ortalama_risk = toplam_risk // len(kontroller) if kontroller else 0

        return {
            "kategori_id": "likidite",
            "kategori_adi": "Likidite",
            "toplam_risk": ortalama_risk,
            "kontroller": kontroller,
            "uyarilar": uyarilar,
            "aksiyonlar": aksiyonlar,
            "kritik_sayisi": kritik_sayisi,
            "uyari_sayisi": uyari_sayisi,
            "normal_sayisi": normal_sayisi
        }

    def _analyze_ortaklar(self, data: Dict) -> Dict:
        """ORTAKLAR kategorisi: 131, 231, 331, 431"""
        kontroller = []
        uyarilar = []
        aksiyonlar = []

        sermaye = data.get("hesaplar", {}).get("500", {}).get("bakiye", 0) or data.get("sermaye", 0)
        ozkaynak = data.get("ozkaynak", 0)

        # 131 ORTAKLARDAN ALACAKLAR
        ortaklardan_alacak = data.get("hesaplar", {}).get("131", {}).get("bakiye", 0)

        # KRİTİK: Her zaman kontrol ekle - bakiye 0 bile olsa
        if sermaye > 0 and ortaklardan_alacak > 0:
            oran = ortaklardan_alacak / sermaye

            durum = "NORMAL"
            risk = 0
            if oran >= self.ESIKLER["131_sermaye_kritik"]:
                durum = "KRITIK"
                risk = 90
                uyarilar.append(f"⚠️ KRITIK: Ortaklardan alacaklar sermayenin %{oran*100:.1f}'i (Esik: %30)")
                aksiyonlar.append("ACIL: Adat faizi hesaplayin ve fatura kesin")
            elif oran >= self.ESIKLER["131_sermaye_uyari"]:
                durum = "UYARI"
                risk = 60
                uyarilar.append(f"Ortaklardan alacaklar sermayenin %{oran*100:.1f}'i (Esik: %10)")
                aksiyonlar.append("Adat faizi hesaplayin, 642 hesapta gosterin")

            kontroller.append({
                "hesap_kodu": "131",
                "hesap_adi": "Ortaklardan Alacaklar",
                "kontrol_adi": "Sermayeye Oran",
                "deger": oran * 100,
                "raw_bakiye": ortaklardan_alacak,  # Ceza hesaplama için ham değer
                "raw_sermaye": sermaye,  # Ceza hesaplama için ham değer
                "esik_uyari": 10,
                "esik_kritik": 30,
                "durum": durum,
                "risk_puani": risk,
                "aciklama": f"Ortaklardan alacak: {ortaklardan_alacak:,.0f} TL, Sermaye: {sermaye:,.0f} TL",
                "oneri": "TTK geregi ortaklarin sirkete borclanmasi yasaktir. Adat faizi hesaplayin ve 642'de gosterin.",
                "mevzuat_ref": ["TTK 358", "KVK 13", "GVK 75"],
                "kanitlar": [
                    {"hesap": "131", "bakiye": ortaklardan_alacak, "aciklama": "Ortaklardan Alacaklar hesap bakiyesi"},
                    {"hesap": "500", "bakiye": sermaye, "aciklama": "Sermaye hesap bakiyesi"}
                ]
            })

            # 131 ADAT kontrolu - 642'de gelir var mi?
            faiz_geliri = data.get("hesaplar", {}).get("642", {}).get("bakiye", 0)
            if ortaklardan_alacak > 100000 and faiz_geliri == 0:
                kontroller.append({
                    "hesap_kodu": "131",
                    "hesap_adi": "Ortaklardan Alacaklar",
                    "kontrol_adi": "Adat Faizi",
                    "deger": 0,
                    "raw_bakiye": ortaklardan_alacak,  # Ceza hesaplama için ham değer
                    "esik_uyari": 1,
                    "esik_kritik": 1,
                    "durum": "KRITIK",
                    "risk_puani": 80,
                    "aciklama": f"Ortaklardan alacak: {ortaklardan_alacak:,.0f} TL ama 642 Faiz Geliri hesabinda kayit yok",
                    "oneri": "TCMB faiz orani ile aylik adat hesaplayin ve fatura kesin",
                    "mevzuat_ref": ["KVK 13", "Transfer Fiyatlandirmasi Tebligi"]
                })
                uyarilar.append("🔴 131 hesapta bakiye var ama 642'de adat geliri YOK!")
                aksiyonlar.append("ACIL: Adat faizi hesaplayin ve 642'de gosterin")

        # 331 ORTAKLARA BORCLAR - Ortulu Sermaye
        ortaklara_borc = data.get("hesaplar", {}).get("331", {}).get("bakiye", 0)
        if ozkaynak > 0 and ortaklara_borc > 0:
            sinir = ozkaynak * self.ESIKLER["331_ortulu_katsayi"]

            durum = "NORMAL"
            risk = 0
            if ortaklara_borc > sinir:
                durum = "KRITIK"
                risk = 85
                ortulu_tutar = ortaklara_borc - sinir
                uyarilar.append(f"⚠️ KRITIK: Ortulu sermaye siniri asildi! Asan kisim: {ortulu_tutar:,.0f} TL")
                aksiyonlar.append(f"ACIL: {ortulu_tutar:,.0f} TL tutarindaki faiz/kur farki KKEG'e alinmali")
            elif ortaklara_borc > sinir * 0.8:  # %80'ine yaklastiginda uyari
                durum = "UYARI"
                risk = 50
                uyarilar.append("Ortaklara borc, ortulu sermaye sinirina yaklasti")

            kontroller.append({
                "hesap_kodu": "331",
                "hesap_adi": "Ortaklara Borclar",
                "kontrol_adi": "Ortulu Sermaye (3x Kural)",
                "deger": ortaklara_borc,
                "esik_uyari": sinir * 0.8,
                "esik_kritik": sinir,
                "durum": durum,
                "risk_puani": risk,
                "aciklama": f"Ortaklara borc: {ortaklara_borc:,.0f} TL, Sinir (3x Ozkaynak): {sinir:,.0f} TL",
                "oneri": "KVK 12 geregi iliskili kisilerden alinan borclar ozkaynagin 3 katini asamaz",
                "mevzuat_ref": ["KVK 12", "KVK 11/1-b"]
            })

            # 331 Gerceklik kontrolu
            kontroller.append({
                "hesap_kodu": "331",
                "hesap_adi": "Ortaklara Borclar",
                "kontrol_adi": "Gerceklik Tevsiki",
                "deger": ortaklara_borc,
                "esik_uyari": 0,
                "esik_kritik": 0,
                "durum": "UYARI" if ortaklara_borc > 100000 else "NORMAL",
                "risk_puani": 40 if ortaklara_borc > 100000 else 0,
                "aciklama": "331 hesap gercekligi belgelenebilir olmali",
                "oneri": "Ortaklarla mutabakat yapin, banka dekontlarini saklayin",
                "mevzuat_ref": ["VUK 227", "VUK 230"]
            })

        # 231/431 UZUN VADELI
        uzun_vadeli_alacak = data.get("hesaplar", {}).get("231", {}).get("bakiye", 0)
        uzun_vadeli_borc = data.get("hesaplar", {}).get("431", {}).get("bakiye", 0)

        if uzun_vadeli_alacak > 0:
            kontroller.append({
                "hesap_kodu": "231",
                "hesap_adi": "Ortaklardan Alacaklar (Uzun Vadeli)",
                "kontrol_adi": "Bakiye Kontrolu",
                "deger": uzun_vadeli_alacak,
                "esik_uyari": sermaye * 0.1 if sermaye > 0 else 100000,
                "esik_kritik": sermaye * 0.3 if sermaye > 0 else 300000,
                "durum": "UYARI" if uzun_vadeli_alacak > 100000 else "NORMAL",
                "risk_puani": 50 if uzun_vadeli_alacak > 100000 else 0,
                "aciklama": f"Uzun vadeli ortaklardan alacak: {uzun_vadeli_alacak:,.0f} TL",
                "oneri": "131 ile ayni kurallar gecerli - adat faizi hesaplayin",
                "mevzuat_ref": ["KVK 13", "TTK 358"],
                "kanitlar": [{"hesap": "231", "bakiye": uzun_vadeli_alacak, "aciklama": "231 hesap bakiyesi"}]
            })

        # 431 ORTAKLARA BORÇLAR (UZUN VADELİ) - Örtülü Sermaye Riski
        if uzun_vadeli_borc > 0:
            # 431 için örtülü sermaye kontrolü (331 ile aynı mantık)
            sinir_431 = ozkaynak * self.ESIKLER["331_ortulu_katsayi"] if ozkaynak > 0 else 0
            toplam_ortaklara_borc = ortaklara_borc + uzun_vadeli_borc

            durum_431 = "NORMAL"
            risk_431 = 0

            # Yüksek bakiye kontrolü (100.000 TL üzeri dikkat çeker)
            if uzun_vadeli_borc > 1000000:  # 1 milyon TL üzeri KRİTİK
                durum_431 = "KRITIK"
                risk_431 = 85
                uyarilar.append(f"⚠️ KRİTİK: 431 Ortaklara Borçlar (UV) çok yüksek: {uzun_vadeli_borc:,.0f} TL")
                aksiyonlar.append("ACIL: 431 hesap kaynağını belgeleyin, gerçekliğini tevsik edin")
            elif uzun_vadeli_borc > 100000:  # 100.000 TL üzeri UYARI
                durum_431 = "UYARI"
                risk_431 = 50
                uyarilar.append(f"431 Ortaklara Borçlar (UV) yüksek: {uzun_vadeli_borc:,.0f} TL")
                aksiyonlar.append("431 hesap mutabakatı yapın, banka dekontlarını hazırlayın")

            # Toplam ortaklara borç örtülü sermaye sınırını aşıyor mu?
            if ozkaynak > 0 and toplam_ortaklara_borc > sinir_431:
                durum_431 = "KRITIK"
                risk_431 = 90
                ortulu_tutar = toplam_ortaklara_borc - sinir_431
                uyarilar.append(f"⚠️ KRITIK: Toplam ortaklara borc (331+431) ortulu sermaye sinirini asti! Asan: {ortulu_tutar:,.0f} TL")
                aksiyonlar.append(f"ACIL: {ortulu_tutar:,.0f} TL icin faiz/kur farki KKEG'e alinmali")

            kontroller.append({
                "hesap_kodu": "431",
                "hesap_adi": "Ortaklara Borclar (Uzun Vadeli)",
                "kontrol_adi": "Bakiye ve Ortulu Sermaye Kontrolu",
                "deger": uzun_vadeli_borc,
                "esik_uyari": 100000,
                "esik_kritik": 1000000,
                "durum": durum_431,
                "risk_puani": risk_431,
                "aciklama": f"Uzun vadeli ortaklara borc: {uzun_vadeli_borc:,.0f} TL, Toplam 331+431: {toplam_ortaklara_borc:,.0f} TL",
                "oneri": "331 ile ayni kurallar gecerli - ortulu sermaye ve gerceklik kontrolu yapilmali",
                "mevzuat_ref": ["KVK 12", "KVK 11/1-b", "VUK 227"],
                "kanitlar": [
                    {"hesap": "431", "bakiye": uzun_vadeli_borc, "aciklama": "Ortaklara Borclar (Uzun Vadeli) hesap bakiyesi"},
                    {"hesap": "331+431", "bakiye": toplam_ortaklara_borc, "aciklama": "Toplam ortaklara borc"}
                ]
            })

        # KRİTİK: Hiç kontrol eklenmemişse (tüm bakiyeler 0), baseline kontrol ekle
        if not kontroller:
            _has_data = ortaklardan_alacak != 0 or uzun_vadeli_alacak != 0 or ortaklara_borc != 0 or uzun_vadeli_borc != 0
            kontroller.append({
                "hesap_kodu": "131/231/331/431",
                "hesap_adi": "Ortaklar Hesaplari",
                "kontrol_adi": "Normal" if _has_data else "Genel Durum",
                "deger": 0,
                "esik_uyari": 0,
                "esik_kritik": 0,
                "durum": "NORMAL",
                "risk_puani": 0,
                "aciklama": "Ortaklarla ilgili hesaplarda risk tespit edilmedi" if _has_data else "Hesap verisi bulunamadi",
                "oneri": "Ortaklardan alacak (131) ve ortaklara borc (331) hesaplari kontrol edildi" if _has_data else "",
                "mevzuat_ref": ["TTK 358", "KVK 12", "KVK 13"],
                "kanitlar": [
                    {"hesap": "131", "bakiye": ortaklardan_alacak, "aciklama": "Ortaklardan Alacaklar"},
                    {"hesap": "231", "bakiye": uzun_vadeli_alacak, "aciklama": "Ortaklardan Alacaklar (Uzun Vadeli)"},
                    {"hesap": "331", "bakiye": ortaklara_borc, "aciklama": "Ortaklara Borclar"},
                    {"hesap": "431", "bakiye": uzun_vadeli_borc, "aciklama": "Ortaklara Borclar (Uzun Vadeli)"}
                ]
            })

        # Kategori ozet
        toplam_risk = sum(k["risk_puani"] for k in kontroller)
        ortalama_risk = toplam_risk // len(kontroller) if kontroller else 0

        return {
            "kategori_id": "ortaklar",
            "kategori_adi": "Ortaklar",
            "toplam_risk": ortalama_risk,
            "kontroller": kontroller,
            "uyarilar": uyarilar,
            "aksiyonlar": aksiyonlar,
            "kritik_sayisi": sum(1 for k in kontroller if k["durum"] == "KRITIK"),
            "uyari_sayisi": sum(1 for k in kontroller if k["durum"] == "UYARI"),
            "normal_sayisi": sum(1 for k in kontroller if k["durum"] == "NORMAL")
        }

    def _analyze_kdv(self, data: Dict) -> Dict:
        """KDV kategorisi: 190, 191"""
        kontroller = []
        uyarilar = []
        aksiyonlar = []

        # 190 DEVREDEN KDV
        devreden_kdv = data.get("hesaplar", {}).get("190", {}).get("bakiye", 0)
        devreden_ay_sayisi = data.get("devreden_kdv_ay_sayisi", 0)

        if devreden_ay_sayisi >= self.ESIKLER["190_devreden_ay"]:
            kontroller.append({
                "hesap_kodu": "190",
                "hesap_adi": "Devreden KDV",
                "kontrol_adi": "36 Ay Sureli Devir",
                "deger": devreden_ay_sayisi,
                "esik_uyari": 24,
                "esik_kritik": 36,
                "durum": "KRITIK",
                "risk_puani": 85,
                "aciklama": f"{devreden_ay_sayisi} aydir devreden KDV var - VDK oncelikli risk senaryosu!",
                "oneri": "2030 UYARISI: 2025-2029 en dusuk devreden KDV tutari silinecek!",
                "mevzuat_ref": ["KDVK 29", "7524 sayili Kanun Gecici Md."]
            })
            uyarilar.append(f"🔴 {devreden_ay_sayisi} aydir sureki devreden KDV - VDK risk senaryosu!")
            aksiyonlar.append("Devreden KDV nedenini belgeleyin, KDV iade talebi degerlendiirn")
        elif devreden_ay_sayisi >= 24:
            kontroller.append({
                "hesap_kodu": "190",
                "hesap_adi": "Devreden KDV",
                "kontrol_adi": "Uzun Sureli Devir",
                "deger": devreden_ay_sayisi,
                "esik_uyari": 24,
                "esik_kritik": 36,
                "durum": "UYARI",
                "risk_puani": 60,
                "aciklama": f"{devreden_ay_sayisi} aydir devreden KDV",
                "oneri": "36 aya yaklasiyorsunuz - VDK izlemede",
                "mevzuat_ref": ["KDVK 29"]
            })
            uyarilar.append(f"{devreden_ay_sayisi} aydir devreden KDV - 36 aya dikkat!")

        # Düşük KDV ödemesi kontrolü (Sektör ortalamasının altında)
        kdv_odemesi = data.get("kdv_odemesi", 0)
        ciro = data.get("ciro", 0)
        if ciro > 0 and kdv_odemesi < ciro * 0.005:  # Cironun %0.5'inden az
            # Eşikler: Yüzde olarak göster (daha anlaşılır)
            esik_uyari_yuzde = 0.5  # %0.5
            esik_kritik_yuzde = 0.1  # %0.1
            kdv_yuzde = (kdv_odemesi / ciro) * 100 if ciro > 0 else 0
            kontroller.append({
                "hesap_kodu": "190",
                "hesap_adi": "Devreden KDV",
                "kontrol_adi": "Düşük KDV Yükü",
                "deger": kdv_yuzde,  # Yüzde olarak göster
                "raw_bakiye": kdv_odemesi,  # Ham değer
                "esik_uyari": esik_uyari_yuzde,  # %0.5
                "esik_kritik": esik_kritik_yuzde,  # %0.1
                "durum": "UYARI",
                "risk_puani": 55,
                "aciklama": f"KDV ödemesi: {kdv_odemesi:,.0f} TL (Cironun %{kdv_yuzde:.2f}'i) - sektör ortalamasının altında",
                "oneri": "Sektör ortalamasının altında KDV yükü VDK tarafından inceleme sebebi sayılır (VDK Genelgesi Madde 3)",
                "mevzuat_ref": ["VDK Genelgesi 2025", "KDVK Md. 29"]
            })
            uyarilar.append("KDV yükü sektör ortalamasının altında - VDK KRG-15 senaryosu")

        # 191 INDIRILECEK KDV - E-Fatura uyumu
        indirilecek_kdv = data.get("hesaplar", {}).get("191", {}).get("bakiye", 0)
        efatura_kdv = data.get("efatura_kdv_toplami", 0)

        if indirilecek_kdv > 0 and efatura_kdv > 0:
            fark = abs(indirilecek_kdv - efatura_kdv)
            fark_orani = fark / indirilecek_kdv if indirilecek_kdv > 0 else 0

            if fark_orani > 0.05:  # %5'ten fazla fark
                kontroller.append({
                    "hesap_kodu": "191",
                    "hesap_adi": "Indirilecek KDV",
                    "kontrol_adi": "E-Fatura Uyumu",
                    "deger": fark_orani * 100,
                    "esik_uyari": 1,
                    "esik_kritik": 5,
                    "durum": "KRITIK",
                    "risk_puani": 85,
                    "aciklama": f"E-fatura toplami ile 191 hesap arasinda %{fark_orani*100:.1f} fark",
                    "oneri": "KURGAN KRG-10 riski - capraz kontrol yapin",
                    "mevzuat_ref": ["KDVK 29", "VUK 230"]
                })
                uyarilar.append(f"🔴 E-Fatura-Muhasebe uyumsuzlugu: %{fark_orani*100:.1f}")
                aksiyonlar.append("E-fatura kayitlarini kontrol edin, eksik/fazla kayitlari duzeltin")

        # Kategori ozet
        toplam_risk = sum(k["risk_puani"] for k in kontroller)
        ortalama_risk = toplam_risk // len(kontroller) if kontroller else 0

        return {
            "kategori_id": "kdv",
            "kategori_adi": "KDV",
            "toplam_risk": ortalama_risk,
            "kontroller": kontroller,
            "uyarilar": uyarilar,
            "aksiyonlar": aksiyonlar,
            "kritik_sayisi": sum(1 for k in kontroller if k["durum"] == "KRITIK"),
            "uyari_sayisi": sum(1 for k in kontroller if k["durum"] == "UYARI"),
            "normal_sayisi": sum(1 for k in kontroller if k["durum"] == "NORMAL")
        }

    def _analyze_ticari(self, data: Dict) -> Dict:
        """TICARI ALACAK/BORC kategorisi: 120, 128/129, 320"""
        kontroller = []
        uyarilar = []
        aksiyonlar = []

        # 120 ALICILAR - Yaslandirma
        alicilar = data.get("hesaplar", {}).get("120", {}).get("bakiye", 0)
        alici_yaslandirma = data.get("hesaplar", {}).get("120", {}).get("ortalama_gun", 0)

        if alici_yaslandirma >= self.ESIKLER["120_yaslandirma_kritik"]:
            kontroller.append({
                "hesap_kodu": "120",
                "hesap_adi": "Alicilar",
                "kontrol_adi": "Yaslandirma",
                "deger": alici_yaslandirma,
                "esik_uyari": 90,
                "esik_kritik": 180,
                "durum": "KRITIK",
                "risk_puani": 75,
                "aciklama": f"Ortalama tahsilat suresi: {alici_yaslandirma} gun (Esik: 180)",
                "oneri": "Supheli alacak karsiligi ayrilmali mi degerlendirin",
                "mevzuat_ref": ["VUK 323", "VUK 324"]
            })
            uyarilar.append(f"🔴 Alacak yaslandirmasi kritik: {alici_yaslandirma} gun")
            aksiyonlar.append("180+ gunluk alacaklar icin supheli alacak karsiligi degerlendirin")
        elif alici_yaslandirma >= self.ESIKLER["120_yaslandirma_uyari"]:
            kontroller.append({
                "hesap_kodu": "120",
                "hesap_adi": "Alicilar",
                "kontrol_adi": "Yaslandirma",
                "deger": alici_yaslandirma,
                "esik_uyari": 90,
                "esik_kritik": 180,
                "durum": "UYARI",
                "risk_puani": 50,
                "aciklama": f"Ortalama tahsilat suresi: {alici_yaslandirma} gun",
                "oneri": "Tahsilat takibini sikiltirin",
                "mevzuat_ref": ["VUK 323"]
            })
            uyarilar.append(f"Alacak yaslandirmasi yuksek: {alici_yaslandirma} gun")

        # 120 ALICILAR - Ters bakiye
        if alicilar < 0:  # Alacak bakiyesi (ters)
            kontroller.append({
                "hesap_kodu": "120",
                "hesap_adi": "Alicilar",
                "kontrol_adi": "Ters Bakiye",
                "deger": alicilar,
                "esik_uyari": 0,
                "esik_kritik": 0,
                "durum": "UYARI",
                "risk_puani": 45,
                "aciklama": f"Alicilar hesabi alacak bakiye veriyor: {alicilar:,.0f} TL",
                "oneri": "340 Alinan Avanslar hesabina virmanlayin",
                "mevzuat_ref": ["Tekduzen Hesap Plani"]
            })
            uyarilar.append("120 hesap ters bakiye - 340'a virmanlanmali")
            aksiyonlar.append("Alicilar hesabindaki alacak bakiyeyi 340'a virmanlayın")

        # 128/129 SUPHELI ALACAKLAR
        supheli_alacak = data.get("hesaplar", {}).get("128", {}).get("bakiye", 0)
        karsilik = data.get("hesaplar", {}).get("129", {}).get("bakiye", 0)

        if supheli_alacak > 0 and karsilik == 0:
            kontroller.append({
                "hesap_kodu": "128/129",
                "hesap_adi": "Supheli Alacaklar",
                "kontrol_adi": "Karsilik Ayrilmamis",
                "deger": supheli_alacak,
                "esik_uyari": 0,
                "esik_kritik": 0,
                "durum": "KRITIK",
                "risk_puani": 70,
                "aciklama": f"Supheli alacak var ({supheli_alacak:,.0f} TL) ama karsilik ayrilmamis!",
                "oneri": "ONEMLI: Suphelilik doneminde karsilik ayrilmazsa sonradan AYRILAMAZ!",
                "mevzuat_ref": ["VUK 323", "VUK 324"]
            })
            uyarilar.append("🔴 Supheli alacak var ama karsilik ayrilmamis!")
            aksiyonlar.append("ACIL: Supheli alacak karsiligini bu donem ayirin - sonra ayiramazsiniz")

        # 320 SATICILAR - Yaslandirma
        saticilar = data.get("hesaplar", {}).get("320", {}).get("bakiye", 0)
        satici_yaslandirma = data.get("hesaplar", {}).get("320", {}).get("ortalama_gun", 0)

        if satici_yaslandirma >= self.ESIKLER["320_yaslandirma_uyari"]:
            kontroller.append({
                "hesap_kodu": "320",
                "hesap_adi": "Saticilar",
                "kontrol_adi": "Yaslandirma",
                "deger": satici_yaslandirma,
                "esik_uyari": 90,
                "esik_kritik": 180,
                "durum": "UYARI" if satici_yaslandirma < 180 else "KRITIK",
                "risk_puani": 55 if satici_yaslandirma < 180 else 75,
                "aciklama": f"Ortalama odeme suresi: {satici_yaslandirma} gun",
                "oneri": "Uzun sureli satici borclari - fatura gercekligi sorgulanabilir (sahte fatura riski)",
                "mevzuat_ref": ["VUK 359", "KURGAN"]
            })
            uyarilar.append(f"Satici yaslandirmasi yuksek: {satici_yaslandirma} gun - sahte fatura riski")

        # 320 SATICILAR - Ters bakiye
        if saticilar < 0:  # Borc bakiyesi (ters)
            kontroller.append({
                "hesap_kodu": "320",
                "hesap_adi": "Saticilar",
                "kontrol_adi": "Ters Bakiye",
                "deger": saticilar,
                "esik_uyari": 0,
                "esik_kritik": 0,
                "durum": "UYARI",
                "risk_puani": 45,
                "aciklama": f"Saticilar hesabi borc bakiye veriyor: {saticilar:,.0f} TL",
                "oneri": "159 Verilen Siparis Avanslari hesabina virmanlayin",
                "mevzuat_ref": ["Tekduzen Hesap Plani"]
            })
            uyarilar.append("320 hesap ters bakiye - 159'a virmanlanmali")
            aksiyonlar.append("Saticilar hesabindaki borc bakiyeyi 159'a virmanlayin")

        # Tedarikci kontrolu
        riskli_tedarikci_sayisi = data.get("riskli_tedarikci_sayisi", 0)
        if riskli_tedarikci_sayisi > 0:
            kontroller.append({
                "hesap_kodu": "320",
                "hesap_adi": "Saticilar",
                "kontrol_adi": "Riskli Tedarikci",
                "deger": riskli_tedarikci_sayisi,
                "esik_uyari": 1,
                "esik_kritik": 3,
                "durum": "KRITIK" if riskli_tedarikci_sayisi >= 3 else "UYARI",
                "risk_puani": 90 if riskli_tedarikci_sayisi >= 3 else 70,
                "aciklama": f"{riskli_tedarikci_sayisi} adet riskli tedarikci tespit edildi",
                "oneri": "1 Ekim 2025 sonrasi 'bilmiyordum' savunmasi GECERSIZ! Tedarikci VKN kontrolu yapin.",
                "mevzuat_ref": ["VUK 359", "KURGAN KRG-01"],
                "kanitlar": [{"kaynak": "GIB Riskli Liste", "sayi": riskli_tedarikci_sayisi, "aciklama": "Tespit edilen riskli tedarikci sayisi"}]
            })
            uyarilar.append(f"🔴 {riskli_tedarikci_sayisi} riskli tedarikci - KURGAN riski!")
            aksiyonlar.append("Tedarikci mukellef sorgulama yapin, riskli olanlari degistirin")

        # KRİTİK: Hiç kontrol eklenmemişse, baseline kontrol ekle
        if not kontroller:
            _has_data = alicilar != 0 or saticilar != 0
            kontroller.append({
                "hesap_kodu": "120/320",
                "hesap_adi": "Ticari Alacak/Borc",
                "kontrol_adi": "Normal" if _has_data else "Genel Durum",
                "deger": 0,
                "esik_uyari": 0,
                "esik_kritik": 0,
                "durum": "NORMAL",
                "risk_puani": 0,
                "aciklama": "Ticari alacak/borc hesaplarinda risk tespit edilmedi" if _has_data else "Hesap verisi bulunamadi",
                "oneri": "Alicilar (120) ve Saticilar (320) hesaplari kontrol edildi, risk bulunmadi" if _has_data else "",
                "mevzuat_ref": ["VUK 323", "VUK 324", "Tekduzen Hesap Plani"],
                "kanitlar": [
                    {"hesap": "120", "bakiye": alicilar, "aciklama": "Alicilar hesap bakiyesi"},
                    {"hesap": "320", "bakiye": saticilar, "aciklama": "Saticilar hesap bakiyesi"}
                ]
            })

        # Kategori ozet
        toplam_risk = sum(k["risk_puani"] for k in kontroller)
        ortalama_risk = toplam_risk // len(kontroller) if kontroller else 0

        return {
            "kategori_id": "ticari",
            "kategori_adi": "Ticari Alacak/Borc",
            "toplam_risk": ortalama_risk,
            "kontroller": kontroller,
            "uyarilar": uyarilar,
            "aksiyonlar": aksiyonlar,
            "kritik_sayisi": sum(1 for k in kontroller if k["durum"] == "KRITIK"),
            "uyari_sayisi": sum(1 for k in kontroller if k["durum"] == "UYARI"),
            "normal_sayisi": sum(1 for k in kontroller if k["durum"] == "NORMAL")
        }

    def _analyze_vergi_sgk(self, data: Dict, sgk_data: Optional[Dict]) -> Dict:
        """VERGI/SGK kategorisi: 360, 361, 368"""
        kontroller = []
        uyarilar = []
        aksiyonlar = []

        # 361 ODENECEK SGK PRIMLERI
        odenecek_sgk = data.get("hesaplar", {}).get("361", {}).get("bakiye", 0)
        kkeg_sgk = data.get("kkeg", {}).get("sgk", 0)

        if odenecek_sgk > 0 and kkeg_sgk == 0:
            kontroller.append({
                "hesap_kodu": "361",
                "hesap_adi": "Odenecek SGK Primleri",
                "kontrol_adi": "KKEG Kontrolu",
                "deger": odenecek_sgk,
                "esik_uyari": 0,
                "esik_kritik": 0,
                "durum": "KRITIK",
                "risk_puani": 80,
                "aciklama": f"361'de {odenecek_sgk:,.0f} TL bakiye var ama KKEG'de SGK primi yok!",
                "oneri": "Odenmeyen SGK primleri (isci+isveren payi dahil) KKEG olarak dikkate alinmali",
                "mevzuat_ref": ["GVK 40", "KVK 8"]
            })
            uyarilar.append(f"🔴 361'de bakiye var ({odenecek_sgk:,.0f} TL) ama KKEG'de yok = HATA!")
            aksiyonlar.append("Odenmeyen SGK primlerini KKEG'e alin, 368'e virmanlayın")

        # 368 VADESI GECMIS - Virman kontrolu
        vadesi_gecmis = data.get("hesaplar", {}).get("368", {}).get("bakiye", 0)
        if odenecek_sgk > 0 and vadesi_gecmis == 0:
            kontroller.append({
                "hesap_kodu": "361/368",
                "hesap_adi": "SGK Primleri",
                "kontrol_adi": "Virman Kontrolu",
                "deger": odenecek_sgk,
                "esik_uyari": 0,
                "esik_kritik": 0,
                "durum": "UYARI",
                "risk_puani": 50,
                "aciklama": "Odenmeyen SGK primleri 368'e virmanlanmamis",
                "oneri": "361'den 368'e virman yapilmali",
                "mevzuat_ref": ["Tekduzen Hesap Plani"]
            })
            uyarilar.append("Odenmeyen SGK primleri 368'e virmanlanmali")
            aksiyonlar.append("361'den 368'e virman yapin")

        # 360 ODENECEK VERGI
        odenecek_vergi = data.get("hesaplar", {}).get("360", {}).get("bakiye", 0)
        beyan_vergi = data.get("beyan_vergi_toplami", 0)

        if odenecek_vergi > 0 and beyan_vergi > 0:
            fark = abs(odenecek_vergi - beyan_vergi)
            if fark > beyan_vergi * 0.05:  # %5'ten fazla fark
                kontroller.append({
                    "hesap_kodu": "360",
                    "hesap_adi": "Odenecek Vergi",
                    "kontrol_adi": "Beyan Uyumu",
                    "deger": fark,
                    "esik_uyari": beyan_vergi * 0.05,
                    "esik_kritik": beyan_vergi * 0.10,
                    "durum": "UYARI",
                    "risk_puani": 55,
                    "aciklama": f"360 hesap ile beyan arasinda {fark:,.0f} TL fark",
                    "oneri": "Beyanname-muhasebe mutabakati yapin",
                    "mevzuat_ref": ["VUK 134"]
                })
                uyarilar.append("Vergi hesabi ile beyan tutarsiz")

        # Kategori ozet
        toplam_risk = sum(k["risk_puani"] for k in kontroller)
        ortalama_risk = toplam_risk // len(kontroller) if kontroller else 0

        return {
            "kategori_id": "vergi_sgk",
            "kategori_adi": "Vergi/SGK",
            "toplam_risk": ortalama_risk,
            "kontroller": kontroller,
            "uyarilar": uyarilar,
            "aksiyonlar": aksiyonlar,
            "kritik_sayisi": sum(1 for k in kontroller if k["durum"] == "KRITIK"),
            "uyari_sayisi": sum(1 for k in kontroller if k["durum"] == "UYARI"),
            "normal_sayisi": sum(1 for k in kontroller if k["durum"] == "NORMAL")
        }

    def _analyze_sermaye(self, data: Dict) -> Dict:
        """SERMAYE/OZKAYNAK kategorisi: 500, 502/503, 540, 570/580, 522"""
        kontroller = []
        uyarilar = []
        aksiyonlar = []

        sermaye = data.get("hesaplar", {}).get("500", {}).get("bakiye", 0) or data.get("sermaye", 0)
        yasal_yedek = data.get("hesaplar", {}).get("540", {}).get("bakiye", 0)
        gecmis_yil_kar = data.get("hesaplar", {}).get("570", {}).get("bakiye", 0)
        gecmis_yil_zarar = data.get("hesaplar", {}).get("580", {}).get("bakiye", 0)
        ozkaynak = data.get("ozkaynak", 0)

        # 500 SERMAYE - TTK 376 kontrolu
        if sermaye > 0:
            sermaye_ve_yedek = sermaye + yasal_yedek
            sermaye_kaybi = sermaye_ve_yedek - ozkaynak
            kayip_orani = sermaye_kaybi / sermaye_ve_yedek if sermaye_ve_yedek > 0 else 0

            durum = "NORMAL"
            risk = 0
            aciklama = ""
            oneri = ""

            if ozkaynak < 0:  # Borca batik
                durum = "KRITIK"
                risk = 100
                aciklama = f"BORCA BATIK! Ozkaynaklar negatif: {ozkaynak:,.0f} TL"
                oneri = "ACIL: Mahkemeye bildirim zorunlu (TTK 376/3)"
                uyarilar.append("🔴 KRITIK: BORCA BATIK - Mahkemeye bildirim zorunlu!")
                aksiyonlar.append("ACIL: TTK 376/3 geregi mahkemeye bildirim yapin")
            elif kayip_orani >= 2/3:  # 2/3 kayip
                durum = "KRITIK"
                risk = 90
                aciklama = f"Sermayenin 2/3'u kaybedilmis: %{kayip_orani*100:.1f}"
                oneri = "Genel Kurul toplanmali, sermaye azaltimi/artirimi karari alinmali (TTK 376/2)"
                uyarilar.append(f"🔴 KRITIK: Sermayenin 2/3'u kayip (%{kayip_orani*100:.1f})")
                aksiyonlar.append("ACIL: Genel Kurul toplantisi icin cagri yapin")
            elif kayip_orani >= 1/2:  # 1/2 kayip
                durum = "UYARI"
                risk = 70
                aciklama = f"Sermayenin yarisi kaybedilmis: %{kayip_orani*100:.1f}"
                oneri = "Yonetim Kurulu toplanmali, iyilestirme onlemleri alinmali (TTK 376/1)"
                uyarilar.append(f"Sermayenin yarisi kayip (%{kayip_orani*100:.1f})")
                aksiyonlar.append("Yonetim Kurulu iyilestirme onlemleri karari almali")
            else:
                aciklama = f"Sermaye kaybi orani: %{kayip_orani*100:.1f} - Normal"
                oneri = "Takip edin"

            kontroller.append({
                "hesap_kodu": "500",
                "hesap_adi": "Sermaye",
                "kontrol_adi": "TTK 376 Sermaye Kaybi",
                "deger": kayip_orani * 100,
                "esik_uyari": 50,
                "esik_kritik": 66.67,
                "durum": durum,
                "risk_puani": risk,
                "aciklama": aciklama,
                "oneri": oneri,
                "mevzuat_ref": ["TTK 376"]
            })

        # 540 YASAL YEDEKLER - Birinci tertip kontrolu
        if sermaye > 0:
            gerekli_yedek = sermaye * 0.05  # %5
            if yasal_yedek < gerekli_yedek:
                kontroller.append({
                    "hesap_kodu": "540",
                    "hesap_adi": "Yasal Yedekler",
                    "kontrol_adi": "Birinci Tertip",
                    "deger": yasal_yedek,
                    "esik_uyari": gerekli_yedek,
                    "esik_kritik": gerekli_yedek,
                    "durum": "UYARI",
                    "risk_puani": 40,
                    "aciklama": f"Yasal yedek: {yasal_yedek:,.0f} TL, Gerekli: {gerekli_yedek:,.0f} TL",
                    "oneri": "Kar dagitiminda %5 birinci tertip yedek ayrilmali",
                    "mevzuat_ref": ["TTK 519"]
                })
                uyarilar.append("Yasal yedek akce yetersiz")

        # 502/503 ENFLASYON DUZELTMESI FARKLARI
        enflasyon_farki = data.get("hesaplar", {}).get("502", {}).get("bakiye", 0)
        if enflasyon_farki > 0:
            kontroller.append({
                "hesap_kodu": "502/503",
                "hesap_adi": "Enflasyon Duzeltmesi Farklari",
                "kontrol_adi": "Isletmeden Cekilme",
                "deger": enflasyon_farki,
                "esik_uyari": 0,
                "esik_kritik": 0,
                "durum": "NORMAL",
                "risk_puani": 20,
                "aciklama": f"Enflasyon farki: {enflasyon_farki:,.0f} TL",
                "oneri": "Isletmeden cekilirse: Kurumlar Vergisi (%25) + Kar Payi Stopaji (%15)",
                "mevzuat_ref": ["VUK Muk. 298/C", "KVK 5/1-g"]
            })

        # 522 YENIDEN DEGERLEME - Finansman gider kisitlamasi avantaji
        yeniden_degerleme = data.get("hesaplar", {}).get("522", {}).get("bakiye", 0)
        if yeniden_degerleme > 0:
            kontroller.append({
                "hesap_kodu": "522",
                "hesap_adi": "Yeniden Degerleme Artislari",
                "kontrol_adi": "Ozkaynak Guclendirme",
                "deger": yeniden_degerleme,
                "esik_uyari": 0,
                "esik_kritik": 0,
                "durum": "NORMAL",
                "risk_puani": 0,
                "aciklama": f"MDV yeniden degerleme artisi: {yeniden_degerleme:,.0f} TL",
                "oneri": "Finansman gider kisitlamasi hesabinda ozkaynagi arttirir - AVANTAJ",
                "mevzuat_ref": ["VUK Muk. 298/C"]
            })

        # Kategori ozet
        toplam_risk = sum(k["risk_puani"] for k in kontroller)
        ortalama_risk = toplam_risk // len(kontroller) if kontroller else 0

        return {
            "kategori_id": "sermaye",
            "kategori_adi": "Sermaye/Ozkaynak",
            "toplam_risk": ortalama_risk,
            "kontroller": kontroller,
            "uyarilar": uyarilar,
            "aksiyonlar": aksiyonlar,
            "kritik_sayisi": sum(1 for k in kontroller if k["durum"] == "KRITIK"),
            "uyari_sayisi": sum(1 for k in kontroller if k["durum"] == "UYARI"),
            "normal_sayisi": sum(1 for k in kontroller if k["durum"] == "NORMAL")
        }

    def _analyze_gelir_gider(self, data: Dict) -> Dict:
        """GELIR/GIDER kategorisi: 642, 689, 770"""
        kontroller = []
        uyarilar = []
        aksiyonlar = []

        # 642 FAIZ GELIRLERI - Adat karsiligi
        faiz_geliri = data.get("hesaplar", {}).get("642", {}).get("bakiye", 0)
        ortaklardan_alacak = data.get("hesaplar", {}).get("131", {}).get("bakiye", 0)
        kasa_bakiye = data.get("hesaplar", {}).get("100", {}).get("bakiye", 0)

        # Adat gerektiren durumlar
        adat_gereken = ortaklardan_alacak > 100000 or kasa_bakiye > 500000

        if adat_gereken and faiz_geliri == 0:
            kontroller.append({
                "hesap_kodu": "642",
                "hesap_adi": "Faiz Gelirleri",
                "kontrol_adi": "Adat Geliri",
                "deger": 0,
                "esik_uyari": 1,
                "esik_kritik": 1,
                "durum": "KRITIK",
                "risk_puani": 75,
                "aciklama": "Yuksek kasa/131 bakiyesi var ama 642'de faiz geliri yok",
                "oneri": "Adat faizi hesaplayin (TCMB faiz orani) ve 642'de gosterin",
                "mevzuat_ref": ["KVK 13", "VUK 267"]
            })
            uyarilar.append("🔴 Adat faizi hesaplanmamis - 642'de gelir yok!")
            aksiyonlar.append("Kasa ve 131 icin adat hesaplayin, 642'de kaydedin")

        # 689 OLAGAN DISI GIDER - KKEG kontrolu
        bagis = data.get("bagis_tutari", 0)
        kkeg_bagis = data.get("kkeg", {}).get("bagis", 0)

        if bagis > 0 and kkeg_bagis == 0:
            kontroller.append({
                "hesap_kodu": "689",
                "hesap_adi": "Diger Olagandisi Gider",
                "kontrol_adi": "Bagis KKEG",
                "deger": bagis,
                "esik_uyari": 0,
                "esik_kritik": 0,
                "durum": "UYARI",
                "risk_puani": 50,
                "aciklama": f"Bagis/yardim var ({bagis:,.0f} TL) ama KKEG'de gosterilmemis",
                "oneri": "Beyannamede indirim yapildiysa KKEG'de de gosterilmeli",
                "mevzuat_ref": ["KVK 10/1-c", "GVK 89"]
            })
            uyarilar.append("Bagis KKEG'de gosterilmemis")

        # 770 GENEL YONETIM - Binek arac kisitlamasi
        binek_gideri = data.get("binek_arac_gideri", 0)
        binek_kkeg = data.get("kkeg", {}).get("binek_arac", 0)

        if binek_gideri > 0:
            gerekli_kkeg = binek_gideri * 0.30  # %30 kisitlama (2024 sonrasi %70 indirim)
            if binek_kkeg < gerekli_kkeg * 0.9:  # %10 tolerans
                kontroller.append({
                    "hesap_kodu": "770",
                    "hesap_adi": "Genel Yonetim Giderleri",
                    "kontrol_adi": "Binek Arac Kisitlamasi",
                    "deger": binek_gideri,
                    "esik_uyari": 0,
                    "esik_kritik": 0,
                    "durum": "UYARI",
                    "risk_puani": 45,
                    "aciklama": f"Binek arac gideri: {binek_gideri:,.0f} TL, KKEG olmali: {gerekli_kkeg:,.0f} TL",
                    "oneri": "Binek arac giderlerinin %30'u KKEG'e alinmali",
                    "mevzuat_ref": ["GVK 40/5", "KVK 11"],
                    "kanitlar": [{"hesap": "770", "bakiye": binek_gideri, "aciklama": "Binek arac gideri"}]
                })
                uyarilar.append("Binek arac gider kisitlamasi eksik")

        # KRİTİK: Hiç kontrol eklenmemişse, baseline kontrol ekle
        if not kontroller:
            # Gelir tablosu hesaplarını al
            satis_gelirleri = data.get("hesaplar", {}).get("600", {}).get("bakiye", 0)
            smm = data.get("hesaplar", {}).get("620", {}).get("bakiye", 0)
            _has_data = faiz_geliri != 0 or satis_gelirleri != 0 or smm != 0

            kontroller.append({
                "hesap_kodu": "6xx",
                "hesap_adi": "Gelir/Gider Hesaplari",
                "kontrol_adi": "Normal" if _has_data else "Genel Durum",
                "deger": 0,
                "esik_uyari": 0,
                "esik_kritik": 0,
                "durum": "NORMAL",
                "risk_puani": 0,
                "aciklama": "Gelir/gider hesaplarinda risk tespit edilmedi" if _has_data else "Hesap verisi bulunamadi",
                "oneri": "Faiz geliri (642), olagandisi giderler (689) ve genel yonetim (770) kontrol edildi" if _has_data else "",
                "mevzuat_ref": ["KVK 13", "GVK 40", "VUK 267"],
                "kanitlar": [
                    {"hesap": "642", "bakiye": faiz_geliri, "aciklama": "Faiz Gelirleri"},
                    {"hesap": "600", "bakiye": satis_gelirleri, "aciklama": "Yurtici Satislar"},
                    {"hesap": "620", "bakiye": smm, "aciklama": "Satilan Malin Maliyeti"}
                ]
            })

        # Kategori ozet
        toplam_risk = sum(k["risk_puani"] for k in kontroller)
        ortalama_risk = toplam_risk // len(kontroller) if kontroller else 0

        return {
            "kategori_id": "gelir_gider",
            "kategori_adi": "Gelir/Gider",
            "toplam_risk": ortalama_risk,
            "kontroller": kontroller,
            "uyarilar": uyarilar,
            "aksiyonlar": aksiyonlar,
            "kritik_sayisi": sum(1 for k in kontroller if k["durum"] == "KRITIK"),
            "uyari_sayisi": sum(1 for k in kontroller if k["durum"] == "UYARI"),
            "normal_sayisi": sum(1 for k in kontroller if k["durum"] == "NORMAL")
        }

    def _analyze_stok(self, data: Dict) -> Dict:
        """STOK kategorisi: 153, 157"""
        kontroller = []
        uyarilar = []
        aksiyonlar = []

        # 153 TICARI MALLAR - Devir hizi
        stok_bakiye = data.get("hesaplar", {}).get("153", {}).get("bakiye", 0)
        stok_devir_gunu = data.get("hesaplar", {}).get("153", {}).get("devir_gunu", 0)

        if stok_devir_gunu >= self.ESIKLER["153_devir_uyari"]:
            kontroller.append({
                "hesap_kodu": "153",
                "hesap_adi": "Ticari Mallar",
                "kontrol_adi": "Devir Hizi",
                "deger": stok_devir_gunu,
                "esik_uyari": 180,
                "esik_kritik": 360,
                "durum": "UYARI" if stok_devir_gunu < 360 else "KRITIK",
                "risk_puani": 50 if stok_devir_gunu < 360 else 70,
                "aciklama": f"Stok devir hizi: {stok_devir_gunu} gun - atil stok riski",
                "oneri": "Stok sayimi yapin, degerlemesi dusurulmesi gereken mallar var mi kontrol edin",
                "mevzuat_ref": ["VUK 274", "VUK 278"]
            })
            uyarilar.append(f"Stok devir hizi dusuk: {stok_devir_gunu} gun")

        # 153 TICARI MALLAR - Stok-Satis uyumu (KURGAN KRG-04)
        satis_tutari = data.get("satis_tutari", 0)
        satis_maliyeti = data.get("satis_maliyeti", 0)

        if stok_bakiye > 0 and satis_maliyeti > 0:
            stok_satis_orani = stok_bakiye / satis_maliyeti
            if stok_satis_orani > 2:  # Stok, yillik satis maliyetinin 2 kati
                kontroller.append({
                    "hesap_kodu": "153",
                    "hesap_adi": "Ticari Mallar",
                    "kontrol_adi": "Stok-Satis Uyumu",
                    "deger": stok_satis_orani,
                    "esik_uyari": 1.5,
                    "esik_kritik": 2,
                    "durum": "KRITIK",
                    "risk_puani": 80,
                    "aciklama": f"Stok, satis maliyetinin {stok_satis_orani:.1f} kati - KURGAN KRG-04 riski",
                    "oneri": "Stok-satis uyumsuzlugu VDK icin oncelikli risk senaryosu",
                    "mevzuat_ref": ["KURGAN KRG-04", "VUK 134"]
                })
                uyarilar.append(f"🔴 Stok-satis uyumsuzlugu - KURGAN KRG-04 riski!")
                aksiyonlar.append("Stok hareketlerini belgeleyin, fiziki sayim yapin")

        # 157 DIGER STOKLAR - Fire/zayiat
        fire_orani = data.get("fire_orani", 0)
        if fire_orani > 0.02:  # %2'den fazla
            kontroller.append({
                "hesap_kodu": "157",
                "hesap_adi": "Diger Stoklar",
                "kontrol_adi": "Fire/Zayiat",
                "deger": fire_orani * 100,
                "esik_uyari": 2,
                "esik_kritik": 5,
                "durum": "UYARI" if fire_orani < 0.05 else "KRITIK",
                "risk_puani": 45 if fire_orani < 0.05 else 65,
                "aciklama": f"Fire/zayiat orani: %{fire_orani*100:.2f}",
                "oneri": "Fire tutanagi duzenlenmeli, takdir komisyonuna basvuru gerekebilir",
                "mevzuat_ref": ["VUK 278", "VUK 267"],
                "kanitlar": [{"kaynak": "Hesaplama", "oran": fire_orani * 100, "aciklama": "Fire/zayiat orani yuzde"}]
            })
            uyarilar.append(f"Fire orani yuksek: %{fire_orani*100:.2f}")

        # KRİTİK: Hiç kontrol eklenmemişse, baseline kontrol ekle
        if not kontroller:
            # Stok hesaplarını al
            stok_150 = data.get("hesaplar", {}).get("150", {}).get("bakiye", 0)
            stok_151 = data.get("hesaplar", {}).get("151", {}).get("bakiye", 0)
            stok_152 = data.get("hesaplar", {}).get("152", {}).get("bakiye", 0)
            stok_153 = data.get("hesaplar", {}).get("153", {}).get("bakiye", 0)
            stok_157 = data.get("hesaplar", {}).get("157", {}).get("bakiye", 0)
            toplam_stok = stok_150 + stok_151 + stok_152 + stok_153 + stok_157
            _has_data = toplam_stok != 0

            kontroller.append({
                "hesap_kodu": "15x",
                "hesap_adi": "Stok Hesaplari",
                "kontrol_adi": "Normal" if _has_data else "Genel Durum",
                "deger": toplam_stok,
                "esik_uyari": 0,
                "esik_kritik": 0,
                "durum": "NORMAL",
                "risk_puani": 0,
                "aciklama": f"Stok hesaplarinda risk tespit edilmedi. Toplam stok: {toplam_stok:,.0f} TL" if _has_data else "Hesap verisi bulunamadi",
                "oneri": "Ticari mallar (153), hammadde (150), yari mamul (151) ve mamul (152) kontrol edildi" if _has_data else "",
                "mevzuat_ref": ["VUK 274", "VUK 278", "KURGAN KRG-04"],
                "kanitlar": [
                    {"hesap": "150", "bakiye": stok_150, "aciklama": "Ilk Madde ve Malzeme"},
                    {"hesap": "151", "bakiye": stok_151, "aciklama": "Yari Mamuller"},
                    {"hesap": "152", "bakiye": stok_152, "aciklama": "Mamuller"},
                    {"hesap": "153", "bakiye": stok_153, "aciklama": "Ticari Mallar"},
                    {"hesap": "157", "bakiye": stok_157, "aciklama": "Diger Stoklar"}
                ]
            })

        # Kategori ozet
        toplam_risk = sum(k["risk_puani"] for k in kontroller)
        ortalama_risk = toplam_risk // len(kontroller) if kontroller else 0

        return {
            "kategori_id": "stok",
            "kategori_adi": "Stok",
            "toplam_risk": ortalama_risk,
            "kontroller": kontroller,
            "uyarilar": uyarilar,
            "aksiyonlar": aksiyonlar,
            "kritik_sayisi": sum(1 for k in kontroller if k["durum"] == "KRITIK"),
            "uyari_sayisi": sum(1 for k in kontroller if k["durum"] == "UYARI"),
            "normal_sayisi": sum(1 for k in kontroller if k["durum"] == "NORMAL")
        }

    def _analyze_duran_varlik(self, data: Dict) -> Dict:
        """DURAN VARLIK kategorisi: 254/255/260, 257"""
        kontroller = []
        uyarilar = []
        aksiyonlar = []

        # Dogrudan gider haddi kontrolu
        donem_sabit_kiymet_alimi = data.get("donem_sabit_kiymet_alimi", [])
        haddi = self.ESIKLER["dogrudan_gider_haddi_2026"]

        for alim in donem_sabit_kiymet_alimi:
            tutar = alim.get("tutar", 0)
            kayit_sekli = alim.get("kayit_sekli", "")  # "amortisman" veya "gider"

            if tutar <= haddi and kayit_sekli == "amortisman":
                kontroller.append({
                    "hesap_kodu": "254/255/260",
                    "hesap_adi": "Sabit Kiymetler",
                    "kontrol_adi": "Dogrudan Gider Haddi",
                    "deger": tutar,
                    "esik_uyari": haddi,
                    "esik_kritik": haddi,
                    "durum": "UYARI",
                    "risk_puani": 30,
                    "aciklama": f"{tutar:,.0f} TL amortisman kaydi yapilmis, dogrudan gider yazilabilirdi (2026 haddi: 12.000 TL)",
                    "oneri": "2026 yili icin 12.000 TL altindaki sabit kiymetler dogrudan gider yazilabilir",
                    "mevzuat_ref": ["VUK 313"]
                })

        # 257 BIRIKMIS AMORTISMANLAR - Ayrilmamis amortisman
        duran_varlik_toplam = data.get("duran_varlik_toplam", 0)
        birikmis_amortisman = data.get("hesaplar", {}).get("257", {}).get("bakiye", 0)
        yillik_amortisman = data.get("yillik_amortisman_gideri", 0)
        beklenen_amortisman = data.get("beklenen_amortisman", 0)

        if beklenen_amortisman > 0 and yillik_amortisman < beklenen_amortisman * 0.9:
            kontroller.append({
                "hesap_kodu": "257",
                "hesap_adi": "Birikmis Amortismanlar",
                "kontrol_adi": "Yillik Amortisman",
                "deger": yillik_amortisman,
                "esik_uyari": beklenen_amortisman * 0.9,
                "esik_kritik": beklenen_amortisman * 0.5,
                "durum": "UYARI",
                "risk_puani": 55,
                "aciklama": f"Bu yil ayrilan: {yillik_amortisman:,.0f} TL, Beklenen: {beklenen_amortisman:,.0f} TL",
                "oneri": "ONEMLI: Ayrilmayan amortisman sonraki yillarda AYRILAMAZ!",
                "mevzuat_ref": ["VUK 315", "VUK 320"],
                "kanitlar": [
                    {"hesap": "257", "bakiye": birikmis_amortisman, "aciklama": "Birikmis Amortismanlar"},
                    {"kaynak": "Hesaplama", "yillik": yillik_amortisman, "beklenen": beklenen_amortisman, "aciklama": "Yillik amortisman karsilastirmasi"}
                ]
            })
            uyarilar.append("Amortisman eksik ayrilmis - sonra AYRILAMAZ!")
            aksiyonlar.append("Eksik amortismanlari bu donem ayirin")

        # KRİTİK: Hiç kontrol eklenmemişse, baseline kontrol ekle
        if not kontroller:
            # Duran varlik hesaplarini al
            arazi = data.get("hesaplar", {}).get("250", {}).get("bakiye", 0)
            bina = data.get("hesaplar", {}).get("252", {}).get("bakiye", 0)
            tesis = data.get("hesaplar", {}).get("253", {}).get("bakiye", 0)
            makine = data.get("hesaplar", {}).get("254", {}).get("bakiye", 0)
            tasit = data.get("hesaplar", {}).get("255", {}).get("bakiye", 0)
            demirbaslar = data.get("hesaplar", {}).get("256", {}).get("bakiye", 0)
            yapilmakta_olan = data.get("hesaplar", {}).get("258", {}).get("bakiye", 0)
            toplam_duran = arazi + bina + tesis + makine + tasit + demirbaslar + yapilmakta_olan
            _has_data = toplam_duran != 0 or birikmis_amortisman != 0

            kontroller.append({
                "hesap_kodu": "25x",
                "hesap_adi": "Duran Varlik Hesaplari",
                "kontrol_adi": "Normal" if _has_data else "Genel Durum",
                "deger": toplam_duran,
                "esik_uyari": 0,
                "esik_kritik": 0,
                "durum": "NORMAL",
                "risk_puani": 0,
                "aciklama": f"Duran varlik hesaplarinda risk tespit edilmedi. Toplam: {toplam_duran:,.0f} TL" if _has_data else "Hesap verisi bulunamadi",
                "oneri": "Maddi duran varliklar (25x) ve birikmis amortismanlar (257) kontrol edildi" if _has_data else "",
                "mevzuat_ref": ["VUK 313", "VUK 315", "VUK 320"],
                "kanitlar": [
                    {"hesap": "250", "bakiye": arazi, "aciklama": "Arazi ve Arsalar"},
                    {"hesap": "252", "bakiye": bina, "aciklama": "Binalar"},
                    {"hesap": "253", "bakiye": tesis, "aciklama": "Tesis, Makine ve Cihazlar"},
                    {"hesap": "254", "bakiye": makine, "aciklama": "Tasitlar"},
                    {"hesap": "255", "bakiye": tasit, "aciklama": "Demirbaslar"},
                    {"hesap": "256", "bakiye": demirbaslar, "aciklama": "Diger Maddi Duran Varliklar"},
                    {"hesap": "257", "bakiye": birikmis_amortisman, "aciklama": "Birikmis Amortismanlar (-)"},
                    {"hesap": "258", "bakiye": yapilmakta_olan, "aciklama": "Yapilmakta Olan Yatirimlar"}
                ]
            })

        # Kategori ozet
        toplam_risk = sum(k["risk_puani"] for k in kontroller)
        ortalama_risk = toplam_risk // len(kontroller) if kontroller else 0

        return {
            "kategori_id": "duran_varlik",
            "kategori_adi": "Duran Varlik",
            "toplam_risk": ortalama_risk,
            "kontroller": kontroller,
            "uyarilar": uyarilar,
            "aksiyonlar": aksiyonlar,
            "kritik_sayisi": sum(1 for k in kontroller if k["durum"] == "KRITIK"),
            "uyari_sayisi": sum(1 for k in kontroller if k["durum"] == "UYARI"),
            "normal_sayisi": sum(1 for k in kontroller if k["durum"] == "NORMAL")
        }

    # =========================================================================
    # KURGAN SENARYO KONTROLLERI
    # =========================================================================

    def _check_kurgan_scenarios(self, data: Dict, category_analysis: Dict) -> List[Dict]:
        """
        16 KURGAN senaryosunu kontrol et

        KRİTİK: Her senaryo için ya tetikleme ya da "kontrol edildi, risk yok" bilgisi dönmeli.
        SMMM için: "Geçti" diyen senaryolar neden geçtiğini açıklamalı.
        """
        scenarios = []
        hesaplar = data.get("hesaplar", {})

        for kod, info in KURGAN_SENARYOLARI.items():
            senaryo = {
                "senaryo_id": kod,
                "senaryo_adi": info["ad"],
                "risk_puani": info["risk"],
                "aksiyon": info["aksiyon"],
                "sure": info["sure"],
                "tetiklendi": False,
                "tetikleme_nedeni": None,
                "oneriler": [],
                "kontrol_detayi": None,  # KRİTİK: Kontrol edildi mi, hangi veriye bakıldı?
                "kanitlar": []  # Kanıt bilgileri
            }

            # =========================================================================
            # KRG-01: RİSKLİ SATICI (GİB Listesi)
            # =========================================================================
            if kod == "KRG-01":
                riskli_tedarikci = data.get("riskli_tedarikci_sayisi", 0)
                toplam_tedarikci = data.get("toplam_tedarikci_sayisi", 0)

                # GİB Servisi ile otomatik sorgulama (tedarikçi VKN listesi varsa)
                tedarikci_vkn_listesi = data.get("tedarikci_vkn_listesi", [])
                if self.gib_service and tedarikci_vkn_listesi:
                    gib_analiz = self.gib_service.analiz_tedarikci_riski(tedarikci_vkn_listesi)
                    riskli_tedarikci = gib_analiz.get("riskli_tedarikci_sayisi", 0)
                    toplam_tedarikci = gib_analiz.get("toplam_tedarikci", len(tedarikci_vkn_listesi))

                    if riskli_tedarikci > 0:
                        senaryo["tetiklendi"] = True
                        senaryo["tetikleme_nedeni"] = f"{riskli_tedarikci} riskli tedarikçi tespit edildi (toplam {toplam_tedarikci} tedarikçiden)"
                        senaryo["oneriler"] = gib_analiz.get("oneriler", [])
                        senaryo["kanitlar"] = [
                            {"kaynak": "GİB Risk Servisi", "riskli_sayı": riskli_tedarikci, "toplam_sayı": toplam_tedarikci},
                            {"detaylar": gib_analiz.get("detaylar", [])}
                        ]
                    else:
                        senaryo["kontrol_detayi"] = f"GİB Risk Servisi ile {toplam_tedarikci} tedarikçi sorgulandı. Riskli tedarikçi bulunamadı."
                        senaryo["kanitlar"] = [{"kaynak": "GİB Risk Servisi", "tarih": gib_analiz.get("sorgu_tarihi"), "sonuç": "Risk yok"}]
                elif riskli_tedarikci > 0:
                    senaryo["tetiklendi"] = True
                    senaryo["tetikleme_nedeni"] = f"{riskli_tedarikci} riskli tedarikçi tespit edildi (toplam {toplam_tedarikci} tedarikçiden)"
                    senaryo["oneriler"] = [
                        "Tedarikçi VKN sorgulama yapın (GİB e-Belge portalı)",
                        "Riskli tedarikçilerle işlemleri belgeleyin",
                        "1 Ekim 2025 sonrası 'bilmiyordum' savunması GEÇERSİZ!"
                    ]
                    senaryo["kanitlar"] = [
                        {"kaynak": "Yüklenen Veri", "riskli_sayı": riskli_tedarikci, "toplam_sayı": toplam_tedarikci}
                    ]
                else:
                    senaryo["kontrol_detayi"] = "KRG-01 kontrolü için tedarikçi VKN listesi gerekli. E-fatura/e-arşiv verisi yüklendiğinde otomatik sorgulanır."
                    senaryo["kanitlar"] = [{"kaynak": "Sistem", "not": "Tedarikçi VKN listesi yüklenmedi"}]

            # =========================================================================
            # KRG-02: ZİNCİRLEME RİSKLİ ALIM
            # =========================================================================
            elif kod == "KRG-02":
                zincirleme_risk = data.get("zincirleme_riskli_alim", 0)

                # GİB Servisi ile zincirleme risk kontrolü
                tedarikci_vkn_listesi = data.get("tedarikci_vkn_listesi", [])
                if self.gib_service and tedarikci_vkn_listesi:
                    gib_analiz = self.gib_service.analiz_tedarikci_riski(tedarikci_vkn_listesi)
                    zincirleme_var = gib_analiz.get("zincirleme_risk_var", False)

                    if zincirleme_var:
                        senaryo["tetiklendi"] = True
                        riskli_sayisi = gib_analiz.get("riskli_tedarikci_sayisi", 0)
                        senaryo["tetikleme_nedeni"] = f"Zincirleme riskli alım tespit edildi: {riskli_sayisi} riskli tedarikçi"
                        senaryo["oneriler"] = gib_analiz.get("oneriler", [
                            "Tedarikçi zincirini kontrol edin",
                            "Tedarikçi araştırması yapın"
                        ])
                        senaryo["kanitlar"] = [
                            {"kaynak": "GİB Risk Servisi", "zincirleme_risk": True},
                            {"detaylar": gib_analiz.get("detaylar", [])}
                        ]
                    else:
                        senaryo["kontrol_detayi"] = f"GİB Risk Servisi ile zincirleme risk kontrolü yapıldı. {len(tedarikci_vkn_listesi)} tedarikçi incelendi, zincirleme risk tespit edilmedi."
                        senaryo["kanitlar"] = [{"kaynak": "GİB Risk Servisi", "sonuç": "Zincirleme risk yok"}]
                elif zincirleme_risk > 0:
                    senaryo["tetiklendi"] = True
                    senaryo["tetikleme_nedeni"] = f"Zincirleme riskli alım tespit edildi: {zincirleme_risk:,.0f} TL"
                    senaryo["oneriler"] = [
                        "Tedarikçi zincirini kontrol edin",
                        "Tedarikçi araştırması yapın",
                        "Fatura içerikleri ile sevkiyatı eşleştirin"
                    ]
                else:
                    senaryo["kontrol_detayi"] = "KRG-02 kontrolü için tedarikçi VKN listesi gerekli. E-fatura verisi yüklendiğinde otomatik analiz yapılır."
                    senaryo["kanitlar"] = [{"kaynak": "Sistem", "not": "Tedarikçi zinciri verisi yüklenmedi"}]

            # =========================================================================
            # KRG-03: MAL/HİZMET AKIŞI TUTARSIZLIĞI
            # =========================================================================
            elif kod == "KRG-03":
                # Fatura vs Stok Hareketi karsilastirmasi
                fatura_mal_tutari = data.get("fatura_mal_toplami", 0)
                stok_giris_tutari = data.get("stok_giris_toplami", 0)

                if fatura_mal_tutari > 0 and stok_giris_tutari > 0:
                    fark = abs(fatura_mal_tutari - stok_giris_tutari)
                    fark_orani = fark / fatura_mal_tutari if fatura_mal_tutari > 0 else 0

                    if fark_orani > 0.15:  # %15'ten fazla fark
                        senaryo["tetiklendi"] = True
                        senaryo["tetikleme_nedeni"] = f"Fatura-stok farkı: %{fark_orani*100:.1f} (Fatura: {fatura_mal_tutari:,.0f} TL, Stok Girişi: {stok_giris_tutari:,.0f} TL)"
                        senaryo["oneriler"] = [
                            "Fatura ve irsaliyeleri karşılaştırın",
                            "Stok hareketlerini kontrol edin",
                            "Eksik girişleri tamamlayın"
                        ]
                        senaryo["kanitlar"] = [
                            {"kaynak": "Fatura", "tutar": fatura_mal_tutari},
                            {"kaynak": "Stok Girişi", "tutar": stok_giris_tutari},
                            {"fark_oranı": f"%{fark_orani*100:.1f}"}
                        ]
                    else:
                        senaryo["kontrol_detayi"] = f"Fatura-stok eşlemesi yapıldı. Fark: %{fark_orani*100:.1f} (kabul edilebilir)"
                else:
                    senaryo["kontrol_detayi"] = "Mal/hizmet akışı kontrolü için fatura ve stok verisi gerekli. Veri yüklenmemiş."
                    senaryo["kanitlar"] = [{"kaynak": "Sistem", "not": "Fatura veya stok verisi eksik"}]

            # =========================================================================
            # KRG-04: STOK-SATIŞ UYUMSUZLUĞU
            # =========================================================================
            elif kod == "KRG-04":
                stok_kontrol = category_analysis.get("stok", {}).get("kontroller", [])
                stok_bakiye = abs(hesaplar.get("153", {}).get("bakiye", 0) or 0)
                satis_maliyeti = abs(data.get("satis_maliyeti", 0) or 0)

                # Sektör stok devir hızı tahminleri (NACE grubu bazlı)
                # Kaynak: TÜİK Sektörel Verimlilik İstatistikleri
                nace_kodu = data.get("nace_kodu", data.get("faaliyet_kodu", ""))

                # NACE grubu bazlı stok devir hızı tahminleri
                SEKTOR_STOK_DEVIR = {
                    "G": 6.0,   # Toptan ve Perakende Ticaret
                    "C": 4.0,   # İmalat
                    "F": 3.0,   # İnşaat
                    "I": 12.0,  # Konaklama ve Yiyecek
                    "H": 8.0,   # Ulaştırma
                }

                # NACE kodunun ilk harfini al (ana grup)
                nace_grup = nace_kodu[0].upper() if nace_kodu else "G"
                sektor_stok_devir = SEKTOR_STOK_DEVIR.get(nace_grup, 4.0)
                sektor_stok_smm_orani = 1 / sektor_stok_devir if sektor_stok_devir > 0 else 0.5
                veri_kaynagi = f"TÜİK Sektörel Tahmin ({nace_grup})"

                triggered = False
                stok_smm_orani = stok_bakiye / satis_maliyeti if satis_maliyeti > 0 else 0
                esik_oran = 2.0  # Stok/SMM > 2 ise kritik

                for k in stok_kontrol:
                    if k.get("kontrol_adi") == "Stok-Satis Uyumu" and k.get("durum") == "KRITIK":
                        triggered = True

                if stok_smm_orani > esik_oran or triggered:
                    senaryo["tetiklendi"] = True
                    senaryo["tetikleme_nedeni"] = f"Stok bakiyesi satış maliyetinin {stok_smm_orani:.1f} katı (Eşik: {esik_oran}x, Sektör Ortalaması: {sektor_stok_smm_orani:.2f}x)"
                    senaryo["oneriler"] = [
                        "Fiziki stok sayımı yapın",
                        "Stok hareketlerini belgeleyin",
                        "Fire/zayiat varsa tutanak düzenlenmeli"
                    ]
                    senaryo["kanitlar"] = [
                        {
                            "kaynak": "Mizan - Ticari Mallar (Hs. 153)",
                            "tutar": stok_bakiye,
                            "aciklama": "Dönem sonu stok bakiyesi"
                        },
                        {
                            "kaynak": "Mizan - Satılan Malın Maliyeti (Hs. 620)",
                            "tutar": satis_maliyeti,
                            "aciklama": "Dönem içi satış maliyeti"
                        },
                        {
                            "kaynak": f"GİB Sektör Ortalaması ({veri_kaynagi})",
                            "oran": f"{sektor_stok_smm_orani:.2f}x",
                            "aciklama": f"Sektör normal Stok/SMM oranı"
                        },
                        {
                            "kaynak": "Hesaplanan Oran",
                            "oran": f"{stok_smm_orani:.2f}x",
                            "esik": f"{esik_oran}x",
                            "durum": "EŞİK AŞILDI" if stok_smm_orani > esik_oran else "NORMAL"
                        }
                    ]

                if not senaryo["tetiklendi"]:
                    if satis_maliyeti > 0:
                        senaryo["kontrol_detayi"] = f"Stok/SMM oranı: {stok_smm_orani:.2f}x (Sektör Ortalaması: {sektor_stok_smm_orani:.2f}x, Eşik: {esik_oran}x)"
                        senaryo["kanitlar"] = [
                            {"kaynak": "Mizan - Ticari Mallar (Hs. 153)", "tutar": stok_bakiye},
                            {"kaynak": "Mizan - SMM (Hs. 620)", "tutar": satis_maliyeti},
                            {"kaynak": "Hesaplanan Oran", "oran": f"{stok_smm_orani:.2f}x", "durum": "NORMAL"}
                        ]
                    else:
                        senaryo["kontrol_detayi"] = "Stok-satış uyumu kontrolü için SMM (620) verisi gerekli."
                        senaryo["kanitlar"] = [{"kaynak": "Mizan - Veri Eksik", "not": "SMM (620) hesabı boş"}]

            # =========================================================================
            # KRG-05: SEVK BELGESİ EKSİKLİĞİ
            # =========================================================================
            elif kod == "KRG-05":
                fatura_adet = data.get("fatura_adet", 0)
                irsaliye_adet = data.get("irsaliye_adet", 0)

                if fatura_adet > 0 and irsaliye_adet > 0:
                    eslesme_orani = irsaliye_adet / fatura_adet if fatura_adet > 0 else 0

                    if eslesme_orani < 0.9:  # %90'dan az eşleşmiş
                        senaryo["tetiklendi"] = True
                        senaryo["tetikleme_nedeni"] = f"Fatura-irsaliye eşleşme oranı düşük: %{eslesme_orani*100:.1f}"
                        senaryo["oneriler"] = [
                            "Eksik irsaliyeleri kontrol edin",
                            "e-İrsaliye sistemini kullanın",
                            "Sevkiyat kayıtlarını düzenleyin"
                        ]
                        senaryo["kanitlar"] = [
                            {"kaynak": "Fatura", "adet": fatura_adet},
                            {"kaynak": "İrsaliye", "adet": irsaliye_adet},
                            {"eşleşme": f"%{eslesme_orani*100:.1f}"}
                        ]
                    else:
                        senaryo["kontrol_detayi"] = f"Fatura-irsaliye eşleşme oranı: %{eslesme_orani*100:.1f} (Yeterli)"
                else:
                    senaryo["kontrol_detayi"] = "Sevk belgesi kontrolü için fatura ve irsaliye verileri gerekli."
                    senaryo["kanitlar"] = [{"kaynak": "Sistem", "not": "Fatura/irsaliye verisi yüklenmedi"}]

            # =========================================================================
            # KRG-06: ÖDEME YÖNTEMİ UYUMSUZLUĞU
            # =========================================================================
            elif kod == "KRG-06":
                # Büyük tutarlı nakit ödemeleri kontrol et
                nakit_odeme = hesaplar.get("100", {}).get("alacak_toplam", 0)  # Kasadan çıkan
                banka_odeme = hesaplar.get("102", {}).get("alacak_toplam", 0)  # Bankadan çıkan
                toplam_odeme = nakit_odeme + banka_odeme

                # 7.000 TL üstü nakit ödeme riski (mevzuat limiti)
                buyuk_nakit = data.get("7000_ustu_nakit_odeme", 0)

                if buyuk_nakit > 0:
                    senaryo["tetiklendi"] = True
                    senaryo["tetikleme_nedeni"] = f"7.000 TL üstü nakit ödeme tespit edildi: {buyuk_nakit:,.0f} TL"
                    senaryo["oneriler"] = [
                        "7.000 TL üstü ödemeleri banka üzerinden yapın",
                        "VUK 257/7 tevsik zorunluluğunu inceleyin",
                        "Nakit ödemeleri belgeleyin"
                    ]
                    senaryo["kanitlar"] = [
                        {"hesap": "100", "çıkış": nakit_odeme, "açıklama": "Kasa çıkışları"},
                        {"hesap": "102", "çıkış": banka_odeme, "açıklama": "Banka çıkışları"},
                        {"büyük_nakit": buyuk_nakit, "açıklama": "7.000 TL üstü nakit işlem"}
                    ]
                else:
                    nakit_orani = nakit_odeme / toplam_odeme if toplam_odeme > 0 else 0
                    senaryo["kontrol_detayi"] = f"Nakit ödeme oranı: %{nakit_orani*100:.1f}. 7.000 TL üstü nakit ödeme tespit edilmedi."
                    senaryo["kanitlar"] = [
                        {"hesap": "100", "çıkış": nakit_odeme},
                        {"hesap": "102", "çıkış": banka_odeme}
                    ]

            # =========================================================================
            # KRG-07: KARŞILIKLI ÖDEME DÖNGÜSÜ
            # =========================================================================
            elif kod == "KRG-07":
                # Aynı firma ile alacak-borç karşılaştırması
                dongu_riski = data.get("karsilikli_odeme_dongusu", 0)

                if dongu_riski > 0:
                    senaryo["tetiklendi"] = True
                    senaryo["tetikleme_nedeni"] = f"Karşılıklı ödeme döngüsü tespit edildi: {dongu_riski:,.0f} TL"
                    senaryo["oneriler"] = [
                        "Cari hesapları netleştirin",
                        "Mahsup fişleri düzenlenmeli",
                        "Gerçek nakit akışını belgeleyin"
                    ]
                else:
                    senaryo["kontrol_detayi"] = "Karşılıklı ödeme döngüsü için cari hesap analizi yapıldı. Risk tespit edilmedi."
                    senaryo["kanitlar"] = [{"kaynak": "Cari Hesap Analizi", "sonuç": "Döngü yok"}]

            # =========================================================================
            # KRG-08: SEKTÖREL KÂRLILIK ANOMALİSİ - GERÇEK GİB VERİSİ
            # =========================================================================
            elif kod == "KRG-08":
                # Sektör ortalamasına göre kârlılık - GİB Sektör İstatistik Servisi
                kar_marji = data.get("kar_marji", 0)
                nace_kodu = data.get("nace_kodu", data.get("faaliyet_kodu", ""))

                # GERÇEK VERİ: GİB Sektör İstatistiklerinden al
                sektor_ortalama = 0.05  # Fallback
                veri_kaynagi = "HARDCODED"

                if self.gib_service and nace_kodu:
                    sektor_ortalama = self.gib_service.get_sektor_kar_marji(nace_kodu)
                    veri_kaynagi = "GİB Sektör İstatistikleri"
                elif data.get("sektor_kar_ortalamasi"):
                    sektor_ortalama = data.get("sektor_kar_ortalamasi")
                    veri_kaynagi = "Yüklenen Veri"

                if kar_marji > 0 and sektor_ortalama > 0:
                    sapma = (kar_marji - sektor_ortalama) / sektor_ortalama if sektor_ortalama > 0 else 0

                    if sapma < -0.5:  # Sektör ortalamasından %50'den fazla düşük
                        senaryo["tetiklendi"] = True
                        senaryo["tetikleme_nedeni"] = f"Kâr marjı sektör ortalamasının %{abs(sapma)*100:.0f} altında: %{kar_marji*100:.1f} (Sektör: %{sektor_ortalama*100:.1f})"
                        senaryo["oneriler"] = [
                            "Sektör raporlarını inceleyin",
                            "Düşük kârlılık nedenini belgeleyin (yatırım dönemi, sektörel daralma vb.)",
                            "Maliyet yapısını analiz edin"
                        ]
                        senaryo["kanitlar"] = [
                            {
                                "kaynak": "Mizan - Dönem Kâr/Zararı (Gelir Tablosu)",
                                "oran": f"%{kar_marji*100:.1f}",
                                "aciklama": "Şirketin net kâr marjı"
                            },
                            {
                                "kaynak": f"GİB Sektör Ortalaması ({veri_kaynagi})",
                                "oran": f"%{sektor_ortalama*100:.1f}",
                                "aciklama": f"NACE {nace_kodu} sektör ortalaması"
                            },
                            {
                                "kaynak": "Hesaplanan Sapma",
                                "oran": f"%{sapma*100:.1f}",
                                "esik": "-%50",
                                "durum": "EŞİK AŞILDI" if sapma < -0.5 else "NORMAL"
                            }
                        ]
                    else:
                        senaryo["kontrol_detayi"] = f"Kâr marjı: %{kar_marji*100:.1f}, Sektör ortalaması: %{sektor_ortalama*100:.1f} ({veri_kaynagi}). Normal aralıkta."
                        senaryo["kanitlar"] = [
                            {"kaynak": "Mizan - Kâr Marjı", "oran": f"%{kar_marji*100:.1f}"},
                            {"kaynak": f"GİB Sektör Ortalaması ({veri_kaynagi})", "oran": f"%{sektor_ortalama*100:.1f}", "durum": "NORMAL"}
                        ]
                else:
                    senaryo["kontrol_detayi"] = "Sektörel kârlılık kontrolü için kâr marjı ve NACE kodu gerekli."
                    senaryo["kanitlar"] = [{"kaynak": "Mizan - Veri Eksik", "not": "Kâr marjı veya NACE kodu eksik"}]

            # =========================================================================
            # KRG-09: BEYAN-YAŞAM STANDARDI UYUMSUZLUĞU
            # =========================================================================
            elif kod == "KRG-09":
                # Bu kontrol ortak/yönetici kişisel varlık bilgisi gerektirir
                senaryo["aktif"] = False
                senaryo["aktif_degil_nedeni"] = "Bu senaryo icin ortak/yonetici kisisel veri (beyan geliri, yasam standardi) gereklidir. Bu veriler henuz sisteme entegre edilmemistir."
                beyan_gelir = data.get("ortak_beyan_gelir", 0)
                yasam_standardi = data.get("ortak_yasam_standardi", 0)

                if beyan_gelir > 0 and yasam_standardi > 0:
                    senaryo["aktif"] = True
                    del senaryo["aktif_degil_nedeni"]
                    if yasam_standardi > beyan_gelir * 2:
                        senaryo["tetiklendi"] = True
                        senaryo["tetikleme_nedeni"] = f"Yaşam standardı beyan gelirinin çok üzerinde"
                        senaryo["oneriler"] = [
                            "Ortak/yönetici gelir kaynaklarını belgeleyin",
                            "Diğer gelir kaynaklarını araştırın"
                        ]
                else:
                    senaryo["kontrol_detayi"] = "Beyan-yaşam standardı kontrolü için ortak/yönetici kişisel verileri gerekli. Bu veriler sistemde yok."
                    senaryo["kanitlar"] = [{"kaynak": "Sistem", "not": "Ortak kişisel verisi yüklenmedi"}]

            # =========================================================================
            # KRG-10: KDV BEYAN-FATURA UYUMSUZLUĞU
            # =========================================================================
            elif kod == "KRG-10":
                kdv_kontrol = category_analysis.get("kdv", {}).get("kontroller", [])
                kdv_beyani = data.get("kdv_beyani", 0)
                kdv_fatura = data.get("kdv_fatura_toplami", 0)

                triggered = False
                for k in kdv_kontrol:
                    if k.get("kontrol_adi") == "E-Fatura Uyumu" and k.get("durum") == "KRITIK":
                        triggered = True
                        senaryo["tetiklendi"] = True
                        senaryo["tetikleme_nedeni"] = "E-fatura ve muhasebe kayıtları arasında ciddi fark"
                        senaryo["oneriler"] = [
                            "E-fatura kayıtlarını kontrol edin",
                            "Beyanname-fatura mutabakatını yapın",
                            "Eksik faturaları tamamlayın"
                        ]
                        senaryo["kanitlar"] = [
                            {"kaynak": "KDV Beyanı", "tutar": kdv_beyani},
                            {"kaynak": "E-Fatura KDV", "tutar": kdv_fatura}
                        ]

                if not triggered:
                    senaryo["kontrol_detayi"] = "KDV beyan-fatura kontrolü yapıldı. Ciddi fark tespit edilmedi."
                    senaryo["kanitlar"] = [
                        {"kaynak": "KDV Beyanı", "tutar": kdv_beyani},
                        {"kaynak": "E-Fatura", "tutar": kdv_fatura}
                    ]

            # =========================================================================
            # KRG-11: RİSKLİ KDV İADE TALEBİ
            # =========================================================================
            elif kod == "KRG-11":
                kdv_iade = data.get("kdv_iade_talebi", 0)
                indirilecek_kdv = hesaplar.get("191", {}).get("bakiye", 0)
                devreden_kdv = hesaplar.get("190", {}).get("bakiye", 0)

                if kdv_iade > 0:
                    # Riskli iade kontrolü
                    if kdv_iade > indirilecek_kdv * 0.5:  # İndirilecek KDV'nin %50'sinden fazla iade
                        senaryo["tetiklendi"] = True
                        senaryo["tetikleme_nedeni"] = f"Yüksek KDV iade talebi: {kdv_iade:,.0f} TL (İndirilecek KDV: {indirilecek_kdv:,.0f} TL)"
                        senaryo["oneriler"] = [
                            "İade belgelerini eksiksiz hazırlayın",
                            "YMM raporu gerekebilir",
                            "İndirim listelerini düzenleyin"
                        ]
                        senaryo["kanitlar"] = [
                            {"kaynak": "İade Talebi", "tutar": kdv_iade},
                            {"hesap": "191", "bakiye": indirilecek_kdv},
                            {"hesap": "190", "bakiye": devreden_kdv}
                        ]
                    else:
                        senaryo["kontrol_detayi"] = f"KDV iade talebi: {kdv_iade:,.0f} TL. Makul seviyede."
                else:
                    senaryo["kontrol_detayi"] = "Bu dönemde KDV iade talebi yapılmamış."
                    senaryo["kanitlar"] = [{"kaynak": "Beyanname", "kdv_iade": 0}]

            # =========================================================================
            # KRG-12: SAHTE BELGE ŞÜPHESİ
            # =========================================================================
            elif kod == "KRG-12":
                # Çeşitli indikatörler
                riskli_tedarikci = data.get("riskli_tedarikci_sayisi", 0)
                supheli_fatura = data.get("supheli_fatura_sayisi", 0)
                belge_tutarsizlik = data.get("belge_tutarsizlik_sayisi", 0)

                toplam_risk_skor = riskli_tedarikci * 30 + supheli_fatura * 20 + belge_tutarsizlik * 10

                if toplam_risk_skor >= 50:
                    senaryo["tetiklendi"] = True
                    senaryo["tetikleme_nedeni"] = f"Sahte belge riski tespit edildi (Risk skoru: {toplam_risk_skor})"
                    senaryo["oneriler"] = [
                        "Tüm faturaları VKN bazlı sorgulatın",
                        "Tedarikçi ziyaretleri yapın",
                        "Ödeme kanallarını belgeleyin"
                    ]
                    senaryo["kanitlar"] = [
                        {"kaynak": "Riskli Tedarikçi", "sayı": riskli_tedarikci},
                        {"kaynak": "Şüpheli Fatura", "sayı": supheli_fatura},
                        {"kaynak": "Belge Tutarsızlığı", "sayı": belge_tutarsizlik}
                    ]
                else:
                    senaryo["kontrol_detayi"] = "Sahte belge göstergeleri kontrol edildi. Anlamlı risk tespit edilmedi."
                    senaryo["kanitlar"] = [{"kaynak": "Belge Analizi", "risk_skoru": toplam_risk_skor}]

            # =========================================================================
            # KRG-13: TRANSFER FİYATLANDIRMASI RİSKİ (KVK Md. 12-13)
            # =========================================================================
            elif kod == "KRG-13":
                # İlişkili kişi işlemleri - Hesap 131, 231, 331, 431
                iliskili_islem = data.get("iliskili_kisi_islem_tutari", 0)
                ciro = data.get("ciro", 0)

                # Detaylı hesap bakiyeleri (varsa)
                hesap_131 = data.get("hesap_131_bakiye", 0)  # Ortaklardan Alacaklar
                hesap_231 = data.get("hesap_231_bakiye", 0)  # Ortaklardan Alacaklar (U.V.)
                hesap_331 = data.get("hesap_331_bakiye", 0)  # Ortaklara Borçlar
                hesap_431 = data.get("hesap_431_bakiye", 0)  # Ortaklara Borçlar (U.V.)

                # Özkaynak (örtülü sermaye hesaplaması için)
                ozkaynak = data.get("ozkaynak", 0)

                if iliskili_islem > 0 and ciro > 0:
                    iliskili_oran = iliskili_islem / ciro

                    # Örtülü sermaye oranı (KVK Md. 12)
                    ortulu_sermaye_orani = (hesap_331 + hesap_431) / ozkaynak if ozkaynak > 0 else 0

                    if iliskili_oran > 0.25:  # Cironun %25'inden fazla ilişkili işlem
                        senaryo["tetiklendi"] = True
                        senaryo["tetikleme_nedeni"] = f"Yüksek ilişkili kişi işlem oranı: %{iliskili_oran*100:.1f} (Eşik: %25)"
                        senaryo["oneriler"] = [
                            "KVK Md. 13 kapsamında Transfer Fiyatlandırması dokümantasyonu hazırlayın",
                            "Emsallere uygunluk analizi yapın (TCMB avans faizi referans alınmalı)",
                            "Yıllık Transfer Fiyatlandırması Raporu (Form 1) hazırlayın",
                            "Ortaklara borç varsa faiz tahakkuku yapılıp yapılmadığını kontrol edin",
                            "KVK Md. 12 örtülü sermaye sınırını (borç/özkaynak > 3) değerlendirin"
                        ]
                        senaryo["kanitlar"] = [
                            {
                                "kaynak": "Mizan - Ortaklara Borçlar (Hs. 331+431)",
                                "tutar": hesap_331 + hesap_431,
                                "aciklama": "KVK Md. 12 kapsamında örtülü sermaye değerlendirmesi gerekli"
                            },
                            {
                                "kaynak": "Mizan - Ortaklardan Alacaklar (Hs. 131+231)",
                                "tutar": hesap_131 + hesap_231,
                                "aciklama": "TCMB avans faizi üzerinden faiz geliri tahakkuku gerekli"
                            },
                            {
                                "kaynak": "Gelir Tablosu - Net Satışlar (Hs. 600-602)",
                                "tutar": ciro,
                                "aciklama": "İlişkili işlem oranı hesaplamasında baz alınan ciro"
                            },
                            {
                                "kaynak": "Hesaplanan Oran",
                                "oran": f"%{iliskili_oran*100:.1f}",
                                "esik": "%25",
                                "durum": "EŞİK AŞILDI" if iliskili_oran > 0.25 else "NORMAL"
                            }
                        ]
                        # Örtülü sermaye uyarısı
                        if ortulu_sermaye_orani > 3:
                            senaryo["kanitlar"].append({
                                "kaynak": "Örtülü Sermaye Oranı (KVK Md. 12)",
                                "oran": f"{ortulu_sermaye_orani:.2f}x",
                                "esik": "3x",
                                "aciklama": "Ortaklara borç/Özkaynak oranı 3'ü aştığında örtülü sermaye sayılır!"
                            })
                        senaryo["mevzuat"] = [
                            "KVK Md. 12 - Örtülü Sermaye",
                            "KVK Md. 13 - Transfer Fiyatlandırması",
                            "1 Seri No'lu Transfer Fiyatlandırması Tebliği",
                            "VUK Md. 3/B - Vergiyi Doğuran Olay"
                        ]
                    else:
                        senaryo["kontrol_detayi"] = f"İlişkili kişi işlem oranı: %{iliskili_oran*100:.1f}. Eşik değerin (%25) altında, makul seviyede."
                        senaryo["kanitlar"] = [
                            {"kaynak": "İlişkili İşlem Tutarı", "tutar": iliskili_islem},
                            {"kaynak": "Ciro", "tutar": ciro},
                            {"kaynak": "Hesaplanan Oran", "oran": f"%{iliskili_oran*100:.1f}", "durum": "NORMAL"}
                        ]
                else:
                    senaryo["kontrol_detayi"] = "Transfer fiyatlandırması kontrolü için mizan verisi gerekli. Hesap 131, 231, 331, 431 bakiyeleri kontrol edilmeli."
                    senaryo["kanitlar"] = [{"kaynak": "Sistem", "not": "İlişkili işlem hesap verileri (131, 231, 331, 431) yüklenmedi"}]

            # =========================================================================
            # KRG-14: SÜREKLİ ZARAR BEYANI
            # =========================================================================
            elif kod == "KRG-14":
                zarar_sayisi = data.get("zarar_donem_sayisi", 0)
                son_donem_zarar = data.get("son_donem_zarar", 0)
                donem_kar_zarar = hesaplar.get("590", {}).get("bakiye", 0) or 0  # Dönem Net Karı
                donem_kar_zarar -= hesaplar.get("591", {}).get("bakiye", 0) or 0  # Dönem Net Zararı (-)

                if zarar_sayisi >= 3:
                    senaryo["tetiklendi"] = True
                    senaryo["tetikleme_nedeni"] = f"Son {zarar_sayisi} dönem zarar beyanı (Son dönem: {son_donem_zarar:,.0f} TL)"
                    senaryo["oneriler"] = [
                        "Zarar nedenlerini belgeleyin (sektörel daralma, yatırım dönemi vb.)",
                        "TTK 376 sermaye kaybı değerlendirmesi yapın",
                        "İş planı ve kârlılık projeksiyonu hazırlayın"
                    ]
                    senaryo["kanitlar"] = [
                        {
                            "kaynak": "Mizan - Dönem Net Kârı/Zararı (Hs. 590-591)",
                            "tutar": donem_kar_zarar,
                            "aciklama": "Cari dönem sonucu"
                        },
                        {
                            "kaynak": "GİB Beyanname Geçmişi",
                            "deger": f"{zarar_sayisi} dönem",
                            "aciklama": "Üst üste zarar beyan edilen dönem sayısı"
                        },
                        {
                            "kaynak": "Risk Değerlendirmesi",
                            "esik": "3 dönem",
                            "durum": "EŞİK AŞILDI" if zarar_sayisi >= 3 else "NORMAL"
                        }
                    ]
                else:
                    if zarar_sayisi > 0:
                        senaryo["kontrol_detayi"] = f"Son {zarar_sayisi} dönemde zarar beyanı var. 3 dönem eşiğinin altında."
                    else:
                        senaryo["kontrol_detayi"] = "Son dönemlerde zarar beyanı yok. Şirket kârlı."
                    senaryo["kanitlar"] = [
                        {
                            "kaynak": "Mizan - Dönem Net Kârı (Hs. 590)",
                            "tutar": donem_kar_zarar,
                            "aciklama": "Cari dönem kârlı" if donem_kar_zarar > 0 else "Cari dönem zararlı"
                        },
                        {
                            "kaynak": "GİB Beyanname Geçmişi",
                            "deger": f"{zarar_sayisi} dönem zarar",
                            "durum": "NORMAL"
                        }
                    ]

            # =========================================================================
            # KRG-15: DÜŞÜK VERGİ YÜKÜ - GERÇEK GİB VERİSİ
            # =========================================================================
            elif kod == "KRG-15":
                ciro = data.get("ciro", 0)
                vergi = data.get("toplam_vergi_beyani", 0)
                nace_kodu = data.get("nace_kodu", data.get("faaliyet_kodu", ""))

                # GERÇEK VERİ: GİB Sektör İstatistiklerinden al
                sektor_vergi_yuku = 0.02  # Fallback %2
                veri_kaynagi = "HARDCODED"

                if self.gib_service and nace_kodu:
                    sektor_vergi_yuku = self.gib_service.get_sektor_vergi_yuku(nace_kodu)
                    veri_kaynagi = "GİB Sektör İstatistikleri"
                elif data.get("sektor_vergi_yuku"):
                    sektor_vergi_yuku = data.get("sektor_vergi_yuku")
                    veri_kaynagi = "Yüklenen Veri"

                if ciro > 0:
                    vergi_yuku = vergi / ciro if ciro > 0 else 0

                    # Sektör ortalamasının %50'sinden düşükse risk
                    if sektor_vergi_yuku > 0 and vergi_yuku < sektor_vergi_yuku * 0.5:
                        senaryo["tetiklendi"] = True
                        senaryo["tetikleme_nedeni"] = f"Vergi yükü sektörün altında: %{vergi_yuku*100:.2f} (Sektör: %{sektor_vergi_yuku*100:.1f})"
                        senaryo["oneriler"] = [
                            "Vergi planlamasını gözden geçirin",
                            "KKEG kalemlerini kontrol edin",
                            "İstisna ve muafiyetleri belgeleyin"
                        ]
                        senaryo["kanitlar"] = [
                            {"kaynak": "Vergi Beyanı", "tutar": vergi},
                            {"kaynak": "Ciro", "tutar": ciro},
                            {"mükellef_vergi_yükü": f"%{vergi_yuku*100:.2f}"},
                            {"kaynak": veri_kaynagi, "sektör_vergi_yükü": f"%{sektor_vergi_yuku*100:.1f}"},
                            {"nace_kodu": nace_kodu}
                        ]
                    else:
                        senaryo["kontrol_detayi"] = f"Vergi yükü: %{vergi_yuku*100:.2f}, Sektör ortalaması: %{sektor_vergi_yuku*100:.1f} ({veri_kaynagi}). Normal aralıkta."
                        senaryo["kanitlar"] = [{"kaynak": veri_kaynagi, "nace_kodu": nace_kodu}]
                else:
                    senaryo["kontrol_detayi"] = "Vergi yükü kontrolü için ciro verisi gerekli."
                    senaryo["kanitlar"] = [{"kaynak": "Sistem", "not": "Ciro verisi bulunamadı"}]

            # =========================================================================
            # KRG-16: ORTAK/YÖNETİCİ RİSK GEÇMİŞİ
            # =========================================================================
            elif kod == "KRG-16":
                riskli_ortak = data.get("riskli_ortak_sayisi", 0)
                toplam_ortak = data.get("toplam_ortak_sayisi", 0)

                # GİB Servisi ile ortak risk sorgulaması
                ortaklar = data.get("ortaklar", [])  # [{"tc_kimlik": "...", "ad_soyad": "..."}, ...]
                if self.gib_service and ortaklar:
                    ortak_analiz = self.gib_service.analiz_ortak_yonetici_riski(ortaklar)
                    riskli_ortak = ortak_analiz.get("riskli_ortak_sayisi", 0)
                    toplam_ortak = ortak_analiz.get("toplam_ortak", len(ortaklar))

                    if riskli_ortak > 0:
                        senaryo["tetiklendi"] = True
                        senaryo["tetikleme_nedeni"] = f"{riskli_ortak} ortak/yönetici risk geçmişi tespit edildi"
                        senaryo["oneriler"] = ortak_analiz.get("oneriler", [
                            "Ortak/yönetici geçmişini araştırın",
                            "Risk azaltıcı tedbirler alın"
                        ])
                        senaryo["kanitlar"] = [
                            {"kaynak": "GİB Risk Servisi", "riskli_ortak": riskli_ortak, "toplam_ortak": toplam_ortak},
                            {"detaylar": ortak_analiz.get("detaylar", [])}
                        ]
                    else:
                        senaryo["kontrol_detayi"] = f"GİB Risk Servisi ile {toplam_ortak} ortak/yönetici sorgulandı. Riskli kişi bulunamadı."
                        senaryo["kanitlar"] = [{"kaynak": "GİB Risk Servisi", "tarih": ortak_analiz.get("sorgu_tarihi"), "sonuç": "Risk yok"}]
                elif riskli_ortak > 0:
                    senaryo["tetiklendi"] = True
                    senaryo["tetikleme_nedeni"] = f"{riskli_ortak} ortak/yönetici GİB riskli listesinde"
                    senaryo["oneriler"] = [
                        "Ortak/yönetici geçmişini araştırın",
                        "Risk azaltıcı tedbirler alın",
                        "Gerekirse ortaklık yapısını değiştirin"
                    ]
                    senaryo["kanitlar"] = [
                        {"kaynak": "Yüklenen Veri", "riskli_ortak": riskli_ortak},
                        {"kaynak": "Sicil", "toplam_ortak": toplam_ortak}
                    ]
                else:
                    senaryo["kontrol_detayi"] = "KRG-16 kontrolü için ortak/yönetici bilgisi gerekli. Vergi levhası veya ticaret sicil verisi yüklendiğinde otomatik sorgulanır."
                    senaryo["kanitlar"] = [{"kaynak": "Sistem", "not": "Ortak bilgisi yüklenmedi"}]

            scenarios.append(senaryo)

        return scenarios

    # =========================================================================
    # TTK 376 / ORTULU SERMAYE / FINANSMAN GIDER KISITLAMASI
    # =========================================================================

    def _calculate_ttk_376(self, data: Dict) -> Dict:
        """
        TTK 376 Sermaye Kaybı Analizi - Tek Düzen Hesap Planı'na Uygun

        Formül: Kayıp Oranı = (Sermaye + Yasal Yedekler - Özkaynaklar) / (Sermaye + Yasal Yedekler)

        KRİTİK KURAL: Özkaynaklar >= (Sermaye + Yasal Yedekler) ise KAYIP YOK!
        Bu durumda şirket kârlı, sermaye kaybı söz konusu değil.
        """
        hesaplar = data.get("hesaplar", {})

        # 500 - Sermaye (Pasif hesap, alacak bakiyeli)
        sermaye = hesaplar.get("500", {}).get("bakiye", 0)
        if sermaye <= 0:
            sermaye = data.get("sermaye", 0)

        # 540 - Yasal Yedekler (I. ve II. Tertip)
        yasal_yedek = hesaplar.get("540", {}).get("bakiye", 0)

        # Özkaynaklar Toplamı (5. Sınıf tüm hesaplar)
        ozkaynak = self._calculate_total_ozkaynak(hesaplar, data)

        if sermaye <= 0:
            return {
                "sermaye": 0,
                "yasal_yedekler": 0,
                "ozkaynaklar": 0,
                "sermaye_kaybi_orani": 0,
                "durum": "VERI_YOK",
                "aksiyon": None,
                "aciklama": "Sermaye bilgisi bulunamadı (500 hesap)"
            }

        sermaye_ve_yedek = sermaye + yasal_yedek

        # KRİTİK: Özkaynaklar yeterliyse KAYIP YOK
        # Şirket kârlı, sermaye erimiyor
        if ozkaynak >= sermaye_ve_yedek:
            return {
                "sermaye": sermaye,
                "yasal_yedekler": yasal_yedek,
                "ozkaynaklar": ozkaynak,
                "sermaye_kaybi_orani": 0,
                "durum": "NORMAL",
                "aksiyon": None,
                "aciklama": f"Özkaynaklar ({ozkaynak:,.0f} TL) sermayeyi karşılıyor - kayıp yok"
            }

        # Sermaye kaybı var - oran hesapla (minimum 0, ASLA negatif olamaz)
        sermaye_kaybi = max(0, sermaye_ve_yedek - ozkaynak)
        kayip_orani = sermaye_kaybi / sermaye_ve_yedek if sermaye_ve_yedek > 0 else 0

        # TTK 376 durumlarını belirle
        durum = "NORMAL"
        aksiyon = None
        aciklama = f"Sermaye kaybı oranı: %{kayip_orani*100:.1f}"

        if ozkaynak < 0:
            durum = "BORCA_BATIK"
            aksiyon = "TTK 376/3 gereği mahkemeye bildirim ZORUNLU"
            aciklama = f"BORCA BATIK - Özkaynaklar negatif ({ozkaynak:,.0f} TL)"
        elif kayip_orani >= 2/3:
            durum = "UCTE_IKI_KAYIP"
            aksiyon = "Genel Kurul toplanmalı, sermaye azaltımı/artırımı kararı"
            aciklama = f"Sermayenin 2/3'ü kaybedilmiş (%{kayip_orani*100:.1f})"
        elif kayip_orani >= 1/2:
            durum = "YARI_KAYIP"
            aksiyon = "Yönetim Kurulu iyileştirme önlemleri almalı"
            aciklama = f"Sermayenin yarısı kaybedilmiş (%{kayip_orani*100:.1f})"

        return {
            "sermaye": sermaye,
            "yasal_yedekler": yasal_yedek,
            "ozkaynaklar": ozkaynak,
            "sermaye_kaybi_orani": kayip_orani,
            "durum": durum,
            "aksiyon": aksiyon,
            "aciklama": aciklama
        }

    def _calculate_total_ozkaynak(self, hesaplar: Dict, data: Dict) -> float:
        """
        5. Sınıf Özkaynaklar Toplamını Hesapla - Tek Düzen Hesap Planı

        Özkaynaklar = 500 (Sermaye)
                    + 520 (Hisse Senedi İhraç Primleri)
                    + 540 (Yasal Yedekler)
                    + 542 (Olağanüstü Yedekler)
                    + 548 (Diğer Kâr Yedekleri)
                    + 570 (Geçmiş Yıllar Kârları)
                    + 590 (Dönem Net Kârı)
                    - 501 (Ödenmemiş Sermaye)
                    - 580 (Geçmiş Yıllar Zararları)
                    - 591 (Dönem Net Zararı)
        """
        # Doğrudan veri varsa kullan
        if data.get("ozkaynak", 0) > 0:
            return data.get("ozkaynak", 0)

        # 5. Sınıf hesaplardan hesapla
        ozkaynak = 0.0

        # (+) Pozitif kalemler
        ozkaynak += hesaplar.get("500", {}).get("bakiye", 0)  # Sermaye
        ozkaynak += hesaplar.get("520", {}).get("bakiye", 0)  # Hisse Senedi İhraç Primleri
        ozkaynak += hesaplar.get("540", {}).get("bakiye", 0)  # Yasal Yedekler
        ozkaynak += hesaplar.get("542", {}).get("bakiye", 0)  # Olağanüstü Yedekler
        ozkaynak += hesaplar.get("548", {}).get("bakiye", 0)  # Diğer Kâr Yedekleri
        ozkaynak += hesaplar.get("570", {}).get("bakiye", 0)  # Geçmiş Yıllar Kârları
        ozkaynak += hesaplar.get("590", {}).get("bakiye", 0)  # Dönem Net Kârı

        # (-) Negatif kalemler (bunlar zaten pozitif bakiye olarak gelir, çıkarıyoruz)
        ozkaynak -= abs(hesaplar.get("501", {}).get("bakiye", 0))  # Ödenmemiş Sermaye
        ozkaynak -= abs(hesaplar.get("580", {}).get("bakiye", 0))  # Geçmiş Yıllar Zararları
        ozkaynak -= abs(hesaplar.get("591", {}).get("bakiye", 0))  # Dönem Net Zararı

        return ozkaynak

    def _calculate_ortulu_sermaye(self, data: Dict) -> Dict:
        """KVK 12 Ortulu Sermaye Analizi"""
        donem_basi_ozkaynak = data.get("donem_basi_ozkaynak", 0) or data.get("ozkaynak", 0)
        ortaklara_borc = data.get("hesaplar", {}).get("331", {}).get("bakiye", 0)
        ortaklara_borc_uzun = data.get("hesaplar", {}).get("431", {}).get("bakiye", 0)

        iliskili_borc = ortaklara_borc + ortaklara_borc_uzun
        sinir = donem_basi_ozkaynak * 3

        ortulu_tutar = max(0, iliskili_borc - sinir)
        durum = "SINIR_ALTINDA" if ortulu_tutar == 0 else "SINIR_UZERINDE"

        # KKEG hesapla (faiz orani varsayimi %30)
        faiz_orani = 0.30
        kkeg_tutari = ortulu_tutar * faiz_orani if ortulu_tutar > 0 else 0

        aksiyon = None
        if ortulu_tutar > 0:
            aksiyon = f"{ortulu_tutar:,.0f} TL tutarindaki borca isabet eden faiz/kur farki KKEG'e alinmali"

        return {
            "donem_basi_ozkaynak": donem_basi_ozkaynak,
            "sinir": sinir,
            "iliskili_borc": iliskili_borc,
            "ortulu_sermaye_tutari": ortulu_tutar,
            "durum": durum,
            "kkeg_tutari": kkeg_tutari,
            "aksiyon": aksiyon
        }

    def _calculate_finansman_gider_kisitlamasi(self, data: Dict) -> Dict:
        """KVK 11/1-i Finansman Gider Kisitlamasi"""
        ozkaynak = data.get("ozkaynak", 0)
        yabanci_kaynak = data.get("yabanci_kaynak", 0)
        finansman_gideri = data.get("finansman_gideri", 0)

        uygulanir = yabanci_kaynak > ozkaynak

        if not uygulanir or finansman_gideri <= 0:
            return {
                "ozkaynak": ozkaynak,
                "yabanci_kaynak": yabanci_kaynak,
                "toplam_finansman_gideri": finansman_gideri,
                "asan_kisim": 0,
                "kisitlamaya_tabi_gider": 0,
                "kkeg_tutari": 0,
                "uygulanir_mi": False
            }

        asan_kisim = yabanci_kaynak - ozkaynak
        oran = asan_kisim / yabanci_kaynak if yabanci_kaynak > 0 else 0
        kisitlamaya_tabi = finansman_gideri * oran
        kkeg_tutari = kisitlamaya_tabi * 0.10  # %10

        return {
            "ozkaynak": ozkaynak,
            "yabanci_kaynak": yabanci_kaynak,
            "toplam_finansman_gideri": finansman_gideri,
            "asan_kisim": asan_kisim,
            "kisitlamaya_tabi_gider": kisitlamaya_tabi,
            "kkeg_tutari": kkeg_tutari,
            "uygulanir_mi": True
        }

    def _calculate_mukellef_finansal_oranlari(self, data: Dict) -> Dict:
        """
        Mükellef Finansal Oranları Hesaplama - Sektör Karşılaştırması İçin

        TCMB EVDS formatıyla uyumlu oranlar üretir.
        Tüm oranlar BACKEND'de hesaplanır - frontend tahmin YAPMAZ!

        Hesaplanan Oranlar:
        - Likidite Oranları: Cari Oran, Asit Test, Nakit Oranı
        - Finansal Yapı: Yabancı Kaynak/Aktif, Özkaynak/Aktif
        - Kârlılık: Net Kâr Marjı, Brüt Kâr Marjı, ROA
        - Faaliyet: Alacak Devir Hızı, Borç Devir Hızı, Stok Devir Hızı
        - Vergi: Vergi Yükü Oranı
        """
        hesaplar = data.get("hesaplar", {})

        # Temel Bilanço Kalemleri
        # DÖNEN VARLIKLAR (1. Sınıf)
        kasa = hesaplar.get("100", {}).get("bakiye", 0)
        bankalar = hesaplar.get("102", {}).get("bakiye", 0)
        menkul_kiymetler = hesaplar.get("110", {}).get("bakiye", 0)
        ticari_alacaklar = hesaplar.get("120", {}).get("bakiye", 0)
        alacak_senetleri = hesaplar.get("121", {}).get("bakiye", 0)
        stoklar = hesaplar.get("153", {}).get("bakiye", 0) + hesaplar.get("157", {}).get("bakiye", 0)
        diger_donen = hesaplar.get("180", {}).get("bakiye", 0) + hesaplar.get("190", {}).get("bakiye", 0)

        donen_varliklar = kasa + bankalar + menkul_kiymetler + ticari_alacaklar + alacak_senetleri + stoklar + diger_donen

        # DURAN VARLIKLAR (2. Sınıf)
        duran_varliklar = (
            hesaplar.get("253", {}).get("bakiye", 0) +  # Tesis Makina
            hesaplar.get("254", {}).get("bakiye", 0) +  # Taşıtlar
            hesaplar.get("255", {}).get("bakiye", 0) +  # Demirbaşlar
            hesaplar.get("260", {}).get("bakiye", 0) +  # Haklar
            hesaplar.get("262", {}).get("bakiye", 0)    # Kuruluş Giderleri
        )

        toplam_aktif = donen_varliklar + duran_varliklar
        if toplam_aktif <= 0:
            toplam_aktif = data.get("toplam_aktif", 0)

        # KISA VADELİ YABANCI KAYNAKLAR (3. Sınıf)
        mali_borclar = hesaplar.get("300", {}).get("bakiye", 0)
        ticari_borclar = hesaplar.get("320", {}).get("bakiye", 0)
        borc_senetleri = hesaplar.get("321", {}).get("bakiye", 0)
        ortaklara_borc = hesaplar.get("331", {}).get("bakiye", 0)
        vergi_borclar = hesaplar.get("360", {}).get("bakiye", 0) + hesaplar.get("361", {}).get("bakiye", 0)
        sgk_borclari = hesaplar.get("368", {}).get("bakiye", 0)

        kvyk = mali_borclar + ticari_borclar + borc_senetleri + ortaklara_borc + vergi_borclar + sgk_borclari

        # UZUN VADELİ YABANCI KAYNAKLAR (4. Sınıf)
        uvyk = (
            hesaplar.get("400", {}).get("bakiye", 0) +  # Banka Kredileri
            hesaplar.get("420", {}).get("bakiye", 0) +  # Satıcılar
            hesaplar.get("431", {}).get("bakiye", 0)    # Ortaklara Borçlar
        )

        yabanci_kaynak = kvyk + uvyk

        # ÖZKAYNAKLAR (5. Sınıf)
        ozkaynak = self._calculate_total_ozkaynak(hesaplar, data)

        # GELİR TABLOSU (6. ve 7. Sınıf)
        net_satislar = hesaplar.get("600", {}).get("bakiye", 0)
        smm = hesaplar.get("620", {}).get("bakiye", 0)  # Satılan Malın Maliyeti
        brut_kar = net_satislar - smm

        # Faaliyet Giderleri
        genel_yonetim = hesaplar.get("770", {}).get("bakiye", 0) + hesaplar.get("771", {}).get("bakiye", 0)
        pazarlama = hesaplar.get("760", {}).get("bakiye", 0) + hesaplar.get("761", {}).get("bakiye", 0)
        finansman_gideri = hesaplar.get("780", {}).get("bakiye", 0)

        # Kâr hesaplama
        donem_kari = hesaplar.get("590", {}).get("bakiye", 0)
        donem_zarari = hesaplar.get("591", {}).get("bakiye", 0)
        net_kar = donem_kari - donem_zarari

        # Ciro (net satışlar veya data'dan)
        ciro = net_satislar if net_satislar > 0 else data.get("ciro", 0)

        # Vergi
        vergi = data.get("toplam_vergi_beyani", 0)

        # =================================================================
        # ORAN HESAPLAMALARI - TCMB EVDS formüllerine uygun
        # =================================================================

        oranlar = {
            # ---- LİKİDİTE ORANLARI ----
            # Cari Oran = Dönen Varlıklar / KVYK
            "cari_oran": round(donen_varliklar / kvyk, 2) if kvyk > 0 else None,

            # Asit Test (Likidite) Oranı = (Dönen Varlıklar - Stoklar) / KVYK
            "asit_test_orani": round((donen_varliklar - stoklar) / kvyk, 2) if kvyk > 0 else None,

            # Nakit Oranı = (Kasa + Bankalar + Menkul Kıymetler) / KVYK
            "nakit_orani": round((kasa + bankalar + menkul_kiymetler) / kvyk, 2) if kvyk > 0 else None,

            # ---- FİNANSAL YAPI ORANLARI ----
            # Yabancı Kaynak / Toplam Aktif
            "yabanci_kaynak_aktif": round(yabanci_kaynak / toplam_aktif * 100, 1) if toplam_aktif > 0 else None,

            # Özkaynak / Toplam Aktif
            "ozkaynak_aktif": round(ozkaynak / toplam_aktif * 100, 1) if toplam_aktif > 0 else None,

            # ---- KÂRLILIK ORANLARI ----
            # Net Kâr Marjı = Net Kâr / Net Satışlar × 100
            "net_kar_marji": round(net_kar / ciro * 100, 2) if ciro > 0 else None,

            # Brüt Kâr Marjı = Brüt Kâr / Net Satışlar × 100
            "brut_kar_marji": round(brut_kar / ciro * 100, 2) if ciro > 0 else None,

            # ROA (Aktif Kârlılığı) = Net Kâr / Toplam Aktif × 100
            "roa": round(net_kar / toplam_aktif * 100, 2) if toplam_aktif > 0 else None,

            # ---- FAALİYET ORANLARI ----
            # Alacak Devir Hızı = Net Satışlar / Ticari Alacaklar
            "alacak_devir_hizi": round(ciro / (ticari_alacaklar + alacak_senetleri), 1) if (ticari_alacaklar + alacak_senetleri) > 0 else None,

            # Borç Devir Hızı = SMM / Ticari Borçlar (gün olarak: 365 / devir hızı)
            "borc_devir_hizi": round(smm / (ticari_borclar + borc_senetleri), 1) if (ticari_borclar + borc_senetleri) > 0 else None,

            # Stok Devir Hızı = SMM / Ortalama Stok
            "stok_devir_hizi": round(smm / stoklar, 1) if stoklar > 0 else None,

            # ---- VERGİ ORANLARI ----
            # Vergi Yükü = Toplam Vergi / Ciro × 100
            "vergi_yuku": round(vergi / ciro * 100, 2) if ciro > 0 else None,
        }

        # Ham veriler (debug ve detay için)
        oranlar["_ham_veriler"] = {
            "donen_varliklar": donen_varliklar,
            "duran_varliklar": duran_varliklar,
            "toplam_aktif": toplam_aktif,
            "kvyk": kvyk,
            "uvyk": uvyk,
            "yabanci_kaynak": yabanci_kaynak,
            "ozkaynak": ozkaynak,
            "ciro": ciro,
            "smm": smm,
            "brut_kar": brut_kar,
            "net_kar": net_kar,
            "stoklar": stoklar,
            "ticari_alacaklar": ticari_alacaklar + alacak_senetleri,
            "ticari_borclar": ticari_borclar + borc_senetleri,
            "vergi": vergi
        }

        # Hesaplama kaynağı bilgisi
        oranlar["_kaynak"] = {
            "hesaplama_tarihi": datetime.utcnow().isoformat() + "Z",
            "veri_kaynagi": "mizan",
            "formul_referansi": "TCMB EVDS Sektör Bilançoları Metodolojisi"
        }

        return oranlar

    # =========================================================================
    # ACIL AKSIYONLAR VE RISK OZETI
    # =========================================================================

    def _calculate_urgent_actions(
        self,
        category_analysis: Dict,
        kurgan_scenarios: List[Dict],
        ttk_376: Dict,
        ortulu_sermaye: Dict
    ) -> Dict:
        """Acil aksiyonlari hesapla - puan_etkisi dahil"""
        actions = []

        # TTK 376 aksiyonlari
        if ttk_376.get("durum") == "BORCA_BATIK":
            actions.append({
                "aksiyon": "Mahkemeye bildirim yap (TTK 376/3)",
                "oncelik": "high",
                "tahmini_sure": "2 saat",
                "kategori": "sermaye",
                "ilgili_hesap": "570/580",
                "puan_etkisi": self.PUAN_ETKISI.get("ttk_376_bildirim", -5)
            })
        elif ttk_376.get("durum") == "UCTE_IKI_KAYIP":
            actions.append({
                "aksiyon": "Genel Kurul toplantisi hazirla",
                "oncelik": "high",
                "tahmini_sure": "1 saat",
                "kategori": "sermaye",
                "ilgili_hesap": "500",
                "puan_etkisi": self.PUAN_ETKISI.get("ttk_376_bildirim", -5)
            })

        # Ortulu sermaye aksiyonu
        if ortulu_sermaye.get("durum") == "SINIR_UZERINDE":
            actions.append({
                "aksiyon": f"Ortulu sermaye KKEG hesapla ({ortulu_sermaye.get('kkeg_tutari', 0):,.0f} TL)",
                "oncelik": "high",
                "tahmini_sure": "30 dk",
                "kategori": "ortaklar",
                "ilgili_hesap": "331",
                "puan_etkisi": self.PUAN_ETKISI.get("ortulu_sermaye_kkeg", -10)
            })

        # Kategori bazli kritik aksiyonlar
        for cat_id, cat_data in category_analysis.items():
            for aksiyon in cat_data.get("aksiyonlar", [])[:2]:  # Her kategoriden max 2
                if "ACIL" in aksiyon.upper():
                    # Aksiyon tipine göre puan etkisi belirle
                    puan_etkisi = self._get_puan_etkisi_for_aksiyon(aksiyon, cat_id)
                    ilgili_hesap = self._get_ilgili_hesap_for_kategori(cat_id, cat_data)

                    actions.append({
                        "aksiyon": aksiyon.replace("ACIL: ", ""),
                        "oncelik": "high",
                        "tahmini_sure": "20 dk",
                        "kategori": cat_id,
                        "ilgili_hesap": ilgili_hesap,
                        "puan_etkisi": puan_etkisi
                    })

        # KURGAN tetiklenen senaryolar
        for senaryo in kurgan_scenarios:
            if senaryo.get("tetiklendi"):
                for oneri in senaryo.get("oneriler", [])[:1]:
                    # KURGAN senaryoları için puan etkisi risk puanına göre
                    puan_etkisi = -int(senaryo.get("risk_puani", 50) * 0.15)  # %15 kadar düşüş

                    actions.append({
                        "aksiyon": f"{senaryo['senaryo_id']}: {oneri}",
                        "oncelik": "high" if senaryo["aksiyon"] in ["INCELEME", "IZAHA_DAVET"] else "medium",
                        "tahmini_sure": "30 dk",
                        "kategori": "kurgan",
                        "ilgili_hesap": None,
                        "puan_etkisi": puan_etkisi
                    })

        # Sirala ve limitele
        actions.sort(key=lambda x: 0 if x["oncelik"] == "high" else 1)
        actions = actions[:10]  # Max 10 aksiyon

        # Toplam sure hesapla
        toplam_dk = sum(
            int(a["tahmini_sure"].replace(" dk", "").replace(" saat", "").replace(".", "")) *
            (60 if "saat" in a["tahmini_sure"] else 1)
            for a in actions
        )

        # Toplam puan etkisi hesapla
        toplam_puan_etkisi = sum(a.get("puan_etkisi", 0) for a in actions)

        return {
            "count": len(actions),
            "estimated_time": f"{toplam_dk} dakika" if toplam_dk < 60 else f"{toplam_dk//60} saat {toplam_dk%60} dk",
            "items": actions,
            "toplam_puan_etkisi": toplam_puan_etkisi
        }

    def _get_puan_etkisi_for_aksiyon(self, aksiyon: str, kategori: str) -> int:
        """Aksiyon metnine göre puan etkisi döndür"""
        aksiyon_lower = aksiyon.lower()

        if "kasa sayim" in aksiyon_lower or "sayim tutanagi" in aksiyon_lower:
            return self.PUAN_ETKISI.get("kasa_sayim", -12)
        elif "adat" in aksiyon_lower:
            if "kasa" in aksiyon_lower:
                return self.PUAN_ETKISI.get("kasa_adat", -15)
            else:
                return self.PUAN_ETKISI.get("adat_faizi", -18)
        elif "ortulu sermaye" in aksiyon_lower or "kkeg" in aksiyon_lower:
            return self.PUAN_ETKISI.get("ortulu_sermaye_kkeg", -10)
        elif "kmh" in aksiyon_lower or "banka" in aksiyon_lower:
            return self.PUAN_ETKISI.get("banka_kmh", -8)
        elif "stok" in aksiyon_lower:
            return self.PUAN_ETKISI.get("stok_sayim", -10)
        elif "sgk" in aksiyon_lower:
            return self.PUAN_ETKISI.get("sgk_mutabakat", -8)
        elif "kdv" in aksiyon_lower:
            return self.PUAN_ETKISI.get("kdv_beyan_kontrol", -12)
        else:
            return self.PUAN_ETKISI.get("default", -5)

    def _get_ilgili_hesap_for_kategori(self, kategori: str, cat_data: Dict) -> Optional[str]:
        """Kategoriye göre ilgili hesap kodunu döndür"""
        kategori_hesap_map = {
            "likidite": "100",
            "ortaklar": "131",
            "kdv": "190",
            "ticari": "120",
            "vergi_sgk": "360",
            "sermaye": "500",
            "gelir_gider": "642",
            "stok": "153",
            "duran_varlik": "254"
        }

        # Kontrollerde ilk kritik/uyarı hesabını bul
        kontroller = cat_data.get("kontroller", [])
        for k in kontroller:
            if k.get("durum") in ["KRITIK", "UYARI"]:
                return k.get("hesap_kodu")

        return kategori_hesap_map.get(kategori)

    def _create_risk_summary(
        self,
        score: int,
        category_analysis: Dict,
        kurgan_scenarios: List[Dict],
        urgent_actions: Dict
    ) -> Dict:
        """Risk ozeti olustur"""

        # Top risk faktorleri
        top_risks = []
        for cat_id, cat_data in category_analysis.items():
            if cat_data.get("toplam_risk", 0) >= 50:
                top_risks.append(cat_data.get("kategori_adi", cat_id))

        # Tetiklenen KURGAN senaryolari
        tetiklenen = [s for s in kurgan_scenarios if s.get("tetiklendi")]

        # Inceleme olasiligi hesapla
        # NOT: Bu TAHMİNİ bir değerdir, gerçek inceleme olasılığı VDK'nın risk analizine bağlıdır
        # Formül: (100 - Risk Skoru) + (Tetiklenen KURGAN Senaryosu Sayısı × 10)
        # Örnek: Score=88, Tetiklenen=3 → (100-88) + 3×10 = 42
        inceleme_olasiligi = min(95, max(5, 100 - score + len(tetiklenen) * 10))

        # Risk seviyesi
        if inceleme_olasiligi >= 70:
            inceleme_risk = "YUKSEK"
        elif inceleme_olasiligi >= 40:
            inceleme_risk = "ORTA-YUKSEK"
        elif inceleme_olasiligi >= 20:
            inceleme_risk = "ORTA"
        else:
            inceleme_risk = "DUSUK"

        return {
            "total_score": score,
            "trend": None,  # Onceki donem verisi gerekli
            "inspection_probability": inceleme_olasiligi,
            "inspection_probability_formula": f"(100 - {score}) + ({len(tetiklenen)} × 10) = {inceleme_olasiligi}",
            "inspection_probability_note": "Bu tahmini bir değerdir. Gerçek inceleme olasılığı VDK'nın kendi risk analizine bağlıdır.",
            "inspection_risk_level": inceleme_risk,
            "top_risk_factors": top_risks[:3],
            "kurgan_triggered_count": len(tetiklenen),
            "urgent_action_count": urgent_actions.get("count", 0)
        }

    def calculate_potential_penalties(
        self,
        category_analysis: Dict,
        ortulu_sermaye: Optional[Dict] = None,
        ttk_376: Optional[Dict] = None
    ) -> Dict:
        """
        Muhtemel VDK tespit ve cezalarını hesapla

        Her risk kategorisi için:
        - Matrah farkı tahmini
        - Vergi hesabı
        - VZC (Vergi Ziyaı Cezası) %50
        - Gecikme faizi (tahmini 12 ay)
        - Toplam risk tutarı
        """
        tespitler = []
        toplam_matrah_farki = 0
        toplam_vergi = 0
        toplam_vzc = 0
        toplam_gecikme = 0

        # Kategori bazlı tespit ve ceza hesaplamaları
        for cat_id, cat_data in category_analysis.items():
            kontroller = cat_data.get("kontroller", [])

            for kontrol in kontroller:
                if kontrol.get("durum") not in ["KRITIK", "UYARI"]:
                    continue

                hesap_kodu = kontrol.get("hesap_kodu", "")
                deger = kontrol.get("deger", 0)
                kontrol_adi = kontrol.get("kontrol_adi", "")

                tespit = self._calculate_single_penalty(
                    hesap_kodu, kontrol_adi, deger, kontrol
                )

                if tespit:
                    tespitler.append(tespit)
                    toplam_matrah_farki += tespit.get("matrah_farki", 0)
                    toplam_vergi += tespit.get("vergi", 0)
                    toplam_vzc += tespit.get("vzc", 0)
                    toplam_gecikme += tespit.get("gecikme_faizi", 0)

        # Örtülü sermaye cezası
        if ortulu_sermaye and ortulu_sermaye.get("durum") == "SINIR_UZERINDE":
            kkeg = ortulu_sermaye.get("kkeg_tutari", 0)
            if kkeg > 0:
                vergi = kkeg * self.CEZA_ORANLARI["kurumlar_vergisi"]
                vzc = vergi * self.CEZA_ORANLARI["vergi_ziyai_cezasi"]
                gecikme = vergi * self.CEZA_ORANLARI["gecikme_faizi_aylik"] * 12

                tespitler.append({
                    "baslik": "Örtülü Sermaye (KVK 12)",
                    "aciklama": "İlişkili kişilerden alınan borçlardaki faiz/kur farkı KKEG",
                    "hesap_kodu": "331",
                    "matrah_farki": kkeg,
                    "vergi": vergi,
                    "vzc": vzc,
                    "gecikme_faizi": gecikme,
                    "toplam": vergi + vzc + gecikme,
                    "mevzuat_ref": ["KVK 12", "KVK 11/1-b"]
                })
                toplam_matrah_farki += kkeg
                toplam_vergi += vergi
                toplam_vzc += vzc
                toplam_gecikme += gecikme

        # Sırala (toplam tutara göre azalan)
        tespitler.sort(key=lambda x: x.get("toplam", 0), reverse=True)

        return {
            "tespitler": tespitler[:5],  # En kritik 5 tespit
            "toplam_matrah_farki": toplam_matrah_farki,
            "toplam_vergi": toplam_vergi,
            "toplam_vzc": toplam_vzc,
            "toplam_gecikme_faizi": toplam_gecikme,
            "genel_toplam": toplam_vergi + toplam_vzc + toplam_gecikme,
            "uyari": "Bu tutarlar tahmini olup, gerçek inceleme sonuçları farklı olabilir."
        }

    def _calculate_single_penalty(
        self,
        hesap_kodu: str,
        kontrol_adi: str,
        deger: float,
        kontrol: Dict
    ) -> Optional[Dict]:
        """Tek bir kontrol için ceza hesapla"""

        # 100 - Kasa şişkinliği / Adat faizi eksikliği
        if hesap_kodu == "100" and "Siskinlik" in kontrol_adi:
            # Kasa şişkinliği genelde adat faizi eksikliği olarak değerlendirilir
            # Önce raw_bakiye'den al (güvenilir), yoksa aciklama'dan parse et
            kasa_bakiye = kontrol.get("raw_bakiye", 0)
            if kasa_bakiye == 0:
                aciklama = kontrol.get("aciklama", "")
                try:
                    kasa_bakiye = float(aciklama.split("Kasa bakiyesi: ")[1].split(" TL")[0].replace(",", "").replace(".", ""))
                except:
                    # Son çare: deger yüzde ise aktif toplamdan hesapla
                    raw_aktif = kontrol.get("raw_aktif", 0)
                    if raw_aktif > 0 and deger > 0:
                        kasa_bakiye = raw_aktif * (deger / 100)
                    else:
                        kasa_bakiye = 0

            if kasa_bakiye > 50000:
                # Adat faizi matrah farkı: kasa bakiyesi * TCMB faizi (yıllık ~%45) * 6 ay
                adat_matrah = kasa_bakiye * 0.45 * 0.5  # 6 aylık tahmini
                vergi = adat_matrah * self.CEZA_ORANLARI["kurumlar_vergisi"]
                vzc = vergi * self.CEZA_ORANLARI["vergi_ziyai_cezasi"]
                gecikme = vergi * self.CEZA_ORANLARI["gecikme_faizi_aylik"] * 12

                return {
                    "baslik": "Kasa Adat Faizi Eksikliği",
                    "aciklama": f"Yüksek kasa bakiyesi ({kasa_bakiye:,.0f} TL) için adat faizi hesaplanmamış",
                    "hesap_kodu": "100",
                    "matrah_farki": adat_matrah,
                    "vergi": vergi,
                    "vzc": vzc,
                    "gecikme_faizi": gecikme,
                    "toplam": vergi + vzc + gecikme,
                    "mevzuat_ref": ["VUK 134", "KVK 13"]
                }

        # 131 - Ortaklardan alacaklar adat faizi
        if hesap_kodu == "131" and "Adat" in kontrol_adi:
            # Önce raw_bakiye'den al (güvenilir), yoksa aciklama'dan parse et
            alacak = kontrol.get("raw_bakiye", 0)
            if alacak == 0:
                aciklama = kontrol.get("aciklama", "")
                try:
                    alacak = float(aciklama.split("Ortaklardan alacak: ")[1].split(" TL")[0].replace(",", "").replace(".", ""))
                except:
                    alacak = 0

            if alacak > 0:
                # Adat matrah farkı: alacak * TCMB faizi * 1 yıl
                adat_matrah = alacak * 0.45
                vergi = adat_matrah * self.CEZA_ORANLARI["kurumlar_vergisi"]
                vzc = vergi * self.CEZA_ORANLARI["vergi_ziyai_cezasi"]
                gecikme = vergi * self.CEZA_ORANLARI["gecikme_faizi_aylik"] * 12

                return {
                    "baslik": "Ortaklardan Alacaklar Adat Faizi",
                    "aciklama": f"131 hesaptaki {alacak:,.0f} TL için emsal faiz hesaplanmamış",
                    "hesap_kodu": "131",
                    "matrah_farki": adat_matrah,
                    "vergi": vergi,
                    "vzc": vzc,
                    "gecikme_faizi": gecikme,
                    "toplam": vergi + vzc + gecikme,
                    "mevzuat_ref": ["KVK 13", "TTK 358", "Transfer Fiyatlandırması Tebliği"]
                }

        # 190 - Devreden KDV (potansiyel KDV reddi)
        if hesap_kodu == "190":
            # Devreden KDV genellikle matrah farkı değil, ancak riskli
            return None  # KDV için ayrı hesaplama gerekli

        # Default: Kritik durumlarda basit hesaplama
        if kontrol.get("durum") == "KRITIK" and deger > 0:
            # Basit tahmini matrah (değerin %10'u)
            tahmini_matrah = deger * 0.1
            if tahmini_matrah < 10000:
                return None  # Çok küçük tutarları gösterme

            vergi = tahmini_matrah * self.CEZA_ORANLARI["kurumlar_vergisi"]
            vzc = vergi * self.CEZA_ORANLARI["vergi_ziyai_cezasi"]
            gecikme = vergi * self.CEZA_ORANLARI["gecikme_faizi_aylik"] * 12

            return {
                "baslik": kontrol_adi,
                "aciklama": kontrol.get("aciklama", ""),
                "hesap_kodu": hesap_kodu,
                "matrah_farki": tahmini_matrah,
                "vergi": vergi,
                "vzc": vzc,
                "gecikme_faizi": gecikme,
                "toplam": vergi + vzc + gecikme,
                "mevzuat_ref": kontrol.get("mevzuat_ref", [])
            }

        return None

    # =========================================================================
    # LEGACY METODLAR (Geriye Uyumluluk)
    # =========================================================================

    def _extract_criteria(
        self,
        portfolio_data: Dict,
        e_fatura_data: Optional[Dict],
        banka_data: Optional[Dict],
        sgk_data: Optional[Dict]
    ) -> KurganCriteria:
        """Portfolio verisinden KURGAN kriterlerini cikar (Legacy)"""
        criteria = KurganCriteria()

        criteria.surekli_zarar = self._check_surekli_zarar(portfolio_data)
        criteria.devreden_kdv_yuksek = self._check_devreden_kdv(portfolio_data)
        criteria.dusuk_vergi_beyani = self._check_dusuk_vergi(portfolio_data)

        if criteria.surekli_zarar and criteria.devreden_kdv_yuksek and criteria.dusuk_vergi_beyani:
            criteria.vergiye_uyum_score = 20
        elif criteria.surekli_zarar or criteria.devreden_kdv_yuksek or criteria.dusuk_vergi_beyani:
            criteria.vergiye_uyum_score = 50
        else:
            criteria.vergiye_uyum_score = 100

        if e_fatura_data:
            criteria.e_imza_gap_days = e_fatura_data.get("timing_gap_days", 0)
            criteria.e_imza_uyumu = criteria.e_imza_gap_days < 30

        if banka_data:
            mevduat = banka_data.get("mevduat_tutari", 0)
            ciro = portfolio_data.get("ciro", 1)
            if ciro > 0 and mevduat < ciro * 0.01:
                criteria.odeme_seffafligi_score = 50
                criteria.fiktif_odeme_riski = True
            criteria.dbs_kullanimi = banka_data.get("dbs_kullanimi", False)
            if not criteria.dbs_kullanimi:
                criteria.odeme_seffafligi_score = max(0, criteria.odeme_seffafligi_score - 20)

        criteria.gecmis_inceleme_var = portfolio_data.get("gecmis_inceleme", False)
        criteria.smiyb_gecmisi_var = portfolio_data.get("smiyb_gecmisi", False)
        criteria.ortak_gecmisi_temiz = portfolio_data.get("ortak_gecmisi_temiz", True)

        return criteria

    def _check_surekli_zarar(self, portfolio_data: Dict) -> bool:
        zarar_sayisi = portfolio_data.get("zarar_donem_sayisi", 0)
        return zarar_sayisi >= 3

    def _check_devreden_kdv(self, portfolio_data: Dict) -> bool:
        devreden_kdv = portfolio_data.get("devreden_kdv", 0)
        sektor_ortalama = portfolio_data.get("sektor_devreden_kdv_ortalama", 100000)
        if sektor_ortalama <= 0:
            return False
        return devreden_kdv > sektor_ortalama * 1.5

    def _check_dusuk_vergi(self, portfolio_data: Dict) -> bool:
        toplam_vergi = portfolio_data.get("toplam_vergi_beyani", 0)
        ciro = portfolio_data.get("ciro", 1)
        if ciro <= 0:
            return False
        return toplam_vergi < ciro * 0.01

    def _calculate_risk_score(self, criteria: KurganCriteria) -> Tuple[int, List[str], List[str]]:
        score = 100
        warnings: List[str] = []
        action_items: List[str] = []

        if criteria.vergiye_uyum_score < 70:
            penalty = int(self.WEIGHTS["vergiye_uyum"] * (100 - criteria.vergiye_uyum_score) / 100)
            score -= penalty
            if criteria.surekli_zarar:
                warnings.append("Surekli zarar beyani - KURGAN riski yuksek")
                action_items.append("Zarar nedenini belgeleyin")
            if criteria.devreden_kdv_yuksek:
                warnings.append("Yuksek devreden KDV - KURGAN riski yuksek")
                action_items.append("KDV iade talebini belgelerle destekleyin")
            if criteria.dusuk_vergi_beyani:
                warnings.append("Dusuk vergi beyani - KURGAN riski yuksek")
                action_items.append("Vergi beyanlarini gozden gecirin")

        if criteria.odeme_seffafligi_score < 80:
            penalty = int(self.WEIGHTS["odeme_seffafligi"] * (100 - criteria.odeme_seffafligi_score) / 100)
            score -= penalty
            if criteria.fiktif_odeme_riski:
                warnings.append("Fiktif odeme riski - Banka mevduati cok dusuk")
                action_items.append("Ödemeleri belgeleyin")
            if not criteria.dbs_kullanimi:
                warnings.append("DBS kullanilmiyor")
                action_items.append("DBS kullanimini tercih edin")

        if not criteria.sevkiyat_belgeleri:
            score -= self.WEIGHTS["sevkiyat"]
            warnings.append("Sevkiyat belgeleri eksik")
            action_items.append("Irsaliye, plaka takip belgelerini temin edin")

        if not criteria.e_imza_uyumu:
            score -= self.WEIGHTS["e_imza_uyumu"]
            warnings.append(f"E-fatura timing gap: {criteria.e_imza_gap_days} gun")
            action_items.append("E-fatura tarihlerini kontrol edin")

        if criteria.smiyb_gecmisi_var:
            score -= self.WEIGHTS["gecmis_inceleme"]
            warnings.append("KRITIK: Daha once SMiYB tespiti VAR!")
            action_items.append("Onceki inceleme raporlarini inceleyin")
        elif criteria.gecmis_inceleme_var:
            score -= self.WEIGHTS["gecmis_inceleme"] // 2
            warnings.append("Daha once vergi incelemesi yapilmis")

        if not criteria.ortak_gecmisi_temiz:
            score -= self.WEIGHTS["ortak_gecmisi"]
            warnings.append("Ortak/yoneticilerin SMiYB gecmisi VAR")
            action_items.append("Ortak gecmisini arastirin")

        score = max(0, min(100, score))
        return score, warnings, action_items

    def _determine_risk_level(self, score: int) -> str:
        if score >= 80:
            return "Dusuk"
        elif score >= 60:
            return "Orta"
        elif score >= 40:
            return "Yuksek"
        else:
            return "KRITIK"

    def _get_criteria_scores(self, criteria: KurganCriteria) -> Dict[str, int]:
        return {
            "vergiye_uyum": criteria.vergiye_uyum_score,
            "odeme_seffafligi": criteria.odeme_seffafligi_score,
            "sevkiyat": 100 if criteria.sevkiyat_belgeleri else 0,
            "e_imza_uyumu": 100 if criteria.e_imza_uyumu else 50,
            "gecmis_inceleme": 0 if criteria.smiyb_gecmisi_var else (50 if criteria.gecmis_inceleme_var else 100),
            "ortak_gecmisi": 100 if criteria.ortak_gecmisi_temiz else 0
        }


# Singleton instance
kurgan_calculator = KurganCalculator()
