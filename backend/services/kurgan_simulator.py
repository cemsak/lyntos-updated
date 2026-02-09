"""
KURGAN Simulator Engine - VDK Risk Simulation
Sprint 8.0 - LYNTOS V2

Analyzes client data like GIB's KURGAN system would.
Provides Inspector Questions and Document Checklists.
"""

import json
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from decimal import Decimal
from pathlib import Path
from datetime import datetime


@dataclass
class RequiredDocument:
    """Document required for an alarm"""
    id: str
    name: str
    description: str
    priority: str  # critical, high, medium, low
    uploaded: bool = False
    uploaded_at: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "priority": self.priority,
            "uploaded": self.uploaded,
            "uploaded_at": self.uploaded_at
        }


@dataclass
class KurganAlarm:
    """Single KURGAN alarm result"""
    rule_id: str
    rule_name: str
    category: str
    severity: str
    triggered: bool

    # Calculated values
    actual_value: Optional[float] = None
    threshold_value: Optional[float] = None
    sector_average: Optional[float] = None
    deviation_percent: Optional[float] = None

    # Details
    details: Dict[str, Any] = field(default_factory=dict)
    inspector_questions: List[str] = field(default_factory=list)
    required_documents: List[RequiredDocument] = field(default_factory=list)
    legal_references: List[str] = field(default_factory=list)

    # For display
    finding_summary: str = ""

    def to_dict(self) -> Dict:
        return {
            "rule_id": self.rule_id,
            "rule_name": self.rule_name,
            "category": self.category,
            "severity": self.severity,
            "triggered": self.triggered,
            "actual_value": self.actual_value,
            "threshold_value": self.threshold_value,
            "sector_average": self.sector_average,
            "deviation_percent": self.deviation_percent,
            "finding_summary": self.finding_summary,
            "details": self.details,
            "inspector_questions": self.inspector_questions,
            "required_documents": [d.to_dict() for d in self.required_documents],
            "legal_references": self.legal_references
        }


@dataclass
class SimulationResult:
    """Full VDK simulation result"""
    client_id: str
    client_name: str
    period: str
    nace_code: Optional[str]
    sector_group: Optional[str]

    # Overall assessment
    risk_score: int  # 0-100
    risk_level: str  # low, medium, high, critical

    # Alarms
    alarms: List[KurganAlarm] = field(default_factory=list)
    triggered_count: int = 0

    # Checklist
    total_documents: int = 0
    prepared_documents: int = 0

    # Metadata
    simulated_at: str = ""

    def to_dict(self) -> Dict:
        return {
            "client_id": self.client_id,
            "client_name": self.client_name,
            "period": self.period,
            "nace_code": self.nace_code,
            "sector_group": self.sector_group,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "alarms": [a.to_dict() for a in self.alarms],
            "triggered_count": self.triggered_count,
            "total_documents": self.total_documents,
            "prepared_documents": self.prepared_documents,
            "simulated_at": self.simulated_at
        }


class KurganSimulator:
    """
    KURGAN Simulation Engine
    Analyzes financial data using GIB's risk criteria
    """

    def __init__(self):
        self.rules = self._load_rules()
        self.severity_config = self.rules.get("severity_levels", {})
        self.category_labels = self.rules.get("category_labels", {})

    def _load_rules(self) -> Dict:
        """Load KURGAN rules from JSON"""
        rules_path = Path(__file__).parent.parent / "data" / "kurgan_rules.json"
        try:
            with open(rules_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading KURGAN rules: {e}")
            return {"rules": [], "severity_levels": {}}

    def simulate(
        self,
        client_id: str,
        client_name: str,
        period: str,
        nace_code: Optional[str],
        sector_group: Optional[str],
        mizan_data: Dict[str, float],
        tax_certificates: List[Dict] = None,
        risky_suppliers: List[str] = None,
        sector_averages: Optional[Dict[str, Any]] = None
    ) -> SimulationResult:
        """
        Run full KURGAN simulation

        Args:
            client_id: Client identifier
            client_name: Client display name
            period: Analysis period (e.g., "2024/Q4")
            nace_code: NACE code (e.g., "47.62")
            sector_group: Sector group name
            mizan_data: Trial balance data {account_code: balance}
            tax_certificates: List of tax certificate data for trend analysis
            risky_suppliers: List of risky supplier VKNs found
            sector_averages: TCMB EVDS sector ratios (nakit_orani, alacak_devir_hizi, etc.)

        Returns:
            SimulationResult with all alarms
        """

        alarms = []

        for rule in self.rules.get("rules", []):
            alarm = self._evaluate_rule(
                rule=rule,
                sector_group=sector_group,
                mizan_data=mizan_data,
                tax_certificates=tax_certificates or [],
                risky_suppliers=risky_suppliers or [],
                sector_averages=sector_averages or {}
            )
            alarms.append(alarm)

        # Calculate overall risk score
        triggered_alarms = [a for a in alarms if a.triggered]
        risk_score = self._calculate_risk_score(triggered_alarms)
        risk_level = self._get_risk_level(risk_score)

        # Count documents
        total_docs = sum(len(a.required_documents) for a in triggered_alarms)

        return SimulationResult(
            client_id=client_id,
            client_name=client_name,
            period=period,
            nace_code=nace_code,
            sector_group=sector_group,
            risk_score=risk_score,
            risk_level=risk_level,
            alarms=alarms,
            triggered_count=len(triggered_alarms),
            total_documents=total_docs,
            prepared_documents=0,  # Will be updated from document tracking
            simulated_at=datetime.now().isoformat()
        )

    def _evaluate_rule(
        self,
        rule: Dict,
        sector_group: Optional[str],
        mizan_data: Dict[str, float],
        tax_certificates: List[Dict],
        risky_suppliers: List[str],
        sector_averages: Dict[str, Any] = None
    ) -> KurganAlarm:
        """Evaluate a single KURGAN rule"""

        rule_id = rule["id"]
        sector_averages = sector_averages or {}

        # Get sector-specific threshold
        thresholds = rule.get("sector_thresholds", {})
        threshold = thresholds.get(sector_group, thresholds.get("default", 0))

        # Build required documents list
        req_docs = [
            RequiredDocument(
                id=d["id"],
                name=d["name"],
                description=d["description"],
                priority=d["priority"]
            )
            for d in rule.get("required_documents", [])
        ]

        # Initialize alarm
        alarm = KurganAlarm(
            rule_id=rule_id,
            rule_name=rule["name"],
            category=rule["category"],
            severity=rule["severity"],
            triggered=False,
            threshold_value=threshold,
            inspector_questions=rule.get("inspector_questions", []),
            required_documents=req_docs,
            legal_references=rule.get("legal_references", [])
        )

        # Evaluate based on rule type
        if rule_id == "K-09":
            alarm = self._eval_kasa_rule(alarm, mizan_data, threshold, sector_group, sector_averages)
        elif rule_id == "K-15":
            alarm = self._eval_ortaklar_rule(alarm, mizan_data, threshold)
        elif rule_id == "K-22":
            alarm = self._eval_stok_rule(alarm, mizan_data, threshold, sector_group, sector_averages)
        elif rule_id == "K-31":
            alarm = self._eval_alacak_rule(alarm, mizan_data, threshold)
        elif rule_id == "K-24":
            alarm = self._eval_amortisman_rule(alarm, mizan_data, threshold)
        elif rule_id == "TREND-MATRAH":
            alarm = self._eval_matrah_trend(alarm, tax_certificates, threshold)
        elif rule_id == "K-SAHTE":
            alarm = self._eval_risky_supplier(alarm, risky_suppliers, threshold)

        return alarm

    def _eval_kasa_rule(
        self,
        alarm: KurganAlarm,
        mizan: Dict,
        threshold: float,
        sector_group: Optional[str],
        sector_averages: Dict[str, Any] = None
    ) -> KurganAlarm:
        """K-09: High cash balance"""

        kasa = float(mizan.get("100", 0))
        # Calculate total assets (1xx and 2xx accounts)
        total_assets = sum(
            float(v) for k, v in mizan.items()
            if k.startswith(("1", "2")) and not k.startswith("12") and float(v) > 0
        )
        # Add receivables
        total_assets += sum(
            float(v) for k, v in mizan.items()
            if k.startswith("12") and float(v) > 0
        )

        if total_assets > 0:
            ratio = (kasa / total_assets) * 100
            alarm.actual_value = round(ratio, 2)
            # Gerçek sektör ortalaması EVDS'den (nakit_orani = kasa/aktif)
            _nakit = (sector_averages or {}).get("nakit_orani")
            alarm.sector_average = round(_nakit * 100, 2) if _nakit is not None else None

            if ratio > threshold:
                alarm.triggered = True
                alarm.deviation_percent = round(((ratio - threshold) / threshold) * 100, 1)
                alarm.finding_summary = f"Kasa/Aktif orani %{ratio:.1f} (Esik: %{threshold})"
                alarm.details = {
                    "kasa_bakiyesi": kasa,
                    "aktif_toplam": total_assets,
                    "oran": round(ratio, 2),
                    "esik": threshold,
                    "sektor": sector_group or "Belirsiz"
                }
            else:
                alarm.finding_summary = f"Kasa/Aktif orani %{ratio:.1f} - Normal"
        else:
            alarm.finding_summary = "Aktif toplam hesaplanamadi"

        return alarm

    def _eval_ortaklar_rule(
        self,
        alarm: KurganAlarm,
        mizan: Dict,
        threshold: float
    ) -> KurganAlarm:
        """K-15: Related party balance"""

        ortaklardan_alacak = float(mizan.get("131", 0))
        sermaye = float(mizan.get("500", 0)) + float(mizan.get("501", 0))

        if sermaye > 0:
            ratio = ortaklardan_alacak / sermaye
            alarm.actual_value = round(ratio, 2)

            if ratio > threshold:
                alarm.triggered = True
                alarm.finding_summary = f"Ortaklardan alacak/Sermaye: {ratio:.2f}x (Esik: {threshold}x)"
                alarm.details = {
                    "ortaklardan_alacak": ortaklardan_alacak,
                    "sermaye": sermaye,
                    "oran": round(ratio, 2),
                    "esik": threshold,
                    "faiz_tahakkuk": "Kontrol gerekli"
                }
            else:
                alarm.finding_summary = f"Ortaklardan alacak/Sermaye: {ratio:.2f}x - Normal"
        else:
            alarm.finding_summary = "Sermaye verisi mevcut degil"

        return alarm

    def _eval_stok_rule(
        self,
        alarm: KurganAlarm,
        mizan: Dict,
        threshold: float,
        sector_group: Optional[str],
        sector_averages: Dict[str, Any] = None
    ) -> KurganAlarm:
        """K-22: Inventory turnover anomaly"""

        stok = sum(float(mizan.get(acc, 0)) for acc in ["150", "151", "152", "153"])
        satis_maliyeti = abs(float(mizan.get("620", 0))) + abs(float(mizan.get("621", 0)))

        if stok > 0 and satis_maliyeti > 0:
            turnover = satis_maliyeti / stok
            alarm.actual_value = round(turnover, 2)
            # Gerçek sektör stok devir hızı EVDS'den
            _devir = (sector_averages or {}).get("alacak_devir_hizi")
            alarm.sector_average = round(_devir, 2) if _devir is not None else None

            deviation = abs(turnover - threshold) / threshold * 100 if threshold else 0

            if deviation > 50:  # 50% deviation triggers
                alarm.triggered = True
                alarm.deviation_percent = round(deviation, 1)
                alarm.finding_summary = f"Stok devir: {turnover:.1f}x (Sektor ort: {threshold}x, Sapma: %{deviation:.0f})"
                alarm.details = {
                    "stok_bakiyesi": stok,
                    "satis_maliyeti": satis_maliyeti,
                    "devir_hizi": round(turnover, 2),
                    "sektor_ortalama": threshold,
                    "sapma_yuzdesi": round(deviation, 1)
                }
            else:
                alarm.finding_summary = f"Stok devir: {turnover:.1f}x - Normal (Sapma %{deviation:.0f})"
        else:
            alarm.finding_summary = "Stok veya SMM verisi yetersiz"

        return alarm

    def _eval_alacak_rule(
        self,
        alarm: KurganAlarm,
        mizan: Dict,
        threshold: float
    ) -> KurganAlarm:
        """K-31: Doubtful receivables ratio"""

        ticari_alacak = sum(float(mizan.get(acc, 0)) for acc in ["120", "121", "126"])
        supheli = float(mizan.get("128", 0))
        karsilik = abs(float(mizan.get("129", 0)))

        if ticari_alacak > 0:
            # Net supheli alacak (karsilik dusuldukten sonra)
            net_supheli = max(0, supheli - karsilik)
            ratio = (net_supheli / ticari_alacak) * 100
            alarm.actual_value = round(ratio, 2)

            if ratio > threshold:
                alarm.triggered = True
                alarm.finding_summary = f"Supheli alacak orani: %{ratio:.1f} (Esik: %{threshold})"
                alarm.details = {
                    "ticari_alacak": ticari_alacak,
                    "supheli_alacak": supheli,
                    "karsilik": karsilik,
                    "net_supheli": net_supheli,
                    "oran": round(ratio, 2),
                    "esik": threshold
                }
            else:
                alarm.finding_summary = f"Supheli alacak orani: %{ratio:.1f} - Normal"
        else:
            alarm.finding_summary = "Ticari alacak verisi mevcut degil"

        return alarm

    def _eval_amortisman_rule(
        self,
        alarm: KurganAlarm,
        mizan: Dict,
        threshold: float
    ) -> KurganAlarm:
        """K-24: Depreciation / Fixed assets ratio"""

        duran_varlik = sum(
            float(mizan.get(acc, 0))
            for acc in ["250", "251", "252", "253", "254", "255"]
        )
        birikmis_amor = abs(float(mizan.get("257", 0))) + abs(float(mizan.get("258", 0)))

        if duran_varlik > 0:
            ratio = (birikmis_amor / duran_varlik) * 100
            alarm.actual_value = round(ratio, 2)

            if ratio > threshold:
                alarm.triggered = True
                alarm.finding_summary = f"Amortisman/D.Varlik: %{ratio:.1f} (Esik: %{threshold})"
                alarm.details = {
                    "duran_varlik": duran_varlik,
                    "birikmis_amortisman": birikmis_amor,
                    "oran": round(ratio, 2),
                    "esik": threshold
                }
            else:
                alarm.finding_summary = f"Amortisman orani: %{ratio:.1f} - Normal"
        else:
            alarm.finding_summary = "Duran varlik verisi mevcut degil"

        return alarm

    def _eval_matrah_trend(
        self,
        alarm: KurganAlarm,
        tax_certificates: List[Dict],
        threshold: float
    ) -> KurganAlarm:
        """TREND-MATRAH: Tax base erosion"""

        if len(tax_certificates) < 2:
            alarm.finding_summary = "Trend analizi icin yeterli veri yok (en az 2 yil gerekli)"
            return alarm

        # Sort by year descending
        sorted_certs = sorted(
            tax_certificates,
            key=lambda x: x.get("year", 0),
            reverse=True
        )

        current = sorted_certs[0]
        previous = sorted_certs[1]

        curr_matrah = self._parse_matrah(current.get("kv_matrah"))
        prev_matrah = self._parse_matrah(previous.get("kv_matrah"))

        if prev_matrah > 0:
            change_pct = ((curr_matrah - prev_matrah) / prev_matrah) * 100
            alarm.actual_value = round(change_pct, 1)

            if change_pct < threshold:  # threshold is negative, e.g., -20
                alarm.triggered = True
                alarm.finding_summary = f"Matrah degisimi: %{change_pct:.1f} ({previous.get('year')} -> {current.get('year')})"
                alarm.details = {
                    "onceki_yil": previous.get("year"),
                    "onceki_matrah": prev_matrah,
                    "guncel_yil": current.get("year"),
                    "guncel_matrah": curr_matrah,
                    "degisim_yuzdesi": round(change_pct, 1),
                    "esik": threshold
                }
            else:
                trend_icon = "+" if change_pct > 0 else ""
                alarm.finding_summary = f"Matrah degisimi: {trend_icon}%{change_pct:.1f} - Normal"
        else:
            alarm.finding_summary = "Onceki yil matrah verisi mevcut degil"

        return alarm

    def _eval_risky_supplier(
        self,
        alarm: KurganAlarm,
        risky_suppliers: List[str],
        threshold: int
    ) -> KurganAlarm:
        """K-SAHTE: Risky supplier relationships"""

        count = len(risky_suppliers)
        alarm.actual_value = count

        if count >= threshold:
            alarm.triggered = True
            alarm.severity = "critical"  # Always critical
            alarm.finding_summary = f"{count} riskli tedarikci tespit edildi"
            alarm.details = {
                "riskli_tedarikci_sayisi": count,
                "tedarikci_vknler": risky_suppliers[:5],  # First 5
                "uyari": "ACIL: Bu tedarikci iliskilerini belgeleyin"
            }
        else:
            alarm.finding_summary = "Riskli tedarikci tespit edilmedi"

        return alarm

    def _parse_matrah(self, value) -> float:
        """Parse matrah value from various formats"""
        if value is None:
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # Remove Turkish formatting
            clean = value.replace(".", "").replace(",", ".").strip()
            try:
                return float(clean)
            except ValueError:
                return 0.0
        return 0.0

    def _calculate_risk_score(self, triggered_alarms: List[KurganAlarm]) -> int:
        """Calculate overall risk score from triggered alarms"""

        if not triggered_alarms:
            return 0

        total_weight = 0
        for alarm in triggered_alarms:
            weight = self.severity_config.get(alarm.severity, {}).get("score_weight", 10)
            total_weight += weight

        # Cap at 100
        return min(100, total_weight)

    def _get_risk_level(self, score: int) -> str:
        """Get risk level from score"""

        if score >= 70:
            return "critical"
        elif score >= 50:
            return "high"
        elif score >= 30:
            return "medium"
        return "low"

    def get_rules_summary(self) -> List[Dict]:
        """Get summary of all rules for documentation"""
        return [
            {
                "id": r["id"],
                "name": r["name"],
                "category": r["category"],
                "severity": r["severity"],
                "description": r["description"]
            }
            for r in self.rules.get("rules", [])
        ]


# Singleton instance
_simulator_instance = None


def get_kurgan_simulator() -> KurganSimulator:
    """Get or create the KURGAN simulator singleton"""
    global _simulator_instance
    if _simulator_instance is None:
        _simulator_instance = KurganSimulator()
    return _simulator_instance


# CLI for testing
if __name__ == "__main__":
    simulator = get_kurgan_simulator()
    print(f"Loaded {len(simulator.rules.get('rules', []))} KURGAN rules")

    # Test with sample data
    test_mizan = {
        "100": 1250000,   # Kasa - yuksek
        "102": 850000,    # Banka
        "120": 450000,    # Alicilar
        "128": 35000,     # Supheli alacak
        "129": -35000,    # Karsilik
        "131": 3200000,   # Ortaklardan alacak - yuksek
        "150": 280000,    # Stok
        "250": 500000,    # Binalar
        "257": -400000,   # Birikmis amortisman
        "320": 180000,    # Saticilar
        "500": 1000000,   # Sermaye
        "620": 1800000,   # SMM
    }

    test_certs = [
        {"year": 2024, "kv_matrah": "850000"},
        {"year": 2023, "kv_matrah": "1300000"},
    ]

    result = simulator.simulate(
        client_id="OZKAN_KIRTASIYE",
        client_name="Ozkan Kirtasiye Ltd. Sti.",
        period="2024/Q4",
        nace_code="47.62",
        sector_group="Perakende Ticaret",
        mizan_data=test_mizan,
        tax_certificates=test_certs,
        risky_suppliers=[]
    )

    print("\n" + "=" * 60)
    print(f"SONUC: Risk Skoru {result.risk_score}/100 ({result.risk_level.upper()})")
    print(f"Tetiklenen Alarm: {result.triggered_count}")
    print(f"Gerekli Belge: {result.total_documents}")
    print("=" * 60)

    for alarm in result.alarms:
        status = "ALARM" if alarm.triggered else "OK"
        print(f"\n[{status}] {alarm.rule_id}: {alarm.rule_name}")
        print(f"   {alarm.finding_summary}")
        if alarm.triggered:
            print(f"   Mufettis Sorulari: {len(alarm.inspector_questions)}")
            print(f"   Gerekli Belgeler: {len(alarm.required_documents)}")
