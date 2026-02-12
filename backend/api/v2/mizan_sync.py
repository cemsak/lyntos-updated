"""
LYNTOS API v2 - Mizan (Trial Balance) Sync Endpoint
Receives parsed mizan data from frontend and persists to mizan_entries table.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import sqlite3
import logging

from middleware.auth import verify_token, check_client_access
from utils.period_utils import normalize_period_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/mizan", tags=["mizan-sync"])

# ============== PYDANTIC MODELS ==============

class MizanEntry(BaseModel):
    """Single mizan row (hesap kalemi)"""
    hesap_kodu: str
    hesap_adi: Optional[str] = None
    borc_toplam: float = 0
    alacak_toplam: float = 0
    borc_bakiye: float = 0
    alacak_bakiye: float = 0
    row_index: Optional[int] = None


class MizanMeta(BaseModel):
    """Mizan metadata"""
    tenant_id: str
    client_id: str
    period_id: str  # Format: YYYY-Q1, YYYY-Q2, etc.
    source_file: Optional[str] = None
    uploaded_at: Optional[str] = None


class MizanSyncRequest(BaseModel):
    """Full mizan sync payload"""
    meta: MizanMeta
    entries: List[MizanEntry]
    summary: Optional[Dict[str, Any]] = None  # Pre-calculated totals


class MizanSyncResponse(BaseModel):
    """Sync operation response"""
    success: bool
    synced_count: int
    error_count: int
    period_id: str
    totals: Dict[str, float]
    errors: List[str] = Field(default_factory=list)
    missing_data: Optional[Dict[str, Any]] = None
    actions: List[str] = Field(default_factory=list)


class MizanSummary(BaseModel):
    """Period mizan summary"""
    period_id: str
    tenant_id: str
    client_id: str
    entry_count: int
    toplam_borc: float
    toplam_alacak: float
    borc_bakiye_toplam: float
    alacak_bakiye_toplam: float
    aktif_toplam: float  # Hesap kodu 1xx, 2xx
    pasif_toplam: float  # Hesap kodu 3xx, 4xx, 5xx
    gelir_toplam: float  # Hesap kodu 6xx
    gider_toplam: float  # Hesap kodu 7xx
    synced_at: Optional[str] = None


# ============== DATABASE HELPERS ==============

def get_db_connection():
    """Get SQLite connection"""
    db_path = "database/lyntos.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


# ============== ENDPOINTS ==============

@router.post("/sync", response_model=MizanSyncResponse)
async def sync_mizan_data(request: MizanSyncRequest, user: dict = Depends(verify_token)):
    """
    Sync parsed mizan data from frontend to database.

    This endpoint:
    1. Validates the incoming payload
    2. Deletes existing entries for the period (full replace)
    3. Inserts all new entries
    4. Returns sync results with totals
    """

    # Override tenant_id with authenticated user's ID
    smmm_id = user["id"]
    request.meta.tenant_id = smmm_id

    errors: List[str] = []
    synced_count = 0
    error_count = 0

    # Validate required meta fields
    if not request.meta.tenant_id or not request.meta.client_id or not request.meta.period_id:
        return MizanSyncResponse(
            success=False,
            synced_count=0,
            error_count=0,
            period_id=request.meta.period_id or "",
            totals={},
            errors=["Missing required meta fields: tenant_id, client_id, period_id"],
            missing_data={"fields": ["tenant_id", "client_id", "period_id"]},
            actions=["Provide valid meta information"]
        )

    await check_client_access(user, request.meta.client_id)

    if not request.entries or len(request.entries) == 0:
        return MizanSyncResponse(
            success=True,
            synced_count=0,
            error_count=0,
            period_id=request.meta.period_id,
            totals={
                "borc_toplam": 0,
                "alacak_toplam": 0,
                "borc_bakiye": 0,
                "alacak_bakiye": 0
            },
            errors=[],
            missing_data={"reason": "No entries to sync"},
            actions=["Upload and parse mizan file first"]
        )

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Delete existing entries for this period (full replace strategy)
        cursor.execute("""
            DELETE FROM mizan_entries
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        """, (request.meta.tenant_id, request.meta.client_id, request.meta.period_id))

        deleted_count = cursor.rowcount
        logger.info(f"Deleted {deleted_count} existing mizan entries for {request.meta.period_id}")

        # Insert new entries
        now = datetime.utcnow().isoformat()

        for idx, entry in enumerate(request.entries):
            try:
                cursor.execute("""
                    INSERT INTO mizan_entries (
                        tenant_id, client_id, period_id,
                        hesap_kodu, hesap_adi,
                        borc_toplam, alacak_toplam, borc_bakiye, alacak_bakiye,
                        source_file, row_index,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    request.meta.tenant_id,
                    request.meta.client_id,
                    request.meta.period_id,
                    entry.hesap_kodu,
                    entry.hesap_adi,
                    entry.borc_toplam,
                    entry.alacak_toplam,
                    entry.borc_bakiye,
                    entry.alacak_bakiye,
                    request.meta.source_file,
                    entry.row_index or idx,
                    now,
                    now
                ))
                synced_count += 1

            except sqlite3.Error as e:
                error_msg = f"Error inserting row {idx} ({entry.hesap_kodu}): {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
                error_count += 1

        conn.commit()

        # Calculate totals
        cursor.execute("""
            SELECT
                SUM(borc_toplam) as toplam_borc,
                SUM(alacak_toplam) as toplam_alacak,
                SUM(borc_bakiye) as borc_bakiye_toplam,
                SUM(alacak_bakiye) as alacak_bakiye_toplam
            FROM mizan_entries
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        """, (request.meta.tenant_id, request.meta.client_id, request.meta.period_id))

        totals_row = cursor.fetchone()
        totals = {
            "borc_toplam": totals_row["toplam_borc"] or 0,
            "alacak_toplam": totals_row["toplam_alacak"] or 0,
            "borc_bakiye": totals_row["borc_bakiye_toplam"] or 0,
            "alacak_bakiye": totals_row["alacak_bakiye_toplam"] or 0
        }

    except sqlite3.Error as e:
        error_msg = f"Database error: {str(e)}"
        logger.error(error_msg)
        return MizanSyncResponse(
            success=False,
            synced_count=synced_count,
            error_count=error_count + 1,
            period_id=request.meta.period_id,
            totals={},
            errors=[error_msg],
            missing_data=None,
            actions=["Check database connection", "Verify mizan_entries table exists"]
        )
    finally:
        if conn:
            conn.close()

    return MizanSyncResponse(
        success=error_count == 0,
        synced_count=synced_count,
        error_count=error_count,
        period_id=request.meta.period_id,
        totals=totals,
        errors=errors,
        missing_data=None,
        actions=[] if error_count == 0 else ["Review failed entries"]
    )


@router.get("/summary/{period_id}", response_model=MizanSummary)
async def get_mizan_summary(period_id: str, client_id: str, user: dict = Depends(verify_token)):
    """
    Get mizan summary for a specific period.
    Includes totals grouped by account type (aktif, pasif, gelir, gider).
    """
    smmm_id = user["id"]
    period_id = normalize_period_db(period_id)  # M-02: 2025-Q1 → 2025_Q1
    await check_client_access(user, client_id)

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get entry count and totals
        cursor.execute("""
            SELECT
                COUNT(*) as entry_count,
                SUM(borc_toplam) as toplam_borc,
                SUM(alacak_toplam) as toplam_alacak,
                SUM(borc_bakiye) as borc_bakiye_toplam,
                SUM(alacak_bakiye) as alacak_bakiye_toplam,
                MAX(updated_at) as synced_at
            FROM mizan_entries
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        """, (smmm_id, client_id, period_id))

        row = cursor.fetchone()

        if not row or row["entry_count"] == 0:
            raise HTTPException(status_code=404, detail=f"No mizan data for period {period_id}")

        # Get account type totals
        cursor.execute("""
            SELECT
                SUBSTR(hesap_kodu, 1, 1) as hesap_grubu,
                SUM(borc_bakiye) as borc_bakiye,
                SUM(alacak_bakiye) as alacak_bakiye
            FROM mizan_entries
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
            GROUP BY SUBSTR(hesap_kodu, 1, 1)
        """, (smmm_id, client_id, period_id))

        account_groups = {r["hesap_grubu"]: dict(r) for r in cursor.fetchall()}

        # Calculate totals by type
        # 1xx = Donen Varliklar (Aktif)
        # 2xx = Duran Varliklar (Aktif)
        # 3xx = Kisa Vadeli Yabanci Kaynaklar (Pasif)
        # 4xx = Uzun Vadeli Yabanci Kaynaklar (Pasif)
        # 5xx = Ozkaynaklar (Pasif)
        # 6xx = Gelir Tablosu (Gelir)
        # 7xx = Maliyet Hesaplari (Gider)

        aktif_toplam = sum(
            (account_groups.get(g, {}).get("borc_bakiye", 0) or 0) -
            (account_groups.get(g, {}).get("alacak_bakiye", 0) or 0)
            for g in ["1", "2"]
        )

        pasif_toplam = sum(
            (account_groups.get(g, {}).get("alacak_bakiye", 0) or 0) -
            (account_groups.get(g, {}).get("borc_bakiye", 0) or 0)
            for g in ["3", "4", "5"]
        )

        gelir_toplam = (
            (account_groups.get("6", {}).get("alacak_bakiye", 0) or 0) -
            (account_groups.get("6", {}).get("borc_bakiye", 0) or 0)
        )

        gider_toplam = (
            (account_groups.get("7", {}).get("borc_bakiye", 0) or 0) -
            (account_groups.get("7", {}).get("alacak_bakiye", 0) or 0)
        )

        return MizanSummary(
            period_id=period_id,
            tenant_id=smmm_id,
            client_id=client_id,
            entry_count=row["entry_count"],
            toplam_borc=row["toplam_borc"] or 0,
            toplam_alacak=row["toplam_alacak"] or 0,
            borc_bakiye_toplam=row["borc_bakiye_toplam"] or 0,
            alacak_bakiye_toplam=row["alacak_bakiye_toplam"] or 0,
            aktif_toplam=aktif_toplam,
            pasif_toplam=pasif_toplam,
            gelir_toplam=gelir_toplam,
            gider_toplam=gider_toplam,
            synced_at=row["synced_at"]
        )

    except HTTPException:
        raise
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


@router.get("/entries/{period_id}")
async def get_mizan_entries(
    period_id: str,
    client_id: str,
    user: dict = Depends(verify_token),
    hesap_prefix: Optional[str] = None,
    limit: int = 1000,
    offset: int = 0
):
    """
    Get mizan entries for a specific period.
    Optionally filter by account code prefix (e.g., "100" for cash accounts).
    """
    smmm_id = user["id"]
    period_id = normalize_period_db(period_id)  # M-02
    await check_client_access(user, client_id)

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
            SELECT hesap_kodu, hesap_adi, borc_toplam, alacak_toplam, borc_bakiye, alacak_bakiye
            FROM mizan_entries
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        """
        params: List[Any] = [smmm_id, client_id, period_id]

        if hesap_prefix:
            query += " AND hesap_kodu LIKE ?"
            params.append(f"{hesap_prefix}%")

        query += " ORDER BY hesap_kodu LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        entries = [dict(row) for row in cursor.fetchall()]

        # Get total count
        count_query = """
            SELECT COUNT(*) as total FROM mizan_entries
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        """
        count_params: List[Any] = [smmm_id, client_id, period_id]

        if hesap_prefix:
            count_query += " AND hesap_kodu LIKE ?"
            count_params.append(f"{hesap_prefix}%")

        cursor.execute(count_query, count_params)
        total = cursor.fetchone()["total"]

        return {
            "period_id": period_id,
            "entries": entries,
            "total": total,
            "limit": limit,
            "offset": offset
        }

    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()


@router.delete("/clear/{period_id}")
async def clear_mizan_data(period_id: str, client_id: str, user: dict = Depends(verify_token)):
    """
    Delete all mizan entries for a specific period.
    """
    smmm_id = user["id"]
    period_id = normalize_period_db(period_id)  # M-02
    await check_client_access(user, client_id)

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM mizan_entries
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        """, (smmm_id, client_id, period_id))

        deleted_count = cursor.rowcount
        conn.commit()

        return {
            "success": True,
            "deleted_count": deleted_count,
            "period_id": period_id
        }

    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()
