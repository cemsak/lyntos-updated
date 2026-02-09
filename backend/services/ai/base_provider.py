"""
LYNTOS AI Provider Base Class
Abstract base class for all AI providers
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
import time
import logging

logger = logging.getLogger(__name__)


class AIProvider(str, Enum):
    """Supported AI providers"""
    CLAUDE = "claude"
    OPENAI_GPT4O = "gpt-4o"
    OPENAI_GPT4O_MINI = "gpt-4o-mini"
    DEMO = "demo"


class TaskType(str, Enum):
    """Task types for routing decisions"""
    # High complexity - requires deep analysis
    LEGAL_ANALYSIS = "legal_analysis"
    RISK_EXPLANATION = "risk_explanation"
    REGULATION_INTERPRETATION = "regulation_interpretation"
    CHAT_CORPORATE = "chat_corporate"
    CHAT_REGWATCH = "chat_regwatch"

    # Structured output
    JSON_GENERATION = "json_generation"
    TABLE_CREATION = "table_creation"
    REPORT_FORMATTING = "report_formatting"
    BRIEF_CREATION = "brief_creation"
    EVIDENCE_BUNDLE = "evidence_bundle"

    # Quick/cheap operations
    CLASSIFICATION = "classification"
    SUMMARIZATION = "summarization"
    QUICK_ANSWER = "quick_answer"
    TRANSLATION = "translation"

    # VDK Inspector - 5 uzman perspektifi
    VDK_INSPECTOR = "vdk_inspector"

    # Default
    GENERAL = "general"


class Complexity(str, Enum):
    """Task complexity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class AIMessage:
    """Standard message format"""
    role: str  # "user", "assistant", "system"
    content: str


@dataclass
class AIResponse:
    """Standard response format"""
    content: str
    provider: AIProvider
    model: str
    tokens_used: int
    processing_time_ms: int
    success: bool
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class AIRequest:
    """Standard request format"""
    messages: List[AIMessage]
    task_type: TaskType = TaskType.GENERAL
    complexity: Complexity = Complexity.MEDIUM
    max_tokens: int = 2000
    temperature: float = 0.7
    system_prompt: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class BaseAIProvider(ABC):
    """Abstract base class for AI providers"""

    provider_name: AIProvider
    model_name: str

    def __init__(self):
        self.total_requests = 0
        self.total_tokens = 0
        self.total_errors = 0
        self.avg_latency_ms = 0

    @abstractmethod
    async def generate(self, request: AIRequest) -> AIResponse:
        """Generate response from AI model"""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is available (API key configured, etc.)"""
        pass

    def _update_metrics(self, response: AIResponse):
        """Update internal metrics"""
        self.total_requests += 1
        self.total_tokens += response.tokens_used
        if not response.success:
            self.total_errors += 1
        # Update rolling average latency
        self.avg_latency_ms = (
            (self.avg_latency_ms * (self.total_requests - 1) + response.processing_time_ms)
            / self.total_requests
        )

    def get_metrics(self) -> Dict[str, Any]:
        """Get provider metrics"""
        return {
            "provider": self.provider_name,
            "model": self.model_name,
            "total_requests": self.total_requests,
            "total_tokens": self.total_tokens,
            "total_errors": self.total_errors,
            "error_rate": self.total_errors / max(1, self.total_requests),
            "avg_latency_ms": self.avg_latency_ms,
        }
