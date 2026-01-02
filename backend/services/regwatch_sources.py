"""
LYNTOS RegWatch - Official Source Registry
Only Tier 1 sources allowed for RegWatch monitoring

Based on TDD v1.0 - Section 6-A (Data Source Reliability)
"""

from typing import Dict, Literal, Optional
from datetime import datetime
from dataclasses import dataclass


@dataclass
class OfficialSource:
    """
    Resmi kaynak tanımı.

    Attributes:
        name: Kaynak adı (Türkçe)
        url: Ana URL
        method: Veri çekme yöntemi
        update_frequency: Güncelleme sıklığı
        trust_score: Güvenilirlik puanı (0.0-1.0)
        verification: Doğrulama yöntemi
        enabled: Aktif mi?
        last_check: Son kontrol zamanı
    """

    name: str
    url: str
    method: Literal["rss", "api", "scraping"]
    update_frequency: Literal["hourly", "daily", "weekly", "monthly"]
    trust_score: float
    verification: str
    enabled: bool = True
    last_check: Optional[datetime] = None

    def __post_init__(self):
        """Validate trust score."""
        if not 0.0 <= self.trust_score <= 1.0:
            raise ValueError(f"Trust score must be 0.0-1.0, got {self.trust_score}")


# ═══════════════════════════════════════════════════════════
# TIER 1 SOURCES (Trust Score: 1.0)
# Only these sources are allowed for RegWatch
# ═══════════════════════════════════════════════════════════

OFFICIAL_SOURCES: Dict[str, OfficialSource] = {

    "resmi_gazete": OfficialSource(
        name="Resmi Gazete",
        url="https://www.resmigazete.gov.tr/",
        method="rss",  # TODO: RSS endpoint doğrulanacak
        update_frequency="daily",
        trust_score=1.0,
        verification="hash_check",
        enabled=True
    ),

    "gib_mevzuat": OfficialSource(
        name="GİB Mevzuat",
        url="https://www.gib.gov.tr/yardim-ve-kaynaklar/mevzuat",
        method="scraping",  # TODO: Resmi API yoksa scraping dikkatli yapılmalı
        update_frequency="daily",
        trust_score=1.0,
        verification="hash_check + manual_review",
        enabled=True
    ),

    "e_mevzuat": OfficialSource(
        name="E-Mevzuat",
        url="https://www.mevzuat.gov.tr/",
        method="api",  # TODO: API endpoint araştırılacak
        update_frequency="weekly",
        trust_score=1.0,
        verification="hash_check",
        enabled=True
    ),

    "danistay": OfficialSource(
        name="Danıştay İçtihatları",
        url="https://www.danistay.gov.tr/",
        method="scraping",  # TODO: İçtihat DB endpoint araştırılacak
        update_frequency="weekly",
        trust_score=0.95,  # Slightly lower (interpretation needed)
        verification="hash_check",
        enabled=False  # TODO: Implementation pending
    ),
}


# ═══════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════

def is_official_source(source_name: str) -> bool:
    """
    Check if a source is in the official registry.

    Args:
        source_name: Source identifier (e.g., "resmi_gazete")

    Returns:
        bool: True if source is official
    """
    return source_name in OFFICIAL_SOURCES


def get_source_trust_score(source_name: str) -> float:
    """
    Get trust score for a source.

    Args:
        source_name: Source identifier

    Returns:
        float: Trust score (0.0 if not found)
    """
    if source_name not in OFFICIAL_SOURCES:
        return 0.0
    return OFFICIAL_SOURCES[source_name].trust_score


def get_enabled_sources() -> Dict[str, OfficialSource]:
    """
    Get all enabled sources.

    Returns:
        dict: Enabled sources only
    """
    return {
        name: source
        for name, source in OFFICIAL_SOURCES.items()
        if source.enabled
    }


def validate_source_for_regwatch(source_name: str) -> dict:
    """
    Validate if a source can be used for RegWatch.

    RegWatch ONLY accepts Tier 1 sources (trust_score >= 0.95).

    Args:
        source_name: Source identifier

    Returns:
        dict: Validation result with status and reason
    """
    if not is_official_source(source_name):
        return {
            "valid": False,
            "reason": f"'{source_name}' is not in official source registry",
            "action": "Only Tier 1 sources allowed for RegWatch"
        }

    source = OFFICIAL_SOURCES[source_name]

    if not source.enabled:
        return {
            "valid": False,
            "reason": f"'{source.name}' is disabled",
            "action": "Enable source in registry or choose another"
        }

    if source.trust_score < 0.95:
        return {
            "valid": False,
            "reason": f"Trust score {source.trust_score} < 0.95 (Tier 1 requirement)",
            "action": "RegWatch requires Tier 1 sources only"
        }

    return {
        "valid": True,
        "source": source,
        "reason": f"'{source.name}' is valid Tier 1 source"
    }


# ═══════════════════════════════════════════════════════════
# CLI FOR TESTING
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("LYNTOS RegWatch - Official Source Registry")
    print("=" * 60)

    # List all sources
    print("\nAll Sources:")
    for name, source in OFFICIAL_SOURCES.items():
        status = "✓ Enabled" if source.enabled else "✗ Disabled"
        print(f"  {status} [{name}]")
        print(f"    Name: {source.name}")
        print(f"    URL: {source.url}")
        print(f"    Method: {source.method}")
        print(f"    Trust Score: {source.trust_score}")
        print(f"    Frequency: {source.update_frequency}")
        print()

    # Show enabled sources
    enabled = get_enabled_sources()
    print(f"\nEnabled Sources: {len(enabled)}/{len(OFFICIAL_SOURCES)}")
    for name in enabled:
        print(f"  ✓ {name}")

    # Test validation
    print("\nValidation Tests:")
    test_sources = ["resmi_gazete", "gib_mevzuat", "invalid_source", "danistay"]
    for test_name in test_sources:
        result = validate_source_for_regwatch(test_name)
        status_icon = "✓" if result["valid"] else "✗"
        print(f"  {status_icon} {test_name}: {result['reason']}")
