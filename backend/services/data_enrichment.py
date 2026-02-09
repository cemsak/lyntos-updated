# -*- coding: utf-8 -*-
"""
LYNTOS Data Enrichment Service
AI + External APIs ile veri zenginlestirme

KURGAN 16 senaryo icin eksik verileri:
1. TCMB API - Doviz kurlari, faiz oranlari
2. AI Inference - Sektor analizleri, benchmark tahmini
3. Web Scraping - GIB riskli mukellef listesi
4. Hesap Analizi - Mevcut mizandan akilli cikarimlar
"""

import logging
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass
import httpx
import json

logger = logging.getLogger(__name__)


@dataclass
class EnrichedData:
    """Zenginlestirilmis veri paketi"""
    # Sektor verileri
    sektor_kar_ortalamasi: float = 0.05  # %5 default
    sektor_vergi_yuku: float = 0.02  # %2 default
    sektor_stok_devir_hizi: int = 120  # 120 gun default

    # TCMB verileri
    tcmb_faiz_orani: float = 0.50  # %50 politika faizi
    tcmb_usd_kur: float = 32.0
    tcmb_eur_kur: float = 35.0

    # AI tahmini veriler
    kar_marji: float = 0.0
    tahmini_inceleme_olasiligi: float = 0.0

    # Mizan cikarimli veriler
    ciro: float = 0.0
    satis_maliyeti: float = 0.0  # 620 SMM
    zarar_donem_sayisi: int = 0
    iliskili_kisi_islem_tutari: float = 0.0
    buyuk_nakit_odeme: float = 0.0  # 7000 TL ustu

    # Veri kaynaklari
    data_sources: List[str] = None
    enrichment_timestamp: str = None

    def __post_init__(self):
        if self.data_sources is None:
            self.data_sources = []
        if self.enrichment_timestamp is None:
            self.enrichment_timestamp = datetime.utcnow().isoformat() + "Z"


class TCMBClient:
    """TCMB EVDS API Client"""

    BASE_URL = "https://evds2.tcmb.gov.tr/service/evds"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self._cache: Dict[str, Any] = {}
        self._cache_ttl = timedelta(hours=4)

    async def get_exchange_rates(self) -> Dict[str, float]:
        """Guncel doviz kurlarini al"""
        cache_key = "exchange_rates"

        if cache_key in self._cache:
            cached = self._cache[cache_key]
            if datetime.utcnow() - cached["timestamp"] < self._cache_ttl:
                return cached["data"]

        try:
            # TCMB EVDS API
            # Not: API key olmadan da bazi veriler alinabilir
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Alternatif: TCMB acik veri
                url = "https://www.tcmb.gov.tr/kurlar/today.xml"
                response = await client.get(url)

                if response.status_code == 200:
                    # XML parse (basit)
                    text = response.text
                    usd = self._extract_rate(text, "USD")
                    eur = self._extract_rate(text, "EUR")

                    data = {"USD": usd, "EUR": eur}
                    self._cache[cache_key] = {
                        "data": data,
                        "timestamp": datetime.utcnow()
                    }
                    logger.info(f"TCMB kurlar alindi: USD={usd}, EUR={eur}")
                    return data
        except Exception as e:
            logger.warning(f"TCMB API hatasi: {e}")

        # Fallback - guncel yaklasik degerler
        return {"USD": 32.50, "EUR": 35.20}

    def _extract_rate(self, xml_text: str, currency: str) -> float:
        """XML'den kur cikart (basit parsing)"""
        try:
            # <Currency Kod="USD">...<ForexSelling>32.1234</ForexSelling>
            import re
            pattern = rf'<Currency[^>]*Kod="{currency}"[^>]*>.*?<ForexSelling>([0-9.]+)</ForexSelling>'
            match = re.search(pattern, xml_text, re.DOTALL)
            if match:
                return float(match.group(1))
        except:
            pass
        return 32.0 if currency == "USD" else 35.0

    async def get_interest_rates(self) -> Dict[str, float]:
        """TCMB faiz oranlarini al (config/economic_rates.json'dan)"""
        from config.economic_rates import get_faiz_oranlari
        rates = get_faiz_oranlari()
        return {
            "politika_faizi": rates["politika_faizi"],
            "gecelik_faiz": rates["politika_faizi"] + 0.08,  # koridor +8pp
            "mevduat_faizi": rates["politika_faizi"]
        }


class SektorBenchmark:
    """Sektor benchmark verileri - AI + Static data"""

    # NACE kodlarina gore sektor ortalamalari
    # Kaynak: TurkStat, TCMB Sektor Bilançolari, AI tahmini
    SECTOR_DATA = {
        # Perakende
        "47": {
            "kar_marji": 0.03,      # %3
            "vergi_yuku": 0.018,    # %1.8
            "stok_devir": 60,       # 60 gun
            "nakit_orani": 0.15     # %15
        },
        # Toptan ticaret
        "46": {
            "kar_marji": 0.025,
            "vergi_yuku": 0.015,
            "stok_devir": 45,
            "nakit_orani": 0.12
        },
        # Insaat
        "41": {
            "kar_marji": 0.08,
            "vergi_yuku": 0.02,
            "stok_devir": 180,
            "nakit_orani": 0.08
        },
        "42": {
            "kar_marji": 0.07,
            "vergi_yuku": 0.02,
            "stok_devir": 120,
            "nakit_orani": 0.10
        },
        # Imalat
        "10": {  # Gida
            "kar_marji": 0.06,
            "vergi_yuku": 0.022,
            "stok_devir": 30,
            "nakit_orani": 0.10
        },
        "25": {  # Metal
            "kar_marji": 0.05,
            "vergi_yuku": 0.02,
            "stok_devir": 90,
            "nakit_orani": 0.12
        },
        # Hizmet
        "62": {  # Yazilim
            "kar_marji": 0.15,
            "vergi_yuku": 0.025,
            "stok_devir": 0,  # Stok yok
            "nakit_orani": 0.25
        },
        "70": {  # Danismanlik
            "kar_marji": 0.12,
            "vergi_yuku": 0.028,
            "stok_devir": 0,
            "nakit_orani": 0.20
        },
        # Default
        "default": {
            "kar_marji": 0.05,
            "vergi_yuku": 0.02,
            "stok_devir": 120,
            "nakit_orani": 0.12
        }
    }

    def get_benchmark(self, nace_code: Optional[str]) -> Dict[str, float]:
        """NACE koduna gore sektor benchmark'i getir"""
        if not nace_code:
            return self.SECTOR_DATA["default"]

        # Ilk 2 haneli NACE kodu
        nace_2 = nace_code[:2] if len(nace_code) >= 2 else nace_code

        return self.SECTOR_DATA.get(nace_2, self.SECTOR_DATA["default"])


class MizanAnalyzer:
    """Mizan verilerinden akilli cikarimlar"""

    def __init__(self, hesaplar: Dict[str, Dict]):
        self.hesaplar = hesaplar

    def extract_ciro(self) -> float:
        """Ciro hesapla (600 grubu)"""
        ciro = 0.0
        for kod in ["600", "601", "602"]:
            hesap = self.hesaplar.get(kod, {})
            # Gelir hesaplari alacak bakiyeli
            ciro += hesap.get("alacak_toplam", 0) or hesap.get("bakiye", 0) or 0
        return abs(ciro)

    def extract_smm(self) -> float:
        """Satis maliyeti (620, 621, 622)"""
        smm = 0.0
        for kod in ["620", "621", "622"]:
            hesap = self.hesaplar.get(kod, {})
            # Maliyet hesaplari borc bakiyeli
            smm += hesap.get("borc_toplam", 0) or hesap.get("bakiye", 0) or 0
        return abs(smm)

    def extract_kar_zarar(self) -> float:
        """Net kar/zarar"""
        # 590 Donem Net Kari veya 591 Donem Net Zarari
        kar = self.hesaplar.get("590", {}).get("bakiye", 0) or 0
        zarar = self.hesaplar.get("591", {}).get("bakiye", 0) or 0
        return kar - zarar

    def calculate_kar_marji(self) -> float:
        """Kar marji hesapla"""
        ciro = self.extract_ciro()
        kar = self.extract_kar_zarar()

        if ciro > 0:
            return kar / ciro
        return 0.0

    def extract_iliskili_islemler(self) -> float:
        """Iliskili kisi islemleri (131, 231, 331, 431)"""
        toplam = 0.0
        for kod in ["131", "231", "331", "431"]:
            hesap = self.hesaplar.get(kod, {})
            bakiye = abs(hesap.get("bakiye", 0) or 0)
            toplam += bakiye
        return toplam

    def extract_iliskili_islemler_detay(self) -> Dict[str, float]:
        """
        İlişkili kişi işlemleri hesap bazlı detay
        KVK Md. 12-13 kapsamında değerlendirme için
        """
        return {
            "hesap_131_bakiye": abs(self.hesaplar.get("131", {}).get("bakiye", 0) or 0),  # Ortaklardan Alacaklar
            "hesap_231_bakiye": abs(self.hesaplar.get("231", {}).get("bakiye", 0) or 0),  # Ortaklardan Alacaklar (U.V.)
            "hesap_331_bakiye": abs(self.hesaplar.get("331", {}).get("bakiye", 0) or 0),  # Ortaklara Borçlar
            "hesap_431_bakiye": abs(self.hesaplar.get("431", {}).get("bakiye", 0) or 0),  # Ortaklara Borçlar (U.V.)
            "toplam": self.extract_iliskili_islemler()
        }

    def extract_ozkaynak(self) -> float:
        """
        Özkaynak hesaplaması (KVK Md. 12 örtülü sermaye için)
        500 Sermaye + 520 Yedekler + 570 Geçmiş Yıl Karları - 580 Geçmiş Yıl Zararları
        """
        sermaye = abs(self.hesaplar.get("500", {}).get("bakiye", 0) or 0)
        sermaye += abs(self.hesaplar.get("501", {}).get("bakiye", 0) or 0)  # Ödenmemiş Sermaye (-)
        sermaye += abs(self.hesaplar.get("502", {}).get("bakiye", 0) or 0)  # Sermaye Düzeltmesi
        yedekler = abs(self.hesaplar.get("520", {}).get("bakiye", 0) or 0)
        yedekler += abs(self.hesaplar.get("540", {}).get("bakiye", 0) or 0)  # Yasal Yedekler
        yedekler += abs(self.hesaplar.get("549", {}).get("bakiye", 0) or 0)  # Özel Yedekler
        gecmis_kar = abs(self.hesaplar.get("570", {}).get("bakiye", 0) or 0)
        gecmis_zarar = abs(self.hesaplar.get("580", {}).get("bakiye", 0) or 0)
        return sermaye + yedekler + gecmis_kar - gecmis_zarar

    def detect_large_cash_payments(self) -> float:
        """7.000 TL ustu nakit odeme tespiti"""
        # 100 Kasa - alacak hareketleri (cikislar)
        kasa = self.hesaplar.get("100", {})
        alacak = kasa.get("alacak_toplam", 0) or 0

        # Tek seferde 7000 TL ustu tespit edemiyoruz
        # Ama yuksek kasa alacak hareketi uyari verir
        if alacak > 50000:  # Toplam 50K ustu kasa cikisi
            # Tahmini buyuk odeme orani
            return alacak * 0.3  # %30'u buyuk odeme varsayimi
        return 0.0

    def count_loss_periods(self, historical_data: Optional[List[Dict]] = None) -> int:
        """Zarar donemi sayisi"""
        if historical_data:
            count = 0
            for period in historical_data:
                kar = period.get("kar_zarar", 0)
                if kar < 0:
                    count += 1
            return count

        # Tek donem icin mevcut kar/zarar'a bak
        kar = self.extract_kar_zarar()
        return 1 if kar < 0 else 0

    def calculate_vergi_yuku(self) -> float:
        """Efektif vergi yuku"""
        ciro = self.extract_ciro()

        # 360 Odenecek Vergi + 361 Odenecek SGK
        vergi = abs(self.hesaplar.get("360", {}).get("bakiye", 0) or 0)
        sgk = abs(self.hesaplar.get("361", {}).get("bakiye", 0) or 0)

        toplam_vergi = vergi + sgk

        if ciro > 0:
            return toplam_vergi / ciro
        return 0.0


class DataEnrichmentService:
    """
    Ana veri zenginlestirme servisi

    Kullanim:
        service = DataEnrichmentService()
        enriched = await service.enrich(portfolio_data, nace_code="47.62")
    """

    def __init__(self):
        self.tcmb = TCMBClient()
        self.benchmark = SektorBenchmark()
        self._ai_orchestrator = None

    @property
    def ai(self):
        """Lazy load AI orchestrator"""
        if self._ai_orchestrator is None:
            try:
                from services.ai.orchestrator import AIOrchestrator
                self._ai_orchestrator = AIOrchestrator()
            except ImportError:
                logger.warning("AI Orchestrator yuklenemedi")
        return self._ai_orchestrator

    async def enrich(
        self,
        portfolio_data: Dict[str, Any],
        nace_code: Optional[str] = None,
        use_ai: bool = True
    ) -> Dict[str, Any]:
        """
        Portfolio verisini zenginlestir

        Args:
            portfolio_data: Mizan bazli portfolio verisi
            nace_code: NACE sektor kodu (opsiyonel)
            use_ai: AI kullanilsin mi?

        Returns:
            Zenginlestirilmis veri dict'i
        """
        enriched = EnrichedData()

        # 1. Mizan analizi
        hesaplar = portfolio_data.get("hesaplar", {})
        iliskili_detay = {}
        ozkaynak = 0
        if hesaplar:
            analyzer = MizanAnalyzer(hesaplar)
            enriched.ciro = analyzer.extract_ciro()
            enriched.satis_maliyeti = analyzer.extract_smm()
            enriched.kar_marji = analyzer.calculate_kar_marji()
            enriched.iliskili_kisi_islem_tutari = analyzer.extract_iliskili_islemler()
            enriched.buyuk_nakit_odeme = analyzer.detect_large_cash_payments()
            enriched.zarar_donem_sayisi = analyzer.count_loss_periods()
            # KRG-13 için detaylı hesap bilgileri
            iliskili_detay = analyzer.extract_iliskili_islemler_detay()
            ozkaynak = analyzer.extract_ozkaynak()
            enriched.data_sources.append("mizan_analysis")
            logger.info(f"Mizan analizi: ciro={enriched.ciro:,.0f}, kar_marji={enriched.kar_marji:.2%}")

        # 2. Sektor benchmark
        sector_data = self.benchmark.get_benchmark(nace_code)
        enriched.sektor_kar_ortalamasi = sector_data["kar_marji"]
        enriched.sektor_vergi_yuku = sector_data["vergi_yuku"]
        enriched.sektor_stok_devir_hizi = sector_data["stok_devir"]
        enriched.data_sources.append("sector_benchmark")

        # 3. TCMB verileri
        try:
            rates = await self.tcmb.get_exchange_rates()
            enriched.tcmb_usd_kur = rates.get("USD", 32.0)
            enriched.tcmb_eur_kur = rates.get("EUR", 35.0)

            interest = await self.tcmb.get_interest_rates()
            enriched.tcmb_faiz_orani = interest.get("politika_faizi", 0.50)
            enriched.data_sources.append("tcmb_api")
        except Exception as e:
            logger.warning(f"TCMB veri alinamadi: {e}")

        # 4. AI ile tahmini inceleme olasiligi
        if use_ai and self.ai:
            try:
                probability = await self._estimate_inspection_probability(
                    portfolio_data, enriched
                )
                enriched.tahmini_inceleme_olasiligi = probability
                enriched.data_sources.append("ai_inference")
            except Exception as e:
                logger.warning(f"AI tahmin hatasi: {e}")

        # Portfolio data'ya ekle
        result = portfolio_data.copy()
        result.update({
            # KURGAN senaryo verileri
            "ciro": enriched.ciro or portfolio_data.get("ciro", 0),
            "kar_marji": enriched.kar_marji,
            "satis_maliyeti": enriched.satis_maliyeti,
            "sektor_kar_ortalamasi": enriched.sektor_kar_ortalamasi,
            "sektor_vergi_yuku": enriched.sektor_vergi_yuku,
            "iliskili_kisi_islem_tutari": enriched.iliskili_kisi_islem_tutari,
            "zarar_donem_sayisi": enriched.zarar_donem_sayisi,
            "7000_ustu_nakit_odeme": enriched.buyuk_nakit_odeme,

            # KRG-13: Transfer Fiyatlandırması için detaylı hesap bilgileri
            "hesap_131_bakiye": iliskili_detay.get("hesap_131_bakiye", 0),  # Ortaklardan Alacaklar
            "hesap_231_bakiye": iliskili_detay.get("hesap_231_bakiye", 0),  # Ortaklardan Alacaklar (U.V.)
            "hesap_331_bakiye": iliskili_detay.get("hesap_331_bakiye", 0),  # Ortaklara Borçlar
            "hesap_431_bakiye": iliskili_detay.get("hesap_431_bakiye", 0),  # Ortaklara Borçlar (U.V.)
            "ozkaynak": ozkaynak,  # KVK Md. 12 örtülü sermaye hesabı için

            # TCMB
            "tcmb_faiz_orani": enriched.tcmb_faiz_orani,
            "tcmb_usd_kur": enriched.tcmb_usd_kur,

            # AI
            "tahmini_inceleme_olasiligi": enriched.tahmini_inceleme_olasiligi,

            # Meta
            "enrichment_sources": enriched.data_sources,
            "enrichment_timestamp": enriched.enrichment_timestamp
        })

        logger.info(f"Veri zenginlestirildi: {len(enriched.data_sources)} kaynak kullanildi")
        return result

    async def _estimate_inspection_probability(
        self,
        portfolio_data: Dict,
        enriched: EnrichedData
    ) -> float:
        """AI ile inceleme olasiligi tahmini"""
        if not self.ai:
            return 0.0

        # AI'ya gonderilecek ozet
        summary = f"""
        Sirket Analizi:
        - Ciro: {enriched.ciro:,.0f} TL
        - Kar Marji: {enriched.kar_marji:.2%} (Sektor: {enriched.sektor_kar_ortalamasi:.2%})
        - Zarar Donem Sayisi: {enriched.zarar_donem_sayisi}
        - Iliskili Kisi Islemleri: {enriched.iliskili_kisi_islem_tutari:,.0f} TL
        - Buyuk Nakit Odeme: {enriched.buyuk_nakit_odeme:,.0f} TL

        Bu verilere gore VDK inceleme olasiligini 0-100 arasinda degerlendir.
        Sadece sayi dondur.
        """

        try:
            from services.ai.base_provider import TaskType
            response = await self.ai.generate(
                prompt=summary,
                task_type=TaskType.RISK_EXPLANATION,
                max_tokens=50,
                temperature=0.3
            )

            if response.success:
                # Sayiyi cikart
                import re
                numbers = re.findall(r'\d+', response.content)
                if numbers:
                    prob = int(numbers[0])
                    return min(max(prob, 0), 100) / 100.0
        except Exception as e:
            logger.warning(f"AI inceleme tahmini hatasi: {e}")

        return 0.0


# Singleton instance
_enrichment_service: Optional[DataEnrichmentService] = None


def get_enrichment_service() -> DataEnrichmentService:
    """Singleton enrichment service"""
    global _enrichment_service
    if _enrichment_service is None:
        _enrichment_service = DataEnrichmentService()
    return _enrichment_service


async def enrich_portfolio_data(
    portfolio_data: Dict[str, Any],
    nace_code: Optional[str] = None
) -> Dict[str, Any]:
    """
    Portfolio verisini zenginlestir - convenience function

    Usage:
        from data_enrichment import enrich_portfolio_data
        enriched = await enrich_portfolio_data(portfolio_data, nace_code="47.62")
    """
    service = get_enrichment_service()
    return await service.enrich(portfolio_data, nace_code)
