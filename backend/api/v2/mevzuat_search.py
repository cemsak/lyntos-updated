"""
LYNTOS Mevzuat Search API - PENCERE 5
Özelge ve Mevzuat Arama Endpoint'leri

SMMM/YMM İş Akışı:
- Hızlı özelge/mevzuat arama
- Konu bazlı filtreleme
- Kural bağlantılarını görme
- Güncel mevzuat takibi
"""

from fastapi import APIRouter, Query, HTTPException, Depends
from typing import List, Optional
from dataclasses import asdict
from middleware.auth import verify_token
from services.mevzuat_search import (
    MevzuatSearchService,
    SearchFilters,
    MEVZUAT_TYPES,
    KURUMLAR
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/mevzuat", tags=["mevzuat-search"], dependencies=[Depends(verify_token)])


# ═══════════════════════════════════════════════════════════════════════════════
# SEARCH ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/search")
async def search_mevzuat(
    q: str = Query("", description="Arama sorgusu"),
    types: Optional[str] = Query(None, description="Mevzuat türleri (virgülle ayrılmış)"),
    kurumlar: Optional[str] = Query(None, description="Kurumlar (virgülle ayrılmış)"),
    yururluk_from: Optional[str] = Query(None, description="Yürürlük başlangıç tarihi (YYYY-MM-DD)"),
    yururluk_to: Optional[str] = Query(None, description="Yürürlük bitiş tarihi (YYYY-MM-DD)"),
    only_active: bool = Query(True, description="Sadece aktif mevzuatlar"),
    rule_id: Optional[str] = Query(None, description="İlişkili kural ID"),
    etiket: Optional[str] = Query(None, description="Kapsam etiketi"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """
    Mevzuat arama.

    Özellikler:
    - Tam metin arama (başlık, açıklama, içerik)
    - Tür filtreleme (kanun, tebliğ, özelge, vb.)
    - Kurum filtreleme (GİB, HMB, TBMM)
    - Tarih aralığı filtreleme
    - Kural bağlantısı filtreleme

    Örnek:
    - GET /api/v2/mevzuat/search?q=kdv indirim
    - GET /api/v2/mevzuat/search?q=transfer fiyatlandırması&types=ozelge
    - GET /api/v2/mevzuat/search?rule_id=R-401A
    """
    try:
        service = MevzuatSearchService()

        # Parse comma-separated filters
        mevzuat_types = [t.strip() for t in types.split(',')] if types else []
        kurum_list = [k.strip() for k in kurumlar.split(',')] if kurumlar else []

        filters = SearchFilters(
            query=q,
            mevzuat_types=mevzuat_types,
            kurumlar=kurum_list,
            yururluk_from=yururluk_from,
            yururluk_to=yururluk_to,
            only_active=only_active,
            affected_rule_id=rule_id,
            kapsam_etiketi=etiket,
            limit=limit,
            offset=offset
        )

        results, total = service.search(filters)

        return {
            "success": True,
            "data": {
                "results": [asdict(r) for r in results],
                "total": total,
                "page": (offset // limit) + 1,
                "limit": limit,
                "query": q,
                "filters_applied": {
                    "types": mevzuat_types,
                    "kurumlar": kurum_list,
                    "yururluk_from": yururluk_from,
                    "yururluk_to": yururluk_to,
                    "only_active": only_active,
                    "rule_id": rule_id,
                    "etiket": etiket
                }
            }
        }

    except Exception as e:
        logger.error(f"[MevzuatSearch] Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics")
async def get_mevzuat_statistics():
    """
    Mevzuat istatistikleri.

    Döndürür:
    - Toplam aktif/tüm mevzuat sayısı
    - Türe göre dağılım
    - Kuruma göre dağılım
    - Güven sınıfına göre dağılım
    """
    try:
        service = MevzuatSearchService()
        stats = service.get_statistics()

        return {
            "success": True,
            "data": stats
        }

    except Exception as e:
        logger.error(f"[MevzuatSearch] Statistics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent")
async def get_recent_mevzuat(
    limit: int = Query(10, ge=1, le=50)
):
    """
    Son eklenen mevzuatlar.
    """
    try:
        service = MevzuatSearchService()
        recent = service.get_recent(limit)

        return {
            "success": True,
            "data": recent
        }

    except Exception as e:
        logger.error(f"[MevzuatSearch] Recent error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/types")
async def get_mevzuat_types():
    """
    Mevcut mevzuat türleri ve etiketleri.
    """
    return {
        "success": True,
        "data": {
            "types": MEVZUAT_TYPES,
            "kurumlar": KURUMLAR
        }
    }


@router.get("/by-type/{mevzuat_type}")
async def get_mevzuat_by_type(
    mevzuat_type: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """
    Belirli türdeki tüm mevzuatları listele.

    StatCard tıklaması için kullanılır:
    - GET /api/v2/mevzuat/by-type/kanun → 27 kanun listesi
    - GET /api/v2/mevzuat/by-type/ozelge → 15 özelge listesi
    """
    try:
        service = MevzuatSearchService()
        results, total = service.get_type_list(mevzuat_type, limit, offset)

        return {
            "success": True,
            "data": {
                "results": [asdict(r) for r in results],
                "total": total,
                "type": mevzuat_type,
                "type_label": MEVZUAT_TYPES.get(mevzuat_type, mevzuat_type),
            }
        }

    except Exception as e:
        logger.error(f"[MevzuatSearch] By type error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-rule/{rule_id}")
async def get_mevzuat_by_rule(rule_id: str):
    """
    Belirli bir kurala bağlı tüm mevzuatları getir.

    SMMM kullanımı:
    - Bir risk kuralının yasal dayanağını görme
    - İlgili kanun/tebliğ/özelge bağlantıları
    """
    try:
        service = MevzuatSearchService()
        mevzuatlar = service.get_by_rule(rule_id)

        return {
            "success": True,
            "data": {
                "rule_id": rule_id,
                "mevzuatlar": mevzuatlar,
                "count": len(mevzuatlar)
            }
        }

    except Exception as e:
        logger.error(f"[MevzuatSearch] By rule error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{mevzuat_id}")
async def get_mevzuat_detail(mevzuat_id: int):
    """
    Mevzuat detayını getir.

    Bağlı kurallar dahil tam bilgi.
    """
    try:
        service = MevzuatSearchService()
        mevzuat = service.get_by_id(mevzuat_id)

        if not mevzuat:
            raise HTTPException(status_code=404, detail="Mevzuat bulunamadı")

        # Get linked rules
        linked_rules = service.get_linked_rules(mevzuat_id)

        return {
            "success": True,
            "data": {
                **mevzuat,
                "linked_rules": linked_rules
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[MevzuatSearch] Detail error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/code/{src_code}")
async def get_mevzuat_by_code(src_code: str):
    """
    SRC kodu ile mevzuat getir.

    Örnek: GET /api/v2/mevzuat/code/SRC-0001
    """
    try:
        service = MevzuatSearchService()
        mevzuat = service.get_by_src_code(src_code)

        if not mevzuat:
            raise HTTPException(status_code=404, detail="Mevzuat bulunamadı")

        return {
            "success": True,
            "data": mevzuat
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[MevzuatSearch] By code error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# QUICK SEARCH ENDPOINT (AI Agent Optimized)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/quick-search")
async def quick_search(body: dict):
    """
    AI agent için optimize edilmiş hızlı arama.

    Request body:
    {
        "question": "KDV indiriminin şartları nelerdir?",
        "context": {
            "client_sector": "İmalat",
            "related_rules": ["R-301", "R-302"]
        }
    }

    Döndürür:
    - En alakalı 5 mevzuat
    - Özet bilgiler
    - Kaynak URL'ler
    """
    try:
        question = body.get("question", "")
        context = body.get("context", {})

        if not question:
            raise HTTPException(status_code=400, detail="question gerekli")

        service = MevzuatSearchService()

        # Search with question as query
        filters = SearchFilters(
            query=question,
            only_active=True,
            limit=5
        )

        results, total = service.search(filters)

        # Format for AI consumption
        ai_results = []
        for r in results:
            ai_results.append({
                "src_code": r.src_code,
                "type": MEVZUAT_TYPES.get(r.mevzuat_type, r.mevzuat_type),
                "title": r.baslik,
                "summary": r.kisa_aciklama or "",
                "organization": KURUMLAR.get(r.kurum, r.kurum),
                "effective_date": r.yururluk_tarih,
                "url": r.canonical_url,
                "relevance": round(r.relevance_score, 2),
                "key_excerpts": r.highlights[:2] if r.highlights else []
            })

        return {
            "success": True,
            "data": {
                "question": question,
                "found": len(ai_results),
                "total_matches": total,
                "results": ai_results,
                "search_tips": [
                    "Daha spesifik terimler kullanın",
                    "Tür filtresi ekleyin (ozelge, teblig, kanun)",
                    "Tarih aralığı belirtin"
                ] if total > 10 else []
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[MevzuatSearch] Quick search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
