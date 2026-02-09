"""
LYNTOS VDK Inspector Agent
============================

VDK Müfettiş Simülasyonu ve Savunma Hazırlığı Uzmanı.

5 Uzman Perspektifi:
1. SMMM (Mali Müşavir) - Günlük muhasebe pratiği
2. YMM (Yeminli Mali Müşavir) - Denetim ve tasdik uzmanlığı
3. Vergi Müfettişi - İnceleme metodolojisi, KURGAN tetikleyiciler
4. Hesap Uzmanı - Kaydi envanter, randıman analizi, adat hesaplama
5. VDK Uzmanı - KURGAN 25 kriter, RAM algoritması, sektörel risk

Capabilities:
- answer_inspector_question: Müfettiş sorusuna savunma cevabı hazırla
- prepare_defense: Belirli bir alarm için savunma dosyası
- document_guidance: Belge hazırlama rehberliği

⚠️ KUTSAL KİTAP KURALLARI:
- Hallucination YASAK
- Her yanıtta mevzuat referansı zorunlu
- Somut TL tutarları ve hesap kodları kullan
- Müvekkil aleyhine ifadelerden kaçın
"""

import logging
import time
from typing import List, Dict, Any, Optional
from datetime import datetime

from .base_agent import (
    BaseAgent, AgentTask, AgentResult, AgentStatus,
    AgentCapability, TaskPriority
)
from ..orchestrator import get_orchestrator

logger = logging.getLogger(__name__)


# 5 Uzman Perspektifi System Prompt
VDK_INSPECTOR_SYSTEM_PROMPT = """Sen LYNTOS VDK Inspector Ajanısın. Türk vergi sistemi konusunda 5 farklı uzmanlık perspektifini birleştirirsin:

## 1. SMMM PERSPEKTİFİ (Serbest Muhasebeci Mali Müşavir)
- Günlük muhasebe pratiği ve Tekdüzen Hesap Planı derinliği
- Müvekkil ile iletişim dili ve pratik çözüm önerileri
- Beyanname hazırlık süreçleri ve dönem sonu kapanış işlemleri
- E-defter, e-fatura, e-irsaliye uygulamaları

## 2. YMM PERSPEKTİFİ (Yeminli Mali Müşavir)
- Tam tasdik raporu standartları ve KDV iade prosedürleri
- Bağımsız denetim standartları (BDS)
- Transfer fiyatlandırması dokümantasyonu
- Mesleki sorumluluk ve etik kurallar

## 3. VERGİ MÜFETTİŞİ PERSPEKTİFİ
- İnceleme metodolojisi ve nelere bakılır
- Re'sen takdir kriterleri (VUK Md. 30)
- Tutanak ve vergi inceleme raporu yazım mantığı
- KURGAN sistemindeki tetikleyiciler ve seçim kriterleri
- İzaha davet prosedürü (VUK Md. 370)

## 4. HESAP UZMANI PERSPEKTİFİ
- Gelir İdaresi hesap inceleme teknikleri
- Kaydi envanter ve randıman analizi
- Karşıt inceleme mantığı ve BA-BS formları
- Adat hesaplama ve emsal faiz kontrolü
- Kasa hesabı adat yöntemi ile inceleme

## 5. VDK UZMANI PERSPEKTİFİ
- KURGAN Risk Analiz sistemi (25 kriter)
- RAM (Risk Analiz Modeli) algoritması
- Sektörel risk profilleri ve TCMB verileri
- VDK seçilme olasılığı hesaplama mantığı
- E-55935724-010.06-7361 sayılı VDK Genelgesi

## ZORUNLU KURALLAR
1. **Hallucination YASAK** - Emin olmadığın bilgiyi açıkça "bu konuda kesin bilgi veremiyorum" diye belirt
2. **Mevzuat referansı ZORUNLU** - Her yanıtta en az bir mevzuat madde numarası olmalı (örn: VUK Md. 30/4, KVK Md. 13)
3. **Somut tutarlar** - TL tutarlarını ve hesap kodlarını (100, 131, 320 vb.) kullan
4. **Savunma odaklı** - Müvekkil aleyhine ifadelerden kaçın, savunmayı güçlendiren argümanlara odaklan
5. **İki perspektif** - Her soru için hem "müfettiş böyle düşünür" hem "SMMM/YMM böyle savunur" perspektifi sun
6. **Profesyonel dil** - Resmi Türkçe, hukuki terminoloji kullan
7. **Pratik öneriler** - Soyut değil, somut ve uygulanabilir öneriler ver

## YANIT FORMATI
Her yanıt şu bölümleri içermeli:
1. **Müfettiş Perspektifi**: Müfettiş bu konuyu nasıl değerlendirir
2. **Savunma Stratejisi**: SMMM/YMM nasıl savunma yapmalı
3. **Hazırlanacak Belgeler**: Somut belge listesi
4. **Mevzuat Dayanağı**: İlgili kanun maddeleri
5. **Dikkat Edilecekler**: Kaçınılması gereken hatalar
"""


class VdkInspectorAgent(BaseAgent):
    """
    VDK Inspector Agent - Vergi Müfettişi Perspektifi

    SMMM + YMM + Vergi Müfettişi + Hesap Uzmanı + VDK Uzmanı
    uzmanlıklarını birleştirerek VDK incelemesine hazırlık sağlar.
    """

    agent_name = "VdkInspector"
    agent_description = "VDK müfettiş simülasyonu ve savunma hazırlığı uzmanı - 5 perspektif"

    capabilities = [
        AgentCapability(
            name="Müfettiş Sorusu Cevaplama",
            description="VDK müfettişinin sorabileceği sorulara savunma perspektifinden cevap hazırla",
            task_types=["answer_inspector_question", "prepare_answer"],
            required_context=["question"],
            optional_context=["alarm_code", "category", "risk_data", "client_info"],
        ),
        AgentCapability(
            name="Savunma Dosyası Hazırlama",
            description="Belirli bir alarm/tespit için tam savunma dosyası hazırla",
            task_types=["prepare_defense", "defense_brief"],
            required_context=["alarm_data"],
            optional_context=["risk_data", "muhtemel_cezalar", "client_info"],
        ),
        AgentCapability(
            name="Belge Hazırlama Rehberliği",
            description="Hangi belgelerin nasıl hazırlanacağı konusunda detaylı rehberlik",
            task_types=["document_guidance"],
            required_context=["alarm_code"],
            optional_context=["documents_list", "risk_data"],
        ),
    ]

    def __init__(self):
        super().__init__()
        self.orchestrator = get_orchestrator()

    async def execute(self, task: AgentTask) -> AgentResult:
        """Görevi çalıştır"""

        if task.task_type in ["answer_inspector_question", "prepare_answer"]:
            return await self._answer_question(task)
        elif task.task_type in ["prepare_defense", "defense_brief"]:
            return await self._prepare_defense(task)
        elif task.task_type == "document_guidance":
            return await self._document_guidance(task)
        else:
            return AgentResult(
                task_id=task.task_id,
                agent_name=self.agent_name,
                status=AgentStatus.FAILED,
                error=f"Bilinmeyen görev tipi: {task.task_type}"
            )

    async def _answer_question(self, task: AgentTask) -> AgentResult:
        """Müfettiş sorusuna savunma cevabı hazırla"""
        start_time = time.time()

        try:
            question = task.context.get("question", "")
            alarm_code = task.context.get("alarm_code", "")
            category = task.context.get("category", "")
            risk_data = task.context.get("risk_data", {})
            client_info = task.context.get("client_info", {})

            # Context bilgisi oluştur
            context_parts = []
            if alarm_code:
                context_parts.append(f"KURGAN Alarm Kodu: {alarm_code}")
            if category:
                context_parts.append(f"Kategori: {category}")
            if client_info:
                if client_info.get("nace_code"):
                    context_parts.append(f"NACE Kodu: {client_info['nace_code']}")
                if client_info.get("sector"):
                    context_parts.append(f"Sektör: {client_info['sector']}")

            # Risk verileri varsa ekle
            if risk_data:
                if risk_data.get("risk_score") is not None:
                    context_parts.append(f"Risk Skoru: {risk_data['risk_score']}/100")
                if risk_data.get("finding_summary"):
                    context_parts.append(f"Tespit: {risk_data['finding_summary']}")
                if risk_data.get("actual_value") is not None:
                    context_parts.append(f"Hesaplanan Değer: {risk_data['actual_value']}")
                if risk_data.get("threshold_value") is not None:
                    context_parts.append(f"Eşik Değer: {risk_data['threshold_value']}")
                if risk_data.get("legal_references"):
                    context_parts.append(f"İlgili Mevzuat: {', '.join(risk_data['legal_references'])}")

            context_str = "\n".join(context_parts) if context_parts else "Ek bağlam bilgisi yok."

            # AI'a gönder
            prompt = f"""Aşağıdaki VDK müfettiş sorusuna, 5 uzman perspektifini birleştirerek profesyonel bir savunma cevabı hazırla.

## MÜFETTİŞ SORUSU
"{question}"

## BAĞLAM BİLGİSİ
{context_str}

## İSTENEN YAPIT
Cevabını şu bölümlerle yapılandır:

### 🔍 Müfettiş Perspektifi
Müfettiş bu soruyu neden sorar, neyi araştırır, hangi belgelere bakacak?

### 🛡️ Savunma Stratejisi
SMMM/YMM olarak bu soruya en etkili nasıl cevap verilir? Hangi argümanlar güçlü?

### 📋 Hazırlanacak Belgeler
Somut belge listesi (her belge için kısa açıklama)

### ⚖️ Mevzuat Dayanağı
İlgili kanun maddeleri ve tebliğler

### ⚠️ Dikkat Edilecekler
Müfettişin karşısında yapılmaması gereken hatalar, kaçınılması gereken ifadeler
"""

            from ..base_provider import TaskType, Complexity

            response = await self.orchestrator.generate(
                prompt=prompt,
                system_prompt=VDK_INSPECTOR_SYSTEM_PROMPT,
                task_type=TaskType.VDK_INSPECTOR,
                complexity=Complexity.HIGH,
            )

            processing_time = int((time.time() - start_time) * 1000)

            return AgentResult(
                task_id=task.task_id,
                agent_name=self.agent_name,
                status=AgentStatus.COMPLETED,
                output={
                    "answer": response.content,
                    "question": question,
                    "alarm_code": alarm_code,
                    "category": category,
                    "model": response.model,
                    "tokens_used": response.tokens_used,
                    "generated_at": datetime.now().isoformat(),
                },
                tokens_used=response.tokens_used,
                processing_time_ms=processing_time,
            )

        except Exception as e:
            logger.error(f"[VdkInspector] answer_question failed: {e}")
            return AgentResult(
                task_id=task.task_id,
                agent_name=self.agent_name,
                status=AgentStatus.FAILED,
                error=str(e),
                processing_time_ms=int((time.time() - start_time) * 1000),
            )

    async def _prepare_defense(self, task: AgentTask) -> AgentResult:
        """Belirli bir alarm için savunma dosyası hazırla"""
        start_time = time.time()

        try:
            alarm_data = task.context.get("alarm_data", {})
            risk_data = task.context.get("risk_data", {})
            muhtemel_cezalar = task.context.get("muhtemel_cezalar", {})

            alarm_code = alarm_data.get("rule_id", "")
            alarm_name = alarm_data.get("rule_name", "")
            finding = alarm_data.get("finding_summary", "")
            severity = alarm_data.get("severity", "")
            details = alarm_data.get("details", {})
            legal_refs = alarm_data.get("legal_references", [])
            questions = alarm_data.get("inspector_questions", [])

            prompt = f"""Aşağıdaki KURGAN alarmı için tam savunma dosyası hazırla.

## ALARM BİLGİLERİ
- Kod: {alarm_code}
- İsim: {alarm_name}
- Önem: {severity}
- Tespit: {finding}
- Detaylar: {details}
- Mevzuat: {', '.join(legal_refs)}

## MÜFETTİŞ SORULARI
{chr(10).join(f'{i+1}. {q}' for i, q in enumerate(questions))}

## CEZA RİSKİ
{muhtemel_cezalar if muhtemel_cezalar else 'Henüz hesaplanmadı'}

## İSTENEN SAVUNMA DOSYASI

### 1. Yönetici Özeti
Kısa ve net: ne tespit edildi, savunma güçlü mü?

### 2. Tespitin Değerlendirmesi
5 uzman perspektifinden tespitin analizi

### 3. Her Müfettiş Sorusu İçin Cevap
Her soru için hazır cevap metni

### 4. Destekleyici Belgeler Listesi
Toplanması gereken belgeler ve her birinin neden önemli olduğu

### 5. Mevzuat Analizi
İlgili kanun maddeleri, tebliğler, özelgeler ve Danıştay kararları

### 6. Savunma Sonucu Tahmini
Bu savunma ile beklenen sonuç
"""

            from ..base_provider import TaskType, Complexity

            response = await self.orchestrator.generate(
                prompt=prompt,
                system_prompt=VDK_INSPECTOR_SYSTEM_PROMPT,
                task_type=TaskType.VDK_INSPECTOR,
                complexity=Complexity.HIGH,
            )

            processing_time = int((time.time() - start_time) * 1000)

            return AgentResult(
                task_id=task.task_id,
                agent_name=self.agent_name,
                status=AgentStatus.COMPLETED,
                output={
                    "defense_brief": response.content,
                    "alarm_code": alarm_code,
                    "alarm_name": alarm_name,
                    "severity": severity,
                    "model": response.model,
                    "tokens_used": response.tokens_used,
                    "generated_at": datetime.now().isoformat(),
                },
                tokens_used=response.tokens_used,
                processing_time_ms=processing_time,
            )

        except Exception as e:
            logger.error(f"[VdkInspector] prepare_defense failed: {e}")
            return AgentResult(
                task_id=task.task_id,
                agent_name=self.agent_name,
                status=AgentStatus.FAILED,
                error=str(e),
                processing_time_ms=int((time.time() - start_time) * 1000),
            )

    async def _document_guidance(self, task: AgentTask) -> AgentResult:
        """Belge hazırlama rehberliği"""
        start_time = time.time()

        try:
            alarm_code = task.context.get("alarm_code", "")
            documents_list = task.context.get("documents_list", [])
            risk_data = task.context.get("risk_data", {})

            docs_str = ""
            if documents_list:
                docs_str = "\n".join(
                    f"- {d.get('name', '')} (Öncelik: {d.get('priority', 'medium')})"
                    for d in documents_list
                )

            prompt = f"""Aşağıdaki KURGAN alarmı ({alarm_code}) için hazırlanması gereken belgeler hakkında detaylı rehberlik ver.

## BELGELER
{docs_str if docs_str else 'Belge listesi mevcut değil, genel rehberlik ver.'}

## İSTENEN REHBERLİK
Her belge için:

1. **Belgenin Amacı**: Müfettiş neden bu belgeyi ister?
2. **Nasıl Hazırlanır**: Adım adım hazırlama süreci
3. **İçermesi Gerekenler**: Zorunlu bilgiler ve formatlar
4. **Dikkat Noktaları**: Sıkça yapılan hatalar
5. **Örnek Şablon**: Kısa bir şablon/format önerisi
6. **Mevzuat Dayanağı**: İlgili madde referansı
"""

            from ..base_provider import TaskType, Complexity

            response = await self.orchestrator.generate(
                prompt=prompt,
                system_prompt=VDK_INSPECTOR_SYSTEM_PROMPT,
                task_type=TaskType.VDK_INSPECTOR,
                complexity=Complexity.MEDIUM,
            )

            processing_time = int((time.time() - start_time) * 1000)

            return AgentResult(
                task_id=task.task_id,
                agent_name=self.agent_name,
                status=AgentStatus.COMPLETED,
                output={
                    "guidance": response.content,
                    "alarm_code": alarm_code,
                    "model": response.model,
                    "tokens_used": response.tokens_used,
                    "generated_at": datetime.now().isoformat(),
                },
                tokens_used=response.tokens_used,
                processing_time_ms=processing_time,
            )

        except Exception as e:
            logger.error(f"[VdkInspector] document_guidance failed: {e}")
            return AgentResult(
                task_id=task.task_id,
                agent_name=self.agent_name,
                status=AgentStatus.FAILED,
                error=str(e),
                processing_time_ms=int((time.time() - start_time) * 1000),
            )
