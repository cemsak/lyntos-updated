# -*- coding: utf-8 -*-
"""
ZIP Bulk Upload API — ⚠️ KALDIRILDI
=====================================

POST /bulk-upload/zip → 410 Gone

Bu endpoint tamamen kaldırılmıştır.
Lütfen /api/v2/ingest kullanın.

Author: Claude
Date: 2026-01-19
Removed: 2026-02-08
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bulk-upload", tags=["bulk-upload"])


@router.post("/zip")
async def upload_zip(
    file: UploadFile = File(...),
    tenant_id: str = Form(default="HKOZKAN"),
    client_id: str = Form(default=None),
    period: str = Form(default=None)
):
    """
    ⚠️ KALDIRILDI — Bu endpoint artık çalışmaz.
    Lütfen /api/v2/ingest endpoint'ini kullanın.
    """
    return JSONResponse(
        status_code=410,
        content={
            "success": False,
            "error": "Bu endpoint kaldırılmıştır.",
            "redirect": "/api/v2/ingest",
            "message": "Lütfen /api/v2/ingest endpoint'ini kullanın.",
        }
    )
