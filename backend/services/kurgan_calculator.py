"""
KURGAN Risk Calculator Service

VDK Genelgesi (18.04.2025, E-55935724-010.06-7361) bazli
13 kriter risk analizi.

Mali Milat: 1 Ekim 2025
"""

from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@dataclass
class KurganCriteria:
    """13 KURGAN kriteri icin veri yapisi"""

    # Kriter 1: Faaliyet Konusu
    faaliyet_uyumu: bool = True
    faaliyet_uyum_score: int = 100

    # Kriter 2: Organik Temasli Kisi
    organik_temas: bool = False

    # Kriter 3: Atif
    atif_var: bool = False

    # Kriter 4: Vergiye Uyum (KRITIK!)
    vergiye_uyum_score: int = 100
    surekli_zarar: bool = False
    devreden_kdv_yuksek: bool = False
    dusuk_vergi_beyani: bool = False

    # Kriter 5: Devamlilik
    devamlilik_var: bool = False
    tekrar_alim_sayisi: int = 0

    # Kriter 6: Iliskili Kisi
    iliskili_kisi_var: bool = False
    ayni_smmm: bool = False

    # Kriter 7: Depolama
    depolama_kapasitesi: bool = True

    # Kriter 8: E-imza Uyumu
    e_imza_uyumu: bool = True
    e_imza_gap_days: int = 0

    # Kriter 9: Emtia Tespiti
    emtia_tespiti_var: bool = False

    # Kriter 10: Sevkiyat
    sevkiyat_belgeleri: bool = True
    irsaliye_var: bool = True
    plaka_takip: bool = True

    # Kriter 11: Odeme (KRITIK!)
    odeme_seffafligi_score: int = 100
    fiktif_odeme_riski: bool = False
    cek_ciro_karmasik: bool = False
    dbs_kullanimi: bool = True

    # Kriter 12: Gecmis Inceleme
    gecmis_inceleme_var: bool = False
    smiyb_gecmisi_var: bool = False

    # Kriter 13: Ortak Gecmisi
    ortak_gecmisi_temiz: bool = True


@dataclass
class KurganRiskResult:
    """KURGAN risk analizi sonucu"""

    score: int  # 0-100
    risk_level: str  # "Dusuk", "Orta", "Yuksek", "KRITIK"
    warnings: List[str]
    action_items: List[str]
    criteria_scores: Dict[str, int]
    criteria_details: Dict[str, bool]
    vdk_reference: str = "E-55935724-010.06-7361"
    effective_date: str = "2025-10-01"
    calculated_at: str = ""

    def __post_init__(self):
        if not self.calculated_at:
            self.calculated_at = datetime.utcnow().isoformat() + "Z"


class KurganCalculator:
    """KURGAN 13 kriter bazli risk hesaplayici"""

    # Kriter agirliklari (toplam 100)
    WEIGHTS: Dict[str, int] = {
        "vergiye_uyum": 25,
        "odeme_seffafligi": 20,
        "sevkiyat": 10,
        "e_imza_uyumu": 10,
        "gecmis_inceleme": 15,
        "ortak_gecmisi": 10,
        "diger": 10
    }

    def __init__(self) -> None:
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    def calculate(
        self,
        portfolio_data: Dict,
        e_fatura_data: Optional[Dict] = None,
        banka_data: Optional[Dict] = None,
        sgk_data: Optional[Dict] = None
    ) -> KurganRiskResult:
        """
        KURGAN 13 kriter bazli risk skoru hesaplar

        Args:
            portfolio_data: Portfolio verileri (beyan, bilanco, gelir tablosu)
            e_fatura_data: E-fatura verileri (timing, muhteviyat)
            banka_data: Banka verileri (mevduat, krediler)
            sgk_data: SGK verileri (bordro, sigorta)

        Returns:
            KurganRiskResult: Risk skoru ve detaylari

        Raises:
            ValueError: Gecersiz portfolio_data durumunda
        """
        try:
            self.logger.info("KURGAN risk hesaplamasi basladi")

            if not portfolio_data:
                raise ValueError("portfolio_data bos olamaz")

            # Kriterleri extract et
            criteria = self._extract_criteria(
                portfolio_data, e_fatura_data, banka_data, sgk_data
            )

            # Risk skorunu hesapla
            score, warnings, action_items = self._calculate_risk_score(criteria)

            # Risk seviyesini belirle
            risk_level = self._determine_risk_level(score)

            # Kriter skorlarini hazirla
            criteria_scores = self._get_criteria_scores(criteria)

            result = KurganRiskResult(
                score=score,
                risk_level=risk_level,
                warnings=warnings,
                action_items=action_items,
                criteria_scores=criteria_scores,
                criteria_details=asdict(criteria)
            )

            self.logger.info(f"KURGAN risk hesaplandi: {score}/100 - {risk_level}")
            return result

        except Exception as e:
            self.logger.error(f"KURGAN hesaplama hatasi: {e}", exc_info=True)
            raise

    def _extract_criteria(
        self,
        portfolio_data: Dict,
        e_fatura_data: Optional[Dict],
        banka_data: Optional[Dict],
        sgk_data: Optional[Dict]
    ) -> KurganCriteria:
        """Portfolio verisinden KURGAN kriterlerini cikar"""

        criteria = KurganCriteria()

        # Kriter 4: Vergiye Uyum (EN KRITIK!)
        criteria.surekli_zarar = self._check_surekli_zarar(portfolio_data)
        criteria.devreden_kdv_yuksek = self._check_devreden_kdv(portfolio_data)
        criteria.dusuk_vergi_beyani = self._check_dusuk_vergi(portfolio_data)

        if criteria.surekli_zarar and criteria.devreden_kdv_yuksek and criteria.dusuk_vergi_beyani:
            criteria.vergiye_uyum_score = 20  # Cok dusuk
        elif criteria.surekli_zarar or criteria.devreden_kdv_yuksek or criteria.dusuk_vergi_beyani:
            criteria.vergiye_uyum_score = 50  # Dusuk
        elif criteria.surekli_zarar or criteria.devreden_kdv_yuksek:
            criteria.vergiye_uyum_score = 70  # Orta
        else:
            criteria.vergiye_uyum_score = 100  # Yuksek

        # Kriter 8: E-imza Uyumu
        if e_fatura_data:
            criteria.e_imza_gap_days = e_fatura_data.get("timing_gap_days", 0)
            criteria.e_imza_uyumu = criteria.e_imza_gap_days < 30

        # Kriter 11: Odeme (KRITIK!)
        if banka_data:
            mevduat = banka_data.get("mevduat_tutari", 0)
            ciro = portfolio_data.get("ciro", 1)

            # Mevduat cok dusukse supheli
            if ciro > 0 and mevduat < ciro * 0.01:
                criteria.odeme_seffafligi_score = 50
                criteria.fiktif_odeme_riski = True

            # DBS kullanimi kontrol et
            criteria.dbs_kullanimi = banka_data.get("dbs_kullanimi", False)
            if not criteria.dbs_kullanimi:
                criteria.odeme_seffafligi_score = max(0, criteria.odeme_seffafligi_score - 20)

        # Kriter 12: Gecmis Inceleme
        criteria.gecmis_inceleme_var = portfolio_data.get("gecmis_inceleme", False)
        criteria.smiyb_gecmisi_var = portfolio_data.get("smiyb_gecmisi", False)

        # Kriter 13: Ortak Gecmisi
        criteria.ortak_gecmisi_temiz = portfolio_data.get("ortak_gecmisi_temiz", True)

        return criteria

    def _check_surekli_zarar(self, portfolio_data: Dict) -> bool:
        """Surekli zarar beyani kontrolu (son 3 donem)"""
        zarar_sayisi = portfolio_data.get("zarar_donem_sayisi", 0)
        return zarar_sayisi >= 3

    def _check_devreden_kdv(self, portfolio_data: Dict) -> bool:
        """Yuksek devreden KDV kontrolu (sektor ortalamasinin 1.5x ustu)"""
        devreden_kdv = portfolio_data.get("devreden_kdv", 0)
        sektor_ortalama = portfolio_data.get("sektor_devreden_kdv_ortalama", 100000)

        if sektor_ortalama <= 0:
            return False
        return devreden_kdv > sektor_ortalama * 1.5

    def _check_dusuk_vergi(self, portfolio_data: Dict) -> bool:
        """Dusuk vergi beyani kontrolu (cironun %1'inden az)"""
        toplam_vergi = portfolio_data.get("toplam_vergi_beyani", 0)
        ciro = portfolio_data.get("ciro", 1)

        if ciro <= 0:
            return False
        return toplam_vergi < ciro * 0.01

    def _calculate_risk_score(
        self,
        criteria: KurganCriteria
    ) -> Tuple[int, List[str], List[str]]:
        """Risk skorunu hesapla, uyari ve aksiyonlari uret"""

        score = 100
        warnings: List[str] = []
        action_items: List[str] = []

        # Kriter 4: Vergiye Uyum (-25 puan max)
        if criteria.vergiye_uyum_score < 70:
            penalty = int(self.WEIGHTS["vergiye_uyum"] * (100 - criteria.vergiye_uyum_score) / 100)
            score -= penalty

            if criteria.surekli_zarar:
                warnings.append("Surekli zarar beyani - KURGAN riski yuksek")
                action_items.append("Zarar nedenini belgeleyin (sektor analizi, pazar kosullari)")

            if criteria.devreden_kdv_yuksek:
                warnings.append("Yuksek devreden KDV - KURGAN riski yuksek")
                action_items.append("KDV iade talebini belgelerle destekleyin")

            if criteria.dusuk_vergi_beyani:
                warnings.append("Dusuk vergi beyani - KURGAN riski yuksek")
                action_items.append("Vergi beyanlarini gozden gecirin")

        # Kriter 11: Odeme (-20 puan max)
        if criteria.odeme_seffafligi_score < 80:
            penalty = int(self.WEIGHTS["odeme_seffafligi"] * (100 - criteria.odeme_seffafligi_score) / 100)
            score -= penalty

            if criteria.fiktif_odeme_riski:
                warnings.append("Fiktif odeme riski - Banka mevduati cok dusuk")
                action_items.append("Banka hesap ozetlerini kontrol edin, odemeleri belgeleyin")

            if not criteria.dbs_kullanimi:
                warnings.append("DBS (Dogrudan Borclanma Sistemi) kullanilmiyor")
                action_items.append("Odemelerde DBS kullanimini tercih edin")

        # Kriter 10: Sevkiyat (-10 puan max)
        if not criteria.sevkiyat_belgeleri:
            score -= self.WEIGHTS["sevkiyat"]
            warnings.append("Sevkiyat belgeleri eksik")
            action_items.append("Irsaliye, plaka takip, guzergah belgelerini temin edin")

        # Kriter 8: E-imza Uyumu (-10 puan max)
        if not criteria.e_imza_uyumu:
            score -= self.WEIGHTS["e_imza_uyumu"]
            warnings.append(f"E-fatura timing gap: {criteria.e_imza_gap_days} gun")
            action_items.append("E-fatura duzenleme ve e-imza tarihlerini kontrol edin")

        # Kriter 12: Gecmis Inceleme (-15 puan max)
        if criteria.smiyb_gecmisi_var:
            score -= self.WEIGHTS["gecmis_inceleme"]
            warnings.append("KRITIK: Daha once SMiYB tespiti VAR!")
            action_items.append("Onceki inceleme raporlarini inceleyin, ayni hatayi tekrarlamayin")
        elif criteria.gecmis_inceleme_var:
            score -= self.WEIGHTS["gecmis_inceleme"] // 2
            warnings.append("Daha once vergi incelemesi yapilmis")
            action_items.append("Inceleme sonuclarini gozden gecirin")

        # Kriter 13: Ortak Gecmisi (-10 puan max)
        if not criteria.ortak_gecmisi_temiz:
            score -= self.WEIGHTS["ortak_gecmisi"]
            warnings.append("Ortak/yoneticilerin SMiYB gecmisi VAR")
            action_items.append("Ortak/yonetici gecmisini detayli arastirin")

        # Skoru 0-100 araliginda tut
        score = max(0, min(100, score))

        return score, warnings, action_items

    def _determine_risk_level(self, score: int) -> str:
        """Risk seviyesini belirle"""
        if score >= 80:
            return "Dusuk"
        elif score >= 60:
            return "Orta"
        elif score >= 40:
            return "Yuksek"
        else:
            return "KRITIK"

    def _get_criteria_scores(self, criteria: KurganCriteria) -> Dict[str, int]:
        """Kriter bazli skorlari dondur"""
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
