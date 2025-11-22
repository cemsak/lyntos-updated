from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
import os, json, csv
import jwt
import re
from typing import Optional, Dict, Any, List
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from pathlib import Path
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
)

def extract_numeric_score(ai_text):
    matches = re.findall(r'\b(\d{1,3})\b', str(ai_text))
    return int(matches[0]) if matches else 0

# ---- ENV & CONFIG ----
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")
API_VERSION = "1.0"
SCHEMA_VERSION = "2025-11-02"
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "lyntos_secret_key_2025")
ALGORITHM = "HS256"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL_DEFAULT = os.getenv("OPENAI_MODEL_DEFAULT", "gpt-4.1-mini")

# ---- FastAPI APP ----
app = FastAPI(title="LYNTOS SMMM Backend Full AI Gerçek Veri")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- AUTH ----
class LoginRequest(BaseModel):
    username: str
    password: str

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/auth/token")

@app.post("/v1/auth/token")
def login_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = os.getenv("ADMIN_USER", "admin")
    pw = os.getenv("ADMIN_PASS", "12345")
    if form_data.username == user and form_data.password == pw:
        expire = datetime.utcnow() + timedelta(hours=4)
        to_encode = {"sub": form_data.username, "exp": expire}
        token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return {"access_token": token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Kullanıcı adı veya şifre hatalı")

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
    USERS_DB = "users.json"
    if not os.path.exists(USERS_DB):
        with open(USERS_DB, "w") as f:
            json.dump([], f)
    with open(USERS_DB, "r") as f:
        users = json.load(f)
    for u in users:
        if u["username"] == user.username:
            raise HTTPException(status_code=400, detail="Kullanıcı zaten var.")
    users.append({"username": user.username, "password": user.password})
    with open(USERS_DB, "w") as f:
        json.dump(users, f)
    return {"message": f"Kullanıcı oluşturuldu: {user.username}"}

# -------------- BURADA YENİ SATIRA HİÇ BOŞLUK OLMADAN EKLE --------------
@app.get("/api/lyntos_dashboard")
def api_lyntos_dashboard(
    firma: str = Query(..., description="Firma adı veya kodu"),
    donem: str = Query(..., description="Dönem (örn: 2025Q4)")
):
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
        "vdk_panel": vdk_panel_data(firma, donem)
    }

# ---- OpenAI Client ----
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# ---- DATA HELPERS ----
def read_csv_as_dict(file_path: str) -> List[Dict[str, Any]]:
    data = []
    if not os.path.exists(file_path): return []
    try:
        with open(file_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader: data.append(row)
    except Exception:
        try:
            with open(file_path, newline='', encoding='latin1') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader: data.append(row)
        except Exception as e2:
            print(f"[FAIL] CSV okunamadı: {file_path} // {e2}")
    return data

def multi_folder_reader(parent_dir, firma, donem):
    out = []
    if not os.path.exists(parent_dir): return []
    for root, dirs, files in os.walk(parent_dir):
        for fname in files:
            if not fname.endswith(".csv"): continue
            fpath = os.path.join(root, fname)
            rows = read_csv_as_dict(fpath)
            for r in rows:
                if str(r.get("firma","")) == str(firma) and str(r.get("period","")) == str(donem):
                    out.append(r)
    return out

def get_mizan(firma, donem):
    paths = ["data/luca/mizan.csv", f"data/luca/mizan_{donem}.csv"]
    rows = []
    for path in paths: rows += read_csv_as_dict(path)
    borc = 0.0; alacak = 0.0
    for r in rows:
        if r.get("firma") == firma and r.get("period") == donem:
            borc += float(r.get("borc_toplam", "0") or 0)
            alacak += float(r.get("alacak_toplam", "0") or 0)
    return {"borc_toplam": round(borc,2), "alacak_toplam": round(alacak,2), "dengeli": abs(borc-alacak)<0.01, "satir_sayisi": len(rows)}

def get_beyanname_ozeti(firma, donem):
    paths = ["data/luca/beyan.csv", f"data/luca/beyan_{donem}.csv"]
    rows = []
    for path in paths: rows += read_csv_as_dict(path)
    out = []
    for r in rows:
        if r.get("firma") == firma and r.get("period") == donem:
            out.append({"ad": r.get("ad", ""), "durum": r.get("durum", ""), "risk": r.get("risk", "")})
    return out

def get_beyannameler(firma, donem): return multi_folder_reader("data/luca/beyanname/beyannameler/", firma, donem)
def get_tahakkuklar(firma, donem): return multi_folder_reader("data/luca/beyanname/tahakkuklar/", firma, donem)
def get_tahsilatlar(firma, donem): return multi_folder_reader("data/luca/beyanname/tahsilatlar/", firma, donem)
def get_banka_data(firma, donem):
    paths = ["data/banka/banka_hareket.csv"]
    if os.path.exists("data/banka/converted/"):
        paths += [os.path.join("data/banka/converted/", f) for f in os.listdir("data/banka/converted/") if f.endswith(".csv")]
    rows = []
    for path in paths: rows += read_csv_as_dict(path)
    toplam_bakiye = 0.0; detaylar = []
    for r in rows:
        if r.get("firma") == firma and r.get("period") == donem:
            try: bakiye = float(r.get("bakiye", "0") or 0)
            except: bakiye = 0.0
            toplam_bakiye += bakiye
            detaylar.append({"banka": r.get("banka", ""), "bakiye": bakiye})
    return {"toplam_bakiye": round(toplam_bakiye,2), "hesap_sayisi": len(detaylar), "detaylar": detaylar, "satir_sayisi": len(rows)}

def get_musteri_data(firma, donem): return multi_folder_reader("data/musteri/", firma, donem)
def get_edefter_data(firma, donem): return multi_folder_reader("data/edefter/", firma, donem)

def get_panel_summary(mizan, banka, beyannameler, tahakkuklar, tahsilatlar):
    try:
        return {
            "beyan_sayisi": len(beyannameler),
            "tahakkuk_sayisi": len(tahakkuklar),
            "tahsilat_sayisi": len(tahsilatlar),
            "bakiye": banka.get("toplam_bakiye", 0),
            "mizan_dengeli": mizan.get("dengeli", False),
            "hesap_sayisi": mizan.get("satir_sayisi", 0),
        }
    except Exception as e:
        return {"error": str(e)}

# ---- MODÜL VE AI FONKSİYONLARI ----
def ai_module_prompt(data, module_name, extra_info=""):
    if not client: return "(AI anahtarı yok)"
    prompt = f"""
[Referans: risk-analizi.tsx, kurgan_sistemi.ts, pasted.txt]
Modül: {module_name}
Firma: {data.get('summary','')}
Banka: {data.get('banka',{})}
Mizan: {data.get('mizan',{})}
Beyanname: {data.get('beyanname_ozeti',[])}
Müşteri: {data.get('musteri',[])}
Edefter: {data.get('edefter',[])}
Tahakkuk/Tahsilat: {data.get('tahakkuklar',[])} / {data.get('tahsilatlar',[])}
Ek Bilgi: {extra_info}
Sen bir SMMM paneli AI asistanısın. Bu modül için risk, aksiyon, bulgu, skor, uyarı üret.
"""
    response = client.chat.completions.create(
        model=OPENAI_MODEL_DEFAULT,
        messages=[
            {"role":"system","content":f"Sen bir SMMM paneli AI asistanısın. {module_name} için risk, bulgu, skor, aksiyon, uyarı, kısa özet ve öneri üret."},
            {"role":"user","content":prompt}
        ],
        temperature=0.4,
        max_tokens=600
    )
    return response.choices[0].message.content.strip()

def get_5why(data): return ai_module_prompt(data, "5 Why Analizi", "Kök neden-aksiyon zinciri, hata/hile durumları.")
def get_fishbone(data): return ai_module_prompt(data, "Balık Kılçığı Analizi", "Sebep-sonuç, kök neden ve önlem.")
def get_capa_8d(data): return ai_module_prompt(data, "CAPA/8D İzleme Paneli", "Düzeltici/önleyici aksiyonlar, süreç kontrol.")
def get_fmea(data): return ai_module_prompt(data, "FMEA Risk Analizi", "Olasılık, etki, tespit skorları, kritik riskler.")
def get_fraud_network(data): return ai_module_prompt(data, "Ağ/Fraud Analizi", "Karşı taraf ağı, zincir risk, kümeler.")
def get_cosobowtie(data): return ai_module_prompt(data, "COSO/BowTie Kontrol Tasarımı", "Kontrol noktaları, uyarı, barajlar.")
def get_benford_outlier(data): return ai_module_prompt(data, "Benford & Outlier Analizi", "Sayısal örüntü, outlier, split, tekrar.")
def get_anomaly(data): return ai_module_prompt(data, "Anomali Analizi", "AI ile anomali ve tutarsızlık tespiti.")
def get_smiyb(data): return ai_module_prompt(data, "SMİYB Analiz", "Sahte belge, tedarikçi zinciri, risk skoru.")
def get_counterparty(data): return ai_module_prompt(data, "Karşı Firma Riskleri", "Karşı taraf listesi, kara/beyaz liste, risk.")
def get_bank_reconciliation(data): return ai_module_prompt(data, "Banka Mutabakatı", "Dekont, fiş, valör, çakışan hareketler.")
def get_matrix13(data): return ai_module_prompt(data, "Matrix 13", "13 kritik risk bileşeni, skor, bulgu, öneri.")
def get_tax_compliance(data): return ai_module_prompt(data, "Vergi Uyum Paneli", "Beyan-defter uyumu, risk, öneri, puan.")
def get_mizan_panel(data): return ai_module_prompt(data, "Mizan Panel", "Hesap hareketleri, drill-down, fark, öneri.")
def get_edefter_panel(data): return ai_module_prompt(data, "E-defter Paneli", "Yevmiye, defter-i kebir, kapanış, açılış kontrolleri.")

# ---- ANALYZE ENDPOINT ----
from threading import Thread

@app.get("/api/analyze")
def api_analyze(
    request: Request,
    firma: str = Query(..., description="Firma adı/ID"),
    donem: str = Query(..., description="Dönem (örn: 2025-Q4)")
):
    mizan = get_mizan(firma, donem)
    beyanname_ozeti = get_beyanname_ozeti(firma, donem)
    beyannameler = get_beyannameler(firma, donem)
    tahakkuklar = get_tahakkuklar(firma, donem)
    tahsilatlar = get_tahsilatlar(firma, donem)
    banka = get_banka_data(firma, donem)
    musteri = get_musteri_data(firma, donem)
    edefter = get_edefter_data(firma, donem)
    summary = get_panel_summary(mizan, banka, beyannameler, tahakkuklar, tahsilatlar)

    data = {
        "summary": f"{firma} | Dönem: {donem}",
        "panel_summary": summary,
        "mizan": mizan,
        "beyanname_ozeti": beyanname_ozeti,
        "beyannameler": beyannameler,
        "tahakkuklar": tahakkuklar,
        "tahsilatlar": tahsilatlar,
        "banka": banka,
        "musteri": musteri,
        "edefter": edefter,
    }

    # --- AI modüllerini paralel çalıştır ---
    def ai_worker(fn, key, result):
        try:
            result[key] = fn(data)
        except Exception as e:
            result[key] = f"[ERROR] {str(e)}"

    ai_mods = [
        (get_5why, "modul_5why"),
        (get_fishbone, "modul_fishbone"),
        (get_capa_8d, "modul_capa_8d"),
        (get_fmea, "modul_fmea"),
        (get_fraud_network, "modul_fraud_network"),
        (get_cosobowtie, "modul_cosobowtie"),
        (get_benford_outlier, "modul_benford_outlier"),
        (get_anomaly, "modul_anomaly"),
        (get_smiyb, "modul_smiyb"),
        (get_counterparty, "modul_counterparty"),
        (get_bank_reconciliation, "modul_bank_reconciliation"),
        (get_matrix13, "modul_matrix13"),
        (get_tax_compliance, "modul_tax_compliance"),
        (get_mizan_panel, "modul_mizan_panel"),
        (get_edefter_panel, "modul_edefter_panel"),
    ]

    ai_results = {}
    threads = []
    # Her fonksiyonu thread'e ver
    for fn, key in ai_mods:
        t = Thread(target=ai_worker, args=(fn, key, ai_results))
        t.start()
        threads.append(t)
    # Tümünü bitirene kadar bekle
    for t in threads:
        t.join()
    data.update(ai_results)

    data["parts"] = {
        "kurgan": extract_numeric_score(data["modul_fraud_network"]),
        "smiyb": extract_numeric_score(data["modul_smiyb"]),
        "radar": extract_numeric_score(data["modul_matrix13"]),
        "beyan": extract_numeric_score(data["modul_tax_compliance"]),
    }
    return JSONResponse(content=data)

@app.get("/health")
def health():
    return {"status": "ok", "message": "LYNTOS Backend (Full Gerçek + AI + Modül) aktif"}

@app.get("/v1/meta/options")
def meta_options():
    return {
        "entities": [
            {"id": "HKOZKAN", "unvan": "Hakkı Özkan SMMM"},
            {"id": "OZKANLAR", "unvan": "Özkanlar İnşaat AŞ"},
            {"id": "DEMO", "unvan": "Demo Mükellef"},
        ],
        "periods": ["2025-Q4", "2025-Q3", "2025-10", "2025"],
    }