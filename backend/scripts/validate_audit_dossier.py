#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple, Optional


def _die(msg: str) -> None:
    print(f"HATA: {msg}")
    sys.exit(1)


def _is_num(x: Any) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _require_keys(obj: Dict[str, Any], keys: List[str], ctx: str) -> None:
    for k in keys:
        if k not in obj:
            _die(f"{ctx}: eksik alan '{k}'")


def _require_str(obj: Dict[str, Any], k: str, ctx: str) -> None:
    if not isinstance(obj.get(k), str) or not obj.get(k):
        _die(f"{ctx}: '{k}' string olmalı ve boş olmamalı")


def _require_list_str(obj: Dict[str, Any], k: str, ctx: str) -> None:
    v = obj.get(k)
    if v is None:
        return
    if not isinstance(v, list) or any((not isinstance(x, str) or not x) for x in v):
        _die(f"{ctx}: '{k}' list[str] olmalı")


def _require_samples_counts(v: Any, ctx: str) -> None:
    if not isinstance(v, dict):
        _die(f"{ctx}: samples_counts dict olmalı")
    for kk in ("sales", "kdv"):
        if kk not in v:
            _die(f"{ctx}: samples_counts eksik '{kk}'")
        if not isinstance(v.get(kk), int):
            _die(f"{ctx}: samples_counts['{kk}'] int olmalı")


def _require_month_table(mt: Any, ctx: str) -> None:
    if not isinstance(mt, list) or len(mt) == 0:
        _die(f"{ctx}: month_table list ve boş olmayan olmalı")
    req = ["month", "kdv_matrah", "edefter_net_sales", "delta_net_minus_kdv", "ratio_net_over_kdv"]
    for i, row in enumerate(mt[:500]):
        if not isinstance(row, dict):
            _die(f"{ctx}: month_table[{i}] dict olmalı")
        for k in req:
            if k not in row:
                _die(f"{ctx}: month_table[{i}] eksik '{k}'")
        if not isinstance(row.get("month"), str) or not row["month"]:
            _die(f"{ctx}: month_table[{i}].month string olmalı")
        if not _is_num(row.get("kdv_matrah")):
            _die(f"{ctx}: month_table[{i}].kdv_matrah numeric olmalı")
        if not _is_num(row.get("edefter_net_sales")):
            _die(f"{ctx}: month_table[{i}].edefter_net_sales numeric olmalı")
        if not _is_num(row.get("delta_net_minus_kdv")):
            _die(f"{ctx}: month_table[{i}].delta_net_minus_kdv numeric olmalı")
        if not _is_num(row.get("ratio_net_over_kdv")):
            _die(f"{ctx}: month_table[{i}].ratio_net_over_kdv numeric olmalı")


def _find_risk(metrics: Dict[str, Any], code: str) -> Optional[Dict[str, Any]]:
    rules = (metrics.get("rules") or {}) if isinstance(metrics, dict) else {}
    risks = rules.get("risks") or []
    if not isinstance(risks, list):
        return None
    for r in risks:
        if isinstance(r, dict) and r.get("code") == code:
            return r
    return None


def main() -> None:
    if len(sys.argv) < 2:
        _die("kullanım: python scripts/validate_audit_dossier.py /tmp/risk_v1.json [R-501]")
    in_path = Path(sys.argv[1])
    code = sys.argv[2] if len(sys.argv) >= 3 else "R-501"

    d = json.loads(in_path.read_text(encoding="utf-8"))
    metrics = d.get("metrics") or {}
    r = _find_risk(metrics, code)
    if not r:
        _die(f"{code} risk bulunamadı")

    ed = r.get("evidence_details") or {}
    if not isinstance(ed, dict):
        _die(f"{code}: evidence_details dict olmalı")

    dossier = ed.get("audit_dossier")
    if not isinstance(dossier, dict):
        _die(f"{code}: evidence_details.audit_dossier dict olmalı")

    # Top-level required
    for k in ("version", "period", "risk_code", "title", "severity", "headline"):
        _require_str(dossier, k, f"{code}.audit_dossier")

    # Allow both styles:
    #  A) New style: dossier.evidence_pack exists (preferred)
    #  B) Legacy: samples_counts/worst_month/month_table directly on dossier
    pack = dossier.get("evidence_pack") if isinstance(dossier.get("evidence_pack"), dict) else None

    if pack is not None:
        # preferred
        _require_keys(pack, ["samples_counts", "worst_month", "month_table"], f"{code}.audit_dossier.evidence_pack")
        if not isinstance(pack.get("worst_month"), str) or not pack["worst_month"]:
            _die(f"{code}: evidence_pack.worst_month string olmalı")
        _require_samples_counts(pack.get("samples_counts"), f"{code}.audit_dossier.evidence_pack")
        _require_month_table(pack.get("month_table"), f"{code}.audit_dossier.evidence_pack")
    else:
        # legacy compatibility
        _require_keys(dossier, ["samples_counts", "worst_month", "month_table"], f"{code}.audit_dossier")
        if not isinstance(dossier.get("worst_month"), str) or not dossier["worst_month"]:
            _die(f"{code}: audit_dossier.worst_month string olmalı")
        _require_samples_counts(dossier.get("samples_counts"), f"{code}.audit_dossier")
        _require_month_table(dossier.get("month_table"), f"{code}.audit_dossier")

    # Optional: reconciliation_plan
    _require_list_str(dossier, "reconciliation_plan", f"{code}.audit_dossier")

    print(f"OK: {code} audit_dossier schema PASS")
    print("OK: version =", dossier.get("version"))
    if pack:
        sc = pack.get("samples_counts")
        print("OK: evidence_pack.samples_counts =", sc)
        print("OK: evidence_pack.month_table_rows =", len(pack.get("month_table") or []))


if __name__ == "__main__":
    main()
