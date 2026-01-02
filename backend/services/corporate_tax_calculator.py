"""
Kurumlar Vergisi Hesaplayici

Kaynak:
- Kurumlar Vergisi Kanunu (5520)
- KVK Genel Tebligi (Son: 2025)
- GVK Gecici 61 (R&D indirimi)
- Maliye Bakanligi teblligleri

Trust Score: 1.0 (Resmi mevzuat)
"""

from dataclasses import dataclass, asdict
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


@dataclass
class TicariKar:
    """Ticari kar (Gelir tablosundan)"""
    donem_kari: float
    donem_zarari: float
    net_donem_kari: float  # donem_kari - donem_zarari


@dataclass
class MaliKar:
    """Mali kar (Kurumlar Vergisi beyannamesine gore)"""
    ticari_kar: float
    kanunen_kabul_edilmeyen_giderler: float
    istisna_kazanclar: float
    gecmis_donem_zararlari: float
    mali_kar: float


@dataclass
class KurumsalVergiBeyani:
    """Kurumlar Vergisi beyannamesi (tam detay)"""

    # Bolum 1: Ticari Bilanco
    ticari_kar: TicariKar

    # Bolum 2: Mali Kar Hesabi
    mali_kar: MaliKar

    # Bolum 3: Indirimler
    r_and_d_indirimi: float = 0  # GVK Gecici 61
    yatirim_indirimi: float = 0
    bagis_indirimi: float = 0
    sponsorluk_indirimi: float = 0

    # Bolum 4: Matrah
    kurumlar_vergisi_matrahi: float = 0

    # Bolum 5: Vergi
    vergi_orani: float = 0.25  # %25 (2025 icin)
    hesaplanan_vergi: float = 0

    # Bolum 6: Indirimler/Mahsuplar
    yurtdisi_vergi_mahsubu: float = 0
    gecici_vergi_mahsubu: float = 0

    # Bolum 7: Odenecek/Iade
    odenecek_vergi: float = 0
    iade_edilecek_vergi: float = 0

    # Referans
    kaynak: str = "5520 Sayili KVK"
    trust_score: float = 1.0

    def to_dict(self) -> Dict:
        """Dataclass'i dict'e cevir"""
        return {
            "ticari_kar": asdict(self.ticari_kar),
            "mali_kar": asdict(self.mali_kar),
            "r_and_d_indirimi": self.r_and_d_indirimi,
            "yatirim_indirimi": self.yatirim_indirimi,
            "bagis_indirimi": self.bagis_indirimi,
            "sponsorluk_indirimi": self.sponsorluk_indirimi,
            "kurumlar_vergisi_matrahi": self.kurumlar_vergisi_matrahi,
            "vergi_orani": self.vergi_orani,
            "hesaplanan_vergi": self.hesaplanan_vergi,
            "yurtdisi_vergi_mahsubu": self.yurtdisi_vergi_mahsubu,
            "gecici_vergi_mahsubu": self.gecici_vergi_mahsubu,
            "odenecek_vergi": self.odenecek_vergi,
            "iade_edilecek_vergi": self.iade_edilecek_vergi,
            "kaynak": self.kaynak,
            "trust_score": self.trust_score
        }


class CorporateTaxCalculator:
    """Kurumlar Vergisi hesaplayici (2025 mevzuati)"""

    # Vergi orani (2025)
    VERGI_ORANI = 0.25  # %25

    # GVK Gecici 61 (R&D indirimi)
    R_AND_D_MAX_RATE = 1.0  # %100 indirim

    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    def calculate(
        self,
        portfolio_data: Dict,
        gelir_tablosu: Optional[Dict] = None,
        vergi_beyani_onceki: Optional[Dict] = None
    ) -> KurumsalVergiBeyani:
        """
        Kurumlar Vergisi beyanini hesapla

        Args:
            portfolio_data: Portfolio verileri
            gelir_tablosu: Gelir tablosu (donem_kari, giderler, ...)
            vergi_beyani_onceki: Onceki donem beyani (gecmis zararlar icin)

        Returns:
            KurumsalVergiBeyani: Tam beyan detayi
        """
        try:
            self.logger.info("Kurumlar Vergisi hesaplamasi basladi")

            if not portfolio_data:
                raise ValueError("portfolio_data bos olamaz")

            # Gelir tablosu yoksa portfolio'dan al
            if not gelir_tablosu:
                gelir_tablosu = portfolio_data.get("gelir_tablosu", {})

            # 1. Ticari kar (Gelir tablosundan)
            ticari_kar = self._extract_ticari_kar(gelir_tablosu, portfolio_data)

            # 2. Mali kar (Ticari kar -> Mali kar)
            mali_kar = self._calculate_mali_kar(
                ticari_kar,
                portfolio_data,
                vergi_beyani_onceki
            )

            # 3. Indirimler
            r_and_d = self._calculate_r_and_d_indirimi(portfolio_data)
            yatirim = portfolio_data.get("yatirim_indirimi", 0)
            bagis = portfolio_data.get("bagis_indirimi", 0)
            sponsorluk = portfolio_data.get("sponsorluk_indirimi", 0)

            toplam_indirim = r_and_d + yatirim + bagis + sponsorluk

            # 4. Matrah
            matrah = max(0, mali_kar.mali_kar - toplam_indirim)

            # 5. Hesaplanan vergi
            hesaplanan_vergi = matrah * self.VERGI_ORANI

            # 6. Mahsuplar
            gecici_vergi = portfolio_data.get("gecici_vergi_toplam", 0)
            yurtdisi_vergi = portfolio_data.get("yurtdisi_vergi_mahsubu", 0)

            toplam_mahsup = gecici_vergi + yurtdisi_vergi

            # 7. Odenecek/Iade
            odenecek = max(0, hesaplanan_vergi - toplam_mahsup)
            iade = max(0, toplam_mahsup - hesaplanan_vergi)

            beyan = KurumsalVergiBeyani(
                ticari_kar=ticari_kar,
                mali_kar=mali_kar,
                r_and_d_indirimi=r_and_d,
                yatirim_indirimi=yatirim,
                bagis_indirimi=bagis,
                sponsorluk_indirimi=sponsorluk,
                kurumlar_vergisi_matrahi=matrah,
                vergi_orani=self.VERGI_ORANI,
                hesaplanan_vergi=hesaplanan_vergi,
                yurtdisi_vergi_mahsubu=yurtdisi_vergi,
                gecici_vergi_mahsubu=gecici_vergi,
                odenecek_vergi=odenecek,
                iade_edilecek_vergi=iade
            )

            self.logger.info(
                f"Kurumlar Vergisi hesaplandi: Matrah={matrah:,.0f}, Vergi={hesaplanan_vergi:,.0f}"
            )
            return beyan

        except Exception as e:
            self.logger.error(f"Kurumlar Vergisi hesaplama hatasi: {e}", exc_info=True)
            raise

    def _extract_ticari_kar(self, gelir_tablosu: Dict, portfolio_data: Dict) -> TicariKar:
        """Gelir tablosundan ticari kari cikar"""

        # Gelir tablosundan
        donem_kari = gelir_tablosu.get("donem_net_kari", 0)
        donem_zarari = gelir_tablosu.get("donem_net_zarari", 0)

        # Fallback: portfolio'dan kar_zarar
        if donem_kari == 0 and donem_zarari == 0:
            kar_zarar = portfolio_data.get("kar_zarar", 0)
            if kar_zarar >= 0:
                donem_kari = kar_zarar
            else:
                donem_zarari = abs(kar_zarar)

        return TicariKar(
            donem_kari=max(0, donem_kari),
            donem_zarari=max(0, abs(donem_zarari)),
            net_donem_kari=donem_kari - abs(donem_zarari)
        )

    def _calculate_mali_kar(
        self,
        ticari_kar: TicariKar,
        portfolio_data: Dict,
        vergi_beyani_onceki: Optional[Dict]
    ) -> MaliKar:
        """Ticari kar -> Mali kar donusumu"""

        # Kanunen kabul edilmeyen giderler
        kkeg = self._calculate_kkeg(portfolio_data)

        # Istisna kazanclar (Istirak kazanclari vs)
        istisna = portfolio_data.get("istirak_kazanci_istisnasi", 0)

        # Gecmis donem zararlari
        gecmis_zarar = 0
        if vergi_beyani_onceki:
            gecmis_zarar = vergi_beyani_onceki.get("devredilecek_zarar", 0)

        # Alternatif: portfolio'dan
        if gecmis_zarar == 0:
            gecmis_zarar = portfolio_data.get("gecmis_donem_zarari", 0)

        # Mali kar hesapla
        mali_kar_tutar = ticari_kar.net_donem_kari + kkeg - istisna - gecmis_zarar

        return MaliKar(
            ticari_kar=ticari_kar.net_donem_kari,
            kanunen_kabul_edilmeyen_giderler=kkeg,
            istisna_kazanclar=istisna,
            gecmis_donem_zararlari=gecmis_zarar,
            mali_kar=max(0, mali_kar_tutar)
        )

    def _calculate_kkeg(self, portfolio_data: Dict) -> float:
        """
        Kanunen Kabul Edilmeyen Giderler

        Kaynak: KVK Madde 11
        """
        kkeg = 0

        # Ortulu sermaye faizi
        ortulu_sermaye = portfolio_data.get("ortulu_sermaye_faizi", 0)
        kkeg += ortulu_sermaye

        # Ortulu kazanc dagitimi
        ortulu_kazanc = portfolio_data.get("ortulu_kazanc_dagitimi", 0)
        kkeg += ortulu_kazanc

        # Karsilik giderleri (asan kisim)
        karsilik_asan = portfolio_data.get("karsilik_gider_asan", 0)
        kkeg += karsilik_asan

        # Para cezalari
        para_cezasi = portfolio_data.get("para_cezalari", 0)
        kkeg += para_cezasi

        # MTV ve diger indirilemeyenler
        mtv = portfolio_data.get("mtv_gideri", 0)
        kkeg += mtv

        return kkeg

    def _calculate_r_and_d_indirimi(self, portfolio_data: Dict) -> float:
        """
        R&D Indirimi (GVK Gecici 61)

        %100 indirim hakki
        """
        r_and_d_harcama = portfolio_data.get("ar_ge_harcamasi", 0)

        # %100 indirim
        indirim = r_and_d_harcama * self.R_AND_D_MAX_RATE

        return indirim

    def generate_forecast(
        self,
        portfolio_data: Dict,
        gelir_tablosu: Optional[Dict] = None,
        senaryo: str = "base"
    ) -> Dict:
        """
        Gelecek donem vergi ongorusu

        Args:
            senaryo: "optimistic" | "base" | "pessimistic"

        Returns:
            {
                "tahmini_ciro": float,
                "tahmini_kar": float,
                "tahmini_vergi": float,
                "tahmini_net_kar": float
            }
        """

        # Gecmis trend analizi (son 4 donem)
        ciro_trend = portfolio_data.get("ciro_trend", [])
        kar_trend = portfolio_data.get("kar_trend", [])

        # Trend yoksa mevcut degerlerden olustur
        if not ciro_trend:
            ciro = portfolio_data.get("ciro", 0)
            ciro_trend = [ciro * 0.9, ciro * 0.95, ciro]

        if not kar_trend:
            kar = portfolio_data.get("kar_zarar", 0)
            kar_trend = [kar * 0.9, kar * 0.95, kar]

        if len(ciro_trend) < 2:
            # Yeterli veri yok
            return {
                "senaryo": senaryo,
                "tahmini_ciro": 0,
                "tahmini_kar": 0,
                "tahmini_vergi": 0,
                "tahmini_net_kar": 0,
                "confidence": "low",
                "aciklama": "Yeterli gecmis veri yok"
            }

        # Ortalama buyume orani
        ciro_buyume = self._calculate_growth_rate(ciro_trend)
        kar_buyume = self._calculate_growth_rate(kar_trend)

        # Senaryo katsayilari
        katsayilar = {
            "optimistic": 1.2,
            "base": 1.0,
            "pessimistic": 0.8
        }
        katsayi = katsayilar.get(senaryo, 1.0)

        # Tahmin
        son_ciro = ciro_trend[-1] if ciro_trend[-1] > 0 else 1
        son_kar = kar_trend[-1]

        tahmini_ciro = son_ciro * (1 + ciro_buyume * katsayi)
        tahmini_kar = son_kar * (1 + kar_buyume * katsayi) if son_kar > 0 else son_ciro * 0.05

        # Vergi hesapla (pozitif kar icin)
        tahmini_vergi = max(0, tahmini_kar * self.VERGI_ORANI)
        tahmini_net_kar = tahmini_kar - tahmini_vergi

        # Confidence
        confidence = "high" if len(ciro_trend) >= 8 else "medium" if len(ciro_trend) >= 4 else "low"

        return {
            "senaryo": senaryo,
            "tahmini_ciro": round(tahmini_ciro, 2),
            "tahmini_kar": round(tahmini_kar, 2),
            "tahmini_vergi": round(tahmini_vergi, 2),
            "tahmini_net_kar": round(tahmini_net_kar, 2),
            "ciro_buyume_orani": round(ciro_buyume * 100, 1),
            "kar_buyume_orani": round(kar_buyume * 100, 1),
            "confidence": confidence,
            "aciklama": self._get_forecast_explanation(senaryo, confidence)
        }

    def _calculate_growth_rate(self, trend: List[float]) -> float:
        """Ortalama buyume orani hesapla"""
        if len(trend) < 2:
            return 0

        buyume_oranlari = []
        for i in range(1, len(trend)):
            if trend[i - 1] != 0:
                buyume = (trend[i] - trend[i - 1]) / abs(trend[i - 1])
                buyume_oranlari.append(buyume)

        if not buyume_oranlari:
            return 0

        return sum(buyume_oranlari) / len(buyume_oranlari)

    def _get_forecast_explanation(self, senaryo: str, confidence: str) -> str:
        """Ongoru aciklamasi"""
        senaryo_text = {
            "optimistic": "Iyimser senaryo: Piyasa kosullari ve sektorel buyume olumlu",
            "base": "Baz senaryo: Mevcut trend devam eder",
            "pessimistic": "Kotumser senaryo: Ekonomik yavasslama beklentisi"
        }

        confidence_text = {
            "high": "Guvenilirlik yuksek (8+ donem verisi)",
            "medium": "Guvenilirlik orta (4-7 donem verisi)",
            "low": "Guvenilirlik dusuk (yetersiz veri)"
        }

        return f"{senaryo_text.get(senaryo, '')}. {confidence_text.get(confidence, '')}"


# Singleton instance
corporate_tax_calculator = CorporateTaxCalculator()
