#!/usr/bin/env python3
import json
import os
import sys
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors


def _fmt_money(x):
    try:
        if x is None:
            return "-"
        v = float(x)
        return f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except Exception:
        return str(x)


def _safe_get(dct, *keys, default=None):
    cur = dct
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k)
    return cur if cur is not None else default


def main():
    in_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/risk_v1.json"
    if not os.path.exists(in_path):
        print(f"HATA: input bulunamadı: {in_path}")
        sys.exit(1)

    d = json.load(open(in_path, "r", encoding="utf-8"))
    smmm_id = d.get("smmm_id") or "-"
    client_id = d.get("client_id") or "-"
    period = d.get("period") or "-"

    rules = _safe_get(d, "metrics", "rules", default={}) or {}
    risks = rules.get("risks") or []

    out_name = f"LYNTOS_DOSSIER_{client_id}_{period}.pdf".replace("/", "_").replace(" ", "_")
    out_path = os.path.join("out", out_name)

    # Ensure output directory exists
    os.makedirs("out", exist_ok=True)


    styles = getSampleStyleSheet()
    story = []

    title = f"LYNTOS | İnceleme Öncesi Risk Dossier"
    story.append(Paragraph(title, styles["Title"]))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph(f"<b>SMMM:</b> {smmm_id}", styles["Normal"]))
    story.append(Paragraph(f"<b>Mükellef:</b> {client_id}", styles["Normal"]))
    story.append(Paragraph(f"<b>Dönem:</b> {period}", styles["Normal"]))
    story.append(Paragraph(f"<b>Üretim Zamanı:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles["Normal"]))
    story.append(Spacer(1, 0.6*cm))

    story.append(Paragraph("<b>Yönetici Özeti</b>", styles["Heading2"]))
    story.append(Paragraph("Bu dosya, inceleme başlamadan önce SMMM\'nin eline \"açıklanabilir delil + aksiyon planı\" vermek için üretilmiştir. Bulgular kesin hüküm değildir; kaynak kayıtlarla doğrulanması önerilir.", styles["Normal"]))
    story.append(Spacer(1, 0.4*cm))

    story.append(Paragraph("<b>Özet</b>", styles["Heading2"]))
    summary_rows = [["Risk Kodu", "Seviye", "Başlık"]]
    for r in risks:
        summary_rows.append([r.get("code","-"), r.get("severity","-"), r.get("title","-")])
    tbl = Table(summary_rows, colWidths=[3*cm, 3*cm, 11*cm])
    tbl.setStyle(TableStyle([
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("GRID", (0,0), (-1,-1), 0.25, colors.grey),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("BACKGROUND", (0,0), (-1,0), colors.whitesmoke),
    ]))
    story.append(tbl)

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("<b>İzlenebilirlik (Lineage)</b>", styles["Heading3"]))
    story.append(Paragraph("Bu rapor, aşağıdaki çalışma dizinlerinden ve üretilen risk çıktısından hazırlanmıştır:", styles["Normal"]))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(f"• Risk JSON: <b>{in_path}</b>", styles["Normal"]))
    story.append(Paragraph(f"• Repo/Backend: <b>{os.path.abspath('.')}</b>", styles["Normal"]))
    story.append(Paragraph(f"• Veri kökü (tahmini): <b>{os.path.abspath('data')}</b>", styles["Normal"]))
    story.append(Paragraph("Not: Üretim zinciri; veri dosyaları, parser çıktıları ve risk motoru çalıştırma adımları ile doğrulanabilir.", styles["Normal"]))

    story.append(PageBreak())

    def add_kv(title, value):
        story.append(Paragraph(f"<b>{title}:</b> {value}", styles["Normal"]))

    for r in risks:
        code = r.get("code","-")
        sev = r.get("severity","-")
        rtitle = r.get("title","-")
        ed = r.get("evidence_details") or {}
        vf = r.get("value_found") or {}

        story.append(Paragraph(f"{code} | {rtitle}", styles["Heading1"]))
        add_kv("Severity", sev)
        rl = ed.get("rule_logic") or "-"
        add_kv("Rule Logic", rl)
        note = ed.get("note") or "-"
        story.append(Spacer(1, 0.2*cm))
        story.append(Paragraph(f"<b>Not:</b> {note}", styles["Normal"]))
        story.append(Spacer(1, 0.4*cm))

        # R-401A detay
        if code == "R-401A":
            story.append(Paragraph("<b>Bulgu</b>", styles["Heading3"]))
            miss = _safe_get(vf, "missing_102_details", default=[]) or []
            if miss:
                rows = [["Hesap Kodu", "Hesap Adı", "Tutar"]]
                for it in miss[:20]:
                    rows.append([
                        it.get("account_code","-"),
                        it.get("account_name","-"),
                        _fmt_money(it.get("amount")),
                    ])
                t = Table(rows, colWidths=[3*cm, 11*cm, 3*cm])
                t.setStyle(TableStyle([
                    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
                    ("GRID", (0,0), (-1,-1), 0.25, colors.grey),
                    ("VALIGN", (0,0), (-1,-1), "TOP"),
                    ("BACKGROUND", (0,0), (-1,0), colors.whitesmoke),
                ]))
                story.append(t)
            else:
                story.append(Paragraph("Detay bulunamadı (missing_102_details boş).", styles["Normal"]))

        # R-501 dossier
        if code == "R-501":
            dossier = ed.get("audit_dossier") or {}
            ep = dossier.get("evidence_pack") or {}
            # geri uyum
            month_table = ep.get("month_table") or dossier.get("month_table") or []
            worst_month = ep.get("worst_month") or dossier.get("worst_month") or "-"
            sc = ep.get("samples_counts") or dossier.get("samples_counts") or {}

            story.append(Spacer(1, 0.3*cm))
            story.append(Paragraph("<b>Dossier Özeti</b>", styles["Heading3"]))
            add_kv("Dossier Version", dossier.get("version","-"))
            add_kv("Worst Month (Vurgu)", worst_month)
            add_kv("Samples Counts", f"sales={sc.get('sales','-')}, kdv={sc.get('kdv','-')}")

            story.append(Spacer(1, 0.3*cm))

            story.append(Paragraph("<b>Ay Bazlı Mutabakat Tablosu</b>", styles["Heading3"]))

            rows = [["Ay", "KDV Matrah", "E-Defter Net Satış", "Delta (Net-KDV)", "Oran (Net/KDV)"]]

            highlight_row = None  # worst_month highlight

            for row in month_table:

                if highlight_row is None and row.get("month","-") == worst_month:

                    highlight_row = len(rows)  # header=0, first data row=1

                rows.append([

                    row.get("month","-"),

                    _fmt_money(row.get("kdv_matrah")),

                    _fmt_money(row.get("edefter_net_sales")),

                    _fmt_money(row.get("delta_net_minus_kdv")),

                    str(row.get("ratio_net_over_kdv","-")),

                ])

            t = Table(rows, colWidths=[2.5*cm, 3.5*cm, 4.2*cm, 3.8*cm, 3.0*cm])

            t.setStyle(TableStyle([

                ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),

                ("GRID", (0,0), (-1,-1), 0.25, colors.grey),

                ("VALIGN", (0,0), (-1,-1), "TOP"),

                ("BACKGROUND", (0,0), (-1,0), colors.whitesmoke),

            ]))

            if highlight_row is not None and 0 <= highlight_row < len(rows):

                t.setStyle(TableStyle([

                    ("BACKGROUND", (0, highlight_row), (-1, highlight_row), colors.lightyellow),

                    ("FONTNAME", (0, highlight_row), (-1, highlight_row), "Helvetica-Bold"),

                ]))

            story.append(t)


            # Ekler (Delil Örnekleri) — varsa metrics.edefter.sales_evidence içinden küçük örnek listesi

            se_full = _safe_get(d, "metrics", "edefter", "sales_evidence", default={}) or {}

            samples_sales = se_full.get("samples_sales_by_month") if isinstance(se_full, dict) else None

            samples_kdv = se_full.get("samples_kdv_by_month") if isinstance(se_full, dict) else None

            story.append(Spacer(1, 0.3*cm))

            story.append(Paragraph("<b>Ekler (Delil Örnekleri)</b>", styles["Heading3"]))

            if isinstance(samples_sales, dict) or isinstance(samples_kdv, dict):

                story.append(Paragraph("Not: Aşağıdaki örnekler, metrik çıktısındaki 'metrics.edefter.sales_evidence.samples_*' alanlarından alınır.", styles["Normal"]))

                shown = 0

                def _emit(ttl, dd):

                    nonlocal shown

                    if not isinstance(dd, dict) or not dd:

                        story.append(Paragraph(f"{ttl}: -", styles["Normal"]))

                        return

                    story.append(Paragraph(f"<b>{ttl}</b>", styles["Normal"]))

                    for mm in sorted(dd.keys()):

                        if shown >= 20:

                            return

                        items = dd.get(mm) or []

                        for it in items[:5]:

                            if shown >= 20:

                                return

                            if isinstance(it, dict):

                                key = it.get("doc_no") or it.get("belge_no") or it.get("key") or it.get("id") or "-"

                                amt = it.get("amount") or it.get("tutar") or it.get("net") or it.get("matrah") or "-"

                                story.append(Paragraph(f"• {mm} | {key} | {_fmt_money(amt)}", styles["Normal"]))

                            else:

                                story.append(Paragraph(f"• {mm} | {str(it)}", styles["Normal"]))

                            shown += 1

                _emit("Satış örnekleri", samples_sales)

                _emit("KDV örnekleri", samples_kdv)

            else:

                story.append(Paragraph("Not: Bu koşuda detaylı örnek kayıtlar bulunamadı (metrics.edefter.sales_evidence.samples_* yok).", styles["Normal"]))
            plan = dossier.get("reconciliation_plan") or []
            if plan:
                story.append(Spacer(1, 0.4*cm))
                story.append(Paragraph("<b>Mutabakat / Aksiyon Planı</b>", styles["Heading3"]))

                story.append(Spacer(1, 0.4*cm))
                story.append(Paragraph("<b>Kopyalanabilir Açıklama Taslağı (SMMM → Mükellef)</b>", styles["Heading3"]))
                story.append(Paragraph(
                    "Sayın Yetkili, ilgili dönemde KDV matrahı ile e-defter net satış toplamları arasında ay bazında sapma tespit edilmiştir. "
                    "Bu bulgu kesin hüküm değildir; aşağıdaki bilgi ve belgelerle birlikte açıklamanızı rica ederiz:", styles["Normal"]
                ))
                story.append(Spacer(1, 0.2*cm))
                story.append(Paragraph("1) İstisna/tevkifat kapsamındaki satışların dökümü (ay bazında) ve beyanname kırılımı ile eşleştirme.", styles["Normal"]))
                story.append(Paragraph("2) 610/611/612 (iskonto/iade) kayıtlarının dayanak belgeleri ve ay bazında açıklaması.", styles["Normal"]))
                story.append(Paragraph("3) Dönem kayması olabilecek faturalar/yevmiye fişleri (özellikle worst_month) için örnek kayıtlar.", styles["Normal"]))
                story.append(Paragraph("4) Satışların brüt→net etkisini yaratan muhasebe politika notu (varsa) ve ilgili kayıt örnekleri.", styles["Normal"]))
                story.append(Spacer(1, 0.2*cm))
                story.append(Paragraph(
                    f"Öncelikli inceleme ayı (worst_month): <b>{worst_month}</b>. "
                    "Bu ay için 5–10 örnek kayıt üzerinden mutabakat yapılması önerilir.", styles["Normal"]
                ))

                for i, item in enumerate(plan, start=1):
                    story.append(Paragraph(f"☐ {item}", styles["Normal"]))

        # Checklist / actions (varsa)
        actions = r.get("actions") or r.get("smmm_actions") or []
        checklist = r.get("checklist") or []
        if actions:
            story.append(Spacer(1, 0.4*cm))
            story.append(Paragraph("<b>SMMM Aksiyonları</b>", styles["Heading3"]))
            for i, item in enumerate(actions, start=1):
                story.append(Paragraph(f"☐ {item}", styles["Normal"]))
        if checklist:
            story.append(Spacer(1, 0.4*cm))
            story.append(Paragraph("<b>Kontrol Listesi</b>", styles["Heading3"]))
            for i, item in enumerate(checklist, start=1):
                story.append(Paragraph(f"☐ {item}", styles["Normal"]))

        story.append(PageBreak())

    doc = SimpleDocTemplate(out_path, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    doc.build(story)

    # LYNTOS_BUNDLE_ZIP (pdf + risk json + manifest)
    try:
        import zipfile, subprocess, hashlib
        bundle_path = out_path.replace(".pdf", "_BUNDLE.zip")
        def _sha256(fp: str) -> str:
            h = hashlib.sha256()
            with open(fp, "rb") as f:
                for chunk in iter(lambda: f.read(1024*1024), b""):
                    h.update(chunk)
            return h.hexdigest()
        try:
            rev = subprocess.check_output(["git","rev-parse","--short","HEAD"], text=True).strip()
        except Exception:
            rev = "unknown"
        manifest = "\n".join([
            f"smmm_id: {smmm_id}",
            f"client_id: {client_id}",
            f"period: {period}",
            f"generated_at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"git_rev: {rev}",
            f"risk_json: {os.path.abspath(in_path)}",
            f"risk_json_sha256: {_sha256(in_path) if os.path.exists(in_path) else 'n/a'}",
            f"pdf_path: {os.path.abspath(out_path)}",
            f"pdf_sha256: {_sha256(out_path) if os.path.exists(out_path) else 'n/a'}",
        ]) + "\n"
        with zipfile.ZipFile(bundle_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
            if os.path.exists(in_path):
                z.write(in_path, arcname=os.path.basename(in_path))
            if os.path.exists(out_path):
                z.write(out_path, arcname=os.path.join("out", os.path.basename(out_path)))
            z.writestr("MANIFEST.txt", manifest)
        print(f"OK: Bundle ZIP -> {bundle_path}")
    except Exception as e:
        print(f"Not: Bundle ZIP üretilemedi: {e}")

    print(f"OK: PDF üretildi -> {out_path}")


if __name__ == "__main__":
    main()
