"""
Evidence Bundle Models
LYNTOS V1 Critical: Kanit paketi icin veri yapilari
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from .feed import FeedItem, EvidenceRef, FeedAction, EvidenceStatus


@dataclass
class BundleSummary:
    """Summary statistics for evidence bundle"""
    total_evidence: int
    available_evidence: int
    missing_evidence: int
    completion_rate: float  # 0-100
    critical_items: int
    high_items: int
    total_actions: int
    pending_actions: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_evidence": self.total_evidence,
            "available_evidence": self.available_evidence,
            "missing_evidence": self.missing_evidence,
            "completion_rate": round(self.completion_rate, 1),
            "critical_items": self.critical_items,
            "high_items": self.high_items,
            "total_actions": self.total_actions,
            "pending_actions": self.pending_actions
        }


@dataclass
class EvidenceBundleManifest:
    """
    Manifest for the evidence bundle ZIP
    Contains all metadata needed for audit trail
    """
    bundle_id: str
    smmm_id: str
    client_id: str
    period: str
    generated_at: datetime
    summary: BundleSummary
    evidence_list: List[EvidenceRef]
    action_items: List[FeedAction]
    source_feed_ids: List[str]
    pdf_filename: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "bundle_id": self.bundle_id,
            "smmm_id": self.smmm_id,
            "client_id": self.client_id,
            "period": self.period,
            "generated_at": self.generated_at.isoformat(),
            "summary": self.summary.to_dict(),
            "evidence_list": [e.to_dict() for e in self.evidence_list],
            "action_items": [a.to_dict() for a in self.action_items],
            "source_feed_ids": self.source_feed_ids,
            "pdf_filename": self.pdf_filename
        }

    @classmethod
    def generate_id(cls, client_id: str, period: str) -> str:
        """Generate unique bundle ID"""
        return f"EVBND-{client_id[:8]}-{period}-{uuid.uuid4().hex[:6].upper()}"
