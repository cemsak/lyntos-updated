"""
Document Storage Configuration
Sprint 8.2 - LYNTOS V2

Handles file uploads for evidence documents.
"""

import os
from pathlib import Path
from typing import Optional, Tuple
from datetime import datetime

# Base upload directory
UPLOAD_BASE = Path(os.getenv("UPLOAD_DIR", "./uploads"))
EVIDENCE_DIR = UPLOAD_BASE / "evidence"

# Ensure directories exist
UPLOAD_BASE.mkdir(parents=True, exist_ok=True)
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

# Allowed file types
ALLOWED_EXTENSIONS = {
    '.pdf', '.xlsx', '.xls', '.doc', '.docx',
    '.png', '.jpg', '.jpeg', '.gif',
    '.csv', '.txt'
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def get_client_evidence_path(client_id: str, period: str) -> Path:
    """Get evidence directory for a specific client/period"""
    safe_period = period.replace("/", "_")
    path = EVIDENCE_DIR / client_id / safe_period
    path.mkdir(parents=True, exist_ok=True)
    return path


def generate_safe_filename(original_name: str, document_id: str) -> str:
    """Generate safe filename with document ID prefix"""
    ext = Path(original_name).suffix.lower()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = "".join(c for c in Path(original_name).stem if c.isalnum() or c in "._-")[:50]
    return f"{document_id}_{safe_name}_{timestamp}{ext}"


def validate_file(filename: str, file_size: int) -> Tuple[bool, str]:
    """Validate file extension and size"""
    ext = Path(filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Desteklenmeyen dosya turu: {ext}"

    if file_size > MAX_FILE_SIZE:
        return False, f"Dosya cok buyuk: {file_size / 1024 / 1024:.1f}MB (max 10MB)"

    return True, ""


def save_uploaded_file(
    client_id: str,
    period: str,
    document_id: str,
    filename: str,
    content: bytes
) -> Tuple[bool, str, Optional[str]]:
    """
    Save uploaded file to evidence directory

    Returns: (success, message, file_path)
    """
    # Validate
    is_valid, error = validate_file(filename, len(content))
    if not is_valid:
        return False, error, None

    # Generate path
    evidence_path = get_client_evidence_path(client_id, period)
    safe_filename = generate_safe_filename(filename, document_id)
    file_path = evidence_path / safe_filename

    # Save file
    try:
        with open(file_path, "wb") as f:
            f.write(content)
        return True, "Dosya yuklendi", str(file_path)
    except Exception as e:
        return False, f"Dosya kaydedilemedi: {str(e)}", None


def delete_uploaded_file(file_path: str) -> bool:
    """Delete an uploaded file"""
    try:
        Path(file_path).unlink(missing_ok=True)
        return True
    except Exception:
        return False


def get_file_url(file_path: Optional[str]) -> Optional[str]:
    """Convert file path to downloadable URL"""
    if not file_path:
        return None
    # This should be adapted based on your file serving setup
    # For now, return relative path
    try:
        return f"/files/{Path(file_path).relative_to(UPLOAD_BASE)}"
    except ValueError:
        return file_path
