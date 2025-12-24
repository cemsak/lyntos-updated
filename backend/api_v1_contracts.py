from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
import json
import glob
import os
import subprocess
import sys
import time
import re

router = APIRouter(prefix="/api/v1", tags=["v1"])

BASE = Path(__file__).resolve().parent
CONTRACTS_DIR = BASE / "docs" / "contracts"
OUT_DIR = BASE / "out"

PERIOD_RE = re.compile(r"^\d{4}-Q[1-4]$")

def _read_json(p: Path):
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"Not found: {p.name}")
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"JSON read error: {p.name}: {e}")

@router.get("/health")
def health():
    return {"ok": True, "service": "lyntos-backend", "api": "v1"}

@router.get("/contracts/portfolio")
def contracts_portfolio():
    return JSONResponse(_read_json(CONTRACTS_DIR / "portfolio_customer_summary.json"))

@router.get("/contracts/mbr")
def contracts_mbr():
    return JSONResponse(_read_json(CONTRACTS_DIR / "mbr_view.json"))

@router.get("/contracts/risks/{code}")
def contracts_risk(code: str):
    p = CONTRACTS_DIR / f"risk_detail_{code}.json"
    return JSONResponse(_read_json(p))


@router.post("/refresh")
def refresh(
    smmm: str = Query(...),
    client: str = Query(...),
    period: str = Query(..., description="örn: 2025-Q2"),
):
    """
    Tek çağrıda:
    - risk json üret
    - contracts export
    - dossier pdf/zip üret

    Güvenlik: sadece LYNTOS_REFRESH_ENABLED=1 iken çalışır (dev/local).
    """
    if os.getenv("LYNTOS_REFRESH_ENABLED", "0") != "1":
        raise HTTPException(status_code=403, detail="refresh_disabled")

    if not PERIOD_RE.match(period):
        raise HTTPException(status_code=400, detail=f"bad_period_format: {period}")

    cmd = [
        sys.executable,
        str(BASE / "scripts" / "refresh_contracts.py"),
        "--smmm", smmm,
        "--client", client,
        "--period", period,
        "--contracts_dir", str(CONTRACTS_DIR),
    ]
    t0 = time.time()
    p = subprocess.run(cmd, cwd=str(BASE), capture_output=True, text=True)
    if p.returncode != 0:
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "error": "refresh_failed",
                "stdout": p.stdout[-4000:],
                "stderr": p.stderr[-4000:],
            },
        )

    # Sonuç dosyalarını deterministik isimlerden döndürüyoruz
    pdf_name = f"LYNTOS_DOSSIER_{client}_{period}.pdf"
    zip_name = f"LYNTOS_DOSSIER_{client}_{period}_BUNDLE.zip"

    return {
        "ok": True,
        "elapsed_sec": round(time.time() - t0, 3),
        "artifacts": {
            "contracts_dir": str(CONTRACTS_DIR),
            "pdf": str(OUT_DIR / pdf_name),
            "bundle": str(OUT_DIR / zip_name),
        },
        "downloads": {
            "pdf": f"/api/v1/dossier/pdf?client={client}&period={period}",
            "bundle": f"/api/v1/dossier/bundle?client={client}&period={period}",
        },
        "log_tail": p.stdout[-2000:],
    }

@router.get("/dossier/bundle")
def dossier_bundle_latest(client: str | None = None, period: str | None = None):
    # En yeni *_BUNDLE.zip dosyasını indir
    pattern = str(OUT_DIR / "LYNTOS_DOSSIER_*_BUNDLE.zip")
    if client and period:
        wanted = OUT_DIR / f"LYNTOS_DOSSIER_{client}_{period}_BUNDLE.zip"
        if wanted.exists():
            return FileResponse(path=str(wanted), media_type="application/zip", filename=wanted.name)
        # fallback: latest

    matches = glob.glob(pattern)
    if not matches:
        raise HTTPException(status_code=404, detail="No bundle zip found in out/")
    matches.sort(key=lambda x: Path(x).stat().st_mtime, reverse=True)
    latest = Path(matches[0])
    return FileResponse(
        path=str(latest),
        media_type="application/zip",
        filename=latest.name,
    )


@router.get("/dossier/pdf")
def dossier_pdf_latest(client: str | None = None, period: str | None = None):
    pattern = str(OUT_DIR / "LYNTOS_DOSSIER_*.pdf")
    if client and period:
        wanted = OUT_DIR / f"LYNTOS_DOSSIER_{client}_{period}.pdf"
        if wanted.exists():
            return FileResponse(path=str(wanted), media_type="application/pdf", filename=wanted.name)

    matches = glob.glob(pattern)
    if not matches:
        raise HTTPException(status_code=404, detail="No dossier pdf found in out/")
    matches.sort(key=lambda x: Path(x).stat().st_mtime, reverse=True)
    latest = Path(matches[0])
    return FileResponse(path=str(latest), media_type="application/pdf", filename=latest.name)


@router.head("/dossier/bundle")
def dossier_bundle_head(client: str | None = None, period: str | None = None):
    # GET ile aynı seçimi yapıp sadece header döndürür
    resp = dossier_bundle_latest(client=client, period=period)
    return resp

@router.head("/dossier/pdf")
def dossier_pdf_head(client: str | None = None, period: str | None = None):
    resp = dossier_pdf_latest(client=client, period=period)
    return resp
