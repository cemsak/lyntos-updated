#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from datetime import datetime, date
from pathlib import Path
from typing import Optional, Iterable, Tuple, List, Dict, Any, Set


DATE_FORMATS = [
    "%d.%m.%Y",
    "%d/%m/%Y",
    "%Y-%m-%d",
    "%d-%m-%Y",
]


def parse_date_any(s: str) -> Optional[date]:
    s = (s or "").strip()
    if not s:
        return None
    # Bazı CSV'lerde "01.04.2025 00:00" gibi gelebiliyor
    s = s.split(" ")[0].strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date()
        except Exception:
            continue
    return None


def detect_delimiter(sample: str) -> str:
    # Basit ama pratik
    if sample.count(";") > sample.count(","):
        return ";"
    return ","


def quarter_months(period: str) -> Optional[List[int]]:
    # "2025-Q2" -> [4,5,6]
    try:
        y, q = period.split("-Q")
        qn = int(q)
        if qn not in (1, 2, 3, 4):
            return None
        start = (qn - 1) * 3 + 1
        return [start, start + 1, start + 2]
    except Exception:
        return None


@dataclass
class ParseIssue:
    file: str
    raw_value: str
    row_index: int


def find_date_column(fieldnames: List[str]) -> Optional[str]:
    if not fieldnames:
        return None
    # "tarih", "Tarih", "İşlem Tarihi" vb.
    for f in fieldnames:
        if "tarih" in (f or "").lower():
            return f
    return fieldnames[0]  # fallback: ilk kolon


def scan_csv_dates(csv_path: Path) -> Tuple[List[date], List[ParseIssue], int]:
    issues: List[ParseIssue] = []
    parsed: List[date] = []
    row_count = 0

    with csv_path.open("r", encoding="utf-8-sig", errors="replace", newline="") as f:
        sample = f.read(4096)
        f.seek(0)
        delim = detect_delimiter(sample)

        reader = csv.DictReader(f, delimiter=delim)
        date_col = find_date_column(reader.fieldnames or [])
        if not date_col:
            return parsed, issues, row_count

        for idx, row in enumerate(reader, start=2):  # header=1
            row_count += 1
            raw = (row.get(date_col) or "").strip()
            d = parse_date_any(raw)
            if d is None and raw:
                issues.append(ParseIssue(csv_path.name, raw, idx))
            elif d is not None:
                parsed.append(d)

    return parsed, issues, row_count


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="data", help="data kök klasörü (default: data)")
    ap.add_argument("--smmm", required=True, help="SMMM id (örn: HKOZKAN)")
    ap.add_argument("--client", required=True, help="Client id (örn: OZKAN_KIRTASIYE)")
    ap.add_argument("--period", required=True, help="Dönem (örn: 2025-Q2)")
    ap.add_argument("--folder", default=None, help="Doğrudan banka klasörü (override)")
    args = ap.parse_args()

    if args.folder:
        folder = Path(args.folder)
    else:
        folder = Path(args.base) / "banka" / args.smmm / args.client / args.period

    if not folder.exists():
        raise SystemExit(f"ERROR: Banka klasörü yok: {folder}")

    csv_files = sorted(folder.glob("*.csv"))
    if not csv_files:
        raise SystemExit(f"ERROR: CSV bulunamadı: {folder}")

    all_dates: List[date] = []
    all_issues: List[ParseIssue] = []
    total_rows = 0

    for fp in csv_files:
        dates, issues, rc = scan_csv_dates(fp)
        all_dates.extend(dates)
        all_issues.extend(issues)
        total_rows += rc

    if not all_dates:
        print("WARNING: Hiç tarih parse edilemedi. Kolon adı/format kontrol edin.")
        print("files =", len(csv_files), "rows =", total_rows, "issues =", len(all_issues))
        return

    min_d = min(all_dates)
    max_d = max(all_dates)

    months_present: Set[Tuple[int, int]] = {(d.year, d.month) for d in all_dates}
    months_sorted = sorted(months_present)

    print("\n=== BANK DATA RANGE CHECK ===")
    print("folder         =", str(folder))
    print("files_scanned   =", len(csv_files))
    print("rows_scanned    =", total_rows)
    print("parsed_dates    =", len(all_dates))
    print("min_date        =", min_d.isoformat())
    print("max_date        =", max_d.isoformat())
    print("months_present  =", months_sorted)
    print()

    exp_months = quarter_months(args.period)
    if exp_months is None:
        print(f"NOTE: period parse edilemedi ({args.period}). Beklenen ay kontrolü atlandı.")
    else:
        year = int(args.period.split("-Q")[0])
        expected = {(year, m) for m in exp_months}
        missing = sorted(expected - months_present)
        extra = sorted(months_present - expected)

        if missing:
            print(f"WARNING: Expected months missing for {args.period}: {missing}")
        else:
            print(f"OK: All expected months are present for {args.period}.")

        if extra:
            print(f"NOTE: Extra months found (outside {args.period}): {extra}")

    if all_issues:
        print("\n=== DATE PARSE ISSUES (sample) ===")
        print("issue_count =", len(all_issues))
        for it in all_issues[:20]:
            print(f"- file={it.file} row={it.row_index} value={it.raw_value!r}")
        if len(all_issues) > 20:
            print(f"... +{len(all_issues)-20} more")
    else:
        print("\nOK: No date parse issues.")

    print("\nDONE.")


if __name__ == "__main__":
    main()
