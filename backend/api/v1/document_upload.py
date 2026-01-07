"""
Document Upload & Evidence Bundle API
Sprint 8.2 - LYNTOS V2

Endpoints:
- POST /api/v1/documents/upload - Upload a document
- GET /api/v1/documents/{client_id} - Get all documents for client
- DELETE /api/v1/documents/{document_id} - Delete a document
- POST /api/v1/documents/evidence-bundle/{client_id} - Generate evidence bundle
- GET /api/v1/documents/checklist/{client_id} - Get complete document checklist
"""

from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import datetime
from io import BytesIO
import uuid
import json
from pathlib import Path

from database.db import get_connection
from config.storage import save_uploaded_file, delete_uploaded_file, get_file_url
from utils.evidence_bundle import generate_evidence_bundle

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


# ════════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ════════════════════════════════════════════════════════════════════════════════

def verify_auth(authorization: str) -> str:
    """Verify authorization header and return tenant_id"""
    if not authorization:
        raise HTTPException(401, "Authorization required")

    # Dev mode: DEV_<tenant_id>
    if authorization.startswith("DEV_"):
        return authorization[4:]

    raise HTTPException(401, "Invalid authorization")


def load_kurgan_rules():
    """Load KURGAN rules from JSON file"""
    rules_path = Path(__file__).parent.parent.parent / "data" / "kurgan_rules.json"
    with open(rules_path, "r", encoding="utf-8") as f:
        return json.load(f)


# ════════════════════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════════

@router.post("/upload")
async def upload_document(
    client_id: str = Form(...),
    period: str = Form(...),
    document_id: str = Form(...),
    rule_id: str = Form(...),
    file: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    authorization: str = Header(None)
):
    """
    Upload a document for evidence preparation

    Updates document_preparation table with file info
    """
    verify_auth(authorization)

    # Read file content
    content = await file.read()

    # Save file
    success, message, file_path = save_uploaded_file(
        client_id=client_id,
        period=period,
        document_id=document_id,
        filename=file.filename or "upload",
        content=content
    )

    if not success:
        raise HTTPException(400, message)

    now = datetime.now().isoformat()

    with get_connection() as conn:
        cursor = conn.cursor()

        # Check if document exists
        cursor.execute("""
            SELECT id FROM document_preparation
            WHERE client_id = ? AND period = ? AND document_id = ?
        """, (client_id, period, document_id))

        existing = cursor.fetchone()

        if existing:
            # Update existing
            cursor.execute("""
                UPDATE document_preparation
                SET status = 'uploaded', file_url = ?, file_name = ?, rule_id = ?,
                    uploaded_at = ?, notes = ?, updated_at = ?
                WHERE id = ?
            """, (file_path, file.filename, rule_id, now, notes, now, existing['id']))
        else:
            # Insert new
            doc_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO document_preparation
                (id, client_id, period, document_id, rule_id, status, file_url, file_name, uploaded_at, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'uploaded', ?, ?, ?, ?, ?, ?)
            """, (doc_id, client_id, period, document_id, rule_id, file_path, file.filename, now, notes, now, now))

        conn.commit()

    return {
        "success": True,
        "message": "Belge yuklendi",
        "document_id": document_id,
        "file_name": file.filename,
        "file_url": get_file_url(file_path)
    }


@router.get("/{client_id}")
async def get_client_documents(
    client_id: str,
    period: Optional[str] = None,
    authorization: str = Header(None)
):
    """Get all documents for a client with their status"""
    verify_auth(authorization)

    with get_connection() as conn:
        cursor = conn.cursor()

        if period:
            cursor.execute("""
                SELECT id, document_id, rule_id, status, file_name, file_url, uploaded_at, notes
                FROM document_preparation
                WHERE client_id = ? AND period = ?
            """, (client_id, period))
        else:
            cursor.execute("""
                SELECT id, document_id, rule_id, status, file_name, file_url, uploaded_at, notes
                FROM document_preparation
                WHERE client_id = ?
            """, (client_id,))

        rows = cursor.fetchall()

        documents = [
            {
                "id": row['id'],
                "document_id": row['document_id'],
                "rule_id": row['rule_id'],
                "status": row['status'],
                "file_name": row['file_name'],
                "file_url": get_file_url(row['file_url']) if row['file_url'] else None,
                "uploaded_at": row['uploaded_at'],
                "notes": row['notes']
            }
            for row in rows
        ]

    return {
        "client_id": client_id,
        "period": period,
        "documents": documents
    }


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    client_id: str,
    authorization: str = Header(None)
):
    """Delete an uploaded document"""
    verify_auth(authorization)

    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, file_url FROM document_preparation
            WHERE document_id = ? AND client_id = ?
        """, (document_id, client_id))

        doc = cursor.fetchone()

        if not doc:
            raise HTTPException(404, "Belge bulunamadi")

        # Delete file
        if doc['file_url']:
            delete_uploaded_file(doc['file_url'])

        # Update status
        now = datetime.now().isoformat()
        cursor.execute("""
            UPDATE document_preparation
            SET status = 'pending', file_url = NULL, file_name = NULL, uploaded_at = NULL, updated_at = ?
            WHERE id = ?
        """, (now, doc['id']))

        conn.commit()

    return {"success": True, "message": "Belge silindi"}


@router.post("/evidence-bundle/{client_id}")
async def create_evidence_bundle(
    client_id: str,
    period: Optional[str] = None,
    authorization: str = Header(None)
):
    """
    Generate evidence bundle ZIP for download

    Includes:
    - Summary report
    - Q&A preparation PDF
    - All uploaded documents organized by rule
    - Manifest JSON
    """
    verify_auth(authorization)

    period = period or "2024/Q4"

    with get_connection() as conn:
        cursor = conn.cursor()

        # Get client name from taxpayers table
        cursor.execute("SELECT name FROM taxpayers WHERE id = ?", (client_id,))
        client_row = cursor.fetchone()
        client_name = client_row['name'] if client_row else client_id

        # Get preparation notes
        cursor.execute("""
            SELECT rule_id, question_index, note_text
            FROM preparation_notes
            WHERE client_id = ? AND period = ?
        """, (client_id, period))

        notes_rows = cursor.fetchall()
        notes = {f"{row['rule_id']}-{row['question_index']}": row['note_text'] for row in notes_rows}

        # Get document files
        cursor.execute("""
            SELECT document_id, rule_id, status, file_url, file_name
            FROM document_preparation
            WHERE client_id = ? AND period = ?
        """, (client_id, period))

        doc_rows = cursor.fetchall()

    # Load KURGAN rules
    rules_data = load_kurgan_rules()

    # Create document name lookup
    doc_names = {}
    for rule in rules_data.get('rules', []):
        for doc in rule.get('required_documents', []):
            doc_names[doc['id']] = doc['name']

    document_files = [
        {
            "document_id": row['document_id'],
            "rule_id": row['rule_id'],
            "name": doc_names.get(row['document_id'], row['document_id']),
            "file_path": row['file_url'],
            "file_name": row['file_name'],
            "status": row['status']
        }
        for row in doc_rows
    ]

    # Load answer templates
    answer_templates = {}
    for rule in rules_data.get('rules', []):
        answer_templates[rule['id']] = rule.get('answer_templates', [])

    # Build simulation result structure (simplified for bundle)
    simulation_result = {
        "risk_score": 0,
        "risk_level": "unknown",
        "alarms": [
            {
                "rule_id": rule['id'],
                "rule_name": rule['name'],
                "severity": rule.get('default_severity', 'medium'),
                "finding_summary": rule.get('description', ''),
                "triggered": True,
                "inspector_questions": rule.get('inspector_questions', []),
                "required_documents": rule.get('required_documents', [])
            }
            for rule in rules_data.get('rules', [])
            if rule.get('answer_templates')  # Only include rules with templates
        ]
    }

    # Generate bundle
    bundle_bytes = generate_evidence_bundle(
        client_name=client_name,
        client_id=client_id,
        period=period,
        simulation_result=simulation_result,
        preparation_notes=notes,
        document_files=document_files,
        answer_templates=answer_templates
    )

    # Return as downloadable ZIP
    safe_name = client_name.replace(' ', '_').replace('/', '-')
    safe_period = period.replace('/', '_')
    filename = f"VDK_Kanit_Dosyasi_{safe_name}_{safe_period}.zip"

    return StreamingResponse(
        BytesIO(bundle_bytes),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/checklist/{client_id}")
async def get_document_checklist(
    client_id: str,
    period: Optional[str] = None,
    authorization: str = Header(None)
):
    """
    Get complete document checklist with required documents from all rules
    """
    verify_auth(authorization)

    period = period or "2024/Q4"

    with get_connection() as conn:
        cursor = conn.cursor()

        # Get client name
        cursor.execute("SELECT name FROM taxpayers WHERE id = ?", (client_id,))
        client_row = cursor.fetchone()
        client_name = client_row['name'] if client_row else client_id

        # Get current document status
        cursor.execute("""
            SELECT document_id, rule_id, status, file_name, file_url, uploaded_at, notes
            FROM document_preparation
            WHERE client_id = ? AND period = ?
        """, (client_id, period))

        doc_rows = cursor.fetchall()
        status_map = {row['document_id']: dict(row) for row in doc_rows}

    # Load KURGAN rules
    rules_data = load_kurgan_rules()

    # Build checklist from rules with answer_templates
    checklist = []
    all_docs = []

    for rule in rules_data.get('rules', []):
        if not rule.get('answer_templates'):
            continue

        alarm_docs = []
        for doc in rule.get('required_documents', []):
            doc_status = status_map.get(doc['id'])
            doc_item = {
                "document_id": doc['id'],
                "name": doc['name'],
                "description": doc.get('description', ''),
                "priority": doc.get('priority', 'medium'),
                "status": doc_status['status'] if doc_status else 'pending',
                "file_name": doc_status['file_name'] if doc_status else None,
                "file_url": get_file_url(doc_status['file_url']) if doc_status and doc_status['file_url'] else None,
                "uploaded_at": doc_status['uploaded_at'] if doc_status else None,
                "notes": doc_status['notes'] if doc_status else None
            }
            alarm_docs.append(doc_item)
            all_docs.append(doc_item)

        if alarm_docs:
            checklist.append({
                "rule_id": rule['id'],
                "rule_name": rule['name'],
                "severity": rule.get('default_severity', 'medium'),
                "finding_summary": rule.get('description', ''),
                "documents": alarm_docs
            })

    # Calculate stats
    ready = len([d for d in all_docs if d['status'] == 'uploaded'])
    pending = len([d for d in all_docs if d['status'] == 'pending'])

    return {
        "client_id": client_id,
        "client_name": client_name,
        "period": period,
        "stats": {
            "total": len(all_docs),
            "ready": ready,
            "pending": pending,
            "progress_percent": int(ready / len(all_docs) * 100) if all_docs else 0
        },
        "checklist": checklist
    }
