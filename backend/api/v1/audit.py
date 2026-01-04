"""
Audit Log API

Endpoints for viewing audit trail and statistics.
"""

from fastapi import APIRouter, Depends, Query, Request
from typing import Optional
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from middleware.auth import verify_token
from utils.audit import get_audit_trail, get_audit_stats

router = APIRouter()


@router.get("/audit/trail")
async def get_trail(
    request: Request,
    client_id: Optional[str] = Query(None, description="Filter by client"),
    action: Optional[str] = Query(None, description="Filter by action"),
    limit: int = Query(100, le=1000, description="Max results"),
    user: dict = Depends(verify_token)
):
    """
    Get audit trail (Auth Required)

    Query params:
    - client_id: Filter by client
    - action: Filter by action
    - limit: Max results (default 100, max 1000)

    Non-admin users can only see their own actions.
    """

    # Non-admin can only see their own actions
    user_filter = None if user["role"] == "admin" else user["id"]

    trail = get_audit_trail(
        user_id=user_filter,
        client_id=client_id,
        action=action,
        limit=limit
    )

    return {
        "schema": {
            "name": "audit_trail",
            "version": "v1.0"
        },
        "data": {
            "trail": trail,
            "total": len(trail)
        }
    }


@router.get("/audit/stats")
async def get_stats(
    request: Request,
    days: int = Query(7, ge=1, le=90, description="Period in days"),
    user: dict = Depends(verify_token)
):
    """
    Get audit statistics (Auth Required, Admin Only)

    Returns action counts, user activity for specified period.
    """

    if user["role"] != "admin":
        # Non-admin gets limited stats
        return {
            "schema": {
                "name": "audit_stats",
                "version": "v1.0"
            },
            "data": {
                "message": "Full stats available for admin only",
                "your_actions": len(get_audit_trail(user_id=user["id"], limit=1000))
            }
        }

    stats = get_audit_stats(days=days)

    return {
        "schema": {
            "name": "audit_stats",
            "version": "v1.0"
        },
        "data": stats
    }
