"""
Full Dossier Data Models
LYNTOS Client-Ready Dossier: Big-4 standard, evidence-backed
Anayasa: Evidence-gated, AI-labeled, SMMM authority
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

from .feed import FeedSeverity, EvidenceStatus
from .brief import ContentSource


class DossierSectionType(str, Enum):
    """6 sections as per Executive Briefing spec"""
    EXECUTIVE_SUMMARY = "executive_summary"    # Bolum 1: Yonetici Ozeti
    CRITICAL_FINDINGS = "critical_findings"    # Bolum 2: Kritik Bulgular
    EVIDENCE_LIST = "evidence_list"            # Bolum 3: Kanit Listesi
    ACTION_PLAN = "action_plan"                # Bolum 4: Aksiyon Plani
    REGULATORY_IMPACT = "regulatory_impact"    # Bolum 5: Mevzuat/RegWatch
    SMMM_SIGNATURE = "smmm_signature"          # Bolum 6: SMMM Notu ve Imza


class FindingSeverityLevel(str, Enum):
    """Severity levels for dossier findings"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    OBSERVATION = "observation"


@dataclass
class DossierFinding:
    """Single finding in the dossier - evidence-gated"""
    finding_id: str
    title: str
    description: str
    severity: FindingSeverityLevel
    impact_description: str
    impact_amount_try: Optional[float] = None
    root_cause: Optional[str] = None           # "why" from feed
    recommendation: str = ""
    evidence_refs: List[str] = field(default_factory=list)  # MANDATORY
    source_feed_id: Optional[str] = None
    source: ContentSource = ContentSource.SYSTEM
    ai_enhanced_description: Optional[str] = None  # AI-improved version (labeled)

    def __post_init__(self):
        if not self.evidence_refs:
            raise ValueError(f"Finding {self.finding_id}: evidence_refs cannot be empty (Anayasa)")

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "finding_id": self.finding_id,
            "title": self.title,
            "description": self.description,
            "severity": self.severity.value,
            "impact_description": self.impact_description,
            "impact_amount_try": self.impact_amount_try,
            "root_cause": self.root_cause,
            "recommendation": self.recommendation,
            "evidence_refs": self.evidence_refs,
            "source_feed_id": self.source_feed_id,
            "source": self.source.value
        }
        if self.ai_enhanced_description:
            result["ai_enhanced_description"] = self.ai_enhanced_description
            result["ai_label"] = "Bu aciklama AI tarafindan iyilestirilmistir"
        return result


@dataclass
class EvidenceListItem:
    """Evidence item for Bolum 3"""
    ref_id: str
    source_type: str
    description: str
    status: EvidenceStatus
    account_code: Optional[str] = None
    document_date: Optional[str] = None
    period: Optional[str] = None
    file_path: Optional[str] = None
    related_findings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ref_id": self.ref_id,
            "source_type": self.source_type,
            "description": self.description,
            "status": self.status.value,
            "account_code": self.account_code,
            "document_date": self.document_date,
            "period": self.period,
            "file_path": self.file_path,
            "related_findings": self.related_findings
        }


@dataclass
class ActionPlanItem:
    """Action item for Bolum 4"""
    action_id: str
    description: str
    responsible: str                           # "SMMM", "Mukellef", "Sistem"
    deadline: Optional[str] = None
    status: str = "pending"                    # "pending", "in_progress", "completed"
    priority: int = 1                          # 1 = highest
    related_findings: List[str] = field(default_factory=list)
    related_evidence: List[str] = field(default_factory=list)
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "action_id": self.action_id,
            "description": self.description,
            "responsible": self.responsible,
            "deadline": self.deadline,
            "status": self.status,
            "priority": self.priority,
            "related_findings": self.related_findings,
            "related_evidence": self.related_evidence,
            "notes": self.notes
        }


@dataclass
class RegulatoryImpact:
    """Regulatory/RegWatch impact for Bolum 5"""
    regulation_id: str
    regulation_name: str
    description: str
    effective_date: Optional[str] = None
    impact_summary: str = ""
    affected_findings: List[str] = field(default_factory=list)
    source_url: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "regulation_id": self.regulation_id,
            "regulation_name": self.regulation_name,
            "description": self.description,
            "effective_date": self.effective_date,
            "impact_summary": self.impact_summary,
            "affected_findings": self.affected_findings,
            "source_url": self.source_url
        }


@dataclass
class SMMSignatureBlock:
    """SMMM signature block for Bolum 6"""
    smmm_id: str
    smmm_name: Optional[str] = None
    smmm_title: str = "Serbest Muhasebeci Mali Musavir"
    note: Optional[str] = None                 # Manual note from SMMM
    signature_date: Optional[datetime] = None
    is_signed: bool = False
    prepared_for_client: Optional[str] = None
    disclaimer: str = "Bu rapor, mukellef icin LYNTOS sistemi tarafindan hazirlanmis olup, SMMM onayi ile teslim edilebilir."

    def to_dict(self) -> Dict[str, Any]:
        return {
            "smmm_id": self.smmm_id,
            "smmm_name": self.smmm_name,
            "smmm_title": self.smmm_title,
            "note": self.note,
            "signature_date": self.signature_date.isoformat() if self.signature_date else None,
            "is_signed": self.is_signed,
            "prepared_for_client": self.prepared_for_client,
            "disclaimer": self.disclaimer
        }


@dataclass
class DossierSection:
    """Single section in the dossier"""
    section_number: int                        # 1-6
    section_type: DossierSectionType
    title: str
    content: Dict[str, Any]
    source: ContentSource = ContentSource.SYSTEM
    evidence_refs: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "section_number": self.section_number,
            "section_type": self.section_type.value,
            "title": self.title,
            "content": self.content,
            "source": self.source.value,
            "evidence_refs": self.evidence_refs
        }


@dataclass
class FullDossier:
    """
    Complete Client-Ready Dossier
    Big-4 standard, 6 sections, evidence-backed
    """
    dossier_id: str
    smmm_id: str
    client_id: str
    period: str
    client_name: Optional[str] = None
    generated_at: datetime = field(default_factory=datetime.now)
    sections: List[DossierSection] = field(default_factory=list)

    # Metadata
    total_findings: int = 0
    critical_findings: int = 0
    high_findings: int = 0
    total_evidence: int = 0
    missing_evidence: int = 0
    total_actions: int = 0
    pending_actions: int = 0
    total_impact_try: float = 0.0

    # AI usage tracking
    ai_enhanced_sections: List[int] = field(default_factory=list)

    # Source tracking
    source_feed_ids: List[str] = field(default_factory=list)
    source_bundle_id: Optional[str] = None
    source_brief_id: Optional[str] = None

    # PDF
    pdf_path: Optional[str] = None

    def __post_init__(self):
        if len(self.sections) > 6:
            raise ValueError(f"Dossier cannot have more than 6 sections, got {len(self.sections)}")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "dossier_id": self.dossier_id,
            "smmm_id": self.smmm_id,
            "client_id": self.client_id,
            "client_name": self.client_name,
            "period": self.period,
            "generated_at": self.generated_at.isoformat(),
            "sections": [s.to_dict() for s in self.sections],
            "metadata": {
                "total_findings": self.total_findings,
                "critical_findings": self.critical_findings,
                "high_findings": self.high_findings,
                "total_evidence": self.total_evidence,
                "missing_evidence": self.missing_evidence,
                "total_actions": self.total_actions,
                "pending_actions": self.pending_actions,
                "total_impact_try": self.total_impact_try
            },
            "ai_info": {
                "enhanced_sections": self.ai_enhanced_sections,
                "ai_disclaimer": "AI destekli bolumler etiketlenmistir. SMMM icerigi otoritedir."
            },
            "source": {
                "feed_ids": self.source_feed_ids,
                "bundle_id": self.source_bundle_id,
                "brief_id": self.source_brief_id
            },
            "pdf_path": self.pdf_path
        }

    @classmethod
    def generate_id(cls, client_id: str, period: str) -> str:
        return f"DOSSIER-{client_id[:8]}-{period}-{uuid.uuid4().hex[:6].upper()}"
