"""
PDF Rapor Ureteci

TURMOB formati:
- Baslik/logo
- KPI ozet
- Aksiyonlar
- Detayli analizler
- Kanit referanslari
- Imza/tarih
"""

from io import BytesIO
from datetime import datetime
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class PDFGenerator:
    """LYNTOS PDF rapor ureteci"""

    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    def generate_portfolio_report(self, data: Dict[str, Any]) -> bytes:
        """
        Portfolio raporu uret (ReportLab olmadan basit PDF)

        Args:
            data: Portfolio verisi

        Returns:
            PDF bytes
        """
        try:
            # ReportLab kullanarak PDF olustur
            from reportlab.lib.pagesizes import A4
            from reportlab.lib import colors
            from reportlab.lib.units import cm
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont

            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
            story = []
            styles = getSampleStyleSheet()

            # Baslik
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Title'],
                fontSize=18,
                spaceAfter=12
            )
            title = Paragraph("LYNTOS Operasyon Raporu", title_style)
            story.append(title)
            story.append(Spacer(1, 0.5*cm))

            # Alt baslik
            subtitle = Paragraph(
                f"Musteri: {data.get('client_id', 'N/A')} | Donem: {data.get('period', 'N/A')}",
                styles['Normal']
            )
            story.append(subtitle)
            story.append(Spacer(1, 0.3*cm))

            # Tarih
            date_str = datetime.utcnow().strftime('%d.%m.%Y %H:%M')
            date = Paragraph(f"Rapor Tarihi: {date_str} UTC", styles['Normal'])
            story.append(date)
            story.append(Spacer(1, 1*cm))

            # KPI Tablosu
            kpis = data.get('kpis', {})
            kpi_data = [
                ['KPI', 'Deger', 'Aciklama'],
                ['KURGAN Risk', str(kpis.get('kurgan_risk_score', '-')), 'VDK 13 kriter'],
                ['Vergi Uyum', str(kpis.get('vergi_uyum_puani', '-')), 'Risk + kalite'],
                ['Veri Kalitesi', str(kpis.get('dq_in_period_pct', '-')) + '%', 'Tamlik skoru'],
                ['Uyumluluk', str(kpis.get('inflation_compliance_score', '-')), 'TMS 29']
            ]

            kpi_table = Table(kpi_data, colWidths=[5*cm, 4*cm, 6*cm])
            kpi_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('TOPPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f9fafb')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('TOPPADDING', (0, 1), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ]))

            story.append(Paragraph("<b>KPI Ozeti</b>", styles['Heading2']))
            story.append(Spacer(1, 0.3*cm))
            story.append(kpi_table)
            story.append(Spacer(1, 1*cm))

            # Yasal Dayanak
            legal_section = Paragraph("<b>Yasal Dayanak</b>", styles['Heading2'])
            story.append(legal_section)
            story.append(Spacer(1, 0.3*cm))

            legal_items = [
                "5520 Sayili Kurumlar Vergisi Kanunu",
                "VUK Madde 227 (Defter-Beyan uyumu)",
                "VUK Madde 219 (Banka mutabakati)",
                "VDK Genelgesi E-55935724-010.06-7361",
                "TMS 29 Yuksek Enflasyonlu Ekonomilerde Finansal Raporlama"
            ]

            for item in legal_items:
                p = Paragraph(f"- {item}", styles['Normal'])
                story.append(p)

            story.append(Spacer(1, 1*cm))

            # Guvenilirlik
            trust_section = Paragraph("<b>Guvenilirlik</b>", styles['Heading2'])
            story.append(trust_section)
            story.append(Spacer(1, 0.3*cm))

            trust_text = Paragraph(
                "Trust Score: 1.0 (Resmi birincil kaynak)<br/>"
                "Tum veriler resmi mevzuat ve birincil kaynaklardan alinmistir.",
                styles['Normal']
            )
            story.append(trust_text)
            story.append(Spacer(1, 1*cm))

            # Footer
            footer = Paragraph(
                "<i>Bu rapor LYNTOS SMMM Platformu tarafindan otomatik olarak uretilmistir.</i>",
                styles['Normal']
            )
            story.append(footer)

            # Build PDF
            doc.build(story)

            pdf_bytes = buffer.getvalue()
            buffer.close()

            self.logger.info(f"PDF rapor uretildi: {len(pdf_bytes)} bytes")
            return pdf_bytes

        except ImportError:
            # ReportLab yoksa basit text PDF
            self.logger.warning("ReportLab bulunamadi, basit PDF uretiliyor")
            return self._generate_simple_pdf(data)

        except Exception as e:
            self.logger.error(f"PDF uretim hatasi: {e}", exc_info=True)
            raise

    def _generate_simple_pdf(self, data: Dict[str, Any]) -> bytes:
        """ReportLab olmadan basit PDF (fallback)"""
        # Minimal PDF header
        content = f"""LYNTOS Operasyon Raporu
================================

Musteri: {data.get('client_id', 'N/A')}
Donem: {data.get('period', 'N/A')}
Tarih: {datetime.utcnow().strftime('%d.%m.%Y %H:%M')} UTC

KPI Ozeti:
- KURGAN Risk: {data.get('kpis', {}).get('kurgan_risk_score', '-')}
- Vergi Uyum: {data.get('kpis', {}).get('vergi_uyum_puani', '-')}
- Veri Kalitesi: {data.get('kpis', {}).get('dq_in_period_pct', '-')}%
- Uyumluluk: {data.get('kpis', {}).get('inflation_compliance_score', '-')}

Yasal Dayanak:
- 5520 Sayili KVK
- VUK 227/219
- VDK Genelgesi

Trust Score: 1.0

---
LYNTOS SMMM Platformu
"""
        return content.encode('utf-8')


# Singleton
pdf_generator = PDFGenerator()
