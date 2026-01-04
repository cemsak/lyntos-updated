"""
RegWatch API with Expert Gate

Endpoints:
- GET /regwatch/status - Get current status (last 7 days)
- GET /regwatch/pending - Get pending approval events
- POST /regwatch/approve/{event_id} - Approve event (adds to Source Registry)
- POST /regwatch/reject/{event_id} - Reject event
- POST /regwatch/scrape - Trigger manual scrape
- GET /regwatch/statistics - Get statistics
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import json
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.db import get_connection
from services.regwatch_engine import regwatch_engine
from services.regwatch_scraper import run_all_scrapers

router = APIRouter()


class ApprovalRequest(BaseModel):
    expert_id: str
    notes: Optional[str] = None


class RejectionRequest(BaseModel):
    expert_id: str
    notes: Optional[str] = None


@router.get("/regwatch/status")
async def get_regwatch_status():
    """
    Get RegWatch status for last 7 days

    Returns change count, status (ACTIVE/BOOTSTRAP), and recent events
    """

    result = regwatch_engine.check_last_7_days()

    return {
        "schema": {
            "name": "regwatch_status",
            "version": "v2.0",
            "generated_at": datetime.utcnow().isoformat() + "Z"
        },
        "data": result
    }


@router.get("/regwatch/pending")
async def get_pending_events():
    """
    Get events pending expert approval

    These are mevzuat changes detected by scrapers that need
    expert review before being added to Source Registry.
    """

    events = regwatch_engine.get_pending_events()

    return {
        "schema": {
            "name": "regwatch_pending",
            "version": "v1.0",
            "generated_at": datetime.utcnow().isoformat() + "Z"
        },
        "data": {
            "pending_events": events,
            "total": len(events)
        }
    }


@router.post("/regwatch/approve/{event_id}")
async def approve_event(event_id: int, approval: ApprovalRequest):
    """
    Approve event and add to Source Registry

    Expert Gate workflow:
    1. Event detected by scraper → status: 'pending'
    2. Expert reviews and approves → status: 'approved'
    3. New source created in source_registry with SRC-XXXX ID
    """

    with get_connection() as conn:
        cursor = conn.cursor()

        # Get event
        cursor.execute(
            """
            SELECT id, event_type, source, title, canonical_url,
                   content_hash, impact_rules, status
            FROM regwatch_events
            WHERE id = ?
            """,
            [event_id]
        )

        row = cursor.fetchone()

        if not row:
            raise HTTPException(404, f"Event {event_id} not found")

        if row[7] != 'pending':
            raise HTTPException(400, f"Event {event_id} is already {row[7]}")

        event = {
            'id': row[0],
            'event_type': row[1],
            'source': row[2],
            'title': row[3],
            'canonical_url': row[4],
            'content_hash': row[5],
            'impact_rules': json.loads(row[6]) if row[6] else []
        }

        # Generate new source ID
        cursor.execute(
            "SELECT MAX(CAST(SUBSTR(id, 5) AS INTEGER)) FROM source_registry WHERE id LIKE 'SRC-%'"
        )
        result = cursor.fetchone()
        max_id = result[0] if result and result[0] else 0
        new_source_id = f"SRC-{max_id + 1:04d}"

        # Map source to kurum
        source_to_kurum = {
            'gib': 'GIB',
            'resmigazete': 'Resmi Gazete',
            'mevzuat': 'Mevzuat.gov.tr',
            'turmob': 'TURMOB'
        }
        kurum = source_to_kurum.get(event['source'], event['source'].upper())

        # Map event_type to tur
        type_to_tur = {
            'new': 'Yeni Mevzuat',
            'amendment': 'Teblig Degisikligi',
            'repeal': 'Ilga'
        }
        tur = type_to_tur.get(event['event_type'], 'Diger')

        # Add to source_registry
        cursor.execute(
            """
            INSERT INTO source_registry
            (id, kurum, tur, baslik, canonical_url, content_hash, version, kapsam_etiketleri, trust_class)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                new_source_id,
                kurum,
                tur,
                event['title'],
                event['canonical_url'],
                event['content_hash'],
                'v1.0',
                json.dumps(event['impact_rules']),
                'A'  # Tier 1 - Official source
            ]
        )

        # Update event status
        cursor.execute(
            """
            UPDATE regwatch_events
            SET status = 'approved',
                source_id = ?,
                approved_by = ?,
                approved_at = datetime('now'),
                expert_notes = ?
            WHERE id = ?
            """,
            [new_source_id, approval.expert_id, approval.notes, event_id]
        )

        conn.commit()

    return {
        "status": "approved",
        "event_id": event_id,
        "source_id": new_source_id,
        "approved_by": approval.expert_id,
        "message": f"Event approved and added to Source Registry as {new_source_id}"
    }


@router.post("/regwatch/reject/{event_id}")
async def reject_event(event_id: int, rejection: RejectionRequest):
    """
    Reject event

    Rejected events are not added to Source Registry.
    """

    with get_connection() as conn:
        cursor = conn.cursor()

        # Check event exists and is pending
        cursor.execute(
            "SELECT status FROM regwatch_events WHERE id = ?",
            [event_id]
        )

        row = cursor.fetchone()

        if not row:
            raise HTTPException(404, f"Event {event_id} not found")

        if row[0] != 'pending':
            raise HTTPException(400, f"Event {event_id} is already {row[0]}")

        # Update status
        cursor.execute(
            """
            UPDATE regwatch_events
            SET status = 'rejected',
                approved_by = ?,
                approved_at = datetime('now'),
                expert_notes = ?
            WHERE id = ?
            """,
            [rejection.expert_id, rejection.notes, event_id]
        )

        conn.commit()

    return {
        "status": "rejected",
        "event_id": event_id,
        "rejected_by": rejection.expert_id
    }


@router.post("/regwatch/scrape")
async def trigger_scrape(days: int = Query(default=7, ge=1, le=30)):
    """
    Trigger manual scrape of all sources

    This runs all scrapers and saves new events to the database.
    New events will have status 'pending' and need expert approval.
    """

    try:
        result = run_all_scrapers(days)
        return {
            "status": "success",
            "message": f"Scrape complete for last {days} days",
            "result": result
        }
    except Exception as e:
        raise HTTPException(500, f"Scrape failed: {str(e)}")


@router.get("/regwatch/statistics")
async def get_statistics():
    """Get RegWatch statistics"""

    stats = regwatch_engine.get_statistics()

    return {
        "schema": {
            "name": "regwatch_statistics",
            "version": "v1.0",
            "generated_at": datetime.utcnow().isoformat() + "Z"
        },
        "data": stats
    }


@router.get("/regwatch/sources")
async def get_sources():
    """Get list of monitored sources"""

    sources = regwatch_engine.get_sources()

    return {
        "schema": {
            "name": "regwatch_sources",
            "version": "v1.0",
            "generated_at": datetime.utcnow().isoformat() + "Z"
        },
        "data": {
            "sources": sources,
            "total": len(sources)
        }
    }
