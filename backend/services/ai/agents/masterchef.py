"""
LYNTOS MasterChef Agent
=======================

Tüm ajanların şefi - Orkestra yöneticisi.

Görevler:
- Ajan orkestrasyon
- Görev dağılımı (task routing)
- Kalite kontrol
- Context yönetimi
- Hata yönetimi
- Raporlama

⚠️ KUTSAL KİTAP KURALLARI:
- Hallucination YASAK
- Bilinmeyen AÇIKÇA belirtilmeli
- Hesaplama %100 doğru olmalı
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from .base_agent import (
    BaseAgent, AgentTask, AgentResult, AgentStatus,
    AgentCapability, TaskPriority
)
from ..orchestrator import get_orchestrator, AIOrchestrator

logger = logging.getLogger(__name__)


class TaskCategory(str, Enum):
    """MasterChef görev kategorileri"""
    VDK_ANALYSIS = "vdk_analysis"
    MEVZUAT_TARAMA = "mevzuat_tarama"
    RAPOR_OLUSTURMA = "rapor_olusturma"
    VERGI_HESAPLAMA = "vergi_hesaplama"
    SIRKET_ISLEMLERI = "sirket_islemleri"
    GENEL_SORU = "genel_soru"


@dataclass
class OrchestratedTask:
    """Orkestre edilen görev"""
    original_task: AgentTask
    sub_tasks: List[AgentTask] = field(default_factory=list)
    agent_assignments: Dict[str, str] = field(default_factory=dict)  # task_id -> agent_name
    execution_order: List[str] = field(default_factory=list)  # task_id'ler sıralı
    parallel_groups: List[List[str]] = field(default_factory=list)  # paralel çalışabilenler


class MasterChefAgent(BaseAgent):
    """
    LYNTOS MasterChef Ajanı

    Tüm ajanların orkestratörü. Gelen görevleri analiz eder,
    uygun alt ajanlara dağıtır, sonuçları birleştirir ve
    kalite kontrolü yapar.

    Kullanım:
        chef = MasterChefAgent()

        # Basit görev
        result = await chef.run(AgentTask(
            task_type="vdk_analysis",
            description="VDK risk analizi yap",
            context={"risk_data": {...}}
        ))

        # Kompleks görev
        result = await chef.orchestrate(
            user_request="Bu müvekkil için VDK raporunu hazırla ve mevzuat taraması yap",
            context={"client_id": "...", "period": "2025-Q1"}
        )
    """

    agent_name = "MasterChef"
    agent_description = "Tüm ajanların şefi - Orkestra yöneticisi"

    capabilities = [
        AgentCapability(
            name="Orkestrasyon",
            description="Karmaşık görevleri parçala ve dağıt",
            task_types=["orchestrate", "coordinate"],
            required_context=["user_request"],
        ),
        AgentCapability(
            name="Kalite Kontrol",
            description="Ajan çıktılarını doğrula",
            task_types=["quality_check", "validate"],
            required_context=["agent_output"],
        ),
        AgentCapability(
            name="Görev Analizi",
            description="Kullanıcı isteğini analiz et",
            task_types=["analyze_request", "classify"],
            required_context=["user_request"],
        ),
    ]

    def __init__(self):
        super().__init__()
        self.orchestrator = get_orchestrator()
        self.registered_agents: Dict[str, BaseAgent] = {}
        self.execution_log: List[Dict[str, Any]] = []

        # Alt ajanları kaydet (lazy loading)
        self._agents_loaded = False

    def _load_agents(self):
        """Alt ajanları yükle (lazy loading)"""
        if self._agents_loaded:
            return

        try:
            from .mevzuat_takip import MevzuatTakipAgent
            from .rapor import RaporAgent
            from .vdk_inspector import VdkInspectorAgent

            self.register_agent(MevzuatTakipAgent())
            self.register_agent(RaporAgent())
            self.register_agent(VdkInspectorAgent())
            self._agents_loaded = True
            logger.info(f"MasterChef: {len(self.registered_agents)} agent(s) loaded")
        except ImportError as e:
            logger.warning(f"Could not load some agents: {e}")
            self._agents_loaded = True

    def register_agent(self, agent: BaseAgent):
        """Yeni ajan kaydet"""
        self.registered_agents[agent.agent_name] = agent
        logger.info(f"Agent registered: {agent.agent_name}")

    def get_agent(self, agent_name: str) -> Optional[BaseAgent]:
        """Kayıtlı ajanı getir (case-insensitive fallback)"""
        self._load_agents()
        agent = self.registered_agents.get(agent_name)
        if not agent:
            name_lower = agent_name.lower()
            for key, val in self.registered_agents.items():
                if key.lower() == name_lower:
                    return val
        return agent

    async def execute(self, task: AgentTask) -> AgentResult:
        """Görevi çalıştır"""
        self._load_agents()

        if task.task_type == "orchestrate":
            return await self._orchestrate(task)
        elif task.task_type == "quality_check":
            return await self._quality_check(task)
        elif task.task_type == "analyze_request":
            return await self._analyze_request(task)
        else:
            # Genel görevleri direkt AI'a gönder
            return await self._handle_general_task(task)

    async def orchestrate(
        self,
        user_request: str,
        context: Dict[str, Any] = None,
        priority: TaskPriority = TaskPriority.MEDIUM
    ) -> AgentResult:
        """
        Ana orkestrasyon metodu.

        Kullanıcı isteğini analiz eder, alt görevlere böler,
        uygun ajanlara dağıtır ve sonuçları birleştirir.

        Args:
            user_request: Kullanıcının isteği
            context: Ek bağlam bilgileri
            priority: Görev önceliği

        Returns:
            AgentResult: Birleştirilmiş sonuç
        """
        task = AgentTask(
            task_type="orchestrate",
            description=user_request,
            priority=priority,
            context={
                "user_request": user_request,
                **(context or {})
            }
        )
        return await self.run(task)

    async def _orchestrate(self, task: AgentTask) -> AgentResult:
        """Orkestrasyon mantığı"""
        user_request = task.context.get("user_request", "")

        # 1. İsteği analiz et
        analysis = await self._analyze_user_request(user_request, task.context)

        if not analysis.get("success"):
            return AgentResult(
                task_id=task.task_id,
                agent_name=self.agent_name,
                status=AgentStatus.FAILED,
                error=analysis.get("error", "İstek analiz edilemedi"),
                output=analysis
            )

        # 2. Alt görevleri oluştur
        sub_tasks = self._create_sub_tasks(analysis, task)

        # 3. Alt görevleri çalıştır
        sub_results = await self._execute_sub_tasks(sub_tasks)

        # 4. Sonuçları birleştir
        merged_output = self._merge_results(sub_results, analysis)

        # 5. Kalite kontrolü
        qc_result = await self._run_quality_check(merged_output, task.context)

        # 6. Final sonuç
        return AgentResult(
            task_id=task.task_id,
            agent_name=self.agent_name,
            status=AgentStatus.COMPLETED,
            output={
                "merged_output": merged_output,
                "quality_check": qc_result,
                "analysis": analysis,
                "sub_task_count": len(sub_tasks),
            },
            sub_results=sub_results,
            metadata={
                "orchestration_time": datetime.now().isoformat(),
                "agents_used": list(set(r.agent_name for r in sub_results)),
            }
        )

    async def _analyze_user_request(
        self,
        user_request: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Kullanıcı isteğini AI ile analiz et"""

        prompt = f"""LYNTOS MasterChef - Görev Analizi

KULLANICI İSTEĞİ:
{user_request}

CONTEXT:
{context}

Bu isteği analiz et ve şu bilgileri JSON formatında döndür:

{{
    "success": true,
    "category": "vdk_analysis|mevzuat_tarama|rapor_olusturma|vergi_hesaplama|sirket_islemleri|genel_soru",
    "complexity": "low|medium|high",
    "required_agents": ["agent_name1", "agent_name2"],
    "sub_tasks": [
        {{
            "task_type": "...",
            "description": "...",
            "agent": "agent_name",
            "depends_on": [],
            "parallel_safe": true
        }}
    ],
    "missing_context": ["field1", "field2"],
    "warnings": ["uyarı1", "uyarı2"]
}}

NOT: KUTSAL KİTAP kuralları:
- Emin olmadığın şeyleri "warnings" listesine ekle
- Eksik bilgileri "missing_context"e yaz
- Hallucination YAPMA, bilinmeyeni açıkça belirt
"""

        response = await self.orchestrator.generate_json(
            prompt=prompt,
            schema_description="Görev analizi JSON formatı",
            system_prompt="Sen LYNTOS MasterChef ajanısın. Görevleri analiz et ve alt ajanlara dağıt."
        )

        if response.success:
            import json
            try:
                return json.loads(response.content)
            except json.JSONDecodeError:
                return {
                    "success": False,
                    "error": "JSON parse hatası",
                    "raw_response": response.content
                }
        else:
            return {
                "success": False,
                "error": response.error or "AI yanıt vermedi"
            }

    def _create_sub_tasks(
        self,
        analysis: Dict[str, Any],
        parent_task: AgentTask
    ) -> List[AgentTask]:
        """Analiz sonucundan alt görevler oluştur"""
        sub_tasks = []

        for i, st in enumerate(analysis.get("sub_tasks", [])):
            sub_task = AgentTask(
                task_type=st.get("task_type", "general"),
                description=st.get("description", ""),
                priority=parent_task.priority,
                context={
                    **parent_task.context,
                    "agent": st.get("agent"),
                    "depends_on": st.get("depends_on", []),
                    "parallel_safe": st.get("parallel_safe", True),
                },
                parent_task_id=parent_task.task_id,
                metadata={
                    "order": i,
                    "analysis": analysis,
                }
            )
            sub_tasks.append(sub_task)

        return sub_tasks

    async def _execute_sub_tasks(self, sub_tasks: List[AgentTask]) -> List[AgentResult]:
        """Alt görevleri çalıştır (paralel veya sıralı)"""
        results = []

        # Paralel çalışabilenleri grupla
        parallel_safe = [t for t in sub_tasks if t.context.get("parallel_safe", True)]
        sequential = [t for t in sub_tasks if not t.context.get("parallel_safe", True)]

        # Paralel görevleri çalıştır
        if parallel_safe:
            parallel_results = await asyncio.gather(
                *[self._execute_single_task(task) for task in parallel_safe],
                return_exceptions=True
            )
            for result in parallel_results:
                if isinstance(result, Exception):
                    results.append(AgentResult(
                        task_id="unknown",
                        agent_name=self.agent_name,
                        status=AgentStatus.FAILED,
                        error=str(result)
                    ))
                else:
                    results.append(result)

        # Sıralı görevleri çalıştır
        for task in sequential:
            result = await self._execute_single_task(task)
            results.append(result)

        return results

    async def _execute_single_task(self, task: AgentTask) -> AgentResult:
        """Tek bir görevi çalıştır (case-insensitive agent lookup)"""
        agent_name = task.context.get("agent")

        if agent_name:
            agent = self.registered_agents.get(agent_name)
            if not agent:
                # Case-insensitive fallback
                name_lower = agent_name.lower()
                for key, val in self.registered_agents.items():
                    if key.lower() == name_lower:
                        agent = val
                        break
            if agent:
                return await agent.run(task)

        # Kayıtlı ajan yoksa, AI orchestrator kullan
        return await self._handle_general_task(task)

    async def _handle_general_task(self, task: AgentTask) -> AgentResult:
        """Genel görevleri AI orchestrator ile handle et"""
        response = await self.orchestrator.generate(
            prompt=f"{task.description}\n\nContext: {task.context}",
            system_prompt="Sen LYNTOS yapay zeka asistanısın."
        )

        return AgentResult(
            task_id=task.task_id,
            agent_name=self.agent_name,
            status=AgentStatus.COMPLETED if response.success else AgentStatus.FAILED,
            output=response.content,
            error=response.error,
            tokens_used=response.tokens_used
        )

    def _merge_results(
        self,
        results: List[AgentResult],
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Alt görev sonuçlarını birleştir"""
        merged = {
            "summary": "",
            "details": [],
            "warnings": analysis.get("warnings", []),
            "agents_used": [],
            "total_tokens": 0,
        }

        for result in results:
            merged["agents_used"].append(result.agent_name)
            merged["total_tokens"] += result.tokens_used

            if result.success:
                merged["details"].append({
                    "agent": result.agent_name,
                    "task_id": result.task_id,
                    "output": result.output,
                    "status": "success"
                })
            else:
                merged["details"].append({
                    "agent": result.agent_name,
                    "task_id": result.task_id,
                    "error": result.error,
                    "status": "failed"
                })
                merged["warnings"].append(f"Alt görev başarısız: {result.error}")

        # Özet oluştur
        success_count = sum(1 for r in results if r.success)
        merged["summary"] = f"{success_count}/{len(results)} alt görev başarıyla tamamlandı"

        return merged

    async def _run_quality_check(
        self,
        output: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Kalite kontrolü yap"""

        # Temel kontroller
        checks = {
            "has_output": len(output.get("details", [])) > 0,
            "no_failures": all(d.get("status") == "success" for d in output.get("details", [])),
            "warnings_count": len(output.get("warnings", [])),
        }

        # AI ile içerik kontrolü (opsiyonel)
        if context.get("deep_quality_check"):
            prompt = f"""Kalite Kontrolü:
Output: {output}

Kontrol et:
1. Hallucination var mı?
2. Hesaplama hataları var mı?
3. Eksik bilgi var mı?
4. Mevzuat referansları doğru mu?

JSON formatında yanıtla: {{"passed": true/false, "issues": [...]}}"""

            response = await self.orchestrator.generate_json(
                prompt=prompt,
                schema_description="Kalite kontrol sonucu"
            )

            if response.success:
                import json
                try:
                    ai_check = json.loads(response.content)
                    checks["ai_review"] = ai_check
                except:
                    pass

        checks["overall_passed"] = checks["has_output"] and checks["no_failures"]
        return checks

    async def _quality_check(self, task: AgentTask) -> AgentResult:
        """Kalite kontrolü görevi"""
        output = task.context.get("agent_output", {})
        qc_result = await self._run_quality_check(output, task.context)

        return AgentResult(
            task_id=task.task_id,
            agent_name=self.agent_name,
            status=AgentStatus.COMPLETED,
            output=qc_result
        )

    async def _analyze_request(self, task: AgentTask) -> AgentResult:
        """İstek analizi görevi"""
        user_request = task.context.get("user_request", "")
        analysis = await self._analyze_user_request(user_request, task.context)

        return AgentResult(
            task_id=task.task_id,
            agent_name=self.agent_name,
            status=AgentStatus.COMPLETED if analysis.get("success") else AgentStatus.FAILED,
            output=analysis,
            error=analysis.get("error")
        )

    def get_registered_agents(self) -> List[str]:
        """Kayıtlı ajan listesi"""
        self._load_agents()
        return list(self.registered_agents.keys())

    def get_execution_log(self) -> List[Dict[str, Any]]:
        """Çalıştırma logları"""
        return self.execution_log[-50:]  # Son 50

    def get_metrics(self) -> Dict[str, Any]:
        """MasterChef metrikleri"""
        base_metrics = super().get_metrics()
        base_metrics.update({
            "registered_agents": self.get_registered_agents(),
            "execution_log_size": len(self.execution_log),
        })
        return base_metrics
