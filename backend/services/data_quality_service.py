"""
Data Quality Service

SMMM'lere actionable warnings ve email templates uretir.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


@dataclass
class Action:
    """Actionable warning/error"""
    id: str
    severity: str  # "ERROR", "WARNING", "INFO"
    title: str
    description: str
    action: str
    smmm_button: str
    email_template: Optional[Dict[str, str]] = None
    checklist_url: Optional[str] = None
    deadline: Optional[str] = None
    kurgan_impact: Optional[str] = None


@dataclass
class DataQualityReport:
    """Data quality rapor sonucu"""
    completeness_score: int
    actions: List[Dict]
    total_errors: int
    total_warnings: int
    total_info: int = 0
    generated_at: str = ""

    def __post_init__(self):
        if not self.generated_at:
            from datetime import datetime
            self.generated_at = datetime.utcnow().isoformat() + "Z"


class DataQualityService:
    """Data quality ve actionable warnings uretici"""

    # Gerekli enflasyon CSV'leri
    REQUIRED_INFLATION_CSVS: List[str] = [
        "fixed_asset_register.csv",
        "stock_movement.csv",
        "equity_breakdown.csv"
    ]

    def __init__(self) -> None:
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    def generate_report(
        self,
        portfolio_data: Dict,
        kurgan_result: Optional[Dict] = None
    ) -> DataQualityReport:
        """
        SMMM'lere AKSIYON bazli data quality raporu uret

        Args:
            portfolio_data: Portfolio verileri
            kurgan_result: KURGAN risk analizi sonucu (opsiyonel)

        Returns:
            DataQualityReport: Completeness score ve action listesi

        Raises:
            ValueError: Gecersiz portfolio_data durumunda
        """
        try:
            self.logger.info("Data quality raporu olusturuluyor")

            if not portfolio_data:
                raise ValueError("portfolio_data bos olamaz")

            actions: List[Action] = []

            # 1. Enflasyon paketi kontrolu
            inflation_actions = self._check_inflation_package(portfolio_data)
            actions.extend(inflation_actions)

            # 2. KURGAN risk faktorleri
            if kurgan_result:
                kurgan_actions = self._check_kurgan_risks(kurgan_result)
                actions.extend(kurgan_actions)

            # 3. Banka verisi uyumsuzlugu
            banka_actions = self._check_banka_data(portfolio_data)
            actions.extend(banka_actions)

            # 4. KDV uyumsuzluklari
            kdv_actions = self._check_kdv_issues(portfolio_data)
            actions.extend(kdv_actions)

            # Completeness score hesapla
            completeness = self._calculate_completeness(portfolio_data, actions)

            # Error/warning sayilari
            total_errors = sum(1 for a in actions if a.severity == "ERROR")
            total_warnings = sum(1 for a in actions if a.severity == "WARNING")
            total_info = sum(1 for a in actions if a.severity == "INFO")

            self.logger.info(
                f"Data quality raporu hazir: {completeness}% complete, "
                f"{total_errors} errors, {total_warnings} warnings"
            )

            return DataQualityReport(
                completeness_score=completeness,
                actions=[self._action_to_dict(a) for a in actions],
                total_errors=total_errors,
                total_warnings=total_warnings,
                total_info=total_info
            )

        except Exception as e:
            self.logger.error(f"Data quality rapor hatasi: {e}", exc_info=True)
            raise

    def _action_to_dict(self, action: Action) -> Dict:
        """Action dataclass'i dict'e cevir"""
        return {
            "id": action.id,
            "severity": action.severity,
            "title": action.title,
            "description": action.description,
            "action": action.action,
            "smmm_button": action.smmm_button,
            "email_template": action.email_template,
            "checklist_url": action.checklist_url,
            "deadline": action.deadline,
            "kurgan_impact": action.kurgan_impact
        }

    def _check_inflation_package(self, portfolio_data: Dict) -> List[Action]:
        """Enflasyon paketi eksikliklerini kontrol et"""

        actions: List[Action] = []
        missing_csvs: List[str] = []

        inflation_data = portfolio_data.get("inflation_data", {})

        for csv in self.REQUIRED_INFLATION_CSVS:
            if not inflation_data.get(csv):
                missing_csvs.append(csv)

        if missing_csvs:
            client_name = portfolio_data.get("client_name", "Musteri")
            period = portfolio_data.get("period", "2025-Q2")
            smmm_name = portfolio_data.get("smmm_name", "SMMM")

            csv_list = "\n".join([f"  - {csv}" for csv in missing_csvs])

            actions.append(Action(
                id="INFL_MISSING_CSV",
                severity="ERROR",
                title=f"Enflasyon Kanit Paketi: {len(missing_csvs)} CSV eksik",
                description=f"Eksik dosyalar:\n{csv_list}",
                action="Client'a email gonderin ve CSV'leri talep edin",
                smmm_button="Email Sablonu Ac",
                email_template={
                    "subject": f"[ACIL] Enflasyon Paketi Eksik CSV - {client_name} - {period}",
                    "body": f"""Sayin {client_name} Yetkilisi,

{period} donemi enflasyon muhasebesi duzeltmesi icin asagidaki CSV dosyalarina acil ihtiyacimiz bulunmaktadir:

{chr(10).join([f'- {csv}' for csv in missing_csvs])}

Bu dosyalar olmadan:
- Enflasyon duzeltmesi yapilamaz
- Compliance seviyesi (B) hedefine ulasilamaz
- Vergi beyanlarinda eksiklik olusur

Lutfen en gec 3 is gunu icerisinde temin ediniz.

CSV sablonlarini ekte bulabilirsiniz.

Saygilarimla,
{smmm_name}
SMMM
""",
                    "attachments": ["CSV_Sablonlari.zip"]
                },
                deadline="3 is gunu",
                kurgan_impact="Orta (Veri eksikligi -> risk artisi)"
            ))

        return actions

    def _check_kurgan_risks(self, kurgan_result: Dict) -> List[Action]:
        """KURGAN risk faktorlerini kontrol et"""

        actions: List[Action] = []

        score = kurgan_result.get("score", 100)
        risk_level = kurgan_result.get("risk_level", "Dusuk")
        warnings = kurgan_result.get("warnings", [])

        if score < 60:
            severity = "WARNING" if score >= 40 else "ERROR"
            warning_text = "\n".join([f"  - {w}" for w in warnings[:3]]) if warnings else "Detay yok"

            actions.append(Action(
                id="KURGAN_RISK_HIGH",
                severity=severity,
                title=f"KURGAN Risk: {risk_level} ({score}/100)",
                description=f"Tespit edilen sorunlar:\n{warning_text}",
                action="13 Kriter kontrol listesini doldurun ve gerekli onlemleri alin",
                smmm_button="Kontrol Listesini Indir",
                checklist_url="/static/kurgan-checklist.pdf",
                deadline="Yuksek oncelik",
                kurgan_impact="Yuksek (Inceleme riski)"
            ))

        return actions

    def _check_banka_data(self, portfolio_data: Dict) -> List[Action]:
        """Banka verisi uyumsuzluklarini kontrol et"""

        actions: List[Action] = []

        banka_data = portfolio_data.get("banka_data", {})
        if not banka_data:
            return actions

        mevduat = banka_data.get("mevduat_tutari", 0)
        ciro = portfolio_data.get("ciro", 1)

        # Banka mevduati cok dusukse
        if ciro > 0 and mevduat < ciro * 0.01:
            actions.append(Action(
                id="BANK_DATA_LOW",
                severity="WARNING",
                title="Banka mevduati cironun %1'inden az",
                description=f"Mevduat: {mevduat:,.0f} TL, Ciro: {ciro:,.0f} TL\nKURGAN Kriter 19: Mali yapi analizi uyumsuzlugu tespit edildi",
                action="Banka hesap ozetlerini kontrol edin, nakit akisini belgeleyin",
                smmm_button="Detay Gor",
                kurgan_impact="Orta"
            ))

        # Yuksek kredi + yuksek mevduat (mantiksiz)
        kredi = banka_data.get("kredi_tutari", 0)
        if ciro > 0 and kredi > ciro * 0.5 and mevduat > ciro * 0.3:
            actions.append(Action(
                id="BANK_INCONSISTENT",
                severity="WARNING",
                title="Yuksek kredi + yuksek mevduat (mantiksiz)",
                description=f"Kredi: {kredi:,.0f} TL, Mevduat: {mevduat:,.0f} TL\nKURGAN risk faktoru: Finansman giderleri yuksek olmasina ragmen yuksek mevduat",
                action="Kredi kullanim gerekcesini belgeleyin",
                smmm_button="Analiz Et",
                kurgan_impact="Dusuk"
            ))

        return actions

    def _check_kdv_issues(self, portfolio_data: Dict) -> List[Action]:
        """KDV uyumsuzluklarini kontrol et"""

        actions: List[Action] = []

        kdv_data = portfolio_data.get("kdv_data", {})
        devreden_kdv = kdv_data.get("devreden_kdv", 0)
        sektor_ortalama = portfolio_data.get("sektor_devreden_kdv_ortalama", 100000)

        # Surekli devreden KDV
        if sektor_ortalama > 0 and devreden_kdv > sektor_ortalama * 1.5:
            actions.append(Action(
                id="KDV_HIGH_DEFERRED",
                severity="WARNING",
                title="Yuksek devreden KDV tespit edildi",
                description=f"Devreden KDV: {devreden_kdv:,.0f} TL\nSektor ortalamasi: {sektor_ortalama:,.0f} TL\nOran: {devreden_kdv/sektor_ortalama:.1f}x",
                action="KDV iade talebini belgelerle destekleyin, ihracat/istisna islemleri",
                smmm_button="KDV Analizi",
                kurgan_impact="Yuksek"
            ))

        return actions

    def _calculate_completeness(
        self,
        portfolio_data: Dict,
        actions: List[Action]
    ) -> int:
        """Data completeness skorunu hesapla (0-100)"""

        # Toplam veri alanlari
        total_fields = 20

        # Mevcut veri alanlari
        present_fields = 0

        if portfolio_data.get("ciro"):
            present_fields += 1
        if portfolio_data.get("kar_zarar") is not None:
            present_fields += 1
        if portfolio_data.get("banka_data"):
            present_fields += 2
        if portfolio_data.get("kdv_data"):
            present_fields += 2

        inflation_data = portfolio_data.get("inflation_data", {})
        if inflation_data:
            inflation_csvs = len([
                csv for csv in self.REQUIRED_INFLATION_CSVS
                if inflation_data.get(csv)
            ])
            present_fields += inflation_csvs * 2

        # Diger alanlar
        if portfolio_data.get("client_name"):
            present_fields += 1
        if portfolio_data.get("period"):
            present_fields += 1
        if portfolio_data.get("smmm_name"):
            present_fields += 1

        # Error sayisi ceza
        error_count = sum(1 for a in actions if a.severity == "ERROR")
        penalty = error_count * 5

        score = int((present_fields / total_fields) * 100) - penalty
        return max(0, min(100, score))


# Singleton instance
data_quality_service = DataQualityService()
