"""
Full Dossier API Routes
POST /api/v2/dossier/generate - Generate full dossier
LYNTOS ResponseEnvelope Standard
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from services.dossier import get_dossier_service
from services.feed import get_feed_service
from services.brief import get_brief_service
from services.evidence_bundle import get_evidence_bundle_service
from schemas.feed import FeedSeverity
from middleware.auth import verify_token, check_client_access

router = APIRouter(prefix="/dossier", tags=["dossier"])


class GenerateDossierRequest(BaseModel):
    client_id: str
    period: str
    generate_pdf: bool = True
    use_ai_enhancement: bool = False
    bundle_id: Optional[str] = None
    brief_id: Optional[str] = None
    smmm_id: Optional[str] = None  # Deprecated: smmm_id token'dan alınır (VT-10)


class GenerateFullPackageRequest(BaseModel):
    """Generate Brief + Dossier + Bundle together"""
    client_id: str
    period: str
    generate_pdfs: bool = True
    smmm_id: Optional[str] = None  # Deprecated: smmm_id token'dan alınır (VT-10)


@router.post("/generate")
async def generate_dossier(request: GenerateDossierRequest, user: dict = Depends(verify_token)):
    """
    Generate Full Dossier (6-section Big-4 standard)

    NO DUMMY DATA: Returns fail-soft response if no feed data.

    Returns ResponseEnvelope with FullDossier in data field.
    """
    await check_client_access(user, request.client_id)
    smmm_id = user["id"]
    dossier_service = get_dossier_service()
    feed_service = get_feed_service()

    # Get all feed items (no severity filter for full dossier)
    feed_items = feed_service.get_feed_items(
        smmm_id=smmm_id,
        client_id=request.client_id,
        period=request.period
    )

    result = dossier_service.generate_dossier(
        smmm_id=smmm_id,
        client_id=request.client_id,
        period=request.period,
        feed_items=feed_items,
        bundle_id=request.bundle_id,
        brief_id=request.brief_id,
        generate_pdf=request.generate_pdf,
        use_ai_enhancement=request.use_ai_enhancement
    )

    return result


@router.post("/full-package")
async def generate_full_package(request: GenerateFullPackageRequest, user: dict = Depends(verify_token)):
    """
    Generate complete Executive Briefing package:
    - Evidence Bundle (D1)
    - C-Level Brief (D2)
    - Full Dossier (D3)

    All outputs linked and consistent.
    """
    await check_client_access(user, request.client_id)
    smmm_id = user["id"]
    feed_service = get_feed_service()
    bundle_service = get_evidence_bundle_service()
    brief_service = get_brief_service()
    dossier_service = get_dossier_service()

    # Get feed items once
    feed_items = feed_service.get_feed_items(
        smmm_id=smmm_id,
        client_id=request.client_id,
        period=request.period
    )

    # Generate Evidence Bundle
    bundle_result = bundle_service.generate_bundle(
        smmm_id=smmm_id,
        client_id=request.client_id,
        period=request.period,
        feed_items=feed_items
    )
    bundle_id = bundle_result.get("data", {}).get("bundle_id")

    # Generate Brief
    brief_result = brief_service.generate_brief(
        smmm_id=smmm_id,
        client_id=request.client_id,
        period=request.period,
        feed_items=feed_items,
        bundle_id=bundle_id
    )
    brief_id = brief_result.get("data", {}).get("brief_id")

    # Generate Dossier
    dossier_result = dossier_service.generate_dossier(
        smmm_id=smmm_id,
        client_id=request.client_id,
        period=request.period,
        feed_items=feed_items,
        bundle_id=bundle_id,
        brief_id=brief_id,
        generate_pdf=request.generate_pdfs
    )

    return {
        "schema": {
            "name": "FullPackageResponse",
            "version": "1.0.0",
            "generated_at": datetime.now().isoformat()
        },
        "meta": {
            "smmm_id": smmm_id,
            "client_id": request.client_id,
            "period": request.period
        },
        "data": {
            "bundle": bundle_result.get("data"),
            "brief": brief_result.get("data"),
            "dossier": dossier_result.get("data")
        },
        "errors": (
            bundle_result.get("errors", []) +
            brief_result.get("errors", []) +
            dossier_result.get("errors", [])
        ),
        "warnings": (
            bundle_result.get("warnings", []) +
            brief_result.get("warnings", []) +
            dossier_result.get("warnings", [])
        )
    }


@router.get("/download/{dossier_id}/pdf")
async def download_dossier_pdf(dossier_id: str, user: dict = Depends(verify_token)):
    """Download dossier PDF"""
    dossier_service = get_dossier_service()
    pdf_path = dossier_service.output_dir / f"{dossier_id}.pdf"

    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail=f"PDF for dossier {dossier_id} not found")

    return FileResponse(
        path=str(pdf_path),
        filename=f"{dossier_id}.pdf",
        media_type="application/pdf"
    )


@router.get("/health")
async def health():
    """Health check"""
    return {"status": "ok", "service": "dossier", "timestamp": datetime.now().isoformat()}
