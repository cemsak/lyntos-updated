"""
Inspector Questions Preparation API
Sprint 8.1 - LYNTOS V2

Endpoints:
- POST /api/v1/inspector-prep/notes - Save preparation note
- GET /api/v1/inspector-prep/notes/{client_id} - Get all notes for client
- POST /api/v1/inspector-prep/document-status - Update document status
- GET /api/v1/inspector-prep/progress/{client_id} - Get preparation progress
- GET /api/v1/inspector-prep/answer-templates/{rule_id} - Get answer templates
- GET /api/v1/inspector-prep/export-pdf/{client_id} - Export preparation as PDF
"""

from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from io import BytesIO
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
import uuid
import json
from pathlib import Path

from database.db import get_connection

router = APIRouter(prefix="/api/v1/inspector-prep", tags=["inspector-prep"])


# ════════════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ════════════════════════════════════════════════════════════════════════════════

class NoteRequest(BaseModel):
    client_id: str
    period: str
    rule_id: str
    question_index: int
    note_text: str


class DocumentStatusRequest(BaseModel):
    client_id: str
    period: str
    document_id: str
    status: str  # pending, uploaded, verified
    file_url: Optional[str] = None
    notes: Optional[str] = None


class NoteResponse(BaseModel):
    rule_id: str
    question_index: int
    note_text: str
    updated_at: str


class DocumentStatusResponse(BaseModel):
    document_id: str
    status: str
    uploaded_at: Optional[str] = None


class ProgressResponse(BaseModel):
    client_id: str
    period: Optional[str]
    notes_count: int
    documents_ready: int
    documents_total: int
    documents: List[DocumentStatusResponse]


class AnswerTemplate(BaseModel):
    question_index: int
    question: str
    suggested_approaches: List[str]
    avoid_phrases: List[str]
    key_documents: List[str]
    sample_answer: str


class AnswerTemplatesResponse(BaseModel):
    rule_id: str
    rule_name: str
    answer_templates: List[AnswerTemplate]


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

@router.post("/notes")
async def save_preparation_note(
    request: NoteRequest,
    authorization: str = Header(None)
):
    """Save or update preparation note for a question"""
    verify_auth(authorization)

    with get_connection() as conn:
        cursor = conn.cursor()

        # Check if note exists
        cursor.execute("""
            SELECT id FROM preparation_notes
            WHERE client_id = ? AND period = ? AND rule_id = ? AND question_index = ?
        """, (request.client_id, request.period, request.rule_id, request.question_index))

        existing = cursor.fetchone()
        now = datetime.now().isoformat()

        if existing:
            # Update existing note
            cursor.execute("""
                UPDATE preparation_notes
                SET note_text = ?, updated_at = ?
                WHERE id = ?
            """, (request.note_text, now, existing['id']))
        else:
            # Insert new note
            note_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO preparation_notes (id, client_id, period, rule_id, question_index, note_text, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (note_id, request.client_id, request.period, request.rule_id,
                  request.question_index, request.note_text, now, now))

        conn.commit()

    return {"success": True, "message": "Not kaydedildi"}


@router.get("/notes/{client_id}")
async def get_preparation_notes(
    client_id: str,
    period: Optional[str] = None,
    authorization: str = Header(None)
):
    """Get all preparation notes for a client"""
    verify_auth(authorization)

    with get_connection() as conn:
        cursor = conn.cursor()

        if period:
            cursor.execute("""
                SELECT rule_id, question_index, note_text, updated_at
                FROM preparation_notes
                WHERE client_id = ? AND period = ?
                ORDER BY rule_id, question_index
            """, (client_id, period))
        else:
            cursor.execute("""
                SELECT rule_id, question_index, note_text, updated_at
                FROM preparation_notes
                WHERE client_id = ?
                ORDER BY rule_id, question_index
            """, (client_id,))

        rows = cursor.fetchall()

        notes = [
            {
                "rule_id": row['rule_id'],
                "question_index": row['question_index'],
                "note_text": row['note_text'],
                "updated_at": row['updated_at']
            }
            for row in rows
        ]

    return {
        "client_id": client_id,
        "period": period,
        "notes": notes
    }


@router.post("/document-status")
async def update_document_status(
    request: DocumentStatusRequest,
    authorization: str = Header(None)
):
    """Update document preparation status"""
    verify_auth(authorization)

    if request.status not in ('pending', 'uploaded', 'verified'):
        raise HTTPException(400, "Invalid status. Must be: pending, uploaded, verified")

    with get_connection() as conn:
        cursor = conn.cursor()

        # Check if document status exists
        cursor.execute("""
            SELECT id FROM document_preparation
            WHERE client_id = ? AND period = ? AND document_id = ?
        """, (request.client_id, request.period, request.document_id))

        existing = cursor.fetchone()
        now = datetime.now().isoformat()

        if existing:
            # Update existing
            uploaded_at = now if request.status == "uploaded" else None
            cursor.execute("""
                UPDATE document_preparation
                SET status = ?, file_url = ?, notes = ?, uploaded_at = COALESCE(?, uploaded_at), updated_at = ?
                WHERE id = ?
            """, (request.status, request.file_url, request.notes, uploaded_at, now, existing['id']))
        else:
            # Insert new
            doc_id = str(uuid.uuid4())
            uploaded_at = now if request.status == "uploaded" else None
            cursor.execute("""
                INSERT INTO document_preparation (id, client_id, period, document_id, status, file_url, notes, uploaded_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (doc_id, request.client_id, request.period, request.document_id,
                  request.status, request.file_url, request.notes, uploaded_at, now, now))

        conn.commit()

    return {"success": True, "message": "Belge durumu guncellendi"}


@router.get("/progress/{client_id}")
async def get_preparation_progress(
    client_id: str,
    period: Optional[str] = None,
    authorization: str = Header(None)
):
    """Get overall preparation progress"""
    verify_auth(authorization)

    with get_connection() as conn:
        cursor = conn.cursor()

        # Get notes count
        if period:
            cursor.execute("""
                SELECT COUNT(*) as cnt FROM preparation_notes
                WHERE client_id = ? AND period = ?
            """, (client_id, period))
        else:
            cursor.execute("""
                SELECT COUNT(*) as cnt FROM preparation_notes
                WHERE client_id = ?
            """, (client_id,))

        notes_count = cursor.fetchone()['cnt']

        # Get document statuses
        if period:
            cursor.execute("""
                SELECT document_id, status, uploaded_at
                FROM document_preparation
                WHERE client_id = ? AND period = ?
            """, (client_id, period))
        else:
            cursor.execute("""
                SELECT document_id, status, uploaded_at
                FROM document_preparation
                WHERE client_id = ?
            """, (client_id,))

        rows = cursor.fetchall()

        documents = [
            {
                "document_id": row['document_id'],
                "status": row['status'],
                "uploaded_at": row['uploaded_at']
            }
            for row in rows
        ]

        docs_ready = len([d for d in documents if d['status'] in ('uploaded', 'verified')])
        docs_total = len(documents)

    return {
        "client_id": client_id,
        "period": period,
        "notes_count": notes_count,
        "documents_ready": docs_ready,
        "documents_total": docs_total,
        "documents": documents
    }


@router.get("/answer-templates/{rule_id}")
async def get_answer_templates(
    rule_id: str,
    authorization: str = Header(None)
):
    """Get answer templates for a specific rule"""
    verify_auth(authorization)

    data = load_kurgan_rules()

    for rule in data.get("rules", []):
        if rule.get("id") == rule_id:
            return {
                "rule_id": rule_id,
                "rule_name": rule.get("name"),
                "answer_templates": rule.get("answer_templates", [])
            }

    raise HTTPException(404, f"Rule {rule_id} not found")


@router.get("/answer-templates")
async def get_all_answer_templates(
    authorization: str = Header(None)
):
    """Get all answer templates grouped by rule_id"""
    verify_auth(authorization)

    data = load_kurgan_rules()

    result = {}
    for rule in data.get("rules", []):
        rule_id = rule.get("id")
        if rule_id and rule.get("answer_templates"):
            result[rule_id] = {
                "rule_name": rule.get("name"),
                "templates": rule.get("answer_templates", [])
            }

    return {
        "success": True,
        "templates": result
    }


@router.get("/export-pdf/{client_id}")
async def export_preparation_pdf(
    client_id: str,
    period: Optional[str] = None,
    authorization: str = Header(None)
):
    """Export preparation document as PDF"""
    verify_auth(authorization)

    from utils.pdf_export import generate_inspector_prep_pdf

    # Get client info
    with get_connection() as conn:
        cursor = conn.cursor()

        # Get client name from taxpayers table
        cursor.execute("""
            SELECT name FROM taxpayers WHERE id = ?
        """, (client_id,))
        client_row = cursor.fetchone()

        if not client_row:
            # Try with just the client_id as name
            client_name = client_id
        else:
            client_name = client_row['name']

        # Get preparation notes
        if period:
            cursor.execute("""
                SELECT rule_id, question_index, note_text
                FROM preparation_notes
                WHERE client_id = ? AND period = ?
            """, (client_id, period))
        else:
            cursor.execute("""
                SELECT rule_id, question_index, note_text
                FROM preparation_notes
                WHERE client_id = ?
            """, (client_id,))

        notes_rows = cursor.fetchall()
        notes = {f"{row['rule_id']}-{row['question_index']}": row['note_text'] for row in notes_rows}

        # Get document statuses
        if period:
            cursor.execute("""
                SELECT document_id, status
                FROM document_preparation
                WHERE client_id = ? AND period = ?
            """, (client_id, period))
        else:
            cursor.execute("""
                SELECT document_id, status
                FROM document_preparation
                WHERE client_id = ?
            """, (client_id,))

        doc_rows = cursor.fetchall()
        document_status = {row['document_id']: row['status'] for row in doc_rows}

    # Load KURGAN rules and build alarms with templates
    data = load_kurgan_rules()

    # For PDF export, we include all rules that have answer_templates
    # In a real scenario, you'd filter based on actual triggered alarms from simulation
    alarms_with_templates = []
    for rule in data.get("rules", []):
        if rule.get("answer_templates"):
            alarms_with_templates.append({
                'rule_id': rule.get('id'),
                'rule_name': rule.get('name'),
                'severity': rule.get('default_severity', 'medium'),
                'finding_summary': rule.get('description', ''),
                'inspector_questions': rule.get('inspector_questions', []),
                'answer_templates': rule.get('answer_templates', []),
                'required_documents': rule.get('required_documents', [])
            })

    # Generate PDF
    pdf_bytes = generate_inspector_prep_pdf(
        client_name=client_name,
        period=period or "2024/Q4",
        alarms=alarms_with_templates,
        notes=notes,
        document_status=document_status
    )

    # Return as downloadable file
    safe_name = client_name.replace(' ', '_').replace('/', '-')
    safe_period = (period or "2024Q4").replace('/', '-')
    filename = f"VDK_Hazirlik_{safe_name}_{safe_period}.pdf"

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
