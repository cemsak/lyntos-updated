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


# --- Sprint-4: Axis contracts (stub) ---
from fastapi import HTTPException, Query
from typing import Optional, List, Dict, Any





@router.get("/contracts/axis/{axis}")
def get_contract_axis(
    axis: str,
    smmm: str = Query(...),
    client: str = Query(...),
    period: str = Query(...),
):
    """
    Sprint-4.1: Axis-D — mizan satırlarından gerçek üretim + tutarlılık bayrakları.
    """
    ax = (axis or "").upper()
    if ax != "D":
        raise HTTPException(status_code=404, detail=f"Axis not found: {axis}")

    from data_engine.loader import load_all_for_client_period
    from risk_model.v1_engine import compute_mizan_metrics

    def _get_mizan_list(payload):
        if payload is None:
            return []
        if isinstance(payload, dict):
            for k in ("mizan_list", "mizan", "mizan_rows", "mizan_data"):
                v = payload.get(k)
                if isinstance(v, list):
                    return v
        if isinstance(payload, (list, tuple)):
            for v in payload:
                if isinstance(v, list) and v and isinstance(v[0], dict):
                    if ("hesap_kodu" in v[0]) or ("bakiye_borc" in v[0]) or ("bakiye_alacak" in v[0]):
                        return v
        return []

    # loader imza fallback'leri
    try:
        payload = load_all_for_client_period(base_dir="data", smmm_id=smmm, client_id=client, period=period)
    except TypeError:
        try:
            payload = load_all_for_client_period("data", smmm, client, period)
        except TypeError:
            payload = load_all_for_client_period(smmm, client, period)

    mizan_list = _get_mizan_list(payload)
    mizan_metrics = compute_mizan_metrics(mizan_list)

    def _safe_float(x):
        try:
            if x is None: return 0.0
            return float(x)
        except Exception:
            return 0.0

    def _row_code(row):
        return str(row.get("hesap_kodu") or row.get("account_code") or row.get("code") or "").strip()

    def _row_name(row):
        nm = row.get("hesap_adi") or row.get("account_name") or row.get("name")
        return str(nm).strip() if isinstance(nm, str) else ""

    def _net(row):
        borc = _safe_float(row.get("bakiye_borc"))
        alacak = _safe_float(row.get("bakiye_alacak"))
        return borc - alacak

    def _sum_prefix(prefixes, use_abs=True):
        total = 0.0
        details = []
        name_map = mizan_metrics.get("account_name_map", {}) if isinstance(mizan_metrics, dict) else {}
        for r in mizan_list:
            code = _row_code(r)
            if not code:
                continue
            if any(code.startswith(pfx) for pfx in prefixes):
                n = _net(r)
                total += abs(n) if use_abs else n
                if len(details) < 8:
                    nm = _row_name(r) or (name_map.get(code, "") if isinstance(name_map, dict) else "")
                    details.append({"account_code": code, "account_name": nm, "net": n})
        return float(total), details

    def _sev(amount_abs, med, high):
        if amount_abs >= high: return "HIGH"
        if amount_abs >= med: return "MEDIUM"
        return "LOW"

    kasa_abs, _ = _sum_prefix(["100"], use_abs=True)
    ortak_abs, _ = _sum_prefix(["131", "331"], use_abs=True)
    kredi_abs, _ = _sum_prefix(["3", "4"], use_abs=True)
    finans_abs, _ = _sum_prefix(["646", "656", "780"], use_abs=True)
    stok_abs, _ = _sum_prefix(["15"], use_abs=True)

    assets_net = float(mizan_metrics.get("assets_net", 0.0) or 0.0)
    liab_net = float(mizan_metrics.get("liabilities_equity_net", 0.0) or 0.0)
    delta_bs = assets_net - liab_net
    delta_bs_abs = abs(delta_bs)

    short_liab = abs(float(mizan_metrics.get("short_term_liabilities", 0.0) or 0.0))
    current_assets = float(mizan_metrics.get("total_current_assets", 0.0) or 0.0)
    liquidity_ratio = (current_assets / short_liab) if short_liab > 1e-9 else None

    equity_total = float(mizan_metrics.get("equity_total", 0.0) or 0.0)

    flags = []
    if delta_bs_abs > 1.0:
        tol = max(5_000.0, 0.002 * max(abs(assets_net), abs(liab_net), 1.0))
        if delta_bs_abs > tol:
            flags.append(f"Bilanço denge farkı yüksek: Δ={delta_bs:,.2f} TL (tolerans ~{tol:,.2f} TL)")
        else:
            flags.append(f"Bilanço denge farkı küçük: Δ={delta_bs:,.2f} TL (tolerans içinde)")
    if liquidity_ratio is not None:
        if liquidity_ratio < 0.9:
            flags.append(f"Likidite düşük: Dönen varlık / KV borç ≈ {liquidity_ratio:.2f}")
        elif liquidity_ratio > 3.5:
            flags.append(f"Likidite çok yüksek: Dönen varlık / KV borç ≈ {liquidity_ratio:.2f} (sınıflama kontrolü)")
    if equity_total < 0:
        flags.append(f"Özkaynak negatif görünüyor: {equity_total:,.2f} TL")

    items = [
        {
            "id": "D-100",
            "account_prefix": "100",
            "title_tr": "Kasa (100)",
            "severity": _sev(kasa_abs, med=50_000, high=250_000),
            "finding_tr": f"Kasa mutlak toplam (mizan net): {kasa_abs:,.2f} TL",
            "required_docs": [{"code": "CASH_COUNT", "title_tr": "Kasa sayım tutanağı (aylık)"}],
            "actions_tr": ["Kasa sayımını ay bazında dosyala.", "Kasa hareketlerini belge ile bağla."],
        },
        {
            "id": "D-131-331",
            "account_prefix": "131/331",
            "title_tr": "Ortaklar Cari (131/331 vb.)",
            "severity": _sev(ortak_abs, med=100_000, high=500_000),
            "finding_tr": f"Ortaklar cari mutlak toplam (mizan net): {ortak_abs:,.2f} TL",
            "required_docs": [{"code": "PARTNER_LEDGER", "title_tr": "Ortak cari detay dökümü + karar/sözleşme"}],
            "actions_tr": ["Kişi bazında dekont+açıklama ile belgeleyin.", "Dayanak karar/sözleşme ekleyin."],
        },
        {
            "id": "D-3XX-4XX",
            "account_prefix": "3xx/4xx",
            "title_tr": "Yabancı Kaynaklar (3/4 sınıfı)",
            "severity": _sev(kredi_abs, med=250_000, high=1_500_000),
            "finding_tr": f"3/4 sınıfı mutlak toplam (mizan net): {kredi_abs:,.2f} TL",
            "required_docs": [{"code": "DEBT_SUPPORT", "title_tr": "Borç mutabakatı / banka yazıları"}],
            "actions_tr": ["Kredi planı+banka yazısı dosyalayın.", "Cari mutabakat ekleyin."],
        },
        {
            "id": "D-FX-FIN",
            "account_prefix": "646/656/780",
            "title_tr": "Kur Farkı / Finansman / Faiz",
            "severity": _sev(finans_abs, med=50_000, high=250_000),
            "finding_tr": f"Kur/finansman/faiz mutlak toplam (mizan net): {finans_abs:,.2f} TL",
            "required_docs": [{"code": "FX_SUPPORT", "title_tr": "Kur farkı hesaplama + dekontlar"}],
            "actions_tr": ["Kur farkı dayanaklarını dosyalayın.", "Faizi borç kalemleriyle bağlayın."],
        },
        {
            "id": "D-STOCK",
            "account_prefix": "15x",
            "title_tr": "Stok (15x)",
            "severity": _sev(stok_abs, med=100_000, high=750_000),
            "finding_tr": f"Stok mutlak toplam (mizan net): {stok_abs:,.2f} TL",
            "required_docs": [{"code": "STOCK_COUNT", "title_tr": "Stok sayım tutanağı + envanter"}],
            "actions_tr": ["Dönem sonu stok sayımını belgeleyin.", "Fatura/irsaliye ile bağlayın."],
        },
    ]

    notes = []
    if flags:
        notes.append("Tutarlılık / Radar Bayrakları:")
        notes.extend([f"- {f}" for f in flags])
    notes.append(f"Özet: Dönen varlık={current_assets:,.2f} TL, KV borç={short_liab:,.2f} TL")
    if liquidity_ratio is not None:
        notes.append(f"Likidite oranı (dönen/KV) ≈ {liquidity_ratio:.2f}")

    return {
        "axis": "D",
        "title_tr": "Mizan İncelemesi (Kritik Eksen)",
        "period_window": {"period": period},
        "notes_tr": "\\n".join(notes),
        "items": items,
    }
