"""
LYNTOS Base Agent Class
=======================

Tüm ajanlar için temel sınıf.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import logging
import uuid

logger = logging.getLogger(__name__)


class AgentStatus(str, Enum):
    """Ajan durumları"""
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    WAITING = "waiting"


class TaskPriority(str, Enum):
    """Görev öncelikleri"""
    CRITICAL = "critical"  # Hemen yapılmalı
    HIGH = "high"          # Öncelikli
    MEDIUM = "medium"      # Normal
    LOW = "low"            # Bekleyebilir


@dataclass
class AgentTask:
    """Ajan görevi"""
    task_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    task_type: str = ""
    description: str = ""
    priority: TaskPriority = TaskPriority.MEDIUM
    context: Dict[str, Any] = field(default_factory=dict)
    parent_task_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentResult:
    """Ajan sonucu"""
    task_id: str
    agent_name: str
    status: AgentStatus
    output: Any = None
    error: Optional[str] = None
    processing_time_ms: int = 0
    tokens_used: int = 0
    sub_results: List["AgentResult"] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def success(self) -> bool:
        return self.status == AgentStatus.COMPLETED and self.error is None


@dataclass
class AgentCapability:
    """Ajan yeteneği tanımı"""
    name: str
    description: str
    task_types: List[str]
    required_context: List[str] = field(default_factory=list)
    optional_context: List[str] = field(default_factory=list)


class BaseAgent(ABC):
    """
    Tüm LYNTOS ajanları için temel sınıf.

    Her ajan:
    1. Kendi görev tiplerini tanımlar
    2. execute() metodunu implement eder
    3. Gerekli context'i validate eder
    4. Sonuç döndürür
    """

    agent_name: str = "BaseAgent"
    agent_description: str = "Temel ajan sınıfı"
    capabilities: List[AgentCapability] = []

    def __init__(self):
        self.status = AgentStatus.IDLE
        self.current_task: Optional[AgentTask] = None
        self.task_history: List[AgentTask] = []
        self.total_tasks = 0
        self.successful_tasks = 0
        self.failed_tasks = 0

        logger.info(f"Agent initialized: {self.agent_name}")

    @abstractmethod
    async def execute(self, task: AgentTask) -> AgentResult:
        """
        Görevi çalıştır.

        Args:
            task: Çalıştırılacak görev

        Returns:
            AgentResult: Görev sonucu
        """
        pass

    def can_handle(self, task_type: str) -> bool:
        """Bu ajan bu görev tipini handle edebilir mi?"""
        for cap in self.capabilities:
            if task_type in cap.task_types:
                return True
        return False

    def get_required_context(self, task_type: str) -> List[str]:
        """Bu görev tipi için gerekli context alanları"""
        for cap in self.capabilities:
            if task_type in cap.task_types:
                return cap.required_context
        return []

    def validate_context(self, task: AgentTask) -> tuple[bool, Optional[str]]:
        """Context'in yeterli olup olmadığını kontrol et"""
        required = self.get_required_context(task.task_type)
        missing = [field for field in required if field not in task.context]

        if missing:
            return False, f"Eksik context alanları: {', '.join(missing)}"
        return True, None

    async def run(self, task: AgentTask) -> AgentResult:
        """
        Görevi çalıştır (wrapper).
        Validasyon, logging ve metrik toplama burada yapılır.
        """
        import time
        start_time = time.time()

        self.status = AgentStatus.RUNNING
        self.current_task = task
        self.total_tasks += 1

        logger.info(f"[{self.agent_name}] Task started: {task.task_id} - {task.task_type}")

        try:
            # Context validasyonu
            is_valid, error_msg = self.validate_context(task)
            if not is_valid:
                self.failed_tasks += 1
                self.status = AgentStatus.FAILED
                return AgentResult(
                    task_id=task.task_id,
                    agent_name=self.agent_name,
                    status=AgentStatus.FAILED,
                    error=error_msg,
                    processing_time_ms=int((time.time() - start_time) * 1000)
                )

            # Asıl çalıştırma
            result = await self.execute(task)

            # Metrikler
            result.processing_time_ms = int((time.time() - start_time) * 1000)

            if result.success:
                self.successful_tasks += 1
                self.status = AgentStatus.COMPLETED
            else:
                self.failed_tasks += 1
                self.status = AgentStatus.FAILED

            logger.info(f"[{self.agent_name}] Task completed: {task.task_id} - "
                       f"Success: {result.success}, Time: {result.processing_time_ms}ms")

            return result

        except Exception as e:
            self.failed_tasks += 1
            self.status = AgentStatus.FAILED
            logger.error(f"[{self.agent_name}] Task failed: {task.task_id} - {str(e)}")

            return AgentResult(
                task_id=task.task_id,
                agent_name=self.agent_name,
                status=AgentStatus.FAILED,
                error=str(e),
                processing_time_ms=int((time.time() - start_time) * 1000)
            )
        finally:
            self.task_history.append(task)
            self.current_task = None

    def get_metrics(self) -> Dict[str, Any]:
        """Ajan metrikleri"""
        return {
            "agent_name": self.agent_name,
            "status": self.status.value,
            "total_tasks": self.total_tasks,
            "successful_tasks": self.successful_tasks,
            "failed_tasks": self.failed_tasks,
            "success_rate": self.successful_tasks / max(1, self.total_tasks),
        }

    def __repr__(self):
        return f"<{self.agent_name} status={self.status.value}>"
