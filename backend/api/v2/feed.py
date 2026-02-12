"""
Feed API Routes
GET /api/v2/feed/{period} - Get feed items for a period
LYNTOS ResponseEnvelope Standard
"""
from fastapi import APIRouter, Query, HTTPException, Depends
from typing import List, Optional
from datetime import datetime

from middleware.auth import verify_token, check_client_access
from utils.period_utils import normalize_period_db
from schemas.feed import FeedSeverity, FeedCategory
from services.feed import get_feed_service

router = APIRouter(prefix="/feed", tags=["feed"])


@router.get("/health")
async def health():
    """Health check"""
    return {"status": "ok", "service": "feed", "timestamp": datetime.now().isoformat()}


@router.get("/{period}")
async def get_feed(
    period: str,
    client_id: str = Query(..., description="Client (mukellef) identifier"),
    severity: Optional[List[str]] = Query(None, description="Filter by severity: CRITICAL,HIGH,MEDIUM,LOW,INFO"),
    category: Optional[List[str]] = Query(None, description="Filter by category"),
    limit: int = Query(500, ge=1, le=2000, description="Max feed item sayısı (VT-8)"),
    offset: int = Query(0, ge=0, description="Sayfa offset"),
    user: dict = Depends(verify_token),
):
    """
    Get feed items for a specific period

    Returns ResponseEnvelope with FeedItem[] in data field.
    Returns empty list with warning if no data available.
    """
    period = normalize_period_db(period)
    await check_client_access(user, client_id)
    smmm_id = user["id"]
    service = get_feed_service()

    # Convert string filters to enums
    severity_filter = None
    if severity:
        severity_filter = [FeedSeverity(s) for s in severity if s in FeedSeverity.__members__]

    category_filter = None
    if category:
        category_filter = [FeedCategory(c) for c in category if c in FeedCategory.__members__]

    # Get items
    items = service.get_feed_items(
        smmm_id=smmm_id,
        client_id=client_id,
        period=period,
        severity_filter=severity_filter,
        category_filter=category_filter
    )

    # Build warnings if no data
    warnings = []
    if not items:
        warnings.append({
            "type": "no_data",
            "message": "Bu donem icin veri bulunamadi. Mizan, beyanname veya e-fatura yukleyin."
        })

    return {
        "schema": {
            "name": "FeedResponse",
            "version": "2.0.0",
            "generated_at": datetime.now().isoformat()
        },
        "meta": {
            "smmm_id": smmm_id,
            "client_id": client_id,
            "period": period,
            "request_id": f"FEED-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "trust_level": "system_generated"
        },
        "data": [item.to_dict() for item in items[offset:offset + limit]],
        "total": len(items),
        "limit": limit,
        "offset": offset,
        "errors": [],
        "warnings": warnings
    }


@router.get("/{period}/critical")
async def get_critical_feed(
    period: str,
    client_id: str = Query(...),
    limit: int = Query(200, ge=1, le=1000, description="Max item sayısı (VT-8)"),
    offset: int = Query(0, ge=0, description="Sayfa offset"),
    user: dict = Depends(verify_token),
):
    """
    Get only CRITICAL and HIGH severity items
    Used for Evidence Bundle generation
    """
    period = normalize_period_db(period)
    await check_client_access(user, client_id)
    smmm_id = user["id"]
    service = get_feed_service()
    items = service.get_critical_and_high(smmm_id, client_id, period)

    return {
        "schema": {
            "name": "FeedCriticalResponse",
            "version": "2.0.0",
            "generated_at": datetime.now().isoformat()
        },
        "meta": {
            "smmm_id": smmm_id,
            "client_id": client_id,
            "period": period,
            "filter": "CRITICAL,HIGH"
        },
        "data": [item.to_dict() for item in items[offset:offset + limit]],
        "total": len(items),
        "limit": limit,
        "offset": offset,
        "errors": [],
        "warnings": []
    }
