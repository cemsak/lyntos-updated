"""
ZIP Bulk Upload API
Sprint 6: Handles Q1.zip, Q2.zip style uploads

Supports:
- ZIP file upload with automatic file classification
- Period detection from filename
- Auto-create client/period if not exists
- Document type classification by filename patterns
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pathlib import Path
from typing import Optional, List
import zipfile
import io
import re
from datetime import datetime
import sqlite3
import uuid
import hashlib
import logging
import subprocess
import os
import sys

from services.parse_service import trigger_parse_for_document
from services.feed.service import get_feed_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bulk-upload", tags=["bulk-upload"])

DB_PATH = Path(__file__).parent.parent.parent / "database" / "lyntos.db"
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"


# Document type patterns for classification
DOC_PATTERNS = {
    "MIZAN": [r"mizan", r"mizn", r"MİZAN", r"trial.?balance"],
    "BANKA": [
        r"102\.", r"banka", r"ekstre", r"YKB", r"AKBANK", r"HALKBANK",
        r"ZİRAAT", r"ZIRAAT", r"GARANTİ", r"GARANTI", r"İŞ.?BANK",
        r"ISBANK", r"VAKIF", r"KUVEYT", r"QNB", r"ING", r"TEB", r"HSBC"
    ],
    "BEYANNAME": [
        r"_BYN\.pdf", r"beyanname", r"BEYANNAME", r"KDV.*BYN",
        r"MUHTASAR.*BYN", r"GV.*BYN"
    ],
    "TAHAKKUK": [
        r"_THK\.pdf", r"tahakkuk", r"TAHAKKUK", r"KDV.*THK",
        r"MUHTASAR.*THK", r"GV.*THK"
    ],
    "EDEFTER_BERAT": [
        r"e.?defter", r"berat", r"BERAT",
        r"\d{10}-\d{6}-[YKDB]", r"yevmiye.*berat", r"kebir.*berat"
    ],
    "YEVMIYE": [r"yevmiye", r"YEVMİYE", r"journal"],
    "KEBIR": [r"kebir", r"KEBİR", r"ledger"],
    "EFATURA_ARSIV": [
        r"e.?fatura", r"e.?arsiv", r"e.?arşiv", r"fatura.*liste",
        r"arsiv.*liste", r"arşiv.*liste"
    ],
}


def classify_file(filename: str) -> str:
    """Classify file by name pattern"""
    for doc_type, patterns in DOC_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, filename, re.IGNORECASE):
                return doc_type
    return "OTHER"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_period_dates(period_code: str) -> tuple:
    """Convert period code to start/end dates"""
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


def ensure_client_exists(cursor, client_id: str, tenant_id: str) -> bool:
    """Ensure client exists, create if not"""
    cursor.execute("SELECT id FROM clients WHERE id = ?", (client_id,))
    if cursor.fetchone():
        return True

    now = datetime.utcnow().isoformat()
    placeholder_tax_id = f"PENDING-{client_id[:20]}"

    cursor.execute("""
        INSERT INTO clients (id, smmm_id, name, tax_id, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (
        client_id,
        tenant_id,
        client_id.replace("_", " ").title(),
        placeholder_tax_id,
        now
    ))
    return True


def ensure_period_exists(cursor, client_id: str, period_code: str) -> bool:
    """Ensure period exists, create if not"""
    period_code_upper = period_code.upper()
    period_id = f"{client_id}_{period_code_upper}"

    cursor.execute("SELECT id FROM periods WHERE id = ?", (period_id,))
    if cursor.fetchone():
        return True

    start_date, end_date = get_period_dates(period_code_upper)
    if not start_date:
        return False

    now = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO periods (id, client_id, period_code, start_date, end_date, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        period_id,
        client_id,
        period_code_upper,
        start_date,
        end_date,
        "active",
        now
    ))
    return True


def _maybe_refresh_contracts(tenant_id: str, client_id: str, period: str) -> dict:
    """
    Phase 1 Bridge: Run refresh_contracts.py after upload if enabled.

    Controlled by env var LYNTOS_AUTO_REFRESH_ON_UPLOAD=1
    Fail-soft: refresh failure does NOT fail the upload.

    Returns:
        dict with keys:
        - enabled: bool - whether auto-refresh was enabled
        - triggered: bool - whether refresh was actually triggered
        - success: bool - whether refresh completed successfully
        - message: str - status message
        - duration_ms: int - time taken (only if triggered)
    """
    result = {
        "enabled": False,
        "triggered": False,
        "success": False,
        "message": "",
        "duration_ms": 0
    }

    # Check env var
    auto_refresh = os.environ.get("LYNTOS_AUTO_REFRESH_ON_UPLOAD", "0")
    if auto_refresh not in ("1", "true", "True", "TRUE"):
        result["message"] = "Auto-refresh disabled (LYNTOS_AUTO_REFRESH_ON_UPLOAD not set)"
        return result

    result["enabled"] = True

    # Build paths
    backend_dir = Path(__file__).parent.parent.parent.resolve()
    script_path = backend_dir / "scripts" / "refresh_contracts.py"
    contracts_dir = backend_dir / "docs" / "contracts"

    if not script_path.exists():
        result["message"] = f"Script not found: {script_path}"
        logger.warning(f"[refresh_contracts] {result['message']}")
        return result

    # Build command
    cmd = [
        sys.executable,
        str(script_path),
        "--smmm", tenant_id,
        "--client", client_id,
        "--period", period,
        "--contracts_dir", str(contracts_dir)
    ]

    result["triggered"] = True
    logger.info(f"[refresh_contracts] Running: {' '.join(cmd)}")

    import time
    start_time = time.time()

    try:
        proc = subprocess.run(
            cmd,
            cwd=str(backend_dir),
            capture_output=True,
            text=True,
            timeout=120  # 2 minute timeout
        )

        duration_ms = int((time.time() - start_time) * 1000)
        result["duration_ms"] = duration_ms

        if proc.returncode == 0:
            result["success"] = True
            result["message"] = f"Contracts refreshed successfully ({duration_ms}ms)"
            logger.info(f"[refresh_contracts] {result['message']}")
        else:
            result["message"] = f"Refresh failed (exit code {proc.returncode}): {proc.stderr[:500] if proc.stderr else 'no stderr'}"
            logger.warning(f"[refresh_contracts] {result['message']}")

    except subprocess.TimeoutExpired:
        duration_ms = int((time.time() - start_time) * 1000)
        result["duration_ms"] = duration_ms
        result["message"] = f"Refresh timed out after 120s"
        logger.warning(f"[refresh_contracts] {result['message']}")

    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        result["duration_ms"] = duration_ms
        result["message"] = f"Refresh error: {str(e)}"
        logger.warning(f"[refresh_contracts] {result['message']}")

    return result


@router.post("/zip")
async def upload_zip(
    file: UploadFile = File(...),
    tenant_id: str = Form(default="HKOZKAN"),
    client_id: str = Form(default=None),
    period: str = Form(default=None)
):
    """
    Upload ZIP file containing period documents.

    Expected ZIP name: Q1.zip, Q2.zip, 2025-Q1.zip etc.
    Period extracted from filename if not provided.

    Args:
        file: ZIP file to upload
        tenant_id: SMMM identifier
        client_id: Client identifier (required)
        period: Period code (e.g., 2025-Q1), auto-detected from filename if not provided
    """
    if not file.filename or not file.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail="ZIP dosyasi gerekli")

    # Extract period from filename if not provided
    if not period:
        # Try 2025-Q1 format first
        match = re.search(r'(\d{4})-?Q([1-4])', file.filename, re.IGNORECASE)
        if match:
            period = f"{match.group(1)}-Q{match.group(2)}"
        else:
            # Try just Q1 format (use current year)
            match = re.search(r'Q([1-4])', file.filename, re.IGNORECASE)
            if match:
                year = datetime.now().year
                period = f"{year}-Q{match.group(1)}"
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Donem belirlenemedi. period parametresi verin veya dosya adinda Q1-Q4 kullanin."
                )

    if not client_id:
        raise HTTPException(status_code=400, detail="client_id gerekli")

    # Read ZIP content
    content = await file.read()

    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            results = {
                "status": "success",
                "zip_filename": file.filename,
                "period": period,
                "client_id": client_id,
                "total": 0,
                "saved": 0,
                "skipped": 0,
                "errors": [],
                "files": []
            }

            # Create output directory
            output_dir = UPLOAD_DIR / tenant_id / client_id / period
            output_dir.mkdir(parents=True, exist_ok=True)

            conn = get_db()
            cursor = conn.cursor()

            # Ensure client and period exist
            ensure_client_exists(cursor, client_id, tenant_id)
            ensure_period_exists(cursor, client_id, period)

            for zip_info in zf.infolist():
                if zip_info.is_dir():
                    continue

                results["total"] += 1
                filename = Path(zip_info.filename).name

                # Skip hidden files and macOS metadata
                if filename.startswith('.') or filename.startswith('__MACOSX'):
                    results["skipped"] += 1
                    continue

                # Classify document type
                doc_type = classify_file(filename)

                # Generate unique filename
                unique_id = uuid.uuid4().hex[:8]
                safe_filename = f"{unique_id}_{filename}"

                # Create type-specific subdirectory
                type_dir = output_dir / doc_type
                type_dir.mkdir(parents=True, exist_ok=True)
                file_path = type_dir / safe_filename

                try:
                    # Extract file
                    file_content = zf.read(zip_info.filename)

                    with open(file_path, 'wb') as f:
                        f.write(file_content)

                    # Generate content hash
                    content_hash = hashlib.sha256(file_content).hexdigest()

                    # Check for duplicate
                    cursor.execute("""
                        SELECT id FROM document_uploads
                        WHERE client_id = ? AND period_id = ? AND content_hash_sha256 = ?
                          AND is_active = 1
                    """, (client_id, period, content_hash))

                    if cursor.fetchone():
                        # Skip duplicate
                        file_path.unlink()  # Remove the extracted file
                        results["skipped"] += 1
                        results["files"].append({
                            "filename": filename,
                            "doc_type": doc_type,
                            "status": "skipped",
                            "reason": "Duplicate content"
                        })
                        continue

                    # Record in database
                    doc_id = str(uuid.uuid4())
                    now = datetime.utcnow().isoformat()
                    relative_path = str(file_path.relative_to(UPLOAD_DIR))

                    cursor.execute("""
                        INSERT INTO document_uploads (
                            id, tenant_id, client_id, period_id, doc_type,
                            original_filename, stored_path, content_hash_sha256,
                            parse_status, parser_name, size_bytes,
                            created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        doc_id,
                        tenant_id,
                        client_id,
                        period,
                        doc_type,
                        filename,
                        relative_path,
                        content_hash,
                        'PENDING',
                        'zip-upload',
                        len(file_content),
                        now,
                        now
                    ))

                    results["saved"] += 1

                    # Trigger parsing for MIZAN files
                    parse_result = None
                    if doc_type == 'MIZAN':
                        try:
                            parse_result = trigger_parse_for_document(
                                cursor,
                                doc_id,
                                tenant_id,
                                client_id,
                                period,
                                doc_type,
                                relative_path,
                                filename
                            )
                            logger.info(f"Parsed {filename}: {parse_result.get('status')}, inserted={parse_result.get('inserted_count', 0)}")

                            # Add feed notification on successful parse
                            if parse_result.get('status') == 'OK':
                                try:
                                    feed_service = get_feed_service()
                                    inserted = parse_result.get('inserted_count', 0)
                                    feed_service.add_item(
                                        tenant_id=tenant_id,
                                        client_id=client_id,
                                        period_id=period,
                                        item_type='upload',
                                        title=f'Yeni veri yuklendi: {filename}',
                                        message=f'Mizan verisi basariyla islendi. {inserted} kayit eklendi. Analiz guncellendi.',
                                        severity='INFO',
                                        metadata={'doc_id': doc_id, 'filename': filename, 'inserted_count': inserted}
                                    )
                                except Exception as fe:
                                    logger.warning(f"Feed notification failed: {fe}")

                        except Exception as pe:
                            logger.warning(f"Parse failed for {filename}: {pe}")
                            parse_result = {'status': 'ERROR', 'message': str(pe)}

                    results["files"].append({
                        "filename": filename,
                        "doc_type": doc_type,
                        "status": "saved",
                        "path": relative_path,
                        "size": len(file_content),
                        "parse_result": parse_result
                    })

                except Exception as e:
                    results["errors"].append({
                        "file": filename,
                        "error": str(e)
                    })

            conn.commit()
            conn.close()

            # Phase 1 Bridge: trigger contract refresh if enabled
            refresh_result = _maybe_refresh_contracts(tenant_id, client_id, period)
            results["post_upload"] = {
                "refresh_contracts": refresh_result
            }

            # Set final status
            if results["errors"]:
                results["status"] = "partial"
            elif results["saved"] == 0:
                results["status"] = "no_new_files"

            return results

    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Gecersiz ZIP dosyasi")


@router.get("/status/{client_id}/{period}")
async def get_upload_status(client_id: str, period: str, tenant_id: str = "HKOZKAN"):
    """
    Get upload status for a client/period.

    Returns document counts by type and list of uploaded files.
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT doc_type, COUNT(*) as count
        FROM document_uploads
        WHERE client_id = ? AND period_id = ? AND tenant_id = ? AND is_active = 1
        GROUP BY doc_type
    """, (client_id, period, tenant_id))

    by_type = {row["doc_type"]: row["count"] for row in cursor.fetchall()}

    cursor.execute("""
        SELECT doc_type, original_filename, stored_path, size_bytes, created_at
        FROM document_uploads
        WHERE client_id = ? AND period_id = ? AND tenant_id = ? AND is_active = 1
        ORDER BY doc_type, created_at DESC
    """, (client_id, period, tenant_id))

    files = [
        {
            "doc_type": row["doc_type"],
            "filename": row["original_filename"],
            "path": row["stored_path"],
            "size": row["size_bytes"],
            "uploaded_at": row["created_at"]
        }
        for row in cursor.fetchall()
    ]

    conn.close()

    return {
        "client_id": client_id,
        "period": period,
        "total_files": len(files),
        "by_type": by_type,
        "files": files
    }


@router.post("/parse/{client_id}/{period}")
async def trigger_parsing(
    client_id: str,
    period: str,
    tenant_id: str = "HKOZKAN",
    doc_types: Optional[str] = "MIZAN",
    force: bool = False
):
    """
    Trigger parsing for existing uploaded documents.

    Useful for processing documents that were uploaded before parser integration.

    Args:
        client_id: Client identifier
        period: Period code (e.g., 2025-Q2)
        tenant_id: SMMM identifier
        doc_types: Comma-separated list of doc types to parse (default: MIZAN)
        force: If True, reprocess all documents regardless of current status
    """
    from services.parse_service import process_uploaded_documents

    doc_type_list = [dt.strip() for dt in doc_types.split(',')]

    conn = get_db()
    cursor = conn.cursor()

    try:
        result = process_uploaded_documents(
            cursor,
            tenant_id,
            client_id,
            period,
            doc_type_list,
            force=force
        )
        conn.commit()

        return {
            "status": "success",
            "client_id": client_id,
            "period": period,
            **result
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Parse error: {str(e)}")
    finally:
        conn.close()
