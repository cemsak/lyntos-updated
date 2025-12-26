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
def _axisd_find_mizan_csv(base_dir: str, smmm_id: str, client_id: str, period: str):
    cand = [
        os.path.join(base_dir, "data", "luca", smmm_id, client_id, period, "_raw", "mizan_base.csv"),
        os.path.join(base_dir, "data", "luca", smmm_id, client_id, period, "_raw", "mizan_cum.csv"),
        os.path.join(base_dir, "data", "luca", smmm_id, client_id, period, "mizan.csv"),
    ]
    for fp in cand:
        try:
            if os.path.exists(fp) and os.path.getsize(fp) > 0:
                return fp
        except Exception:
            pass
    return None




# --- AXIS D (v54) mizan-only contract builder (stable) ---
import csv
from typing import Any, Dict, List, Optional, Tuple

def _axisd_parse_float(x: Any) -> Optional[float]:
    if x is None:
        return None
    s = str(x).strip()
    if not s:
        return None
    # Turkish number formats: "1.234.567,89" and "1,234,567.89"
    s = s.replace("\u00a0", " ").replace(" ", "")
    # If comma is decimal separator (more common in TR)
    if s.count(",") == 1 and (s.count(".") >= 1):
        # assume "." are thousands separators
        s = s.replace(".", "").replace(",", ".")
    elif s.count(",") == 1 and s.count(".") == 0:
        s = s.replace(",", ".")
    else:
        # already dot-decimal or integer; remove thousands commas
        if s.count(".") == 1 and s.count(",") >= 1:
            s = s.replace(",", "")
    try:
        return float(s)
    except Exception:
        return None

def _axisd_read_mizan_rows(csv_path: Path) -> List[Dict[str, Any]]:
    raw = csv_path.read_text(encoding="utf-8", errors="replace")
    sample = raw[:4096]
    # delimiter sniff
    delim = ";"
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=";,\t|")
        delim = dialect.delimiter
    except Exception:
        pass

    reader = csv.DictReader(raw.splitlines(), delimiter=delim)
    if not reader.fieldnames:
        return []

    # normalize headers
    def norm(h: str) -> str:
        return (h or "").strip().lower().replace("\ufeff", "")

    headers = {norm(h): h for h in reader.fieldnames}

    def pick(*cands: str) -> Optional[str]:
        for c in cands:
            for nh, orig_h in headers.items():
                if c in nh:
                    return orig_h
        return None

    col_code = pick("hesap kod", "account code", "hesap_kod", "kod")
    col_name = pick("hesap ad", "account name", "ad", "name")
    col_debit = pick("borc", "debit")
    col_credit = pick("alacak", "credit")
    col_net = pick("bakiye", "net", "balance")

    rows: List[Dict[str, Any]] = []
    for r in reader:
        code = (r.get(col_code) if col_code else None) or ""
        code = str(code).strip()
        if not code:
            continue

        name = (r.get(col_name) if col_name else "") or ""
        name = str(name).strip()

        net_v = _axisd_parse_float(r.get(col_net)) if col_net else None
        if net_v is None:
            d = _axisd_parse_float(r.get(col_debit)) if col_debit else None
            c = _axisd_parse_float(r.get(col_credit)) if col_credit else None
            d = d or 0.0
            c = c or 0.0
            net_v = d - c

        rows.append({"account_code": code, "account_name": name, "net": float(net_v)})

    return rows

def _axisd_sum_prefix(rows: List[Dict[str, Any]], prefixes: List[str]) -> float:
    total = 0.0
    for r in rows:
        code = str(r.get("account_code") or "")
        if any(code.startswith(p) for p in prefixes):
            total += float(r.get("net") or 0.0)
    return total

def _axisd_top_accounts(rows: List[Dict[str, Any]], prefixes: List[str], n: int = 8) -> List[Dict[str, Any]]:
    bucket = []
    for r in rows:
        code = str(r.get("account_code") or "")
        if any(code.startswith(p) for p in prefixes):
            bucket.append(r)
    bucket.sort(key=lambda x: abs(float(x.get("net") or 0.0)), reverse=True)
    out = []
    for r in bucket[:n]:
        out.append({
            "account_code": r.get("account_code"),
            "account_name": r.get("account_name"),
            "net": float(r.get("net") or 0.0),
        })
    return out

def _axisd_prev_quarter(period: str) -> Optional[str]:
    # expects "YYYY-Qn"
    try:
        y_s, q_s = period.split("-Q")
        y = int(y_s)
        q = int(q_s)
        if q in (2, 3, 4):
            return f"{y}-Q{q-1}"
        if q == 1:
            return f"{y-1}-Q4"
        return None
    except Exception:
        return None

def _axisd_find_mizan_path(base_dir: Path, smmm_id: str, client_id: str, period: str) -> Optional[Path]:
    fp = _axisd_find_mizan_csv(base_dir, smmm_id, client_id, period)
    if fp:
        return Path(fp)
    return None

def _axisd_kpi_delta(cur: Optional[float], prev: Optional[float]) -> Tuple[Optional[float], Optional[float]]:
    if cur is None or prev is None:
        return None, None
    delta = cur - prev
    if abs(prev) < 1e-12:
        return delta, None
    return delta, delta / abs(prev)

def build_axis_d_contract_mizan_only(base_dir: Path, smmm_id: str, client_id: str, period: str) -> Dict[str, Any]:
    cur_fp = _axisd_find_mizan_path(base_dir, smmm_id, client_id, period)
    if not cur_fp or not cur_fp.exists():
        raise FileNotFoundError(f"Mizan dosyası bulunamadı: data/luca/{smmm_id}/{client_id}/{period}")

    cur_rows = _axisd_read_mizan_rows(cur_fp)

    cash_bank = _axisd_sum_prefix(cur_rows, ["100", "102"])
    total_current_assets = _axisd_sum_prefix(cur_rows, ["1"])
    short_term_liabilities = abs(_axisd_sum_prefix(cur_rows, ["3"]))
    equity_total = _axisd_sum_prefix(cur_rows, ["5"])

    # balance gap: (Assets total) - (Liabilities+Equity)
    assets_total = _axisd_sum_prefix(cur_rows, ["1", "2"])
    liabilities_total = abs(_axisd_sum_prefix(cur_rows, ["3", "4"]))
    balance_gap = abs(assets_total - (liabilities_total + equity_total))

    liquidity_ratio = (total_current_assets / short_term_liabilities) if short_term_liabilities > 1e-12 else None

    # prev
    prev_p = _axisd_prev_quarter(period)
    reason_tr = None  # v58b ensure defined
    prev_available = False
    # v58b smoketest guard: ignore __SMOKETEST_* folders
    if prev_available:
        _ppath = str(_prev_period)
        if '__SMOKETEST' in _ppath:
            prev_available = False
            reason_tr = 'Önceki çeyrek verisi smoketest kopyası olarak işaretli: ' + _ppath
    reason_tr: Optional[str] = None
    prev_vals: Dict[str, Optional[float]] = {
        "cash_bank": None,
        "total_current_assets": None,
        "short_term_liabilities": None,
        "liquidity_ratio": None,
        "equity_total": None,
        "balance_gap": None,
    }

    if prev_p:
        prev_fp = _axisd_find_mizan_path(base_dir, smmm_id, client_id, prev_p)
        if prev_fp and prev_fp.exists():
            prev_rows = _axisd_read_mizan_rows(prev_fp)
            prev_available = True
            prev_cash_bank = _axisd_sum_prefix(prev_rows, ["100", "102"])
            prev_tca = _axisd_sum_prefix(prev_rows, ["1"])
            prev_stl = abs(_axisd_sum_prefix(prev_rows, ["3"]))
            prev_eq = _axisd_sum_prefix(prev_rows, ["5"])
            prev_assets_total = _axisd_sum_prefix(prev_rows, ["1", "2"])
            prev_liab_total = abs(_axisd_sum_prefix(prev_rows, ["3", "4"]))
            prev_gap = abs(prev_assets_total - (prev_liab_total + prev_eq))
            prev_lr = (prev_tca / prev_stl) if prev_stl > 1e-12 else None

            prev_vals.update({
                "cash_bank": prev_cash_bank,
                "total_current_assets": prev_tca,
                "short_term_liabilities": prev_stl,
                "liquidity_ratio": prev_lr,
                "equity_total": prev_eq,
                "balance_gap": prev_gap,
            })
        else:
            reason_tr = f"Önceki çeyrek mizan bulunamadı: {prev_p}"
    else:
        reason_tr = "Önceki çeyrek hesaplanamadı (period formatı beklenen değil)."

    def kpi(key: str, title: str, cur: Optional[float], prev: Optional[float], kind: str) -> Dict[str, Any]:
        d, dp = _axisd_kpi_delta(cur, prev)
        return {
            "key": key,
            "title_tr": title,
            "current": cur,
            "prev": prev,
            "delta": d,
            "delta_pct": dp,
            "kind": kind,
        }

    trend = {
        "mode": "QOQ",
        "current_period": period,
        "prev_period": prev_p,
        "prev_available": prev_available,
        "reason_tr": (None if prev_available else (reason_tr or "Önceki çeyrek verisi bulunamadı.")),
        "kpis": [
            kpi("cash_bank", "Kasa+Banka (Net)", cash_bank, prev_vals["cash_bank"], "amount"),
            kpi("total_current_assets", "Dönen Varlık (Toplam)", total_current_assets, prev_vals["total_current_assets"], "amount"),
            kpi("short_term_liabilities", "Kısa Vadeli Borç", short_term_liabilities, prev_vals["short_term_liabilities"], "amount"),
            kpi("liquidity_ratio", "Likidite Oranı (Dönen/KV)", liquidity_ratio, prev_vals["liquidity_ratio"], "ratio"),
            kpi("equity_total", "Özkaynak", equity_total, prev_vals["equity_total"], "amount"),
            kpi("balance_gap", "Bilanço Denge Farkı (Δ)", balance_gap, prev_vals["balance_gap"], "amount"),
        ],
    }

    # flags
    tol = max(10000.0, abs(assets_total) * 0.002)
    notes_lines = [
        "Tutarlılık / Radar Bayrakları:",
        f"- Bilanço denge farkı yüksek: Δ={balance_gap:,.2f} TL (tolerans ~{tol:,.2f} TL)",
        f"- Özkaynak negatif görünüyor: {equity_total:,.2f} TL" if equity_total < 0 else f"- Özkaynak: {equity_total:,.2f} TL",
        f"Özet: Dönen varlık={total_current_assets:,.2f} TL, KV borç={short_term_liabilities:,.2f} TL",
        f"Likidite oranı (dönen/KV) ≈ {liquidity_ratio:.2f}" if liquidity_ratio is not None else "Likidite oranı (dönen/KV) ≈ N/A",
    ]

    items = [
        {
            "id": "D-100",
            "account_prefix": "100",
            "title_tr": "Kasa (100)",
            "severity": "MEDIUM",
            "finding_tr": f"Kasa mutlak toplam (mizan net): {abs(_axisd_sum_prefix(cur_rows, ['100'])):,.2f} TL",
            "top_accounts": _axisd_top_accounts(cur_rows, ["100"], 10),
            "required_docs": [{"code": "CASH_COUNT", "title_tr": "Kasa sayım tutanağı (aylık/çeyreklik)"}],
            "actions_tr": ["Kasa sayımını dosyala.", "Kasa hareketlerini belge ile bağla."],
        },
        {
            "id": "D-102",
            "account_prefix": "102",
            "title_tr": "Bankalar (102)",
            "severity": "LOW",
            "finding_tr": f"Banka mutlak toplam (mizan net): {abs(_axisd_sum_prefix(cur_rows, ['102'])):,.2f} TL",
            "top_accounts": _axisd_top_accounts(cur_rows, ["102"], 12),
            "required_docs": [{"code": "BANK_STMT", "title_tr": "Banka hesap ekstreleri (aylık)"}],
            "actions_tr": ["Banka ekstrelerini dönem bazında arşivle.", "102 alt hesapları banka bazında doğrula."],
        },
        {
            "id": "D-131-331",
            "account_prefix": "131/331",
            "title_tr": "Ortaklar Cari (131/331 vb.)",
            "severity": "LOW",
            "finding_tr": f"Ortaklar cari mutlak toplam (mizan net): {abs(_axisd_sum_prefix(cur_rows, ['131','331'])):,.2f} TL",
            "top_accounts": _axisd_top_accounts(cur_rows, ["131","331"], 12),
            "required_docs": [{"code": "PARTNER_LEDGER", "title_tr": "Ortaklar cari mutabakat/ekstre"}],
            "actions_tr": ["Ortak hesap hareketlerini mutabakatla bağla.", "Varsa borç-alacak ilişkisini sözleşme/karar ile belgeye bağla."],
        },
        {
            "id": "D-3X-4X",
            "account_prefix": "3xx/4xx",
            "title_tr": "Krediler / Borçlar (3xx/4xx)",
            "severity": "MEDIUM",
            "finding_tr": f"KV+UV borç mutlak toplam: {abs(_axisd_sum_prefix(cur_rows, ['3','4'])):,.2f} TL",
            "top_accounts": _axisd_top_accounts(cur_rows, ["3","4"], 12),
            "required_docs": [{"code": "LOAN_AGR", "title_tr": "Kredi sözleşmesi + geri ödeme planı"}],
            "actions_tr": ["Kredi sözleşmelerini ve ödeme planını dosyala.", "Faiz/kur farkı giderlerini ilgili hesaplarla eşle."],
        },
        {
            "id": "D-150",
            "account_prefix": "150",
            "title_tr": "Stoklar (150/15x)",
            "severity": "LOW",
            "finding_tr": f"Stok mutlak toplam (mizan net): {abs(_axisd_sum_prefix(cur_rows, ['15'])):,.2f} TL",
            "top_accounts": _axisd_top_accounts(cur_rows, ["15"], 12),
            "required_docs": [{"code": "STOCK_COUNT", "title_tr": "Stok sayım tutanağı (çeyreklik)"}],
            "actions_tr": ["Stok sayımını çeyreklik yap ve dosyala.", "Stok hareketlerini fatura/irsaliye ile bağla."],
        },
    ]

    return {
        "axis": "D",
        "title_tr": "Mizan İncelemesi (Kritik Eksen)",
        "period_window": {"period": period},
        "trend": trend,
        "notes_tr": "\n".join(notes_lines),
        "items": items,
    }


@router.get("/contracts/axis/{axis}")
def get_axis_contract(
    axis: str,
    smmm: str = Query(...),
    client: str = Query(...),
    period: str = Query(...),
):
    """
    Axis contracts (v50):
      - D: Mizan incelemesi + QoQ trend (çeyrek karşılaştırma)
    """
    axis = (axis or "").upper()

    if axis == "D":
        # v54: fully mizan-only, avoids beyanname/banka dependencies
        return build_axis_d_contract_mizan_only(BASE, smmm, client, period)

# v61: trimmed legacy dead code after delegation to build_axis_d_contract_mizan_only
