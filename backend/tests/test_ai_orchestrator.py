"""
LYNTOS AI Orchestrator Tests
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.ai import (
    AIProvider, TaskType, Complexity, AIMessage, AIRequest, AIResponse,
    get_orchestrator
)
from services.ai.router import AIRouter, ROUTING_RULES
from services.ai.demo_provider import DemoProvider


class TestAIRouter:
    """Tests for AI Router"""

    def test_routing_rules_exist(self):
        """Should have routing rules defined"""
        assert len(ROUTING_RULES) > 0

    def test_legal_analysis_routes_to_claude(self):
        """Legal analysis should prefer Claude"""
        router = AIRouter()
        provider = router.get_preferred_provider(TaskType.LEGAL_ANALYSIS, Complexity.HIGH)
        assert provider == AIProvider.CLAUDE

    def test_json_generation_routes_to_gpt4o(self):
        """JSON generation should prefer GPT-4o"""
        router = AIRouter()
        provider = router.get_preferred_provider(TaskType.JSON_GENERATION, Complexity.MEDIUM)
        assert provider == AIProvider.OPENAI_GPT4O

    def test_classification_routes_to_mini(self):
        """Classification should prefer GPT-4o-mini"""
        router = AIRouter()
        provider = router.get_preferred_provider(TaskType.CLASSIFICATION, Complexity.LOW)
        assert provider == AIProvider.OPENAI_GPT4O_MINI

    def test_fallback_chain_starts_with_preferred(self):
        """Fallback chain should start with preferred provider"""
        router = AIRouter()
        chain = router.get_fallback_chain(AIProvider.OPENAI_GPT4O)
        assert chain[0] == AIProvider.OPENAI_GPT4O

    def test_fallback_chain_ends_with_demo(self):
        """Fallback chain should end with demo"""
        router = AIRouter()
        chain = router.get_fallback_chain(AIProvider.CLAUDE)
        assert chain[-1] == AIProvider.DEMO


class TestDemoProvider:
    """Tests for Demo Provider"""

    @pytest.mark.asyncio
    async def test_demo_provider_always_available(self):
        """Demo provider should always be available"""
        provider = DemoProvider()
        assert provider.is_available() == True

    @pytest.mark.asyncio
    async def test_demo_provider_returns_response(self):
        """Demo provider should return a valid response"""
        provider = DemoProvider()
        request = AIRequest(
            messages=[AIMessage(role="user", content="Test")],
            task_type=TaskType.GENERAL,
        )
        response = await provider.generate(request)

        assert response.success == True
        assert response.provider == AIProvider.DEMO
        assert len(response.content) > 0

    @pytest.mark.asyncio
    async def test_demo_provider_returns_task_specific_response(self):
        """Demo provider should return task-specific responses"""
        provider = DemoProvider()

        # Test corporate chat
        request = AIRequest(
            messages=[AIMessage(role="user", content="Test")],
            task_type=TaskType.CHAT_CORPORATE,
        )
        response = await provider.generate(request)

        assert "Sirketler hukuku" in response.content or "demo" in response.content.lower()


class TestAIResponse:
    """Tests for AI Response data class"""

    def test_response_success(self):
        """Should create successful response"""
        response = AIResponse(
            content="Test content",
            provider=AIProvider.CLAUDE,
            model="claude-sonnet-4",
            tokens_used=100,
            processing_time_ms=500,
            success=True,
        )

        assert response.success == True
        assert response.error is None
        assert response.tokens_used == 100

    def test_response_error(self):
        """Should create error response"""
        response = AIResponse(
            content="",
            provider=AIProvider.CLAUDE,
            model="claude-sonnet-4",
            tokens_used=0,
            processing_time_ms=100,
            success=False,
            error="API Error",
        )

        assert response.success == False
        assert response.error == "API Error"


class TestTaskTypeRouting:
    """Tests for task type to provider routing"""

    @pytest.mark.parametrize("task_type,expected_provider", [
        (TaskType.CHAT_CORPORATE, AIProvider.CLAUDE),
        (TaskType.CHAT_REGWATCH, AIProvider.CLAUDE),
        (TaskType.LEGAL_ANALYSIS, AIProvider.CLAUDE),
        (TaskType.JSON_GENERATION, AIProvider.OPENAI_GPT4O),
        (TaskType.BRIEF_CREATION, AIProvider.OPENAI_GPT4O),
        (TaskType.CLASSIFICATION, AIProvider.OPENAI_GPT4O_MINI),
        (TaskType.QUICK_ANSWER, AIProvider.OPENAI_GPT4O_MINI),
    ])
    def test_task_routing(self, task_type, expected_provider):
        """Test that tasks route to correct providers"""
        router = AIRouter()
        provider = router.get_preferred_provider(task_type)
        assert provider == expected_provider
