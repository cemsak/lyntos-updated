"""
Capraz Kontrol Motoru

Mizan <-> Beyanname <-> E-Fatura <-> Banka

Trust Score: 1.0
"""

from dataclasses import dataclass
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


@dataclass
class CrossCheckResult:
    """Capraz kontrol sonucu"""
    check_type: str  # "mizan_vs_beyanname", "mizan_vs_efatura", ...
    status: str  # "ok", "warning", "error"
    difference: float
    reason_tr: str
    evidence_refs: List[str]
    actions: List[str]
    legal_basis_refs: List[str]  # ["SRC-0045", ...]
    trust_score: float = 1.0


class CrossCheckEngine:
    """
    Capraz Kontrol Motoru

    Kontroller:
    1. Mizan 600 (Satislar) vs KDV Beyani Satis
    2. Mizan 600 vs E-Fatura Toplam
    3. Mizan 102 (Banka) vs Banka Ekstresi
    4. E-Fatura Toplam vs KDV Beyani
    """

    TOLERANCE = 100  # 100 TL'ye kadar fark tolere edilir (yuvarlama)

    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    def check_mizan_vs_beyanname(
        self,
        mizan_600: float,
        kdv_beyan_satis: float
    ) -> CrossCheckResult:
        """Mizan satislar vs KDV beyani karsilastir"""

        diff = mizan_600 - kdv_beyan_satis

        if abs(diff) <= self.TOLERANCE:
            status = "ok"
            reason = "Mizan ve KDV beyani uyumlu"
            actions = []
        elif abs(diff) <= mizan_600 * 0.05:  # %5 fark
            status = "warning"
            reason = f"Mizan ve KDV beyani arasinda {abs(diff):,.0f} TL fark var (%{abs(diff)/mizan_600*100:.1f})"
            actions = [
                "E-Fatura kayitlarini kontrol edin",
                "Ihracat/Istisna satislar dogru kaydedildi mi?",
                "Iade/iskonto kayitlarini kontrol edin"
            ]
        else:
            status = "error"
            reason = f"CIDDI FARK: {abs(diff):,.0f} TL ({abs(diff)/mizan_600*100:.1f}%)"
            actions = [
                "ACIL: Tum satis faturalarini inceleyin",
                "E-Fatura sistemi ile mizan karsilastirin",
                "Kayit disi satis riski - VDK incelemesi olabilir"
            ]

        return CrossCheckResult(
            check_type="mizan_vs_kdv_beyanname",
            status=status,
            difference=diff,
            reason_tr=reason,
            evidence_refs=["mizan_600.csv", "kdv_beyani.pdf"],
            actions=actions,
            legal_basis_refs=["SRC-0045"]  # VUK Madde 227
        )

    def check_mizan_vs_efatura(
        self,
        mizan_600: float,
        efatura_total: float
    ) -> CrossCheckResult:
        """Mizan satislar vs E-Fatura toplam"""

        diff = mizan_600 - efatura_total

        if abs(diff) <= self.TOLERANCE:
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

        return CrossCheckResult(
            check_type="mizan_vs_efatura",
            status=status,
            difference=diff,
            reason_tr=reason,
            evidence_refs=["mizan_600.csv", "efatura_rapor.xml"],
            actions=actions,
            legal_basis_refs=["SRC-0012"]  # E-Fatura Teknik Kilavuzu
        )

    def check_mizan_vs_bank(
        self,
        mizan_102: float,
        bank_balance: float
    ) -> CrossCheckResult:
        """Mizan 102 (Banka) vs Banka ekstresi"""

        diff = mizan_102 - bank_balance

        if abs(diff) <= self.TOLERANCE:
            status = "ok"
            reason = "Mizan ve banka ekstresi uyumlu"
            actions = []
        else:
            status = "warning"
            reason = f"Banka bakiyesi ile mizan arasinda {abs(diff):,.0f} TL fark var"
            actions = [
                "Banka dekontlarini mizan ile eslestirin",
                "Tarih farki (valor) olabilir",
                "Havale/EFT kayitlarini kontrol edin"
            ]

        return CrossCheckResult(
            check_type="mizan_vs_bank",
            status=status,
            difference=diff,
            reason_tr=reason,
            evidence_refs=["mizan_102.csv", "banka_ekstresi.pdf"],
            actions=actions,
            legal_basis_refs=["SRC-0046"]  # VUK Madde 219
        )

    def run_all_checks(self, data: Dict) -> List[CrossCheckResult]:
        """Tum capraz kontrolleri calistir"""

        results = []

        # Mizan vs Beyanname
        if "mizan_600" in data and "kdv_beyan_satis" in data:
            results.append(
                self.check_mizan_vs_beyanname(
                    data["mizan_600"],
                    data["kdv_beyan_satis"]
                )
            )

        # Mizan vs E-Fatura
        if "mizan_600" in data and "efatura_total" in data:
            results.append(
                self.check_mizan_vs_efatura(
                    data["mizan_600"],
                    data["efatura_total"]
                )
            )

        # Mizan vs Banka
        if "mizan_102" in data and "bank_balance" in data:
            results.append(
                self.check_mizan_vs_bank(
                    data["mizan_102"],
                    data["bank_balance"]
                )
            )

        return results


# Singleton instance
cross_check_engine = CrossCheckEngine()
