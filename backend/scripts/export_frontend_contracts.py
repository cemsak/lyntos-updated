#!/usr/bin/env python3
from __future__ import annotations
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

def _find_risk(metrics: Dict[str, Any], code: str) -> Optional[Dict[str, Any]]:
    rules = metrics.get("rules") or {}
    risks = rules.get("risks") or []
    if not isinstance(risks, list):
        return None
    for r in risks:
        if isinstance(r, dict) and r.get("code") == code:
            return r
    return None

def _safe_get(d: Dict[str, Any], path: List[str], default=None):
    cur: Any = d
    for k in path:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k)
    return cur if cur is not None else default

def main() -> None:
    if len(sys.argv) < 2:
        print("kullanım: python scripts/export_frontend_contracts.py /tmp/risk_v1.json")
        sys.exit(1)

    in_path = Path(sys.argv[1])
    out_dir = Path("docs/contracts")
    out_dir.mkdir(parents=True, exist_ok=True)

    data = json.loads(in_path.read_text(encoding="utf-8"))
    metrics = data.get("metrics") or {}
    rules = (metrics.get("rules") or {}) if isinstance(metrics, dict) else {}
    risks = rules.get("risks") or []

    smmm_id = (data.get("smmm_id") or "").strip()
    client_id = (data.get("client_id") or "").strip()
    period = (data.get("period") or "").strip()

    # 1) Portfolio summary (list item DTO)
    # Not: Şimdilik tek müşteri üzerinden örnekliyoruz; frontend listesi bunu çoğaltacak.
    portfolio_item = {
        "client_id": client_id,
        "client_title": client_id,   # ileride ticaret ünvanı vs
        "period": period,
        "score": _safe_get(metrics, ["scoring", "overall_score"], None),
        "risk_count": len([r for r in risks if isinstance(r, dict)]),
        "critical_risks": [
            {
                "code": r.get("code"),
                "severity": r.get("severity"),
                "title": r.get("title"),
            }
            for r in risks[:3] if isinstance(r, dict)
        ],
        "data_coverage": {
            "has_banka": bool(_safe_get(metrics, ["banka"], None)),
            "has_edefter": bool(_safe_get(metrics, ["edefter"], None)),
            "has_beyanname": bool(_safe_get(metrics, ["beyanname"], None)),
            "has_mizan": bool(_safe_get(metrics, ["mizan"], None)),
        }
    }

    (out_dir / "portfolio_customer_summary.json").write_text(
        json.dumps(portfolio_item, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    # 2) MBR view (müşteri detay ekranı DTO)
    mbr = {
        "smmm_id": smmm_id,
        "client_id": client_id,
        "period": period,
        "summary": {
            "score": _safe_get(metrics, ["scoring", "overall_score"], None),
            "risk_count": len([r for r in risks if isinstance(r, dict)]),
            "risk_codes": [r.get("code") for r in risks if isinstance(r, dict)],
        },
        "tabs": {
            "beyanname": _safe_get(metrics, ["beyanname"], {}),
            "edefter": _safe_get(metrics, ["edefter"], {}),
            "banka": _safe_get(metrics, ["banka"], {}),
            "mizan": _safe_get(metrics, ["mizan"], {}),
        },
        "risk_scenarios": [
            {
                "code": r.get("code"),
                "severity": r.get("severity"),
                "title": r.get("title"),
                "value_found": r.get("value_found"),
                "evidence_details": r.get("evidence_details"),
                "actions": r.get("actions") or r.get("SMMM_actions"),
                "checklist": r.get("checklist"),
            }
            for r in risks if isinstance(r, dict)
        ]
    }
    (out_dir / "mbr_view.json").write_text(
        json.dumps(mbr, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    # 3) Risk detail DTO (tek risk sayfası)
    # R-401A ve R-501 örneğini ayrı yaz
    for code in ("R-401A", "R-501"):
        r = _find_risk(metrics, code)
        if not r:
            continue
        detail = {
            "smmm_id": smmm_id,
            "client_id": client_id,
            "period": period,
            "risk": {
                "code": r.get("code"),
                "severity": r.get("severity"),
                "title": r.get("title"),
                "rule_logic": (r.get("evidence_details") or {}).get("rule_logic"),
                "note": (r.get("evidence_details") or {}).get("note"),
                "value_found": r.get("value_found"),
                "evidence_details": r.get("evidence_details"),
                "actions": r.get("actions") or r.get("SMMM_actions"),
                "checklist": r.get("checklist"),
            },
            "downloads": {
                "pdf_latest": str(sorted(Path("out").glob("LYNTOS_DOSSIER_*.pdf"), key=lambda p: p.stat().st_mtime, reverse=True)[0]) if list(Path("out").glob("LYNTOS_DOSSIER_*.pdf")) else None,
                "bundle_latest": str(sorted(Path("out").glob("LYNTOS_DOSSIER_*_BUNDLE.zip"), key=lambda p: p.stat().st_mtime, reverse=True)[0]) if list(Path("out").glob("LYNTOS_DOSSIER_*_BUNDLE.zip")) else None,
            }
        }
        (out_dir / f"risk_detail_{code}.json").write_text(
            json.dumps(detail, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )

    # ayrıca /tmp içine kopya
    tmp_dir = Path("/tmp/lyntos_contracts")
    tmp_dir.mkdir(parents=True, exist_ok=True)
    for fp in out_dir.glob("*.json"):
        tmp_dir.joinpath(fp.name).write_text(fp.read_text(encoding="utf-8"), encoding="utf-8")

    print("OK: contracts exported -> docs/contracts/ and /tmp/lyntos_contracts")
    print("OK: files:", ", ".join(sorted([p.name for p in out_dir.glob('*.json')])))

if __name__ == "__main__":
    main()
