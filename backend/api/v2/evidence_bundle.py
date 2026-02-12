"""
Evidence Bundle API Routes
POST /api/v2/evidence-bundle/generate - Generate evidence bundle
GET  /api/v2/evidence-bundle/summary  - Get Big4 workpaper summary from DB
LYNTOS V1 Critical
"""
from fastapi import APIRouter, Query, HTTPException, Depends
from fastapi.responses import FileResponse
from utils.period_utils import get_period_db
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import hashlib
import logging
import os

from schemas.feed import FeedSeverity
from services.feed import get_feed_service
from services.evidence_bundle import get_evidence_bundle_service
from middleware.auth import verify_token, check_client_access
from middleware.cache import response_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/evidence-bundle", tags=["evidence-bundle"])


class GenerateBundleRequest(BaseModel):
    client_id: str
    period: str
    severity_filter: Optional[List[str]] = ["CRITICAL", "HIGH"]
    evidence_files_dir: Optional[str] = None
    smmm_id: Optional[str] = None  # Deprecated: smmm_id token'dan alınır (VT-10)


# ============================================================================
# GET /summary — Big4 Workpaper Summary from DB
# ============================================================================

def _make_document(doc_id: str, filename: str, category: str, status: str, file_size: int = 0, uploaded_by: str = "LYNTOS"):
    """Helper to create an EvidenceDocument dict matching frontend type."""
    now = datetime.now().isoformat()
    return {
        "id": doc_id,
        "filename": filename,
        "category": category,
        "uploadedAt": now,
        "uploadedBy": uploaded_by,
        "fileSize": file_size,
        "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "hash": hashlib.sha256(f"{doc_id}_{filename}".encode()).hexdigest()[:16],
        "version": 1,
        "status": status,
        "auditTrail": [],
    }


def _section_status(docs: list) -> str:
    """Determine section status from document list."""
    if not docs:
        return "pending"
    statuses = [d["status"] for d in docs]
    if all(s == "verified" for s in statuses):
        return "complete"
    if any(s == "verified" for s in statuses):
        return "partial"
    return "pending"


@router.get("/summary")
async def get_evidence_summary(
    client_id: str = Query(..., description="Mükellef ID"),
    period_id: str = Depends(get_period_db),
    user: dict = Depends(verify_token),
):
    """
    Big4 formatında kanıt paketi özeti.
    DB'deki mevcut verileri tarayarak 8 bölümlük (A-H) workpaper durumunu döner.
    """
    await check_client_access(user, client_id)
    from database.db import get_connection

    # P-10: Cache kontrolü (TTL 4 saat)
    cache_key = f"evidence_summary:{client_id}:{period_id}"
    cached = response_cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            # ------------------------------------------------------------------
            # A - Genel Bilgiler: clients tablosundan şirket bilgileri
            # ------------------------------------------------------------------
            a_docs = []
            cursor.execute(
                "SELECT id, name, tax_id FROM clients WHERE id = ?",
                (client_id,)
            )
            client_row = cursor.fetchone()
            if client_row:
                a_docs.append(_make_document(
                    "A-001", f"A-001_Sirket_Bilgileri_{client_row['name']}.xlsx",
                    "Genel Bilgiler", "verified", 2048, "Sistem"
                ))

            # Vergi levhası
            cursor.execute(
                "SELECT id FROM tax_certificates WHERE client_id = ? LIMIT 1",
                (client_id,)
            )
            if cursor.fetchone():
                a_docs.append(_make_document(
                    "A-002", f"A-002_Vergi_Levhasi_{period_id}.pdf",
                    "Genel Bilgiler", "verified", 4096, "Sistem"
                ))

            # ------------------------------------------------------------------
            # VT-7: Toplu COUNT sorgusu (14 sorgu → 1 UNION ALL)
            # ------------------------------------------------------------------
            cursor.execute("""
                SELECT 'mizan' as tbl, COUNT(*) as cnt FROM mizan_entries WHERE client_id = ? AND period_id = ?
                UNION ALL
                SELECT 'journal', COUNT(*) FROM journal_entries WHERE client_id = ? AND period_id = ?
                UNION ALL
                SELECT 'ledger', COUNT(*) FROM ledger_entries WHERE client_id = ? AND period_id = ?
                UNION ALL
                SELECT 'kdv_beyanname', COUNT(*) FROM kdv_beyanname_data WHERE client_id = ? AND period_id = ?
                UNION ALL
                SELECT 'tahakkuk', COUNT(*) FROM tahakkuk_entries WHERE client_id = ? AND period_id = ?
                UNION ALL
                SELECT 'edefter', COUNT(*) FROM edefter_entries WHERE client_id = ? AND period_id = ?
                UNION ALL
                SELECT 'bank', COUNT(*) FROM bank_transactions WHERE client_id = ? AND period_id = ?
                UNION ALL
                SELECT 'banka_bakiye', COUNT(*) FROM banka_bakiye_data WHERE client_id = ? AND period_id = ?
                UNION ALL
                SELECT 'efatura_upload', COUNT(*) FROM document_uploads WHERE client_id = ? AND period_id = ? AND doc_type IN ('EFATURA', 'EARSIV', 'E-FATURA', 'E-ARSIV')
                UNION ALL
                SELECT 'sgk_upload', COUNT(*) FROM document_uploads WHERE client_id = ? AND period_id = ? AND doc_type IN ('SGK', 'BORDRO', 'APHB')
                UNION ALL
                SELECT 'rule_log', COUNT(*) FROM rule_execution_log WHERE client_id = ? AND period_id = ?
            """, (client_id, period_id) * 11)

            counts = {}
            for row in cursor.fetchall():
                counts[row["tbl"]] = row["cnt"]

            # Beyanname tipleri (ayrı sorgu — DISTINCT gerekli)
            cursor.execute(
                "SELECT DISTINCT beyanname_tipi FROM beyanname_entries WHERE client_id = ? AND period_id = ?",
                (client_id, period_id)
            )
            beyanname_rows = cursor.fetchall()

            # ------------------------------------------------------------------
            # B - Mizan ve Defterler
            # ------------------------------------------------------------------
            b_docs = []
            mizan_count = counts.get("mizan", 0)
            if mizan_count > 0:
                b_docs.append(_make_document(
                    "B-001", f"B-001_Mizan_{period_id}.xlsx",
                    "Mizan ve Defterler", "verified", mizan_count * 120, "Sistem"
                ))
            yevmiye_count = counts.get("journal", 0)
            if yevmiye_count > 0:
                b_docs.append(_make_document(
                    "B-002", f"B-002_Yevmiye_{period_id}.xlsx",
                    "Mizan ve Defterler", "verified", yevmiye_count * 80, "Sistem"
                ))
            kebir_count = counts.get("ledger", 0)
            if kebir_count > 0:
                b_docs.append(_make_document(
                    "B-003", f"B-003_Kebir_{period_id}.xlsx",
                    "Mizan ve Defterler", "verified", kebir_count * 100, "Sistem"
                ))

            # ------------------------------------------------------------------
            # C - Vergi Beyannameleri
            # ------------------------------------------------------------------
            c_docs = []
            if counts.get("kdv_beyanname", 0) > 0:
                c_docs.append(_make_document(
                    "C-001", f"C-001_KDV_Beyannamesi_{period_id}.pdf",
                    "Vergi Beyannameleri", "verified", 8192, "Sistem"
                ))
            for idx, br in enumerate(beyanname_rows):
                btype = br["beyanname_tipi"]
                c_docs.append(_make_document(
                    f"C-{idx + 2:03d}", f"C-{idx + 2:03d}_{btype}_{period_id}.pdf",
                    "Vergi Beyannameleri", "verified", 6144, "Sistem"
                ))
            if counts.get("tahakkuk", 0) > 0:
                c_docs.append(_make_document(
                    f"C-{len(c_docs) + 1:03d}", f"C-{len(c_docs) + 1:03d}_Tahakkuk_Fisleri_{period_id}.pdf",
                    "Vergi Beyannameleri", "verified", 4096, "Sistem"
                ))

            # ------------------------------------------------------------------
            # D - E-Fatura / E-Arşiv
            # ------------------------------------------------------------------
            d_docs = []
            edefter_count = counts.get("edefter", 0)
            if edefter_count > 0:
                d_docs.append(_make_document(
                    "D-001", f"D-001_EDefter_Kayitlari_{period_id}.xlsx",
                    "E-Fatura / E-Arşiv", "verified", edefter_count * 150, "Sistem"
                ))
            if counts.get("efatura_upload", 0) > 0:
                d_docs.append(_make_document(
                    "D-002", f"D-002_EFatura_Belgeleri_{period_id}.zip",
                    "E-Fatura / E-Arşiv", "verified", 32768, "Sistem"
                ))

            # ------------------------------------------------------------------
            # E - Banka ve Finansal
            # ------------------------------------------------------------------
            e_docs = []
            bank_count = counts.get("bank", 0)
            if bank_count > 0:
                e_docs.append(_make_document(
                    "E-001", f"E-001_Banka_Ekstreleri_{period_id}.xlsx",
                    "Banka ve Finansal", "verified", bank_count * 90, "Sistem"
                ))
            if counts.get("banka_bakiye", 0) > 0:
                e_docs.append(_make_document(
                    "E-002", f"E-002_Banka_Mutabakat_{period_id}.xlsx",
                    "Banka ve Finansal", "verified", 4096, "Sistem"
                ))

            # ------------------------------------------------------------------
            # F - SGK ve Bordro
            # ------------------------------------------------------------------
            f_docs = []
            if counts.get("sgk_upload", 0) > 0:
                f_docs.append(_make_document(
                    "F-001", f"F-001_SGK_Bildirgeleri_{period_id}.pdf",
                    "SGK ve Bordro", "verified", 12288, "Sistem"
                ))

            # ------------------------------------------------------------------
            # G - Analitik İnceleme
            # ------------------------------------------------------------------
            g_docs = []
            rule_count = counts.get("rule_log", 0)
            if rule_count > 0:
                g_docs.append(_make_document(
                    "G-001", f"G-001_VDK_Risk_Analizi_{period_id}.pdf",
                    "Analitik İnceleme", "verified", 16384, "Sistem"
                ))
                g_docs.append(_make_document(
                    "G-002", f"G-002_Kural_Sonuclari_{period_id}.xlsx",
                    "Analitik İnceleme", "verified", rule_count * 200, "Sistem"
                ))

            # Cross-check results (if mizan exists, cross-check can run)
            if mizan_count > 0:
                g_docs.append(_make_document(
                    f"G-{len(g_docs) + 1:03d}", f"G-{len(g_docs) + 1:03d}_Capraz_Kontrol_{period_id}.pdf",
                    "Analitik İnceleme", "verified", 8192, "Sistem"
                ))

            # ------------------------------------------------------------------
            # H - Sonuç ve Görüş (auto — based on other sections)
            # ------------------------------------------------------------------
            h_docs = []
            total_docs = len(a_docs) + len(b_docs) + len(c_docs) + len(d_docs) + len(e_docs) + len(f_docs) + len(g_docs)
            if total_docs > 0:
                h_docs.append(_make_document(
                    "H-001", f"H-001_Denetim_Gorusu_{period_id}.pdf",
                    "Sonuç ve Görüş", "pending", 0, "Sistem"
                ))
                h_docs.append(_make_document(
                    "H-002", f"H-002_Duzeltme_Onerileri_{period_id}.pdf",
                    "Sonuç ve Görüş", "pending", 0, "Sistem"
                ))

            # ------------------------------------------------------------------
            # Build sections
            # ------------------------------------------------------------------
            sections = [
                {
                    "id": "A-general",
                    "title": "A - Genel Bilgiler",
                    "description": "Şirket bilgileri, sözleşmeler, yetki belgeleri",
                    "status": _section_status(a_docs),
                    "files": len(a_docs),
                    "documents": a_docs,
                    "workpaperPrefix": "A",
                    "legalBasis": "TTK Md. 64-88",
                },
                {
                    "id": "B-mizan",
                    "title": "B - Mizan ve Defterler",
                    "description": "Dönem sonu mizan, yevmiye, kebir defterleri",
                    "status": _section_status(b_docs),
                    "files": len(b_docs),
                    "documents": b_docs,
                    "workpaperPrefix": "B",
                    "legalBasis": "VUK Md. 171-182",
                },
                {
                    "id": "C-beyan",
                    "title": "C - Vergi Beyannameleri",
                    "description": "KV, KDV, Muhtasar, Geçici vergi beyannameleri",
                    "status": _section_status(c_docs),
                    "files": len(c_docs),
                    "documents": c_docs,
                    "workpaperPrefix": "C",
                    "legalBasis": "VUK Md. 25-30",
                },
                {
                    "id": "D-fatura",
                    "title": "D - E-Fatura / E-Arşiv",
                    "description": "Elektronik fatura ve arşiv belgeleri",
                    "status": _section_status(d_docs),
                    "files": len(d_docs),
                    "documents": d_docs,
                    "workpaperPrefix": "D",
                    "legalBasis": "VUK Md. 232, 242",
                },
                {
                    "id": "E-banka",
                    "title": "E - Banka ve Finansal",
                    "description": "Banka ekstreleri, mutabakat mektupları",
                    "status": _section_status(e_docs),
                    "files": len(e_docs),
                    "documents": e_docs,
                    "workpaperPrefix": "E",
                    "legalBasis": "VUK Md. 256",
                },
                {
                    "id": "F-sgk",
                    "title": "F - SGK ve Bordro",
                    "description": "APHB, bordro dökümleri, SGK bildirgeleri",
                    "status": _section_status(f_docs),
                    "files": len(f_docs),
                    "documents": f_docs,
                    "workpaperPrefix": "F",
                    "legalBasis": "5510 SK Md. 86",
                },
                {
                    "id": "G-analiz",
                    "title": "G - Analitik İnceleme",
                    "description": "Risk analizi, KURGAN raporu, VDK kontrolleri",
                    "status": _section_status(g_docs),
                    "files": len(g_docs),
                    "documents": g_docs,
                    "workpaperPrefix": "G",
                    "legalBasis": "VUK Md. 134-141",
                },
                {
                    "id": "H-sonuc",
                    "title": "H - Sonuç ve Görüş",
                    "description": "Denetim görüşü, düzeltme önerileri",
                    "status": _section_status(h_docs),
                    "files": len(h_docs),
                    "documents": h_docs,
                    "workpaperPrefix": "H",
                    "legalBasis": "SPK Denetim Standartları",
                },
            ]

            all_docs = a_docs + b_docs + c_docs + d_docs + e_docs + f_docs + g_docs + h_docs
            completed_files = len([d for d in all_docs if d["status"] == "verified"])
            total_files = len(all_docs)

            # Bundle hash
            hash_input = f"{client_id}_{period_id}_{total_files}_{datetime.now().isoformat()}"
            bundle_hash = hashlib.sha256(hash_input.encode()).hexdigest()[:16]

            result = {
                "sections": sections,
                "totalFiles": total_files,
                "completedFiles": completed_files,
                "lastUpdated": datetime.now().isoformat(),
                "preparedBy": "LYNTOS Sistem",
                "bundleHash": bundle_hash,
            }

            # P-10: Cache result (4 saat TTL)
            response_cache.set(cache_key, result, ttl=14400)
            return result

    except Exception as e:
        logger.error(f"Evidence summary error: {e}")
        # Fallback — return empty sections
        return {
            "sections": [],
            "totalFiles": 0,
            "completedFiles": 0,
            "lastUpdated": datetime.now().isoformat(),
            "preparedBy": "LYNTOS Sistem",
            "bundleHash": "",
        }


@router.post("/generate")
async def generate_evidence_bundle(request: GenerateBundleRequest, user: dict = Depends(verify_token)):
    """
    Generate Evidence Bundle from feed items

    1. Collects CRITICAL/HIGH feed items
    2. Extracts all evidence_refs and actions
    3. Generates PDF report
    4. Creates ZIP bundle

    Returns ResponseEnvelope with bundle info
    """
    await check_client_access(user, request.client_id)
    smmm_id = user["id"]
    feed_service = get_feed_service()
    bundle_service = get_evidence_bundle_service()

    # Get feed items (filter by severity)
    severity_filter = [FeedSeverity(s) for s in request.severity_filter if s in FeedSeverity.__members__]

    feed_items = feed_service.get_feed_items(
        smmm_id=smmm_id,
        client_id=request.client_id,
        period=request.period,
        severity_filter=severity_filter if severity_filter else [FeedSeverity.CRITICAL, FeedSeverity.HIGH]
    )

    # If no items, return fail-soft response - NO DEMO DATA
    if not feed_items:
        return {
            "schema": {
                "name": "EvidenceBundleResponse",
                "version": "2.0.0",
                "generated_at": datetime.now().isoformat()
            },
            "meta": {
                "smmm_id": smmm_id,
                "client_id": request.client_id,
                "period": request.period
            },
            "data": None,
            "errors": [],
            "warnings": [{
                "type": "no_feed_data",
                "message": "Bu donem icin feed verisi bulunamadi. Once veri yukleyin.",
                "actions": ["Mizan yukleyin", "E-defter yukleyin", "Beyanname yukleyin"]
            }]
        }

    # Generate bundle
    result = bundle_service.generate_bundle(
        smmm_id=smmm_id,
        client_id=request.client_id,
        period=request.period,
        feed_items=feed_items,
        evidence_files_dir=request.evidence_files_dir
    )

    return result


@router.get("/download/{bundle_id}")
async def download_bundle(bundle_id: str, user: dict = Depends(verify_token)):
    """Download the ZIP bundle"""
    bundle_service = get_evidence_bundle_service()
    zip_path = bundle_service.output_dir / f"{bundle_id}.zip"

    if not zip_path.exists():
        raise HTTPException(status_code=404, detail=f"Bundle {bundle_id} not found")

    return FileResponse(
        path=str(zip_path),
        filename=f"{bundle_id}.zip",
        media_type="application/zip"
    )


@router.get("/download/{bundle_id}/pdf")
async def download_pdf(bundle_id: str, user: dict = Depends(verify_token)):
    """Download only the PDF report"""
    bundle_service = get_evidence_bundle_service()
    pdf_path = bundle_service.output_dir / f"{bundle_id}.pdf"

    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail=f"PDF for bundle {bundle_id} not found")

    return FileResponse(
        path=str(pdf_path),
        filename=f"{bundle_id}.pdf",
        media_type="application/pdf"
    )


@router.get("/health")
async def health():
    """Health check"""
    return {"status": "ok", "service": "evidence-bundle", "timestamp": datetime.now().isoformat()}
