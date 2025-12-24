#!/usr/bin/env python3
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


# ---------------------------
# Formatting helpers
# ---------------------------
def _fmt_money(x):
    """1.234.567,89 format (TR)"""
    try:
        if x is None:
            return "-"
        v = float(x)
        s = f"{v:,.2f}"
        # 1,234,567.89 -> 1.234.567,89
        return s.replace(",", "X").replace(".", ",").replace("X", ".")
    except Exception:
        return str(x) if x is not None else "-"


def _fmt_ratio(x):
    """0,0000 format (TR)"""
    try:
        if x is None:
            return "-"
        v = float(x)
        return f"{v:.4f}".replace(".", ",")
    except Exception:
        return str(x) if x is not None else "-"


def _safe_get(dct, *keys, default=None):
    cur = dct
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k)
    return cur if cur is not None else default


# ---------------------------
# Font setup (TR-safe)
# ---------------------------
FONT_REG = "LYNTOS_SANS"
FONT_BOLD = "LYNTOS_SANS_BOLD"

def _pick_font_pair():
    """
    Prefer repo fonts (assets/fonts/NotoSans-*.ttf).
    Fallback to macOS Supplemental fonts.
    """
    base_dir = Path(__file__).resolve().parent.parent
    font_dir = base_dir / "assets" / "fonts"

    # 1) Repo NotoSans
    cand = [
        (font_dir / "NotoSans-Regular.ttf", font_dir / "NotoSans-Bold.ttf"),
    ]
    # 2) macOS fallbacks
    cand += [
        (Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"), Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")),
        (Path("/System/Library/Fonts/Supplemental/Arial.ttf"), Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")),
        (Path("/System/Library/Fonts/Supplemental/Verdana.ttf"), Path("/System/Library/Fonts/Supplemental/Verdana Bold.ttf")),
        (Path("/System/Library/Fonts/Supplemental/Times New Roman.ttf"), Path("/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf")),
    ]
    # 3) Linux-ish fallback (harmless on mac)
    cand += [
        (Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")),
    ]

    for reg, bold in cand:
        if reg.exists() and bold.exists():
            return reg, bold

    raise RuntimeError(
        "TR font bulunamadı.\n"
        "Çözüm (önerilen): assets/fonts içine NotoSans-Regular.ttf ve NotoSans-Bold.ttf koy.\n"
        f"Aranan: {cand[:3]} ..."
    )


def _register_fonts():
    reg_fp, bold_fp = _pick_font_pair()

    # register (idempotent)
    try:
        pdfmetrics.getFont(FONT_REG)
    except Exception:
        pdfmetrics.registerFont(TTFont(FONT_REG, str(reg_fp)))

    try:
        pdfmetrics.getFont(FONT_BOLD)
    except Exception:
        pdfmetrics.registerFont(TTFont(FONT_BOLD, str(bold_fp)))

    # Important: map family so <b> doesn't fallback to Helvetica
    try:
        pdfmetrics.registerFontFamily(FONT_REG, normal=FONT_REG, bold=FONT_BOLD, italic=FONT_REG, boldItalic=FONT_BOLD)
    except Exception:
        pass


# ---------------------------
# Table builder (wrap-safe)
# ---------------------------
def _make_table(rows, col_widths, header_rows=1, highlight_row=None, col_align=None):
    """
    rows: list[list[Flowable or str]]
    highlight_row: absolute row index in 'rows' (0 is header). Pass e.g. 2 for 2nd data row.
    col_align: dict {col_index: 'LEFT'|'CENTER'|'RIGHT'}
    """
    t = Table(rows, colWidths=col_widths, repeatRows=header_rows)

    style = [
        ("FONTNAME", (0, 0), (-1, -1), FONT_REG),
        ("FONTNAME", (0, 0), (-1, header_rows - 1), FONT_BOLD),
        ("FONTSIZE", (0, 0), (-1, -1), 8.6),
        ("FONTSIZE", (0, 0), (-1, header_rows - 1), 9.0),
        ("LEADING", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, header_rows - 1), colors.whitesmoke),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("WORDWRAP", (0, 0), (-1, -1), "CJK"),
    ]

    if col_align:
        for c, a in col_align.items():
            style.append(("ALIGN", (c, 0), (c, -1), a))

    if highlight_row is not None and 0 <= highlight_row < len(rows):
        style += [
            ("BACKGROUND", (0, highlight_row), (-1, highlight_row), colors.lightyellow),
            ("FONTNAME", (0, highlight_row), (-1, highlight_row), FONT_BOLD),
        ]

    t.setStyle(TableStyle(style))
    return t


def main():
    in_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/risk_v1.json"
    if not os.path.exists(in_path):
        print(f"HATA: input bulunamadı: {in_path}")
        sys.exit(1)

    _register_fonts()

    d = json.load(open(in_path, "r", encoding="utf-8"))
    smmm_id = d.get("smmm_id") or "-"
    client_id = d.get("client_id") or "-"
    period = d.get("period") or "-"

    rules = _safe_get(d, "metrics", "rules", default={}) or {}
    risks = rules.get("risks") or []

    out_name = f"LYNTOS_DOSSIER_{client_id}_{period}.pdf".replace("/", "_").replace(" ", "_")
    out_path = os.path.join("out", out_name)
    os.makedirs("out", exist_ok=True)

    # Styles (force unicode fonts)
    styles = getSampleStyleSheet()
    for st in styles.byName.values():
        st.fontName = FONT_REG
    styles["Title"].fontName = FONT_BOLD
    styles["Heading1"].fontName = FONT_BOLD
    styles["Heading2"].fontName = FONT_BOLD
    styles["Heading3"].fontName = FONT_BOLD

    # Custom table paragraph styles
    s_hdr = ParagraphStyle("tbl_hdr", parent=styles["Normal"], fontName=FONT_BOLD, fontSize=9, leading=11, alignment=TA_LEFT)
    s_cell = ParagraphStyle("tbl_cell", parent=styles["Normal"], fontName=FONT_REG, fontSize=8.6, leading=10, alignment=TA_LEFT)
    s_cell_c = ParagraphStyle("tbl_cell_c", parent=s_cell, alignment=TA_CENTER)
    s_cell_r = ParagraphStyle("tbl_cell_r", parent=s_cell, alignment=TA_RIGHT)

    def P(txt, style=s_cell):
        if txt is None:
            txt = "-"
        return Paragraph(str(txt).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), style)

    story = []

    story.append(Paragraph("LYNTOS | İnceleme Öncesi Risk Dossier", styles["Title"]))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(f"<b>SMMM:</b> {smmm_id}", styles["Normal"]))
    story.append(Paragraph(f"<b>Mükellef:</b> {client_id}", styles["Normal"]))
    story.append(Paragraph(f"<b>Dönem:</b> {period}", styles["Normal"]))
    story.append(Paragraph(f"<b>Üretim Zamanı:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles["Normal"]))
    story.append(Spacer(1, 0.6 * cm))

    story.append(Paragraph("Yönetici Özeti", styles["Heading2"]))
    story.append(Paragraph(
        'Bu dosya, inceleme başlamadan önce SMMM\'nin eline "açıklanabilir delil + aksiyon planı" vermek için üretilmiştir. '
        "Bulgular kesin hüküm değildir; kaynak kayıtlarla doğrulanması önerilir.",
        styles["Normal"],
    ))
    story.append(Spacer(1, 0.4 * cm))

    # Summary table (wrap-safe)
    story.append(Paragraph("Özet", styles["Heading2"]))
    rows = [
        [P("Risk Kodu", s_hdr), P("Seviye", s_hdr), P("Başlık", s_hdr)],
    ]
    for r in risks:
        rows.append([
            P(r.get("code", "-"), s_cell_c),
            P(r.get("severity", "-"), s_cell_c),
            P(r.get("title", "-"), s_cell),
        ])
    story.append(_make_table(
        rows,
        col_widths=[3 * cm, 3 * cm, 11 * cm],
        header_rows=1,
        col_align={0: "CENTER", 1: "CENTER", 2: "LEFT"},
    ))

    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph("İzlenebilirlik (Lineage)", styles["Heading3"]))
    story.append(Paragraph("Bu rapor, aşağıdaki çalışma dizinlerinden ve üretilen risk çıktısından hazırlanmıştır:", styles["Normal"]))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(f"• Risk JSON: <b>{in_path}</b>", styles["Normal"]))
    story.append(Paragraph(f"• Repo/Backend: <b>{os.path.abspath('.')}</b>", styles["Normal"]))
    story.append(Paragraph(f"• Veri kökü (tahmini): <b>{os.path.abspath('data')}</b>", styles["Normal"]))
    story.append(Paragraph("Not: Üretim zinciri; veri dosyaları, parser çıktıları ve risk motoru çalıştırma adımları ile doğrulanabilir.", styles["Normal"]))

    story.append(PageBreak())

    def add_kv(title, value):
        story.append(Paragraph(f"<b>{title}:</b> {value}", styles["Normal"]))

    CHECK = "[ ]"

    for r in risks:
        code = r.get("code", "-")
        sev = r.get("severity", "-")
        rtitle = r.get("title", "-")
        ed = r.get("evidence_details") or {}
        vf = r.get("value_found") or {}

        story.append(Paragraph(f"{code} | {rtitle}", styles["Heading1"]))
        add_kv("Seviye", sev)
        rl = ed.get("rule_logic") or "-"
        add_kv("Rule Logic", rl)
        note = ed.get("note") or "-"
        story.append(Spacer(1, 0.2 * cm))
        story.append(Paragraph(f"<b>Not:</b> {note}", styles["Normal"]))
        story.append(Spacer(1, 0.4 * cm))

        # R-401A detail table (wrap-safe)
        if code == "R-401A":
            story.append(Paragraph("Bulgu", styles["Heading3"]))
            miss = _safe_get(vf, "missing_102_details", default=[]) or []
            if miss:
                rows = [[P("Hesap Kodu", s_hdr), P("Hesap Adı", s_hdr), P("Tutar", s_hdr)]]
                for it in miss[:30]:
                    rows.append([
                        P(it.get("account_code", "-"), s_cell_c),
                        P(it.get("account_name", "-"), s_cell),
                        P(_fmt_money(it.get("amount")), s_cell_r),
                    ])
                story.append(_make_table(
                    rows,
                    col_widths=[3 * cm, 11 * cm, 3 * cm],
                    header_rows=1,
                    col_align={0: "CENTER", 2: "RIGHT"},
                ))
            else:
                story.append(Paragraph("Detay bulunamadı (missing_102_details boş).", styles["Normal"]))

        # R-501 dossier table (wrap-safe + ratio fixed)
        if code == "R-501":
            dossier = ed.get("audit_dossier") or {}
            ep = dossier.get("evidence_pack") or {}
            month_table = ep.get("month_table") or dossier.get("month_table") or []
            worst_month = ep.get("worst_month") or dossier.get("worst_month") or "-"
            sc = ep.get("samples_counts") or dossier.get("samples_counts") or {}

            story.append(Spacer(1, 0.3 * cm))
            story.append(Paragraph("Dossier Özeti", styles["Heading3"]))
            add_kv("Dossier Version", dossier.get("version", "-"))
            add_kv("Worst Month (Vurgu)", worst_month)
            add_kv("Samples Counts", f"sales={sc.get('sales','-')}, kdv={sc.get('kdv','-')}")

            story.append(Spacer(1, 0.3 * cm))
            story.append(Paragraph("Ay Bazlı Mutabakat Tablosu", styles["Heading3"]))

            rows = [[
                P("Ay", s_hdr),
                P("KDV Matrah", s_hdr),
                P("E-Defter Net Satış", s_hdr),
                P("Delta (Net-KDV)", s_hdr),
                P("Oran (Net/KDV)", s_hdr),
            ]]

            highlight_row = None
            for row in month_table:
                mm = row.get("month", "-")
                if highlight_row is None and mm == worst_month:
                    highlight_row = len(rows)  # next row index
                rows.append([
                    P(mm, s_cell_c),
                    P(_fmt_money(row.get("kdv_matrah")), s_cell_r),
                    P(_fmt_money(row.get("edefter_net_sales")), s_cell_r),
                    P(_fmt_money(row.get("delta_net_minus_kdv")), s_cell_r),
                    P(_fmt_ratio(row.get("ratio_net_over_kdv")), s_cell_r),
                ])

            story.append(_make_table(
                rows,
                col_widths=[2.5 * cm, 3.5 * cm, 4.2 * cm, 3.8 * cm, 3.0 * cm],
                header_rows=1,
                highlight_row=highlight_row,
                col_align={0: "CENTER", 1: "RIGHT", 2: "RIGHT", 3: "RIGHT", 4: "RIGHT"},
            ))

            # samples (optional)
            se_full = _safe_get(d, "metrics", "edefter", "sales_evidence", default={}) or {}
            samples_sales = se_full.get("samples_sales_by_month") if isinstance(se_full, dict) else None
            samples_kdv = se_full.get("samples_kdv_by_month") if isinstance(se_full, dict) else None

            story.append(Spacer(1, 0.3 * cm))
            story.append(Paragraph("Ekler (Delil Örnekleri)", styles["Heading3"]))

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
                story.append(Spacer(1, 0.4 * cm))
                story.append(Paragraph("Mutabakat / Aksiyon Planı", styles["Heading3"]))

                story.append(Spacer(1, 0.4 * cm))
                story.append(Paragraph("Kopyalanabilir Açıklama Taslağı (SMMM → Mükellef)", styles["Heading3"]))
                story.append(Paragraph(
                    "Sayın Yetkili, ilgili dönemde KDV matrahı ile e-defter net satış toplamları arasında ay bazında sapma tespit edilmiştir. "
                    "Bu bulgu kesin hüküm değildir; aşağıdaki bilgi ve belgelerle birlikte açıklamanızı rica ederiz:",
                    styles["Normal"]
                ))
                story.append(Spacer(1, 0.2 * cm))
                story.append(Paragraph("1) İstisna/tevkifat kapsamındaki satışların dökümü (ay bazında) ve beyanname kırılımı ile eşleştirme.", styles["Normal"]))
                story.append(Paragraph("2) 610/611/612 (iskonto/iade) kayıtlarının dayanak belgeleri ve ay bazında açıklaması.", styles["Normal"]))
                story.append(Paragraph("3) Dönem kayması olabilecek faturalar/yevmiye fişleri (özellikle worst_month) için örnek kayıtlar.", styles["Normal"]))
                story.append(Paragraph("4) Satışların brüt→net etkisini yaratan muhasebe politika notu (varsa) ve ilgili kayıt örnekleri.", styles["Normal"]))
                story.append(Spacer(1, 0.2 * cm))
                story.append(Paragraph(
                    f"Öncelikli inceleme ayı (worst_month): <b>{worst_month}</b>. Bu ay için 5–10 örnek kayıt üzerinden mutabakat yapılması önerilir.",
                    styles["Normal"]
                ))
                for item in plan:
                    story.append(Paragraph(f"{CHECK} {item}", styles["Normal"]))

        actions = r.get("actions") or r.get("smmm_actions") or []
        checklist = r.get("checklist") or []
        if actions:
            story.append(Spacer(1, 0.4 * cm))
            story.append(Paragraph("SMMM Aksiyonları", styles["Heading3"]))
            for item in actions:
                story.append(Paragraph(f"{CHECK} {item}", styles["Normal"]))
        if checklist:
            story.append(Spacer(1, 0.4 * cm))
            story.append(Paragraph("Kontrol Listesi", styles["Heading3"]))
            for item in checklist:
                story.append(Paragraph(f"{CHECK} {item}", styles["Normal"]))

        story.append(PageBreak())

    doc = SimpleDocTemplate(
        out_path, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm
    )
    doc.build(story)

    # Bundle ZIP (pdf + risk json + manifest)
    try:
        import zipfile, subprocess, hashlib
        bundle_path = out_path.replace(".pdf", "_BUNDLE.zip")

        def _sha256(fp: str) -> str:
            h = hashlib.sha256()
            with open(fp, "rb") as f:
                for chunk in iter(lambda: f.read(1024 * 1024), b""):
                    h.update(chunk)
            return h.hexdigest()

        try:
            rev = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], text=True).strip()
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
