"""
LYNTOS Demo AI Provider
Fallback provider when no API keys are available
"""

import time
import logging
from typing import Dict

from .base_provider import (
    BaseAIProvider, AIProvider, AIRequest, AIResponse, TaskType
)

logger = logging.getLogger(__name__)


# Pre-defined demo responses by task type
DEMO_RESPONSES: Dict[TaskType, str] = {
    TaskType.CHAT_CORPORATE: """
Sirketler hukuku konusunda size yardimci olabilirim.

**Onemli Notlar:**
- Bu bir demo yanittir
- Gercek AI entegrasyonu icin ANTHROPIC_API_KEY veya OPENAI_API_KEY gereklidir
- Lutfen sistem yoneticinizle iletisime gecin

Genel sirketler hukuku konulari:
1. Sirket kurulusu (A.S., Ltd. Sti.)
2. Sermaye artirimi/azaltimi
3. TTK 376 - Sermaye kaybi
4. Birlesme ve bolunme
5. Tasfiye islemleri
""",
    TaskType.CHAT_REGWATCH: """
Mevzuat takibi konusunda size yardimci olabilirim.

**Demo Modu Aktif**
Gercek mevzuat analizi icin AI API anahtari gereklidir.

Takip edilen baslica mevzuat kaynaklari:
1. Resmi Gazete
2. GIB Duyurulari
3. SPK Bultenleri
4. BDDK Duzenlemeleri
""",
    TaskType.LEGAL_ANALYSIS: """
**Hukuki Analiz - Demo Yanit**

Bu bir demo yanittir. Gercek hukuki analiz icin:
- ANTHROPIC_API_KEY veya
- OPENAI_API_KEY
yapilandirilmalidir.

Analiz edilecek konular icin lutfen AI API'yi aktif edin.
""",
    TaskType.RISK_EXPLANATION: """
**Risk Aciklamasi - Demo Yanit**

Risk analizi icin AI entegrasyonu gereklidir.

Demo modda risk aciklamasi yapilamaz.
Lutfen API anahtarlarini yapilandirin.
""",
    TaskType.SUMMARIZATION: """
**Ozet - Demo Yanit**

Bu bir demo ozetidir. Gercek icerik ozetleme icin AI API gereklidir.
""",
    TaskType.GENERAL: """
**LYNTOS AI Asistan - Demo Modu**

Merhaba! Ben LYNTOS AI asistaniyim.

Su anda demo modunda calisiyorum. Tam islevsellik icin:
1. ANTHROPIC_API_KEY veya
2. OPENAI_API_KEY
ortam degiskenlerinden birini yapilandirin.

Desteklenen ozellikler:
- Sirketler hukuku danismanligi
- Mevzuat takibi ve analizi
- Vergi risk degerlendirmesi
- Belge analizi
""",
}


class DemoProvider(BaseAIProvider):
    """Demo/fallback provider"""

    provider_name = AIProvider.DEMO
    model_name = "demo-v1"

    def __init__(self):
        super().__init__()
        logger.info("Demo provider initialized - no AI API keys configured")

    def is_available(self) -> bool:
        """Demo provider is always available"""
        return True

    async def generate(self, request: AIRequest) -> AIResponse:
        """Generate demo response"""
        start_time = time.time()

        # Get demo response for task type
        task_type = request.task_type or TaskType.GENERAL
        content = DEMO_RESPONSES.get(task_type, DEMO_RESPONSES[TaskType.GENERAL])

        # Simulate some processing time
        time.sleep(0.1)

        processing_time = int((time.time() - start_time) * 1000)

        result = AIResponse(
            content=content,
            provider=self.provider_name,
            model=self.model_name,
            tokens_used=0,
            processing_time_ms=processing_time,
            success=True,
            metadata={
                "demo_mode": True,
                "task_type": task_type.value,
            }
        )

        self._update_metrics(result)
        return result
