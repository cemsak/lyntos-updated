"""
Gecici Vergi Hesaplayici

Kaynak:
- 5520 Sayili KVK Madde 32
- Gecici Vergi Tebligi (2025)

Trust Score: 1.0
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


@dataclass
class QuarterlyTaxResult:
    """Ceyreklik gecici vergi sonucu"""
    quarter: str  # "Q1", "Q2", "Q3"
    current_profit: float  # Ceyrek cari kar
    annual_estimate: float  # Yillik tahmin
    tax_base: float  # Gecici matrah (mali kar)
    calculated_tax: float  # Hesaplanan vergi
    previous_payments: float  # Onceki odemeler toplami
    payable: float  # Bu ceyrekte odenecek
    kkeg: float = 0  # Kanunen Kabul Edilmeyen Giderler (KVK Md.11)
    istisna: float = 0  # Istisna kazanclar
    gecmis_zarar: float = 0  # Gecmis donem zararlari (KVK Md.9, 5 yil sinirli)
    legal_basis_refs: List[str] = field(default_factory=lambda: ["SRC-0023"])  # 5520 KVK Md. 32
    trust_score: float = 1.0


class QuarterlyTaxCalculator:
    """
    Gecici Vergi Hesaplayici

    Mantik:
    Q1: Kar x 4 = Yillik tahmin -> Vergi hesapla
    Q2: (Q1+Q2) x 2 = Yillik tahmin -> Q1 mahsup et
    Q3: (Q1+Q2+Q3) x 1.33 = Yillik tahmin -> Q1+Q2 mahsup et
    """

    TAX_RATE = 0.25  # %25

    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    def calculate_quarter(
        self,
        quarter: str,
        profits: Dict[str, float],  # {"Q1": 100000, "Q2": 105400, ...}
        previous_payments: float = 0,
        kkeg: float = 0,
        istisna: float = 0,
        gecmis_zarar: float = 0,
    ) -> QuarterlyTaxResult:
        """
        Ceyreklik gecici vergi hesapla

        Mali Kar = Ticari Kar (yillik tahmin) + KKEG - Istisna - Gecmis Zarar
        KVK Md.32, KVK Md.11 (KKEG), KVK Md.9 (zarar mahsubu, 5 yil sinirli)

        Args:
            quarter: "Q1", "Q2", "Q3"
            profits: Ceyreklik karlar {"Q1": amount, "Q2": amount, ...}
            previous_payments: Onceki ceyreklerde odenen toplam
            kkeg: Kanunen Kabul Edilmeyen Giderler (KVK Md.11)
            istisna: Istisna kazanclar (istirak, ihracat vb.)
            gecmis_zarar: Gecmis donem zararlari (KVK Md.9, caller 5 yil sinirini uygular)

        Returns:
            QuarterlyTaxResult
        """
        try:
            self.logger.info(f"{quarter} gecici vergi hesaplaniyor")

            # Cari ceyrek kari
            current_profit = profits.get(quarter, 0)

            # Yillik tahmin (quarter'a gore)
            annual_estimate = self._estimate_annual_profit(quarter, profits)

            # Mali kar hesabi (KVK Md.32)
            # Matrah = Ticari Kar + KKEG - Istisna - Gecmis Zarar
            mali_kar = annual_estimate + kkeg - istisna - gecmis_zarar
            tax_base = max(0, mali_kar)

            # Hesaplanan vergi
            calculated_tax = tax_base * self.TAX_RATE

            # Odenecek (mahsup sonrasi)
            payable = max(0, calculated_tax - previous_payments)

            result = QuarterlyTaxResult(
                quarter=quarter,
                current_profit=current_profit,
                annual_estimate=annual_estimate,
                tax_base=tax_base,
                calculated_tax=calculated_tax,
                previous_payments=previous_payments,
                payable=payable,
                kkeg=kkeg,
                istisna=istisna,
                gecmis_zarar=gecmis_zarar,
            )

            self.logger.info(f"{quarter}: Odenecek={payable:,.0f} TL")
            return result

        except Exception as e:
            self.logger.error(f"Gecici vergi hesaplama hatasi: {e}", exc_info=True)
            raise

    def _estimate_annual_profit(self, quarter: str, profits: Dict[str, float]) -> float:
        """Yillik kar tahmini"""

        if quarter == "Q1":
            # Q1 kari x 4
            return profits.get("Q1", 0) * 4

        elif quarter == "Q2":
            # (Q1 + Q2) x 2
            q1 = profits.get("Q1", 0)
            q2 = profits.get("Q2", 0)
            return (q1 + q2) * 2

        elif quarter == "Q3":
            # (Q1 + Q2 + Q3) x 1.33
            q1 = profits.get("Q1", 0)
            q2 = profits.get("Q2", 0)
            q3 = profits.get("Q3", 0)
            return (q1 + q2 + q3) * 1.33

        else:
            return 0

    def project_year_end(
        self,
        profits: Dict[str, float],
        quarterly_payments: float,
        kkeg: float = 0,
        istisna: float = 0,
        gecmis_zarar: float = 0,
    ) -> Dict:
        """
        Yil sonu kurumlar vergisi projeksiyonu

        Args:
            profits: Gerceklesen ceyreklik karlar
            quarterly_payments: Odenen gecici vergi toplami
            kkeg: Kanunen Kabul Edilmeyen Giderler (KVK Md.11)
            istisna: Istisna kazanclar
            gecmis_zarar: Gecmis donem zararlari (5 yil sinirli)

        Returns:
            {
                "estimated_annual_profit": float,
                "estimated_tax_base": float,
                "estimated_corporate_tax": float,
                "quarterly_offset": float,
                "estimated_payable_or_refund": float (+ odeme, - iade)
            }
        """

        # Gerceklesen toplam
        realized = sum(profits.values())

        # Eksik ceyrekler var mi?
        quarters_done = len([k for k in ["Q1", "Q2", "Q3", "Q4"] if k in profits])

        if quarters_done == 4:
            # Yil tamamlanmis
            estimated_annual = realized
        else:
            # Trend ile tahmin et
            avg_per_quarter = realized / quarters_done if quarters_done > 0 else 0
            estimated_annual = avg_per_quarter * 4

        # Mali kar hesabi (KVK Md.32)
        mali_kar = estimated_annual + kkeg - istisna - gecmis_zarar
        tax_base = max(0, mali_kar)

        # KV hesapla
        corporate_tax = tax_base * self.TAX_RATE

        # Mahsup
        net = corporate_tax - quarterly_payments

        return {
            "estimated_annual_profit": estimated_annual,
            "estimated_tax_base": tax_base,
            "estimated_corporate_tax": corporate_tax,
            "quarterly_offset": quarterly_payments,
            "estimated_payable_or_refund": net,
            "kkeg": kkeg,
            "istisna": istisna,
            "gecmis_zarar": gecmis_zarar,
            "confidence": "HIGH" if quarters_done >= 3 else "MEDIUM" if quarters_done >= 2 else "LOW"
        }


# Singleton instance
quarterly_tax_calculator = QuarterlyTaxCalculator()
