"""
KURGAN Risk Calculator — Veri Modelleri

P-11: kurgan_calculator.py'den çıkarıldı (dosya bölme).
Dataclass tanımları burada merkezi olarak yönetilir.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime


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
    muhtemel_cezalar: Optional[Dict] = None
    mukellef_finansal_oranlari: Optional[Dict] = None

    def __post_init__(self):
        if not self.calculated_at:
            self.calculated_at = datetime.utcnow().isoformat() + "Z"
