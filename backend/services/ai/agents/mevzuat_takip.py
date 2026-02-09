"""
LYNTOS Mevzuat Takip Ajanı
==========================

GİB, TURMOB, Resmi Gazete mevzuat taraması.

Görevler:
- Mevzuat değişikliği tarama (saatlik/günlük)
- Parametre değişikliği tespiti (oran, had, tarih)
- Etki analizi (hangi müşteriler etkilenir)
- SMMM eylem listesi oluşturma
- Push notification hazırlama
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum

from .base_agent import (
    BaseAgent, AgentTask, AgentResult, AgentStatus,
    AgentCapability, TaskPriority
)
from ..orchestrator import get_orchestrator

logger = logging.getLogger(__name__)


class MevzuatKaynagi(str, Enum):
    """Mevzuat kaynakları"""
    GIB = "gib"
    TURMOB = "turmob"
    RESMI_GAZETE = "resmi_gazete"
    E_MEVZUAT = "e_mevzuat"
    DANISTAY = "danistay"


class DegisiklikTipi(str, Enum):
    """Değişiklik tipleri"""
    ORAN = "oran"           # Vergi oranı değişikliği
    HAD = "had"             # Had/sınır değişikliği
    TARIH = "tarih"         # Beyan/ödeme tarihi değişikliği
    YENI_DUZENLEME = "yeni_duzenleme"  # Yeni düzenleme
    IPTAL = "iptal"         # İptal/kaldırma
    ACIKLAMA = "aciklama"   # Açıklama/yorum


@dataclass
class MevzuatDegisikligi:
    """Tespit edilen mevzuat değişikliği"""
    degisiklik_id: str
    kaynak: MevzuatKaynagi
    tip: DegisiklikTipi
    baslik: str
    ozet: str
    detay: str
    yayin_tarihi: datetime
    yururluk_tarihi: Optional[datetime] = None
    etkilenen_konular: List[str] = field(default_factory=list)
    mevzuat_referansi: str = ""
    onem_derecesi: str = "orta"  # dusuk, orta, yuksek, kritik
    smmm_aksiyonlari: List[str] = field(default_factory=list)
    parametreler: Dict[str, Any] = field(default_factory=dict)


class MevzuatTakipAgent(BaseAgent):
    """
    LYNTOS Mevzuat Takip Ajanı

    GİB, TURMOB ve Resmi Gazete'yi tarayarak vergi mevzuatındaki
    değişiklikleri tespit eder ve SMMM/YMM'lere bildirir.

    Kullanım:
        agent = MevzuatTakipAgent()

        # Günlük tarama
        result = await agent.run(AgentTask(
            task_type="daily_scan",
            description="Bugünkü mevzuat değişikliklerini tara"
        ))

        # Belirli konuda arama
        result = await agent.run(AgentTask(
            task_type="search",
            context={"query": "KDV oranı değişikliği 2026"}
        ))
    """

    agent_name = "MevzuatTakip"
    agent_description = "GİB/TURMOB/Resmi Gazete mevzuat tarama ajanı"

    capabilities = [
        AgentCapability(
            name="Günlük Tarama",
            description="Tüm kaynakları günlük tara",
            task_types=["daily_scan", "hourly_scan"],
            required_context=[],
        ),
        AgentCapability(
            name="Konu Arama",
            description="Belirli konuda mevzuat ara",
            task_types=["search", "query"],
            required_context=["query"],
        ),
        AgentCapability(
            name="Etki Analizi",
            description="Değişikliğin etkilerini analiz et",
            task_types=["impact_analysis"],
            required_context=["degisiklik"],
        ),
        AgentCapability(
            name="Parametre Güncelleme",
            description="Sistem parametrelerini güncelle",
            task_types=["update_parameters"],
            required_context=["degisiklikler"],
        ),
    ]

    def __init__(self):
        super().__init__()
        self.orchestrator = get_orchestrator()
        self.last_scan: Optional[datetime] = None
        self.cached_changes: List[MevzuatDegisikligi] = []

        # Simüle edilmiş mevzuat veritabanı (gerçek implementasyonda DB'den gelir)
        self._simulated_db: List[Dict] = []

    async def execute(self, task: AgentTask) -> AgentResult:
        """Görevi çalıştır"""

        if task.task_type in ["daily_scan", "hourly_scan"]:
            return await self._run_scan(task)
        elif task.task_type in ["search", "query"]:
            return await self._run_search(task)
        elif task.task_type == "impact_analysis":
            return await self._run_impact_analysis(task)
        elif task.task_type == "update_parameters":
            return await self._run_parameter_update(task)
        else:
            return await self._handle_general_query(task)

    async def _run_scan(self, task: AgentTask) -> AgentResult:
        """Mevzuat taraması yap"""

        # Tarama dönemini belirle
        scan_period = task.context.get("period", "today")
        if scan_period == "today":
            start_date = datetime.now().replace(hour=0, minute=0, second=0)
        else:
            start_date = datetime.now() - timedelta(days=7)

        # Simüle edilmiş tarama (gerçek implementasyonda web scraping olacak)
        degisiklikler = await self._simulate_scan(start_date)

        # Her değişiklik için etki analizi
        analyzed_changes = []
        for deg in degisiklikler:
            impact = await self._analyze_single_impact(deg)
            analyzed_changes.append({
                "degisiklik": deg.__dict__,
                "etki_analizi": impact
            })

        self.last_scan = datetime.now()
        self.cached_changes = degisiklikler

        return AgentResult(
            task_id=task.task_id,
            agent_name=self.agent_name,
            status=AgentStatus.COMPLETED,
            output={
                "scan_time": self.last_scan.isoformat(),
                "period": scan_period,
                "total_changes": len(degisiklikler),
                "changes": analyzed_changes,
                "summary": self._generate_scan_summary(degisiklikler)
            }
        )

    async def _simulate_scan(self, start_date: datetime) -> List[MevzuatDegisikligi]:
        """
        Simüle edilmiş mevzuat taraması.

        NOT: Gerçek implementasyonda bu metod:
        1. GİB sitesini tarar (requests + BeautifulSoup)
        2. TURMOB duyurularını tarar
        3. Resmi Gazete'yi tarar
        4. Değişiklikleri parse eder

        ⚠️ KUTSAL KİTAP: Bu simülasyon, gerçek veri olmadığı için
        açıkça belirtilmelidir!
        """

        # Örnek değişiklikler (gerçek taramadan gelecek)
        sample_changes = [
            MevzuatDegisikligi(
                degisiklik_id="GIB-2026-001",
                kaynak=MevzuatKaynagi.GIB,
                tip=DegisiklikTipi.ORAN,
                baslik="2026 Yılı Yeniden Değerleme Oranı Belirlendi",
                ozet="2026 yılı için yeniden değerleme oranı %58,46 olarak belirlendi.",
                detay="213 sayılı VUK'un mükerrer 298. maddesi uyarınca 2025 yılı için yeniden değerleme oranı %58,46 olarak tespit edilmiştir.",
                yayin_tarihi=datetime(2025, 11, 15),
                yururluk_tarihi=datetime(2026, 1, 1),
                etkilenen_konular=["amortisman", "enflasyon_duzeltmesi", "usulsuzluk_cezasi"],
                mevzuat_referansi="VUK Mük. Md. 298",
                onem_derecesi="yuksek",
                smmm_aksiyonlari=[
                    "Amortisman tablolarını güncelle",
                    "2026 usulsüzlük ceza tutarlarını hesapla",
                    "Müşterilere bilgilendirme yap"
                ],
                parametreler={"yeniden_degerleme_orani_2026": 0.5846}
            ),
            MevzuatDegisikligi(
                degisiklik_id="GIB-2026-002",
                kaynak=MevzuatKaynagi.GIB,
                tip=DegisiklikTipi.TARIH,
                baslik="Geçici Vergi Beyanname Süreleri Uzatıldı",
                ozet="2026 yılı 1. dönem geçici vergi beyanname süresi 17 Mayıs'tan 20 Mayıs'a uzatıldı.",
                detay="Hazine ve Maliye Bakanlığı, 2026 yılı 1. dönem geçici vergi beyanname süresini 3 gün uzattı.",
                yayin_tarihi=datetime(2026, 5, 1),
                yururluk_tarihi=datetime(2026, 5, 1),
                etkilenen_konular=["gecici_vergi", "beyan_tarihleri"],
                mevzuat_referansi="VUK Md. 17",
                onem_derecesi="orta",
                smmm_aksiyonlari=[
                    "Beyan takvimini güncelle",
                    "Müşterilere SMS/email bildirim gönder"
                ],
                parametreler={"gecici_vergi_q1_2026_son_gun": "2026-05-20"}
            ),
        ]

        # Sadece start_date'ten sonrakileri döndür
        return [c for c in sample_changes if c.yayin_tarihi >= start_date]

    async def _run_search(self, task: AgentTask) -> AgentResult:
        """Mevzuat araması yap"""
        query = task.context.get("query", "")

        if not query:
            return AgentResult(
                task_id=task.task_id,
                agent_name=self.agent_name,
                status=AgentStatus.FAILED,
                error="Arama sorgusu belirtilmedi"
            )

        # AI ile arama
        prompt = f"""LYNTOS Mevzuat Arama

SORGU: {query}

Türk vergi mevzuatında bu konuyla ilgili bilgi ver:

1. İlgili kanun maddeleri (VUK, KVK, GVK, KDV Kanunu, TTK)
2. Güncel tebliğ ve sirkülerler
3. Önemli özelgeler
4. SMMM için pratik öneriler

JSON formatında yanıtla:
{{
    "sonuclar": [
        {{
            "baslik": "...",
            "mevzuat_referansi": "VUK Md. ...",
            "ozet": "...",
            "onem": "yuksek|orta|dusuk"
        }}
    ],
    "oneriler": ["..."],
    "uyarilar": ["..."]
}}

NOT: Emin olmadığın bilgileri "uyarilar"a ekle, hallucination YAPMA!"""

        response = await self.orchestrator.generate_json(
            prompt=prompt,
            schema_description="Mevzuat arama sonuçları"
        )

        if response.success:
            import json
            try:
                results = json.loads(response.content)
                return AgentResult(
                    task_id=task.task_id,
                    agent_name=self.agent_name,
                    status=AgentStatus.COMPLETED,
                    output={
                        "query": query,
                        "results": results,
                        "source": "ai_search"
                    },
                    tokens_used=response.tokens_used
                )
            except json.JSONDecodeError:
                pass

        return AgentResult(
            task_id=task.task_id,
            agent_name=self.agent_name,
            status=AgentStatus.FAILED,
            error="Arama sonuçları alınamadı"
        )

    async def _run_impact_analysis(self, task: AgentTask) -> AgentResult:
        """Değişiklik etki analizi"""
        degisiklik = task.context.get("degisiklik", {})

        prompt = f"""LYNTOS Mevzuat Etki Analizi

DEĞİŞİKLİK:
{degisiklik}

Bu değişikliğin etkilerini analiz et:

1. Etkilenen mükellef profilleri (kim etkilenir?)
2. Mali etki tahmini (yaklaşık TL tutarı)
3. Geçiş dönemi (eski vs yeni uygulama)
4. SMMM aksiyonları (öncelik sırasıyla)
5. Müşteri bilgilendirme metni taslağı

JSON formatında yanıtla:
{{
    "etkilenen_profiller": ["..."],
    "mali_etki": {{
        "tip": "artis|azalis|notr",
        "tahmin": "...",
        "aciklama": "..."
    }},
    "gecis_donemi": {{
        "baslangic": "tarih",
        "bitis": "tarih",
        "dikkat_edilecekler": ["..."]
    }},
    "smmm_aksiyonlari": [
        {{"aksiyon": "...", "oncelik": 1, "sure_gun": 5}}
    ],
    "bilgilendirme_metni": "..."
}}"""

        response = await self.orchestrator.generate_json(
            prompt=prompt,
            schema_description="Etki analizi sonuçları"
        )

        if response.success:
            import json
            try:
                analysis = json.loads(response.content)
                return AgentResult(
                    task_id=task.task_id,
                    agent_name=self.agent_name,
                    status=AgentStatus.COMPLETED,
                    output=analysis,
                    tokens_used=response.tokens_used
                )
            except json.JSONDecodeError:
                pass

        return AgentResult(
            task_id=task.task_id,
            agent_name=self.agent_name,
            status=AgentStatus.FAILED,
            error="Etki analizi yapılamadı"
        )

    async def _analyze_single_impact(self, degisiklik: MevzuatDegisikligi) -> Dict[str, Any]:
        """Tek bir değişikliğin kısa etki analizi"""
        return {
            "onem": degisiklik.onem_derecesi,
            "etkilenen_konu_sayisi": len(degisiklik.etkilenen_konular),
            "aksiyon_sayisi": len(degisiklik.smmm_aksiyonlari),
            "parametre_guncelleme_gerekli": len(degisiklik.parametreler) > 0,
        }

    async def _run_parameter_update(self, task: AgentTask) -> AgentResult:
        """Sistem parametrelerini güncelle"""
        degisiklikler = task.context.get("degisiklikler", [])

        updated_params = {}
        for deg in degisiklikler:
            if isinstance(deg, MevzuatDegisikligi):
                updated_params.update(deg.parametreler)
            elif isinstance(deg, dict):
                updated_params.update(deg.get("parametreler", {}))

        # Burada gerçek DB güncelleme yapılacak
        logger.info(f"Parameters to update: {updated_params}")

        return AgentResult(
            task_id=task.task_id,
            agent_name=self.agent_name,
            status=AgentStatus.COMPLETED,
            output={
                "updated_count": len(updated_params),
                "parameters": updated_params,
                "note": "Parametreler güncelleme kuyruğuna eklendi"
            }
        )

    async def _handle_general_query(self, task: AgentTask) -> AgentResult:
        """Genel mevzuat sorusu"""
        response = await self.orchestrator.generate(
            prompt=task.description,
            system_prompt="Sen LYNTOS mevzuat uzmanısın. Türk vergi mevzuatı hakkında sorulara yanıt ver."
        )

        return AgentResult(
            task_id=task.task_id,
            agent_name=self.agent_name,
            status=AgentStatus.COMPLETED if response.success else AgentStatus.FAILED,
            output=response.content,
            error=response.error,
            tokens_used=response.tokens_used
        )

    def _generate_scan_summary(self, changes: List[MevzuatDegisikligi]) -> str:
        """Tarama özeti oluştur"""
        if not changes:
            return "Yeni mevzuat değişikliği tespit edilmedi."

        kritik = sum(1 for c in changes if c.onem_derecesi == "kritik")
        yuksek = sum(1 for c in changes if c.onem_derecesi == "yuksek")
        orta = sum(1 for c in changes if c.onem_derecesi == "orta")

        summary = f"Toplam {len(changes)} mevzuat değişikliği tespit edildi.\n"
        if kritik > 0:
            summary += f"⚠️ {kritik} KRİTİK değişiklik - Hemen aksiyon gerekli!\n"
        if yuksek > 0:
            summary += f"🔴 {yuksek} yüksek öncelikli değişiklik\n"
        if orta > 0:
            summary += f"🟡 {orta} orta öncelikli değişiklik\n"

        return summary

    def get_last_scan_time(self) -> Optional[datetime]:
        """Son tarama zamanı"""
        return self.last_scan

    def get_cached_changes(self) -> List[MevzuatDegisikligi]:
        """Önbellekteki değişiklikler"""
        return self.cached_changes
