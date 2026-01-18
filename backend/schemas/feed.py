"""
Feed Data Models
LYNTOS Anayasa: Evidence-gated, Explainability Contract
Matches frontend FeedItem interface EXACTLY
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class FeedCategory(str, Enum):
    VDK = "VDK"
    MIZAN = "Mizan"
    GV = "GV"
    KV = "KV"
    MUTABAKAT = "Mutabakat"
    ENFLASYON = "Enflasyon"
    MEVZUAT = "Mevzuat"
    HUKUK = "Hukuk"
    PRATIK = "Pratik"
    BELGE = "Belge"
    VERGUS = "Vergus"


class FeedSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class EvidenceStatus(str, Enum):
    AVAILABLE = "available"
    MISSING = "missing"
    PENDING = "pending"
    EXPIRED = "expired"


class ActionStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"


@dataclass
class FeedScope:
    """Scope identifier for feed items"""
    smmm_id: str
    client_id: str
    period: str  # Format: "2024-Q1" or "2024-01"


@dataclass
class FeedImpact:
    """Impact metrics for feed items"""
    amount_try: Optional[float] = None
    pct: Optional[float] = None
    points: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {}
        if self.amount_try is not None:
            result["amount_try"] = self.amount_try
        if self.pct is not None:
            result["pct"] = self.pct
        if self.points is not None:
            result["points"] = self.points
        return result


@dataclass
class EvidenceRef:
    """
    Evidence reference - the atomic unit of proof
    LYNTOS Anayasa: Every claim must have evidence
    """
    ref_id: str
    source_type: str  # "mizan", "e-defter", "banka", "e-fatura", "beyan", "belge"
    description: str
    status: EvidenceStatus = EvidenceStatus.MISSING
    file_path: Optional[str] = None
    account_code: Optional[str] = None  # Hesap kodu (varsa)
    document_date: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ref_id": self.ref_id,
            "source_type": self.source_type,
            "description": self.description,
            "status": self.status.value,
            "file_path": self.file_path,
            "account_code": self.account_code,
            "document_date": self.document_date,
            "metadata": self.metadata
        }


@dataclass
class FeedAction:
    """
    Action item for feed cards
    LYNTOS Anayasa: Every finding must have actionable next steps
    """
    action_id: str
    description: str
    responsible: Optional[str] = None  # "SMMM", "Mukellef", "Sistem"
    deadline: Optional[str] = None
    status: ActionStatus = ActionStatus.PENDING
    priority: int = 1  # 1=highest
    related_evidence: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "action_id": self.action_id,
            "description": self.description,
            "responsible": self.responsible,
            "deadline": self.deadline,
            "status": self.status.value,
            "priority": self.priority,
            "related_evidence": self.related_evidence
        }


@dataclass
class FeedItem:
    """
    Feed item - matches frontend FeedItem interface EXACTLY
    LYNTOS Anayasa: evidence_refs and actions are MANDATORY (min 1 each)
    """
    id: str
    scope: FeedScope
    category: FeedCategory
    severity: FeedSeverity
    score: int  # 0-100
    impact: FeedImpact
    title: str
    summary: str
    why: str  # ZORUNLU - Explainability
    evidence_refs: List[EvidenceRef]  # Min 1 ZORUNLU
    actions: List[FeedAction]  # Min 1 ZORUNLU
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        """Validate LYNTOS Anayasa constraints"""
        if not self.evidence_refs:
            raise ValueError(f"FeedItem {self.id}: evidence_refs cannot be empty (Anayasa violation)")
        if not self.actions:
            raise ValueError(f"FeedItem {self.id}: actions cannot be empty (Anayasa violation)")
        if not self.why:
            raise ValueError(f"FeedItem {self.id}: why cannot be empty (Explainability violation)")
        if not 0 <= self.score <= 100:
            raise ValueError(f"FeedItem {self.id}: score must be 0-100")

    def has_complete_evidence(self) -> bool:
        """Check if all evidence is available"""
        return all(e.status == EvidenceStatus.AVAILABLE for e in self.evidence_refs)

    def get_missing_evidence(self) -> List[EvidenceRef]:
        """Get list of missing evidence"""
        return [e for e in self.evidence_refs if e.status == EvidenceStatus.MISSING]

    def get_pending_actions(self) -> List[FeedAction]:
        """Get list of pending actions"""
        return [a for a in self.actions if a.status == ActionStatus.PENDING]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "scope": {
                "smmm_id": self.scope.smmm_id,
                "client_id": self.scope.client_id,
                "period": self.scope.period
            },
            "category": self.category.value,
            "severity": self.severity.value,
            "score": self.score,
            "impact": self.impact.to_dict(),
            "title": self.title,
            "summary": self.summary,
            "why": self.why,
            "evidence_refs": [e.to_dict() for e in self.evidence_refs],
            "actions": [a.to_dict() for a in self.actions],
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

    @classmethod
    def generate_id(cls) -> str:
        """Generate unique feed item ID"""
        return f"FEED-{uuid.uuid4().hex[:12].upper()}"
