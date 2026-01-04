from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from api.v1.contracts import router as v1_router
from api.v1.evidence import router as evidence_router
from api.v1.regwatch import router as regwatch_router
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from pathlib import Path
import os
import json
import jwt

from dotenv import load_dotenv
from pydantic import BaseModel

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

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

API_VERSION = "1.0"
SCHEMA_VERSION = "2025-11-02"
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "lyntos_secret_key_2025")
ALGORITHM = "HS256"

app = FastAPI(title="LYNTOS SMMM Backend – Risk Motoru v1")


# --- LYNTOS v1 API ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
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
# --- /LYNTOS v1 API ---

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
#  AUTH
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/auth/token")


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=4))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Basit kullanıcı doğrulama.
    Öncelik .env içindeki ADMIN_USER / ADMIN_PASS değerlerindedir.
    Eğer users.json varsa, oradaki kayıtlar da kabul edilir.
    """
    env_user = os.getenv("ADMIN_USER", "admin")
    env_pass = os.getenv("ADMIN_PASS", "12345")
    if username == env_user and password == env_pass:
        return {"username": username, "source": "env"}

    users_db = BASE_DIR / "users.json"
    if users_db.exists():
        try:
            with users_db.open("r", encoding="utf-8") as f:
                users: List[Dict[str, Any]] = json.load(f)
            for u in users:
                if u.get("username") == username and u.get("password") == password:
                    return {"username": username, "source": "users.json"}
        except Exception:
            pass

    return None


@app.post("/v1/auth/token")
def login_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı adı veya şifre hatalı")
    access_token = create_access_token({"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/v1/auth/me")
def read_users_me(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"username": payload.get("sub")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi doldu")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")


@app.post("/v1/auth/register")
def register(user: LoginRequest):
    users_db = BASE_DIR / "users.json"
    if not users_db.exists():
        users: List[Dict[str, Any]] = []
    else:
        with users_db.open("r", encoding="utf-8") as f:
            users = json.load(f)

    for u in users:
        if u.get("username") == user.username:
            raise HTTPException(status_code=400, detail="Kullanıcı zaten var.")

    users.append({"username": user.username, "password": user.password})
    with users_db.open("w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

    return {"message": f"Kullanıcı oluşturuldu: {user.username}"}

# ---------------------------------------------------------------------------
#  RISK MODEL V1 – ANA ENDPOINT
# ---------------------------------------------------------------------------

@app.get("/v1/risk_model_v1")
def api_risk_model_v1(
    firma: str = Query(..., description="Firma adı veya kodu"),
    donem: str = Query(..., description="Dönem (örn: 2025Q4)"),
    token: str = Depends(oauth2_scheme),
):
    """
    Yeni risk motoru v1 için tek endpoint.

    - Hiçbir demo skor içermez.
    - Skorlar risk_model paketindeki formüllere göre hesaplanır.
    - Henüz formülü yazılmamış alanlar None olarak döner.
    """
    # Token doğrulama için sadece decode yeterli; detay /v1/auth/me'de.
    try:
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")

    result = risk_model_v1_scores(firma, donem)
    return JSONResponse(content=result)

# ---------------------------------------------------------------------------
#  DASHBOARD ENDPOINT – ESKİ /api/lyntos_dashboard UYUMLU
# ---------------------------------------------------------------------------

@app.get("/api/lyntos_dashboard")
def api_lyntos_dashboard(
    firma: str = Query(..., description="Firma adı veya kodu"),
    donem: str = Query(..., description="Dönem (örn: 2025Q4)"),
    token: str = Depends(oauth2_scheme),
):
    """
    Eski dashboard endpoint'i; artık tüm veriyi yeni kpi_service üzerinden alır.

    NOT:
    - kpi_service içindeki fonksiyonlar demo skor üretmez.
    - Hangi skorlar hazırsa onları döndürür; diğerleri None / not_implemented döner.
    """
    try:
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")

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


@app.get("/v1/meta/options")
def meta_options():
    """
    Frontend'te dropdown'lar için basit seçenek seti.
    Gerçek sistemde SMMM ofisinin mükellef listesi/dönem listesi buraya bağlanabilir.
    """
    return {
        "entities": [
            {"id": "HKOZKAN", "unvan": "Hakkı Özkan SMMM"},
            {"id": "OZKANLAR", "unvan": "Özkanlar İnşaat AŞ"},
            {"id": "DEMO", "unvan": "Demo Mükellef"},
        ],
        "periods": ["2025-Q4", "2025-Q3", "2025-10", "2025"],
    }


# --- Dossier Bundle Download (demo critical) ---
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

