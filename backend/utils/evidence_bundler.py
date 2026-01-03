"""
Evidence Bundle Generator
Creates ZIP files with dossier manifest and checklist
"""

import zipfile
import io
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class EvidenceBundler:
    """Generate evidence ZIP bundles with manifest and checklist"""

    def __init__(self, uploads_dir: str = "backend/data"):
        self.uploads_dir = Path(uploads_dir)

    def create_bundle(
        self,
        rule_id: str,
        rule_name: str,
        smmm_id: str,
        client_id: str,
        period: str,
        evidence_refs: List[str],
        legal_basis_refs: List[str],
        required_evidence: List[str],
        pack_version: str,
        pack_hash: str,
        risk_status: Optional[str] = None,
        risk_score: Optional[float] = None
    ) -> bytes:
        """
        Create ZIP bundle with manifest + checklist + files

        Args:
            rule_id: Rule identifier (e.g., R-001)
            rule_name: Human-readable rule name
            smmm_id: SMMM identifier
            client_id: Client identifier
            period: Period string (e.g., 2025-Q2)
            evidence_refs: List of evidence file references
            legal_basis_refs: List of legal basis source IDs
            required_evidence: List of required evidence files
            pack_version: Rulepack version
            pack_hash: Rulepack SHA256 hash
            risk_status: Optional risk status (ok/warning/error)
            risk_score: Optional risk score

        Returns:
            bytes: ZIP file content
        """

        zip_buffer = io.BytesIO()
        files_added = []
        files_missing = []

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # 1. Collect actual files
            for ref in evidence_refs:
                file_path = self.uploads_dir / ref
                if file_path.exists():
                    zip_file.write(file_path, f"evidence/{ref}")
                    files_added.append(ref)
                else:
                    logger.warning(f"Evidence file not found: {ref}")
                    files_missing.append(ref)

            # 2. Dossier Manifest
            manifest = {
                "schema_version": "1.0.0",
                "rule_id": rule_id,
                "rule_name": rule_name,
                "smmm_id": smmm_id,
                "client_id": client_id,
                "period": period,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "evidence_list": files_added,
                "evidence_missing": files_missing,
                "legal_basis_refs": legal_basis_refs,
                "pack_version": pack_version,
                "pack_hash": pack_hash,
                "risk_status": risk_status,
                "risk_score": risk_score
            }
            zip_file.writestr(
                "dossier_manifest.json",
                json.dumps(manifest, indent=2, ensure_ascii=False)
            )

            # 3. Checklist
            present_set = set(files_added)
            required_set = set(required_evidence)
            missing = list(required_set - present_set)
            extra = list(present_set - required_set)

            completeness = len(present_set & required_set) / len(required_set) if required_set else 1.0

            checklist = {
                "schema_version": "1.0.0",
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "required_docs": required_evidence,
                "present_docs": files_added,
                "missing_docs": missing,
                "extra_docs": extra,
                "status": "complete" if not missing else "incomplete",
                "completeness_ratio": round(completeness, 2),
                "completeness_percent": f"{int(completeness * 100)}%"
            }
            zip_file.writestr(
                "checklist_required_docs.json",
                json.dumps(checklist, indent=2, ensure_ascii=False)
            )

            # 4. Human-readable summary
            summary_lines = [
                f"LYNTOS Evidence Bundle",
                f"=" * 40,
                f"",
                f"Rule: {rule_id} - {rule_name}",
                f"Client: {client_id}",
                f"SMMM: {smmm_id}",
                f"Period: {period}",
                f"Generated: {manifest['generated_at']}",
                f"",
                f"Pack Version: {pack_version}",
                f"Pack Hash: {pack_hash[:16]}...",
                f"",
                f"Evidence Status: {checklist['status'].upper()}",
                f"Completeness: {checklist['completeness_percent']}",
                f"",
                f"Files Included ({len(files_added)}):",
            ]
            for f in files_added:
                summary_lines.append(f"  + {f}")

            if missing:
                summary_lines.append(f"")
                summary_lines.append(f"Missing Files ({len(missing)}):")
                for f in missing:
                    summary_lines.append(f"  - {f}")

            summary_lines.append(f"")
            summary_lines.append(f"Legal Basis: {', '.join(legal_basis_refs)}")

            zip_file.writestr(
                "README.txt",
                "\n".join(summary_lines)
            )

        zip_buffer.seek(0)
        return zip_buffer.getvalue()


def get_bundler() -> EvidenceBundler:
    """Factory function to get bundler instance"""
    return EvidenceBundler()
