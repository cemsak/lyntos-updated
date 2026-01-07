"""
VERGUS Tax Strategist Service
Sprint 9.0 - LYNTOS V2

Analyzes client financial data and identifies applicable tax optimization strategies.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass


@dataclass
class TaxSavingOpportunity:
    """A single tax saving opportunity"""
    strategy_id: str
    strategy_name: str
    category: str
    priority: str
    difficulty: str
    legal_basis: str
    description: str
    potential_saving: float
    calculation_details: str
    conditions: List[str]
    actions: List[str]
    risk_level: str
    warnings: List[str]
    status_2025: str


@dataclass
class TaxAnalysisResult:
    """Complete tax analysis result"""
    client_id: str
    client_name: str
    period: str
    profile: Dict[str, Any]
    opportunities: List[TaxSavingOpportunity]
    total_potential_saving: float
    summary: Dict[str, Any]


class TaxStrategist:
    """
    VERGUS Tax Strategist Engine

    Analyzes financial data and identifies legal tax optimization opportunities.
    """

    def __init__(self):
        self.strategies_path = Path(__file__).parent.parent / "data" / "tax_strategies.json"
        self.strategies_data = self._load_strategies()

    def _load_strategies(self) -> Dict:
        """Load tax strategies database"""
        if self.strategies_path.exists():
            with open(self.strategies_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"strategies": [], "tax_rates": {}}

    def analyze(
        self,
        client_id: str,
        client_name: str,
        period: str,
        financial_data: Dict[str, Any]
    ) -> TaxAnalysisResult:
        """
        Analyze client financial data and identify tax optimization opportunities

        Args:
            client_id: Client identifier
            client_name: Client name
            period: Tax period (e.g., "2024")
            financial_data: Financial data including:
                - toplam_hasilat: Total revenue
                - ihracat_hasilat: Export revenue
                - kv_matrahi: Corporate tax base
                - hesaplanan_kv: Calculated corporate tax
                - personel_sayisi: Number of employees
                - arge_personel: R&D personnel count
                - sektor: Sector code
                - uretim_faaliyeti: Has production activity
                - sanayi_sicil: Has industrial registry
                - teknokent: Is in technopark
                - arge_merkezi: Has R&D center
                - ihracat_orani: Export ratio
                - istirak_temettu: Dividend from subsidiaries
                - yurt_disi_hizmet: Foreign service revenue

        Returns:
            TaxAnalysisResult with identified opportunities
        """
        # Build client profile
        profile = self._build_profile(financial_data)

        # Find applicable strategies
        opportunities = self._find_opportunities(profile, financial_data)

        # Calculate total potential saving
        total_saving = sum(opp.potential_saving for opp in opportunities)

        # Build summary
        summary = self._build_summary(opportunities, total_saving, financial_data)

        return TaxAnalysisResult(
            client_id=client_id,
            client_name=client_name,
            period=period,
            profile=profile,
            opportunities=opportunities,
            total_potential_saving=total_saving,
            summary=summary
        )

    def _build_profile(self, financial_data: Dict) -> Dict:
        """Build client profile from financial data"""
        hasilat = financial_data.get("toplam_hasilat", 0)
        ihracat = financial_data.get("ihracat_hasilat", 0)

        return {
            "faaliyet_turu": self._determine_activity_type(financial_data),
            "ihracat_var": ihracat > 0,
            "ihracat_orani": (ihracat / hasilat * 100) if hasilat > 0 else 0,
            "arge_var": financial_data.get("arge_personel", 0) >= 15,
            "teknokent": financial_data.get("teknokent", False),
            "arge_merkezi": financial_data.get("arge_merkezi", False),
            "uretim_var": financial_data.get("uretim_faaliyeti", False),
            "sanayi_sicil": financial_data.get("sanayi_sicil", False),
            "sektor": financial_data.get("sektor", "diger"),
            "personel_sayisi": financial_data.get("personel_sayisi", 0),
            "yatirim_plani": financial_data.get("yatirim_plani", False),
            "finans_sektoru": self._is_finance_sector(financial_data.get("sektor", ""))
        }

    def _determine_activity_type(self, financial_data: Dict) -> str:
        """Determine primary activity type"""
        if financial_data.get("uretim_faaliyeti"):
            return "uretim"
        if financial_data.get("sektor", "").startswith("62"):  # Software
            return "yazilim"
        if financial_data.get("sektor", "").startswith("64"):  # Finance
            return "finans"
        return "hizmet"

    def _is_finance_sector(self, sektor: str) -> bool:
        """Check if sector is finance/banking/insurance"""
        finance_codes = ["64", "65", "66"]  # NACE codes for finance
        return any(sektor.startswith(code) for code in finance_codes)

    def _find_opportunities(
        self,
        profile: Dict,
        financial_data: Dict
    ) -> List[TaxSavingOpportunity]:
        """Find applicable tax optimization strategies"""
        opportunities = []
        strategies = self.strategies_data.get("strategies", [])

        for strategy in strategies:
            if strategy.get("status_2025") not in ["active", "changed"]:
                continue

            # Check if strategy is applicable
            if self._is_strategy_applicable(strategy, profile, financial_data):
                saving = self._calculate_saving(strategy, profile, financial_data)
                if saving > 0:
                    opp = self._create_opportunity(strategy, saving, financial_data)
                    opportunities.append(opp)

        # Sort by potential saving (highest first)
        opportunities.sort(key=lambda x: x.potential_saving, reverse=True)

        return opportunities

    def _is_strategy_applicable(
        self,
        strategy: Dict,
        profile: Dict,
        financial_data: Dict
    ) -> bool:
        """Check if a strategy is applicable to the client"""
        strategy_id = strategy.get("id", "")

        # Finance sector exclusions
        if profile["finans_sektoru"] and strategy_id == "STR-003":
            return False

        # Export-related strategies
        if strategy_id == "STR-001":  # Ihracat indirimi
            return profile["ihracat_var"]

        # Production-related strategies
        if strategy_id == "STR-002":  # Sanayi sicil
            return profile["uretim_var"] and not profile["ihracat_var"]

        # R&D center
        if strategy_id == "STR-004":
            return profile["arge_var"] or financial_data.get("arge_personel", 0) >= 10

        # Technopark
        if strategy_id == "STR-005":
            return profile["teknokent"] or profile["faaliyet_turu"] == "yazilim"

        # Investment incentive
        if strategy_id == "STR-006":
            return financial_data.get("yatirim_plani", False)

        # Dividend from subsidiaries
        if strategy_id == "STR-007":
            return financial_data.get("istirak_temettu", 0) > 0

        # Foreign service
        if strategy_id == "STR-011":
            return financial_data.get("yurt_disi_hizmet", 0) > 0

        # SGK strategies - applicable to all
        if strategy.get("category") == "SGK":
            return True

        # Uyumlu mukellef - check conditions
        if strategy_id == "STR-003":
            return not profile["finans_sektoru"]

        return True

    def _calculate_saving(
        self,
        strategy: Dict,
        profile: Dict,
        financial_data: Dict
    ) -> float:
        """Calculate potential saving for a strategy"""
        strategy_id = strategy.get("id", "")

        # Ihracat KV indirimi
        if strategy_id == "STR-001":
            hasilat = financial_data.get("toplam_hasilat", 0)
            ihracat = financial_data.get("ihracat_hasilat", 0)
            matrah = financial_data.get("kv_matrahi", 0)
            if hasilat > 0:
                ihracat_matrahi = matrah * (ihracat / hasilat)
                return ihracat_matrahi * 0.05

        # Sanayi sicil indirimi
        if strategy_id == "STR-002":
            matrah = financial_data.get("kv_matrahi", 0)
            return matrah * 0.01

        # Vergiye uyumlu mukellef
        if strategy_id == "STR-003":
            hesaplanan_kv = financial_data.get("hesaplanan_kv", 0)
            return min(hesaplanan_kv * 0.05, 9900000)

        # Ar-Ge merkezi stopaj
        if strategy_id == "STR-004":
            arge_personel = financial_data.get("arge_personel", 0)
            avg_salary = financial_data.get("ortalama_maas", 50000)
            return arge_personel * avg_salary * 0.80 * 12  # 80% terkin

        # Teknokent KV istisnasi
        if strategy_id == "STR-005":
            teknokent_kazanc = financial_data.get("teknokent_kazanc", 0)
            if teknokent_kazanc > 0:
                return teknokent_kazanc * 0.25  # Saved from 25% KV
            # Estimate if not in technopark yet
            if profile["faaliyet_turu"] == "yazilim":
                return financial_data.get("kv_matrahi", 0) * 0.25 * 0.5  # Estimate 50%

        # Istirak kazanclari
        if strategy_id == "STR-007":
            istirak = financial_data.get("istirak_temettu", 0)
            return istirak * 0.25  # Saved from 25% KV

        # Yurt disi hizmet indirimi
        if strategy_id == "STR-011":
            yurt_disi = financial_data.get("yurt_disi_hizmet", 0)
            return yurt_disi * 0.50 * 0.25  # 50% indirim, 25% KV

        # SGK 5 puan
        if strategy_id == "STR-014":
            personel = financial_data.get("personel_sayisi", 0)
            avg_salary = financial_data.get("ortalama_maas", 22104)
            return personel * avg_salary * 0.05 * 12

        # Asgari ucret destegi
        if strategy_id == "STR-016":
            personel = financial_data.get("personel_sayisi", 0)
            return personel * 1000 * 12  # Max 1000 TL/ay/kisi

        # Default: estimate based on matrah
        matrah = financial_data.get("kv_matrahi", 0)
        return matrah * 0.01  # Conservative 1% estimate

    def _create_opportunity(
        self,
        strategy: Dict,
        saving: float,
        financial_data: Dict
    ) -> TaxSavingOpportunity:
        """Create a TaxSavingOpportunity from strategy data"""
        calculation_details = self._build_calculation_details(strategy, saving, financial_data)

        return TaxSavingOpportunity(
            strategy_id=strategy.get("id", ""),
            strategy_name=strategy.get("name_tr", strategy.get("name", "")),
            category=strategy.get("category", ""),
            priority=strategy.get("priority", "medium"),
            difficulty=strategy.get("difficulty", "medium"),
            legal_basis=strategy.get("legal_basis", ""),
            description=strategy.get("description", ""),
            potential_saving=round(saving, 2),
            calculation_details=calculation_details,
            conditions=strategy.get("conditions", []),
            actions=strategy.get("actions", []),
            risk_level=strategy.get("risk_level", "medium"),
            warnings=strategy.get("warnings", []),
            status_2025=strategy.get("status_2025", "active")
        )

    def _build_calculation_details(
        self,
        strategy: Dict,
        saving: float,
        financial_data: Dict
    ) -> str:
        """Build calculation details string"""
        strategy_id = strategy.get("id", "")

        if strategy_id == "STR-001":
            hasilat = financial_data.get("toplam_hasilat", 0)
            ihracat = financial_data.get("ihracat_hasilat", 0)
            matrah = financial_data.get("kv_matrahi", 0)
            ihracat_orani = (ihracat / hasilat * 100) if hasilat > 0 else 0
            ihracat_matrahi = matrah * (ihracat / hasilat) if hasilat > 0 else 0
            return (
                f"Ihracat Orani: %{ihracat_orani:.1f}\n"
                f"Ihracata Isabet Eden Matrah: {ihracat_matrahi:,.0f} TL\n"
                f"Tasarruf: {ihracat_matrahi:,.0f} x %5 = {saving:,.0f} TL"
            )

        if strategy_id == "STR-002":
            matrah = financial_data.get("kv_matrahi", 0)
            return f"Uretim Matrahi: {matrah:,.0f} TL\nTasarruf: {matrah:,.0f} x %1 = {saving:,.0f} TL"

        if strategy_id == "STR-003":
            hesaplanan_kv = financial_data.get("hesaplanan_kv", 0)
            return (
                f"Hesaplanan KV: {hesaplanan_kv:,.0f} TL\n"
                f"Indirim (%5): {hesaplanan_kv * 0.05:,.0f} TL\n"
                f"Ust Sinir: 9.900.000 TL\n"
                f"Tasarruf: {saving:,.0f} TL"
            )

        return f"Tahmini Tasarruf: {saving:,.0f} TL"

    def _build_summary(
        self,
        opportunities: List[TaxSavingOpportunity],
        total_saving: float,
        financial_data: Dict
    ) -> Dict:
        """Build analysis summary"""
        by_priority = {"high": 0, "medium": 0, "low": 0}
        by_category = {}
        by_difficulty = {"low": 0, "medium": 0, "high": 0}

        for opp in opportunities:
            by_priority[opp.priority] = by_priority.get(opp.priority, 0) + 1
            by_category[opp.category] = by_category.get(opp.category, 0) + 1
            by_difficulty[opp.difficulty] = by_difficulty.get(opp.difficulty, 0) + 1

        immediate_actions = [
            opp for opp in opportunities
            if opp.difficulty == "low" and opp.priority == "high"
        ]

        return {
            "toplam_firsat": len(opportunities),
            "toplam_potansiyel_tasarruf": round(total_saving, 2),
            "oncelik_dagilimi": by_priority,
            "kategori_dagilimi": by_category,
            "zorluk_dagilimi": by_difficulty,
            "acil_aksiyonlar": len(immediate_actions),
            "en_yuksek_tasarruf": opportunities[0].potential_saving if opportunities else 0,
            "tavsiye": self._generate_recommendation(opportunities, financial_data)
        }

    def _generate_recommendation(
        self,
        opportunities: List[TaxSavingOpportunity],
        financial_data: Dict
    ) -> str:
        """Generate overall recommendation"""
        if not opportunities:
            return "Mevcut verilerle tespit edilen ek vergi avantaji bulunmamaktadir."

        high_priority = [o for o in opportunities if o.priority == "high" and o.difficulty == "low"]

        if high_priority:
            top = high_priority[0]
            return (
                f"Oncelikli olarak '{top.strategy_name}' uygulamasi onerilir. "
                f"Yasal dayanak: {top.legal_basis}. "
                f"Potansiyel tasarruf: {top.potential_saving:,.0f} TL."
            )

        return (
            f"Toplam {len(opportunities)} adet vergi optimizasyon firsati tespit edilmistir. "
            f"Detayli inceleme icin uzman gorusu alinmasi onerilir."
        )

    def get_all_strategies(self) -> List[Dict]:
        """Get all available strategies"""
        return self.strategies_data.get("strategies", [])

    def get_strategy_by_id(self, strategy_id: str) -> Optional[Dict]:
        """Get a specific strategy by ID"""
        for strategy in self.strategies_data.get("strategies", []):
            if strategy.get("id") == strategy_id:
                return strategy
        return None

    def get_tax_rates(self) -> Dict:
        """Get current tax rates"""
        return self.strategies_data.get("tax_rates", {})

    def get_asgari_kv_info(self) -> Dict:
        """Get minimum corporate tax information"""
        return self.strategies_data.get("asgari_kv", {})


# Singleton instance
_strategist_instance: Optional[TaxStrategist] = None


def get_tax_strategist() -> TaxStrategist:
    """Get or create TaxStrategist singleton instance"""
    global _strategist_instance
    if _strategist_instance is None:
        _strategist_instance = TaxStrategist()
    return _strategist_instance
