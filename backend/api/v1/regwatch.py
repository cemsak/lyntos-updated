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

from fastapi import APIRouter, HTTPException, Query, Depends
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
from services.regwatch_scraper import run_all_scrapers, detect_parameter_changes
from middleware.auth import verify_token
import uuid

router = APIRouter()


class ApprovalRequest(BaseModel):
    expert_id: str
    notes: Optional[str] = None


class RejectionRequest(BaseModel):
    expert_id: str
    notes: Optional[str] = None


@router.get("/regwatch/status")
async def get_regwatch_status(user: dict = Depends(verify_token)):
    """
    Get RegWatch status for last 7 days (Auth Required)

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
async def get_pending_events(user: dict = Depends(verify_token)):
    """
    Get events pending expert approval (Auth Required)

    These are mevzuat changes detected by scrapers that need
    expert review before being added to Source Registry.
    """
    # Role check - only admin/smmm can view pending
    if user.get("role") not in ["admin", "smmm"]:
        raise HTTPException(403, "Bu işlem için yetkiniz yok")

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
async def approve_event(event_id: int, approval: ApprovalRequest, user: dict = Depends(verify_token)):
    """
    Approve event and add to Source Registry (Auth + Role Required)

    Expert Gate workflow:
    1. Event detected by scraper → status: 'pending'
    2. Expert reviews and approves → status: 'approved'
    3. New source created in source_registry with SRC-XXXX ID
    """
    # Role check - only admin/smmm can approve
    if user.get("role") not in ["admin", "smmm"]:
        raise HTTPException(403, "Bu işlem için yetkiniz yok")

    # Override expert_id with authenticated user
    approval.expert_id = user["id"]

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
async def reject_event(event_id: int, rejection: RejectionRequest, user: dict = Depends(verify_token)):
    """
    Reject event (Auth + Role Required)

    Rejected events are not added to Source Registry.
    """
    # Role check - only admin/smmm can reject
    if user.get("role") not in ["admin", "smmm"]:
        raise HTTPException(403, "Bu işlem için yetkiniz yok")

    # Override expert_id with authenticated user
    rejection.expert_id = user["id"]

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
async def trigger_scrape(days: int = Query(default=7, ge=1, le=30), user: dict = Depends(verify_token)):
    """
    Trigger manual scrape of all sources (Auth + Admin Required)

    This runs all scrapers and saves new events to the database.
    New events will have status 'pending' and need expert approval.
    """
    # Role check - only admin can trigger scrape
    if user.get("role") != "admin":
        raise HTTPException(403, "Bu işlem sadece admin için geçerli")

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
async def get_statistics(user: dict = Depends(verify_token)):
    """Get RegWatch statistics (Auth Required)"""

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
async def get_sources(user: dict = Depends(verify_token)):
    """Get list of monitored sources (Auth Required)"""

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


# ============================================================
# TAX PARAMETERS API - Sprint R1
# ============================================================

class TaxParameterUpdate(BaseModel):
    """Request model for updating a tax parameter"""
    param_value: float
    effective_date: str  # YYYY-MM-DD
    legal_reference: Optional[str] = None
    source_url: Optional[str] = None
    notes: Optional[str] = None


@router.get("/regwatch/parameters")
async def get_tax_parameters(
    category: Optional[str] = Query(None, description="Filter by category (e.g., KURUMLAR_VERGISI, KDV)"),
    valid_at: Optional[str] = Query(None, description="Get parameters valid at date (YYYY-MM-DD)"),
    user: dict = Depends(verify_token)
):
    """
    Get all tax parameters (Auth Required)

    Returns current and historical tax rates, limits, and values.
    Use ?category=KURUMLAR_VERGISI to filter by category.
    Use ?valid_at=2025-01-01 to get rates valid at a specific date.
    """

    with get_connection() as conn:
        cursor = conn.cursor()

        # Build query
        query = """
            SELECT id, category, param_key, param_value, param_unit,
                   valid_from, valid_until, legal_reference, source_url,
                   created_at, updated_at
            FROM tax_parameters
            WHERE 1=1
        """
        params = []

        if category:
            query += " AND category = ?"
            params.append(category)

        if valid_at:
            query += " AND valid_from <= ? AND (valid_until IS NULL OR valid_until >= ?)"
            params.extend([valid_at, valid_at])
        else:
            # By default, get current valid parameters
            query += " AND (valid_until IS NULL OR valid_until >= date('now'))"

        query += " ORDER BY category, param_key, valid_from DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()

        parameters = []
        for row in rows:
            parameters.append({
                "id": row[0],
                "category": row[1],
                "param_key": row[2],
                "param_value": row[3],
                "param_unit": row[4],
                "valid_from": row[5],
                "valid_until": row[6],
                "legal_reference": row[7],
                "source_url": row[8],
                "created_at": row[9],
                "updated_at": row[10]
            })

        # Group by category
        by_category = {}
        for param in parameters:
            cat = param["category"]
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(param)

    return {
        "schema": {
            "name": "tax_parameters",
            "version": "v1.0",
            "generated_at": datetime.now().isoformat() + "Z"
        },
        "data": {
            "parameters": parameters,
            "by_category": by_category,
            "total": len(parameters)
        }
    }


@router.get("/regwatch/parameters/{category}")
async def get_parameters_by_category(
    category: str,
    user: dict = Depends(verify_token)
):
    """
    Get tax parameters for a specific category (Auth Required)

    Categories: KURUMLAR_VERGISI, KDV, AR_GE, TEKNOKENT, SGK, ASGARI_UCRET, etc.
    """

    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, category, param_key, param_value, param_unit,
                   valid_from, valid_until, legal_reference, source_url
            FROM tax_parameters
            WHERE category = ?
            AND (valid_until IS NULL OR valid_until >= date('now'))
            ORDER BY param_key
        """, [category.upper()])

        rows = cursor.fetchall()

        if not rows:
            raise HTTPException(404, f"Category '{category}' not found or has no valid parameters")

        parameters = []
        for row in rows:
            parameters.append({
                "id": row[0],
                "category": row[1],
                "param_key": row[2],
                "param_value": row[3],
                "param_unit": row[4],
                "valid_from": row[5],
                "valid_until": row[6],
                "legal_reference": row[7],
                "source_url": row[8]
            })

    return {
        "schema": {
            "name": f"tax_parameters_{category.lower()}",
            "version": "v1.0",
            "generated_at": datetime.now().isoformat() + "Z"
        },
        "data": {
            "category": category.upper(),
            "parameters": parameters,
            "total": len(parameters)
        }
    }


@router.get("/regwatch/parameters/key/{param_key}")
async def get_parameter_by_key(
    param_key: str,
    include_history: bool = Query(False, description="Include historical values"),
    user: dict = Depends(verify_token)
):
    """
    Get a specific tax parameter by key (Auth Required)

    Example: /regwatch/parameters/key/kv_genel_oran
    """

    with get_connection() as conn:
        cursor = conn.cursor()

        if include_history:
            cursor.execute("""
                SELECT id, category, param_key, param_value, param_unit,
                       valid_from, valid_until, legal_reference, source_url, updated_at
                FROM tax_parameters
                WHERE param_key = ?
                ORDER BY valid_from DESC
            """, [param_key])
        else:
            cursor.execute("""
                SELECT id, category, param_key, param_value, param_unit,
                       valid_from, valid_until, legal_reference, source_url, updated_at
                FROM tax_parameters
                WHERE param_key = ?
                AND (valid_until IS NULL OR valid_until >= date('now'))
                ORDER BY valid_from DESC
                LIMIT 1
            """, [param_key])

        rows = cursor.fetchall()

        if not rows:
            raise HTTPException(404, f"Parameter '{param_key}' not found")

        values = []
        for row in rows:
            values.append({
                "id": row[0],
                "category": row[1],
                "param_key": row[2],
                "param_value": row[3],
                "param_unit": row[4],
                "valid_from": row[5],
                "valid_until": row[6],
                "legal_reference": row[7],
                "source_url": row[8],
                "updated_at": row[9]
            })

    return {
        "schema": {
            "name": f"tax_parameter_{param_key}",
            "version": "v1.0",
            "generated_at": datetime.now().isoformat() + "Z"
        },
        "data": {
            "current": values[0],
            "history": values if include_history else None,
            "total_versions": len(values)
        }
    }


@router.get("/regwatch/changes")
async def get_parameter_changes(
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    user: dict = Depends(verify_token)
):
    """
    Get recent tax parameter changes (Auth Required)

    Returns detected changes from RegWatch events and manual updates.
    """

    with get_connection() as conn:
        cursor = conn.cursor()

        # Get changes from change log
        cursor.execute("""
            SELECT cl.id, cl.param_id, tp.category, tp.param_key,
                   cl.old_value, cl.new_value, cl.change_type,
                   cl.effective_date, cl.detected_at, cl.source_document
            FROM tax_change_log cl
            JOIN tax_parameters tp ON cl.param_id = tp.id
            WHERE cl.detected_at >= date('now', '-' || ? || ' days')
            ORDER BY cl.detected_at DESC
        """, [days])

        rows = cursor.fetchall()

        changes = []
        for row in rows:
            changes.append({
                "id": row[0],
                "param_id": row[1],
                "category": row[2],
                "param_key": row[3],
                "old_value": row[4],
                "new_value": row[5],
                "change_type": row[6],
                "effective_date": row[7],
                "detected_at": row[8],
                "source_document": row[9]
            })

        # Also get detected changes from regwatch events
        detected_changes = detect_parameter_changes()

    return {
        "schema": {
            "name": "tax_parameter_changes",
            "version": "v1.0",
            "generated_at": datetime.now().isoformat() + "Z"
        },
        "data": {
            "confirmed_changes": changes,
            "pending_detections": detected_changes,
            "lookback_days": days
        }
    }


@router.post("/regwatch/parameters/{param_key}/update")
async def update_tax_parameter(
    param_key: str,
    update: TaxParameterUpdate,
    user: dict = Depends(verify_token)
):
    """
    Update a tax parameter (Auth + Admin Required)

    Creates a new version of the parameter with the new value.
    The old version gets an end date (valid_until).
    """

    # Role check
    if user.get("role") not in ["admin", "smmm"]:
        raise HTTPException(403, "Bu islem icin yetkiniz yok")

    with get_connection() as conn:
        cursor = conn.cursor()

        # Get current parameter
        cursor.execute("""
            SELECT id, category, param_key, param_value, valid_from
            FROM tax_parameters
            WHERE param_key = ?
            AND (valid_until IS NULL OR valid_until >= date('now'))
            ORDER BY valid_from DESC
            LIMIT 1
        """, [param_key])

        current = cursor.fetchone()

        if not current:
            raise HTTPException(404, f"Parameter '{param_key}' not found")

        old_param_id = current[0]
        category = current[1]
        old_value = current[3]

        # End the current version
        cursor.execute("""
            UPDATE tax_parameters
            SET valid_until = ?,
                updated_at = datetime('now'),
                updated_by = ?
            WHERE id = ?
        """, [update.effective_date, user["id"], old_param_id])

        # Create new version
        new_param_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO tax_parameters (
                id, category, param_key, param_value, param_unit,
                valid_from, legal_reference, source_url, created_at, updated_by
            )
            SELECT ?, category, param_key, ?, param_unit, ?, ?, ?, datetime('now'), ?
            FROM tax_parameters WHERE id = ?
        """, [
            new_param_id,
            update.param_value,
            update.effective_date,
            update.legal_reference or current[1],  # Use existing if not provided
            update.source_url,
            user["id"],
            old_param_id
        ])

        # Log the change
        change_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO tax_change_log (
                id, param_id, old_value, new_value, change_type,
                effective_date, detected_at, source_document, impact_analysis
            ) VALUES (?, ?, ?, ?, 'manual_update', ?, datetime('now'), ?, ?)
        """, [
            change_id,
            new_param_id,
            old_value,
            update.param_value,
            update.effective_date,
            update.source_url or '',
            update.notes or ''
        ])

        conn.commit()

    return {
        "status": "success",
        "message": f"Parameter '{param_key}' updated",
        "data": {
            "param_key": param_key,
            "old_value": old_value,
            "new_value": update.param_value,
            "effective_date": update.effective_date,
            "updated_by": user["id"]
        }
    }


@router.get("/regwatch/parameters/summary")
async def get_parameters_summary(user: dict = Depends(verify_token)):
    """
    Get summary of all tax parameters (Auth Required)

    Returns key rates for quick reference in UI.
    """

    with get_connection() as conn:
        cursor = conn.cursor()

        # Get current key parameters
        cursor.execute("""
            SELECT category, param_key, param_value, param_unit
            FROM tax_parameters
            WHERE (valid_until IS NULL OR valid_until >= date('now'))
            AND param_key IN (
                'kv_genel_oran', 'asgari_kv_oran', 'kv_ihracat_indirimi',
                'kdv_genel_oran', 'kdv_indirimli_oran_1', 'kdv_indirimli_oran_2',
                'asgari_ucret_brut', 'sgk_isveren_payi',
                'arge_stopaj_indirimi_lisans'
            )
            ORDER BY category, param_key
        """)

        rows = cursor.fetchall()

        summary = {}
        for row in rows:
            category = row[0]
            if category not in summary:
                summary[category] = {}
            summary[category][row[1]] = {
                "value": row[2],
                "unit": row[3]
            }

    return {
        "schema": {
            "name": "tax_parameters_summary",
            "version": "v1.0",
            "generated_at": datetime.now().isoformat() + "Z"
        },
        "data": {
            "summary": summary,
            "key_rates": {
                "kurumlar_vergisi": summary.get("KURUMLAR_VERGISI", {}).get("kv_genel_oran", {}).get("value"),
                "asgari_kv": summary.get("KURUMLAR_VERGISI", {}).get("asgari_kv_oran", {}).get("value"),
                "kdv_genel": summary.get("KDV", {}).get("kdv_genel_oran", {}).get("value"),
                "asgari_ucret": summary.get("ASGARI_UCRET", {}).get("asgari_ucret_brut", {}).get("value")
            }
        }
    }
