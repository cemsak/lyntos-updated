import json
from pathlib import Path
from typing import Any, Dict, List, Optional


def _safe_get(obj: Any, path: List[str], default=None):
    cur = obj
    for key in path:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(key)
        if cur is None:
            return default
    return cur


def _read_json(p: Path) -> Dict[str, Any]:
    return json.loads(p.read_text(encoding="utf-8"))


def _write_json(p: Path, data: Any) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _extract_period_window(root: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    return root.get("period_window") or _safe_get(root, ["enriched_data", "period_window"]) or None


def _extract_data_quality(root: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    dq = root.get("data_quality") or _safe_get(root, ["enriched_data", "data_quality"]) or None

    # warnings bazen üstte, bazen dq.warnings'ta
    top_warn = root.get("warnings")
    if isinstance(dq, dict):
        if isinstance(top_warn, list) and top_warn:
            existing = dq.get("warnings")
            if isinstance(existing, list):
                dq["warnings"] = existing + [w for w in top_warn if w not in existing]
            else:
                dq["warnings"] = top_warn
    return dq


def _extract_risks(root: Dict[str, Any]) -> List[Dict[str, Any]]:
    # canonical
    r = _safe_get(root, ["metrics", "rules", "risks"], default=None)
    if isinstance(r, list):
        return r
    # fallback
    r = _safe_get(root, ["metrics", "rules", "findings"], default=None)
    if isinstance(r, list):
        return r
    return []


def _risk_code(r: Dict[str, Any]) -> str:
    return str(r.get("code") or r.get("rule_id") or "").strip()


def export_contracts(risk_json_path: Path, outdir: Path) -> None:
    root = _read_json(risk_json_path)

    period_window = _extract_period_window(root)
    data_quality = _extract_data_quality(root)
    warnings = None
    if isinstance(data_quality, dict) and isinstance(data_quality.get("warnings"), list):
        warnings = data_quality.get("warnings")

    risks = _extract_risks(root)

    # 1) Portfolio (UI /v1)
    portfolio = {
        "kind": "portfolio_customer_summary",
        "period_window": period_window,
        "data_quality": data_quality,
        "warnings": warnings,
        "risks": [],
    }

    for r in risks:
        code = _risk_code(r)
        if not code:
            continue
        portfolio["risks"].append(
            {
                "code": code,
                "severity": r.get("severity"),
                "score": r.get("score"),
                "title_tr": r.get("title_tr") or r.get("title") or r.get("name"),
                "summary_tr": r.get("summary_tr") or r.get("summary"),
                # KURGAN sinyalleri (portfolio seviyesinde opsiyonel)
                "kurgan_criteria_signals": r.get("kurgan_criteria_signals"),
            }
        )

    _write_json(outdir / "portfolio_customer_summary.json", portfolio)

    # 2) MBR (UI /v1/mbr)
    mbr = {
        "kind": "mbr_view",
        "period_window": period_window,
        "data_quality": data_quality,
        "warnings": warnings,
        "metrics": root.get("metrics") or {},
        "scores": root.get("scores") or {},
        "risks": portfolio["risks"],
    }
    _write_json(outdir / "mbr_view.json", mbr)

    # 3) Risk details (UI /v1/risks/[code])
    risks_dir = outdir / "risks"
    for r in risks:
        code = _risk_code(r)
        if not code:
            continue

        payload = {
            "kind": "risk_detail",
            "code": code,
            "period_window": period_window,
            "data_quality": data_quality,
            "warnings": warnings,
            # risk objesi (bozmadan)
            **r,
            # garanti: sinyaller üstte de bulunsun
            "kurgan_criteria_signals": r.get("kurgan_criteria_signals"),
        }
        _write_json(risks_dir / f"risk_detail_{code}.json", payload)

    print(f"OK: contracts exported -> {outdir}")


def main():
    import sys

    if len(sys.argv) < 2:
        print("Usage: python3 scripts/export_frontend_contracts.py <risk_json_path> [outdir]")
        raise SystemExit(2)

    risk_json = Path(sys.argv[1]).resolve()

    # default outdir: backend/docs/contracts (senin API endpoint'lerin buradan servis ediyor)
    base = Path(__file__).resolve().parent.parent
    outdir = Path(sys.argv[2]).resolve() if len(sys.argv) >= 3 else (base / "docs" / "contracts")

    export_contracts(risk_json, outdir)


if __name__ == "__main__":
    main()
