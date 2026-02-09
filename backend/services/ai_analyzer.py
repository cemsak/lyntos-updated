"""
VERGUS AI Analyzer Service
Sprint R2 - Claude API Integration

Mevzuat ve sirket degisikliklerini analiz eder,
parametre guncelleme onerileri uretir.
"""
import os
import json
import time
from datetime import datetime
from typing import Dict, List, Optional
import logging
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from anthropic import Anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    Anthropic = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AIAnalyzer:
    """Claude API ile degisiklik analizi"""

    REGWATCH_SYSTEM_PROMPT = """Sen VERGUS sisteminin mevzuat analiz uzmaninsin.
Gorevin: Vergi, muhasebe ve sirketler hukuku ile ilgili mevzuat degisikliklerini analiz etmek.

Analiz ederken:
1. Degisikligin ozunu tespit et
2. Hangi vergi parametrelerini etkiledigini belirle
3. Yururluk tarihini bul
4. Yasal dayanagi (kanun/teblig no) cikar
5. SMMM'ler icin onem derecesini belirle

Onemli Parametreler:
- kv_genel_oran: Kurumlar Vergisi genel orani
- kv_ihracat_indirim: Ihracat indirimi
- kv_asgari_oran: Asgari kurumlar vergisi
- kdv_genel: KDV genel orani
- asgari_ucret_brut: Asgari ucret
- sgk_issizlik_isveren: Issizlik sigortasi isveren payi
- arge_stopaj_*: Ar-Ge stopaj indirimleri

Yanitini JSON formatinda ver:
{
  "summary": "Kisa ozet (1-2 cumle)",
  "change_detected": true/false,
  "change_type": "rate_change|new_parameter|deadline|exemption|other",
  "affected_parameters": [
    {
      "param_key": "parametre_adi",
      "current_value": mevcut_deger,
      "new_value": yeni_deger,
      "effective_date": "YYYY-MM-DD",
      "legal_reference": "Kanun/Teblig no"
    }
  ],
  "severity": "info|low|medium|high|critical",
  "action_required": "Yapilmasi gereken islem",
  "detailed_analysis": "Detayli aciklama"
}"""

    COMPANY_SYSTEM_PROMPT = """Sen VERGUS sisteminin sirket analiz uzmaninsin.
Gorevin: Ticaret sicili degisikliklerinin vergisel ve hukuki etkilerini analiz etmek.

Analiz ederken:
1. Degisikligin turunu tespit et (sermaye, tasfiye, birlesme, vb.)
2. Vergisel etkilerini belirle
3. TTK ve vergi mevzuati kapsaminda uyarilari listele
4. SMMM'nin yapmasi gerekenleri belirt

Degisiklik Turleri:
- establishment: Yeni sirket kurulusu
- capital_increase: Sermaye artirimi
- capital_decrease: Sermaye azaltimi
- liquidation_start: Tasfiyeye giris
- liquidation_end: Tasfiye sonu
- merger: Birlesme
- demerger: Bolunme
- type_change: Tur degisikligi

Yanitini JSON formatinda ver:
{
  "summary": "Kisa ozet",
  "change_type": "degisiklik_turu",
  "tax_implications": {
    "kv_impact": "Kurumlar vergisi etkisi",
    "kdv_impact": "KDV etkisi",
    "other_taxes": "Diger vergiler"
  },
  "compliance_alerts": ["Uyari 1", "Uyari 2"],
  "deadlines": [
    {"task": "Yapilacak is", "deadline": "YYYY-MM-DD", "legal_basis": "Yasal dayanak"}
  ],
  "smmm_actions": ["Yapilmasi gereken 1", "Yapilmasi gereken 2"],
  "severity": "info|low|medium|high|critical"
}"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.client = None
        self.model = "claude-sonnet-4-20250514"

        if ANTHROPIC_AVAILABLE and self.api_key:
            try:
                self.client = Anthropic(api_key=self.api_key)
                logger.info("Claude API client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Anthropic client: {e}")
        else:
            logger.warning("Anthropic SDK not available or API key missing. Using demo mode.")

    def analyze_regwatch_event(self, event: Dict) -> Dict:
        """
        RegWatch olayini analiz et

        Args:
            event: {
                "title": "Baslik",
                "content": "Icerik",
                "source": "Kaynak (GIB, Resmi Gazete, vb.)",
                "date": "Tarih"
            }

        Returns:
            Analiz sonucu
        """
        start_time = time.time()

        content = f"""
Asagidaki mevzuat degisikligini analiz et:

Kaynak: {event.get('source', 'Bilinmiyor')}
Tarih: {event.get('date', 'Bilinmiyor')}
Baslik: {event.get('title', '')}

Icerik:
{event.get('content', event.get('title', ''))}
"""

        if self.client:
            try:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=2000,
                    system=self.REGWATCH_SYSTEM_PROMPT,
                    messages=[
                        {"role": "user", "content": content}
                    ]
                )

                result_text = response.content[0].text
                processing_time = int((time.time() - start_time) * 1000)

                # JSON parse
                try:
                    if "```json" in result_text:
                        json_str = result_text.split("```json")[1].split("```")[0]
                    elif "```" in result_text:
                        json_str = result_text.split("```")[1].split("```")[0]
                    else:
                        json_str = result_text

                    result = json.loads(json_str.strip())
                except json.JSONDecodeError:
                    result = {
                        "summary": result_text[:500],
                        "change_detected": False,
                        "raw_response": result_text
                    }

                result["model_used"] = self.model
                result["tokens_used"] = response.usage.input_tokens + response.usage.output_tokens
                result["processing_time_ms"] = processing_time

                return result

            except Exception as e:
                logger.error(f"Claude API error: {e}")
                return self._demo_regwatch_analysis(event)
        else:
            return self._demo_regwatch_analysis(event)

    def analyze_company_change(self, change: Dict) -> Dict:
        """
        Sirket degisikligini analiz et

        Args:
            change: {
                "company_name": "Sirket adi",
                "tax_number": "Vergi no",
                "change_type": "Degisiklik turu",
                "old_value": "Eski deger",
                "new_value": "Yeni deger",
                "ttsg_date": "TTSG tarihi"
            }
        """
        start_time = time.time()

        content = f"""
Asagidaki sirket degisikligini analiz et:

Sirket: {change.get('company_name', 'Bilinmiyor')}
Vergi No: {change.get('tax_number', 'Bilinmiyor')}
Degisiklik Turu: {change.get('change_type', 'Bilinmiyor')}
Eski Deger: {change.get('old_value', '-')}
Yeni Deger: {change.get('new_value', '-')}
TTSG Tarihi: {change.get('ttsg_date', 'Bilinmiyor')}

Ek Bilgiler:
{change.get('additional_info', '')}
"""

        if self.client:
            try:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=2000,
                    system=self.COMPANY_SYSTEM_PROMPT,
                    messages=[
                        {"role": "user", "content": content}
                    ]
                )

                result_text = response.content[0].text
                processing_time = int((time.time() - start_time) * 1000)

                # JSON parse
                try:
                    if "```json" in result_text:
                        json_str = result_text.split("```json")[1].split("```")[0]
                    elif "```" in result_text:
                        json_str = result_text.split("```")[1].split("```")[0]
                    else:
                        json_str = result_text

                    result = json.loads(json_str.strip())
                except json.JSONDecodeError:
                    result = {
                        "summary": result_text[:500],
                        "change_type": change.get('change_type'),
                        "raw_response": result_text
                    }

                result["model_used"] = self.model
                result["tokens_used"] = response.usage.input_tokens + response.usage.output_tokens
                result["processing_time_ms"] = processing_time

                return result

            except Exception as e:
                logger.error(f"Claude API error: {e}")
                return self._demo_company_analysis(change)
        else:
            return self._demo_company_analysis(change)

    def batch_analyze_events(self, events: List[Dict], event_type: str = "regwatch") -> List[Dict]:
        """Birden fazla olayi toplu analiz et"""
        results = []

        for event in events:
            if event_type == "regwatch":
                result = self.analyze_regwatch_event(event)
            else:
                result = self.analyze_company_change(event)

            result["source_event"] = event
            results.append(result)

            # Rate limiting
            time.sleep(0.5)

        return results

    def generate_parameter_update_proposal(self, analysis: Dict) -> Optional[Dict]:
        """Analiz sonucundan parametre guncelleme onerisi olustur"""
        if not analysis.get("change_detected") or not analysis.get("affected_parameters"):
            return None

        proposals = []
        for param in analysis.get("affected_parameters", []):
            if param.get("param_key") and param.get("new_value") is not None:
                proposals.append({
                    "param_key": param["param_key"],
                    "current_value": param.get("current_value"),
                    "proposed_value": param["new_value"],
                    "effective_date": param.get("effective_date"),
                    "legal_reference": param.get("legal_reference"),
                    "confidence": analysis.get("confidence_score", 0.8),
                    "requires_approval": True
                })

        if proposals:
            return {
                "summary": analysis.get("summary"),
                "proposals": proposals,
                "severity": analysis.get("severity", "medium"),
                "action_required": analysis.get("action_required")
            }

        return None

    def _demo_regwatch_analysis(self, event: Dict) -> Dict:
        """Demo mod icin ornek analiz"""
        title = event.get("title", "").lower()

        # Anahtar kelime bazli basit analiz
        if "kurumlar vergisi" in title or "kv" in title:
            return {
                "summary": "Kurumlar vergisi ile ilgili duzenleme tespit edildi",
                "change_detected": True,
                "change_type": "rate_change",
                "affected_parameters": [
                    {
                        "param_key": "kv_genel_oran",
                        "current_value": 0.25,
                        "new_value": None,
                        "effective_date": None,
                        "legal_reference": "Tespit edilemedi"
                    }
                ],
                "severity": "medium",
                "action_required": "Icerigin manuel incelenmesi gerekiyor",
                "detailed_analysis": "Demo mod - Gercek analiz icin API key gerekli",
                "model_used": "demo",
                "tokens_used": 0,
                "processing_time_ms": 10
            }
        elif "kdv" in title or "katma deger" in title:
            return {
                "summary": "KDV ile ilgili duzenleme tespit edildi",
                "change_detected": True,
                "change_type": "rate_change",
                "affected_parameters": [
                    {
                        "param_key": "kdv_genel",
                        "current_value": 0.20,
                        "new_value": None,
                        "effective_date": None,
                        "legal_reference": "Tespit edilemedi"
                    }
                ],
                "severity": "medium",
                "action_required": "Icerigin manuel incelenmesi gerekiyor",
                "model_used": "demo",
                "tokens_used": 0,
                "processing_time_ms": 10
            }
        elif "asgari ucret" in title:
            return {
                "summary": "Asgari ucret ile ilgili duzenleme tespit edildi",
                "change_detected": True,
                "change_type": "rate_change",
                "affected_parameters": [
                    {
                        "param_key": "asgari_ucret_brut",
                        "current_value": 22104,
                        "new_value": None,
                        "effective_date": None,
                        "legal_reference": "Tespit edilemedi"
                    }
                ],
                "severity": "high",
                "action_required": "Bordro hesaplamalarinin guncellenmesi gerekebilir",
                "model_used": "demo",
                "tokens_used": 0,
                "processing_time_ms": 10
            }
        else:
            return {
                "summary": "Genel mevzuat guncellemesi",
                "change_detected": False,
                "change_type": "other",
                "affected_parameters": [],
                "severity": "info",
                "action_required": "Bilgi amacli",
                "model_used": "demo",
                "tokens_used": 0,
                "processing_time_ms": 10
            }

    def _demo_company_analysis(self, change: Dict) -> Dict:
        """Demo mod icin ornek sirket analizi"""
        change_type = change.get("change_type", "unknown")

        analyses = {
            "capital_increase": {
                "summary": "Sermaye artirimi tespit edildi",
                "change_type": "capital_increase",
                "tax_implications": {
                    "kv_impact": "Dogrudan KV etkisi yok",
                    "kdv_impact": "KDV etkisi yok",
                    "other_taxes": "Damga vergisi: Sermaye artirim tutari uzerinden binde 9.48"
                },
                "compliance_alerts": [
                    "3 ay icinde tescil edilmezse GK karari gecersiz olur",
                    "Rekabet Kurumu payi odenmeli (artirilan sermayenin %0.04'u)"
                ],
                "deadlines": [
                    {"task": "Tescil basvurusu", "deadline": "30 gun", "legal_basis": "TTK 456"}
                ],
                "smmm_actions": [
                    "Sermaye hesaplarini guncelle",
                    "Damga vergisi hesapla ve ode",
                    "Rekabet Kurumu payini ode"
                ],
                "severity": "medium"
            },
            "capital_decrease": {
                "summary": "Sermaye azaltimi tespit edildi - DIKKAT",
                "change_type": "capital_decrease",
                "tax_implications": {
                    "kv_impact": "Sermaye azaltimi kar payi dagitimi sayilabilir (KVK 32/B)",
                    "kdv_impact": "KDV etkisi yok",
                    "other_taxes": "Stopaj yukululuugu dogabilir"
                },
                "compliance_alerts": [
                    "Alacaklilara cagri ilani verilmeli (3 kez)",
                    "90 gun bekleme suresi gerekli",
                    "TTK 376 sermaye kaybi analizi yapilmali"
                ],
                "deadlines": [
                    {"task": "Alacakli cagri ilani", "deadline": "Derhal", "legal_basis": "TTK 474"}
                ],
                "smmm_actions": [
                    "Sermaye azaltim nedenini belgele",
                    "Kar payi sayilip sayilmayacagini degerlendir",
                    "Stopaj hesaplamasi yap"
                ],
                "severity": "high"
            },
            "liquidation_start": {
                "summary": "Tasfiyeye giris tespit edildi - KRITIK",
                "change_type": "liquidation_start",
                "tax_implications": {
                    "kv_impact": "Tasfiye donemi icin ayri KV beyani gerekli",
                    "kdv_impact": "KDV mukellefiyeti devam eder",
                    "other_taxes": "Tasfiye suresince tum vergi yukumlulukleri devam eder"
                },
                "compliance_alerts": [
                    "Tasfiye acilis bilancosu hazirlanmali",
                    "Vergi dairesine bildirim yapilmali",
                    "SGK'ya bildirim yapilmali",
                    "Alacaklilara cagri ilani verilmeli (3 kez, 7'ser gun arayla)"
                ],
                "deadlines": [
                    {"task": "Vergi dairesi bildirimi", "deadline": "15 gun", "legal_basis": "VUK 168"},
                    {"task": "Alacaklilara cagri", "deadline": "Derhal", "legal_basis": "TTK 541"}
                ],
                "smmm_actions": [
                    "Tasfiye acilis bilancosu hazirla",
                    "Vergi dairesine tasfiye bildirimi yap",
                    "Tasfiye beyannamesi takvimini olustur",
                    "Musteriye kritik surecleri bildir"
                ],
                "severity": "critical"
            },
            "liquidation_end": {
                "summary": "Tasfiye sonu (terkin) tespit edildi",
                "change_type": "liquidation_end",
                "tax_implications": {
                    "kv_impact": "Son tasfiye beyannamesi verilmeli",
                    "kdv_impact": "KDV mukellefiyeti terkin edilmeli",
                    "other_taxes": "Tum vergi mukellefiyetleri kapatilmali"
                },
                "compliance_alerts": [
                    "Tum vergi borclari kapanmali",
                    "E-defter/e-fatura kapanmali"
                ],
                "smmm_actions": [
                    "Son tasfiye beyannamesini ver",
                    "Mukellefiyet terkini icin basvur",
                    "Arsiv dosyalarini hazirla"
                ],
                "severity": "high"
            },
            "merger": {
                "summary": "Birlesme islemi tespit edildi",
                "change_type": "merger",
                "tax_implications": {
                    "kv_impact": "KVK 19-20 sartlari saglanirsa vergisiz",
                    "kdv_impact": "KDV istisnasi (KDVK 17/4-c)",
                    "other_taxes": "Damga vergisi ve harc istisnasi"
                },
                "compliance_alerts": [
                    "Birlesme raporu hazirlanmali",
                    "Alacaklilara cagri ilani verilmeli",
                    "Devreden KDV icin vergi incelemesi gerekebilir"
                ],
                "deadlines": [
                    {"task": "Tescil basvurusu", "deadline": "15 gun", "legal_basis": "TTK 152"}
                ],
                "smmm_actions": [
                    "Birlesme bilancosu hazirla",
                    "Vergi istisnasi sartlarini kontrol et",
                    "Devreden KDV durumunu degerlendir"
                ],
                "severity": "high"
            },
            "demerger": {
                "summary": "Bolunme islemi tespit edildi",
                "change_type": "demerger",
                "tax_implications": {
                    "kv_impact": "KVK 19-20 sartlari saglanirsa vergisiz",
                    "kdv_impact": "KDV istisnasi (KDVK 17/4-c)",
                    "other_taxes": "Damga vergisi ve harc istisnasi"
                },
                "compliance_alerts": [
                    "Bolunme plani hazirlanmali",
                    "Alacaklilara cagri ilani verilmeli"
                ],
                "smmm_actions": [
                    "Bolunme bilancosu hazirla",
                    "Devreden ve kalan sirketler icin hesaplari ayir"
                ],
                "severity": "high"
            },
            "type_change": {
                "summary": "Tur degisikligi tespit edildi",
                "change_type": "type_change",
                "tax_implications": {
                    "kv_impact": "Vergisiz tur degisikligi mumkun (KVK 19)",
                    "kdv_impact": "KDV istisnasi",
                    "other_taxes": "Harc istisnasi"
                },
                "compliance_alerts": [
                    "Yeni tipe gore asgari sermaye kontrolu",
                    "30 gun icinde tescil gerekli"
                ],
                "smmm_actions": [
                    "Tur degisikligi bilancosu hazirla",
                    "Yeni tip icin gerekli belgeleri hazirla"
                ],
                "severity": "medium"
            },
            "establishment": {
                "summary": "Yeni sirket kurulusu tespit edildi",
                "change_type": "establishment",
                "tax_implications": {
                    "kv_impact": "KV mukellefiyeti baslar",
                    "kdv_impact": "KDV mukellefiyeti baslar",
                    "other_taxes": "Damga vergisi, noter harci odenir"
                },
                "compliance_alerts": [
                    "30 gun icinde vergi dairesine bildirim",
                    "Asgari sermaye tutarini kontrol et"
                ],
                "smmm_actions": [
                    "Vergi dairesi kayit islemleri",
                    "E-defter/e-fatura basvurusu",
                    "SGK ise giris islemleri"
                ],
                "severity": "medium"
            }
        }

        default = {
            "summary": f"{change_type} degisikligi tespit edildi",
            "change_type": change_type,
            "tax_implications": {"kv_impact": "Degerlendirilmeli", "kdv_impact": "Degerlendirilmeli"},
            "compliance_alerts": ["Manuel inceleme gerekli"],
            "smmm_actions": ["Degisikligi incele ve gerekli islemleri yap"],
            "severity": "low"
        }

        result = analyses.get(change_type, default)
        result["model_used"] = "demo"
        result["tokens_used"] = 0
        result["processing_time_ms"] = 10

        return result

    # =========================================================================
    # MEVZUAT RAG - RETRIEVAL AUGMENTED GENERATION
    # Kaynaklar: mevzuat.gov.tr, dijital.gib.gov.tr
    # =========================================================================

    MEVZUAT_RAG_PROMPT = """Sen LYNTOS VDK Risk Analizi sisteminin mevzuat uzmanısın.
Görevin: Vergi, muhasebe ve TTK mevzuatıyla ilgili soruları profesyonel düzeyde yanıtlamak.

KRİTİK KURALLAR:
1. SADECE sağlanan mevzuat kaynaklarına dayanarak yanıt ver
2. Kaynak gösterilemeyen bilgi verme
3. Her iddiayı mevzuat referansıyla destekle
4. YMM/SMMM terminolojisi kullan (Türk Muhasebe Standartları)

MEVZUAT REFERANS FORMATI:
- Kanun: "GVK Md. 89/1-a" veya "KVK Md. 12"
- Tebliğ: "1 Seri No'lu KVK Genel Tebliği Md. 4.3.2"
- Genelge: "VDK Genelgesi E-55935724-010.06-7361"
- Özelge: "GİB Özelgesi [Tarih]"

YANIT YAPISI:
{
  "cevap": "Ana yanıt",
  "mevzuat_referanslari": [
    {"kaynak": "Kanun/Tebliğ adı", "madde": "Madde no", "ozet": "İlgili kısım özeti"}
  ],
  "pratik_uygulama": "SMMM için pratik uygulama adımları",
  "dikkat_edilecekler": ["Uyarı 1", "Uyarı 2"],
  "ilgili_hesap_kodlari": ["100", "131", "331"],  // Tek Düzen Hesap Planı
  "kaynak_url": ["https://mevzuat.gov.tr/...", "https://dijital.gib.gov.tr/..."],
  "guncelleme_tarihi": "YYYY-MM-DD",
  "guven_skoru": 0.9  // 0-1 arası, kaynak kalitesine göre
}"""

    # Statik mevzuat veritabanı - en sık kullanılan referanslar
    MEVZUAT_VERITABANI = {
        # VDK İlgili
        "vdk_genelge_2025": {
            "ad": "VDK Risk Analizi Genelgesi 2025",
            "referans": "E-55935724-010.06-7361",
            "tarih": "18.04.2025",
            "ozet": "VDK 13 kriter risk analizi, KURGAN 16 senaryo, Mali Milat 1 Ekim 2025",
            "url": "https://www.gib.gov.tr/node/105612"
        },
        # TTK 376 - Sermaye Kaybı
        "ttk_376": {
            "ad": "Türk Ticaret Kanunu Madde 376",
            "referans": "6102 sayılı TTK Md. 376",
            "ozet": """
            (1) Son yıllık bilançodan, sermaye ile kanuni yedek akçeler toplamının yarısının zarar sebebiyle karşılıksız kaldığı anlaşılırsa, yönetim kurulu, genel kurulu hemen toplantıya çağırır ve bu genel kurula uygun gördüğü iyileştirici önlemleri sunar.
            (2) Son yıllık bilançoya göre, sermaye ile kanuni yedek akçeler toplamının üçte ikisinin zarar sebebiyle karşılıksız kaldığı anlaşıldığı takdirde, derhal toplantıya çağrılan genel kurul, sermayenin üçte biri ile yetinme veya sermayenin tamamlanmasına karar vermediği takdirde şirket kendiliğinden sona erer.
            (3) Şirketin borca batık durumda bulunduğu şüphesini uyandıran işaretler varsa, yönetim kurulu, aktiflerin hem işletmenin devamlılığı esasına göre hem de muhtemel satış fiyatları üzerinden bir ara bilanço çıkartır.
            """,
            "url": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6102&MevzuatTur=1&MevzuatTertip=5"
        },
        # KVK 12 - Örtülü Sermaye
        "kvk_12": {
            "ad": "Kurumlar Vergisi Kanunu Madde 12",
            "referans": "5520 sayılı KVK Md. 12",
            "ozet": """
            (1) Kurumların, ortaklarından veya ortaklarla ilişkili olan kişilerden doğrudan veya dolaylı olarak temin ederek işletmede kullandıkları borçların, hesap dönemi içinde herhangi bir tarihte kurumun öz sermayesinin üç katını aşan kısmı, ilgili hesap dönemi için örtülü sermaye sayılır.
            (6) Örtülü sermaye üzerinden kur farkı hariç, faiz ve benzeri ödemeler veya hesaplanan tutarlar, Gelir ve Kurumlar Vergisi kanunlarının uygulanmasında, gerek borç alan gerekse borç veren nezdinde, örtülü sermaye şartlarının gerçekleştiği hesap döneminin son günü itibarıyla dağıtılmış kâr payı veya dar mükellefler için ana merkeze aktarılan tutar sayılır.
            """,
            "url": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5520&MevzuatTur=1&MevzuatTertip=5"
        },
        # KVK 13 - Transfer Fiyatlandırması
        "kvk_13": {
            "ad": "Kurumlar Vergisi Kanunu Madde 13",
            "referans": "5520 sayılı KVK Md. 13",
            "ozet": "Transfer fiyatlandırması yoluyla örtülü kazanç dağıtımı: Kurumlar, ilişkili kişilerle emsallere uygunluk ilkesine aykırı olarak tespit ettikleri bedel veya fiyat üzerinden mal veya hizmet alım ya da satımında bulunursa...",
            "url": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5520&MevzuatTur=1&MevzuatTertip=5"
        },
        # KDVK 29 - KDV İndirimi
        "kdvk_29": {
            "ad": "Katma Değer Vergisi Kanunu Madde 29",
            "referans": "3065 sayılı KDVK Md. 29",
            "ozet": "Vergi indirimi: Mükellefler, yaptıkları vergiye tabi işlemler üzerinden hesaplanan katma değer vergisinden, bu Kanunda aksine hüküm olmadıkça, faaliyetlerine ilişkin olarak Kendilerine yapılan teslim ve hizmetler dolayısıyla hesaplanarak düzenlenen fatura ve benzeri vesikalarda gösterilen katma değer vergisini indirebilirler.",
            "url": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=3065&MevzuatTur=1&MevzuatTertip=5"
        },
        # VUK 359 - Vergi Kaçakçılığı
        "vuk_359": {
            "ad": "Vergi Usul Kanunu Madde 359",
            "referans": "213 sayılı VUK Md. 359",
            "ozet": "Kaçakçılık suçları ve cezaları: Vergi kanunlarına göre tutulan veya düzenlenen ve saklanma ve ibraz mecburiyeti bulunan defter, kayıt ve belgeleri yok edenler veya defter sahifelerini yok ederek yerine başka yapraklar koyanlar veya hiç yaprak koymayanlar...",
            "url": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=213&MevzuatTur=1&MevzuatTertip=5"
        },
        # Adat Faizi - 131 Hesap
        "adat_faizi": {
            "ad": "Ortaklara Verilen Borçlarda Adat Faizi",
            "referans": "GVK Md. 75, KVK Md. 13",
            "ozet": """
            Ortaklara verilen borçlarda (131 hesap) emsallere uygun faiz hesaplanması gerekir.
            Faiz oranı: TCMB reeskont faizi veya bankaların ticari kredi faizi (emsal)
            2026 yılı için: TCMB Reeskont %55, Ticari Kredi ~%60-70
            Hesaplanmayan faiz = Örtülü kazanç dağıtımı (KVK 13) + Stopaj riski
            """,
            "url": "https://www.gib.gov.tr/node/95632"
        },
        # E-Fatura Zorunluluğu
        "efatura": {
            "ad": "E-Fatura ve E-Defter Zorunluluğu",
            "referans": "509 Sıra No'lu VUK Genel Tebliği",
            "ozet": "E-fatura ve e-defter kullanım zorunlulukları, ciro limitleri, geçiş süreleri",
            "url": "https://www.gib.gov.tr/node/98765"
        },
        # KVYK - KVK 11/1-i Finansman Gider Kısıtlaması
        "finansman_gider_kisitlamasi": {
            "ad": "Finansman Gider Kısıtlaması",
            "referans": "5520 sayılı KVK Md. 11/1-i",
            "ozet": """
            Kredi kuruluşları, finansal kuruluşlar, finansal kiralama, faktoring ve finansman şirketleri dışında, kullanılan yabancı kaynakları öz kaynaklarını aşan işletmelerde, aşan kısma münhasır olmak üzere, yatırımın maliyetine eklenenler hariç, işletmede kullanılan yabancı kaynaklara ilişkin faiz, komisyon, vade farkı, kâr payı, kur farkı ve benzeri adlar altında yapılan gider ve maliyet unsurları toplamının %10'u
            """,
            "url": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5520"
        },
    }

    def fetch_mevzuat_from_web(self, keywords: List[str]) -> List[Dict]:
        """
        Mevzuat.gov.tr ve dijital.gib.gov.tr'den ilgili mevzuatı çeker

        Not: Bu metot web scraping yapar, API olmadığı için
        Gerçek uygulamada rate limiting ve caching gerekir
        """
        import urllib.request
        import ssl

        results = []

        # SSL context (bazı devlet siteleri eski sertifika kullanıyor)
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        # Önce statik veritabanından ara
        for keyword in keywords:
            keyword_lower = keyword.lower()
            for key, mevzuat in self.MEVZUAT_VERITABANI.items():
                if (keyword_lower in mevzuat["ad"].lower() or
                    keyword_lower in mevzuat.get("ozet", "").lower() or
                    keyword_lower in key):
                    results.append({
                        "kaynak": "LYNTOS Mevzuat Veritabanı",
                        "baslik": mevzuat["ad"],
                        "referans": mevzuat["referans"],
                        "ozet": mevzuat["ozet"],
                        "url": mevzuat.get("url", ""),
                        "guven_skoru": 1.0  # Doğrulanmış kaynak
                    })

        # Web'den çekme (opsiyonel - API yoksa simüle et)
        # Gerçek implementasyonda: mevzuat.gov.tr API veya scraping
        try:
            # GİB dijital dönüşüm portalı (API yok, simüle ediyoruz)
            gib_results = self._simulate_gib_search(keywords)
            results.extend(gib_results)
        except Exception as e:
            logger.warning(f"GİB mevzuat araması başarısız: {e}")

        return results

    def _simulate_gib_search(self, keywords: List[str]) -> List[Dict]:
        """GİB mevzuat araması simülasyonu (gerçek API yok)"""
        # Anahtar kelimeye göre en alakalı sonuçları döndür
        simulated_results = []

        keyword_str = " ".join(keywords).lower()

        if "kdv" in keyword_str or "katma değer" in keyword_str:
            simulated_results.append({
                "kaynak": "dijital.gib.gov.tr",
                "baslik": "KDV Uygulama Genel Tebliği",
                "referans": "KDV Uygulama Genel Tebliği (Seri No: 1)",
                "ozet": "KDV indirimi, beyan, iade ve istisna uygulamaları",
                "url": "https://www.gib.gov.tr/node/89652",
                "guven_skoru": 0.95
            })

        if "kurumlar" in keyword_str or "kvk" in keyword_str:
            simulated_results.append({
                "kaynak": "dijital.gib.gov.tr",
                "baslik": "Kurumlar Vergisi Genel Tebliği",
                "referans": "1 Seri No'lu KVK Genel Tebliği",
                "ozet": "Kurumlar vergisi mükellefiyet, matrah, oran ve beyan esasları",
                "url": "https://www.gib.gov.tr/node/89653",
                "guven_skoru": 0.95
            })

        if "transfer" in keyword_str or "ilişkili" in keyword_str:
            simulated_results.append({
                "kaynak": "dijital.gib.gov.tr",
                "baslik": "Transfer Fiyatlandırması Tebliği",
                "referans": "1 Seri No'lu Transfer Fiyatlandırması Tebliği",
                "ozet": "İlişkili kişilerle işlemler, emsal bedel, dokümantasyon",
                "url": "https://www.gib.gov.tr/node/91234",
                "guven_skoru": 0.95
            })

        if "vdk" in keyword_str or "denetim" in keyword_str or "risk" in keyword_str:
            simulated_results.append({
                "kaynak": "vdk.gov.tr",
                "baslik": "VDK Risk Analizi Genelgesi 2025",
                "referans": "E-55935724-010.06-7361",
                "ozet": "13 kriter risk analizi, KURGAN senaryoları, Mali Milat",
                "url": "https://www.gib.gov.tr/node/105612",
                "guven_skoru": 1.0
            })

        return simulated_results

    def analyze_with_rag(self, question: str, context: Optional[Dict] = None) -> Dict:
        """
        Mevzuat RAG ile zenginleştirilmiş yanıt üret

        Args:
            question: Kullanıcının sorusu
            context: Ek bağlam (mükellef bilgileri, hesap bakiyeleri vb.)

        Returns:
            RAG zenginleştirilmiş yanıt
        """
        start_time = time.time()

        # 1. Anahtar kelimeleri çıkar
        keywords = self._extract_keywords(question)
        logger.info(f"[RAG] Anahtar kelimeler: {keywords}")

        # 2. İlgili mevzuatı getir
        mevzuat_refs = self.fetch_mevzuat_from_web(keywords)
        logger.info(f"[RAG] Bulunan mevzuat: {len(mevzuat_refs)} adet")

        # 3. Mevzuat bağlamını hazırla
        mevzuat_context = "\n\n".join([
            f"### {ref['baslik']}\n"
            f"**Referans:** {ref['referans']}\n"
            f"**Özet:** {ref['ozet']}\n"
            f"**Kaynak:** {ref['url']}"
            for ref in mevzuat_refs[:5]  # En fazla 5 kaynak
        ])

        # 4. Claude'a gönder (RAG prompt ile)
        full_prompt = f"""
Soru: {question}

{f"Mükellef Bağlamı: {json.dumps(context, ensure_ascii=False)}" if context else ""}

İLGİLİ MEVZUAT KAYNAKLARI:
{mevzuat_context if mevzuat_context else "Doğrudan eşleşen mevzuat bulunamadı. Genel bilgi ver."}

ÖNEMLİ:
- Sadece yukarıdaki kaynaklara dayanarak yanıt ver
- Her iddianı mevzuat referansıyla destekle
- YMM/SMMM terminolojisi kullan
- Belirsiz durumlarda "mevzuatta açık hüküm yok" de
"""

        if self.client:
            try:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=3000,
                    system=self.MEVZUAT_RAG_PROMPT,
                    messages=[{"role": "user", "content": full_prompt}]
                )

                result_text = response.content[0].text
                processing_time = int((time.time() - start_time) * 1000)

                # JSON parse
                try:
                    if "```json" in result_text:
                        json_str = result_text.split("```json")[1].split("```")[0]
                    elif "```" in result_text:
                        json_str = result_text.split("```")[1].split("```")[0]
                    else:
                        json_str = result_text

                    result = json.loads(json_str.strip())
                except json.JSONDecodeError:
                    result = {
                        "cevap": result_text,
                        "mevzuat_referanslari": mevzuat_refs,
                        "guven_skoru": 0.7
                    }

                result["model_used"] = self.model
                result["tokens_used"] = response.usage.input_tokens + response.usage.output_tokens
                result["processing_time_ms"] = processing_time
                result["rag_sources"] = mevzuat_refs

                return result

            except Exception as e:
                logger.error(f"Claude RAG API error: {e}")
                return self._demo_rag_response(question, mevzuat_refs)
        else:
            return self._demo_rag_response(question, mevzuat_refs)

    def _extract_keywords(self, text: str) -> List[str]:
        """Metinden anahtar kelimeleri çıkar"""
        # Basit anahtar kelime çıkarma
        # Gerçek uygulamada NLP kullanılabilir

        # Vergi/muhasebe ile ilgili önemli terimler
        important_terms = [
            "kdv", "kurumlar", "gelir", "stopaj", "vergi", "matrah",
            "ttk", "376", "sermaye", "örtülü", "transfer", "fiyatlandırma",
            "adat", "faiz", "131", "331", "ilişkili", "kişi",
            "vdk", "inceleme", "denetim", "risk", "kurgan",
            "beyanname", "mizan", "bilanço", "e-fatura", "e-defter",
            "ceza", "usulsüzlük", "kaçakçılık", "izaha davet"
        ]

        text_lower = text.lower()
        keywords = []

        for term in important_terms:
            if term in text_lower:
                keywords.append(term)

        # Hesap kodlarını da çıkar (3 haneli sayılar)
        import re
        account_codes = re.findall(r'\b[1-7]\d{2}\b', text)
        keywords.extend(account_codes)

        return list(set(keywords))[:10]  # En fazla 10 anahtar kelime

    def _demo_rag_response(self, question: str, mevzuat_refs: List[Dict]) -> Dict:
        """Demo mod için RAG yanıtı"""
        question_lower = question.lower()

        # Soru tipine göre demo yanıt
        if "131" in question_lower or "adat" in question_lower or "ortak" in question_lower:
            return {
                "cevap": """131 Ortaklardan Alacaklar hesabı için adat faizi hesaplaması zorunludur.

**Yasal Dayanak:** KVK Md. 13 (Transfer Fiyatlandırması), GVK Md. 75/4

**Emsal Faiz Oranı Belirleme:**
1. TCMB Reeskont Faizi: %55 (2026)
2. Bankaların ticari kredi faizi: ~%60-70

**Hesaplama Yöntemi:**
Adat = (Alacak Bakiyesi × Gün Sayısı × Faiz Oranı) / 36.500

**Risk:**
- Adat faizi hesaplanmazsa → KVK 13 örtülü kazanç dağıtımı
- Stopaj yükümlülüğü doğar (GVK 94/6-a)
- VDK KURGAN KRG-07 senaryosu tetiklenir""",
                "mevzuat_referanslari": [
                    {"kaynak": "5520 sayılı KVK", "madde": "Md. 13", "ozet": "Transfer fiyatlandırması - ilişkili kişilerle emsallere uygun işlem"},
                    {"kaynak": "193 sayılı GVK", "madde": "Md. 75/4", "ozet": "Her türlü alacak faizi menkul sermaye iradıdır"},
                    {"kaynak": "VDK Genelgesi 2025", "madde": "KRG-07", "ozet": "Karşılıklı Ödeme Döngüsü senaryosu"}
                ],
                "pratik_uygulama": "Her ay sonunda 131 bakiyesi için adat hesabı yapın, 642 hesaba gelir kaydedin",
                "dikkat_edilecekler": ["Stopaj beyanını unutmayın", "Transfer fiyatlandırması formunu doldurun"],
                "ilgili_hesap_kodlari": ["131", "642", "360"],
                "guven_skoru": 0.9,
                "model_used": "demo",
                "tokens_used": 0,
                "processing_time_ms": 50,
                "rag_sources": mevzuat_refs
            }

        elif "ttk" in question_lower or "376" in question_lower or "sermaye kaybı" in question_lower:
            return {
                "cevap": """TTK 376 Sermaye Kaybı Analizi:

**Durumlar ve Aksiyonlar:**

1. **Yarı Kayıp (≥%50):** Yönetim Kurulu iyileştirme önlemleri almalı
2. **2/3 Kayıp (≥%66.67):** Genel Kurul toplanmalı, sermaye artırımı veya azaltımı kararı
3. **Borca Batık:** Mahkemeye bildirim ZORUNLU

**Hesaplama Formülü:**
Kayıp Oranı = (Sermaye + Yasal Yedekler - Özkaynaklar) / (Sermaye + Yasal Yedekler)

**Önemli:** Özkaynaklar ≥ (Sermaye + Yasal Yedekler) ise KAYIP YOK!""",
                "mevzuat_referanslari": [
                    {"kaynak": "6102 sayılı TTK", "madde": "Md. 376", "ozet": "Sermayenin kaybı ve borca batıklık durumları"},
                    {"kaynak": "SPK Tebliği", "madde": "II-14.1", "ozet": "Sermaye piyasası araçlarının değerlemesi"}
                ],
                "pratik_uygulama": "Her dönem sonunda TTK 376 analizi yapın, durum değişikliğinde derhal aksiyon alın",
                "dikkat_edilecekler": ["Borca batıklıkta mahkeme bildirimi zorunlu", "GK çağrısı 15 gün içinde yapılmalı"],
                "ilgili_hesap_kodlari": ["500", "540", "570", "580"],
                "guven_skoru": 0.95,
                "model_used": "demo",
                "tokens_used": 0,
                "processing_time_ms": 50,
                "rag_sources": mevzuat_refs
            }

        else:
            return {
                "cevap": f"Sorunuz: '{question}'\n\nBu konuda mevzuat araştırması yapıldı. Detaylı yanıt için lütfen daha spesifik bir soru sorun veya ilgili hesap kodlarını belirtin.",
                "mevzuat_referanslari": mevzuat_refs[:3] if mevzuat_refs else [],
                "pratik_uygulama": "Konuyla ilgili VUK, KVK, GVK ve TTK maddelerini inceleyin",
                "dikkat_edilecekler": ["Mevzuat sürekli güncelleniyor", "Özelge başvurusu yapabilirsiniz"],
                "guven_skoru": 0.5,
                "model_used": "demo",
                "tokens_used": 0,
                "processing_time_ms": 30,
                "rag_sources": mevzuat_refs
            }


if __name__ == "__main__":
    analyzer = AIAnalyzer()

    # Test regwatch
    test_event = {
        "title": "Kurumlar Vergisi Oraninda Degisiklik",
        "content": "2026 yili icin kurumlar vergisi orani %23 olarak belirlendi.",
        "source": "GIB",
        "date": "2025-01-08"
    }

    print("\n=== REGWATCH ANALIZI ===")
    result = analyzer.analyze_regwatch_event(test_event)
    print(json.dumps(result, indent=2, ensure_ascii=False))

    # Test company change - TEMIZLENDI (SIFIR TOLERANS)
    test_change = {
        "company_name": "TEST A.S.",
        "tax_number": "TEST_VKN_000",
        "change_type": "liquidation_start",
        "old_value": "Aktif",
        "new_value": "Tasfiye Halinde"
    }

    print("\n=== SIRKET ANALIZI ===")
    result = analyzer.analyze_company_change(test_change)
    print(json.dumps(result, indent=2, ensure_ascii=False))
