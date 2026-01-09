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

    # Test company change
    test_change = {
        "company_name": "TEST A.S.",
        "tax_number": "1234567890",
        "change_type": "liquidation_start",
        "old_value": "Aktif",
        "new_value": "Tasfiye Halinde"
    }

    print("\n=== SIRKET ANALIZI ===")
    result = analyzer.analyze_company_change(test_change)
    print(json.dumps(result, indent=2, ensure_ascii=False))
