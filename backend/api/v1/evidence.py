"""
Evidence Bundle API
Download evidence bundles as ZIP files with dossier manifest
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import logging
import json
import yaml
from pathlib import Path
from typing import Optional
import sys

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from utils.evidence_bundler import EvidenceBundler

router = APIRouter()
logger = logging.getLogger(__name__)

# Paths
BACKEND_DIR = Path(__file__).parent.parent.parent
RULES_REGISTRY = BACKEND_DIR / "rules" / "registry"
RULES_MANIFEST = BACKEND_DIR / "rules" / "packs" / "core_manifest.json"


def load_rule(rule_id: str) -> Optional[dict]:
    """Load rule from YAML registry"""
    # Find matching rule file
    matches = list(RULES_REGISTRY.glob(f"{rule_id}_*.yaml"))

    if not matches:
        # Try exact match
        matches = list(RULES_REGISTRY.glob(f"{rule_id}.yaml"))

    if not matches:
        return None

    with open(matches[0], "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_manifest() -> dict:
    """Load rulepack manifest"""
    if not RULES_MANIFEST.exists():
        return {
            "pack_version": "1.0.0",
            "pack_hash": "unknown"
        }

    with open(RULES_MANIFEST, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/evidence/bundle/{rule_id}")
async def get_evidence_bundle(
    rule_id: str,
    smmm_id: str = Query(default="HKOZKAN", description="SMMM identifier"),
    client_id: str = Query(default="OZKAN_KIRTASIYE", description="Client identifier"),
    period: str = Query(default="2025-Q2", description="Period (e.g., 2025-Q2)")
):
    """
    Download evidence bundle as ZIP

    Creates a ZIP file containing:
    - dossier_manifest.json: Bundle metadata with rule info, pack_hash
    - checklist_required_docs.json: Required vs present documents
    - README.txt: Human-readable summary
    - evidence/: Directory with actual evidence files

    Args:
        rule_id: Rule ID (e.g., R-001)
        smmm_id: SMMM identifier
        client_id: Client identifier
        period: Period (e.g., 2025-Q2)

    Returns:
        ZIP file as streaming response
    """

    try:
        # Load rule
        rule = load_rule(rule_id)
        if not rule:
            raise HTTPException(
                status_code=404,
                detail=f"Rule {rule_id} not found in registry"
            )

        # Load manifest
        manifest = load_manifest()

        # Get evidence refs from rule
        evidence_refs = rule.get("evidence_required", [])
        required_evidence = rule.get("evidence_required", [])
        legal_basis_refs = rule.get("legal_basis_refs", [])

        # Create bundler with correct path
        bundler = EvidenceBundler(uploads_dir=str(BACKEND_DIR / "data"))

        # Generate ZIP
        zip_bytes = bundler.create_bundle(
            rule_id=rule_id,
            rule_name=rule.get("name", rule_id),
            smmm_id=smmm_id,
            client_id=client_id,
            period=period,
            evidence_refs=evidence_refs,
            legal_basis_refs=legal_basis_refs,
            required_evidence=required_evidence,
            pack_version=manifest.get("pack_version", "1.0.0"),
            pack_hash=manifest.get("pack_hash", "unknown"),
            risk_status=rule.get("thresholds", {}).get("warning"),
            risk_score=None
        )

        # Generate filename
        safe_client = client_id.replace(" ", "_").replace("/", "_")
        safe_period = period.replace("/", "-")
        filename = f"{rule_id}_evidence_{safe_client}_{safe_period}.zip"

        logger.info(f"Evidence bundle generated: {filename}")

        # Return as streaming response
        return StreamingResponse(
            iter([zip_bytes]),
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(zip_bytes))
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Evidence bundle error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate evidence bundle: {str(e)}"
        )


@router.get("/evidence/rules")
async def list_evidence_rules():
    """
    List all rules with their evidence requirements

    Returns list of rules with evidence_required fields
    """
    try:
        rules = []
        for yaml_file in sorted(RULES_REGISTRY.glob("*.yaml")):
            with open(yaml_file, "r", encoding="utf-8") as f:
                rule = yaml.safe_load(f)
                rules.append({
                    "rule_id": rule.get("rule_id"),
                    "name": rule.get("name"),
                    "category": rule.get("category"),
                    "evidence_required": rule.get("evidence_required", [])
                })

        return {
            "rules": rules,
            "count": len(rules)
        }

    except Exception as e:
        logger.error(f"List rules error: {e}", exc_info=True)
        raise HTTPException(500, str(e))
