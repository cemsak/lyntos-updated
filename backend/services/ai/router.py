"""
LYNTOS AI Router
Intelligent routing of tasks to appropriate AI providers
"""

import logging
from typing import Dict, List, Optional, Tuple

from .base_provider import (
    BaseAIProvider, AIProvider, TaskType, Complexity, AIRequest, AIResponse
)
from .claude_provider import ClaudeProvider
from .openai_provider import OpenAIProvider, OpenAIMiniProvider
from .demo_provider import DemoProvider

logger = logging.getLogger(__name__)


# Routing rules: (task_type, complexity) -> preferred provider
ROUTING_RULES: Dict[Tuple[TaskType, Optional[Complexity]], AIProvider] = {
    # High complexity, deep analysis -> Claude
    (TaskType.LEGAL_ANALYSIS, Complexity.HIGH): AIProvider.CLAUDE,
    (TaskType.LEGAL_ANALYSIS, Complexity.MEDIUM): AIProvider.CLAUDE,
    (TaskType.RISK_EXPLANATION, Complexity.HIGH): AIProvider.CLAUDE,
    (TaskType.RISK_EXPLANATION, Complexity.MEDIUM): AIProvider.CLAUDE,
    (TaskType.REGULATION_INTERPRETATION, None): AIProvider.CLAUDE,
    (TaskType.CHAT_CORPORATE, None): AIProvider.CLAUDE,
    (TaskType.CHAT_REGWATCH, None): AIProvider.CLAUDE,

    # Structured output -> GPT-4o
    (TaskType.JSON_GENERATION, None): AIProvider.OPENAI_GPT4O,
    (TaskType.TABLE_CREATION, None): AIProvider.OPENAI_GPT4O,
    (TaskType.REPORT_FORMATTING, None): AIProvider.OPENAI_GPT4O,
    (TaskType.BRIEF_CREATION, None): AIProvider.OPENAI_GPT4O,
    (TaskType.EVIDENCE_BUNDLE, None): AIProvider.OPENAI_GPT4O,

    # Quick/cheap operations -> GPT-4o-mini
    (TaskType.CLASSIFICATION, None): AIProvider.OPENAI_GPT4O_MINI,
    (TaskType.SUMMARIZATION, Complexity.LOW): AIProvider.OPENAI_GPT4O_MINI,
    (TaskType.QUICK_ANSWER, None): AIProvider.OPENAI_GPT4O_MINI,
    (TaskType.TRANSLATION, None): AIProvider.OPENAI_GPT4O_MINI,

    # Medium complexity summarization -> GPT-4o
    (TaskType.SUMMARIZATION, Complexity.MEDIUM): AIProvider.OPENAI_GPT4O,
    (TaskType.SUMMARIZATION, Complexity.HIGH): AIProvider.CLAUDE,

    # Default -> Claude
    (TaskType.GENERAL, None): AIProvider.CLAUDE,
}


class AIRouter:
    """
    Intelligent AI router that:
    1. Routes tasks to the most appropriate provider
    2. Implements fallback chain on failures
    3. Tracks usage and performance metrics
    """

    # Fallback chain order
    FALLBACK_CHAIN: List[AIProvider] = [
        AIProvider.CLAUDE,
        AIProvider.OPENAI_GPT4O,
        AIProvider.OPENAI_GPT4O_MINI,
        AIProvider.DEMO,
    ]

    def __init__(self):
        # Initialize all providers
        self.providers: Dict[AIProvider, BaseAIProvider] = {
            AIProvider.CLAUDE: ClaudeProvider(),
            AIProvider.OPENAI_GPT4O: OpenAIProvider(),
            AIProvider.OPENAI_GPT4O_MINI: OpenAIMiniProvider(),
            AIProvider.DEMO: DemoProvider(),
        }

        # Track which providers are available
        self.available_providers = [
            provider for provider, instance in self.providers.items()
            if instance.is_available()
        ]

        logger.info(f"AI Router initialized. Available providers: {self.available_providers}")

    def get_preferred_provider(
        self,
        task_type: TaskType,
        complexity: Complexity = Complexity.MEDIUM
    ) -> AIProvider:
        """Determine the preferred provider for a task"""

        # Try exact match first
        key = (task_type, complexity)
        if key in ROUTING_RULES:
            return ROUTING_RULES[key]

        # Try without complexity
        key = (task_type, None)
        if key in ROUTING_RULES:
            return ROUTING_RULES[key]

        # Default to Claude
        return AIProvider.CLAUDE

    def get_fallback_chain(self, preferred: AIProvider) -> List[AIProvider]:
        """Get fallback chain starting from preferred provider"""

        # Start with preferred, then follow standard chain
        chain = [preferred]

        for provider in self.FALLBACK_CHAIN:
            if provider not in chain:
                chain.append(provider)

        return chain

    async def route(self, request: AIRequest) -> AIResponse:
        """
        Route request to appropriate provider with fallback handling
        """

        # Determine preferred provider
        preferred = self.get_preferred_provider(request.task_type, request.complexity)

        # Get fallback chain
        chain = self.get_fallback_chain(preferred)

        logger.info(f"Routing task '{request.task_type.value}' (complexity: {request.complexity.value})")
        logger.info(f"Preferred: {preferred.value}, Chain: {[p.value for p in chain]}")

        # Try each provider in chain
        last_error = None

        for provider_name in chain:
            provider = self.providers.get(provider_name)

            if not provider:
                continue

            if not provider.is_available():
                logger.debug(f"Provider {provider_name.value} not available, skipping")
                continue

            logger.info(f"Trying provider: {provider_name.value}")

            response = await provider.generate(request)

            if response.success:
                logger.info(f"Success with {provider_name.value} in {response.processing_time_ms}ms")
                return response
            else:
                last_error = response.error
                logger.warning(f"Provider {provider_name.value} failed: {last_error}")

        # All providers failed, return error response
        logger.error(f"All providers failed. Last error: {last_error}")

        return AIResponse(
            content="Uzgunum, su anda AI servisi kullanilamiyor. Lutfen daha sonra tekrar deneyin.",
            provider=AIProvider.DEMO,
            model="error",
            tokens_used=0,
            processing_time_ms=0,
            success=False,
            error=f"All providers failed. Last error: {last_error}"
        )

    def get_all_metrics(self) -> Dict[str, Dict]:
        """Get metrics from all providers"""
        return {
            provider.value: instance.get_metrics()
            for provider, instance in self.providers.items()
        }

    def get_available_providers(self) -> List[str]:
        """Get list of available provider names"""
        return [p.value for p in self.available_providers]
