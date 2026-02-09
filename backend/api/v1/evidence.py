"""
Evidence Bundle API
Download evidence bundles as ZIP files with dossier manifest
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse, FileResponse
import logging
import json
import yaml
from pathlib import Path
from typing import Optional
import sys
import urllib.parse

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from utils.evidence_bundler import EvidenceBundler
from middleware.auth import verify_token, check_client_access

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
    client_id: str = Query(..., description="Client identifier"),
    period: str = Query(..., description="Period (e.g., 2025-Q2)"),
    user: dict = Depends(verify_token)
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
    # Get tenant_id from token
    smmm_id = user["id"]

    # Verify client access
    await check_client_access(user, client_id)

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
async def list_evidence_rules(user: dict = Depends(verify_token)):
    """
    List all rules with their evidence requirements (Auth Required)

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


# ════════════════════════════════════════════════════════════════
# EVIDENCE FILE DOWNLOAD - Beyanname/Tahakkuk dosyaları için
# ════════════════════════════════════════════════════════════════

@router.get("/evidence/file/{filename:path}")
async def download_evidence_file(
    filename: str,
    user: dict = Depends(verify_token)
):
    """
    Download an evidence file by filename (Auth Required)

    Searches for the file in known upload directories:
    - uploads/pilot_ozkan/Q*_extracted/
    - uploads/{tenant_id}/
    - data/evidence/

    Returns the file if found, 404 if not.
    """
    # Decode URL-encoded filename
    decoded_filename = urllib.parse.unquote(filename)

    # Security: prevent path traversal
    if '..' in decoded_filename or decoded_filename.startswith('/'):
        raise HTTPException(400, "Invalid filename")

    # Known directories to search
    search_dirs = [
        BACKEND_DIR / "uploads" / "pilot_ozkan" / "Q1_extracted",
        BACKEND_DIR / "uploads" / "pilot_ozkan" / "Q2_extracted",
        BACKEND_DIR / "uploads" / "pilot_ozkan" / "Q3_extracted",
        BACKEND_DIR / "uploads" / "pilot_ozkan" / "Q4_extracted",
        BACKEND_DIR / "uploads" / "pilot_ozkan",
        BACKEND_DIR / "uploads" / "HKOZKAN",
        BACKEND_DIR / "uploads" / "evidence",
        BACKEND_DIR / "data" / "evidence",
    ]

    # Search for file
    for search_dir in search_dirs:
        if not search_dir.exists():
            continue

        file_path = search_dir / decoded_filename
        if file_path.exists() and file_path.is_file():
            logger.info(f"[EVIDENCE] Serving file: {file_path}")

            # Determine content type
            suffix = file_path.suffix.lower()
            content_types = {
                '.pdf': 'application/pdf',
                '.csv': 'text/csv',
                '.xml': 'application/xml',
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                '.xls': 'application/vnd.ms-excel',
                '.json': 'application/json',
                '.txt': 'text/plain',
            }
            content_type = content_types.get(suffix, 'application/octet-stream')

            return FileResponse(
                path=str(file_path),
                media_type=content_type,
                filename=decoded_filename
            )

    # File not found
    logger.warning(f"[EVIDENCE] File not found: {decoded_filename}")
    raise HTTPException(404, f"Dosya bulunamadı: {decoded_filename}")
