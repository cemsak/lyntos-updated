# -*- coding: utf-8 -*-
"""
LYNTOS v2 Upload API - ⚠️ KALDIRILDI
======================================

POST /api/v2/upload → 410 Gone

Bu endpoint tamamen kaldırılmıştır.
Lütfen /api/v2/ingest kullanın.

Author: Claude
Date: 2026-01-22
Deprecated: 2026-02-06
Removed: 2026-02-08
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2", tags=["upload"])


@router.post("/upload")
async def upload_donem_zip(
    file: UploadFile = File(..., description="Dönem ZIP dosyası"),
    smmm_id: str = Form(default="HKOZKAN", description="SMMM kimliği"),
    client_id: str = Form(default="", description="Mükellef ID"),
    period: str = Form(default="", description="Dönem (örn: 2025-Q1)")
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
            "message": "Lütfen /api/v2/ingest endpoint'ini kullanın. "
                       "ZIP + tekil dosya desteği, SHA256 dedup, dönem doğrulama dahil.",
        }
    )
