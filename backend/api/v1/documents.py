"""
Documents API - Quarterly Data Cockpit
Handles Big-6 document upload, listing, and management
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Body, Request, Depends
from typing import Optional
from datetime import datetime
import logging
import sys
import os
import re
import uuid
import json
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from services.quarterly_file_manager import QuarterlyFileManager
from schemas.response_envelope import wrap_response
from database.db import get_connection
from middleware.auth import verify_token, check_client_access
from utils.audit import log_action

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize manager
file_manager = QuarterlyFileManager()


@router.post("/upload")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    client_id: str = Query(..., description="Client ID"),
    period_id: str = Query(..., description="Period (e.g., 2025-Q2)"),
    doc_type: Optional[str] = Query(None, description="Document type (auto-detect if not provided)"),
    user: dict = Depends(verify_token)
):
    """
    Upload a document with automatic classification and validation (Auth Required)

    Pipeline:
    1. Calculate content hash (SHA256)
    2. Check for duplicates
    3. Auto-classify document type (if not provided)
    4. Store file in tenant-isolated path
    5. Parse document
    6. Time Shield validation
    7. Create database record
    8. Audit log
    """

    # Check client access (RBAC)
    await check_client_access(user, client_id)

    tenant_id = user["id"]
    actor = user["id"]

    try:
        # Read file content
        content = await file.read()

        if len(content) == 0:
            raise HTTPException(400, "Boş dosya yüklenemez")

        # Process upload
        result = file_manager.upload_document(
            tenant_id=tenant_id,
            client_id=client_id,
            period_id=period_id,
            file_content=content,
            original_filename=file.filename,
            doc_type=doc_type,
            actor=actor
        )

        # Audit log
        log_action(
            user_id=user["id"],
            client_id=client_id,
            period_id=period_id,
            action="document_upload",
            resource_type="document",
            resource_id=result['data']['upload']['id'] if result.get('data') and result['data'].get('upload') else None,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details=json.dumps({
                "filename": file.filename,
                "doc_type": result['data']['classification']['doc_type'] if result.get('data') else None,
                "status": result['status']
            })
        )

        # Wrap in ResponseEnvelope
        return wrap_response(
            endpoint_name="document_upload",
            smmm_id=tenant_id,
            client_id=client_id,
            period=period_id,
            data=result['data'],
            errors=[{"code": e['code'], "message": e['message']} for e in result.get('errors', [])],
            warnings=[{"code": "WARN", "message": w} for w in result['data'].get('parse', {}).get('warnings', [])] if result.get('data') else []
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}", exc_info=True)
        raise HTTPException(500, str(e))


@router.get("/list")
async def list_documents(
    request: Request,
    client_id: str = Query(...),
    period_id: str = Query(...),
    doc_type: Optional[str] = Query(None),
    user: dict = Depends(verify_token)
):
    """
    List documents for a period (Auth Required)

    Returns active documents with their status
    """

    # Check client access (RBAC)
    await check_client_access(user, client_id)

    tenant_id = user["id"]

    try:
        documents = file_manager.list_documents(
            tenant_id=tenant_id,
            client_id=client_id,
            period_id=period_id,
            doc_type=doc_type
        )

        # Get completeness info
        completeness = file_manager.get_period_completeness(
            tenant_id, client_id, period_id
        )

        # Audit log
        log_action(
            user_id=user["id"],
            client_id=client_id,
            period_id=period_id,
            action="list_documents",
            resource_type="document",
            resource_id=f"{client_id}_{period_id}",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )

        return wrap_response(
            endpoint_name="document_list",
            smmm_id=tenant_id,
            client_id=client_id,
            period=period_id,
            data={
                "documents": documents,
                "total": len(documents),
                "completeness": completeness
            }
        )

    except Exception as e:
        logger.error(f"List error: {e}", exc_info=True)
        raise HTTPException(500, str(e))


@router.get("/period-completeness")
async def get_period_completeness(
    request: Request,
    client_id: str = Query(...),
    period_id: str = Query(...),
    user: dict = Depends(verify_token)
):
    """
    Get completeness status for a period (Auth Required)

    Returns:
    - Required vs present documents
    - Missing documents with actions
    - Fail-soft missing_data contract
    """

    # Check client access (RBAC)
    await check_client_access(user, client_id)

    tenant_id = user["id"]

    try:
        result = file_manager.get_period_completeness(
            tenant_id=tenant_id,
            client_id=client_id,
            period_id=period_id
        )

        return wrap_response(
            endpoint_name="period_completeness",
            smmm_id=tenant_id,
            client_id=client_id,
            period=period_id,
            data=result
        )

    except Exception as e:
        logger.error(f"Completeness error: {e}", exc_info=True)
        raise HTTPException(500, str(e))


@router.post("/override-doc-type")
async def override_document_type(
    request: Request,
    document_id: str = Body(..., embed=True),
    new_doc_type: str = Body(..., embed=True),
    reason: str = Body(..., embed=True),
    user: dict = Depends(verify_token)
):
    """
    Override document type classification (Auth Required)

    Creates audit trail entry
    """

    actor = user["id"]

    try:
        result = file_manager.override_doc_type(
            document_id=document_id,
            new_doc_type=new_doc_type,
            reason=reason,
            actor=actor
        )

        if result['status'] == 'ERROR':
            raise HTTPException(400, result.get('error', 'Override failed'))

        # Audit log
        log_action(
            user_id=user["id"],
            client_id=result['data'].get('client_id', 'unknown'),
            period_id=result['data'].get('period_id', 'unknown'),
            action="override_doc_type",
            resource_type="document",
            resource_id=document_id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details=json.dumps({"new_doc_type": new_doc_type, "reason": reason})
        )

        return wrap_response(
            endpoint_name="override_doc_type",
            smmm_id=result['data'].get('tenant_id', 'unknown'),
            client_id=result['data'].get('client_id', 'unknown'),
            period=result['data'].get('period_id', 'unknown'),
            data=result['data']
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Override error: {e}", exc_info=True)
        raise HTTPException(500, str(e))


@router.get("/document/{document_id}")
async def get_document(
    request: Request,
    document_id: str,
    user: dict = Depends(verify_token)
):
    """Get document details by ID (Auth Required)"""

    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(
                "SELECT * FROM document_uploads WHERE id = ?",
                [document_id]
            )
            row = cursor.fetchone()

            if not row:
                raise HTTPException(404, "Döküman bulunamadı")

            columns = [desc[0] for desc in cursor.description]
            doc = dict(zip(columns, row))

        # Check client access
        await check_client_access(user, doc['client_id'])

        return wrap_response(
            endpoint_name="document_detail",
            smmm_id=doc['tenant_id'],
            client_id=doc['client_id'],
            period=doc['period_id'],
            data=doc
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document detail error: {e}", exc_info=True)
        raise HTTPException(500, str(e))


# ============== MIGRATION ENDPOINTS ==============

@router.post("/migrate-legacy")
async def migrate_legacy_files(
    request: Request,
    legacy_path: str = Query("backend/data", description="Legacy folder path"),
    user: dict = Depends(verify_token)
):
    """
    Scan legacy folder and queue files for review (Auth Required)

    NEVER silently migrates. Every file goes to review queue.
    High-confidence files marked MIGRATED_OK, others NEEDS_REVIEW.
    """

    tenant_id = user["id"]
    actor = user["id"]

    try:
        manager = QuarterlyFileManager()

        # Scan legacy folder
        legacy_folder = legacy_path
        if not os.path.exists(legacy_folder):
            return wrap_response(
                endpoint_name="migrate_legacy",
                smmm_id=tenant_id,
                client_id="",
                period="",
                data={
                    "message": "Legacy folder not found",
                    "path": legacy_folder,
                    "files_queued": 0
                }
            )

        queued_files = []

        with get_connection() as conn:
            cursor = conn.cursor()

            for root, dirs, files in os.walk(legacy_folder):
                for filename in files:
                    if filename.startswith('.'):
                        continue

                    filepath = os.path.join(root, filename)

                    # Read file for classification
                    try:
                        with open(filepath, 'rb') as f:
                            content = f.read()
                    except Exception:
                        continue

                    # Detect doc type
                    detected_type, confidence, reason = manager._detect_doc_type(content, filename)

                    # Try to detect period from filename or content
                    detected_period = None
                    period_patterns = [
                        r'(\d{4})[_-]?Q([1-4])',
                        r'Q([1-4])[_-]?(\d{4})',
                        r'(\d{4})[_-](\d{1,2})'
                    ]

                    for pattern in period_patterns:
                        match = re.search(pattern, filename)
                        if match:
                            groups = match.groups()
                            if len(groups) == 2:
                                if groups[0].isdigit() and len(groups[0]) == 4:
                                    detected_period = f"{groups[0]}-Q{groups[1]}"
                                else:
                                    detected_period = f"{groups[1]}-Q{groups[0]}"
                            break

                    # Determine status
                    if confidence >= 0.9 and detected_period:
                        status = 'MIGRATED_OK'
                    else:
                        status = 'NEEDS_REVIEW'

                    # Insert to queue
                    queue_id = str(uuid.uuid4())
                    cursor.execute("""
                        INSERT INTO migration_review_queue
                        (id, tenant_id, detected_period_id, suggested_period_id, suggested_doc_type,
                         confidence, legacy_path, legacy_filename, reason, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, [
                        queue_id, tenant_id, detected_period, detected_period, detected_type,
                        confidence, filepath, filename, reason, status
                    ])

                    queued_files.append({
                        "id": queue_id,
                        "filename": filename,
                        "suggested_type": detected_type,
                        "confidence": confidence,
                        "status": status
                    })

            conn.commit()

        # Audit log
        log_action(
            user_id=user["id"],
            client_id="",
            period_id="",
            action="migrate_legacy",
            resource_type="migration",
            resource_id=legacy_path,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details=json.dumps({"files_queued": len(queued_files)})
        )

        return wrap_response(
            endpoint_name="migrate_legacy",
            smmm_id=tenant_id,
            client_id="",
            period="",
            data={
                "files_queued": len(queued_files),
                "queued": queued_files
            }
        )

    except Exception as e:
        logger.error(f"Migration error: {e}", exc_info=True)
        raise HTTPException(500, str(e))


@router.get("/migration-review-queue")
async def get_migration_queue(
    request: Request,
    status: Optional[str] = Query(None, description="Filter by status"),
    user: dict = Depends(verify_token)
):
    """Get migration review queue items (Auth Required)"""

    tenant_id = user["id"]

    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            query = "SELECT * FROM migration_review_queue WHERE tenant_id = ?"
            params = [tenant_id]

            if status:
                query += " AND status = ?"
                params.append(status)

            query += " ORDER BY created_at DESC"

            cursor.execute(query, params)
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            results = [dict(zip(columns, row)) for row in rows]

        return wrap_response(
            endpoint_name="migration_review_queue",
            smmm_id=tenant_id,
            client_id="",
            period="",
            data={
                "items": results,
                "total": len(results)
            }
        )

    except Exception as e:
        logger.error(f"Queue error: {e}", exc_info=True)
        raise HTTPException(500, str(e))


@router.post("/migration-review-resolve")
async def resolve_migration_item(
    request: Request,
    queue_id: str = Body(..., embed=True),
    decision: str = Body(..., embed=True, description="MIGRATE_OK or REJECT"),
    client_id: str = Body(..., embed=True),
    period_id: str = Body(..., embed=True),
    doc_type: str = Body(..., embed=True),
    reason: str = Body("", embed=True),
    user: dict = Depends(verify_token)
):
    """
    Resolve migration review item (Auth Required)

    If MIGRATE_OK: Run through full upload pipeline
    If REJECT: Mark as rejected
    """

    actor = user["id"]

    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            # Get queue item
            cursor.execute("SELECT * FROM migration_review_queue WHERE id = ?", [queue_id])
            row = cursor.fetchone()

            if not row:
                raise HTTPException(404, "Queue item not found")

            columns = [desc[0] for desc in cursor.description]
            item = dict(zip(columns, row))

            if decision == 'MIGRATE_OK':
                # Read file and process through upload pipeline
                with open(item['legacy_path'], 'rb') as f:
                    content = f.read()

                manager = QuarterlyFileManager()
                result = manager.upload_document(
                    tenant_id=item['tenant_id'],
                    client_id=client_id,
                    period_id=period_id,
                    file_content=content,
                    original_filename=item['legacy_filename'],
                    doc_type=doc_type,
                    actor=actor
                )

                # Update queue
                cursor.execute("""
                    UPDATE migration_review_queue
                    SET status = 'MIGRATED_OK', resolved_at = datetime('now'), resolved_by = ?,
                        resolution = ?
                    WHERE id = ?
                """, [actor, json.dumps({'upload_result': result['status']}), queue_id])

            elif decision == 'REJECT':
                cursor.execute("""
                    UPDATE migration_review_queue
                    SET status = 'REJECTED', resolved_at = datetime('now'), resolved_by = ?,
                        resolution = ?
                    WHERE id = ?
                """, [actor, json.dumps({'reason': reason}), queue_id])

            else:
                raise HTTPException(400, f"Invalid decision: {decision}")

            conn.commit()

        # Audit log
        log_action(
            user_id=user["id"],
            client_id=client_id,
            period_id=period_id,
            action="migration_resolve",
            resource_type="migration",
            resource_id=queue_id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details=json.dumps({"decision": decision})
        )

        return wrap_response(
            endpoint_name="migration_resolve",
            smmm_id=item['tenant_id'],
            client_id=client_id,
            period=period_id,
            data={
                "queue_id": queue_id,
                "decision": decision,
                "status": "resolved"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resolve error: {e}", exc_info=True)
        raise HTTPException(500, str(e))
