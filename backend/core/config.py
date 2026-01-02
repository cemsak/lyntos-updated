"""
LYNTOS AI Provider Configuration
Based on TDD v1.0 - AI Strategy Section
"""

import os
from typing import Literal, Optional
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()


class AIConfig:
    """
    AI provider configuration based on use case.

    Principles:
    - Expert analysis: NO AI (rule-based only)
    - AI insights: Claude Sonnet (primary) for legal reasoning
    - RAG embeddings: OpenAI (fast + cost-effective)
    - Summarization: GPT-4o mini (simple tasks)
    """

    # ═══════════════════════════════════════════════════════════
    # EXPERT ANALYSIS: NO AI (Deterministic Rule Engine)
    # ═══════════════════════════════════════════════════════════
    EXPERT_ANALYSIS_PROVIDER: None = None

    # ═══════════════════════════════════════════════════════════
    # AI INSIGHTS: Claude Sonnet (Primary)
    # ═══════════════════════════════════════════════════════════
    AI_INSIGHTS_PROVIDER: Literal["anthropic", "openai"] = "anthropic"
    AI_INSIGHTS_MODEL: str = "claude-sonnet-4-20250514"
    AI_INSIGHTS_MAX_TOKENS: int = 4096

    # Fallback to OpenAI if Anthropic fails
    AI_INSIGHTS_FALLBACK_PROVIDER: Literal["openai"] = "openai"
    AI_INSIGHTS_FALLBACK_MODEL: str = "gpt-4o"

    # ═══════════════════════════════════════════════════════════
    # RAG EMBEDDINGS: OpenAI (Fast + Cost-Effective)
    # ═══════════════════════════════════════════════════════════
    EMBEDDINGS_PROVIDER: Literal["openai"] = "openai"
    EMBEDDINGS_MODEL: str = "text-embedding-3-large"
    EMBEDDINGS_DIMENSIONS: int = 1536

    # ═══════════════════════════════════════════════════════════
    # SUMMARIZATION: GPT-4o Mini (Simple Tasks)
    # ═══════════════════════════════════════════════════════════
    SUMMARY_PROVIDER: Literal["openai"] = "openai"
    SUMMARY_MODEL: str = "gpt-4o-mini"
    SUMMARY_MAX_TOKENS: int = 1024

    # ═══════════════════════════════════════════════════════════
    # API KEYS (from .env)
    # ═══════════════════════════════════════════════════════════
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")

    @classmethod
    def validate(cls) -> dict:
        """
        Validate that required API keys are present.

        Returns:
            dict: Validation status for each provider
        """
        validation = {
            "expert_analysis": True,  # No API needed
            "ai_insights": False,
            "embeddings": False,
            "summary": False,
            "errors": []
        }

        # Check AI insights provider
        if cls.AI_INSIGHTS_PROVIDER == "anthropic":
            if cls.ANTHROPIC_API_KEY:
                validation["ai_insights"] = True
            else:
                validation["errors"].append(
                    "ANTHROPIC_API_KEY not set (required for AI insights)"
                )

        # Check OpenAI key (needed for fallback, embeddings, summary)
        if cls.OPENAI_API_KEY:
            validation["embeddings"] = True
            validation["summary"] = True
        else:
            validation["errors"].append(
                "OPENAI_API_KEY not set (required for embeddings, summary, fallback)"
            )

        return validation

    @classmethod
    def get_provider_info(cls) -> dict:
        """Get current provider configuration."""
        return {
            "expert_analysis": "Rule-based (no AI)",
            "ai_insights": {
                "primary": f"{cls.AI_INSIGHTS_PROVIDER}/{cls.AI_INSIGHTS_MODEL}",
                "fallback": f"{cls.AI_INSIGHTS_FALLBACK_PROVIDER}/{cls.AI_INSIGHTS_FALLBACK_MODEL}"
            },
            "embeddings": f"{cls.EMBEDDINGS_PROVIDER}/{cls.EMBEDDINGS_MODEL}",
            "summary": f"{cls.SUMMARY_PROVIDER}/{cls.SUMMARY_MODEL}"
        }


# Startup validation
if __name__ == "__main__":
    print("LYNTOS AI Configuration")
    print("=" * 50)

    # Show config
    info = AIConfig.get_provider_info()
    print("\nProvider Configuration:")
    for key, value in info.items():
        print(f"  {key}: {value}")

    # Validate
    validation = AIConfig.validate()
    print("\nValidation Status:")
    for key, status in validation.items():
        if key != "errors":
            status_icon = "✓" if status else "✗"
            print(f"  {status_icon} {key}: {status}")

    if validation["errors"]:
        print("\nErrors:")
        for error in validation["errors"]:
            print(f"  ✗ {error}")
    else:
        print("\n✓ All validations passed!")
