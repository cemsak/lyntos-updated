"""
Banka Ekstresi Test Data Generator
"""
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import date, timedelta
import random


@dataclass
class BankaIslem:
    """Single bank transaction"""
    tarih: date
    aciklama: str
    tutar: Decimal
    islem_tipi: str  # "giris" or "cikis"
    bakiye: Decimal = Decimal("0")
    referans: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tarih": self.tarih.isoformat(),
            "aciklama": self.aciklama,
            "tutar": float(self.tutar),
            "islem_tipi": self.islem_tipi,
            "bakiye": float(self.bakiye),
            "referans": self.referans
        }


class BankaGenerator:
    """
    Generates realistic bank statement data
    """

    ISLEM_ACIKLAMALARI = {
        "giris": [
            "Musteri tahsilati",
            "Cek tahsilati",
            "EFT gelir",
            "Havale gelir",
            "Kredi karti tahsilati",
            "POS tahsilati",
        ],
        "cikis": [
            "Satici odemesi",
            "Personel maasi",
            "SGK odemesi",
            "Vergi odemesi",
            "Kira odemesi",
            "Elektrik faturasi",
            "Su faturasi",
            "Telefon faturasi",
            "EFT cikis",
        ]
    }

    def __init__(self, seed: Optional[int] = None):
        if seed is not None:
            random.seed(seed)

    def generate_quarter(
        self,
        year: int,
        quarter: int,
        opening_balance: Decimal = Decimal("500000"),
        transaction_count: int = 35,
        include_unmatched: bool = False
    ) -> List[BankaIslem]:
        """
        Generate bank statement for a quarter

        Args:
            year: Year
            quarter: Quarter (1-4)
            opening_balance: Starting balance
            transaction_count: Number of transactions
            include_unmatched: Include transactions that won't match mizan
        """
        # Calculate quarter date range
        start_month = (quarter - 1) * 3 + 1
        start_date = date(year, start_month, 1)

        if quarter == 4:
            end_date = date(year, 12, 31)
        else:
            end_date = date(year, start_month + 3, 1) - timedelta(days=1)

        islemler = []
        current_balance = opening_balance

        # Generate transactions
        for i in range(transaction_count):
            # Random date within quarter
            days_in_quarter = (end_date - start_date).days
            random_day = random.randint(0, days_in_quarter)
            islem_tarihi = start_date + timedelta(days=random_day)

            # 60% income, 40% expense
            is_giris = random.random() < 0.6
            islem_tipi = "giris" if is_giris else "cikis"

            # Amount based on type
            if is_giris:
                tutar = Decimal(str(random.randint(10000, 150000)))
                current_balance += tutar
                aciklama = random.choice(self.ISLEM_ACIKLAMALARI["giris"])
            else:
                tutar = Decimal(str(random.randint(5000, 80000)))
                current_balance -= tutar
                aciklama = random.choice(self.ISLEM_ACIKLAMALARI["cikis"])

            # Add unmatched transaction for testing
            if include_unmatched and i == transaction_count - 3:
                aciklama = "UNMATCHED - Test transaction"

            islem = BankaIslem(
                tarih=islem_tarihi,
                aciklama=aciklama,
                tutar=tutar,
                islem_tipi=islem_tipi,
                bakiye=current_balance,
                referans=f"REF-{year}-Q{quarter}-{i+1:04d}"
            )
            islemler.append(islem)

        # Sort by date
        islemler.sort(key=lambda x: x.tarih)

        # Recalculate running balance
        balance = opening_balance
        for islem in islemler:
            if islem.islem_tipi == "giris":
                balance += islem.tutar
            else:
                balance -= islem.tutar
            islem.bakiye = balance

        return islemler

    def to_json(self, islemler: List[BankaIslem]) -> List[Dict]:
        return [i.to_dict() for i in islemler]

    def calculate_summary(self, islemler: List[BankaIslem]) -> Dict[str, Any]:
        """Calculate statement summary"""
        total_giris = sum(i.tutar for i in islemler if i.islem_tipi == "giris")
        total_cikis = sum(i.tutar for i in islemler if i.islem_tipi == "cikis")

        return {
            "transaction_count": len(islemler),
            "total_giris": float(total_giris),
            "total_cikis": float(total_cikis),
            "net_change": float(total_giris - total_cikis),
            "opening_balance": float(islemler[0].bakiye - islemler[0].tutar) if islemler else 0,
            "closing_balance": float(islemler[-1].bakiye) if islemler else 0
        }
