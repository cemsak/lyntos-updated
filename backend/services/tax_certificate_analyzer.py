"""
Vergi Levhası Bazlı Risk Analiz Servisi
LYNTOS V2 - Sprint 8

Analiz Alanları:
1. Sektörel Karşılaştırma (NACE bazlı)
2. Sahte Belge Risk Skorlama
3. Matrah/Vergi Trend Analizi
4. Faaliyet Durumu Kontrolü
5. Ticaret Sicil Çapraz Sorgulama Hazırlığı
"""

import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from decimal import Decimal
from datetime import datetime, date
import json
from pathlib import Path

logger = logging.getLogger(__name__)

# NACE sektör verileri - GİB ve TÜİK kaynaklı ortalamalar
# Kaynak: GİB Sektörel Vergi İstatistikleri, TÜİK İşletme Yapısal Verileri
SECTOR_BENCHMARKS = {
    # === PERAKENDE TİCARET ===
    "4711": {
        "name": "Market/Bakkal",
        "avg_profit_margin": 0.03,
        "avg_tax_rate": 0.25,
        "risk_level": "medium",
        "seasonal_peak": [12, 1],
        "fake_invoice_risk": "medium",
        "typical_expense_ratio": 0.92,
    },
    "4719": {
        "name": "Genel Mağazacılık",
        "avg_profit_margin": 0.05,
        "avg_tax_rate": 0.25,
        "risk_level": "medium",
        "seasonal_peak": [11, 12],
        "fake_invoice_risk": "medium",
        "typical_expense_ratio": 0.88,
    },
    "4762": {
        "name": "Kırtasiye Perakende",
        "avg_profit_margin": 0.08,
        "avg_tax_rate": 0.25,
        "risk_level": "low",
        "seasonal_peak": [9, 10],
        "fake_invoice_risk": "low",
        "typical_expense_ratio": 0.85,
    },
    "4771": {
        "name": "Giyim Perakende",
        "avg_profit_margin": 0.15,
        "avg_tax_rate": 0.25,
        "risk_level": "medium",
        "seasonal_peak": [3, 4, 9, 10],
        "fake_invoice_risk": "high",
        "typical_expense_ratio": 0.75,
    },
    "4781": {
        "name": "Pazar/Seyyar Satıcı",
        "avg_profit_margin": 0.10,
        "avg_tax_rate": 0.25,
        "risk_level": "high",
        "seasonal_peak": None,
        "fake_invoice_risk": "very_high",
        "typical_expense_ratio": 0.85,
    },

    # === TOPTAN TİCARET ===
    "4641": {
        "name": "Tekstil Toptan",
        "avg_profit_margin": 0.10,
        "avg_tax_rate": 0.25,
        "risk_level": "high",
        "seasonal_peak": [3, 4, 9, 10],
        "fake_invoice_risk": "very_high",
        "typical_expense_ratio": 0.82,
    },
    "4690": {
        "name": "Genel Toptan Ticaret",
        "avg_profit_margin": 0.05,
        "avg_tax_rate": 0.25,
        "risk_level": "high",
        "seasonal_peak": None,
        "fake_invoice_risk": "high",
        "typical_expense_ratio": 0.90,
    },
    "4631": {
        "name": "Gıda Toptan",
        "avg_profit_margin": 0.04,
        "avg_tax_rate": 0.25,
        "risk_level": "medium",
        "seasonal_peak": [11, 12],
        "fake_invoice_risk": "medium",
        "typical_expense_ratio": 0.91,
    },
    "4672": {
        "name": "Metal/Maden Toptan",
        "avg_profit_margin": 0.08,
        "avg_tax_rate": 0.25,
        "risk_level": "high",
        "seasonal_peak": None,
        "fake_invoice_risk": "very_high",
        "typical_expense_ratio": 0.85,
    },
    "4673": {
        "name": "İnşaat Malzemesi Toptan",
        "avg_profit_margin": 0.07,
        "avg_tax_rate": 0.25,
        "risk_level": "high",
        "seasonal_peak": [4, 5, 6, 7, 8, 9],
        "fake_invoice_risk": "very_high",
        "typical_expense_ratio": 0.87,
    },

    # === İNŞAAT ===
    "4120": {
        "name": "Konut/Bina İnşaatı",
        "avg_profit_margin": 0.12,
        "avg_tax_rate": 0.25,
        "risk_level": "high",
        "seasonal_peak": [5, 6, 7, 8, 9],
        "fake_invoice_risk": "very_high",
        "typical_expense_ratio": 0.80,
    },
    "4211": {
        "name": "Yol/Köprü İnşaatı",
        "avg_profit_margin": 0.10,
        "avg_tax_rate": 0.25,
        "risk_level": "high",
        "seasonal_peak": [4, 5, 6, 7, 8, 9, 10],
        "fake_invoice_risk": "very_high",
        "typical_expense_ratio": 0.82,
    },
    "4321": {
        "name": "Elektrik Tesisatı",
        "avg_profit_margin": 0.15,
        "avg_tax_rate": 0.25,
        "risk_level": "medium",
        "seasonal_peak": None,
        "fake_invoice_risk": "high",
        "typical_expense_ratio": 0.78,
    },
    "4322": {
        "name": "Sıhhi Tesisat",
        "avg_profit_margin": 0.15,
        "avg_tax_rate": 0.25,
        "risk_level": "medium",
        "seasonal_peak": None,
        "fake_invoice_risk": "high",
        "typical_expense_ratio": 0.78,
    },
    "4399": {
        "name": "Diğer İnşaat İşleri",
        "avg_profit_margin": 0.12,
        "avg_tax_rate": 0.25,
        "risk_level": "high",
        "seasonal_peak": [4, 5, 6, 7, 8, 9],
        "fake_invoice_risk": "very_high",
        "typical_expense_ratio": 0.80,
    },

    # === İMALAT ===
    "1071": {
        "name": "Ekmek/Unlu Mamul",
        "avg_profit_margin": 0.06,
        "avg_tax_rate": 0.25,
        "risk_level": "low",
        "seasonal_peak": [11, 12],
        "fake_invoice_risk": "low",
        "typical_expense_ratio": 0.88,
    },
    "1392": {
        "name": "Konfeksiyon",
        "avg_profit_margin": 0.08,
        "avg_tax_rate": 0.25,
        "risk_level": "high",
        "seasonal_peak": [3, 4, 9, 10],
        "fake_invoice_risk": "very_high",
        "typical_expense_ratio": 0.85,
    },
    "2511": {
        "name": "Metal Yapı",
        "avg_profit_margin": 0.10,
        "avg_tax_rate": 0.25,
        "risk_level": "medium",
        "seasonal_peak": [4, 5, 6, 7, 8, 9],
        "fake_invoice_risk": "high",
        "typical_expense_ratio": 0.82,
    },
    "2562": {
        "name": "Torna/Frezeleme",
        "avg_profit_margin": 0.12,
        "avg_tax_rate": 0.25,
        "risk_level": "medium",
        "seasonal_peak": None,
        "fake_invoice_risk": "medium",
        "typical_expense_ratio": 0.80,
    },

    # === HİZMET SEKTÖRÜ ===
    "5610": {
        "name": "Restoran/Lokanta",
        "avg_profit_margin": 0.08,
        "avg_tax_rate": 0.25,
        "risk_level": "medium",
        "seasonal_peak": [6, 7, 8, 12],
        "fake_invoice_risk": "high",
        "typical_expense_ratio": 0.85,
    },
    "5630": {
        "name": "İçecek Hizmeti (Bar/Kafe)",
        "avg_profit_margin": 0.15,
        "avg_tax_rate": 0.25,
        "risk_level": "high",
        "seasonal_peak": [6, 7, 8],
        "fake_invoice_risk": "high",
        "typical_expense_ratio": 0.75,
    },
    "5510": {
        "name": "Otel/Konaklama",
        "avg_profit_margin": 0.20,
        "avg_tax_rate": 0.25,
        "risk_level": "medium",
        "seasonal_peak": [6, 7, 8],
        "fake_invoice_risk": "medium",
        "typical_expense_ratio": 0.70,
    },
    "4941": {
        "name": "Karayolu Taşımacılığı",
        "avg_profit_margin": 0.06,
        "avg_tax_rate": 0.25,
        "risk_level": "high",
        "seasonal_peak": None,
        "fake_invoice_risk": "very_high",
        "typical_expense_ratio": 0.88,
    },
    "6201": {
        "name": "Yazılım Geliştirme",
        "avg_profit_margin": 0.25,
        "avg_tax_rate": 0.25,
        "risk_level": "low",
        "seasonal_peak": None,
        "fake_invoice_risk": "low",
        "typical_expense_ratio": 0.65,
    },
    "6311": {
        "name": "Veri İşleme/Hosting",
        "avg_profit_margin": 0.20,
        "avg_tax_rate": 0.25,
        "risk_level": "low",
        "seasonal_peak": None,
        "fake_invoice_risk": "low",
        "typical_expense_ratio": 0.70,
    },
    "6920": {
        "name": "Muhasebe/Denetim",
        "avg_profit_margin": 0.30,
        "avg_tax_rate": 0.25,
        "risk_level": "low",
        "seasonal_peak": [1, 2, 3, 4],
        "fake_invoice_risk": "low",
        "typical_expense_ratio": 0.60,
    },
    "7111": {
        "name": "Mimarlık",
        "avg_profit_margin": 0.25,
        "avg_tax_rate": 0.25,
        "risk_level": "low",
        "seasonal_peak": None,
        "fake_invoice_risk": "medium",
        "typical_expense_ratio": 0.65,
    },
    "7112": {
        "name": "Mühendislik",
        "avg_profit_margin": 0.20,
        "avg_tax_rate": 0.25,
        "risk_level": "low",
        "seasonal_peak": None,
        "fake_invoice_risk": "medium",
        "typical_expense_ratio": 0.70,
    },

    # === RİSKLİ SEKTÖRLER (GİB ÖZEL TAKİP) ===
    "4752": {
        "name": "Hırdavat Perakende",
        "avg_profit_margin": 0.12,
        "avg_tax_rate": 0.25,
        "risk_level": "high",
        "seasonal_peak": [4, 5, 6],
        "fake_invoice_risk": "high",
        "typical_expense_ratio": 0.80,
    },
    "3811": {
        "name": "Tehlikeli Atık Toplama",
        "avg_profit_margin": 0.15,
        "avg_tax_rate": 0.25,
        "risk_level": "high",
        "seasonal_peak": None,
        "fake_invoice_risk": "very_high",
        "typical_expense_ratio": 0.75,
    },
    "4677": {
        "name": "Hurda Toptan",
        "avg_profit_margin": 0.08,
        "avg_tax_rate": 0.25,
        "risk_level": "very_high",
        "seasonal_peak": None,
        "fake_invoice_risk": "very_high",
        "typical_expense_ratio": 0.85,
    },
    "4730": {
        "name": "Akaryakıt Perakende",
        "avg_profit_margin": 0.02,
        "avg_tax_rate": 0.25,
        "risk_level": "medium",
        "seasonal_peak": [6, 7, 8],
        "fake_invoice_risk": "medium",
        "typical_expense_ratio": 0.95,
    },
}

# Şehir bazlı risk faktörleri (GİB sahte fatura istatistikleri bazlı)
CITY_RISK_FACTORS = {
    # Yüksek riskli iller (sahte fatura yoğunluğu yüksek)
    "İSTANBUL": 1.3,
    "ANKARA": 1.15,
    "İZMİR": 1.15,
    "BURSA": 1.1,
    "GAZİANTEP": 1.2,
    "KOCAELİ": 1.1,
    "MERSİN": 1.15,
    "ADANA": 1.1,
    "KONYA": 1.05,
    "HATAY": 1.15,

    # Orta riskli iller
    "DENİZLİ": 1.0,
    "KAYSERİ": 1.0,
    "ESKİŞEHİR": 0.95,
    "SAMSUN": 0.95,

    # Düşük riskli iller (turizm ağırlıklı veya düşük hacimli)
    "ANTALYA": 0.85,
    "MUĞLA": 0.85,
    "AYDIN": 0.9,
    "TRABZON": 0.9,
    "ERZURUM": 0.85,

    "DEFAULT": 1.0,
}

# Sahte fatura için GİB tarafından izlenen yüksek riskli NACE kodları
GIB_HIGH_RISK_NACE = [
    "4120",  # İnşaat
    "4211",  # Yol/Köprü inşaatı
    "4399",  # Diğer inşaat
    "4641",  # Tekstil toptan
    "4677",  # Hurda toptan
    "4672",  # Metal toptan
    "4673",  # İnşaat malzemesi toptan
    "4941",  # Karayolu taşımacılığı
    "4781",  # Pazar satıcısı
    "3811",  # Tehlikeli atık
    "1392",  # Konfeksiyon
]

# Yeni kurulan firma risk eşikleri (yıl)
NEW_COMPANY_THRESHOLDS = {
    "very_new": 1,      # 1 yıldan az - çok yüksek risk
    "new": 2,           # 2 yıldan az - yüksek risk
    "established": 5,   # 5 yıldan fazla - düşük risk
    "veteran": 15,      # 15 yıldan fazla - çok düşük risk
}


@dataclass
class RiskIndicator:
    """Tek bir risk göstergesi"""
    code: str
    name: str
    severity: str  # low, medium, high, critical
    score: float  # 0-100
    description: str
    recommendation: str
    data: Optional[Dict[str, Any]] = None


@dataclass
class TaxCertificateAnalysis:
    """Vergi Levhası analiz sonuçları"""
    vkn: str
    company_name: str
    overall_risk_score: float  # 0-100
    risk_level: str  # low, medium, high, critical
    indicators: List[RiskIndicator]
    sector_comparison: Dict[str, Any]
    trend_analysis: Dict[str, Any]
    recommendations: List[str]
    analysis_date: str


class TaxCertificateAnalyzer:
    """Vergi Levhası bazlı risk analizi"""

    def __init__(self):
        self.sector_benchmarks = SECTOR_BENCHMARKS
        self.city_risk_factors = CITY_RISK_FACTORS

    def analyze(self, parsed_data: Dict[str, Any]) -> TaxCertificateAnalysis:
        """
        Vergi levhası verilerini analiz et

        Args:
            parsed_data: TaxCertificateParser'dan gelen parse edilmiş veri

        Returns:
            TaxCertificateAnalysis: Detaylı analiz sonuçları
        """
        indicators = []
        recommendations = []

        # 1. Sektörel Karşılaştırma
        sector_result = self._analyze_sector(parsed_data)
        indicators.extend(sector_result['indicators'])
        recommendations.extend(sector_result.get('recommendations', []))

        # 2. Matrah/Vergi Trend Analizi
        trend_result = self._analyze_trends(parsed_data)
        indicators.extend(trend_result['indicators'])
        recommendations.extend(trend_result.get('recommendations', []))

        # 3. Faaliyet Süresi Analizi
        activity_result = self._analyze_activity_duration(parsed_data)
        indicators.extend(activity_result['indicators'])

        # 4. Adres/Konum Risk Analizi
        location_result = self._analyze_location(parsed_data)
        indicators.extend(location_result['indicators'])

        # 5. Sahte Belge Risk Skorlaması
        fake_invoice_result = self._calculate_fake_invoice_risk(parsed_data, indicators)
        indicators.extend(fake_invoice_result['indicators'])
        recommendations.extend(fake_invoice_result.get('recommendations', []))

        # Genel risk skoru hesapla
        overall_score = self._calculate_overall_score(indicators)
        risk_level = self._score_to_level(overall_score)

        return TaxCertificateAnalysis(
            vkn=parsed_data.get('vkn', ''),
            company_name=parsed_data.get('company_name', ''),
            overall_risk_score=overall_score,
            risk_level=risk_level,
            indicators=indicators,
            sector_comparison=sector_result.get('comparison', {}),
            trend_analysis=trend_result.get('trends', {}),
            recommendations=list(set(recommendations)),  # Tekrarları kaldır
            analysis_date=datetime.now().isoformat()
        )

    def _analyze_sector(self, data: Dict) -> Dict:
        """NACE koduna göre sektörel analiz"""
        indicators = []
        recommendations = []
        comparison = {}

        nace_code = data.get('nace_code', '')
        if not nace_code:
            indicators.append(RiskIndicator(
                code="NACE_MISSING",
                name="NACE Kodu Eksik",
                severity="medium",
                score=30,
                description="Vergi levhasında NACE kodu bulunamadı",
                recommendation="NACE kodunu manuel olarak girin"
            ))
            return {'indicators': indicators, 'comparison': comparison}

        # 4 haneli NACE kodunu al (6 haneliden)
        nace_4 = nace_code[:4] if len(nace_code) >= 4 else nace_code
        benchmark = self.sector_benchmarks.get(nace_4)

        if not benchmark:
            # Bilinmeyen sektör - genel değerlendirme
            comparison = {
                "sector_name": data.get('nace_description', 'Bilinmeyen Sektör'),
                "benchmark_available": False
            }
            return {'indicators': indicators, 'comparison': comparison, 'recommendations': recommendations}

        comparison = {
            "sector_name": benchmark['name'],
            "benchmark_available": True,
            "avg_profit_margin": benchmark['avg_profit_margin'],
            "sector_risk_level": benchmark['risk_level'],
            "fake_invoice_risk": benchmark['fake_invoice_risk'],
            "seasonal_peaks": benchmark.get('seasonal_peak', [])
        }

        # Sektör risk seviyesi kontrolü
        if benchmark['fake_invoice_risk'] in ['high', 'very_high']:
            indicators.append(RiskIndicator(
                code="HIGH_RISK_SECTOR",
                name="Yüksek Riskli Sektör",
                severity="high" if benchmark['fake_invoice_risk'] == 'very_high' else "medium",
                score=60 if benchmark['fake_invoice_risk'] == 'very_high' else 40,
                description=f"{benchmark['name']} sektörü sahte fatura açısından yüksek riskli",
                recommendation="Bu sektördeki alış faturalarını dikkatli inceleyin",
                data={"sector": benchmark['name'], "risk": benchmark['fake_invoice_risk']}
            ))
            recommendations.append(f"⚠️ {benchmark['name']} sektörü GİB tarafından riskli olarak işaretlenmiştir")

        # Yıllık verilerle kar marjı karşılaştırması
        yearly_data = data.get('yearly_data', [])
        if yearly_data:
            latest = yearly_data[0] if yearly_data else None
            if latest:
                matrah = float(latest.get('matrah', 0) or 0)
                tax = float(latest.get('tax', 0) or 0)

                if matrah > 0:
                    # Efektif vergi oranı
                    effective_rate = tax / matrah
                    expected_rate = benchmark['avg_tax_rate']

                    if effective_rate < expected_rate * 0.5:
                        indicators.append(RiskIndicator(
                            code="LOW_TAX_RATE",
                            name="Düşük Vergi Oranı",
                            severity="high",
                            score=70,
                            description=f"Efektif vergi oranı ({effective_rate:.1%}) sektör ortalamasının ({expected_rate:.1%}) altında",
                            recommendation="Gider kalemlerini ve istisnai indirimleri kontrol edin",
                            data={
                                "effective_rate": effective_rate,
                                "expected_rate": expected_rate,
                                "difference_pct": (expected_rate - effective_rate) / expected_rate * 100
                            }
                        ))

        return {
            'indicators': indicators,
            'comparison': comparison,
            'recommendations': recommendations
        }

    def _analyze_trends(self, data: Dict) -> Dict:
        """Yıllık matrah/vergi trend analizi"""
        indicators = []
        recommendations = []
        trends = {}

        yearly_data = data.get('yearly_data', [])
        if not yearly_data or len(yearly_data) < 2:
            return {'indicators': indicators, 'trends': trends}

        # Yılları sırala (en yeni önce)
        sorted_years = sorted(yearly_data, key=lambda x: x.get('year', 0), reverse=True)

        matrah_changes = []
        tax_changes = []

        for i in range(len(sorted_years) - 1):
            current = sorted_years[i]
            previous = sorted_years[i + 1]

            curr_matrah = float(current.get('matrah', 0) or 0)
            prev_matrah = float(previous.get('matrah', 0) or 0)
            curr_tax = float(current.get('tax', 0) or 0)
            prev_tax = float(previous.get('tax', 0) or 0)

            if prev_matrah > 0:
                matrah_change = (curr_matrah - prev_matrah) / prev_matrah
                matrah_changes.append({
                    'from_year': previous.get('year'),
                    'to_year': current.get('year'),
                    'change_pct': matrah_change * 100
                })

            if prev_tax > 0:
                tax_change = (curr_tax - prev_tax) / prev_tax
                tax_changes.append({
                    'from_year': previous.get('year'),
                    'to_year': current.get('year'),
                    'change_pct': tax_change * 100
                })

        trends = {
            'matrah_changes': matrah_changes,
            'tax_changes': tax_changes
        }

        # Ani düşüş kontrolü
        for change in matrah_changes:
            if change['change_pct'] < -30:
                indicators.append(RiskIndicator(
                    code="SHARP_MATRAH_DECLINE",
                    name="Ani Matrah Düşüşü",
                    severity="high",
                    score=60,
                    description=f"{change['from_year']}-{change['to_year']} döneminde matrahta %{abs(change['change_pct']):.1f} düşüş",
                    recommendation="Düşüşün nedenini araştırın (ekonomik, sektörel, ya da beyan hatası?)",
                    data=change
                ))
                recommendations.append("📉 Matrah düşüşünün nedenini mükellefle görüşün")

            elif change['change_pct'] > 100:
                indicators.append(RiskIndicator(
                    code="SHARP_MATRAH_INCREASE",
                    name="Ani Matrah Artışı",
                    severity="medium",
                    score=40,
                    description=f"{change['from_year']}-{change['to_year']} döneminde matrahta %{change['change_pct']:.1f} artış",
                    recommendation="Artışın kaynağını doğrulayın (yeni müşteri, fiyat artışı, vb.)",
                    data=change
                ))

        # Vergi/Matrah tutarsızlığı
        if matrah_changes and tax_changes:
            latest_matrah_change = matrah_changes[0]['change_pct']
            latest_tax_change = tax_changes[0]['change_pct']

            # Matrah artarken vergi düşerse veya tam tersi
            if (latest_matrah_change > 10 and latest_tax_change < -10) or \
               (latest_matrah_change < -10 and latest_tax_change > 10):
                indicators.append(RiskIndicator(
                    code="MATRAH_TAX_MISMATCH",
                    name="Matrah-Vergi Tutarsızlığı",
                    severity="high",
                    score=70,
                    description=f"Matrah %{latest_matrah_change:.1f} değişirken vergi %{latest_tax_change:.1f} değişmiş",
                    recommendation="İstisna, indirim veya beyan hatası olabilir - detaylı inceleyin",
                    data={
                        "matrah_change": latest_matrah_change,
                        "tax_change": latest_tax_change
                    }
                ))

        return {
            'indicators': indicators,
            'trends': trends,
            'recommendations': recommendations
        }

    def _analyze_activity_duration(self, data: Dict) -> Dict:
        """Faaliyet süresi analizi"""
        indicators = []

        start_date_str = data.get('start_date', '')
        if not start_date_str:
            return {'indicators': indicators}

        try:
            # "01.08.2008" formatını parse et
            start_date = datetime.strptime(start_date_str, "%d.%m.%Y")
            years_active = (datetime.now() - start_date).days / 365.25

            if years_active < 2:
                indicators.append(RiskIndicator(
                    code="NEW_COMPANY",
                    name="Yeni Kurulan Firma",
                    severity="medium",
                    score=40,
                    description=f"Firma {years_active:.1f} yıldır faal - yeni firmalar daha riskli",
                    recommendation="Yeni firmaların ilk 2 yılı dikkatli takip edilmeli",
                    data={"years_active": years_active, "start_date": start_date_str}
                ))
            elif years_active > 15:
                # Köklü firma - düşük risk
                indicators.append(RiskIndicator(
                    code="ESTABLISHED_COMPANY",
                    name="Köklü Firma",
                    severity="low",
                    score=10,
                    description=f"Firma {years_active:.0f} yıldır faal - köklü firma",
                    recommendation="Uzun süreli faaliyet olumlu bir gösterge",
                    data={"years_active": years_active, "start_date": start_date_str}
                ))

        except ValueError:
            pass

        return {'indicators': indicators}

    def _analyze_location(self, data: Dict) -> Dict:
        """Adres/konum risk analizi"""
        indicators = []

        city = data.get('city', '').upper()
        address = data.get('address', '')

        # Şehir risk faktörü
        risk_factor = self.city_risk_factors.get(city, self.city_risk_factors['DEFAULT'])

        if risk_factor > 1.1:
            indicators.append(RiskIndicator(
                code="HIGH_RISK_CITY",
                name="Yüksek Riskli Şehir",
                severity="low",
                score=20,
                description=f"{city} sahte fatura açısından yüksek hacimli bir şehir",
                recommendation="Büyükşehirlerde daha dikkatli olun",
                data={"city": city, "risk_factor": risk_factor}
            ))

        # Adres kalitesi kontrolü
        if address:
            # Şüpheli adres kalıpları
            suspicious_patterns = ['SANAL OFİS', 'VIRTUAL', 'P.K.', 'POSTA KUTUSU']
            for pattern in suspicious_patterns:
                if pattern in address.upper():
                    indicators.append(RiskIndicator(
                        code="SUSPICIOUS_ADDRESS",
                        name="Şüpheli Adres",
                        severity="high",
                        score=60,
                        description=f"Adres şüpheli kalıp içeriyor: {pattern}",
                        recommendation="Adres doğrulaması yapın",
                        data={"address": address, "pattern": pattern}
                    ))
                    break

        return {'indicators': indicators}

    def _calculate_fake_invoice_risk(self, data: Dict, existing_indicators: List[RiskIndicator]) -> Dict:
        """
        Sahte fatura risk skoru hesapla - GİB kriterleri bazlı

        Risk faktörleri:
        1. Sektör riski (NACE kodu)
        2. Şehir riski
        3. Firma yaşı
        4. Matrah anomalileri
        5. Vergi/Matrah tutarsızlıkları
        """
        indicators = []
        recommendations = []

        # Base risk score
        base_score = 0
        risk_factors = []

        # 1. NACE bazlı sektör riski
        nace_code = data.get('nace_code', '')
        nace_4 = nace_code[:4] if len(nace_code) >= 4 else nace_code

        if nace_4 in GIB_HIGH_RISK_NACE:
            base_score += 25
            risk_factors.append(f"GİB yüksek riskli sektör: {nace_4}")
        elif nace_4 in self.sector_benchmarks:
            sector = self.sector_benchmarks[nace_4]
            if sector.get('fake_invoice_risk') == 'very_high':
                base_score += 20
                risk_factors.append(f"Yüksek riskli sektör: {sector['name']}")
            elif sector.get('fake_invoice_risk') == 'high':
                base_score += 12
                risk_factors.append(f"Riskli sektör: {sector['name']}")

        # 2. Şehir riski
        city = data.get('city', '').upper()
        city_factor = self.city_risk_factors.get(city, 1.0)
        if city_factor > 1.1:
            base_score += 10
            risk_factors.append(f"Yüksek riskli şehir: {city}")

        # 3. Firma yaşı riski
        start_date_str = data.get('start_date', '')
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, "%d.%m.%Y")
                years_active = (datetime.now() - start_date).days / 365.25

                if years_active < NEW_COMPANY_THRESHOLDS['very_new']:
                    base_score += 20
                    risk_factors.append(f"Çok yeni firma ({years_active:.1f} yıl)")
                elif years_active < NEW_COMPANY_THRESHOLDS['new']:
                    base_score += 12
                    risk_factors.append(f"Yeni firma ({years_active:.1f} yıl)")
            except ValueError:
                pass

        # 4. Mevcut göstergelerden ek risk puanları
        for ind in existing_indicators:
            if ind.code in ['SHARP_MATRAH_DECLINE', 'MATRAH_TAX_MISMATCH', 'LOW_TAX_RATE']:
                base_score += ind.score * 0.3
                risk_factors.append(ind.name)
            elif ind.code == 'SUSPICIOUS_ADDRESS':
                base_score += 15
                risk_factors.append("Şüpheli adres")

        # 5. Matrah anomali kontrolü
        yearly_data = data.get('yearly_data', [])
        if yearly_data and len(yearly_data) >= 2:
            # Son 2 yılda sıfır matrah?
            zero_matrah_years = [y for y in yearly_data if float(y.get('matrah', 0) or 0) == 0]
            if len(zero_matrah_years) >= 2:
                base_score += 15
                risk_factors.append("Ardışık sıfır matrah beyanı")

        # Şehir faktörü ile çarp
        fake_invoice_risk = min(100, base_score * city_factor)

        # Risk seviyesine göre gösterge ekle
        if fake_invoice_risk > 70:
            indicators.append(RiskIndicator(
                code="HIGH_FAKE_INVOICE_RISK",
                name="Yüksek Sahte Fatura Riski",
                severity="critical",
                score=fake_invoice_risk,
                description=f"Toplam sahte fatura risk skoru: {fake_invoice_risk:.0f}/100",
                recommendation="Bu mükellefin alış faturalarını tek tek kontrol edin, GİB sorgulaması yapın",
                data={
                    "risk_score": fake_invoice_risk,
                    "risk_factors": risk_factors
                }
            ))
            recommendations.append("🚨 YÜKSEK RİSK: GİB Mükellef Sorgulama ile kontrol edin")
            recommendations.append("📋 BA-BS mutabakatını mutlaka yapın")
            recommendations.append("🔍 Alış faturalarını e-Defter ile karşılaştırın")
        elif fake_invoice_risk > 50:
            indicators.append(RiskIndicator(
                code="ELEVATED_FAKE_INVOICE_RISK",
                name="Yükselmiş Sahte Fatura Riski",
                severity="high",
                score=fake_invoice_risk,
                description=f"Toplam sahte fatura risk skoru: {fake_invoice_risk:.0f}/100",
                recommendation="Büyük tutarlı alış faturalarını kontrol edin",
                data={
                    "risk_score": fake_invoice_risk,
                    "risk_factors": risk_factors
                }
            ))
            recommendations.append("⚠️ ORTA-YÜKSEK RİSK: 10.000 TL üzeri faturaları kontrol edin")
        elif fake_invoice_risk > 30:
            indicators.append(RiskIndicator(
                code="MEDIUM_FAKE_INVOICE_RISK",
                name="Orta Düzey Sahte Fatura Riski",
                severity="medium",
                score=fake_invoice_risk,
                description=f"Toplam sahte fatura risk skoru: {fake_invoice_risk:.0f}/100",
                recommendation="Rutin kontrolleri sürdürün",
                data={
                    "risk_score": fake_invoice_risk,
                    "risk_factors": risk_factors
                }
            ))
        else:
            indicators.append(RiskIndicator(
                code="LOW_FAKE_INVOICE_RISK",
                name="Düşük Sahte Fatura Riski",
                severity="low",
                score=fake_invoice_risk,
                description=f"Toplam sahte fatura risk skoru: {fake_invoice_risk:.0f}/100",
                recommendation="Standart kontroller yeterli",
                data={
                    "risk_score": fake_invoice_risk,
                    "risk_factors": risk_factors
                }
            ))

        return {
            'indicators': indicators,
            'recommendations': recommendations,
            'fake_invoice_risk_score': fake_invoice_risk
        }

    def _calculate_overall_score(self, indicators: List[RiskIndicator]) -> float:
        """Genel risk skoru hesapla"""
        if not indicators:
            return 0

        total_score = 0
        total_weight = 0

        severity_weights = {
            'critical': 3.0,
            'high': 2.0,
            'medium': 1.0,
            'low': 0.5
        }

        for ind in indicators:
            weight = severity_weights.get(ind.severity, 1.0)
            total_score += ind.score * weight
            total_weight += weight * 100

        if total_weight > 0:
            return min(100, (total_score / total_weight) * 100)
        return 0

    def _score_to_level(self, score: float) -> str:
        """Skoru risk seviyesine çevir"""
        if score >= 70:
            return "critical"
        elif score >= 50:
            return "high"
        elif score >= 30:
            return "medium"
        return "low"


# Singleton instance
_analyzer = None

def get_analyzer() -> TaxCertificateAnalyzer:
    """Get or create analyzer instance"""
    global _analyzer
    if _analyzer is None:
        _analyzer = TaxCertificateAnalyzer()
    return _analyzer


def analyze_tax_certificate(parsed_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Vergi levhası verilerini analiz et ve sonuçları dict olarak döndür

    Args:
        parsed_data: Parse edilmiş vergi levhası verileri

    Returns:
        Analiz sonuçları dictionary
    """
    analyzer = get_analyzer()
    result = analyzer.analyze(parsed_data)

    # Dataclass'ı dict'e çevir
    return {
        'vkn': result.vkn,
        'company_name': result.company_name,
        'overall_risk_score': round(result.overall_risk_score, 1),
        'risk_level': result.risk_level,
        'indicators': [
            {
                'code': ind.code,
                'name': ind.name,
                'severity': ind.severity,
                'score': round(ind.score, 1),
                'description': ind.description,
                'recommendation': ind.recommendation,
                'data': ind.data
            }
            for ind in result.indicators
        ],
        'sector_comparison': result.sector_comparison,
        'trend_analysis': result.trend_analysis,
        'recommendations': result.recommendations,
        'analysis_date': result.analysis_date
    }
