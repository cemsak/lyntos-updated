"""
VERGUS Tax Strategist Service
Sprint 9.0 → IS-2 - LYNTOS V2

Analyzes client financial data and identifies applicable tax optimization strategies.
Mizan bazli otomatik mali profil cikarimi, NACE filtreleme, Asgari KV, coklu KV oran destegi.
"""

import json
import logging
import sqlite3
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "database" / "lyntos.db"


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

    def auto_extract_financial_data(self, client_id: str, period_id: str) -> Dict[str, Any]:
        """Mizan ve clients tablosundan mali profil cikar - MOCK VERi YOK"""
        financial_data: Dict[str, Any] = {}
        try:
            conn = sqlite3.connect(str(DB_PATH))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # --- Client bilgileri (NACE, sektor) ---
            cursor.execute(
                "SELECT nace_code, sector, name FROM clients WHERE id = ?",
                (client_id,)
            )
            client_row = cursor.fetchone()
            if client_row:
                financial_data["sektor"] = client_row["nace_code"] or ""
                financial_data["nace_code"] = client_row["nace_code"] or ""
                financial_data["client_name"] = client_row["name"] or ""

            # --- Mizan'dan gelir/gider cikarimi ---
            # 600 alacak = Yurt Ici Satislar
            cursor.execute("""
                SELECT COALESCE(SUM(alacak_bakiye), 0) as toplam
                FROM mizan_entries
                WHERE client_id = ? AND period_id = ? AND hesap_kodu LIKE '600%'
            """, (client_id, period_id))
            yurt_ici = cursor.fetchone()["toplam"]

            # 601 alacak = Yurt Disi Satislar (ihracat)
            cursor.execute("""
                SELECT COALESCE(SUM(alacak_bakiye), 0) as toplam
                FROM mizan_entries
                WHERE client_id = ? AND period_id = ? AND hesap_kodu LIKE '601%'
            """, (client_id, period_id))
            yurt_disi = cursor.fetchone()["toplam"]

            # 610 satis iadeleri (borc bakiye)
            cursor.execute("""
                SELECT COALESCE(SUM(borc_bakiye), 0) as toplam
                FROM mizan_entries
                WHERE client_id = ? AND period_id = ? AND hesap_kodu LIKE '610%'
            """, (client_id, period_id))
            satis_iadeleri = cursor.fetchone()["toplam"]

            # 620+621 Satilan Mal Maliyeti (borc bakiye)
            cursor.execute("""
                SELECT COALESCE(SUM(borc_bakiye), 0) as toplam
                FROM mizan_entries
                WHERE client_id = ? AND period_id = ?
                  AND (hesap_kodu LIKE '620%' OR hesap_kodu LIKE '621%')
            """, (client_id, period_id))
            satis_maliyeti = cursor.fetchone()["toplam"]

            # 760 Pazarlama + 770 Genel Yonetim + 780 Finansman giderleri
            cursor.execute("""
                SELECT COALESCE(SUM(borc_bakiye), 0) as toplam
                FROM mizan_entries
                WHERE client_id = ? AND period_id = ?
                  AND (hesap_kodu LIKE '760%' OR hesap_kodu LIKE '770%' OR hesap_kodu LIKE '780%')
            """, (client_id, period_id))
            faaliyet_giderleri = cursor.fetchone()["toplam"]

            # 640-649 diger gelirler (alacak)
            cursor.execute("""
                SELECT COALESCE(SUM(alacak_bakiye), 0) as toplam
                FROM mizan_entries
                WHERE client_id = ? AND period_id = ?
                  AND hesap_kodu >= '640' AND hesap_kodu < '650'
            """, (client_id, period_id))
            diger_gelirler = cursor.fetchone()["toplam"]

            # 654-659 diger giderler (borc)
            cursor.execute("""
                SELECT COALESCE(SUM(borc_bakiye), 0) as toplam
                FROM mizan_entries
                WHERE client_id = ? AND period_id = ?
                  AND hesap_kodu >= '654' AND hesap_kodu < '660'
            """, (client_id, period_id))
            diger_giderler = cursor.fetchone()["toplam"]

            # 335 personel borclari → personel sayisi proxy
            cursor.execute("""
                SELECT COUNT(DISTINCT hesap_kodu) as hesap_sayisi,
                       COALESCE(SUM(alacak_bakiye), 0) as toplam_borc
                FROM mizan_entries
                WHERE client_id = ? AND period_id = ? AND hesap_kodu LIKE '335%'
            """, (client_id, period_id))
            personel_row = cursor.fetchone()
            personel_borc = personel_row["toplam_borc"]
            # Asgari ucret bazli personel tahmini
            asgari_ucret = 22104
            personel_sayisi = max(1, int(personel_borc / asgari_ucret)) if personel_borc > 0 else 0

            # 263 ArGe giderleri
            cursor.execute("""
                SELECT COALESCE(SUM(borc_bakiye), 0) as toplam
                FROM mizan_entries
                WHERE client_id = ? AND period_id = ? AND hesap_kodu LIKE '263%'
            """, (client_id, period_id))
            arge_giderleri = cursor.fetchone()["toplam"]

            conn.close()

            # --- Hesaplamalar ---
            brut_satislar = yurt_ici + yurt_disi
            net_satislar = brut_satislar - satis_iadeleri
            brut_kar = net_satislar - satis_maliyeti
            faaliyet_kari = brut_kar - faaliyet_giderleri
            vergi_oncesi_kar = faaliyet_kari + diger_gelirler - diger_giderler

            # KV orani belirle
            nace_code = financial_data.get("sektor", "")
            ihracat_orani = (yurt_disi / brut_satislar * 100) if brut_satislar > 0 else 0
            kv_orani = self._determine_kv_rate(nace_code, ihracat_orani)

            kv_matrahi = max(vergi_oncesi_kar, 0)
            hesaplanan_kv = kv_matrahi * kv_orani

            financial_data["toplam_hasilat"] = brut_satislar
            financial_data["yurt_ici_satislar"] = yurt_ici
            financial_data["ihracat_hasilat"] = yurt_disi
            financial_data["satis_iadeleri"] = satis_iadeleri
            financial_data["net_satislar"] = net_satislar
            financial_data["satis_maliyeti"] = satis_maliyeti
            financial_data["brut_kar"] = brut_kar
            financial_data["faaliyet_giderleri"] = faaliyet_giderleri
            financial_data["faaliyet_kari"] = faaliyet_kari
            financial_data["diger_gelirler"] = diger_gelirler
            financial_data["diger_giderler"] = diger_giderler
            financial_data["vergi_oncesi_kar"] = vergi_oncesi_kar
            financial_data["kv_matrahi"] = kv_matrahi
            financial_data["kv_orani"] = kv_orani
            financial_data["hesaplanan_kv"] = hesaplanan_kv
            financial_data["personel_sayisi"] = personel_sayisi
            financial_data["personel_borc_toplam"] = personel_borc
            financial_data["arge_giderleri"] = arge_giderleri
            financial_data["ortalama_maas"] = asgari_ucret
            financial_data["veri_kaynagi"] = "mizan"

            logger.info(
                f"Mali profil cikarildi: {client_id}/{period_id} "
                f"hasilat={brut_satislar:,.2f} matrah={kv_matrahi:,.2f} kv_orani={kv_orani}"
            )

        except Exception as e:
            logger.error(f"Mali profil cikarma hatasi: {e}")
            financial_data["veri_kaynagi"] = "hata"
            financial_data["hata"] = str(e)

        return financial_data

    def _determine_kv_rate(self, nace_code: str, ihracat_orani: float = 0) -> float:
        """
        KV oranini NACE kodu ve ihracat oranina gore belirle
        KVK 32: Genel %25
        KVK 32/7: Ihracatci %20 (ihracat/hasilat > %50)
        KVK 32/7-a: Uretici (NACE 10-33) %24
        7440 SK: Finans (NACE 64-66) %30
        """
        if not nace_code:
            return 0.25

        nace_2 = nace_code[:2] if len(nace_code) >= 2 else ""

        # Finans sektoru: %30
        if nace_2 in ("64", "65", "66"):
            return 0.30

        # Ihracatci: %20 (ihracat hasilatin %50'sinden fazla)
        if ihracat_orani > 50:
            return 0.20

        # Uretim sektoru (imalat NACE 10-33): %24
        try:
            nace_int = int(nace_2)
            if 10 <= nace_int <= 33:
                return 0.24
        except (ValueError, TypeError):
            pass

        # Genel oran
        return 0.25

    def _check_asgari_kv(self, hasilat: float, hesaplanan_kv: float, period: str) -> Dict[str, Any]:
        """
        Asgari Kurumlar Vergisi kontrolu (KVK Gecici 15 / 7524 SK)
        2025: hasilat * %2 (gecis donemi)
        2026+: hasilat * %4
        """
        try:
            yil = int(period.split("-")[0]) if "-" in period else int(period[:4])
        except (ValueError, TypeError):
            yil = 2025

        if yil <= 2024:
            return {"uygulanabilir": False, "aciklama": "Asgari KV 2025'ten itibaren yururlukte"}

        if yil == 2025:
            oran = 0.02
            aciklama = "2025 gecis donemi: hasilat x %2"
        else:
            oran = 0.04
            aciklama = f"{yil}: hasilat x %4"

        asgari_kv = hasilat * oran
        asgari_kv_asimi = hesaplanan_kv < asgari_kv

        return {
            "uygulanabilir": True,
            "asgari_kv_tutari": round(asgari_kv, 2),
            "hesaplanan_kv": round(hesaplanan_kv, 2),
            "asgari_kv_asimi": asgari_kv_asimi,
            "fark": round(asgari_kv - hesaplanan_kv, 2) if asgari_kv_asimi else 0,
            "oran": oran,
            "aciklama": aciklama,
            "mevzuat": "KVK Gecici 15 (7524 SK)",
            "uyari": (
                f"Hesaplanan KV ({hesaplanan_kv:,.0f} TL) asgari KV'nin ({asgari_kv:,.0f} TL) altinda. "
                f"Asgari KV odenmesi gerekecektir. Bazi istisna/indirimler kisitlanabilir."
            ) if asgari_kv_asimi else None
        }

    def analyze(
        self,
        client_id: str,
        client_name: str,
        period: str,
        financial_data: Dict[str, Any],
        nace_code: Optional[str] = None
    ) -> TaxAnalysisResult:
        """
        Analyze client financial data and identify tax optimization opportunities.
        NACE kodu ile strateji filtreleme, coklu KV oran destegi, Asgari KV kontrolu.
        """
        # NACE kodu varsa financial_data'ya ekle
        if nace_code:
            financial_data["sektor"] = nace_code
            financial_data["nace_code"] = nace_code

        # KV oranini belirle
        sektor = financial_data.get("sektor", financial_data.get("nace_code", ""))
        hasilat = financial_data.get("toplam_hasilat", 0)
        ihracat = financial_data.get("ihracat_hasilat", 0)
        ihracat_orani = (ihracat / hasilat * 100) if hasilat > 0 else 0
        kv_orani = financial_data.get("kv_orani") or self._determine_kv_rate(sektor, ihracat_orani)
        financial_data["kv_orani"] = kv_orani

        # Matrah yoksa veya hesaplanan KV yoksa yeniden hesapla
        matrah = financial_data.get("kv_matrahi", 0)
        if matrah > 0 and not financial_data.get("hesaplanan_kv"):
            financial_data["hesaplanan_kv"] = matrah * kv_orani

        # Build client profile
        profile = self._build_profile(financial_data)
        profile["nace_code"] = sektor
        profile["kv_orani"] = kv_orani

        # NACE bazli strateji filtreleme icin nace bilgisini sakla
        financial_data["_nace_code"] = sektor

        # Find applicable strategies
        opportunities = self._find_opportunities(profile, financial_data)

        # Calculate total potential saving
        total_saving = sum(opp.potential_saving for opp in opportunities)

        # Build summary
        summary = self._build_summary(opportunities, total_saving, financial_data)

        # Asgari KV kontrolu
        hesaplanan_kv = financial_data.get("hesaplanan_kv", 0)
        asgari_kv = self._check_asgari_kv(hasilat, hesaplanan_kv, period)
        summary["asgari_kv_kontrolu"] = asgari_kv
        summary["kv_orani"] = kv_orani

        # Veri kaynagi bilgisi
        summary["veri_kaynagi"] = financial_data.get("veri_kaynagi", "manuel")

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
        """Check if a strategy is applicable to the client. NACE bazli filtreleme dahil."""
        strategy_id = strategy.get("id", "")
        nace_code = financial_data.get("_nace_code", financial_data.get("sektor", ""))
        nace_2 = nace_code[:2] if nace_code and len(nace_code) >= 2 else ""

        # Finance sector exclusions
        if profile["finans_sektoru"] and strategy_id == "STR-003":
            return False

        # Export-related strategies
        if strategy_id == "STR-001":  # Ihracat indirimi
            return profile["ihracat_var"]

        # Sanayi sicil: sadece NACE 10-33 (imalat sektoru)
        if strategy_id == "STR-002":
            try:
                nace_int = int(nace_2) if nace_2 else 0
                is_imalat = 10 <= nace_int <= 33
            except (ValueError, TypeError):
                is_imalat = False
            return is_imalat and (profile["uretim_var"] or is_imalat)

        # R&D center
        if strategy_id == "STR-004":
            return profile["arge_var"] or financial_data.get("arge_personel", 0) >= 10

        # Teknokent: sadece NACE 62xx (yazilim) veya zaten teknokentte
        if strategy_id == "STR-005":
            is_yazilim = nace_2 == "62"
            return profile["teknokent"] or is_yazilim

        # Investment incentive
        if strategy_id == "STR-006":
            return financial_data.get("yatirim_plani", False)

        # Dividend from subsidiaries
        if strategy_id == "STR-007":
            return financial_data.get("istirak_temettu", 0) > 0

        # Foreign service
        if strategy_id == "STR-011":
            return financial_data.get("yurt_disi_hizmet", 0) > 0

        # SGK strategies - applicable to all with personnel
        if strategy.get("category") == "SGK":
            return financial_data.get("personel_sayisi", 0) > 0

        # Uyumlu mukellef - check conditions
        if strategy_id == "STR-003":
            return not profile["finans_sektoru"]

        # Asgari KV etki analizi
        if strategy_id == "STR-020":
            hasilat = financial_data.get("toplam_hasilat", 0)
            return hasilat > 0

        return True

    def _calculate_saving(
        self,
        strategy: Dict,
        profile: Dict,
        financial_data: Dict
    ) -> float:
        """Calculate potential saving for a strategy. Coklu KV oran destegi."""
        strategy_id = strategy.get("id", "")
        kv_orani = financial_data.get("kv_orani", 0.25)

        # Ihracat KV indirimi: 5 puan indirim (KVK 32/7)
        if strategy_id == "STR-001":
            hasilat = financial_data.get("toplam_hasilat", 0)
            ihracat = financial_data.get("ihracat_hasilat", 0)
            matrah = financial_data.get("kv_matrahi", 0)
            if hasilat > 0:
                ihracat_matrahi = matrah * (ihracat / hasilat)
                return ihracat_matrahi * 0.05  # 5 puan indirim

        # Sanayi sicil indirimi: 1 puan indirim (KVK 32/8)
        if strategy_id == "STR-002":
            matrah = financial_data.get("kv_matrahi", 0)
            return matrah * 0.01

        # Vergiye uyumlu mukellef: hesaplanan KV'nin %5'i
        if strategy_id == "STR-003":
            hesaplanan_kv = financial_data.get("hesaplanan_kv", 0)
            return min(hesaplanan_kv * 0.05, 9900000)

        # Ar-Ge merkezi stopaj
        if strategy_id == "STR-004":
            arge_personel = financial_data.get("arge_personel", 0)
            avg_salary = financial_data.get("ortalama_maas", 50000)
            return arge_personel * avg_salary * 0.80 * 12

        # Teknokent KV istisnasi
        if strategy_id == "STR-005":
            teknokent_kazanc = financial_data.get("teknokent_kazanc", 0)
            if teknokent_kazanc > 0:
                return teknokent_kazanc * kv_orani
            if profile["faaliyet_turu"] == "yazilim":
                return financial_data.get("kv_matrahi", 0) * kv_orani * 0.5

        # Istirak kazanclari
        if strategy_id == "STR-007":
            istirak = financial_data.get("istirak_temettu", 0)
            return istirak * kv_orani

        # Yurt disi hizmet indirimi
        if strategy_id == "STR-011":
            yurt_disi = financial_data.get("yurt_disi_hizmet", 0)
            return yurt_disi * 0.50 * kv_orani

        # SGK 5 puan
        if strategy_id == "STR-014":
            personel = financial_data.get("personel_sayisi", 0)
            avg_salary = financial_data.get("ortalama_maas", 22104)
            return personel * avg_salary * 0.05 * 12

        # Asgari ucret destegi
        if strategy_id == "STR-016":
            personel = financial_data.get("personel_sayisi", 0)
            return personel * 1000 * 12

        # Asgari KV etki analizi (STR-020)
        if strategy_id == "STR-020":
            # Bu strateji tasarruf degil, bilgilendirme amacli
            return 0

        # Default: estimate based on matrah
        matrah = financial_data.get("kv_matrahi", 0)
        return matrah * 0.01

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
