"""
Evidence Bundle API Routes
POST /api/v2/evidence-bundle/generate - Generate evidence bundle
LYNTOS V1 Critical
"""
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os

from schemas.feed import FeedSeverity
from services.feed import get_feed_service
from services.evidence_bundle import get_evidence_bundle_service

router = APIRouter(prefix="/evidence-bundle", tags=["evidence-bundle"])


class GenerateBundleRequest(BaseModel):
    smmm_id: str
    client_id: str
    period: str
    severity_filter: Optional[List[str]] = ["CRITICAL", "HIGH"]
    evidence_files_dir: Optional[str] = None


@router.post("/generate")
async def generate_evidence_bundle(request: GenerateBundleRequest):
    """
    Generate Evidence Bundle from feed items

    1. Collects CRITICAL/HIGH feed items
    2. Extracts all evidence_refs and actions
    3. Generates PDF report
    4. Creates ZIP bundle

    Returns ResponseEnvelope with bundle info
    """
    feed_service = get_feed_service()
    bundle_service = get_evidence_bundle_service()

    # Get feed items (filter by severity)
    severity_filter = [FeedSeverity(s) for s in request.severity_filter if s in FeedSeverity.__members__]

    feed_items = feed_service.get_feed_items(
        smmm_id=request.smmm_id,
        client_id=request.client_id,
        period=request.period,
        severity_filter=severity_filter if severity_filter else [FeedSeverity.CRITICAL, FeedSeverity.HIGH]
    )

    # If no items, return fail-soft response - NO DEMO DATA
    if not feed_items:
        return {
            "schema": {
                "name": "EvidenceBundleResponse",
                "version": "2.0.0",
                "generated_at": datetime.now().isoformat()
            },
            "meta": {
                "smmm_id": request.smmm_id,
                "client_id": request.client_id,
                "period": request.period
            },
            "data": None,
            "errors": [],
            "warnings": [{
                "type": "no_feed_data",
                "message": "Bu donem icin feed verisi bulunamadi. Once veri yukleyin.",
                "actions": ["Mizan yukleyin", "E-defter yukleyin", "Beyanname yukleyin"]
            }]
        }

    # Generate bundle
    result = bundle_service.generate_bundle(
        smmm_id=request.smmm_id,
        client_id=request.client_id,
        period=request.period,
        feed_items=feed_items,
        evidence_files_dir=request.evidence_files_dir
    )

    return result


@router.get("/download/{bundle_id}")
async def download_bundle(bundle_id: str):
    """Download the ZIP bundle"""
    bundle_service = get_evidence_bundle_service()
    zip_path = bundle_service.output_dir / f"{bundle_id}.zip"

    if not zip_path.exists():
        raise HTTPException(status_code=404, detail=f"Bundle {bundle_id} not found")

    return FileResponse(
        path=str(zip_path),
        filename=f"{bundle_id}.zip",
        media_type="application/zip"
    )


@router.get("/download/{bundle_id}/pdf")
async def download_pdf(bundle_id: str):
    """Download only the PDF report"""
    bundle_service = get_evidence_bundle_service()
    pdf_path = bundle_service.output_dir / f"{bundle_id}.pdf"

    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail=f"PDF for bundle {bundle_id} not found")

    return FileResponse(
        path=str(pdf_path),
        filename=f"{bundle_id}.pdf",
        media_type="application/pdf"
    )


@router.get("/health")
async def health():
    """Health check"""
    return {"status": "ok", "service": "evidence-bundle", "timestamp": datetime.now().isoformat()}
