"""
LYNTOS Checklist Persistence API
=================================
/api/v2/checklists/* endpoints
Kontrol listelerinin client_id + period_id bazında kalıcı saklanması.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import logging

from database.db import get_connection

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/checklists", tags=["Checklists"])


class ToggleRequest(BaseModel):
    client_id: str
    period_id: str
    item_index: int = Field(..., ge=0)
    checked: bool
    checked_by: Optional[str] = None


@router.get("/{checklist_id}/progress")
async def get_progress(
    checklist_id: str,
    client_id: str = Query(...),
    period_id: str = Query(...)
):
    """Belirli bir checklist'in ilerleme durumunu getir"""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT item_index, checked, checked_by, checked_at
                FROM checklist_progress
                WHERE checklist_id = ? AND client_id = ? AND period_id = ?
                ORDER BY item_index
            """, (checklist_id, client_id, period_id))
            rows = cursor.fetchall()
            items = {row["item_index"]: {
                "checked": bool(row["checked"]),
                "checked_by": row["checked_by"],
                "checked_at": row["checked_at"]
            } for row in rows}
            return {"success": True, "data": {"checklist_id": checklist_id, "items": items}}
    except Exception as e:
        logger.error(f"get_progress error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{checklist_id}/toggle")
async def toggle_item(checklist_id: str, req: ToggleRequest):
    """Tek bir öğeyi toggle et"""
    try:
        now = datetime.now().isoformat()
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO checklist_progress (client_id, period_id, checklist_id, item_index, checked, checked_by, checked_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(client_id, period_id, checklist_id, item_index)
                DO UPDATE SET checked = ?, checked_by = ?, checked_at = ?, updated_at = ?
            """, (
                req.client_id, req.period_id, checklist_id, req.item_index,
                1 if req.checked else 0, req.checked_by, now, now,
                1 if req.checked else 0, req.checked_by, now, now
            ))
            conn.commit()
        return {"success": True, "data": {
            "checklist_id": checklist_id,
            "item_index": req.item_index,
            "checked": req.checked
        }}
    except Exception as e:
        logger.error(f"toggle_item error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_summary(
    client_id: str = Query(...),
    period_id: str = Query(...)
):
    """Tüm checklist'lerin özet durumunu getir"""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT checklist_id,
                       COUNT(*) as total_items,
                       SUM(CASE WHEN checked = 1 THEN 1 ELSE 0 END) as checked_items
                FROM checklist_progress
                WHERE client_id = ? AND period_id = ?
                GROUP BY checklist_id
            """, (client_id, period_id))
            rows = cursor.fetchall()
            summary = {row["checklist_id"]: {
                "total_items": row["total_items"],
                "checked_items": row["checked_items"],
                "completion_pct": round(row["checked_items"] / row["total_items"] * 100) if row["total_items"] > 0 else 0
            } for row in rows}
            return {"success": True, "data": summary}
    except Exception as e:
        logger.error(f"get_summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
