# KRİTİK: .env dosyası TÜM importlardan ÖNCE yüklenmeli!
# AI provider'lar import sırasında initialize ediliyor ve API key'lere ihtiyaç duyuyor.
from pathlib import Path
from dotenv import load_dotenv
_BASE_DIR = Path(__file__).resolve().parent
load_dotenv(_BASE_DIR / ".env", override=True)

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from api.v1.contracts import router as v1_router
from api.v1.evidence import router as evidence_router
from api.v1.regwatch import router as regwatch_router
from api.v1.audit import router as audit_router
from api.v1.documents import router as documents_router
from api.v1.tenants import router as tenants_router
from api.v1.tax_certificate import router as tax_certificate_router
from api.v1.vdk_simulator import router as vdk_simulator_router
from api.v1.vdk_inspector import router as vdk_inspector_router
from api.v1.inspector_prep import router as inspector_prep_router
from api.v1.document_upload import router as document_upload_router
from api.v1.tax_strategist import router as tax_strategist_router
from api.v1.corporate import router as corporate_router
from api.v1.registry import router as registry_router
from api.v1.ai import router as ai_router
from api.v1.notifications import router as notifications_router
from api.v1.chat import router as chat_router
from api.v1.user import router as user_router
from api.v1.defterler import router as defterler_router
from api.v1.beyannameler import router as beyannameler_router
from api.v2.validate_vdk import router as vdk_validate_router
from api.v2.donem_sync import router as donem_sync_router
from api.v2.mizan_sync import router as mizan_sync_router
from api.v2.cross_check import router as cross_check_router
from api.v2.feed import router as feed_router
from api.v2.evidence_bundle import router as evidence_bundle_router
from api.v2.brief import router as brief_router
from api.v2.dossier import router as dossier_router
from api.v2.periods import router as periods_router
from api.v2.bulk_upload import router as bulk_upload_router
from api.v2.mizan_data import router as mizan_data_router
from api.v2.donem_complete import router as donem_complete_router
from api.v2.upload import router as upload_router
from api.v2.period_summary import router as period_summary_router
from api.v2.yevmiye import router as yevmiye_v2_router
from api.v2.kebir import router as kebir_v2_router
from api.v2.banka import router as banka_v2_router
from api.v2.banka_mutabakat import router as banka_mutabakat_v2_router
from api.v2.beyanname_kdv import router as beyanname_kdv_v2_router
from api.v2.beyanname_muhtasar import router as beyanname_muhtasar_v2_router
from api.v2.beyanname_tahakkuk import router as beyanname_tahakkuk_v2_router
from api.v2.yevmiye_kebir import router as yevmiye_kebir_v2_router
from api.v2.ingest import router as ingest_router  # YENİ DEDUPE SİSTEMİ
from api.v2.defter_kontrol import router as defter_kontrol_router  # TAVSİYE MEKTUBU 2
from api.v2.opening_balance import router as opening_balance_router  # AÇILIŞ BAKİYESİ - TD-002
from api.v2.edefter_rapor import router as edefter_rapor_router  # E-DEFTER RAPOR - TD-003
from api.v2.gib_public import router as gib_public_router  # GİB PUBLIC DATA - KURGAN REAL DATA
from api.v2.agents import router as agents_router  # AI AGENTS - MASTERCHEF + ALT AJANLAR
from api.v2.rules import router as rules_router  # KURAL KÜTÜPHANESİ - PENCERE 4
from api.auth.routes import router as auth_router  # AUTH - LOGIN/REGISTER/ME
from api.v2.mevzuat_search import router as mevzuat_search_router  # MEVZUAT ARAMA - PENCERE 5
from api.v2.yeniden_degerleme import router as yeniden_degerleme_router  # YENİDEN DEĞERLEME - VUK Mük. 298/Ç
from api.v2.donem_sonu_islem import router as donem_sonu_islem_router  # DÖNEM SONU İŞLEMLERİ - IS-3
from api.v2.cari_mutabakat import router as cari_mutabakat_router  # CARİ MUTABAKAT - IS-5
from api.v2.mizan_analiz import router as mizan_analiz_router  # MİZAN ANALİZ - IS-7 (Hesap Kartı, Yatay/Dikey Analiz)
from api.v2.tax_parameters import router as tax_parameters_router  # PRATİK BİLGİLER - VERGİ PARAMETRELERİ
from api.v2.checklists import router as checklists_router  # PRATİK BİLGİLER - KONTROL LİSTESİ KAYIT
from api.v2.reports import router as reports_router  # RAPORLAR - BIG4+ PDF EXPORT
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from services.regwatch_scheduler import start_scheduler, stop_scheduler, get_scheduler_status

from typing import Optional
# Path ve load_dotenv dosya başında import edildi
import os
import jwt

from kpi_service import (
    kurgan_risk_score,
    radar_risk_score,
    smiyb_risk_status,
    tax_compliance_score,
    uyum_panel_data,
    mizan_panel_data,
    banka_mutabakat_panel_data,
    karsifirma_panel_data,
    matrix13_panel_data,
    fmea_panel_data,
    anomaly_panel_data,
    ag_panel_data,
    bowtie_panel_data,
    capa_panel_data,
    why5_panel_data,
    ishikawa_panel_data,
    ai_panel_data,
    vdk_panel_data,
    edefter_panel_data,
    musteri_panel_data,
    risk_model_v1_scores,
)

# ---------------------------------------------------------------------------
#  ENV & APP CONFIG
# ---------------------------------------------------------------------------

BASE_DIR = _BASE_DIR  # Dosya başında tanımlandı (load_dotenv için)
# NOT: load_dotenv() dosya başında çağrıldı (AI provider'lar için gerekli)

API_VERSION = "1.0"
SCHEMA_VERSION = "2025-11-02"
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "lyntos_secret_key_2025")
ALGORITHM = "HS256"

# Enable/disable scheduler via env
ENABLE_SCHEDULER = os.getenv("ENABLE_REGWATCH_SCHEDULER", "false").lower() == "true"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan handler for startup/shutdown events"""
    # Startup
    if ENABLE_SCHEDULER:
        start_scheduler()
    yield
    # Shutdown
    if ENABLE_SCHEDULER:
        stop_scheduler()


app = FastAPI(
    title="LYNTOS SMMM Backend – Risk Motoru v1",
    lifespan=lifespan
)


# --- LYNTOS v1 API ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.1.102:3000",
        "http://192.168.1.172:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(v1_router, prefix="/api/v1")
app.include_router(evidence_router, prefix="/api/v1", tags=["Evidence"])
app.include_router(regwatch_router, prefix="/api/v1", tags=["RegWatch"])
app.include_router(audit_router, prefix="/api/v1", tags=["Audit"])
app.include_router(documents_router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(tenants_router, prefix="/api/v1", tags=["Tenants"])
app.include_router(tax_certificate_router, prefix="/api/v1", tags=["TaxCertificate"])
app.include_router(vdk_simulator_router, prefix="/api/v1", tags=["VDKSimulator"])
app.include_router(vdk_inspector_router, prefix="/api/v1", tags=["VDKInspector"])
app.include_router(inspector_prep_router, tags=["InspectorPrep"])
app.include_router(document_upload_router, tags=["DocumentUpload"])
app.include_router(tax_strategist_router, prefix="/api/v1", tags=["VERGUS"])
app.include_router(corporate_router, prefix="/api/v1", tags=["Corporate"])
app.include_router(registry_router, prefix="/api/v1", tags=["Registry"])
app.include_router(ai_router, prefix="/api/v1", tags=["AI"])
app.include_router(notifications_router, prefix="/api/v1", tags=["Notifications"])
app.include_router(chat_router, prefix="/api/v1", tags=["Chat"])
app.include_router(user_router, prefix="/api/v1", tags=["User"])
app.include_router(defterler_router, prefix="/api/v1", tags=["Defterler"])
app.include_router(beyannameler_router, prefix="/api/v1", tags=["Beyannameler"])
# --- /LYNTOS v1 API ---

# --- AUTH ---
app.include_router(auth_router, prefix="/api", tags=["Auth"])
# --- /AUTH ---

# --- LYNTOS v2 API ---
app.include_router(vdk_validate_router)
app.include_router(donem_sync_router)
app.include_router(mizan_sync_router)
app.include_router(cross_check_router)
app.include_router(feed_router, prefix="/api/v2")
app.include_router(evidence_bundle_router, prefix="/api/v2")
app.include_router(brief_router, prefix="/api/v2")
app.include_router(dossier_router, prefix="/api/v2")
app.include_router(periods_router, prefix="/api/v2")
app.include_router(bulk_upload_router, prefix="/api/v2")
app.include_router(mizan_data_router)  # Prefix already in router
app.include_router(donem_complete_router)  # TEK ENDPOINT - TÜM VERİ
app.include_router(upload_router)  # ZIP UPLOAD - FAZ 1
app.include_router(period_summary_router)  # Q1 ÖZET - NO AUTH
app.include_router(yevmiye_v2_router)  # YEVMİYE V2 - NO AUTH
app.include_router(kebir_v2_router)  # KEBİR V2 - NO AUTH
app.include_router(banka_v2_router)  # BANKA V2 - NO AUTH
app.include_router(banka_mutabakat_v2_router)  # BANKA MUTABAKAT V2 - NO AUTH
app.include_router(beyanname_kdv_v2_router)  # KDV BEYANNAME V2 - NO AUTH
app.include_router(beyanname_muhtasar_v2_router)  # MUHTASAR BEYANNAME V2 - NO AUTH
app.include_router(beyanname_tahakkuk_v2_router)  # TAHAKKUK V2 - NO AUTH
app.include_router(yevmiye_kebir_v2_router)  # YEVMİYE-KEBİR CROSS-CHECK V2 - NO AUTH
app.include_router(ingest_router)  # YENİ DEDUPE SİSTEMİ - Tavsiye Mektubu 3
app.include_router(defter_kontrol_router)  # TAVSİYE MEKTUBU 2 - DEFTER KONTROL - NO AUTH
app.include_router(opening_balance_router, prefix="/api/v2")  # AÇILIŞ BAKİYESİ - TD-002
app.include_router(edefter_rapor_router)  # E-DEFTER RAPOR - TD-003 - NO AUTH
app.include_router(gib_public_router, prefix="/api/v2")  # GİB PUBLIC DATA - KURGAN REAL DATA
app.include_router(agents_router, prefix="/api/v2")  # AI AGENTS - MASTERCHEF + ALT AJANLAR
app.include_router(rules_router, prefix="/api/v2")  # KURAL KÜTÜPHANESİ - PENCERE 4
app.include_router(mevzuat_search_router)  # MEVZUAT ARAMA - PENCERE 5
app.include_router(yeniden_degerleme_router)  # YENİDEN DEĞERLEME - VUK Mük. 298/Ç
app.include_router(donem_sonu_islem_router)  # DÖNEM SONU İŞLEMLERİ - AMORTİSMAN/REESKONT/KARŞILIK
app.include_router(cari_mutabakat_router)  # CARİ MUTABAKAT - IS-5 (VUK 177, TTK 64, VUK 323)
app.include_router(mizan_analiz_router)  # MİZAN ANALİZ - IS-7 (Hesap Kartı, Yatay/Dikey Analiz)
app.include_router(tax_parameters_router, prefix="/api/v2")  # PRATİK BİLGİLER - VERGİ PARAMETRELERİ
app.include_router(checklists_router, prefix="/api/v2")  # PRATİK BİLGİLER - KONTROL LİSTESİ KAYIT
app.include_router(reports_router, prefix="/api/v2")  # RAPORLAR - BIG4+ PDF EXPORT
# --- /LYNTOS v2 API ---


# ---------------------------------------------------------------------------
#  LEGACY V1 ENDPOINTS (Risk Model & Dashboard)
# ---------------------------------------------------------------------------

def _verify_bearer_token(authorization: Optional[str] = None) -> None:
    """Basit JWT doğrulama — legacy v1 endpointler için"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = authorization[7:] if authorization.startswith("Bearer ") else authorization
    try:
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")


@app.get("/v1/risk_model_v1")
def api_risk_model_v1(
    firma: str = Query(..., description="Firma adı veya kodu"),
    donem: str = Query(..., description="Dönem (örn: 2025Q4)"),
    authorization: Optional[str] = Depends(lambda authorization: authorization),
):
    """Risk motoru v1 — skorlar formüllere göre hesaplanır"""
    from fastapi import Header as _Header
    result = risk_model_v1_scores(firma, donem)
    return JSONResponse(content=result)

@app.get("/api/lyntos_dashboard")
def api_lyntos_dashboard(
    firma: str = Query(..., description="Firma adı veya kodu"),
    donem: str = Query(..., description="Dönem (örn: 2025Q4)"),
):
    """Eski dashboard endpoint'i — kpi_service üzerinden veri"""
    return {
        "kurgan_risk": kurgan_risk_score(firma, donem),
        "radar_risk": radar_risk_score(firma, donem),
        "smiyb_risk": smiyb_risk_status(firma, donem),
        "tax_compliance": tax_compliance_score(firma, donem),
        "uyum_panel": uyum_panel_data(firma, donem),
        "mizan_panel": mizan_panel_data(firma, donem),
        "banka_panel": banka_mutabakat_panel_data(firma, donem),
        "karsifirma_panel": karsifirma_panel_data(firma, donem),
        "matrix13_panel": matrix13_panel_data(firma, donem),
        "fmea_panel": fmea_panel_data(firma, donem),
        "anomaly_panel": anomaly_panel_data(firma, donem),
        "ag_panel": ag_panel_data(firma, donem),
        "bowtie_panel": bowtie_panel_data(firma, donem),
        "capa_panel": capa_panel_data(firma, donem),
        "why5_panel": why5_panel_data(firma, donem),
        "ishikawa_panel": ishikawa_panel_data(firma, donem),
        "ai_panel": ai_panel_data(firma, donem),
        "vdk_panel": vdk_panel_data(firma, donem),
        "edefter_panel": edefter_panel_data(firma, donem),
        "musteri_panel": musteri_panel_data(firma, donem),
    }

# ---------------------------------------------------------------------------
#  BASİT SAĞLIK VE META ENDPOINTLERİ
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "message": "LYNTOS Backend (Risk Motoru v1) aktif",
        "api_version": API_VERSION,
        "schema_version": SCHEMA_VERSION,
    }


# --- Dossier Bundle Download ---
@app.api_route("/v1/dossier/bundle", methods=["GET","HEAD"])
def get_latest_bundle(smmm: str, client: str, period: str):
    out_dir = Path(__file__).resolve().parent / "out"
    zip_name = f"LYNTOS_DOSSIER_{client}_{period}_BUNDLE.zip"
    zip_path = out_dir / zip_name
    if not zip_path.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"bundle_not_found: {zip_name}")
    return FileResponse(
        path=str(zip_path),
        media_type="application/zip",
        filename=zip_name
    )


# ---------------------------------------------------------------------------
#  REGWATCH SCHEDULER STATUS
# ---------------------------------------------------------------------------

@app.get("/v1/scheduler/status")
def scheduler_status():
    """Get RegWatch scheduler status"""
    return {
        "scheduler_enabled": ENABLE_SCHEDULER,
        "status": get_scheduler_status()
    }

