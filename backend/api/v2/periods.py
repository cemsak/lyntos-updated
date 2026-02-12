"""
Period (Dönem) Management API
Sprint 3: CRUD + Time-Shield + Document Status

Endpoints:
- GET    /api/v2/periods/{client_id}                    - List periods for client
- GET    /api/v2/periods/{client_id}/{period_code}      - Get single period
- POST   /api/v2/periods/                               - Create period
- POST   /api/v2/periods/ensure                         - Ensure period exists
- GET    /api/v2/periods/{client_id}/{period_code}/status - Document status
- DELETE /api/v2/periods/{client_id}/{period_code}      - Delete period

Time-Shield:
- If period end_date > today: is_future=True, missing_docs=[]
- If period end_date <= today: is_future=False, missing_docs=[list]
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime, date
from pathlib import Path
import sqlite3

from middleware.auth import verify_token, check_client_access

router = APIRouter(prefix="/periods", tags=["periods"])

DB_PATH = Path(__file__).parent.parent.parent / "database" / "lyntos.db"


# ============== MODELS ==============

class PeriodCreate(BaseModel):
    """Create period request"""
    client_id: str
    period_code: str  # "2025-Q1"

    @field_validator('period_code')
    @classmethod
    def validate_period_code(cls, v):
        if not v or '-Q' not in v.upper():
            raise ValueError('Period format: YYYY-QN (örn: 2025-Q1)')
        parts = v.upper().split('-Q')
        if len(parts) != 2 or not parts[0].isdigit() or parts[1] not in ['1','2','3','4']:
            raise ValueError('Period format: YYYY-QN (örn: 2025-Q1)')
        return v.upper()


class PeriodResponse(BaseModel):
    """Period response"""
    id: str
    client_id: str
    period_code: str
    start_date: str
    end_date: str
    status: str
    is_future: bool  # Time-Shield flag
    is_complete: bool
    document_count: int
    created_at: Optional[str]


class PeriodDocumentStatus(BaseModel):
    """Period document status with Time-Shield"""
    period_id: str
    period_code: str
    client_id: str
    is_future: bool

    # Document counts
    required_doc_types: List[str]
    uploaded_doc_types: List[str]
    missing_doc_types: List[str]  # Empty if is_future=True (Time-Shield)

    # Progress
    completion_pct: float
    total_documents: int

    # Details per doc type
    document_details: List[dict]


class EnsurePeriodRequest(BaseModel):
    """Ensure period exists request"""
    client_id: str
    period_code: str


# ============== HELPERS ==============

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_period_dates(period_code: str) -> tuple:
    """
    Convert period code to start/end dates.

    Args:
        period_code: "2025-Q1" format

    Returns:
        (start_date, end_date) as "YYYY-MM-DD" strings
    """
    parts = period_code.upper().split('-Q')
    year = int(parts[0])
    quarter = int(parts[1])

    quarter_map = {
        1: ("01-01", "03-31"),
        2: ("04-01", "06-30"),
        3: ("07-01", "09-30"),
        4: ("10-01", "12-31"),
    }

    start_suffix, end_suffix = quarter_map[quarter]
    return f"{year}-{start_suffix}", f"{year}-{end_suffix}"


def is_period_future(end_date: str) -> bool:
    """
    TIME-SHIELD: Check if period end date is in the future.

    If True, the period is still ongoing and missing docs should NOT be flagged.
    """
    try:
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        return end > date.today()
    except (ValueError, TypeError):
        return False


def get_required_doc_types() -> List[str]:
    """Get list of required document types for a complete period"""
    return [
        "MIZAN",           # Dönem sonu mizan
        "BANKA",           # Banka ekstresi
        "BEYANNAME",       # KDV/Muhtasar beyannameleri
        "TAHAKKUK",        # Vergi tahakkukları
        "EDEFTER_BERAT",   # E-defter beratları
        "EFATURA_ARSIV",   # E-fatura/E-arşiv listesi
    ]


# ============== UTILITY (MUST BE BEFORE DYNAMIC ROUTES) ==============

@router.get("/utils/current-period")
async def get_current_period(user: dict = Depends(verify_token)):
    """Get current period code based on today's date"""
    today = date.today()
    year = today.year

    if today.month <= 3:
        quarter = 1
    elif today.month <= 6:
        quarter = 2
    elif today.month <= 9:
        quarter = 3
    else:
        quarter = 4

    period_code = f"{year}-Q{quarter}"
    start_date, end_date = get_period_dates(period_code)

    return {
        "period_code": period_code,
        "year": year,
        "quarter": quarter,
        "start_date": start_date,
        "end_date": end_date,
        "is_future": is_period_future(end_date)
    }


# ============== CRUD ENDPOINTS ==============

@router.get("/{client_id}", response_model=List[PeriodResponse])
async def list_periods(client_id: str, user: dict = Depends(verify_token)):
    """List all periods for a client, sorted by date descending"""
    await check_client_access(user, client_id)
    conn = get_db()
    cursor = conn.cursor()

    # Verify client exists
    cursor.execute("SELECT id FROM clients WHERE id = ?", (client_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail=f"Mükellef bulunamadı: {client_id}")

    # P-5: Correlated subquery → LEFT JOIN ile optimizasyon
    cursor.execute("""
        SELECT p.*,
               COALESCE(dc.cnt, 0) as doc_count
        FROM periods p
        LEFT JOIN (
            SELECT client_id, period_id, COUNT(*) as cnt
            FROM document_uploads
            WHERE client_id = ?
            GROUP BY client_id, period_id
        ) dc ON dc.client_id = p.client_id AND dc.period_id = p.period_code
        WHERE p.client_id = ?
        ORDER BY p.start_date DESC
    """, (client_id, client_id))

    rows = cursor.fetchall()
    conn.close()

    result = []
    required_count = len(get_required_doc_types())

    for row in rows:
        is_future = is_period_future(row["end_date"])
        doc_count = row["doc_count"] or 0
        is_complete = doc_count >= required_count and not is_future

        result.append({
            "id": row["id"],
            "client_id": row["client_id"],
            "period_code": row["period_code"],
            "start_date": row["start_date"],
            "end_date": row["end_date"],
            "status": row["status"],
            "is_future": is_future,
            "is_complete": is_complete,
            "document_count": doc_count,
            "created_at": row["created_at"],
        })

    return result


@router.get("/{client_id}/{period_code}", response_model=PeriodResponse)
async def get_period(client_id: str, period_code: str, user: dict = Depends(verify_token)):
    """Get single period"""
    await check_client_access(user, client_id)
    conn = get_db()
    cursor = conn.cursor()

    # Format standardizasyonu: 2025-Q1 -> 2025_Q1 (alt çizgi kullan)
    period_normalized = period_code.upper().replace('-', '_')
    period_id = f"{client_id}_{period_normalized}"

    # P-5: Correlated subquery → LEFT JOIN
    cursor.execute("""
        SELECT p.*,
               COALESCE(dc.cnt, 0) as doc_count
        FROM periods p
        LEFT JOIN (
            SELECT client_id, period_id, COUNT(*) as cnt
            FROM document_uploads
            WHERE client_id = ? AND period_id = ?
        ) dc ON dc.client_id = p.client_id AND dc.period_id = p.period_code
        WHERE p.id = ?
    """, (client_id, period_normalized, period_id))

    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail=f"Dönem bulunamadı: {period_code}")

    is_future = is_period_future(row["end_date"])
    doc_count = row["doc_count"] or 0
    required_count = len(get_required_doc_types())
    is_complete = doc_count >= required_count and not is_future

    return {
        "id": row["id"],
        "client_id": row["client_id"],
        "period_code": row["period_code"],
        "start_date": row["start_date"],
        "end_date": row["end_date"],
        "status": row["status"],
        "is_future": is_future,
        "is_complete": is_complete,
        "document_count": doc_count,
        "created_at": row["created_at"],
    }


@router.post("/", response_model=PeriodResponse)
async def create_period(period: PeriodCreate, user: dict = Depends(verify_token)):
    """Create new period for client"""
    await check_client_access(user, period.client_id)
    conn = get_db()
    cursor = conn.cursor()

    # Verify client exists
    cursor.execute("SELECT id FROM clients WHERE id = ?", (period.client_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail=f"Mükellef bulunamadı: {period.client_id}")

    period_code = period.period_code.upper()
    # Format standardizasyonu: 2025-Q1 -> 2025_Q1 (alt çizgi kullan)
    period_normalized = period_code.replace('-', '_')
    period_id = f"{period.client_id}_{period_normalized}"

    # Check if exists
    cursor.execute("SELECT id FROM periods WHERE id = ?", (period_id,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=409, detail=f"Dönem zaten var: {period_code}")

    # Get dates
    start_date, end_date = get_period_dates(period_code)

    try:
        cursor.execute("""
            INSERT INTO periods (id, client_id, period_code, start_date, end_date, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            period_id, period.client_id, period_code,
            start_date, end_date, "active", datetime.now().isoformat()
        ))

        conn.commit()
    except sqlite3.Error:
        conn.rollback()
        raise
    finally:
        conn.close()

    is_future = is_period_future(end_date)

    return {
        "id": period_id,
        "client_id": period.client_id,
        "period_code": period_code,
        "start_date": start_date,
        "end_date": end_date,
        "status": "active",
        "is_future": is_future,
        "is_complete": False,
        "document_count": 0,
        "created_at": datetime.now().isoformat(),
    }


@router.post("/ensure")
async def ensure_period(request: EnsurePeriodRequest, user: dict = Depends(verify_token)):
    """
    Ensure period exists - create if not.
    Used for auto-creation during document upload.
    """
    await check_client_access(user, request.client_id)
    conn = get_db()
    cursor = conn.cursor()

    period_code = request.period_code.upper()
    # Format standardizasyonu: 2025-Q1 -> 2025_Q1 (alt çizgi kullan)
    period_normalized = period_code.replace('-', '_')
    period_id = f"{request.client_id}_{period_normalized}"

    # Check if exists
    cursor.execute("SELECT id FROM periods WHERE id = ?", (period_id,))
    existing = cursor.fetchone()

    if existing:
        conn.close()
        return {"status": "exists", "period_id": period_id, "created": False}

    # Verify client exists
    cursor.execute("SELECT id FROM clients WHERE id = ?", (request.client_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail=f"Mükellef bulunamadı: {request.client_id}")

    # Create
    start_date, end_date = get_period_dates(period_code)

    try:
        cursor.execute("""
            INSERT INTO periods (id, client_id, period_code, start_date, end_date, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            period_id, request.client_id, period_code,
            start_date, end_date, "active", datetime.now().isoformat()
        ))

        conn.commit()
    except sqlite3.Error:
        conn.rollback()
        raise
    finally:
        conn.close()

    return {"status": "created", "period_id": period_id, "created": True}


@router.delete("/{client_id}/{period_code}")
async def delete_period(client_id: str, period_code: str, user: dict = Depends(verify_token)):
    """Delete period (use with caution - may orphan documents)"""
    await check_client_access(user, client_id)
    conn = get_db()
    cursor = conn.cursor()

    # Format standardizasyonu: 2025-Q1 -> 2025_Q1 (alt çizgi kullan)
    period_normalized = period_code.upper().replace('-', '_')
    period_id = f"{client_id}_{period_normalized}"

    cursor.execute("SELECT id FROM periods WHERE id = ?", (period_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail=f"Dönem bulunamadı: {period_code}")

    # Check for documents
    cursor.execute("""
        SELECT COUNT(*) FROM document_uploads
        WHERE client_id = ? AND period_id = ?
    """, (client_id, period_code.upper()))
    doc_count = cursor.fetchone()[0]

    if doc_count > 0:
        conn.close()
        raise HTTPException(
            status_code=409,
            detail=f"Bu döneme ait {doc_count} belge var. Önce belgeleri silin."
        )

    try:
        cursor.execute("DELETE FROM periods WHERE id = ?", (period_id,))
        conn.commit()
    except sqlite3.Error:
        conn.rollback()
        raise
    finally:
        conn.close()

    return {"status": "deleted", "period_id": period_id}


# ============== DOCUMENT STATUS (TIME-SHIELD) ==============

@router.get("/{client_id}/{period_code}/status", response_model=PeriodDocumentStatus)
async def get_document_status(client_id: str, period_code: str, user: dict = Depends(verify_token)):
    """
    Get document upload status for a period.

    TIME-SHIELD LOGIC:
    - If period is_future=True: missing_doc_types will be EMPTY
    - If period is_future=False: missing_doc_types will list what's missing

    This prevents showing "Eksik: E-Fatura" for Q1 when we're still in January.
    """
    await check_client_access(user, client_id)
    conn = get_db()
    cursor = conn.cursor()

    period_code = period_code.upper()
    # Format standardizasyonu: 2025-Q1 -> 2025_Q1 (alt çizgi kullan)
    period_normalized = period_code.replace('-', '_')
    period_id = f"{client_id}_{period_normalized}"

    # Get period
    cursor.execute("SELECT * FROM periods WHERE id = ?", (period_id,))
    period = cursor.fetchone()

    if not period:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Dönem bulunamadı: {period_code}")

    is_future = is_period_future(period["end_date"])
    required_types = get_required_doc_types()

    # Get uploaded document types
    cursor.execute("""
        SELECT DISTINCT doc_type, COUNT(*) as count
        FROM document_uploads
        WHERE client_id = ? AND period_id = ?
        GROUP BY doc_type
    """, (client_id, period_code))

    uploaded_rows = cursor.fetchall()
    uploaded_types = [row["doc_type"] for row in uploaded_rows]

    # Get all documents for this period
    cursor.execute("""
        SELECT doc_type, original_filename as filename, created_at, parse_status as status
        FROM document_uploads
        WHERE client_id = ? AND period_id = ?
        ORDER BY doc_type, created_at DESC
    """, (client_id, period_code))

    documents = cursor.fetchall()
    conn.close()

    # Calculate missing types (TIME-SHIELD!)
    if is_future:
        # Period hasn't ended yet - don't flag anything as missing
        missing_types = []
    else:
        # Period ended - show what's missing
        missing_types = [t for t in required_types if t not in uploaded_types]

    # Build document details
    doc_details = []
    for doc_type in required_types:
        type_docs = [d for d in documents if d["doc_type"] == doc_type]

        if type_docs:
            status = "uploaded"
            files = [{"filename": d["filename"], "uploaded_at": d["created_at"]} for d in type_docs]
        elif is_future:
            status = "pending"  # Not missing, just pending
            files = []
        else:
            status = "missing"
            files = []

        doc_details.append({
            "doc_type": doc_type,
            "status": status,
            "count": len(type_docs),
            "files": files
        })

    # Calculate completion
    uploaded_required = len([t for t in uploaded_types if t in required_types])
    completion_pct = (uploaded_required / len(required_types)) * 100 if required_types else 100

    return {
        "period_id": period_id,
        "period_code": period_code,
        "client_id": client_id,
        "is_future": is_future,
        "required_doc_types": required_types,
        "uploaded_doc_types": uploaded_types,
        "missing_doc_types": missing_types,
        "completion_pct": round(completion_pct, 1),
        "total_documents": len(documents),
        "document_details": doc_details,
    }
