"""
LYNTOS OpenAI Provider
OpenAI GPT integration
"""

import os
import time
import logging
from typing import Optional

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

from .base_provider import (
    BaseAIProvider, AIProvider, AIRequest, AIResponse, AIMessage
)

logger = logging.getLogger(__name__)


class OpenAIProvider(BaseAIProvider):
    """OpenAI GPT provider"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-4o",
        provider_name: AIProvider = AIProvider.OPENAI_GPT4O
    ):
        super().__init__()
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model_name = model
        self.provider_name = provider_name
        self.client = None

        if self.is_available():
            self.client = openai.OpenAI(api_key=self.api_key, timeout=30.0)
            logger.info(f"OpenAI provider initialized with model: {self.model_name}")
        else:
            logger.warning("OpenAI provider not available - API key missing")

    def is_available(self) -> bool:
        """Check if OpenAI is available"""
        return OPENAI_AVAILABLE and bool(self.api_key)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((openai.APIConnectionError, openai.RateLimitError, openai.InternalServerError)) if OPENAI_AVAILABLE else retry_if_exception_type(Exception),
        reraise=True,
    )
    def _call_api(self, **kwargs):
        """Retry-wrapped API call"""
        return self.client.chat.completions.create(**kwargs)

    async def generate(self, request: AIRequest) -> AIResponse:
        """Generate response using OpenAI"""
        if not self.is_available():
            return AIResponse(
                content="",
                provider=self.provider_name,
                model=self.model_name,
                tokens_used=0,
                processing_time_ms=0,
                success=False,
                error="OpenAI provider not available"
            )

        start_time = time.time()

        try:
            # Build messages
            messages = []

            # Add system prompt if provided
            if request.system_prompt:
                system_content = request.system_prompt
                if request.task_type:
                    system_content = f"[Task Type: {request.task_type.value}]\n\n{system_content}"
                messages.append({
                    "role": "system",
                    "content": system_content
                })

            # Add conversation messages
            for msg in request.messages:
                if msg.role != "system":
                    messages.append({
                        "role": msg.role,
                        "content": msg.content
                    })

            # Make API call with retry
            response = self._call_api(
                model=self.model_name,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                messages=messages,
            )

            processing_time = int((time.time() - start_time) * 1000)

            # Extract content
            content = response.choices[0].message.content if response.choices else ""

            # Calculate tokens
            tokens_used = response.usage.total_tokens if response.usage else 0

            result = AIResponse(
                content=content or "",
                provider=self.provider_name,
                model=self.model_name,
                tokens_used=tokens_used,
                processing_time_ms=processing_time,
                success=True,
                metadata={
                    "finish_reason": response.choices[0].finish_reason if response.choices else None,
                    "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                    "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                }
            )

            self._update_metrics(result)
            return result

        except openai.APIError as e:
            processing_time = int((time.time() - start_time) * 1000)
            logger.error(f"OpenAI API error: {e}")

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
            logger.error(f"OpenAI unexpected error: {e}")

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


class OpenAIMiniProvider(OpenAIProvider):
    """OpenAI GPT-4o-mini provider (faster, cheaper)"""

    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            api_key=api_key,
            model="gpt-4o-mini",
            provider_name=AIProvider.OPENAI_GPT4O_MINI
        )
