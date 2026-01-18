"""
LYNTOS Claude AI Provider
Anthropic Claude integration
"""

import os
import time
import logging
from typing import Optional

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

from .base_provider import (
    BaseAIProvider, AIProvider, AIRequest, AIResponse, AIMessage
)

logger = logging.getLogger(__name__)


class ClaudeProvider(BaseAIProvider):
    """Anthropic Claude provider"""

    provider_name = AIProvider.CLAUDE
    model_name = "claude-sonnet-4-20250514"

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        super().__init__()
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if model:
            self.model_name = model
        self.client = None

        if self.is_available():
            self.client = anthropic.Anthropic(api_key=self.api_key)
            logger.info(f"Claude provider initialized with model: {self.model_name}")
        else:
            logger.warning("Claude provider not available - API key missing")

    def is_available(self) -> bool:
        """Check if Claude is available"""
        return ANTHROPIC_AVAILABLE and bool(self.api_key)

    async def generate(self, request: AIRequest) -> AIResponse:
        """Generate response using Claude"""
        if not self.is_available():
            return AIResponse(
                content="",
                provider=self.provider_name,
                model=self.model_name,
                tokens_used=0,
                processing_time_ms=0,
                success=False,
                error="Claude provider not available"
            )

        start_time = time.time()

        try:
            # Build messages
            messages = []
            for msg in request.messages:
                if msg.role != "system":  # System prompt handled separately
                    messages.append({
                        "role": msg.role,
                        "content": msg.content
                    })

            # Build system prompt
            system = request.system_prompt or ""

            # Add task-specific context
            if request.task_type:
                system = f"[Task Type: {request.task_type.value}]\n\n{system}"

            # Make API call
            response = self.client.messages.create(
                model=self.model_name,
                max_tokens=request.max_tokens,
                system=system if system else None,
                messages=messages,
            )

            processing_time = int((time.time() - start_time) * 1000)

            # Extract content
            content = ""
            if response.content:
                content = response.content[0].text if hasattr(response.content[0], 'text') else str(response.content[0])

            # Calculate tokens
            tokens_used = (response.usage.input_tokens + response.usage.output_tokens) if response.usage else 0

            result = AIResponse(
                content=content,
                provider=self.provider_name,
                model=self.model_name,
                tokens_used=tokens_used,
                processing_time_ms=processing_time,
                success=True,
                metadata={
                    "stop_reason": response.stop_reason,
                    "input_tokens": response.usage.input_tokens if response.usage else 0,
                    "output_tokens": response.usage.output_tokens if response.usage else 0,
                }
            )

            self._update_metrics(result)
            return result

        except anthropic.APIError as e:
            processing_time = int((time.time() - start_time) * 1000)
            logger.error(f"Claude API error: {e}")

            result = AIResponse(
                content="",
                provider=self.provider_name,
                model=self.model_name,
                tokens_used=0,
                processing_time_ms=processing_time,
                success=False,
                error=str(e)
            )
            self._update_metrics(result)
            return result

        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            logger.error(f"Claude unexpected error: {e}")

            result = AIResponse(
                content="",
                provider=self.provider_name,
                model=self.model_name,
                tokens_used=0,
                processing_time_ms=processing_time,
                success=False,
                error=str(e)
            )
            self._update_metrics(result)
            return result
