import argparse
import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime


# BEGIN S10_RISKDETAIL_ANALYSIS_ATTACH
def _s10_now_z() -> str:
    try:
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    except Exception:
        from datetime import datetime
        return datetime.utcnow().replace(microsecond=0).isoformat() + 'Z'

def _s10_harden_analysis_schema(a: dict, ctx: dict) -> dict:
    # schema-locked, fail-soft: always returns {expert:{...}, ai:{...}}
    if not isinstance(a, dict):
        a = {}
    expert = a.get('expert') if isinstance(a.get('expert'), dict) else {}
    ai = a.get('ai') if isinstance(a.get('ai'), dict) else {}

    ts = _s10_now_z()
    if not isinstance(expert.get('version'), str) or not expert.get('version'):
        expert['version'] = 'v1'
    if not isinstance(expert.get('generated_at'), str) or not expert.get('generated_at'):
        expert['generated_at'] = ts
    if not isinstance(expert.get('summary_tr'), str) or not expert.get('summary_tr'):
        expert['summary_tr'] = 'Uzman blok deterministiktir; kanıt yoksa iddia üretmez (fail-soft).'
    if not isinstance(expert.get('legal_basis'), list):
        expert['legal_basis'] = []
    if not isinstance(expert.get('evidence_refs'), list):
        expert['evidence_refs'] = []
    if not isinstance(expert.get('checks'), list):
        expert['checks'] = []

    if not isinstance(ai.get('confidence'), (int, float)):
        ai['confidence'] = 0.35
    if not isinstance(ai.get('disclaimer_tr'), str) or not ai.get('disclaimer_tr'):
        ai['disclaimer_tr'] = 'UYARI: AI bloğu yalnız öneri üretir; nihai görüş expert bloktadır.'
    if not isinstance(ai.get('evidence_refs'), list):
        ai['evidence_refs'] = []
    if not isinstance(ai.get('items'), list):
        ai['items'] = []

    # Minimal deterministic checks if empty
    if not expert['checks']:
        smmm = str(ctx.get('smmm') or '').strip()
        client = str(ctx.get('client') or '').strip()
        period = str(ctx.get('period') or '').strip()
        expert['checks'] = [
            {
                'id': 'CTX',
                'title_tr': 'Bağlam Parametreleri (SMMM/Mükellef/Dönem)',
                'status': 'ok' if (smmm and client and period) else 'missing',
                'severity': 'LOW',
                'detail_tr': ('smmm=' + smmm + ' | client=' + client + ' | period=' + period) if (smmm and client and period) else 'Eksik bağlam parametresi; UI fail-soft çalışır ancak doğrulama zayıflar.',
                'evidence_refs': [],
            }
        ]

    return {'expert': expert, 'ai': ai}

def _s10_attach_analysis_to_risk_contracts(contracts_dir: Path, smmm: str, client: str, period: str) -> None:
    import json
    risks_dir = contracts_dir / 'risks'
    files = []
    files.extend(sorted(contracts_dir.glob('risk_detail_*.json')))
    if risks_dir.exists():
        files.extend(sorted(risks_dir.glob('risk_detail_*.json')))
    if not files:
        print('WARN: S10 attach: no risk_detail_*.json under', contracts_dir)
        return

    changed = 0
    ctx = {'smmm': smmm, 'client': client, 'period': period}
    for p in files:
        try:
            d = json.loads(p.read_text(encoding='utf-8'))
        except Exception as e:
            print('WARN: S10 attach: bad json ->', p.name, e)
            continue
        if not isinstance(d, dict):
            continue

        # schema meta (award-ready, not breaking)
        sc = d.get('schema') if isinstance(d.get('schema'), dict) else {}
        if not sc.get('name'):
            sc['name'] = 'risk_detail'
        if not sc.get('version'):
            sc['version'] = 'v1.0'
        if not sc.get('generated_at'):
            sc['generated_at'] = _s10_now_z()
        d['schema'] = sc

        a0 = d.get('analysis') if isinstance(d.get('analysis'), dict) else {}
        a1 = _s10_harden_analysis_schema(a0, ctx)

        # light evidence seed (only if empty): use first data_quality warning
        try:
            exp = a1.get('expert') or {}
            if isinstance(exp, dict) and isinstance(exp.get('evidence_refs'), list) and not exp['evidence_refs']:
                dq = d.get('data_quality') if isinstance(d.get('data_quality'), dict) else {}
                warns = dq.get('warnings') if isinstance(dq.get('warnings'), list) else []
                if warns and isinstance(warns[0], str) and warns[0].strip():
                    exp['evidence_refs'] = [{'source': 'DATA_QUALITY', 'note_tr': warns[0].strip()}]
                    a1['expert'] = exp
        except Exception:
            pass

        if d.get('analysis') != a1:
            d['analysis'] = a1
            try:
                p.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding='utf-8')
                changed += 1
            except Exception as e:
                print('WARN: S10 attach: cannot write ->', p.name, e)

    print('OK: S10 risk detail analysis attached ->', changed)
# END S10_RISKDETAIL_ANALYSIS_ATTACH

def run(cmd, cwd=None):
    print(">>", " ".join(cmd))
    r = subprocess.run(cmd, cwd=cwd)
    if r.returncode != 0:
        raise SystemExit(f"ERROR: command failed ({r.returncode})")


def newest_tmp(pattern: str) -> Path:
    cands = sorted(Path("/tmp").glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    if not cands:
        raise SystemExit(f"ERROR: /tmp altında {pattern} bulunamadı.")
    return cands[0]


def sanity_contracts(contracts_dir: Path, require_signals: bool = True) -> None:
    p = contracts_dir / "portfolio_customer_summary.json"
    if not p.exists():
        raise SystemExit(f"ERROR: contract missing -> {p}")

    d = json.loads(p.read_text(encoding="utf-8"))
    pw = d.get("period_window")
    dq = d.get("data_quality")
    if not pw or not dq:
        raise SystemExit("ERROR: portfolio_customer_summary.json içinde period_window/data_quality yok.")

    risks = d.get("risks") or []
    code = None
    for r in risks:
        if str(r.get("code", "")).upper() == "R-401A":
            code = "R-401A"
            break
    if not code and risks:
        code = str(risks[0].get("code") or "").strip()

    if code:
        rd = contracts_dir / "risks" / f"risk_detail_{code}.json"
        if not rd.exists():
            rd = contracts_dir / f"risk_detail_{code}.json"
        if not rd.exists():
            raise SystemExit(f"ERROR: risk detail contract missing -> {rd}")
        rdd = json.loads(rd.read_text(encoding="utf-8"))
        if not rdd.get("period_window") or not rdd.get("data_quality"):
            raise SystemExit("ERROR: risk_detail içinde period_window/data_quality yok.")
        if require_signals and not rdd.get("kurgan_criteria_signals"):
            print("WARN: kurgan_criteria_signals boş görünüyor (risk:", code, ")")

    print("OK: contracts sanity passed")


def _write_axisd_actions_md(manifest: dict) -> str:
    out = []
    out.append("# LYNTOS — Axis D Aksiyon Planı (SMMM Checklist)\n")
    sections = manifest.get("sections") or []
    axis = next((x for x in sections if (x or {}).get("id") == "AXIS_D"), None) or {}
    items = axis.get("items") or []
    for it in items:
        if not isinstance(it, dict):
            continue
        out.append(f"## {it.get('id','(no-id)')} — {it.get('title_tr','')}".rstrip() + "\n")
        sev = it.get("severity")
        if sev:
            out.append(f"- **Severity:** {sev}\n")
        finding = (it.get("finding_tr") or "").strip()
        if finding:
            out.append(f"- **Bulgu:** {finding}\n")
        actions = it.get("actions_tr") or []
        if actions:
            out.append("\n**Aksiyonlar:**\n")
            for a in actions:
                out.append(f"- {str(a).strip()}\n")
        req = it.get("required_docs") or []
        if req:
            out.append("\n**Gerekli Belgeler:**\n")
            for d in req:
                if isinstance(d, dict):
                    out.append(f"- {d.get('code','')}: {d.get('title_tr','')}".rstrip() + "\n")
        miss = it.get("missing_docs") or []
        if miss:
            out.append("\n**Eksik Belgeler:**\n")
            for d in miss:
                if isinstance(d, dict):
                    out.append(f"- {d.get('code','')}: {d.get('title_tr','')}".rstrip() + "\n")
        out.append("\n")
    return "".join(out)


def _augment_bundle_zip(bundle_path: Path, base_url: str, smmm: str, client: str, period: str):
    import zipfile
    import urllib.request

    url = f"{base_url.rstrip('/')}/api/v1/contracts/dossier/manifest?smmm={smmm}&client={client}&period={period}"
    with urllib.request.urlopen(url) as r:
        manifest = json.loads(r.read().decode("utf-8"))

    checklist = manifest.get("checklist") or {}
    required_docs = checklist.get("required_docs") or []
    missing_docs = checklist.get("missing_docs") or []
    actions_md = _write_axisd_actions_md(manifest)

    with zipfile.ZipFile(bundle_path, "a", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("contracts/dossier_manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
        z.writestr("dossier/CHECKLIST_REQUIRED_DOCS.json", json.dumps(required_docs, ensure_ascii=False, indent=2))
        z.writestr("dossier/CHECKLIST_MISSING_DOCS.json", json.dumps(missing_docs, ensure_ascii=False, indent=2))
        z.writestr("dossier/ACTIONS_AXIS_D.md", actions_md)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--smmm", required=True)
    ap.add_argument("--client", required=True)
    ap.add_argument("--period", required=True)
    ap.add_argument("--backend_port", default="8000")
    ap.add_argument("--base_url", default=None)
    ap.add_argument("--contracts_dir", default="docs/contracts")
    ap.add_argument("--outdir", default="out")
    args = ap.parse_args()

    base = Path(".").resolve()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    risk_json = Path(f"/tmp/risk_v1_{args.client}_{args.period}_{ts}.json")
    cmd_with_out = [sys.executable, "scripts/test_risk_model_v1.py",
                    "--smmm", args.smmm, "--client", args.client, "--period", args.period,
                    "--out", str(risk_json)]
    try:
        run(cmd_with_out)
    except SystemExit:
        pass

    if not risk_json.exists():
        cmd_stdout = [sys.executable, "scripts/test_risk_model_v1.py",
                      "--smmm", args.smmm, "--client", args.client, "--period", args.period]
        print(">> (fallback) writing stdout to", risk_json)
        r = subprocess.run(cmd_stdout, capture_output=True, text=True)
        if r.returncode != 0:
            print(r.stdout)
            print(r.stderr, file=sys.stderr)
            raise SystemExit(f"ERROR: test_risk_model_v1 failed ({r.returncode})")
        s = (r.stdout or "").strip()
        if not s:
            raise SystemExit("ERROR: test_risk_model_v1 stdout boş geldi; JSON üretilemedi.")
        try:
            obj = json.loads(s)
        except Exception:
            idx = s.rfind("{")
            if idx < 0:
                raise SystemExit("ERROR: stdout içinde JSON bulunamadı.")
            obj = json.loads(s[idx:])
        risk_json.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")

    if not risk_json.exists():
        raise SystemExit(f"ERROR: risk json oluşmadı -> {risk_json}")
    print("OK: risk json ->", risk_json)

    contracts_dir = base / args.contracts_dir
    run([sys.executable, "scripts/export_frontend_contracts.py", str(risk_json), str(contracts_dir)])
    _s10_attach_analysis_to_risk_contracts(contracts_dir, args.smmm, args.client, args.period)
    print("OK: contracts exported ->", contracts_dir)

    sanity_contracts(contracts_dir, require_signals=True)

    run([sys.executable, "scripts/generate_dossier_pdf.py", str(risk_json)])

    outdir = base / args.outdir
    pdf = outdir / f"LYNTOS_DOSSIER_{args.client}_{args.period}.pdf"
    bundle = outdir / f"LYNTOS_DOSSIER_{args.client}_{args.period}_BUNDLE.zip"

    if not bundle.exists():
        cands = sorted(outdir.glob(f"LYNTOS_DOSSIER_{args.client}_{args.period}_BUNDLE*.zip"), key=lambda p: p.stat().st_mtime, reverse=True)
        if cands:
            bundle = cands[0]

    base_url = (args.base_url or f"http://127.0.0.1:{args.backend_port}")

    if bundle.exists():
        try:
            _augment_bundle_zip(bundle, base_url, args.smmm, args.client, args.period)
            print("OK: bundle augmented with dossier manifest + checklists")
        except Exception as e:
            print("WARN: bundle augment failed:", e)
    else:
        print("WARN: Bundle path beklenen isimde yok. out/ klasörüne bak.")

    print("\n=== DONE ===")
    print("RISK JSON:", risk_json)
    print("CONTRACTS:", contracts_dir)
    print("PDF     :", pdf if pdf.exists() else f"(out altında farklı isim) -> {outdir}")
    print("BUNDLE  :", bundle if bundle.exists() else f"(out altında farklı isim) -> {outdir}")


if __name__ == "__main__":
    main()
