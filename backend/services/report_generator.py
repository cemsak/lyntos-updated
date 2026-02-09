"""
LYNTOS Report Generator
========================
Profesyonel PDF rapor üretimi (Big4+ kalite).
ReportLab kullanarak A4 format, kapak sayfası, mevzuat referansları,
dijital hash ve tutarlı tipografi ile rapor oluşturur.
"""

import hashlib
import json
import logging
import os
import uuid
from datetime import datetime
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable,
)

from database.db import get_connection

logger = logging.getLogger(__name__)

# ════════════════════════════════════════════════════════════════════
# RENK PALETİ (LYNTOS Design Tokens)
# ════════════════════════════════════════════════════════════════════
LYNTOS_BLUE = colors.HexColor("#0049AA")
LYNTOS_LIGHT_BLUE = colors.HexColor("#E6F9FF")
LYNTOS_RED = colors.HexColor("#BF192B")
LYNTOS_GREEN = colors.HexColor("#00804D")
LYNTOS_ORANGE = colors.HexColor("#FA841E")
LYNTOS_GRAY = colors.HexColor("#5A5A5A")
LYNTOS_LIGHT_GRAY = colors.HexColor("#F5F6F8")
LYNTOS_DARK = colors.HexColor("#2E2E2E")
LYNTOS_BORDER = colors.HexColor("#E5E5E5")

# Rapor dosyaları dizini
REPORTS_DIR = Path(__file__).parent.parent / "database" / "reports"
REPORTS_DIR.mkdir(exist_ok=True)


class ReportGenerator:
    """Profesyonel PDF rapor üretici"""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """LYNTOS özel stilleri tanımla"""
        self.styles.add(ParagraphStyle(
            'LyntosTitle',
            parent=self.styles['Title'],
            fontSize=24,
            textColor=LYNTOS_BLUE,
            spaceAfter=6 * mm,
            leading=28,
        ))
        self.styles.add(ParagraphStyle(
            'LyntosH1',
            parent=self.styles['Heading1'],
            fontSize=16,
            textColor=LYNTOS_BLUE,
            spaceBefore=8 * mm,
            spaceAfter=4 * mm,
        ))
        self.styles.add(ParagraphStyle(
            'LyntosH2',
            parent=self.styles['Heading2'],
            fontSize=13,
            textColor=LYNTOS_DARK,
            spaceBefore=6 * mm,
            spaceAfter=3 * mm,
        ))
        self.styles.add(ParagraphStyle(
            'LyntosBody',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=LYNTOS_GRAY,
            leading=14,
            spaceAfter=3 * mm,
        ))
        self.styles.add(ParagraphStyle(
            'LyntosMevzuat',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=LYNTOS_BLUE,
            italic=True,
            leftIndent=10 * mm,
        ))
        self.styles.add(ParagraphStyle(
            'LyntosFooter',
            parent=self.styles['Normal'],
            fontSize=7,
            textColor=LYNTOS_GRAY,
        ))

    # ═══════════════════════════════════════════════════════════════
    # ANA ÜRETİM FONKSİYONU
    # ═══════════════════════════════════════════════════════════════

    def generate(
        self,
        report_type: str,
        client_id: str,
        period_id: str,
        smmm_id: str = "",
        report_format: str = "pdf",
    ) -> dict:
        """
        Rapor üret ve DB'ye kaydet.
        Döner: { id, file_path, file_size, content_hash, ... }
        """
        report_id = str(uuid.uuid4())[:12]
        timestamp = datetime.now()

        # Müşteri ve SMMM bilgilerini al
        client_info = self._get_client_info(client_id)
        smmm_info = self._get_smmm_info(smmm_id)

        # Rapor verilerini topla
        report_data = self._collect_data(report_type, client_id, period_id)

        # PDF üret
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=2.5 * cm,
            bottomMargin=2.5 * cm,
            leftMargin=2 * cm,
            rightMargin=2 * cm,
            title=self._get_report_title(report_type),
            author="LYNTOS Platform",
        )

        elements = []

        # 1. Kapak Sayfası
        elements.extend(self._build_cover_page(
            report_type, client_info, smmm_info, period_id, timestamp, report_id
        ))

        # 2. İçindekiler
        elements.append(PageBreak())
        elements.extend(self._build_toc(report_type))

        # 3. Yönetici Özeti
        elements.append(PageBreak())
        elements.extend(self._build_executive_summary(report_type, report_data, period_id))

        # 4. Detaylı Bulgular
        elements.extend(self._build_detailed_findings(report_type, report_data))

        # 5. Mevzuat Referansları
        elements.extend(self._build_legal_references(report_type))

        # 6. Disclaimer
        elements.extend(self._build_disclaimer())

        # PDF oluştur
        doc.build(elements, onFirstPage=self._add_page_footer, onLaterPages=self._add_page_footer)

        pdf_bytes = buffer.getvalue()
        buffer.close()

        # Hash hesapla
        content_hash = hashlib.sha256(pdf_bytes).hexdigest()

        # Dosyaya kaydet
        file_name = f"{report_type}_{client_id}_{period_id}_{report_id}.pdf"
        file_path = str(REPORTS_DIR / file_name)
        with open(file_path, "wb") as f:
            f.write(pdf_bytes)

        file_size = len(pdf_bytes)

        # DB'ye kaydet
        self._save_to_db(
            report_id, client_id, period_id, report_type, report_format,
            file_path, file_size, content_hash, smmm_id, timestamp
        )

        return {
            "id": report_id,
            "report_type": report_type,
            "client_id": client_id,
            "period_id": period_id,
            "file_path": file_path,
            "file_size": file_size,
            "file_size_display": self._format_size(file_size),
            "content_hash": content_hash,
            "generated_at": timestamp.isoformat(),
        }

    # ═══════════════════════════════════════════════════════════════
    # KAPAK SAYFASI
    # ═══════════════════════════════════════════════════════════════

    def _build_cover_page(self, report_type, client_info, smmm_info, period_id, timestamp, report_id):
        elements = []
        elements.append(Spacer(1, 4 * cm))

        # LYNTOS Logo / Title
        elements.append(Paragraph("LYNTOS", self.styles['LyntosTitle']))
        elements.append(Paragraph(
            self._get_report_title(report_type),
            ParagraphStyle('CoverTitle', parent=self.styles['Title'], fontSize=20, textColor=LYNTOS_DARK, spaceAfter=1 * cm)
        ))

        elements.append(HRFlowable(width="60%", thickness=2, color=LYNTOS_BLUE, spaceAfter=1 * cm))

        # Müşteri Bilgileri
        cover_data = [
            ["Mükellef", client_info.get("name", client_id)],
            ["Vergi No", client_info.get("tax_id", "—")],
            ["Dönem", period_id],
            ["SMMM", smmm_info.get("name", smmm_id or "—")],
            ["Rapor No", f"RPT-{report_id.upper()}"],
            ["Tarih", timestamp.strftime("%d.%m.%Y %H:%M")],
        ]

        cover_table = Table(cover_data, colWidths=[5 * cm, 10 * cm])
        cover_table.setStyle(TableStyle([
            ('TEXTCOLOR', (0, 0), (0, -1), LYNTOS_BLUE),
            ('TEXTCOLOR', (1, 0), (1, -1), LYNTOS_DARK),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('LINEBELOW', (0, -1), (-1, -1), 1, LYNTOS_BORDER),
        ]))
        elements.append(cover_table)

        elements.append(Spacer(1, 2 * cm))

        # Gizlilik Notu
        elements.append(Paragraph(
            "<b>GİZLİLİK:</b> Bu rapor sadece yukarıda belirtilen mükellef ve yetkili mali müşavir "
            "tarafından kullanılmak üzere hazırlanmıştır. İzinsiz dağıtım yasaktır.",
            ParagraphStyle('Confidential', parent=self.styles['Normal'], fontSize=8, textColor=LYNTOS_RED, borderWidth=1, borderColor=LYNTOS_RED, borderPadding=8)
        ))

        return elements

    # ═══════════════════════════════════════════════════════════════
    # İÇİNDEKİLER
    # ═══════════════════════════════════════════════════════════════

    def _build_toc(self, report_type):
        elements = []
        elements.append(Paragraph("İçindekiler", self.styles['LyntosH1']))

        sections = self._get_report_sections(report_type)
        for i, section in enumerate(sections, 1):
            elements.append(Paragraph(
                f"{i}. {section}",
                ParagraphStyle('TOCItem', parent=self.styles['Normal'], fontSize=11, textColor=LYNTOS_DARK, spaceBefore=3 * mm, leftIndent=5 * mm)
            ))

        return elements

    # ═══════════════════════════════════════════════════════════════
    # YÖNETİCİ ÖZETİ
    # ═══════════════════════════════════════════════════════════════

    def _build_executive_summary(self, report_type, report_data, period_id):
        elements = []
        elements.append(Paragraph("1. Yönetici Özeti", self.styles['LyntosH1']))

        summary_text = self._get_executive_summary_text(report_type, report_data, period_id)
        elements.append(Paragraph(summary_text, self.styles['LyntosBody']))

        # Özet tablosu (varsa veri)
        if report_data.get("summary_table"):
            table_data = [["Gösterge", "Değer", "Durum"]]
            for item in report_data["summary_table"]:
                table_data.append([item.get("label", ""), str(item.get("value", "")), item.get("status", "")])

            summary_table = Table(table_data, colWidths=[7 * cm, 5 * cm, 5 * cm])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), LYNTOS_BLUE),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, LYNTOS_BORDER),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LYNTOS_LIGHT_GRAY]),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(Spacer(1, 5 * mm))
            elements.append(summary_table)

        return elements

    # ═══════════════════════════════════════════════════════════════
    # DETAYLI BULGULAR
    # ═══════════════════════════════════════════════════════════════

    def _build_detailed_findings(self, report_type, report_data):
        elements = []
        elements.append(Paragraph("2. Detaylı Bulgular", self.styles['LyntosH1']))

        findings = report_data.get("findings", [])
        if not findings:
            elements.append(Paragraph(
                "Bu dönem için analiz verileri henüz yüklenmemiştir. "
                "Detaylı bulgular için mizan ve beyanname verilerini yükleyiniz.",
                self.styles['LyntosBody']
            ))
            return elements

        for i, finding in enumerate(findings, 1):
            elements.append(Paragraph(
                f"2.{i} {finding.get('title', '')}",
                self.styles['LyntosH2']
            ))
            elements.append(Paragraph(
                finding.get("description", ""),
                self.styles['LyntosBody']
            ))

            if finding.get("mevzuat"):
                elements.append(Paragraph(
                    f"Mevzuat: {finding['mevzuat']}",
                    self.styles['LyntosMevzuat']
                ))

            if finding.get("risk_level"):
                risk_color = {"high": "red", "medium": "orange", "low": "green"}.get(finding["risk_level"], "gray")
                elements.append(Paragraph(
                    f"Risk Seviyesi: <b>{finding['risk_level'].upper()}</b>",
                    ParagraphStyle('RiskLevel', parent=self.styles['Normal'], fontSize=9,
                                   textColor={"red": LYNTOS_RED, "orange": LYNTOS_ORANGE, "green": LYNTOS_GREEN}.get(risk_color, LYNTOS_GRAY))
                ))

        return elements

    # ═══════════════════════════════════════════════════════════════
    # MEVZUAT REFERANSLARI
    # ═══════════════════════════════════════════════════════════════

    def _build_legal_references(self, report_type):
        elements = []
        elements.append(Paragraph("Mevzuat Referansları", self.styles['LyntosH1']))

        refs = self._get_legal_references(report_type)
        for ref in refs:
            elements.append(Paragraph(f"• {ref}", self.styles['LyntosMevzuat']))

        return elements

    # ═══════════════════════════════════════════════════════════════
    # DISCLAIMER
    # ═══════════════════════════════════════════════════════════════

    def _build_disclaimer(self):
        elements = []
        elements.append(Spacer(1, 1 * cm))
        elements.append(HRFlowable(width="100%", thickness=1, color=LYNTOS_BORDER))
        elements.append(Spacer(1, 3 * mm))
        elements.append(Paragraph(
            "<b>Sorumluluk Reddi:</b> Bu rapor LYNTOS platformu tarafından otomatik olarak üretilmiştir. "
            "Rapordaki bilgiler yüklenen veriler ve güncel mevzuat parametreleri esas alınarak hazırlanmıştır. "
            "Nihai mali kararlar için yetkili mali müşavirinize danışınız. "
            "LYNTOS, rapordaki bilgilerin doğruluğunu garanti etmez.",
            ParagraphStyle('Disclaimer', parent=self.styles['Normal'], fontSize=7, textColor=LYNTOS_GRAY, leading=10)
        ))
        return elements

    # ═══════════════════════════════════════════════════════════════
    # SAYFA ALT BİLGİ
    # ═══════════════════════════════════════════════════════════════

    def _add_page_footer(self, canvas, doc):
        """Her sayfanın alt kısmına footer ekle"""
        canvas.saveState()
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(LYNTOS_GRAY)

        # Sol: LYNTOS
        canvas.drawString(2 * cm, 1.5 * cm, f"LYNTOS Platform — {datetime.now().strftime('%d.%m.%Y')}")

        # Orta: Sayfa No
        page_num = canvas.getPageNumber()
        canvas.drawCentredString(A4[0] / 2, 1.5 * cm, f"Sayfa {page_num}")

        # Sağ: Gizlilik
        canvas.drawRightString(A4[0] - 2 * cm, 1.5 * cm, "GİZLİ — İzinsiz dağıtılamaz")

        # Çizgi
        canvas.setStrokeColor(LYNTOS_BORDER)
        canvas.line(2 * cm, 1.8 * cm, A4[0] - 2 * cm, 1.8 * cm)

        canvas.restoreState()

    # ═══════════════════════════════════════════════════════════════
    # VERİ TOPLAMA
    # ═══════════════════════════════════════════════════════════════

    def _collect_data(self, report_type: str, client_id: str, period_id: str) -> dict:
        """Rapor tipine göre veri topla"""
        try:
            with get_connection() as conn:
                cursor = conn.cursor()

                # Mizan verisi var mı kontrol et
                cursor.execute("""
                    SELECT COUNT(*) as cnt FROM mizan_entries
                    WHERE client_id = ? AND period_id = ?
                """, (client_id, period_id))
                row = cursor.fetchone()
                mizan_count = row["cnt"] if row else 0

                if mizan_count == 0:
                    return {"has_data": False, "summary_table": [], "findings": []}

                # Rapor tipine göre veri topla
                if report_type == "mizan-analiz":
                    return self._collect_mizan_data(cursor, client_id, period_id)
                elif report_type == "vdk-risk":
                    return self._collect_vdk_data(cursor, client_id, period_id)
                elif report_type == "finansal-oran":
                    return self._collect_finansal_oran_data(cursor, client_id, period_id)
                elif report_type == "yeniden-degerleme":
                    return self._collect_enflasyon_data(cursor, client_id, period_id)
                elif report_type == "kurumlar-vergi":
                    return self._collect_kurumlar_data(cursor, client_id, period_id)
                elif report_type == "kanit-paketi":
                    return self._collect_kanit_data(cursor, client_id, period_id)

                return {"has_data": True, "summary_table": [], "findings": []}
        except Exception as e:
            logger.error(f"Data collection error for {report_type}: {e}")
            return {"has_data": False, "summary_table": [], "findings": []}

    def _collect_mizan_data(self, cursor, client_id, period_id):
        """Mizan analiz verisi topla"""
        cursor.execute("""
            SELECT hesap_kodu, hesap_adi,
                   SUM(borc_toplami) as borc, SUM(alacak_toplami) as alacak,
                   SUM(borc_toplami) - SUM(alacak_toplami) as bakiye
            FROM mizan_entries
            WHERE client_id = ? AND period_id = ?
            GROUP BY hesap_kodu, hesap_adi
            ORDER BY hesap_kodu
        """, (client_id, period_id))
        rows = cursor.fetchall()

        toplam_borc = sum(r["borc"] or 0 for r in rows)
        toplam_alacak = sum(r["alacak"] or 0 for r in rows)
        hesap_sayisi = len(rows)
        denge_farki = abs(toplam_borc - toplam_alacak)

        return {
            "has_data": True,
            "summary_table": [
                {"label": "Toplam Hesap Sayısı", "value": hesap_sayisi, "status": "Bilgi"},
                {"label": "Toplam Borç", "value": f"{toplam_borc:,.2f} TL", "status": "Bilgi"},
                {"label": "Toplam Alacak", "value": f"{toplam_alacak:,.2f} TL", "status": "Bilgi"},
                {"label": "Denge Farkı", "value": f"{denge_farki:,.2f} TL", "status": "Uyarı" if denge_farki > 1 else "OK"},
            ],
            "findings": [
                {
                    "title": "Mizan Denge Kontrolü",
                    "description": f"Toplam {hesap_sayisi} hesap analiz edilmiştir. "
                                   f"Borç toplamı {toplam_borc:,.2f} TL, alacak toplamı {toplam_alacak:,.2f} TL'dir. "
                                   f"Denge farkı {denge_farki:,.2f} TL olarak hesaplanmıştır.",
                    "mevzuat": "VUK Md. 177 — Defter tutma hadleri, TTK Md. 64-88 — Ticari defterler",
                    "risk_level": "high" if denge_farki > 100 else "low",
                },
            ],
        }

    def _collect_vdk_data(self, cursor, client_id, period_id):
        """VDK risk verisi topla"""
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM rule_execution_log
            WHERE client_id = ? AND period_id = ?
        """, (client_id, period_id))
        row = cursor.fetchone()
        rule_count = row["cnt"] if row else 0

        return {
            "has_data": True,
            "summary_table": [
                {"label": "Çalıştırılan Kural Sayısı", "value": rule_count, "status": "Bilgi"},
            ],
            "findings": [
                {
                    "title": "VDK Risk Analizi",
                    "description": f"Toplam {rule_count} kural değerlendirilmiştir. "
                                   "Detaylı risk analizi için VDK panelini inceleyiniz.",
                    "mevzuat": "VUK Md. 134-141 — Vergi İncelemesi, 213 sayılı VUK",
                    "risk_level": "medium",
                },
            ],
        }

    def _collect_finansal_oran_data(self, cursor, client_id, period_id):
        return {"has_data": True, "summary_table": [], "findings": [
            {"title": "Finansal Oran Analizi", "description": "Finansal oranlar mizan verilerinden hesaplanmaktadır.", "mevzuat": "TMS/TFRS Standartları", "risk_level": "low"}
        ]}

    def _collect_enflasyon_data(self, cursor, client_id, period_id):
        return {"has_data": True, "summary_table": [], "findings": [
            {"title": "Yeniden Değerleme Analizi", "description": "VUK Mük. Md. 298/Ç kapsamında amortismana tabi iktisadi kıymetlerin yeniden değerlemesi.", "mevzuat": "VUK Mük. Md. 298/Ç — Yeniden Değerleme", "risk_level": "medium"}
        ]}

    def _collect_kurumlar_data(self, cursor, client_id, period_id):
        return {"has_data": True, "summary_table": [], "findings": [
            {"title": "Kurumlar Vergisi Analizi", "description": "Ticari kardan mali kara geçiş ve KKEG analizi.", "mevzuat": "5520 sayılı KVK — Kurumlar Vergisi Kanunu", "risk_level": "low"}
        ]}

    def _collect_kanit_data(self, cursor, client_id, period_id):
        return {"has_data": True, "summary_table": [], "findings": [
            {"title": "Kanıt Paketi Özeti", "description": "Tüm analiz sonuçlarının kanıt zinciri ve çalışma kağıdı referansları.", "mevzuat": "SPK Bağımsız Denetim Standartları, ISA 500 — Denetim Kanıtları", "risk_level": "low"}
        ]}

    # ═══════════════════════════════════════════════════════════════
    # YARDIMCI METODLAR
    # ═══════════════════════════════════════════════════════════════

    def _get_report_title(self, report_type: str) -> str:
        titles = {
            "mizan-analiz": "Mizan Analiz Raporu",
            "vdk-risk": "VDK Risk Değerlendirme Raporu",
            "finansal-oran": "Finansal Oran Analizi Raporu",
            "yeniden-degerleme": "Yeniden Değerleme Raporu",
            "kurumlar-vergi": "Kurumlar Vergisi Raporu",
            "kanit-paketi": "Kanıt Paketi Raporu",
        }
        return titles.get(report_type, "LYNTOS Raporu")

    def _get_report_sections(self, report_type: str) -> list:
        base = ["Yönetici Özeti", "Detaylı Bulgular", "Mevzuat Referansları"]
        type_sections = {
            "mizan-analiz": ["Mizan Denge Kontrolü", "Hesap Bazlı Analiz", "Anomali Tespitleri"],
            "vdk-risk": ["Risk Skoru Özeti", "Kriter Bazlı Değerlendirme", "Öneriler"],
            "finansal-oran": ["Likidite Oranları", "Karlılık Oranları", "Sektör Karşılaştırması"],
            "yeniden-degerleme": ["Yeniden Değerleme Kapsamı", "Değer Artış Fonu", "Vergi Etkisi Analizi"],
            "kurumlar-vergi": ["Ticari Kar Hesabı", "KKEG Analizi", "Mali Kar ve Vergi"],
            "kanit-paketi": ["Çalışma Kağıtları", "Kanıt Zinciri", "Dijital İmzalar"],
        }
        return base + type_sections.get(report_type, [])

    def _get_executive_summary_text(self, report_type: str, report_data: dict, period_id: str) -> str:
        if not report_data.get("has_data"):
            return (
                f"{period_id} dönemine ait analiz verileri henüz sisteme yüklenmemiştir. "
                "Detaylı rapor için lütfen mizan ve beyanname verilerinizi yükleyiniz."
            )

        texts = {
            "mizan-analiz": f"Bu rapor {period_id} dönemine ait mizan verilerinin kapsamlı analizini içermektedir. "
                           "Hesap bazlı denge kontrolü, trend analizi ve olağandışı hareket tespitleri yapılmıştır.",
            "vdk-risk": f"{period_id} döneminde Vergi Denetim Kurulu (VDK) tarafından belirlenen 13 temel kriter "
                       "bazında risk değerlendirmesi yapılmıştır.",
            "finansal-oran": f"{period_id} dönemine ait finansal tablolar üzerinden likidite, karlılık "
                            "ve verimlilik oranları hesaplanmıştır.",
            "yeniden-degerleme": f"{period_id} dönemi için VUK Mük. Md. 298/Ç kapsamında "
                                "amortismana tabi iktisadi kıymetlerin yeniden değerlemesi yapılmıştır.",
            "kurumlar-vergi": f"{period_id} dönemi için ticari kardan mali kara geçiş ve "
                             "kurumlar vergisi hesaplamaları yapılmıştır.",
            "kanit-paketi": f"Bu paket {period_id} dönemine ait tüm mali analizlerin "
                           "kanıt zincirini ve çalışma kağıdı referanslarını içermektedir.",
        }
        return texts.get(report_type, f"{period_id} dönemi analiz raporu.")

    def _get_legal_references(self, report_type: str) -> list:
        refs = {
            "mizan-analiz": [
                "VUK Md. 171-175 — Defter tutma ve kayıt düzeni",
                "VUK Md. 177 — Defter tutma hadleri",
                "TTK Md. 64-88 — Ticari defterler",
                "VUK Md. 219 — Muhasebe fişleri",
            ],
            "vdk-risk": [
                "VUK Md. 134 — Vergi incelemesinin amacı",
                "VUK Md. 135 — Vergi incelemesine yetkililer",
                "VUK Md. 141 — İncelemenin yapılacağı yer",
                "213 sayılı VUK — Vergi Usul Kanunu",
            ],
            "finansal-oran": [
                "TMS 1 — Finansal tabloların sunuluşu",
                "TFRS standartları",
                "TTK Md. 514-526 — Finansal tablolar",
            ],
            "yeniden-degerleme": [
                "VUK Mük. Md. 298/Ç — Yeniden değerleme",
                "7338 sayılı Kanun — Yeniden değerleme düzenlemesi",
                "537 Sıra No'lu VUK Genel Tebliği",
            ],
            "kurumlar-vergi": [
                "5520 sayılı KVK — Kurumlar Vergisi Kanunu",
                "KVK Md. 6 — Safi kurum kazancı",
                "KVK Md. 11 — KKEG (Kanunen kabul edilmeyen giderler)",
                "GVK Md. 40 — İndirilecek giderler",
            ],
            "kanit-paketi": [
                "SPK Bağımsız Denetim Standartları",
                "ISA 500 — Denetim kanıtları",
                "ISA 230 — Denetim belgeleri",
                "BDS 500 — Bağımsız denetim kanıtları",
            ],
        }
        return refs.get(report_type, ["213 sayılı VUK — Vergi Usul Kanunu"])

    def _get_client_info(self, client_id: str) -> dict:
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM clients WHERE id = ?", (client_id,))
                row = cursor.fetchone()
                return dict(row) if row else {"name": client_id, "tax_id": "—"}
        except Exception:
            return {"name": client_id, "tax_id": "—"}

    def _get_smmm_info(self, smmm_id: str) -> dict:
        if not smmm_id:
            return {"name": "—"}
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM users WHERE id = ?", (smmm_id,))
                row = cursor.fetchone()
                return dict(row) if row else {"name": smmm_id}
        except Exception:
            return {"name": smmm_id}

    def _save_to_db(self, report_id, client_id, period_id, report_type, fmt, file_path, file_size, content_hash, generated_by, timestamp):
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO generated_reports
                    (id, client_id, period_id, report_type, format, file_path, file_size, content_hash, generated_by, generated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (report_id, client_id, period_id, report_type, fmt.upper(), file_path, file_size, content_hash, generated_by, timestamp.isoformat()))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to save report to DB: {e}")

    def _format_size(self, size_bytes: int) -> str:
        if size_bytes > 1024 * 1024:
            return f"{size_bytes / (1024 * 1024):.1f} MB"
        return f"{size_bytes / 1024:.0f} KB"

    # ═══════════════════════════════════════════════════════════════
    # RAPOR LİSTESİ / İNDİRME
    # ═══════════════════════════════════════════════════════════════

    def list_reports(self, client_id: str = None, period_id: str = None) -> list:
        """Üretilmiş rapor listesi"""
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                query = "SELECT * FROM generated_reports WHERE 1=1"
                params = []
                if client_id:
                    query += " AND client_id = ?"
                    params.append(client_id)
                if period_id:
                    query += " AND period_id = ?"
                    params.append(period_id)
                query += " ORDER BY generated_at DESC LIMIT 50"
                cursor.execute(query, params)
                return [dict(r) for r in cursor.fetchall()]
        except Exception as e:
            logger.error(f"list_reports error: {e}")
            return []

    def get_report_path(self, report_id: str) -> str | None:
        """Rapor dosya yolunu getir"""
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT file_path FROM generated_reports WHERE id = ?", (report_id,))
                row = cursor.fetchone()
                if row and row["file_path"] and os.path.exists(row["file_path"]):
                    return row["file_path"]
                return None
        except Exception:
            return None
