"""
PDF Export for Inspector Questions Preparation
Sprint 8.1 - LYNTOS V2

Generates a printable preparation document with Turkish character support.
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
from typing import List, Dict, Any
from datetime import datetime
import os

# Try to register Turkish-compatible font (DejaVu supports Turkish)
DEFAULT_FONT = 'Helvetica'
DEFAULT_FONT_BOLD = 'Helvetica-Bold'

# Try common font paths for Turkish support
font_paths = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
    '/Library/Fonts/Arial Unicode.ttf',
]

for path in font_paths:
    if os.path.exists(path):
        try:
            if 'Bold' in path:
                pdfmetrics.registerFont(TTFont('DejaVu-Bold', path))
                DEFAULT_FONT_BOLD = 'DejaVu-Bold'
            else:
                pdfmetrics.registerFont(TTFont('DejaVu', path))
                DEFAULT_FONT = 'DejaVu'
        except Exception:
            pass


class InspectorPrepPDFExporter:
    """Generate PDF for inspector question preparation"""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_styles()

    def _setup_styles(self):
        """Setup custom paragraph styles"""

        self.styles.add(ParagraphStyle(
            name='TurkishTitle',
            fontName=DEFAULT_FONT_BOLD,
            fontSize=18,
            spaceAfter=20,
            textColor=colors.HexColor('#1a1f36')
        ))

        self.styles.add(ParagraphStyle(
            name='TurkishSubtitle',
            fontName=DEFAULT_FONT,
            fontSize=11,
            spaceAfter=5,
            textColor=colors.HexColor('#697386')
        ))

        self.styles.add(ParagraphStyle(
            name='TurkishHeading',
            fontName=DEFAULT_FONT_BOLD,
            fontSize=14,
            spaceBefore=15,
            spaceAfter=10,
            textColor=colors.HexColor('#635bff')
        ))

        self.styles.add(ParagraphStyle(
            name='TurkishQuestion',
            fontName=DEFAULT_FONT_BOLD,
            fontSize=12,
            spaceBefore=10,
            spaceAfter=5,
            textColor=colors.HexColor('#1a1f36'),
            leftIndent=20
        ))

        self.styles.add(ParagraphStyle(
            name='TurkishBody',
            fontName=DEFAULT_FONT,
            fontSize=10,
            spaceBefore=3,
            spaceAfter=3,
            textColor=colors.HexColor('#697386'),
            leftIndent=30
        ))

        self.styles.add(ParagraphStyle(
            name='TurkishNote',
            fontName=DEFAULT_FONT,
            fontSize=10,
            spaceBefore=5,
            spaceAfter=10,
            textColor=colors.HexColor('#1a1f36'),
            leftIndent=30,
            backColor=colors.HexColor('#f6f9fc'),
            borderPadding=8
        ))

        self.styles.add(ParagraphStyle(
            name='TurkishApproach',
            fontName=DEFAULT_FONT,
            fontSize=9,
            spaceBefore=2,
            spaceAfter=2,
            textColor=colors.HexColor('#0caf60'),
            leftIndent=40
        ))

        self.styles.add(ParagraphStyle(
            name='TurkishAvoid',
            fontName=DEFAULT_FONT,
            fontSize=9,
            spaceBefore=2,
            spaceAfter=2,
            textColor=colors.HexColor('#cd3d64'),
            leftIndent=40
        ))

    def generate(
        self,
        client_name: str,
        period: str,
        alarms: List[Dict],
        notes: Dict[str, str],
        document_status: Dict[str, str]
    ) -> bytes:
        """
        Generate PDF document

        Args:
            client_name: Client display name
            period: Analysis period
            alarms: List of triggered alarms with questions
            notes: Dict of {rule_id-question_index: note_text}
            document_status: Dict of {doc_id: status}

        Returns:
            PDF bytes
        """

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )

        story = []

        # Title
        story.append(Paragraph(
            "VDK Inceleme Hazirlik Dosyasi",
            self.styles['TurkishTitle']
        ))

        # Client info
        story.append(Paragraph(
            f"Mukellef: {client_name}",
            self.styles['TurkishSubtitle']
        ))
        story.append(Paragraph(
            f"Donem: {period}",
            self.styles['TurkishSubtitle']
        ))
        story.append(Paragraph(
            f"Olusturulma Tarihi: {datetime.now().strftime('%d.%m.%Y %H:%M')}",
            self.styles['TurkishSubtitle']
        ))
        story.append(Spacer(1, 15))

        # Summary table
        total_questions = sum(len(a.get('inspector_questions', [])) for a in alarms)
        docs_ready = len([s for s in document_status.values() if s in ['uploaded', 'verified']])

        summary_data = [
            ['Toplam Alarm', 'Toplam Soru', 'Hazirlanan Not', 'Belge Durumu'],
            [
                str(len(alarms)),
                str(total_questions),
                str(len(notes)),
                f"{docs_ready} / {len(document_status)}" if document_status else "0 / 0"
            ]
        ]

        summary_table = Table(summary_data, colWidths=[4*cm, 4*cm, 4*cm, 4*cm])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#635bff')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), DEFAULT_FONT_BOLD),
            ('FONTNAME', (0, 1), (-1, -1), DEFAULT_FONT),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f6f9fc')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e3e8ee'))
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 25))

        # Each alarm
        for alarm in alarms:
            rule_id = alarm.get('rule_id', '')
            rule_name = alarm.get('rule_name', '')
            severity = alarm.get('severity', 'medium')

            severity_icons = {
                'critical': '[KRITIK]',
                'high': '[YUKSEK]',
                'medium': '[ORTA]',
                'low': '[DUSUK]'
            }

            # Alarm header
            story.append(Paragraph(
                f"{severity_icons.get(severity, '')} {rule_id}: {rule_name}",
                self.styles['TurkishHeading']
            ))

            # Finding
            if alarm.get('finding_summary'):
                story.append(Paragraph(
                    f"Tespit: {alarm['finding_summary']}",
                    self.styles['TurkishBody']
                ))

            # Questions
            questions = alarm.get('inspector_questions', [])
            templates = alarm.get('answer_templates', [])

            for i, question in enumerate(questions):
                story.append(Paragraph(
                    f"Soru {i+1}: \"{question}\"",
                    self.styles['TurkishQuestion']
                ))

                # Get template if exists
                template = next((t for t in templates if t.get('question_index') == i), None)

                if template:
                    # Suggested approaches
                    story.append(Paragraph(
                        "Tavsiye edilen yaklasimlar:",
                        self.styles['TurkishBody']
                    ))
                    for approach in template.get('suggested_approaches', [])[:3]:
                        story.append(Paragraph(
                            f"+ {approach}",
                            self.styles['TurkishApproach']
                        ))

                    # Avoid phrases
                    story.append(Paragraph(
                        "Kacinilacak ifadeler:",
                        self.styles['TurkishBody']
                    ))
                    for phrase in template.get('avoid_phrases', [])[:2]:
                        story.append(Paragraph(
                            f"x \"{phrase}\"",
                            self.styles['TurkishAvoid']
                        ))

                # User's note
                note_key = f"{rule_id}-{i}"
                if note_key in notes and notes[note_key]:
                    story.append(Spacer(1, 5))
                    story.append(Paragraph(
                        f"Hazirlik Notum: {notes[note_key]}",
                        self.styles['TurkishNote']
                    ))

                story.append(Spacer(1, 8))

            # Required documents
            docs = alarm.get('required_documents', [])
            if docs:
                story.append(Paragraph(
                    "Gerekli Belgeler:",
                    self.styles['TurkishBody']
                ))
                for doc in docs:
                    doc_id = doc.get('id', '')
                    status = document_status.get(doc_id, 'pending')
                    status_icon = '[X]' if status in ['uploaded', 'verified'] else '[ ]'
                    story.append(Paragraph(
                        f"  {status_icon} {doc.get('name', '')}",
                        self.styles['TurkishBody']
                    ))

            story.append(Spacer(1, 20))

        # Footer note
        story.append(Spacer(1, 20))
        story.append(Paragraph(
            "Bu belge LYNTOS tarafindan otomatik olusturulmustur.",
            self.styles['TurkishSubtitle']
        ))

        # Build PDF
        doc.build(story)

        return buffer.getvalue()


def generate_inspector_prep_pdf(
    client_name: str,
    period: str,
    alarms: List[Dict],
    notes: Dict[str, str],
    document_status: Dict[str, str]
) -> bytes:
    """Convenience function to generate PDF"""
    exporter = InspectorPrepPDFExporter()
    return exporter.generate(client_name, period, alarms, notes, document_status)
