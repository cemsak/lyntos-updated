"""
C-Level Brief API Routes
POST /api/v2/brief/generate - Generate executive brief
LYNTOS ResponseEnvelope Standard
"""
from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from services.brief import get_brief_service
from services.feed import get_feed_service
from schemas.feed import FeedSeverity
from middleware.auth import verify_token, check_client_access

router = APIRouter(prefix="/brief", tags=["brief"])


@router.get("/health")
async def health():
    """Health check"""
    return {"status": "ok", "service": "brief", "timestamp": datetime.now().isoformat()}


class GenerateBriefRequest(BaseModel):
    client_id: str
    period: str
    include_medium: bool = False  # Include MEDIUM severity items
    bundle_id: Optional[str] = None  # Link to evidence bundle
    smmm_id: Optional[str] = None  # Deprecated: smmm_id token'dan alınır (VT-10)


@router.post("/generate")
async def generate_brief(request: GenerateBriefRequest, user: dict = Depends(verify_token)):
    """
    Generate C-Level Brief (5-slide executive summary)

    NO DUMMY DATA: If no feed data exists, returns fail-soft response.

    Returns ResponseEnvelope with CLevelBrief in data field.
    """
    await check_client_access(user, request.client_id)
    smmm_id = user["id"]
    brief_service = get_brief_service()
    feed_service = get_feed_service()

    # Get feed items
    severity_filter = [FeedSeverity.CRITICAL, FeedSeverity.HIGH]
    if request.include_medium:
        severity_filter.append(FeedSeverity.MEDIUM)

    feed_items = feed_service.get_feed_items(
        smmm_id=smmm_id,
        client_id=request.client_id,
        period=request.period,
        severity_filter=severity_filter
    )

    # Generate brief
    result = brief_service.generate_brief(
        smmm_id=smmm_id,
        client_id=request.client_id,
        period=request.period,
        feed_items=feed_items,
        bundle_id=request.bundle_id
    )

    return result


@router.get("/{brief_id}")
async def get_brief(brief_id: str, user: dict = Depends(verify_token)):
    """
    Get existing brief by ID

    Note: For V1, briefs are generated on-demand and not stored.
    This endpoint is a placeholder for future persistence.
    """
    return {
        "schema": {
            "name": "BriefNotFoundResponse",
            "version": "1.0.0",
            "generated_at": datetime.now().isoformat()
        },
        "meta": {"brief_id": brief_id},
        "data": None,
        "errors": [{
            "type": "not_implemented",
            "message": "Brief persistence not yet implemented. Use POST /generate instead."
        }],
        "warnings": []
    }
