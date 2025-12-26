import argparse
import json
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Dict, Any, Optional

SMOKETEST_TOKEN = "__SMOKETEST_"

@dataclass
class CheckItem:
    key: str
    status: str
    detail: str

@dataclass
class PeriodReport:
    smmm: str
    client: str
    period: str
    overall: str
    items: List[CheckItem]
    missing_paths: List[str]
    warn_paths: List[str]
    notes: List[str]

def _is_smoketest_path(p: Path) -> bool:
    return any(SMOKETEST_TOKEN in part for part in p.parts)

def _exists_file(p: Path) -> bool:
    return p.exists() and p.is_file() and (not _is_smoketest_path(p))

def _safe_glob_count(root: Path, pattern: str) -> int:
    if not root.exists():
        return 0
    c = 0
    for x in root.glob(pattern):
        if _is_smoketest_path(x):
            continue
        if x.is_file():
            c += 1
    return c

def _raw_dir_has_any_files(raw_dir: Path) -> bool:
    if not raw_dir.exists() or not raw_dir.is_dir():
        return False
    for x in raw_dir.rglob("*"):
        if _is_smoketest_path(x):
            continue
        if x.is_file():
            return True
    return False

def validate_one(base_dir: Path, smmm: str, client: str, period: str, check_optional: bool) -> PeriodReport:
    items: List[CheckItem] = []
    missing: List[str] = []
    warns: List[str] = []
    notes: List[str] = []

    luca_mizan = base_dir / "data" / "luca" / smmm / client / period / "_raw" / "mizan_base.csv"
    if _exists_file(luca_mizan):
        items.append(CheckItem("luca_mizan_base", "OK", str(luca_mizan)))
    else:
        items.append(CheckItem("luca_mizan_base", "MISSING", str(luca_mizan)))
        missing.append(str(luca_mizan))

    bank_raw = base_dir / "data" / "banka" / smmm / client / period / "_raw"
    bank_count = _safe_glob_count(bank_raw, "*.csv")
    if bank_count > 0:
        items.append(CheckItem("bank_csv_count", "OK", f"{bank_count} csv in {bank_raw}"))
    else:
        items.append(CheckItem("bank_csv_count", "WARN", f"0 csv in {bank_raw}"))
        warns.append(str(bank_raw))

    if check_optional:
        edefter_raw = base_dir / "data" / "edefter" / smmm / client / period / "_raw"
        if _raw_dir_has_any_files(edefter_raw):
            items.append(CheckItem("edefter_raw_present", "OK", str(edefter_raw)))
        else:
            items.append(CheckItem("edefter_raw_present", "WARN", f"no files under {edefter_raw}"))
            warns.append(str(edefter_raw))

        yevmiye_raw = base_dir / "data" / "yevmiye" / smmm / client / period / "_raw"
        if _raw_dir_has_any_files(yevmiye_raw):
            items.append(CheckItem("yevmiye_raw_present", "OK", str(yevmiye_raw)))
        else:
            items.append(CheckItem("yevmiye_raw_present", "WARN", f"no files under {yevmiye_raw}"))
            warns.append(str(yevmiye_raw))

    overall = "OK"
    if any(i.status == "MISSING" for i in items):
        overall = "MISSING"
    elif any(i.status == "WARN" for i in items):
        overall = "WARN"

    notes.append(f"smoketest_guard={SMOKETEST_TOKEN} ignored")
    return PeriodReport(
        smmm=smmm,
        client=client,
        period=period,
        overall=overall,
        items=items,
        missing_paths=missing,
        warn_paths=warns,
        notes=notes,
    )

def _parse_periods(args: argparse.Namespace) -> List[str]:
    periods: List[str] = []
    if args.period:
        periods.extend(args.period)
    if args.periods_csv:
        for p in args.periods_csv.split(","):
            p = p.strip()
            if p:
                periods.append(p)
    uniq: List[str] = []
    seen = set()
    for p in periods:
        if p not in seen:
            uniq.append(p)
            seen.add(p)
    return uniq

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--smmm", required=True)
    ap.add_argument("--client", required=True)
    ap.add_argument("--period", action="append")
    ap.add_argument("--periods-csv", dest="periods_csv")
    ap.add_argument("--base-dir", default=".")
    ap.add_argument("--check-optional", action="store_true")
    ap.add_argument("--json-out")
    args = ap.parse_args()

    periods = _parse_periods(args)
    if not periods:
        print("ERROR: at least one --period or --periods-csv is required", file=sys.stderr)
        return 1

    base_dir = Path(args.base_dir).resolve()
    reports: List[PeriodReport] = []
    for period in periods:
        reports.append(validate_one(base_dir, args.smmm, args.client, period, args.check_optional))

    payload: Dict[str, Any] = {
        "ok": all(r.overall != "MISSING" for r in reports),
        "smmm": args.smmm,
        "client": args.client,
        "reports": [
            {**asdict(r), "items": [asdict(i) for i in r.items]}
            for r in reports
        ],
    }

    for r in reports:
        print(f"{r.period} => {r.overall}")
        for i in r.items:
            print(f"  {i.status:<7} {i.key:<22} {i.detail}")
        if r.missing_paths:
            print("  missing_paths:")
            for p in r.missing_paths:
                print(f"    {p}")
        if r.warn_paths:
            print("  warn_paths:")
            for p in r.warn_paths:
                print(f"    {p}")

    if args.json_out:
        outp = Path(args.json_out).resolve()
        outp.parent.mkdir(parents=True, exist_ok=True)
        outp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"json_out => {outp}")

    return 0 if payload["ok"] else 2

if __name__ == "__main__":
    raise SystemExit(main())
