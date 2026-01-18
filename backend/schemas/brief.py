"""
C-Level Brief Data Models
LYNTOS Executive Briefing: 5-slide patron summary
Anayasa: Evidence-gated, AI-labeled, no dummy data
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

from .feed import FeedSeverity, EvidenceStatus


class SlideType(str, Enum):
    """5 slide types as per Executive Briefing spec"""
    PERIOD_SUMMARY = "period_summary"      # Slayt 1: Donem Ozeti (KPI)
    CRITICAL_RISKS = "critical_risks"      # Slayt 2: Ilk 2 Kritik Risk
    MISSING_DOCS = "missing_docs"          # Slayt 3: Eksik Belgeler
    OPPORTUNITY = "opportunity"            # Slayt 4: Firsat (Vergus tarzi)
    SMMM_SIGNATURE = "smmm_signature"      # Slayt 5: SMMM Imzasi


class ContentSource(str, Enum):
    """Source of content - for AI transparency"""
    SYSTEM = "system"           # Deterministic, rule-based
    EXPERT = "expert"           # SMMM/human authored
    AI_ASSISTED = "ai_assisted" # AI rephrased (must be labeled)


@dataclass
class KPIMetric:
    """Single KPI for period summary"""
    name: str                    # "Risk Seviyesi", "Uyum Durumu", "Etki"
    value: str                   # "YUKSEK", "%85", "125.000 TL"
    trend: Optional[str] = None  # "up", "down", "stable"
    description: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "value": self.value,
            "trend": self.trend,
            "description": self.description
        }


@dataclass
class RiskHighlight:
    """Risk item for slide 2"""
    title: str
    impact: str                          # "125.000 TL" or "15 puan"
    why: str                             # 1 sentence explanation
    action: str                          # 1 sentence action
    evidence_refs: List[str]             # Evidence ref IDs
    source_feed_id: str                  # Original feed item ID
    severity: FeedSeverity

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "impact": self.impact,
            "why": self.why,
            "action": self.action,
            "evidence_refs": self.evidence_refs,
            "source_feed_id": self.source_feed_id,
            "severity": self.severity.value
        }


@dataclass
class MissingDocument:
    """Missing document for slide 3"""
    ref_id: str
    description: str
    source_type: str
    required_by: Optional[str] = None    # Which finding requires this
    cta: str = "Belge yukle"             # Call to action

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ref_id": self.ref_id,
            "description": self.description,
            "source_type": self.source_type,
            "required_by": self.required_by,
            "cta": self.cta
        }


@dataclass
class Opportunity:
    """Opportunity/savings for slide 4 (Vergus style)"""
    title: str
    potential_savings_try: Optional[float] = None
    description: str = ""
    applicability_note: str = ""         # "Uygulanabilirlik notu"
    evidence_refs: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "potential_savings_try": self.potential_savings_try,
            "description": self.description,
            "applicability_note": self.applicability_note,
            "evidence_refs": self.evidence_refs
        }


@dataclass
class SMMNote:
    """SMMM signature and note for slide 5"""
    smmm_id: str
    smmm_name: Optional[str] = None
    note: Optional[str] = None           # Manual note from SMMM
    signature_date: Optional[datetime] = None
    is_signed: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "smmm_id": self.smmm_id,
            "smmm_name": self.smmm_name,
            "note": self.note,
            "signature_date": self.signature_date.isoformat() if self.signature_date else None,
            "is_signed": self.is_signed
        }


@dataclass
class BriefSlide:
    """Single slide in the brief"""
    slide_number: int                    # 1-5
    slide_type: SlideType
    title: str
    content: Dict[str, Any]              # Type-specific content
    source: ContentSource = ContentSource.SYSTEM
    evidence_refs: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "slide_number": self.slide_number,
            "slide_type": self.slide_type.value,
            "title": self.title,
            "content": self.content,
            "source": self.source.value,
            "evidence_refs": self.evidence_refs
        }


@dataclass
class CLevelBrief:
    """
    Complete C-Level Brief - 5 slides max
    LYNTOS Executive Briefing format
    """
    brief_id: str
    smmm_id: str
    client_id: str
    period: str
    generated_at: datetime
    slides: List[BriefSlide]

    # Metadata
    total_risks: int = 0
    critical_count: int = 0
    high_count: int = 0
    missing_docs_count: int = 0
    total_impact_try: float = 0.0

    # Source tracking
    source_feed_ids: List[str] = field(default_factory=list)
    source_bundle_id: Optional[str] = None

    def __post_init__(self):
        """Validate brief structure"""
        if len(self.slides) > 5:
            raise ValueError(f"Brief cannot have more than 5 slides, got {len(self.slides)}")
        if not self.slides:
            raise ValueError("Brief must have at least 1 slide")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "brief_id": self.brief_id,
            "smmm_id": self.smmm_id,
            "client_id": self.client_id,
            "period": self.period,
            "generated_at": self.generated_at.isoformat(),
            "slides": [s.to_dict() for s in self.slides],
            "metadata": {
                "total_risks": self.total_risks,
                "critical_count": self.critical_count,
                "high_count": self.high_count,
                "missing_docs_count": self.missing_docs_count,
                "total_impact_try": self.total_impact_try
            },
            "source": {
                "feed_ids": self.source_feed_ids,
                "bundle_id": self.source_bundle_id
            }
        }

    @classmethod
    def generate_id(cls, client_id: str, period: str) -> str:
        return f"BRIEF-{client_id[:8]}-{period}-{uuid.uuid4().hex[:6].upper()}"
