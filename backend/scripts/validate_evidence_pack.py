#!/usr/bin/env python3
from __future__ import annotations
import json, sys
from pathlib import Path
from typing import Any, Dict, Optional

def die(msg: str) -> None:
    print("HATA:", msg)
    sys.exit(1)

def find_risk(metrics: Dict[str, Any], code: str) -> Optional[Dict[str, Any]]:
    rules = metrics.get("rules") or {}
    risks = rules.get("risks") or []
    if not isinstance(risks, list):
        return None
    for r in risks:
        if isinstance(r, dict) and r.get("code") == code:
            return r
    return None

def main() -> None:
    if len(sys.argv) < 3:
        die("kullanım: python scripts/validate_evidence_pack.py /tmp/risk_v1.json R-401A")
    p = Path(sys.argv[1])
    code = sys.argv[2]
    d = json.loads(p.read_text(encoding="utf-8"))
    metrics = d.get("metrics") or {}
    r = find_risk(metrics, code)
    if not r:
        die(f"{code} risk bulunamadı")

    ed = r.get("evidence_details") or {}
    if not isinstance(ed, dict):
        die(f"{code}: evidence_details dict olmalı")

    pack = ed.get("evidence_pack")
    if not isinstance(pack, dict):
        die(f"{code}: evidence_pack dict olmalı")

    # required
    for k in ("summary", "recommended_files", "checklist"):
        if k not in pack:
            die(f"{code}: evidence_pack eksik '{k}'")

    if not isinstance(pack.get("summary"), str) or not pack["summary"]:
        die(f"{code}: summary string olmalı")

    if not isinstance(pack.get("recommended_files"), list):
        die(f"{code}: recommended_files list olmalı")

    if not isinstance(pack.get("checklist"), list):
        die(f"{code}: checklist list olmalı")

    # optional missing_102_details list
    if "missing_102_details" in pack and not isinstance(pack["missing_102_details"], list):
        die(f"{code}: missing_102_details list olmalı")

    print(f"OK: {code} evidence_pack PASS")
    print("OK: recommended_files_count =", len(pack.get("recommended_files") or []))
    print("OK: checklist_count =", len(pack.get("checklist") or []))
    if "missing_102_details" in pack:
        print("OK: missing_102_details_count =", len(pack.get("missing_102_details") or []))

if __name__ == "__main__":
    main()
