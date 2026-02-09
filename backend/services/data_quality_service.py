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

    # CSV teknik isim -> musteri dili cevirisi
    CSV_TRANSLATIONS: Dict[str, Dict[str, str]] = {
        "fixed_asset_register.csv": {
            "tr": "Sabit Kiymet Listesi",
            "desc": "Bina, makine, arac gibi demirbaslarin listesi",
            "ornek": "Fabrika binasi, uretim makineleri, sirket araclari"
        },
        "stock_movement.csv": {
            "tr": "Stok Hareket Tablosu",
            "desc": "Ay basi/sonu stok miktarlari ve hareketleri",
            "ornek": "01.04.2025 stok: 1000 adet, 30.06.2025 stok: 800 adet"
        },
        "equity_breakdown.csv": {
            "tr": "Sermaye Detay Tablosu",
            "desc": "Ortaklarin sermaye paylari ve degisimleri",
            "ornek": "Ortak A: %60, Ortak B: %40"
        }
    }

    def _calculate_deadline_date(self, days: int) -> str:
        """Deadline tarihini hesapla"""
        from datetime import datetime, timedelta
        deadline = datetime.now() + timedelta(days=days)
        return deadline.strftime("%d.%m.%Y")

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
            deadline_date = self._calculate_deadline_date(3)

            # Musteri dilinde belge listesi olustur
            belge_listesi = []
            belge_kisa = []
            for csv in missing_csvs:
                info = self.CSV_TRANSLATIONS.get(csv, {"tr": csv, "desc": "", "ornek": ""})
                belge_kisa.append(info["tr"])
                belge_listesi.append(f"""
{info['tr']}
   Ne iceriyor: {info['desc']}
   Ornek: {info['ornek']}
""")

            # MUSTERI DILINDE email body
            email_body = f"""Sayin {client_name} Yetkilisi,

{period} donemi icin ENFLASYON MUHASEBESI duzeltmesi yapmamiz gerekiyor.

Bunun icin asagidaki bilgilere ihtiyacimiz var:
{''.join(belge_listesi)}

BU BILGILER OLMADAN:
- Enflasyon duzeltmesi yapilamaz
- Vergi beyaniniz eksik kalir
- Ceza riski olusur

SON TARIH: {deadline_date} (3 is gunu)

EK DOSYALAR:
- Excel sablonlari (bilgisayarinizda acip doldurun)
- Doldurma kilavuzu (nasil dolduracaginiz anlatiliyor)

NASIL GONDERECEKSINIZ?
1. Ekteki Excel dosyalarini acin
2. Kilavuza bakarak doldurun
3. Bu email'e cevap verin, doldurdugunuz dosyalari ekleyin

Herhangi bir sorunuz olursa aramaktan cekinmeyin.

Saygilarimla,
{smmm_name}
Serbest Muhasebeci Mali Musavir
"""

            actions.append(Action(
                id="INFL_MISSING_CSV",
                severity="ERROR",
                title=f"Enflasyon Belgesi Eksik: {len(missing_csvs)} belge",
                description=f"Eksik: {', '.join(belge_kisa)}",
                action="Musteriye anlasilir email gonderin",
                smmm_button="Email Gonder",
                email_template={
                    "subject": f"[ONEMLI] Enflasyon Duzeltmesi Icin Belgeler - {client_name} - {period}",
                    "body": email_body,
                    "attachments": ["Excel_Sablonlari.zip", "Doldurma_Kilavuzu.pdf"]
                },
                deadline=f"3 is gunu ({deadline_date})",
                kurgan_impact="Orta (Veri eksikligi -> risk artisi)"
            ))

        return actions

    def _check_kurgan_risks(self, kurgan_result: Dict) -> List[Action]:
        """KURGAN risk faktorlerini kontrol et"""

        actions: List[Action] = []

        score = kurgan_result.get("score")
        risk_level = kurgan_result.get("risk_level", "Dusuk")
        warnings = kurgan_result.get("warnings", [])

        # score = None ise hesaplanamaz demek, kontrol yapma
        if score is None:
            return actions

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
        """
        GERÇEK veri tamlılık skorunu hesapla (0-100)

        SIFIR TOLERANS: Sahte hesaplama YASAK
        Sadece veritabanında GERÇEKTEN var olan verileri say

        Ağırlıklar (toplam 100):
        - Mizan verisi: 40 puan (temel veri)
        - Beyanname verisi: 25 puan (vergi uyumu)
        - Banka verisi: 15 puan (mutabakat)
        - Enflasyon CSV'leri: 20 puan (3 dosya x ~7 puan)
        """

        score = 0

        # 1. MİZAN VERİSİ - 40 puan
        # Veritabanından gelen gerçek mizan kaydı sayısı
        mizan_entries = portfolio_data.get("mizan_entries", 0)
        if mizan_entries > 0:
            # En az 10 kayıt varsa tam puan
            mizan_score = min(40, int((mizan_entries / 10) * 40))
            score += mizan_score

        # 2. BEYANNAME VERİSİ - 25 puan
        beyanname_entries = portfolio_data.get("beyanname_entries", 0)
        if beyanname_entries > 0:
            # En az 1 beyanname varsa tam puan
            score += 25

        # 3. BANKA VERİSİ - 15 puan
        banka_data = portfolio_data.get("banka_data")
        if banka_data and isinstance(banka_data, dict):
            # Banka mevduat veya hareket verisi varsa
            if banka_data.get("mevduat_tutari") or banka_data.get("hareket_sayisi"):
                score += 15

        # 4. ENFLASYON CSV'LERİ - 20 puan (her biri ~7 puan)
        inflation_data = portfolio_data.get("inflation_data", {})
        if inflation_data:
            for csv in self.REQUIRED_INFLATION_CSVS:
                if inflation_data.get(csv):
                    score += 7  # 3 dosya * 7 = 21, max 20 olacak şekilde clamp

        # Maksimum 100
        return min(100, score)

    def get_missing_data_list(self, portfolio_data: Dict) -> List[Dict]:
        """
        SMMM'ye gösterilecek eksik veri listesi
        Her eksik veri için: ne eksik, neden önemli, nasıl tamamlanır
        """
        missing = []

        # 1. Mizan kontrolü
        mizan_entries = portfolio_data.get("mizan_entries", 0)
        if mizan_entries == 0:
            missing.append({
                "id": "MIZAN_MISSING",
                "belge": "Mizan",
                "aciklama": "Dönem mizanı sisteme yüklenmemiş",
                "neden_onemli": "Tüm vergi hesaplamaları mizan verisine dayanır",
                "nasil_tamamlanir": "e-Defter → Mizan → Excel olarak indir → Sisteme yükle",
                "oncelik": "KRITIK",
                "puan_etkisi": 40
            })

        # 2. Beyanname kontrolü
        beyanname_entries = portfolio_data.get("beyanname_entries", 0)
        if beyanname_entries == 0:
            missing.append({
                "id": "BEYANNAME_MISSING",
                "belge": "Beyanname",
                "aciklama": "KDV/Muhtasar beyanname verisi yok",
                "neden_onemli": "Vergi uyumu analizi için beyanname gerekli",
                "nasil_tamamlanir": "GİB → Vergi Bilgisi Sorgulama → Beyanname → İndir",
                "oncelik": "YUKSEK",
                "puan_etkisi": 25
            })

        # 3. Banka kontrolü
        banka_data = portfolio_data.get("banka_data")
        has_banka = banka_data and isinstance(banka_data, dict) and (
            banka_data.get("mevduat_tutari") or banka_data.get("hareket_sayisi")
        )
        if not has_banka:
            missing.append({
                "id": "BANKA_MISSING",
                "belge": "Banka Hesap Özeti",
                "aciklama": "Banka hesap hareketleri sisteme yüklenmemiş",
                "neden_onemli": "Çapraz kontrol ve mutabakat için gerekli",
                "nasil_tamamlanir": "Banka → Hesap Özeti → Excel/PDF indir → Sisteme yükle",
                "oncelik": "ORTA",
                "puan_etkisi": 15
            })

        # 4. Enflasyon CSV'leri kontrolü
        inflation_data = portfolio_data.get("inflation_data", {})
        for csv in self.REQUIRED_INFLATION_CSVS:
            if not inflation_data.get(csv):
                info = self.CSV_TRANSLATIONS.get(csv, {"tr": csv, "desc": ""})
                missing.append({
                    "id": f"INFL_{csv.upper().replace('.', '_')}",
                    "belge": info["tr"],
                    "aciklama": f"{info['desc']} eksik",
                    "neden_onemli": "TMS 29 enflasyon düzeltmesi için gerekli",
                    "nasil_tamamlanir": "Şablonu indir → Doldur → Sisteme yükle",
                    "oncelik": "ORTA",
                    "puan_etkisi": 7
                })

        return missing


# Singleton instance
data_quality_service = DataQualityService()
