import argparse
import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime


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

    # Risk detail örneği (R-401A varsa onu, yoksa ilk riski seç)
    risks = d.get("risks") or []
    code = None
    for r in risks:
        if str(r.get("code","")).upper() == "R-401A":
            code = "R-401A"
            break
    if not code and risks:
        code = str(risks[0].get("code") or "").strip()

    if code:
        rd = contracts_dir / "risks" / f"risk_detail_{code}.json"
        if not rd.exists():
            raise SystemExit(f"ERROR: risk detail contract missing -> {rd}")
        rdd = json.loads(rd.read_text(encoding="utf-8"))
        if not rdd.get("period_window") or not rdd.get("data_quality"):
            raise SystemExit("ERROR: risk_detail içinde period_window/data_quality yok.")
        if require_signals and not rdd.get("kurgan_criteria_signals"):
            # bazı risklerde sinyal olmayabilir; ama ödül demosunda R-401A ve R-501 var.
            print("WARN: kurgan_criteria_signals boş görünüyor (risk:", code, ")")

    print("OK: contracts sanity passed")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--smmm", required=True)
    ap.add_argument("--client", required=True)
    ap.add_argument("--period", required=True)  # e.g. 2025-Q2
    ap.add_argument("--backend_port", default="8000")
    ap.add_argument("--contracts_dir", default="docs/contracts")
    ap.add_argument("--outdir", default="out")
    args = ap.parse_args()

    base = Path(".").resolve()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    # 1) Risk JSON üret (mevcut test script’in varsa onu kullan)
    # Eğer sende run script farklıysa burada komutu değiştirirsin.
    risk_json = Path(f"/tmp/risk_v1_{args.client}_{args.period}_{ts}.json")
    # 1) Risk JSON üret (stdout'a basıyor olabilir; dosyaya yazmayı garanti et)
    cmd_with_out = [sys.executable, "scripts/test_risk_model_v1.py",
                    "--smmm", args.smmm, "--client", args.client, "--period", args.period,
                    "--out", str(risk_json)]
    try:
        run(cmd_with_out)
    except SystemExit:
        # bazı script'ler --out yüzünden hata verebilir; ikinci plan aşağıda
        pass

    # Eğer dosya oluşmadıysa: stdout'u yakala ve dosyaya yaz
    if not risk_json.exists():
        cmd_stdout = [sys.executable, "scripts/test_risk_model_v1.py",
                      "--smmm", args.smmm, "--client", args.client, "--period", args.period]
        print(">> (fallback) writing stdout to", risk_json)
        import subprocess, json
        r = subprocess.run(cmd_stdout, capture_output=True, text=True)
        if r.returncode != 0:
            print(r.stdout)
            print(r.stderr, file=sys.stderr)
            raise SystemExit(f"ERROR: test_risk_model_v1 failed ({r.returncode})")

        # stdout JSON olmalı
        s = (r.stdout or "").strip()
        if not s:
            raise SystemExit("ERROR: test_risk_model_v1 stdout boş geldi; JSON üretilemedi.")
        try:
            obj = json.loads(s)
        except Exception:
            # bazen log + json karışır; son '{' sonrası denenir
            idx = s.rfind("{")
            if idx < 0:
                raise SystemExit("ERROR: stdout içinde JSON bulunamadı.")
            obj = json.loads(s[idx:])

        risk_json.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


    if not risk_json.exists():
        raise SystemExit(f"ERROR: risk json oluşmadı -> {risk_json}")
    print("OK: risk json ->", risk_json)

    # 2) Contract export
    contracts_dir = base / args.contracts_dir
    run([sys.executable, "scripts/export_frontend_contracts.py", str(risk_json), str(contracts_dir)])
    print("OK: contracts exported ->", contracts_dir)

    # 3) Sanity check (band alanları)
    sanity_contracts(contracts_dir, require_signals=True)

    # 4) PDF + Bundle
    run([sys.executable, "scripts/generate_dossier_pdf.py", str(risk_json)])
    outdir = base / args.outdir
    pdf = outdir / f"LYNTOS_DOSSIER_{args.client}_{args.period}.pdf"
    bundle = outdir / f"LYNTOS_DOSSIER_{args.client}_{args.period}_BUNDLE.zip"
    if not pdf.exists():
        print("WARN: PDF path beklenen isimde yok. out/ klasörüne bak.")
    if not bundle.exists():
        print("WARN: Bundle path beklenen isimde yok. out/ klasörüne bak.")

    # 5) Son çıktı
    print("\n=== DONE ===")
    print("RISK JSON:", risk_json)
    print("CONTRACTS:", contracts_dir)
    print("PDF     :", pdf if pdf.exists() else f"(out altında farklı isim) -> {outdir}")
    print("BUNDLE  :", bundle if bundle.exists() else f"(out altında farklı isim) -> {outdir}")


if __name__ == "__main__":
    main()
