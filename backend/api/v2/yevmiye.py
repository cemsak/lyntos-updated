"""
LYNTOS API v2 - Yevmiye Defteri Endpoint
E-Defter entries'den yevmiye verilerini çeker.

NO AUTH REQUIRED - Frontend'den doğrudan erişilebilir.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
import logging

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.db import get_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/yevmiye", tags=["yevmiye"])


class YevmiyeEntry(BaseModel):
    id: int
    fis_no: str
    tarih: str
    fis_aciklama: Optional[str]
    hesap_kodu: str
    hesap_adi: Optional[str]
    tutar: float
    borc_alacak: str  # B veya A
    source_file: str


class YevmiyeListResponse(BaseModel):
    entries: List[YevmiyeEntry]
    total: int
    page: int
    pages: int
    page_size: int


@router.get("/list", response_model=YevmiyeListResponse)
async def get_yevmiye_list(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Query(..., description="Dönem ID (örn: 2025-Q1)"),
    page: int = Query(1, ge=1, description="Sayfa numarası"),
    page_size: int = Query(50, ge=1, le=500, description="Sayfa başına kayıt"),
    search: Optional[str] = Query(None, description="Arama terimi"),
    tenant_id: str = Query("default", description="Tenant ID")
):
    """
    Yevmiye defteri kayıtlarını listele.

    E-defter entries tablosundan defter_tipi='Y' olan kayıtları çeker.
    Auth gerektirmez.
    """
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            # Offset hesapla
            offset = (page - 1) * page_size

            # Base query - sadece yevmiye kayıtları (Y tipi)
            base_where = "client_id = ? AND period_id = ? AND defter_tipi = 'Y'"
            params = [client_id, period_id]

            # Search varsa ekle
            if search:
                base_where += " AND (fis_aciklama LIKE ? OR hesap_kodu LIKE ? OR hesap_adi LIKE ?)"
                search_param = f"%{search}%"
                params.extend([search_param, search_param, search_param])

            # Toplam kayıt sayısı
            cursor.execute(f"""
                SELECT COUNT(*) FROM edefter_entries
                WHERE {base_where}
            """, params)
            total = cursor.fetchone()[0]

            # Sayfa sayısı
            pages = (total + page_size - 1) // page_size if total > 0 else 1

            # Verileri çek
            cursor.execute(f"""
                SELECT
                    id, fis_no, tarih, fis_aciklama,
                    hesap_kodu, hesap_adi, tutar, borc_alacak,
                    source_file
                FROM edefter_entries
                WHERE {base_where}
                ORDER BY tarih DESC, fis_no DESC
                LIMIT ? OFFSET ?
            """, params + [page_size, offset])

            entries = []
            for row in cursor.fetchall():
                row_dict = dict(row)
                entries.append(YevmiyeEntry(
                    id=row_dict['id'],
                    fis_no=row_dict['fis_no'] or '',
                    tarih=row_dict['tarih'] or '',
                    fis_aciklama=row_dict['fis_aciklama'],
                    hesap_kodu=row_dict['hesap_kodu'] or '',
                    hesap_adi=row_dict['hesap_adi'],
                    tutar=row_dict['tutar'] or 0,
                    borc_alacak=row_dict['borc_alacak'] or 'B',
                    source_file=row_dict['source_file'] or ''
                ))

            return YevmiyeListResponse(
                entries=entries,
                total=total,
                page=page,
                pages=pages,
                page_size=page_size
            )

    except Exception as e:
        logger.error(f"Yevmiye list error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_yevmiye_summary(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Query(..., description="Dönem ID"),
    tenant_id: str = Query("default", description="Tenant ID")
):
    """
    Yevmiye özet bilgilerini getir.
    """
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            # Toplam yevmiye kaydı
            cursor.execute("""
                SELECT COUNT(*) FROM edefter_entries
                WHERE client_id = ? AND period_id = ? AND defter_tipi = 'Y'
            """, (client_id, period_id))
            total_entries = cursor.fetchone()[0]

            # Benzersiz fiş sayısı
            cursor.execute("""
                SELECT COUNT(DISTINCT fis_no) FROM edefter_entries
                WHERE client_id = ? AND period_id = ? AND defter_tipi = 'Y'
            """, (client_id, period_id))
            unique_fis = cursor.fetchone()[0]

            # Toplam borç/alacak
            cursor.execute("""
                SELECT
                    SUM(CASE WHEN borc_alacak = 'B' THEN tutar ELSE 0 END) as total_borc,
                    SUM(CASE WHEN borc_alacak = 'A' THEN tutar ELSE 0 END) as total_alacak
                FROM edefter_entries
                WHERE client_id = ? AND period_id = ? AND defter_tipi = 'Y'
            """, (client_id, period_id))
            row = cursor.fetchone()

            return {
                "total_entries": total_entries,
                "unique_fis_count": unique_fis,
                "total_borc": row[0] or 0,
                "total_alacak": row[1] or 0,
                "period_id": period_id,
                "client_id": client_id
            }

    except Exception as e:
        logger.error(f"Yevmiye summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "yevmiye-v2"}
