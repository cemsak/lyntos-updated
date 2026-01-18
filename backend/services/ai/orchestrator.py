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


# Singleton instance
_orchestrator: Optional[AIOrchestrator] = None


def get_orchestrator() -> AIOrchestrator:
    """Get the singleton orchestrator instance"""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = AIOrchestrator()
    return _orchestrator
