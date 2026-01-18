"""
Complete Quarter Data Package
Combines mizan + banka + expected findings
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from decimal import Decimal
import json
from pathlib import Path

from .mizan_generator import MizanGenerator, MizanHesap
from .banka_generator import BankaGenerator, BankaIslem


@dataclass
class ExpectedFinding:
    """Expected finding for test verification"""
    category: str
    severity: str
    title_contains: str
    evidence_count: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "category": self.category,
            "severity": self.severity,
            "title_contains": self.title_contains,
            "evidence_count": self.evidence_count
        }


@dataclass
class QuarterData:
    """Complete data package for a quarter"""
    year: int
    quarter: int
    smmm_id: str
    client_id: str

    mizan: List[MizanHesap] = field(default_factory=list)
    banka: List[BankaIslem] = field(default_factory=list)

    # Expected test outcomes
    expected_findings: List[ExpectedFinding] = field(default_factory=list)
    expected_evidence_count: int = 0
    expected_action_count: int = 0

    # Flags
    has_kdv_mismatch: bool = False
    has_banka_mismatch: bool = False
    has_missing_documents: bool = False

    @property
    def period(self) -> str:
        return f"{self.year}-Q{self.quarter}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "period": self.period,
            "year": self.year,
            "quarter": self.quarter,
            "smmm_id": self.smmm_id,
            "client_id": self.client_id,
            "mizan": [h.to_dict() for h in self.mizan],
            "banka": [b.to_dict() for b in self.banka],
            "expected_findings": [f.to_dict() for f in self.expected_findings],
            "flags": {
                "has_kdv_mismatch": self.has_kdv_mismatch,
                "has_banka_mismatch": self.has_banka_mismatch,
                "has_missing_documents": self.has_missing_documents
            }
        }

    def save(self, output_dir: Path):
        """Save quarter data to files"""
        output_dir.mkdir(parents=True, exist_ok=True)

        # Save mizan
        mizan_path = output_dir / f"mizan_{self.period}.json"
        with open(mizan_path, 'w', encoding='utf-8') as f:
            json.dump([h.to_dict() for h in self.mizan], f, indent=2, ensure_ascii=False)

        # Save banka
        banka_path = output_dir / f"banka_{self.period}.json"
        with open(banka_path, 'w', encoding='utf-8') as f:
            json.dump([b.to_dict() for b in self.banka], f, indent=2, ensure_ascii=False)

        # Save metadata
        meta_path = output_dir / f"meta_{self.period}.json"
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump({
                "period": self.period,
                "smmm_id": self.smmm_id,
                "client_id": self.client_id,
                "expected_findings": [ef.to_dict() for ef in self.expected_findings],
                "flags": {
                    "has_kdv_mismatch": self.has_kdv_mismatch,
                    "has_banka_mismatch": self.has_banka_mismatch,
                    "has_missing_documents": self.has_missing_documents
                }
            }, f, indent=2, ensure_ascii=False)


def generate_quarter_data(
    year: int,
    quarter: int,
    smmm_id: str = "SMMM-TEST-001",
    client_id: str = "CLIENT-TEST-001",
    seed: Optional[int] = None,
    scenario: str = "normal"
) -> QuarterData:
    """
    Generate complete quarter data with specific scenario

    Scenarios:
    - "normal": Clean data, minimal findings
    - "kdv_mismatch": KDV hesaplari tutarsiz
    - "banka_mismatch": Banka mutabakat farki var
    - "missing_docs": Eksik belge senaryosu
    - "critical": Coklu kritik bulgu
    """
    # Use deterministic seed
    actual_seed = seed if seed else (year * 10 + quarter)

    mizan_gen = MizanGenerator(seed=actual_seed)
    banka_gen = BankaGenerator(seed=actual_seed)

    # Base revenue varies by quarter
    base_revenues = {1: 800000, 2: 1000000, 3: 750000, 4: 1200000}

    # Generate based on scenario
    include_mizan_errors = scenario in ["kdv_mismatch", "critical"]
    include_banka_unmatched = scenario in ["banka_mismatch", "critical"]

    mizan = mizan_gen.generate_quarter(
        year=year,
        quarter=quarter,
        base_revenue=Decimal(str(base_revenues[quarter])),
        include_errors=include_mizan_errors
    )

    banka = banka_gen.generate_quarter(
        year=year,
        quarter=quarter,
        opening_balance=Decimal("500000"),
        include_unmatched=include_banka_unmatched
    )

    # Build expected findings based on scenario
    expected_findings = []

    if scenario == "kdv_mismatch":
        expected_findings.append(ExpectedFinding(
            category="VDK",
            severity="CRITICAL",
            title_contains="KDV",
            evidence_count=2
        ))

    if scenario == "banka_mismatch":
        expected_findings.append(ExpectedFinding(
            category="Mutabakat",
            severity="HIGH",
            title_contains="Banka",
            evidence_count=2
        ))

    if scenario == "missing_docs":
        expected_findings.append(ExpectedFinding(
            category="Belge",
            severity="MEDIUM",
            title_contains="Eksik",
            evidence_count=1
        ))

    if scenario == "critical":
        expected_findings.extend([
            ExpectedFinding("VDK", "CRITICAL", "KDV", 2),
            ExpectedFinding("Mutabakat", "HIGH", "Banka", 2),
        ])

    return QuarterData(
        year=year,
        quarter=quarter,
        smmm_id=smmm_id,
        client_id=client_id,
        mizan=mizan,
        banka=banka,
        expected_findings=expected_findings,
        has_kdv_mismatch=scenario in ["kdv_mismatch", "critical"],
        has_banka_mismatch=scenario in ["banka_mismatch", "critical"],
        has_missing_documents=scenario == "missing_docs"
    )
