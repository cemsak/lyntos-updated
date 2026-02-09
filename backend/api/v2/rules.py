"""
LYNTOS Kural Yönetimi API Endpoints
===================================
/api/v2/rules/* endpoints

KUTSAL KİTAP KURALLARI:
- ❌ Demo modu YASAK
- ❌ Hallucination YASAK
- ⚠️ Yanlış kural = MALİYE CEZASI riski
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging

from services.rule_manager import (
    RuleManager,
    RuleVersionManager,
    get_rules_for_analysis,
    search_rules_by_topic,
    get_inspector_prep_for_rule
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rules", tags=["Rules"])


# ═══════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════

class RuleCreate(BaseModel):
    rule_id: str = Field(..., description="Kural ID (örn: R-001, K-01)")
    name: str = Field(..., description="Kural adı")
    name_tr: Optional[str] = None
    category: str = Field(..., description="Kategori")
    priority: str = Field(default="MEDIUM", description="Öncelik: CRITICAL, HIGH, MEDIUM, LOW")
    severity: str = Field(default="MEDIUM", description="Önem: CRITICAL, HIGH, MEDIUM, LOW")
    description: Optional[str] = None
    algorithm: Optional[str] = None
    thresholds: Optional[Dict[str, Any]] = {}
    inputs: Optional[List[Dict[str, Any]]] = []
    outputs: Optional[List[Dict[str, Any]]] = []
    legal_refs: Optional[List[str]] = []
    test_cases: Optional[List[Dict[str, Any]]] = []
    evidence_required: Optional[List[str]] = []


class RuleUpdate(BaseModel):
    name: Optional[str] = None
    name_tr: Optional[str] = None
    version: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    algorithm: Optional[str] = None
    thresholds: Optional[Dict[str, Any]] = None
    inputs: Optional[List[Dict[str, Any]]] = None
    outputs: Optional[List[Dict[str, Any]]] = None
    legal_refs: Optional[List[str]] = None
    test_cases: Optional[List[Dict[str, Any]]] = None
    evidence_required: Optional[List[str]] = None
    is_active: Optional[bool] = None


class DuplicateResolve(BaseModel):
    rule_id_1: str
    rule_id_2: str
    resolution: str = Field(..., description="keep_both, merge, deprecate_1, deprecate_2")


class VersionUpdate(BaseModel):
    increment_type: str = Field(default="patch", description="major, minor, patch")
    reason: Optional[str] = Field(None, description="Versiyon artırma nedeni")


# ═══════════════════════════════════════════════════════════
# KURAL LİSTELEME VE ARAMA
# ═══════════════════════════════════════════════════════════

@router.get("")
async def get_rules(
    category: Optional[str] = Query(None, description="Kategori filtresi"),
    priority: Optional[str] = Query(None, description="Öncelik filtresi"),
    severity: Optional[str] = Query(None, description="Önem filtresi"),
    search: Optional[str] = Query(None, description="Arama terimi"),
    is_active: bool = Query(True, description="Sadece aktif kurallar"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Kuralları listele (filtreli)"""
    try:
        rules, total = RuleManager.get_all_rules(
            category=category,
            priority=priority,
            severity=severity,
            is_active=is_active,
            search=search,
            limit=limit,
            offset=offset
        )

        return {
            "success": True,
            "data": rules,
            "total": total,
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        logger.error(f"Error getting rules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics")
async def get_statistics():
    """Kural istatistikleri"""
    try:
        stats = RuleManager.get_statistics()
        return {"success": True, "data": stats}
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories")
async def get_categories():
    """Kategorileri ve sayılarını getir"""
    try:
        categories = RuleManager.get_categories()
        return {"success": True, "data": categories}
    except Exception as e:
        logger.error(f"Error getting categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_rules(
    q: str = Query(..., min_length=2, description="Arama terimi"),
    limit: int = Query(20, ge=1, le=100)
):
    """Kural ara"""
    try:
        rules = search_rules_by_topic(q)[:limit]
        return {
            "success": True,
            "query": q,
            "count": len(rules),
            "data": rules
        }
    except Exception as e:
        logger.error(f"Error searching rules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/for-analysis")
async def get_rules_for_client_analysis(
    nace_code: Optional[str] = Query(None, description="Müşteri NACE kodu")
):
    """Analiz için kuralları getir (NACE'e göre threshold'lar uygulanır)"""
    try:
        rules = get_rules_for_analysis(client_nace=nace_code)
        return {
            "success": True,
            "nace_code": nace_code,
            "count": len(rules),
            "data": rules
        }
    except Exception as e:
        logger.error(f"Error getting rules for analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════
# TEK KURAL OPERASYONLARİ
# ═══════════════════════════════════════════════════════════

@router.get("/{rule_id}")
async def get_rule(rule_id: str):
    """Tek bir kuralı getir"""
    rule = RuleManager.get_rule_by_id(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail=f"Kural bulunamadı: {rule_id}")

    return {"success": True, "data": rule}


@router.get("/{rule_id}/inspector-prep")
async def get_inspector_preparation(rule_id: str):
    """Müfettiş hazırlık bilgilerini getir"""
    prep = get_inspector_prep_for_rule(rule_id)
    if not prep:
        raise HTTPException(status_code=404, detail=f"Kural bulunamadı: {rule_id}")

    return {"success": True, "data": prep}


@router.get("/{rule_id}/legal-refs")
async def get_legal_references(rule_id: str):
    """Kural için mevzuat referanslarını getir"""
    try:
        refs = RuleManager.get_rule_legal_refs(rule_id)
        return {"success": True, "rule_id": rule_id, "data": refs}
    except Exception as e:
        logger.error(f"Error getting legal refs for {rule_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{rule_id}/execution-stats")
async def get_execution_stats(
    rule_id: str,
    days: int = Query(30, ge=1, le=365)
):
    """Kural çalışma istatistiklerini getir"""
    try:
        stats = RuleManager.get_execution_stats(rule_id, days=days)
        return {"success": True, "data": stats}
    except Exception as e:
        logger.error(f"Error getting execution stats for {rule_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_rule(rule: RuleCreate):
    """Yeni kural oluştur"""
    try:
        # Mevcut kural kontrolü
        existing = RuleManager.get_rule_by_id(rule.rule_id)
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Kural zaten mevcut: {rule.rule_id}"
            )

        created = RuleManager.create_rule(rule.dict())
        return {"success": True, "data": created}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{rule_id}")
async def update_rule(rule_id: str, updates: RuleUpdate):
    """Kural güncelle"""
    try:
        # Sadece None olmayan alanları güncelle
        update_data = {k: v for k, v in updates.dict().items() if v is not None}

        if not update_data:
            raise HTTPException(status_code=400, detail="Güncellenecek alan yok")

        updated = RuleManager.update_rule(rule_id, update_data)
        if not updated:
            raise HTTPException(status_code=404, detail=f"Kural bulunamadı: {rule_id}")

        return {"success": True, "data": updated}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating rule {rule_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{rule_id}/deprecate")
async def deprecate_rule(
    rule_id: str,
    replaced_by: Optional[str] = Query(None, description="Yerini alan kural ID")
):
    """Kuralı deprecated yap"""
    try:
        success = RuleManager.deprecate_rule(rule_id, deprecated_by=replaced_by)
        if not success:
            raise HTTPException(status_code=404, detail=f"Kural bulunamadı: {rule_id}")

        return {
            "success": True,
            "message": f"Kural deprecated yapıldı: {rule_id}",
            "replaced_by": replaced_by
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deprecating rule {rule_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════
# DUPLİCATE YÖNETİMİ
# ═══════════════════════════════════════════════════════════

@router.get("/duplicates/pending")
async def get_pending_duplicates():
    """Çözülmemiş duplicate'ları getir"""
    try:
        duplicates = RuleManager.get_duplicates(status='pending')
        return {
            "success": True,
            "count": len(duplicates),
            "data": duplicates
        }
    except Exception as e:
        logger.error(f"Error getting duplicates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/duplicates/all")
async def get_all_duplicates():
    """Tüm duplicate'ları getir (çözülmüş ve bekleyen)"""
    try:
        duplicates = RuleManager.get_duplicates(status=None)  # None = all
        return {
            "success": True,
            "count": len(duplicates),
            "data": duplicates
        }
    except Exception as e:
        logger.error(f"Error getting all duplicates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/duplicates/resolve")
async def resolve_duplicate(resolve: DuplicateResolve):
    """Duplicate çözümle"""
    try:
        valid_resolutions = ['keep_both', 'merge', 'deprecate_1', 'deprecate_2']
        if resolve.resolution not in valid_resolutions:
            raise HTTPException(
                status_code=400,
                detail=f"Geçersiz çözüm. Geçerli değerler: {valid_resolutions}"
            )

        success = RuleManager.resolve_duplicate(
            rule_id_1=resolve.rule_id_1,
            rule_id_2=resolve.rule_id_2,
            resolution=resolve.resolution
        )

        if not success:
            raise HTTPException(
                status_code=404,
                detail="Duplicate kaydı bulunamadı"
            )

        return {
            "success": True,
            "message": f"Duplicate çözümlendi: {resolve.resolution}",
            "rule_id_1": resolve.rule_id_1,
            "rule_id_2": resolve.rule_id_2
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving duplicate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════
# VERSİYONLAMA ENDPOİNTLERİ
# ═══════════════════════════════════════════════════════════

@router.post("/{rule_id}/version")
async def update_rule_version(rule_id: str, version_update: VersionUpdate):
    """Kuralın versiyonunu artır"""
    try:
        valid_types = ['major', 'minor', 'patch']
        if version_update.increment_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Geçersiz increment_type. Geçerli değerler: {valid_types}"
            )

        result = RuleVersionManager.update_rule_version(
            rule_id=rule_id,
            increment_type=version_update.increment_type,
            reason=version_update.reason
        )

        if not result:
            raise HTTPException(status_code=404, detail=f"Kural bulunamadı: {rule_id}")

        return {"success": True, "data": result}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating version for {rule_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{rule_id}/version-history")
async def get_version_history(
    rule_id: str,
    limit: int = Query(20, ge=1, le=100)
):
    """Kuralın versiyon geçmişini getir"""
    try:
        history = RuleVersionManager.get_version_history(rule_id, limit=limit)
        return {
            "success": True,
            "rule_id": rule_id,
            "count": len(history),
            "data": history
        }
    except Exception as e:
        logger.error(f"Error getting version history for {rule_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mevzuat-sync/{mevzuat_id}")
async def sync_on_mevzuat_change(
    mevzuat_id: str,
    change_type: str = Query("update", description="update, repeal, correction")
):
    """
    Mevzuat değişikliğinde ilgili kuralları güncelle.
    Bu endpoint mevzuat takip sisteminden çağrılır.
    """
    try:
        valid_types = ['update', 'repeal', 'correction']
        if change_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Geçersiz change_type. Geçerli değerler: {valid_types}"
            )

        updated_rules = RuleVersionManager.on_mevzuat_change(
            mevzuat_id=mevzuat_id,
            change_type=change_type
        )

        return {
            "success": True,
            "mevzuat_id": mevzuat_id,
            "change_type": change_type,
            "affected_rules_count": len(updated_rules),
            "updated_rules": updated_rules
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing mevzuat change {mevzuat_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
