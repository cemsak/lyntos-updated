"""
LYNTOS AI Orchestrator
Central AI management system for Claude + OpenAI synergy
"""

import logging
from typing import List, Dict, Any, Optional

from .base_provider import (
    AIProvider, TaskType, Complexity, AIRequest, AIResponse, AIMessage
)
from .router import AIRouter

logger = logging.getLogger(__name__)


class AIOrchestrator:
    """
    LYNTOS AI Orchestrator - Central AI Management

    Responsibilities:
    1. Route tasks to appropriate AI providers
    2. Manage fallback chains
    3. Track usage and costs
    4. Provide unified API for all AI operations

    Usage:
        orchestrator = AIOrchestrator()

        # Simple usage
        response = await orchestrator.generate("What is TTK 376?", TaskType.CHAT_CORPORATE)

        # With conversation history
        response = await orchestrator.chat(messages, TaskType.CHAT_CORPORATE)

        # Quick classification
        response = await orchestrator.classify("Is this a tax question?")

        # Generate JSON
        response = await orchestrator.generate_json(prompt, schema)
    """

    _instance = None

    def __new__(cls):
        """Singleton pattern"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.router = AIRouter()
        self._initialized = True
        logger.info("AI Orchestrator initialized")

    async def generate(
        self,
        prompt: str,
        task_type: TaskType = TaskType.GENERAL,
        complexity: Complexity = Complexity.MEDIUM,
        system_prompt: Optional[str] = None,
        max_tokens: int = 2000,
        temperature: float = 0.7,
    ) -> AIResponse:
        """
        Generate AI response for a single prompt
        """
        request = AIRequest(
            messages=[AIMessage(role="user", content=prompt)],
            task_type=task_type,
            complexity=complexity,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        return await self.router.route(request)

    async def chat(
        self,
        messages: List[Dict[str, str]],
        task_type: TaskType = TaskType.GENERAL,
        complexity: Complexity = Complexity.MEDIUM,
        system_prompt: Optional[str] = None,
        max_tokens: int = 2000,
    ) -> AIResponse:
        """
        Generate AI response for a conversation

        Args:
            messages: List of {"role": "user"|"assistant", "content": "..."}
        """
        ai_messages = [
            AIMessage(role=msg["role"], content=msg["content"])
            for msg in messages
        ]

        request = AIRequest(
            messages=ai_messages,
            task_type=task_type,
            complexity=complexity,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
        )

        return await self.router.route(request)

    async def classify(
        self,
        text: str,
        categories: List[str],
        system_prompt: Optional[str] = None,
    ) -> AIResponse:
        """
        Classify text into one of the given categories
        Uses GPT-4o-mini for speed and cost efficiency
        """
        prompt = f"""Classify the following text into one of these categories: {', '.join(categories)}

Text: {text}

Respond with only the category name, nothing else."""

        default_system = "You are a classification assistant. Respond with only the category name."

        request = AIRequest(
            messages=[AIMessage(role="user", content=prompt)],
            task_type=TaskType.CLASSIFICATION,
            complexity=Complexity.LOW,
            system_prompt=system_prompt or default_system,
            max_tokens=50,
            temperature=0.1,
        )

        return await self.router.route(request)

    async def summarize(
        self,
        text: str,
        max_length: int = 200,
        complexity: Complexity = Complexity.LOW,
    ) -> AIResponse:
        """
        Summarize text
        Uses GPT-4o-mini for low complexity, Claude for high complexity
        """
        prompt = f"""Summarize the following text in {max_length} words or less:

{text}"""

        request = AIRequest(
            messages=[AIMessage(role="user", content=prompt)],
            task_type=TaskType.SUMMARIZATION,
            complexity=complexity,
            system_prompt="You are a summarization assistant. Be concise and accurate.",
            max_tokens=max_length * 2,
            temperature=0.3,
        )

        return await self.router.route(request)

    async def generate_json(
        self,
        prompt: str,
        schema_description: str,
        system_prompt: Optional[str] = None,
    ) -> AIResponse:
        """
        Generate structured JSON output
        Uses GPT-4o for reliable JSON generation
        """
        full_prompt = f"""{prompt}

Output Format:
{schema_description}

Respond with valid JSON only, no markdown formatting or explanation."""

        default_system = "You are a JSON generation assistant. Output valid JSON only."

        request = AIRequest(
            messages=[AIMessage(role="user", content=full_prompt)],
            task_type=TaskType.JSON_GENERATION,
            complexity=Complexity.MEDIUM,
            system_prompt=system_prompt or default_system,
            max_tokens=2000,
            temperature=0.2,
        )

        return await self.router.route(request)

    async def analyze_legal(
        self,
        text: str,
        context: Optional[str] = None,
    ) -> AIResponse:
        """
        Perform legal analysis
        Always uses Claude for depth and accuracy
        """
        prompt = f"""Analyze the following from a Turkish corporate law perspective:

{text}

{"Context: " + context if context else ""}

Provide:
1. Key legal issues identified
2. Relevant TTK articles
3. Risk assessment
4. Recommended actions"""

        system = """Sen bir Turk sirketler hukuku uzmanisin.
TTK (Turk Ticaret Kanunu) ve ilgili mevzuata hakimsin.
Analizlerinde net, somut ve uygulanabilir oneriler sun."""

        request = AIRequest(
            messages=[AIMessage(role="user", content=prompt)],
            task_type=TaskType.LEGAL_ANALYSIS,
            complexity=Complexity.HIGH,
            system_prompt=system,
            max_tokens=3000,
            temperature=0.5,
        )

        return await self.router.route(request)

    async def explain_risk(
        self,
        risk_data: Dict[str, Any],
        context: Optional[str] = None,
    ) -> AIResponse:
        """
        Generate human-readable risk explanation
        Uses Claude for nuanced explanations
        """
        prompt = f"""Explain the following risk finding in clear Turkish:

Risk Data:
{risk_data}

{"Context: " + context if context else ""}

Provide:
1. What this risk means in plain language
2. Potential impact on the business
3. Urgency level
4. Recommended immediate actions"""

        system = """Sen bir risk aciklama uzmanisin.
Teknik verileri is dunyasinin anlayacagi dile cevir.
Somut ve aksiyon odakli ol."""

        request = AIRequest(
            messages=[AIMessage(role="user", content=prompt)],
            task_type=TaskType.RISK_EXPLANATION,
            complexity=Complexity.MEDIUM,
            system_prompt=system,
            max_tokens=1500,
            temperature=0.5,
        )

        return await self.router.route(request)

    def get_metrics(self) -> Dict[str, Any]:
        """Get orchestrator metrics"""
        return {
            "available_providers": self.router.get_available_providers(),
            "provider_metrics": self.router.get_all_metrics(),
        }

    # =========================================================================
    # VDK RISK ANALIZI METODLARI
    # =========================================================================

    async def vdk_quick_summary(
        self,
        risk_data: Dict[str, Any],
    ) -> AIResponse:
        """
        VDK Risk Analizi - Hızlı Özet (OpenAI GPT-4o-mini)
        Maliyet optimizasyonu için mini model kullanılır
        """
        # Mükellef bilgileri
        mukellef = risk_data.get("mukellef", {})
        kritik = risk_data.get("kritik_hesaplar", {})
        tetiklenen = risk_data.get("tetiklenen_senaryolar", [])

        # Tetiklenen senaryo özetleri
        senaryo_ozet = ""
        if tetiklenen:
            senaryo_ozet = "\n".join([
                f"• {s.get('id')}: {s.get('ad')} (Risk: {s.get('risk_puani')}/100)"
                for s in tetiklenen[:3]
            ])

        prompt = f"""VDK RİSK ANALİZİ - HIZLI ÖZET

MÜVEKKİL: {mukellef.get('ad', 'N/A')} (VKN: {mukellef.get('vkn', 'N/A')})
DÖNEM: {risk_data.get('donem', 'N/A')}

📊 RİSK METRİKLERİ:
• Risk Skoru: {risk_data.get('score', 'N/A')}/100 ({risk_data.get('risk_level', 'N/A').upper()})
• VDK İnceleme Olasılığı: %{risk_data.get('risk_summary', {}).get('inspection_probability', 'N/A')}
• Kritik Bulgu: {sum(cat.get('kritik_sayisi', 0) for cat in risk_data.get('category_analysis', {}).values())}
• Uyarı: {len(risk_data.get('warnings', []))}

💰 KRİTİK HESAPLAR:
• Kasa (100): {kritik.get('kasa_100', 0):,.0f} TL
• Ortaklara Borç (331+431): {kritik.get('ortaklara_borclar_331', 0) + kritik.get('ortaklara_borclar_431', 0):,.0f} TL
• Ciro: {kritik.get('ciro', 0):,.0f} TL
• Net Kâr: {kritik.get('net_kar', 0):,.0f} TL

🚨 TETİKLENEN KURGAN SENARYOLARI:
{senaryo_ozet or '• Yok'}

📋 UYARILAR:
{chr(10).join(['• ' + w for w in risk_data.get('warnings', [])[:3]]) or '• Yok'}

---

SMMM için ÖZET HAZIRLA (5 madde):
1. Genel risk durumu (1 cümle)
2. En kritik bulgu ve TL tutarı
3. VDK inceleme riski değerlendirmesi
4. Öncelikli 2 aksiyon
5. Dikkat edilecek mevzuat maddesi

Türkçe yaz, somut TL tutarları kullan, SMMM'nin müvekkiline anlatacağı şekilde yaz."""

        request = AIRequest(
            messages=[AIMessage(role="user", content=prompt)],
            task_type=TaskType.SUMMARIZATION,
            complexity=Complexity.LOW,
            system_prompt="Sen bir VDK risk özeti uzmanısın. Kısa, net ve aksiyon odaklı özet yaz. Her zaman somut TL tutarları ve hesap kodları kullan.",
            max_tokens=600,
            temperature=0.3,
        )

        return await self.router.route(request)

    async def vdk_detailed_analysis(
        self,
        risk_data: Dict[str, Any],
        focus_area: Optional[str] = None,
    ) -> AIResponse:
        """
        VDK Risk Analizi - Detaylı Analiz (Claude)
        Derin mevzuat analizi için Claude kullanılır
        """
        # Mükellef bilgileri
        mukellef = risk_data.get("mukellef", {})
        kritik = risk_data.get("kritik_hesaplar", {})
        donem = risk_data.get("donem", "")
        tetiklenen = risk_data.get("tetiklenen_senaryolar", [])

        # Kategori analizi
        categories_summary = ""
        if risk_data.get("category_analysis"):
            for cat_id, cat_data in risk_data.get("category_analysis", {}).items():
                if cat_data.get("kritik_sayisi", 0) > 0 or cat_data.get("uyari_sayisi", 0) > 0:
                    categories_summary += f"\n\n### {cat_id.upper()}\n"
                    categories_summary += f"- Toplam Risk: {cat_data.get('toplam_risk', 0)}/100\n"
                    categories_summary += f"- Kritik: {cat_data.get('kritik_sayisi', 0)}, Uyarı: {cat_data.get('uyari_sayisi', 0)}\n"
                    for kontrol in cat_data.get("kontroller", [])[:3]:
                        categories_summary += f"  * {kontrol.get('kontrol_adi')}: {kontrol.get('durum')} - {kontrol.get('aciklama', '')[:100]}\n"

        # TTK 376 detayı
        ttk_376_info = ""
        if risk_data.get("ttk_376"):
            ttk = risk_data["ttk_376"]
            ttk_376_info = f"""

═══════════════════════════════════════════════════════════════
TTK 376 SERMAYE KAYBI ANALİZİ
═══════════════════════════════════════════════════════════════
Sermaye (500): {kritik.get('sermaye_500', 0):,.2f} TL
Geçmiş Yıl Zararları (580): {kritik.get('gecmis_yil_zararlar_580', 0):,.2f} TL
Dönem Kâr/Zarar (590): {kritik.get('donem_kar_zarar_590', 0):,.2f} TL
Sermaye Kaybı Oranı: %{ttk.get('sermaye_kaybi_orani', 0)*100:.1f}
Durum: {ttk.get('durum', 'N/A')}
Gerekli Aksiyon: {ttk.get('aksiyon', 'Yok')}"""

        # Örtülü sermaye detayı
        ortulu_sermaye_info = ""
        if risk_data.get("ortulu_sermaye"):
            os_data = risk_data["ortulu_sermaye"]
            ortulu_sermaye_info = f"""

═══════════════════════════════════════════════════════════════
ÖRTÜLÜ SERMAYE ANALİZİ (KVK Md. 12)
═══════════════════════════════════════════════════════════════
Ortaklara Borçlar (331+431): {kritik.get('ortaklara_borclar_331', 0) + kritik.get('ortaklara_borclar_431', 0):,.2f} TL
  - Kısa Vadeli (331): {kritik.get('ortaklara_borclar_331', 0):,.2f} TL
  - Uzun Vadeli (431): {kritik.get('ortaklara_borclar_431', 0):,.2f} TL
Özkaynak (3x Sınır Baz): {os_data.get('sinir', 0)/3:,.2f} TL
Sınır (3x Özkaynak): {os_data.get('sinir', 0):,.2f} TL
Aşan Tutar: {os_data.get('iliskili_borc', 0) - os_data.get('sinir', 0):,.2f} TL
KKEG Hesaplanan: {os_data.get('kkeg_tutari', 0):,.2f} TL
Durum: {os_data.get('durum', 'N/A')}"""

        # Tetiklenen senaryolar detayı
        senaryo_detay = ""
        if tetiklenen:
            senaryo_detay = """

═══════════════════════════════════════════════════════════════
TETİKLENEN KURGAN SENARYOLARI - DETAY
═══════════════════════════════════════════════════════════════"""
            for s in tetiklenen:
                senaryo_detay += f"""

🔴 {s.get('id', 'N/A')}: {s.get('ad', 'N/A')}
   Risk Puanı: {s.get('risk_puani', 0)}/100
   Tetikleme Nedeni: {s.get('tetikleme_nedeni', 'N/A')}
   Kanıtlar: {[k.get('kaynak') for k in s.get('kanitlar', [])][:3]}
"""

        focus_instruction = ""
        if focus_area:
            focus_instruction = f"\n\n🎯 ÖZEL ODAK ALANI: {focus_area} - Bu alanı derinlemesine analiz et."

        prompt = f"""
═══════════════════════════════════════════════════════════════
VDK RİSK ANALİZİ - DETAYLI RAPOR
═══════════════════════════════════════════════════════════════

MÜVEKKİL: {mukellef.get('ad', 'N/A')}
VKN: {mukellef.get('vkn', 'N/A')}
SEKTÖR: {mukellef.get('sektor', 'N/A')} (NACE: {mukellef.get('nace_kodu', 'N/A')})
DÖNEM: {donem}

═══════════════════════════════════════════════════════════════
RİSK METRİKLERİ
═══════════════════════════════════════════════════════════════
Risk Skoru: {risk_data.get('score', 'N/A')}/100
Risk Seviyesi: {risk_data.get('risk_level', 'N/A').upper()}
VDK İnceleme Olasılığı: %{risk_data.get('risk_summary', {}).get('inspection_probability', 'N/A')}

═══════════════════════════════════════════════════════════════
KRİTİK MİZAN BAKİYELERİ
═══════════════════════════════════════════════════════════════
VARLIKLAR:
• Kasa (100): {kritik.get('kasa_100', 0):,.2f} TL
• Bankalar (102): {kritik.get('banka_102', 0):,.2f} TL
• Ticari Alacaklar (120): {kritik.get('alicilar_120', 0):,.2f} TL
• Stoklar (15x): {kritik.get('stoklar_15x', 0):,.2f} TL
• İndirilecek KDV (191): {kritik.get('indirilecek_kdv_191', 0):,.2f} TL

KAYNAKLAR:
• Ortaklardan Alacaklar (131): {kritik.get('ortaklardan_alacaklar_131', 0):,.2f} TL
• Ortaklara Borçlar (331+431): {kritik.get('ortaklara_borclar_331', 0) + kritik.get('ortaklara_borclar_431', 0):,.2f} TL
• Sermaye (500): {kritik.get('sermaye_500', 0):,.2f} TL
• Geçmiş Yıl Zararları (580): {kritik.get('gecmis_yil_zararlar_580', 0):,.2f} TL

GELİR TABLOSU:
• Ciro: {kritik.get('ciro', 0):,.2f} TL
• Net Kâr/Zarar: {kritik.get('net_kar', 0):,.2f} TL
• Brüt Kâr Marjı: {(kritik.get('brut_kar', 0) / kritik.get('ciro', 1) * 100) if kritik.get('ciro', 0) > 0 else 0:.1f}%

KATEGORİ ANALİZLERİ:{categories_summary}
{ttk_376_info}
{ortulu_sermaye_info}
{senaryo_detay}

UYARILAR:
{chr(10).join(['• ' + w for w in risk_data.get('warnings', [])[:5]]) or '• Yok'}

ACİL AKSİYONLAR:
{chr(10).join(['• ' + a.get('description', '') for a in risk_data.get('urgent_actions', {}).get('items', [])[:5]]) or '• Yok'}
{focus_instruction}

═══════════════════════════════════════════════════════════════
RAPOR FORMATI
═══════════════════════════════════════════════════════════════

## 1. YÖNETİCİ ÖZETİ
(2-3 cümle, SMMM'nin patron'a söyleyeceği özet - somut TL tutarları ile)

## 2. KRİTİK BULGULAR
(Her bulgu için: Hesap kodu, TL tutarı, mevzuat referansı, risk açıklaması)

## 3. VDK İNCELEME RİSKİ DEĞERLENDİRMESİ
(İhtimal yüzdesi, tetikleyici faktörler, KURGAN senaryo kodları)

## 4. ÖNCELİKLİ AKSİYONLAR
(Sıralı, her biri için: yapılacak iş, süre tahmini, sorumlu, mevzuat referansı)

## 5. MEVZUAT REFERANSLARI
(Her madde için kısa açıklama ile: VUK, KVK, TTK, GVK, KDV Kanunu)

## 6. VDK MÜFETTIS SORULARI VE SAVUNMA NOTLARI
(Olası 5 soru ve her biri için hazırlanacak savunma metni taslağı)

## 7. HAZIRLANACAK BELGELER
(Kontrol listesi formatında: belge adı, açıklama, öncelik)

Türkçe yaz, SMMM'nin müvekkiline açıklayabileceği netlikte ol."""

        system = """Sen LYNTOS platformunun VDK Risk Analizi uzmanısın.

🎯 GÖREV: SMMM/YMM için profesyonel, mevzuat referanslı, somut TL tutarlarına dayalı detaylı VDK risk analiz raporu hazırla.

📚 UZMANLIK ALANLARIN:
- VUK (Vergi Usul Kanunu) - Re'sen takdir, cezalar
- KVK (Kurumlar Vergisi Kanunu) - Örtülü sermaye (Md. 12), Transfer fiyatlandırması (Md. 13)
- GVK (Gelir Vergisi Kanunu) - Stopajlar, faiz gelirleri
- KDV Kanunu - Devreden KDV, İade işlemleri
- TTK (Türk Ticaret Kanunu) - Sermaye kaybı (Md. 376)
- VDK 13 Kriter Genelgesi (E-55935724-010.06-7361)
- KURGAN 16 Risk Senaryosu sistemi

⚠️ KRİTİK: KURGAN sistemi 1 Ekim 2025'te aktif oldu. "Bilmiyordum" artık geçerli savunma değil!

📋 HER ZAMAN:
1. Somut TL tutarları ve hesap kodları kullan
2. Mevzuat madde numaraları ver (VUK Md. 30/4 gibi)
3. Pratik, uygulanabilir aksiyonlar öner
4. Süre tahminleri belirt
5. VDK müfettişinin bakış açısıyla değerlendir
6. Savunma stratejisi sun"""

        request = AIRequest(
            messages=[AIMessage(role="user", content=prompt)],
            task_type=TaskType.LEGAL_ANALYSIS,
            complexity=Complexity.HIGH,
            system_prompt=system,
            max_tokens=4500,
            temperature=0.4,
        )

        return await self.router.route(request)

    async def vdk_generate_izah(
        self,
        scenario: str,
        risk_data: Dict[str, Any],
        specific_issue: Optional[str] = None,
    ) -> AIResponse:
        """
        VDK Risk Analizi - İzah Metni Üretimi (Claude)
        VDK izaha davet için savunma metni hazırlar
        """
        prompt = f"""VDK IZAHA DAVET ICIN SAVUNMA METNI

SENARYO: {scenario}
OZEL SORUN: {specific_issue or 'Genel izah'}

MUVEKKILIN DURUM:
- Risk Skoru: {risk_data.get('score', 'N/A')}/100
- Ilgili Uyarilar: {risk_data.get('warnings', [])[:5]}
- Kritik Hesaplar: {[c.get('hesap_kodu') for cat in risk_data.get('category_analysis', {}).values() for c in cat.get('kontroller', []) if c.get('durum') == 'KRITIK'][:5]}

LUTFEN SU FORMATTA IZAH METNI OLUSTUR:

---

**KONU:** [Izah konusu]

**SAYIN VERGI DAIRESI MUDURUGU,**

[Acilis paragrafi - durum tespiti]

**1. OLAY ACIKLAMASI**
[Neyin, nasil, neden oldugu]

**2. YASAL DAYANAK**
[Ilgili VUK, KVK, TTK maddeleri]

**3. BELGELER**
[Destekleyici belgeler listesi]

**4. SONUC VE TALEP**
[Muvekkil lehine sonuc talebi]

Saygilarimla,
[SMMM/YMM Bilgileri]

---

NOT: Bu taslak metindir. SMMM tarafindan muvekkil bilgileri ile doldurulmalidir."""

        system = """Sen bir vergi savunma uzmanisin.

VDK izaha davet yazilarina profesyonel, mevzuata dayali, somut belgelerle desteklenen savunma metinleri yazarsin.

Yazdigin metinler:
- Resmi dilde olmali
- Mevzuat referansi icermeli
- Belge listesi icermeli
- Savunmayi guclendiren argumanlara odaklanmali
- Muvekkil aleyhine olabilecek ifadelerden kacinmali"""

        request = AIRequest(
            messages=[AIMessage(role="user", content=prompt)],
            task_type=TaskType.LEGAL_ANALYSIS,
            complexity=Complexity.HIGH,
            system_prompt=system,
            max_tokens=3000,
            temperature=0.4,
        )

        return await self.router.route(request)

    async def vdk_answer_question(
        self,
        question: str,
        risk_data: Dict[str, Any],
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> AIResponse:
        """
        VDK Risk Analizi - Serbest Soru Cevaplama
        SMMM/YMM seviyesinde profesyonel yanıtlar
        """
        # Soru karmasikligini belirle
        complex_keywords = ["ttk", "376", "ortulu", "sermaye", "kvk", "vuk", "mevzuat",
                          "kurgan", "inceleme", "savunma", "izah", "denetim", "kkeg",
                          "transfer", "fiyatlandirma", "adat", "faiz", "kasa"]
        is_complex = any(kw in question.lower() for kw in complex_keywords)

        # MÜKELLEFİ TANIMLAYAN BİLGİLER
        mukellef = risk_data.get("mukellef", {})
        donem = risk_data.get("donem", "")
        mukellef_context = f"""
═══════════════════════════════════════════════════════════════
MÜVEKKİL BİLGİLERİ
═══════════════════════════════════════════════════════════════
Unvan: {mukellef.get('ad', 'N/A')}
VKN: {mukellef.get('vkn', 'N/A')}
Sektör: {mukellef.get('sektor', 'N/A')}
NACE Kodu: {mukellef.get('nace_kodu', 'N/A')}
Vergi Dairesi: {mukellef.get('vergi_dairesi', 'N/A')}
Analiz Dönemi: {donem}
"""

        # KRİTİK MİZAN HESAPLARI
        kritik = risk_data.get("kritik_hesaplar", {})
        hesap_context = f"""
═══════════════════════════════════════════════════════════════
KRİTİK MİZAN BAKİYELERİ ({donem})
═══════════════════════════════════════════════════════════════
VARLIKLAR:
• Kasa (100): {kritik.get('kasa_100', 0):,.2f} TL
• Bankalar (102): {kritik.get('banka_102', 0):,.2f} TL
• Ticari Alacaklar (120): {kritik.get('alicilar_120', 0):,.2f} TL
• Stoklar (15x): {kritik.get('stoklar_15x', 0):,.2f} TL
• İndirilecek KDV (191): {kritik.get('indirilecek_kdv_191', 0):,.2f} TL

İLİŞKİLİ TARAF:
• Ortaklardan Alacaklar (131): {kritik.get('ortaklardan_alacaklar_131', 0):,.2f} TL
• Ortaklara Borçlar - Kısa (331): {kritik.get('ortaklara_borclar_331', 0):,.2f} TL
• Ortaklara Borçlar - Uzun (431): {kritik.get('ortaklara_borclar_431', 0):,.2f} TL

ÖZKAYNAKLAR:
• Sermaye (500): {kritik.get('sermaye_500', 0):,.2f} TL
• Geçmiş Yıl Zararları (580): {kritik.get('gecmis_yil_zararlar_580', 0):,.2f} TL
• Dönem Net Kâr/Zarar (590): {kritik.get('donem_kar_zarar_590', 0):,.2f} TL

GELİR TABLOSU:
• Net Satışlar (600): {kritik.get('yurtici_satislar_600', 0):,.2f} TL
• Satış Maliyeti (620): {kritik.get('satis_maliyeti_620', 0):,.2f} TL
• Ciro: {kritik.get('ciro', 0):,.2f} TL
• Net Kâr: {kritik.get('net_kar', 0):,.2f} TL
"""

        # RİSK ANALİZİ
        risk_context = f"""
═══════════════════════════════════════════════════════════════
VDK RİSK ANALİZİ
═══════════════════════════════════════════════════════════════
Risk Skoru: {risk_data.get('score', 'N/A')}/100 ({risk_data.get('risk_level', 'N/A').upper()})
VDK İnceleme Olasılığı: %{risk_data.get('risk_summary', {}).get('inspection_probability', 'N/A')}
Kritik Bulgu: {sum(cat.get('kritik_sayisi', 0) for cat in risk_data.get('category_analysis', {}).values())}
Uyarı: {len(risk_data.get('warnings', []))}
"""

        # TETİKLENEN KURGAN SENARYOLARI
        tetiklenen = risk_data.get("tetiklenen_senaryolar", [])
        senaryo_context = ""
        if tetiklenen:
            senaryo_context = """
═══════════════════════════════════════════════════════════════
TETİKLENEN KURGAN SENARYOLARI
═══════════════════════════════════════════════════════════════"""
            for s in tetiklenen[:5]:  # Max 5 senaryo
                senaryo_context += f"""
🔴 {s.get('id', 'N/A')}: {s.get('ad', 'N/A')}
   Tetikleme Nedeni: {s.get('tetikleme_nedeni', 'N/A')}
   Risk Puanı: {s.get('risk_puani', 0)}/100
"""

        # TTK 376 DURUMU
        ttk_context = ""
        if risk_data.get("ttk_376"):
            ttk = risk_data["ttk_376"]
            durum = ttk.get("durum", "")
            if durum and durum != "NORMAL":
                ttk_context = f"""
═══════════════════════════════════════════════════════════════
TTK 376 SERMAYE KAYBI
═══════════════════════════════════════════════════════════════
Durum: {durum}
Sermaye Kaybı Oranı: %{ttk.get('sermaye_kaybi_orani', 0)*100:.1f}
Aksiyon: {ttk.get('aksiyon', 'Yok')}
"""

        # ÖRTÜLÜ SERMAYE
        ortulu_context = ""
        if risk_data.get("ortulu_sermaye"):
            os_data = risk_data["ortulu_sermaye"]
            if os_data.get("durum") == "SINIR_UZERINDE":
                ortulu_context = f"""
═══════════════════════════════════════════════════════════════
ÖRTÜLÜ SERMAYE (KVK 12)
═══════════════════════════════════════════════════════════════
İlişkili Kişi Borcu: {os_data.get('iliskili_borc', 0):,.2f} TL
Sınır (3x Özkaynak): {os_data.get('sinir', 0):,.2f} TL
KKEG Tutarı: {os_data.get('kkeg_tutari', 0):,.2f} TL
Durum: SINIR AŞILDI - Beyanname düzeltmesi gerekebilir!
"""

        # FULL CONTEXT
        full_context = f"""{mukellef_context}
{hesap_context}
{risk_context}
{senaryo_context}
{ttk_context}
{ortulu_context}
═══════════════════════════════════════════════════════════════
SORU
═══════════════════════════════════════════════════════════════
{question}
"""

        messages = []
        if conversation_history:
            for msg in conversation_history:
                messages.append(AIMessage(role=msg["role"], content=msg["content"]))
        messages.append(AIMessage(role="user", content=full_context))

        system = """Sen LYNTOS platformunun YMM/SMMM Danışmanısın. Türk vergi mevzuatı ve denetim konularında uzman bir yapay zekasın.

🎯 GÖREV: SMMM/YMM'lerin VDK (Vergi Denetim Kurulu) ile ilgili sorularını, MÜVEKKİL VERİLERİNE DAYALI olarak yanıtla.

📋 YANITLARIN ŞU ÖZELLİKLERİ TAŞIMALI:

1. **SOMUT VE MÜVEKKİLE ÖZEL**
   - Yukarıdaki mizan bakiyelerini referans al
   - Hesap kodlarını (100, 131, 431 vb.) kullan
   - TL tutarlarını belirt

2. **MEVZUAT REFERANSLI**
   - VUK madde numarası (örn: VUK Md. 30/4)
   - KVK madde numarası (örn: KVK Md. 12, 13)
   - TTK madde numarası (örn: TTK Md. 376)
   - GVK, KDV Kanunu referansları

3. **PRATİK VE UYGULANABİLİR**
   - SMMM'nin ne yapması gerektiğini adım adım açıkla
   - Hazırlanması gereken belgeleri listele
   - Süre tahminleri ver

4. **RİSK ODAKLI**
   - VDK müfettişinin sorabileceği soruları tahmin et
   - Savunma stratejisi öner
   - İzaha davet durumunda yapılacakları belirt

⚠️ ÖNEMLİ: Generic/şablon cevap VERME. Her yanıt bu müvekkilin somut verilerine dayanmalı.

📝 ÖRNEK İYİ YANIT:
"Şirketinizin 431 hesabında 7.009.637 TL ortaklara borç bakiyesi görünmektedir. Bu tutar, KVK Md. 12 kapsamında örtülü sermaye değerlendirmesi gerektirir. 3x özkaynak sınırını aşıp aşmadığını kontrol etmenizi öneririm. Aşıyorsa, TCMB avans faiz oranı üzerinden (%45,75 - 2025 Q1) hesaplanacak faiz tutarı KKEG olarak beyanname düzeltmesi gerektirir."
"""

        request = AIRequest(
            messages=messages,
            task_type=TaskType.CHAT_CORPORATE if is_complex else TaskType.GENERAL,
            complexity=Complexity.HIGH if is_complex else Complexity.MEDIUM,
            system_prompt=system,
            max_tokens=2500,
            temperature=0.4,  # Daha tutarlı yanıtlar için düşürüldü
        )

        return await self.router.route(request)


# Singleton instance
_orchestrator: Optional[AIOrchestrator] = None


def get_orchestrator() -> AIOrchestrator:
    """Get the singleton orchestrator instance"""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = AIOrchestrator()
    return _orchestrator
