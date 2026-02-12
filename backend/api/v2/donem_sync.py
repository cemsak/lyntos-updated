"""
LYNTOS API v2 - Dönem Sync Endpoint
Receives parsed period data from frontend and persists to document_uploads table.

Sprint 2.1: Frontend -> Backend Data Sync
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
import hashlib
import json
import logging
import uuid
import sys
from pathlib import Path

# Add parent to path for imports
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from database.db import get_connection
from middleware.auth import verify_token, check_client_access
from utils.period_utils import normalize_period_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/donem", tags=["Donem Sync"])


# ============================================================================
# AUTO-CREATE HELPERS (Sprint 4)
# ============================================================================

def get_period_dates(period_code: str) -> tuple:
    """
    Convert period code to start/end dates.

    Args:
        period_code: "2025-Q1" format

    Returns:
        (start_date, end_date) as "YYYY-MM-DD" strings, or (None, None) if invalid
    """
    if not period_code or '-Q' not in period_code.upper():
        return None, None

    try:
        parts = period_code.upper().split('-Q')
        year = int(parts[0])
        quarter = int(parts[1])

        quarter_map = {
            1: ("01-01", "03-31"),
            2: ("04-01", "06-30"),
            3: ("07-01", "09-30"),
            4: ("10-01", "12-31"),
        }

        if quarter not in quarter_map:
            return None, None

        start_suffix, end_suffix = quarter_map[quarter]
        return f"{year}-{start_suffix}", f"{year}-{end_suffix}"
    except (ValueError, IndexError):
        return None, None


def ensure_client_exists(cursor, client_id: str, client_name: str, tenant_id: str) -> bool:
    """
    Ensure client exists in database.

    ⚠️ PENDING VKN ile yeni client OLUŞTURMAZ.
    Mevcut client varsa True döner.
    Yoksa False döner — kullanıcı önce vergi levhası ile client oluşturmalı.

    Returns True if client exists, False otherwise.
    """
    cursor.execute("SELECT id FROM clients WHERE id = ?", (client_id,))
    if cursor.fetchone():
        return True

    # PENDING VKN oluşturma KALDIRILDI.
    # Client mevcut değilse, kullanıcı önce vergi levhası ile client oluşturmalı.
    logger.warning(
        f"[DonemSync] Client bulunamadı: {client_id}. "
        f"Lütfen önce vergi levhası yükleyerek client oluşturun. "
        f"PENDING VKN ile otomatik oluşturma kaldırıldı."
    )
    return False


def ensure_period_exists(cursor, client_id: str, period_code: str) -> bool:
    """
    Ensure period exists for client, create if not.

    Returns True if period exists or was created, False on error.
    """
    period_code_upper = period_code.upper()
    # Format standardizasyonu: 2025-Q1 -> 2025_Q1 (alt çizgi kullan)
    period_normalized = period_code_upper.replace('-', '_')
    period_id = f"{client_id}_{period_normalized}"

    cursor.execute("SELECT id FROM periods WHERE id = ?", (period_id,))
    if cursor.fetchone():
        return True

    # Get dates for period
    start_date, end_date = get_period_dates(period_code_upper)
    if not start_date:
        logger.warning(f"Invalid period format: {period_code}")
        return False

    now = datetime.utcnow().isoformat()

    try:
        cursor.execute("""
            INSERT INTO periods (
                id, client_id, period_code, start_date, end_date, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            period_id,
            client_id,
            period_code_upper,
            start_date,
            end_date,
            "active",
            now
        ))
        logger.info(f"Auto-created period: {period_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to create period {period_id}: {e}")
        return False

# ============================================================================
# DOC_TYPE MAPPING
# Frontend DetectedFileType -> Backend Big-6 Categories
# ============================================================================

DOC_TYPE_MAP = {
    # MIZAN
    'MIZAN_EXCEL': 'MIZAN',

    # BANKA
    'BANKA_EKSTRE_CSV': 'BANKA',
    'BANKA_EKSTRE_EXCEL': 'BANKA',

    # BEYANNAME (declarations)
    'KDV_BEYANNAME_PDF': 'BEYANNAME',
    'MUHTASAR_BEYANNAME_PDF': 'BEYANNAME',
    'GECICI_VERGI_BEYANNAME_PDF': 'BEYANNAME',
    'KURUMLAR_VERGISI_PDF': 'BEYANNAME',
    'DAMGA_VERGISI_PDF': 'BEYANNAME',
    'POSET_BEYANNAME_PDF': 'BEYANNAME',

    # TAHAKKUK (tax assessments)
    'KDV_TAHAKKUK_PDF': 'TAHAKKUK',
    'MUHTASAR_TAHAKKUK_PDF': 'TAHAKKUK',
    'GECICI_VERGI_TAHAKKUK_PDF': 'TAHAKKUK',
    'POSET_TAHAKKUK_PDF': 'TAHAKKUK',

    # EDEFTER - Yevmiye ve Kebir ayrı takip edilir
    'E_DEFTER_YEVMIYE_XML': 'EDEFTER_YEVMIYE',
    'E_DEFTER_BERAT_XML': 'EDEFTER_YEVMIYE',  # Genel berat = yevmiye varsayalım
    'E_DEFTER_RAPOR_XML': 'EDEFTER_YEVMIYE',
    'YEVMIYE_EXCEL': 'EDEFTER_YEVMIYE',
    'E_DEFTER_KEBIR_XML': 'EDEFTER_KEBIR',
    'KEBIR_EXCEL': 'EDEFTER_KEBIR',

    # EFATURA_ARSIV (e-invoice/e-archive)
    'E_FATURA_XML': 'EFATURA_ARSIV',
    'E_ARSIV_XML': 'EFATURA_ARSIV',
    'E_IRSALIYE_XML': 'EFATURA_ARSIV',
    'E_SMM_XML': 'EFATURA_ARSIV',

    # Other types map to closest category
    'HESAP_PLANI_EXCEL': 'MIZAN',
    'BILANCO_EXCEL': 'MIZAN',
    'GELIR_TABLOSU_EXCEL': 'MIZAN',
    'SGK_APHB_EXCEL': 'BEYANNAME',
    'SGK_EKSIK_GUN_EXCEL': 'BEYANNAME',
    'SGK_APHB_PDF': 'BEYANNAME',
    'SGK_EKSIK_GUN_PDF': 'BEYANNAME',
    'VERGI_LEVHASI_PDF': 'BEYANNAME',
}

def map_doc_type(frontend_type: str) -> str:
    """Map frontend file type to Big-6 backend category"""
    return DOC_TYPE_MAP.get(frontend_type, 'MIZAN')  # Default to MIZAN if unknown


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class DetectedFileSummary(BaseModel):
    """Single detected/parsed file metadata from frontend"""
    id: str
    fileName: str
    fileType: str  # Frontend DetectedFileType
    fileSize: int = 0
    confidence: float = 0.0
    metadata: Optional[Dict[str, Any]] = None


class DonemMeta(BaseModel):
    """Period metadata from frontend"""
    clientId: str
    clientName: str
    period: str  # Format: YYYY-QN or YYYY-MM
    quarter: str  # Q1, Q2, Q3, Q4
    year: int
    uploadedAt: str
    sourceFile: str


class FileStats(BaseModel):
    """File processing statistics"""
    total: int = 0
    detected: int = 0
    parsed: int = 0
    failed: int = 0


class DonemSyncRequest(BaseModel):
    """Full sync payload from frontend donemStore"""
    meta: DonemMeta
    fileSummaries: List[DetectedFileSummary]
    stats: FileStats
    tenantId: str = "default"  # SMMM identifier


class SyncResultItem(BaseModel):
    """Result for single file sync"""
    fileName: str
    status: str  # "synced" | "error" | "skipped"
    docType: Optional[str] = None
    reason: Optional[str] = None


class DonemSyncResponse(BaseModel):
    """Sync operation response"""
    success: bool
    syncedCount: int
    errorCount: int
    skippedCount: int
    results: List[SyncResultItem]
    errors: List[str] = Field(default_factory=list)
    periodId: Optional[str] = None


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def generate_content_hash(file_id: str, filename: str, file_type: str) -> str:
    """Generate a content hash from file metadata"""
    content = f"{file_id}:{filename}:{file_type}"
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.post("/sync", response_model=DonemSyncResponse)
async def sync_donem_data(request: DonemSyncRequest, user: dict = Depends(verify_token)):
    """
    Sync parsed dönem data from frontend to database.

    This endpoint:
    1. Validates the incoming payload
    2. Upserts each detected file to document_uploads table
    3. Returns detailed sync results

    NO DUMMY DATA: If required fields are missing, returns fail-soft response.
    """

    # Override tenantId with authenticated user's ID
    smmm_id = user["id"]
    request.tenantId = smmm_id

    results: List[SyncResultItem] = []
    errors: List[str] = []
    synced_count = 0
    error_count = 0
    skipped_count = 0

    # Validate required meta fields
    if not request.meta.clientId:
        return DonemSyncResponse(
            success=False,
            syncedCount=0,
            errorCount=0,
            skippedCount=0,
            results=[],
            errors=["Missing required field: meta.clientId"]
        )

    if not request.meta.period:
        return DonemSyncResponse(
            success=False,
            syncedCount=0,
            errorCount=0,
            skippedCount=0,
            results=[],
            errors=["Missing required field: meta.period"]
        )

    await check_client_access(user, request.meta.clientId)

    if not request.fileSummaries:
        return DonemSyncResponse(
            success=True,
            syncedCount=0,
            errorCount=0,
            skippedCount=0,
            results=[],
            errors=[],
            periodId=f"{request.tenantId}:{request.meta.clientId}:{request.meta.period}"
        )

    # Process each file
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.utcnow().isoformat()

            # AUTO-CREATE: Ensure client and period exist before sync
            if not ensure_client_exists(cursor, request.meta.clientId, request.meta.clientName, request.tenantId):
                return DonemSyncResponse(
                    success=False,
                    syncedCount=0,
                    errorCount=1,
                    skippedCount=0,
                    results=[],
                    errors=[f"Failed to ensure client exists: {request.meta.clientId}"]
                )

            if not ensure_period_exists(cursor, request.meta.clientId, request.meta.period):
                return DonemSyncResponse(
                    success=False,
                    syncedCount=0,
                    errorCount=1,
                    skippedCount=0,
                    results=[],
                    errors=[f"Failed to ensure period exists: {request.meta.period}"]
                )

            for file_summary in request.fileSummaries:
                try:
                    # Skip UNKNOWN files
                    if file_summary.fileType == 'UNKNOWN':
                        results.append(SyncResultItem(
                            fileName=file_summary.fileName,
                            status="skipped",
                            reason="Unknown file type"
                        ))
                        skipped_count += 1
                        continue

                    # Map to Big-6 doc_type
                    doc_type = map_doc_type(file_summary.fileType)

                    # Generate content hash from file metadata
                    content_hash = generate_content_hash(
                        file_summary.id,
                        file_summary.fileName,
                        file_summary.fileType
                    )

                    # Prepare metadata JSON
                    metadata = {
                        "originalType": file_summary.fileType,
                        "confidence": file_summary.confidence,
                        "frontendId": file_summary.id,
                        **(file_summary.metadata or {})
                    }
                    metadata_json = json.dumps(metadata, ensure_ascii=False)

                    # Generate unique ID
                    doc_id = str(uuid.uuid4())

                    # stored_path: Since files are parsed in frontend memory,
                    # we use a virtual path indicating frontend-parsed data
                    stored_path = f"memory://frontend/{request.meta.clientId}/{request.meta.period}/{file_summary.id}"

                    # Check for existing record with same hash
                    cursor.execute("""
                        SELECT id FROM document_uploads
                        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
                          AND doc_type = ? AND content_hash_sha256 = ?
                          AND is_active = 1
                    """, (
                        request.tenantId,
                        request.meta.clientId,
                        request.meta.period,
                        doc_type,
                        content_hash
                    ))

                    existing = cursor.fetchone()

                    if existing:
                        # Update existing record
                        cursor.execute("""
                            UPDATE document_uploads
                            SET original_filename = ?,
                                parse_status = 'OK',
                                metadata = ?,
                                updated_at = ?
                            WHERE id = ?
                        """, (
                            file_summary.fileName,
                            metadata_json,
                            now,
                            existing['id']
                        ))
                        results.append(SyncResultItem(
                            fileName=file_summary.fileName,
                            status="synced",
                            docType=doc_type,
                            reason="Updated existing"
                        ))
                    else:
                        # Insert new record
                        cursor.execute("""
                            INSERT INTO document_uploads (
                                id, tenant_id, client_id, period_id, doc_type,
                                original_filename, stored_path, content_hash_sha256,
                                parse_status, parser_name, metadata,
                                size_bytes, classification_confidence,
                                created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            doc_id,
                            request.tenantId,
                            request.meta.clientId,
                            request.meta.period,
                            doc_type,
                            file_summary.fileName,
                            stored_path,
                            content_hash,
                            'OK',
                            'frontend-parser-v2',
                            metadata_json,
                            file_summary.fileSize,
                            file_summary.confidence,
                            now,
                            now
                        ))
                        results.append(SyncResultItem(
                            fileName=file_summary.fileName,
                            status="synced",
                            docType=doc_type,
                            reason="New record"
                        ))

                    synced_count += 1

                except Exception as e:
                    error_msg = f"Error syncing {file_summary.fileName}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    results.append(SyncResultItem(
                        fileName=file_summary.fileName,
                        status="error",
                        reason=str(e)
                    ))
                    error_count += 1

            conn.commit()

    except Exception as e:
        error_msg = f"Database error: {str(e)}"
        logger.error(error_msg)
        return DonemSyncResponse(
            success=False,
            syncedCount=synced_count,
            errorCount=error_count + 1,
            skippedCount=skipped_count,
            results=results,
            errors=[error_msg]
        )

    return DonemSyncResponse(
        success=error_count == 0,
        syncedCount=synced_count,
        errorCount=error_count,
        skippedCount=skipped_count,
        results=results,
        errors=errors,
        periodId=f"{request.tenantId}:{request.meta.clientId}:{request.meta.period}"
    )


@router.get("/status/{period}")
async def get_donem_status(
    period: str,
    client_id: str = "",
    user: dict = Depends(verify_token)
):
    """
    Get sync status for a specific period.
    Useful for frontend to check what's already synced.
    """
    smmm_id = user["id"]
    period = normalize_period_db(period)  # M-02: 2025-Q1 → 2025_Q1

    if not client_id:
        raise HTTPException(status_code=400, detail="client_id query parameter required")

    await check_client_access(user, client_id)

    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT
                    id, doc_type, original_filename, parse_status,
                    parser_name, metadata, updated_at, classification_confidence
                FROM document_uploads
                WHERE tenant_id = ? AND client_id = ? AND period_id = ?
                  AND is_active = 1
                ORDER BY updated_at DESC
            """, (smmm_id, client_id, period))

            rows = cursor.fetchall()

            # Group by doc_type
            by_type: Dict[str, List[Dict]] = {}
            for row in rows:
                doc_type = row['doc_type']
                if doc_type not in by_type:
                    by_type[doc_type] = []
                by_type[doc_type].append({
                    "id": row['id'],
                    "filename": row['original_filename'],
                    "parseStatus": row['parse_status'],
                    "parserName": row['parser_name'],
                    "confidence": row['classification_confidence'],
                    "updatedAt": row['updated_at']
                })

            return {
                "periodId": period,
                "tenantId": smmm_id,
                "clientId": client_id,
                "totalCount": len(rows),
                "byDocType": by_type,
                "syncedAt": rows[0]['updated_at'] if rows else None
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.delete("/clear/{period}")
async def clear_donem_data(
    period: str,
    client_id: str = "",
    user: dict = Depends(verify_token)
):
    """
    Clear all synced data for a specific period (soft delete).
    Sets is_active = 0 instead of deleting records.
    """
    smmm_id = user["id"]
    period = normalize_period_db(period)  # M-02: 2025-Q1 → 2025_Q1

    if not client_id:
        raise HTTPException(status_code=400, detail="client_id query parameter required")

    await check_client_access(user, client_id)

    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                UPDATE document_uploads
                SET is_active = 0, updated_at = ?
                WHERE tenant_id = ? AND client_id = ? AND period_id = ?
                  AND is_active = 1
            """, (datetime.utcnow().isoformat(), smmm_id, client_id, period))

            affected = cursor.rowcount
            conn.commit()

            return {
                "success": True,
                "clearedCount": affected,
                "periodId": period,
                "clientId": client_id
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
