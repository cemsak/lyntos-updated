from __future__ import annotations

import csv
import os
from dataclasses import dataclass
from datetime import date, datetime
from typing import Dict, List, Optional, Tuple, Any


# ----------------------------
# Period window (YYYY-Qn)
# ----------------------------
def period_to_window(period: str) -> Tuple[date, date]:
    # period: "2025-Q2"
    y_str, q_str = period.split("-Q")
    y = int(y_str)
    q = int(q_str)
    if q == 1:
        return date(y, 1, 1), date(y, 3, 31)
    if q == 2:
        return date(y, 4, 1), date(y, 6, 30)
    if q == 3:
        return date(y, 7, 1), date(y, 9, 30)
    if q == 4:
        return date(y, 10, 1), date(y, 12, 31)
    raise ValueError(f"Invalid period: {period}")


def _try_parse_date(s: str) -> Optional[date]:
    if s is None:
        return None
    s = str(s).strip()
    if not s:
        return None

    # Common formats in TR bank exports
    fmts = [
        "%d.%m.%Y",
        "%d/%m/%Y",
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d.%m.%y",
        "%d/%m/%y",
    ]
    for fmt in fmts:
        try:
            return datetime.strptime(s, fmt).date()
        except Exception:
            pass

    # Sometimes date + time in same cell
    for sep in [" ", "T"]:
        if sep in s:
            left = s.split(sep, 1)[0].strip()
            for fmt in fmts:
                try:
                    return datetime.strptime(left, fmt).date()
                except Exception:
                    pass

    return None


def _sniff_delimiter(sample: str) -> str:
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=[",", ";", "\t", "|"])
        return dialect.delimiter
    except Exception:
        # fall back
        if sample.count(";") >= sample.count(","):
            return ";"
        return ","


def _detect_date_column(headers: List[str], rows: List[List[str]]) -> Optional[int]:
    if not headers:
        return None
    # Prefer obvious names
    candidates = []
    for i, h in enumerate(headers):
        h2 = (h or "").lower()
        if "tarih" in h2 or "date" in h2:
            candidates.append(i)
    # If none, try all columns
    if not candidates:
        candidates = list(range(len(headers)))

    best_i = None
    best_hits = -1
    for i in candidates:
        hits = 0
        for r in rows:
            if i < len(r) and _try_parse_date(r[i]) is not None:
                hits += 1
        if hits > best_hits:
            best_hits = hits
            best_i = i

    if best_hits <= 0:
        return None
    return best_i


@dataclass
class BankScanResult:
    total_rows: int
    in_period_rows: int
    out_of_period_rows: int
    out_of_period_files: List[str]


def scan_bank_raw_folder(raw_dir: str, start: date, end: date) -> BankScanResult:
    total = 0
    in_p = 0
    out_p = 0
    out_files: List[str] = []

    if not os.path.isdir(raw_dir):
        return BankScanResult(0, 0, 0, [])

    for fn in sorted(os.listdir(raw_dir)):
        if fn.startswith("._") or fn == ".DS_Store":
            continue
        if not fn.lower().endswith(".csv"):
            continue

        fp = os.path.join(raw_dir, fn)
        try:
            with open(fp, "r", encoding="utf-8-sig", errors="ignore") as f:
                sample = f.read(4096)
                delim = _sniff_delimiter(sample)
                f.seek(0)
                reader = csv.reader(f, delimiter=delim)

                headers = next(reader, [])
                # read a small chunk to detect date col
                peek_rows = []
                for _ in range(25):
                    r = next(reader, None)
                    if r is None:
                        break
                    peek_rows.append(r)

                date_col = _detect_date_column(headers, peek_rows)
                # count peek rows + rest
                all_rows_iter = peek_rows + list(reader)

                file_has_out = False
                for r in all_rows_iter:
                    if not r:
                        continue
                    total += 1
                    d = None
                    if date_col is not None and date_col < len(r):
                        d = _try_parse_date(r[date_col])
                    if d is None:
                        # unknown date -> treat as out_of_period for safety
                        out_p += 1
                        file_has_out = True
                        continue
                    if start <= d <= end:
                        in_p += 1
                    else:
                        out_p += 1
                        file_has_out = True

                if file_has_out:
                    out_files.append(fn)

        except Exception:
            # If file fails to parse, treat as out_of_period (data-quality warning)
            out_files.append(fn)

    return BankScanResult(total, in_p, out_p, out_files)


def attach_kurgan_layer(result: Dict[str, Any], base_dir: str, period: str) -> Dict[str, Any]:
    """
    Non-breaking enrichment:
    - Adds period_window, data_quality (if not present)
    - Adds kurgan_criteria_signals to findings (empty or minimal heuristic)
    """
    start, end = period_to_window(period)

    # Resolve ids (best-effort)
    smmm_id = result.get("smmm_id")
    client_id = result.get("client_id")

    # Sources present (best-effort)
    sources_present = []
    # these folders are based on your data.zip layout
    mizan_path = os.path.join(base_dir, "luca", str(smmm_id), str(client_id), period, "mizan.csv")
    edefter_dir = os.path.join(base_dir, "edefter", str(smmm_id), str(client_id), period)
    bank_raw_dir = os.path.join(base_dir, "banka", str(smmm_id), str(client_id), period, "_raw")

    if os.path.isfile(mizan_path):
        sources_present.append("MIZAN")
    if os.path.isdir(edefter_dir) and any(n.lower().endswith(".csv") for n in os.listdir(edefter_dir) if not n.startswith("._")):
        sources_present.append("EDEFTER")
    if os.path.isdir(bank_raw_dir) and any(n.lower().endswith(".csv") for n in os.listdir(bank_raw_dir) if not n.startswith("._")):
        sources_present.append("BANK")

    scan = scan_bank_raw_folder(bank_raw_dir, start, end)

    result.setdefault("period_window", {
        "period": period,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
    })

    dq = result.setdefault("data_quality", {})
    dq.setdefault("bank_rows_total", scan.total_rows)
    dq.setdefault("bank_rows_in_period", scan.in_period_rows)
    dq.setdefault("bank_rows_out_of_period", scan.out_of_period_rows)
    dq.setdefault("sources_present", sources_present)

    warnings = dq.setdefault("warnings", [])
    if scan.out_of_period_rows > 0:
        warnings.append("Banka verilerinde seçili çeyrek dışı satırlar bulundu; metriklere dahil edilmedi.")
    if scan.out_of_period_files:
        # keep it short, don't spam UI
        warnings.append(f"Çeyrek dışı satır içeren banka dosyaları tespit edildi (örnek): {scan.out_of_period_files[:3]}")

    # Add kurgan_criteria_signals (minimal heuristic mapping)
    findings = result.get("rules") or result.get("findings")
    if isinstance(findings, list):
        for f in findings:
            if not isinstance(f, dict):
                continue
            f.setdefault("kurgan_criteria_signals", [])

            rule_id = str(f.get("rule_id") or f.get("id") or "")
            # Only add if empty (avoid overwriting future logic)
            if f["kurgan_criteria_signals"]:
                continue

            # Heuristic:
            # R-401* -> KRG-11 (Ödeme)
            # R-501* -> KRG-02 (Oranlama)
            if rule_id.startswith("R-401"):
                f["kurgan_criteria_signals"].append({
                    "code": "KRG-11",
                    "status": "MISSING" if scan.in_period_rows == 0 else "WARN",
                    "score": 30 if scan.in_period_rows == 0 else 55,
                    "weight": 0.14,
                    "rationale_tr": "Ödeme/finansal hareket kanıtı için ilgili dönem banka hareketlerinin kapsamı eksik veya eşleştirme için yetersiz.",
                    "evidence_refs": [],
                    "missing_refs": [{
                        "code": "BANK_STATEMENT",
                        "title_tr": "İlgili 102 alt hesabı için banka ekstresi",
                        "severity": "MEDIUM",
                        "how_to_fix_tr": "Seçili çeyreği (Q) kapsayan banka hareket dökümünü ekleyin; Q dışındaki satırlar otomatik filtrelenir."
                    }]
                })
            elif rule_id.startswith("R-501"):
                f["kurgan_criteria_signals"].append({
                    "code": "KRG-02",
                    "status": "WARN",
                    "score": 60,
                    "weight": 0.08,
                    "rationale_tr": "Oranlama/tutarlılık açısından (matrah-KDV-satış) çeyrek içinde anlamlı sapma olabilir; detay eşleştirme ile doğrulayın.",
                    "evidence_refs": [],
                    "missing_refs": []
                })

    return result
