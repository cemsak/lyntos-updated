"""
Mizan Test Data Generator
Generates realistic mizan data for testing
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from decimal import Decimal
import random
from datetime import datetime


@dataclass
class MizanHesap:
    """Single mizan account entry"""
    hesap_kodu: str
    hesap_adi: str
    borc: Decimal
    alacak: Decimal
    borc_bakiye: Decimal = Decimal("0")
    alacak_bakiye: Decimal = Decimal("0")

    def __post_init__(self):
        # Calculate bakiye
        net = self.borc - self.alacak
        if net > 0:
            self.borc_bakiye = net
        else:
            self.alacak_bakiye = abs(net)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hesap_kodu": self.hesap_kodu,
            "hesap_adi": self.hesap_adi,
            "borc": float(self.borc),
            "alacak": float(self.alacak),
            "borc_bakiye": float(self.borc_bakiye),
            "alacak_bakiye": float(self.alacak_bakiye)
        }


class MizanGenerator:
    """
    Generates realistic mizan data for testing

    Standard Turkish accounting hesap plani structure
    """

    # Standard hesap yapisi
    HESAP_PLANI = {
        # 1 - Donen Varliklar
        "100": "Kasa",
        "102": "Bankalar",
        "120": "Alicilar",
        "121": "Alacak Senetleri",
        "153": "Ticari Mallar",
        "191": "Indirilecek KDV",
        # 2 - Duran Varliklar
        "253": "Tesis Makine Cihazlar",
        "254": "Tasitlar",
        "257": "Birikmis Amortismanlar (-)",
        # 3 - Kisa Vadeli Yabanci Kaynaklar
        "320": "Saticilar",
        "321": "Borc Senetleri",
        "360": "Odenecek Vergi ve Fonlar",
        "361": "Odenecek SGK Primleri",
        "391": "Hesaplanan KDV",
        # 4 - Uzun Vadeli Yabanci Kaynaklar
        "400": "Banka Kredileri",
        # 5 - Ozkaynaklar
        "500": "Sermaye",
        "570": "Gecmis Yillar Karlari",
        "580": "Gecmis Yillar Zararlari (-)",
        # 6 - Gelir Tablosu
        "600": "Yurtici Satislar",
        "610": "Satistan Iadeler (-)",
        "620": "Satis Iskontolari (-)",
        "621": "Satilan Ticari Mallar Maliyeti (-)",
        "630": "Arastirma Gelistirme Giderleri (-)",
        "631": "Pazarlama Satis Dagitim Giderleri (-)",
        "632": "Genel Yonetim Giderleri (-)",
        "642": "Faiz Gelirleri",
        "660": "Kisa Vadeli Borclanma Giderleri (-)",
        # 7 - Maliyet Hesaplari
        "770": "Genel Yonetim Giderleri",
        "780": "Finansman Giderleri",
    }

    def __init__(self, seed: Optional[int] = None):
        if seed is not None:
            random.seed(seed)

    def generate_quarter(
        self,
        year: int,
        quarter: int,
        base_revenue: Decimal = Decimal("1000000"),
        variance_pct: float = 0.2,
        include_errors: bool = False
    ) -> List[MizanHesap]:
        """
        Generate mizan for a specific quarter

        Args:
            year: Year (e.g., 2024)
            quarter: Quarter (1-4)
            base_revenue: Base revenue amount
            variance_pct: Random variance percentage
            include_errors: Include intentional errors for testing

        Returns:
            List of MizanHesap entries
        """
        hesaplar = []

        # Apply seasonal variance
        seasonal_factor = {1: 0.9, 2: 1.0, 3: 0.85, 4: 1.25}[quarter]
        revenue = base_revenue * Decimal(str(seasonal_factor))

        # Add random variance
        variance = Decimal(str(random.uniform(1 - variance_pct, 1 + variance_pct)))
        revenue = revenue * variance

        # Calculate related amounts
        kdv_rate = Decimal("0.20")  # %20 KDV
        cogs_rate = Decimal("0.65")  # %65 maliyet
        expense_rate = Decimal("0.15")  # %15 gider

        hesaplanan_kdv = revenue * kdv_rate
        indirilecek_kdv = revenue * cogs_rate * kdv_rate

        # Intentional KDV mismatch for error testing
        if include_errors and quarter == 2:
            indirilecek_kdv = indirilecek_kdv * Decimal("1.15")  # %15 fazla

        # 1. Kasa ve Banka
        kasa = revenue * Decimal("0.05")
        banka = revenue * Decimal("0.35")
        hesaplar.append(MizanHesap("100", "Kasa", kasa, Decimal("0")))
        hesaplar.append(MizanHesap("102", "Bankalar", banka, Decimal("0")))

        # 2. Alicilar
        alicilar = revenue * Decimal("0.25")
        hesaplar.append(MizanHesap("120", "Alicilar", alicilar, Decimal("0")))

        # 3. Stok
        stok = revenue * Decimal("0.20")
        hesaplar.append(MizanHesap("153", "Ticari Mallar", stok, Decimal("0")))

        # 4. KDV Hesaplari
        hesaplar.append(MizanHesap("191", "Indirilecek KDV", indirilecek_kdv, Decimal("0")))
        hesaplar.append(MizanHesap("391", "Hesaplanan KDV", Decimal("0"), hesaplanan_kdv))

        # 5. Saticilar
        saticilar = revenue * cogs_rate * Decimal("0.30")
        hesaplar.append(MizanHesap("320", "Saticilar", Decimal("0"), saticilar))

        # 6. Vergi ve SGK
        vergi = revenue * Decimal("0.02")
        sgk = revenue * Decimal("0.015")
        hesaplar.append(MizanHesap("360", "Odenecek Vergi ve Fonlar", Decimal("0"), vergi))
        hesaplar.append(MizanHesap("361", "Odenecek SGK Primleri", Decimal("0"), sgk))

        # 7. Sermaye
        sermaye = Decimal("500000")
        hesaplar.append(MizanHesap("500", "Sermaye", Decimal("0"), sermaye))

        # 8. Satislar
        hesaplar.append(MizanHesap("600", "Yurtici Satislar", Decimal("0"), revenue))

        # 9. Maliyetler
        cogs = revenue * cogs_rate
        hesaplar.append(MizanHesap("621", "Satilan Ticari Mallar Maliyeti (-)", cogs, Decimal("0")))

        # 10. Giderler
        genel_yonetim = revenue * Decimal("0.08")
        pazarlama = revenue * Decimal("0.05")
        hesaplar.append(MizanHesap("770", "Genel Yonetim Giderleri", genel_yonetim, Decimal("0")))
        hesaplar.append(MizanHesap("631", "Pazarlama Satis Dagitim Giderleri (-)", pazarlama, Decimal("0")))

        # 11. Sabit kiymetler
        hesaplar.append(MizanHesap("253", "Tesis Makine Cihazlar", Decimal("250000"), Decimal("0")))
        hesaplar.append(MizanHesap("254", "Tasitlar", Decimal("150000"), Decimal("0")))
        hesaplar.append(MizanHesap("257", "Birikmis Amortismanlar (-)", Decimal("0"), Decimal("80000")))

        return hesaplar

    def to_json(self, hesaplar: List[MizanHesap]) -> List[Dict]:
        """Convert to JSON-serializable format"""
        return [h.to_dict() for h in hesaplar]

    def calculate_totals(self, hesaplar: List[MizanHesap]) -> Dict[str, Decimal]:
        """Calculate mizan totals for verification"""
        total_borc = sum(h.borc for h in hesaplar)
        total_alacak = sum(h.alacak for h in hesaplar)
        total_borc_bakiye = sum(h.borc_bakiye for h in hesaplar)
        total_alacak_bakiye = sum(h.alacak_bakiye for h in hesaplar)

        return {
            "total_borc": total_borc,
            "total_alacak": total_alacak,
            "total_borc_bakiye": total_borc_bakiye,
            "total_alacak_bakiye": total_alacak_bakiye,
            "is_balanced": abs(total_borc_bakiye - total_alacak_bakiye) < Decimal("0.01")
        }
