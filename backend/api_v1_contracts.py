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


# --- Sprint-3 KPI helpers (backend is source of truth) ---

def _clamp(n: float, lo: float, hi: float) -> float:
    try:
        return max(lo, min(hi, float(n)))
    except Exception:
        return lo

def _sev_rank(sev: str) -> int:
    s = (sev or "").upper()
    if s == "CRITICAL": return 4
    if s == "HIGH": return 3
    if s == "MEDIUM": return 2
    if s == "LOW": return 1
    return 0

def _sev_multiplier(sev: str) -> float:
    s = (sev or "").upper()
    if s == "CRITICAL": return 2.0
    if s == "HIGH": return 1.5
    if s == "MEDIUM": return 1.2
    if s == "LOW": return 1.0
    return 1.0

def _compute_risk_score(r: dict) -> int:
    sigs = r.get("kurgan_criteria_signals") or []
    usable = [s for s in sigs if isinstance(s, dict) and isinstance(s.get("score"), (int, float))]
    if not usable:
        return 0

    has_weights = any(isinstance(s.get("weight"), (int, float)) for s in usable)
    if has_weights:
        sum_w = 0.0
        sum_sc = 0.0
        for s in usable:
            w = s.get("weight")
            sc = s.get("score")
            w = float(w) if isinstance(w, (int, float)) else 0.0
            sc = float(sc) if isinstance(sc, (int, float)) else 0.0
            w = _clamp(w, 0.0, 1.0)
            sc = _clamp(sc, 0.0, 100.0)
            if w > 0:
                sum_w += w
                sum_sc += sc * w
        if sum_w > 0:
            return int(_clamp(round(sum_sc / sum_w), 0, 100))

    avg = sum(_clamp(float(s.get("score") or 0), 0, 100) for s in usable) / float(len(usable))
    return int(_clamp(round(avg), 0, 100))

def _missing_todo_unique_count(risks_sorted: list[dict]) -> int:
    # UI mantığına paralel: missing_refs -> unique (code|title)
    uniq = set()
    for x in risks_sorted:
        r = x.get("r") or {}
        sigs = r.get("kurgan_criteria_signals") or []
        for s in sigs:
            if not isinstance(s, dict):
                continue
            for mr in (s.get("missing_refs") or []):
                if not isinstance(mr, dict):
                    continue
                code = (mr.get("code") or "").strip()
                title = (mr.get("title_tr") or code).strip()
                if code or title:
                    uniq.add(f"{code}|{title}")
    return len(uniq)

def _enrich_portfolio_with_kpis(c: dict) -> None:
    dq = c.get("data_quality") or {}
    if not isinstance(dq, dict):
        dq = {}
        c.setdefault("warnings", []).append("bad_contract:data_quality_not_object")

    total = int(dq.get("bank_rows_total") or 0)
    inp = int(dq.get("bank_rows_in_period") or 0)
    outp = int(dq.get("bank_rows_out_of_period") or 0)

    dq_score = 0
    if total > 0:
        dq_score = int(_clamp(round((inp / total) * 100), 0, 100))
    else:
        c.setdefault("warnings", []).append("missing_dq:bank_rows_total")

    risks = c.get("risks") or []
    if not isinstance(risks, list):
        risks = []
        c.setdefault("warnings", []).append("bad_contract:risks_not_array")

    risks_with = []
    for r in risks:
        if not isinstance(r, dict):
            continue
        risks_with.append({"r": r, "riskScore": _compute_risk_score(r)})

    risks_sorted = sorted(
        risks_with,
        key=lambda x: (_sev_rank(str((x.get("r") or {}).get("severity"))), int(x.get("riskScore") or 0)),
        reverse=True,
    )

    missing_todo_cnt = _missing_todo_unique_count(risks_sorted)

    # kurgan risk score (severity-weighted)
    if not risks_sorted:
        kurgan_risk = 0
    else:
        sum_w = 0.0
        sum_sc = 0.0
        for x in risks_sorted:
            r = x.get("r") or {}
            w = _sev_multiplier(str(r.get("severity") or ""))
            sum_w += w
            sum_sc += float(x.get("riskScore") or 0) * w
        kurgan_risk = int(_clamp(round(sum_sc / sum_w), 0, 100)) if sum_w > 0 else 0

    # vergi uyum
    risk_penalty = int(round(kurgan_risk * 0.75))
    dq_penalty = int(round((100 - dq_score) * 0.25))
    vergi_uyum = int(_clamp(100 - risk_penalty - dq_penalty, 0, 100))

    # radar risk
    out_ratio = _clamp(outp / total, 0.0, 1.0) if total > 0 else 0.0
    heavy = sum(1 for x in risks_sorted if _sev_rank(str((x.get("r") or {}).get("severity"))) >= 3)  # HIGH+
    heavy_ratio = (heavy / len(risks_sorted)) if risks_sorted else 0.0
    todo_norm = _clamp(missing_todo_cnt / 10.0, 0.0, 1.0)
    radar_risk = int(_clamp(round((out_ratio * 0.60 + heavy_ratio * 0.30 + todo_norm * 0.10) * 100), 0, 100))

    c["kpis"] = {
        "kurgan_risk_score": kurgan_risk,
        "vergi_uyum_puani": vergi_uyum,
        "radar_risk_score": radar_risk,
        "dq_in_period_pct": dq_score,
    }
    c["kpis_meta"] = {
        "version": "s3_kpis_v1",
        "components": {
            "dq": {"bank_rows_total": total, "bank_rows_in_period": inp, "bank_rows_out_of_period": outp},
            "risks": {"count": len(risks_sorted), "heavy_high_plus": heavy, "missing_todo_unique": missing_todo_cnt},
        },
        "formula": {
            "dqScore": "round(in_period/total*100)",
            "kurganRiskScore": "severity-weighted avg(riskScore)",
            "vergiUyum": "100 - round(kurgan*0.75) - round((100-dq)*0.25)",
            "radarRisk": "round((outRatio*0.60 + heavyRatio*0.30 + todoNorm*0.10)*100)",
        },
    }

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
def contracts_portfolio(
    smmm: str | None = Query(None),
    client: str | None = Query(None),
    period: str | None = Query(None, description="örn: 2025-Q2"),
    smmm_id: str | None = Query(None),
    client_id: str | None = Query(None),
):
    """
    Sprint-3: KPI'lar backend contract'tan üretilecek (tek kaynak gerçek).
    Geriye dönük uyumluluk:
      - smmm_id/client_id parametreleri de kabul edilir.
    Not: Parametre verilmezse de contract döner (UI kırılmasın), fakat warnings'e ctx eksikliği eklenir.
    """
    c = _read_json(CONTRACTS_DIR / "portfolio_customer_summary.json")

    # ctx normalize (multi-tenant forward)
    smmm_n = smmm or smmm_id
    client_n = client or client_id
    period_n = period

    # contract üstüne bağlamı yaz (opsiyonel)
    if smmm_n:
        c["smmm_id"] = smmm_n
    if client_n:
        c["client_id"] = client_n
    if period_n:
        c.setdefault("period_window", {})
        if isinstance(c["period_window"], dict):
            c["period_window"]["period"] = period_n

    # ensure warnings list
    if "warnings" not in c or not isinstance(c.get("warnings"), list):
        c["warnings"] = []
    if not smmm_n or not client_n or not period_n:
        c["warnings"].append("missing_ctx_params:smmm/client/period")

    try:
        _enrich_portfolio_with_kpis(c)
    except Exception as e:
        c["warnings"].append(f"kpi_enrich_failed:{e}")

    return JSONResponse(c)

@router.get("/contracts/dossier/manifest")
def contracts_dossier_manifest(
    smmm: str = Query(...),
    client: str = Query(...),
    period: str = Query(..., description="örn: 2025-Q2"),
):
    """
    Ödül standardı: kanıt üretimi için 'manifest' contract.
    Kaynaklar:
      - portfolio contract (ctx + kpis dahil)
      - axis D contract (required_docs + actions_tr + missing_docs + evidence_refs)
    Not: Bu endpoint ZIP/PDF üretmez; sadece deterministik checklist/manifest döner.
    """
    # Portfolio (with KPI enrich)
    c = _read_json(CONTRACTS_DIR / "portfolio_customer_summary.json")
    c["smmm_id"] = smmm
    c["client_id"] = client
    c.setdefault("period_window", {})
    if isinstance(c["period_window"], dict):
        c["period_window"]["period"] = period
    if "warnings" not in c or not isinstance(c.get("warnings"), list):
        c["warnings"] = []
    try:
        _enrich_portfolio_with_kpis(c)
    except Exception as e:
        c["warnings"].append(f"kpi_enrich_failed:{e}")

    # Axis D
    axis_d = build_axis_d_contract_mizan_only(BASE, smmm, client, period)
    items = axis_d.get("items") or []

    def uniq_docs(field: str):
        out = []
        seen = set()
        for it in items:
            for d in (it or {}).get(field) or []:
                if not isinstance(d, dict):
                    continue
                code = str(d.get("code") or "").strip()
                if not code:
                    continue
                if code in seen:
                    continue
                seen.add(code)
                out.append(d)
        return out

    required_docs = uniq_docs("required_docs")
    missing_docs = uniq_docs("missing_docs")

    sections = [
        {
            "id": "AXIS_D",
            "title_tr": axis_d.get("title_tr") or "Eksen D",
            "schema_version": ((axis_d.get("schema") or {}).get("version") if isinstance(axis_d.get("schema"), dict) else None),
            "items": [
                {
                    "id": (it or {}).get("id"),
                    "title_tr": (it or {}).get("title_tr"),
                    "severity": (it or {}).get("severity"),
                    "finding_tr": (it or {}).get("finding_tr"),
                    "required_docs": (it or {}).get("required_docs") or [],
                    "actions_tr": (it or {}).get("actions_tr") or [],
                    "missing_docs": (it or {}).get("missing_docs") or [],
                    "evidence_refs": (it or {}).get("evidence_refs") or [],
                }
                for it in items
                if isinstance(it, dict)
            ],
        }
    ]

    resp = {
        "kind": "dossier_manifest",
        "smmm_id": smmm,
        "client_id": client,
        "period_window": {"period": period},
        "portfolio_kpis": c.get("kpis"),
        "portfolio_kpis_meta": c.get("kpis_meta"),
        "sections": sections,
        "checklist": {
            "required_docs": required_docs,
            "missing_docs": missing_docs,
        },
        "warnings": (c.get("warnings") or []) + (axis_d.get("warnings") or []),
    }
    return JSONResponse(resp)

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
            if "__SMOKETEST_" in fp:
                continue
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
    # Keep line order; many LUCA exports have a title row like: "MİZAN;;;;;;"
    lines = [ln for ln in raw.splitlines() if ln is not None]
    if not lines:
        return []

    sample = "\n".join(lines[:80])[:4096]

    # delimiter sniff
    delim = ";"
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=";,\t|")
        delim = dialect.delimiter
    except Exception:
        pass

    def norm_line(x: str) -> str:
        return (x or "").strip().lower().replace("\ufeff", "")

    def looks_like_header(ln: str) -> bool:
        n = norm_line(ln)
        if not n:
            return False
        # LUCA / Excel header candidates
        if "hesap" in n and ("kod" in n or "kodu" in n or "account" in n):
            return True
        if ("borc" in n or "borç" in n or "debit" in n) and ("alacak" in n or "credit" in n):
            return True
        if ("bakiye" in n or "balance" in n or "net" in n) and ("hesap" in n):
            return True
        return False

    # Find the real header row (skip title row like "MİZAN")
    header_idx = None
    for idx, ln in enumerate(lines[:120]):
        if looks_like_header(ln):
            header_idx = idx
            break

    # Fallback: if first non-empty line is "mizan", try the next non-empty line
    if header_idx is None:
        for idx, ln in enumerate(lines[:10]):
            n = norm_line(ln)
            if not n:
                continue
            if n.startswith("mizan"):
                # find next non-empty line
                for k in range(idx + 1, min(idx + 6, len(lines))):
                    if norm_line(lines[k]):
                        header_idx = k
                        break
                break

    if header_idx is None:
        # As a last resort, keep original behavior (may still return empty)
        reader = csv.DictReader(lines, delimiter=delim)
        if not reader.fieldnames:
            return []
        fieldnames = list(reader.fieldnames)
        data_lines = lines[1:]
    else:
        header_cells = lines[header_idx].split(delim)
        fieldnames = []
        for k, h in enumerate(header_cells):
            h = (h or "").strip()
            fieldnames.append(h if h else f"col_{k}")
        data_lines = lines[header_idx + 1 :]

    # Build reader with explicit fieldnames to avoid bad first-row headers
    reader = csv.DictReader(data_lines, fieldnames=fieldnames, delimiter=delim)

    # normalize headers
    def norm(h: str) -> str:
        return (h or "").strip().lower().replace("\ufeff", "")

    headers = {norm(h): h for h in fieldnames}

    def pick(*cands: str) -> Optional[str]:
        for c in cands:
            c = c.lower()
            for nh, orig_h in headers.items():
                if c in nh:
                    return orig_h
        return None

    # Wider header matching (Sprint-4)
    col_code = pick("hesap kod", "hesap kodu", "hesapkodu", "hesap_kodu", "account code", "accountcode", "account_code", "hesap no", "hesapno", "kod", "code", "account")
    col_name = pick("hesap ad", "hesap adı", "hesapadi", "hesap_adi", "account name", "accountname", "ad", "açıklama", "aciklama", "description", "name")
    col_debit = pick("borc", "borç", "debit", "dr")
    col_credit = pick("alacak", "credit", "cr")
    col_net = pick("bakiye", "net", "balance", "tutar", "amount")

    rows: List[Dict[str, Any]] = []
    for r in reader:
        # If we couldn't pick columns, skip (will return empty; better than wrong)
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



def _axisd_norm_code(v: Any) -> str:
    """
    Normalize account_code for prefix matching.
    Handles: "600.01", "'60001", "600-01", "600 01"
    Returns digits-only when available; otherwise stripped string.
    """
    s = str(v or "").strip().replace("\u200e","").replace("\u200f","")
    if s.startswith("'"):
        s = s[1:].strip()
    digits = "".join(ch for ch in s if ch.isdigit())
    return digits or s

def _axisd_sum_prefix(rows: List[Dict[str, Any]], prefixes: List[str]) -> float:
    total = 0.0
    for r in rows:
        code = _axisd_norm_code(r.get("account_code"))
        if any(code.startswith(p) for p in prefixes):
            total += float(r.get("net") or 0.0)
    return total

def _axisd_top_accounts(rows: List[Dict[str, Any]], prefixes: List[str], n: int = 8) -> List[Dict[str, Any]]:
    bucket = []
    for r in rows:
        code = _axisd_norm_code(r.get("account_code"))
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
        raise HTTPException(status_code=404, detail=f"Mizan dosyası bulunamadı: data/luca/{smmm_id}/{client_id}/{period}")

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
    prev_available = False
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
    # --- Sprint-4: top_accounts fallbacks (stable drilldown; disclose fallback) ---
    ta_600 = _axisd_top_accounts(cur_rows, ["600","601","602"], 12)
    ta_600_fb = ta_600 or _axisd_top_accounts(cur_rows, ["6"], 12)
    ta_600_note = "" if ta_600 else " (Not: 600/601/602 bulunamadı; 6xx gelir hesapları gösteriliyor.)"

    # --- Sprint-4: FIN/FX split (Tekdüzen) top_accounts fallbacks ---
    ta_fx = _axisd_top_accounts(cur_rows, ["646","656"], 12)
    ta_fx_fb = ta_fx or _axisd_top_accounts(cur_rows, ["64"], 12)
    ta_fx_note = "" if ta_fx else " (Not: 646/656 bulunamadı; 64x grubu gösteriliyor.)"

    ta_fin = _axisd_top_accounts(cur_rows, ["660","661","780","781"], 12)
    ta_fin_fb = ta_fin or _axisd_top_accounts(cur_rows, ["66","78"], 12)
    ta_fin_note = "" if ta_fin else " (Not: 660/661/780/781 bulunamadı; 66x/78x grupları gösteriliyor.)"


    
    # --- Sprint-4: 102 subaccount ↔ bank statements linkage (deterministic) ---
    bank_dir = base_dir / "data" / "banka" / smmm_id / client_id / period / "_raw"
    bank_files = sorted([p.name for p in bank_dir.glob("*.csv")]) if bank_dir.exists() else []

    ta_102 = _axisd_top_accounts(cur_rows, ["102"], 12)
    sub_102_codes = sorted({
        str((r or {}).get("account_code") or "").strip()
        for r in _axisd_top_accounts(cur_rows, ["102"], 60)
        if "." in str((r or {}).get("account_code") or "")
    })

    matched_codes = []
    missing_codes = []
    for code in sub_102_codes:
        hits = [f for f in bank_files if f.startswith(code)]
        if hits:
            matched_codes.append(code)
        else:
            missing_codes.append(code)

    sev_102 = "HIGH" if missing_codes else "LOW"
    missing_docs_102 = [
        {"code": f"BANK_STMT_{c}", "title_tr": f"{c} için banka ekstresi (dönem)"}
        for c in missing_codes[:20]
    ]

    tail_102 = ""
    if missing_codes:
        shown = ", ".join(missing_codes[:6])
        more = f" (+{len(missing_codes)-6})" if len(missing_codes) > 6 else ""
        tail_102 = f" Eksik ekstre: {shown}{more}."

    # --- Sprint-4: 102 evidence (out-of-period files + POS) ---
    def _axisd_expected_months(period: str):
        # period format: YYYY-QN
        try:
            q = int((period or '').split('-Q')[-1])
        except Exception:
            return []
        if q == 1: return [1,2,3]
        if q == 2: return [4,5,6]
        if q == 3: return [7,8,9]
        if q == 4: return [10,11,12]
        return []

    def _axisd_months_from_name(name: str):
        n = (name or '').lower()
        months = set()
        # '7. AY' / '7 AY'
        for m in range(1,13):
            if re.search(rf'(?<!\d){m}(?!\d)\s*\.?\s*ay\b', n):
                months.add(m)
        # '4-5-6' / '4-5'
        for a,b,c in re.findall(r'(?<!\d)(1[0-2]|0?[1-9])\s*-\s*(1[0-2]|0?[1-9])(?:\s*-\s*(1[0-2]|0?[1-9]))?(?!\d)', n):
            months.add(int(a))
            months.add(int(b))
            if c:
                months.add(int(c))
        return sorted(months)

    exp_months = _axisd_expected_months(period)
    out_of_period_files_102 = []
    if exp_months:
        for f in bank_files:
            ms = _axisd_months_from_name(f)
            if ms and any(m not in exp_months for m in ms):
                out_of_period_files_102.append(f)

    # POS subaccounts (by mizan account_name)
    pos_codes_102 = []
    for r in _axisd_top_accounts(cur_rows, ["102"], 80):
        nm = str((r or {}).get("account_name") or "").lower()
        if "pos" in nm:
            code = str((r or {}).get("account_code") or "").strip()
            if code and code not in pos_codes_102:
                pos_codes_102.append(code)

    oop_note = ""
    if out_of_period_files_102:
        samp = ", ".join(out_of_period_files_102[:3])
        more = f" (+{len(out_of_period_files_102)-3})" if len(out_of_period_files_102) > 3 else ""
        oop_note = f" Çeyrek dışı dosya: {len(out_of_period_files_102)} (örnek: {samp}{more})."

    pos_note = ""
    if pos_codes_102:
        shown = ", ".join(pos_codes_102[:4])
        more = f" (+{len(pos_codes_102)-4})" if len(pos_codes_102) > 4 else ""
        pos_note = f" POS alt hesap(lar): {shown}{more}."

    evidence_102 = []
    if out_of_period_files_102:
        evidence_102.append({"kind": "bank_out_of_period_files", "files": out_of_period_files_102[:30], "expected_months": exp_months})
    if pos_codes_102:
        evidence_102.append({"kind": "pos_subaccounts", "codes": pos_codes_102})

    finding_102 = (
        f"102 banka alt hesapları: {len(sub_102_codes)}; "
        f"ekstre dosyaları: {len(bank_files)}; "
        f"eşleşen: {len(matched_codes)}."
        + tail_102 + oop_note + pos_note
    )
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
        {
            "id": "D-600-602",
            "account_prefix": "600/601/602",
            "title_tr": "Satış Hesapları (600/601/602)",
            "severity": "MEDIUM",
            "finding_tr": f"Satış hesapları net toplam (mizan): {_axisd_sum_prefix(cur_rows, ['600','601','602']):,.2f} TL" + ta_600_note,
            "top_accounts": ta_600_fb,
            "required_docs": [
                {"code": "EINV_SALES", "title_tr": "E-Fatura/E-Arşiv satış listesi (dönem)"},
                {"code": "VAT_RETURN", "title_tr": "KDV beyannamesi ve ekleri (aylık)"},
                {"code": "AR_AP_LEDGER", "title_tr": "Cari hesap ekstresi (120/320)"},
            ],
            "actions_tr": [
                "600/601/602 toplamını ay bazında çıkar ve büyük sapmaları işaretle.",
                "E-fatura satış listesi toplamı ile mizandaki toplamı karşılaştır; fark varsa gerekçelendir.",
                "Aykırı/yüksek tutarlı satışları örnekleme ile fatura ve teslim/ifa dayanağına bağla.",
            ],
        },
        {
            "id": "D-FX-646-656",
            "account_prefix": "646/656",
            "title_tr": "Kur Farkı (646/656)",
            "severity": "MEDIUM",
            "finding_tr": f"Kur farkı net toplam (mizan): {_axisd_sum_prefix(cur_rows, ['646','656']):,.2f} TL" + ta_fx_note,
            "top_accounts": ta_fx_fb,
            "required_docs": [
                {"code": "FX_REVAL", "title_tr": "Kur değerleme hesaplama dökümü (varsa)"},
                {"code": "BANK_STMT_FX", "title_tr": "Dövizli/döviz endeksli banka ekstreleri + dekontlar (dönem)"},
                {"code": "FC_POS", "title_tr": "Döviz pozisyonu listesi (kasa/banka/cari/kredi) (varsa)"},
            ],
            "actions_tr": [
                "646/656 hesaplarını ay bazında çıkar; ani sıçramaları işaretle.",
                "Kur farkı kayıtlarının değerleme yöntemini ve dayanağını dosyala.",
                "Dövizli kaynakları (banka/kredi/cari) kur farkı hareketleriyle bağla.",
            ],
            "evidence_refs": [],
            "missing_docs": [],
        },
        {
            "id": "D-FIN-660-661-780-781",
            "account_prefix": "660/661/780/781",
            "title_tr": "Finansman Giderleri (660/661/780/781)",
            "severity": "MEDIUM",
            "finding_tr": f"Finansman gideri net toplam (mizan): {_axisd_sum_prefix(cur_rows, ['660','661','780','781']):,.2f} TL" + ta_fin_note,
            "top_accounts": ta_fin_fb,
            "required_docs": [
                {"code": "LOAN_AGR", "title_tr": "Kredi sözleşmeleri + geri ödeme planı"},
                {"code": "BANK_STMT", "title_tr": "Banka ekstreleri + dekontlar (dönem)"},
                {"code": "INT_SCHED", "title_tr": "Faiz/komisyon/tahakkuk planı (varsa)"},
            ],
            "actions_tr": [
                "660/661 ve 780/781 hesaplarını ay bazında çıkar; dönemsel sıçramaları işaretle.",
                "Faiz/komisyon ödemelerini dekontlarla bağla; tahakkuk farklarını açıkla.",
                "781 kullanılıyorsa 780↔781 kapanış/mutabakat kontrolünü dosyala.",
            ],
            "evidence_refs": [],
            "missing_docs": [],
        },


        {
            "id": "D-102-LINK",
            "account_prefix": "102.xx",
            "title_tr": "102 Banka Alt Hesap ↔ Ekstre Eşleştirme",
            "severity": sev_102,
            "finding_tr": finding_102,
            "top_accounts": ta_102,
            "required_docs": [
                {"code": "BANK_STMT", "title_tr": "Banka ekstreleri (tüm 102 alt hesaplar, dönem)"},
                {"code": "IBAN_LIST", "title_tr": "IBAN/hesap listesi (banka bazında)"},
                {"code": "POS_STMT", "title_tr": "POS/virtual POS ekstreleri (varsa)"},
            ],
            "actions_tr": [
                "Mizan 102.xx alt hesaplarını banka/IBAN bazında doğrula; her alt hesap için en az bir ekstre dosyası olmalı.",
                "Dosya ad standardı: '102.xx BANKA AY.csv' (örn: '102.04 HALKBANK 4-5-6.csv').",
                "Çeyrek dışı (seçili dönem dışı) satır içeren ekstre dosyalarını ayır; sistem bu satırları metriklere dahil etmez.",
                "Eksik görünen alt hesaplar için ilgili bankadan dönem ekstrelerini iste; POS hesaplarını ayrıca teyit et.",
            ],
            "evidence_refs": evidence_102,
            "missing_docs": missing_docs_102,
        },
    ]

    # --- Sprint-4: Axis D item schema normalization (stable render) ---
    AXIS_D_ITEM_FIELDS = [
        'id','account_prefix','title_tr','severity','finding_tr',
        'top_accounts','required_docs','actions_tr','evidence_refs','missing_docs'
    ]
    for it in items:
        if not isinstance(it, dict):
            continue
        # defaults (UI stable; backend is source of truth)
        if it.get('severity') is None:
            it['severity'] = 'LOW'
        if it.get('finding_tr') is None:
            it['finding_tr'] = ''
        it.setdefault('top_accounts', [])
        it.setdefault('required_docs', [])
        it.setdefault('actions_tr', [])
        it.setdefault('evidence_refs', [])
        it.setdefault('missing_docs', [])
        # normalize None -> []
        for k in ('top_accounts','required_docs','actions_tr','evidence_refs','missing_docs'):
            if it.get(k) is None:
                it[k] = []

    return {
        "axis": "D",
        "title_tr": "Mizan İncelemesi (Kritik Eksen)",
        "schema": {"version": "axis_d_s4_v2", "item_fields": AXIS_D_ITEM_FIELDS},
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
        try:
            return build_axis_d_contract_mizan_only(BASE, smmm, client, period)
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Axis D contract failed: {e}")

# v61: trimmed legacy dead code after delegation to build_axis_d_contract_mizan_only
