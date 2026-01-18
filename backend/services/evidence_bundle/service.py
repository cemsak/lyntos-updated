"""
Evidence Bundle Service
Collects evidence from feed items, generates PDF report, creates ZIP bundle
LYNTOS V1 Critical Component
"""
import os
import json
import zipfile
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path

from schemas.feed import FeedItem, EvidenceRef, FeedAction, FeedSeverity, EvidenceStatus, ActionStatus
from schemas.evidence_bundle import EvidenceBundleManifest, BundleSummary


class EvidenceBundleService:
    """
    Evidence Bundle generation service

    Responsibilities:
    1. Collect evidence_refs from feed items (CRITICAL/HIGH priority)
    2. Generate PDF report with evidence list + missing docs + actions
    3. Create ZIP bundle with manifest + PDF + available evidence files
    """

    def __init__(self, output_dir: str = "/tmp/lyntos_evidence_bundles"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def collect_evidence(
        self,
        feed_items: List[FeedItem]
    ) -> Tuple[List[EvidenceRef], List[FeedAction], Dict[str, int]]:
        """
        Collect all evidence refs and actions from feed items
        Deduplicates by ref_id

        Returns:
            Tuple of (evidence_list, action_list, stats_dict)
        """
        evidence_map: Dict[str, EvidenceRef] = {}
        action_map: Dict[str, FeedAction] = {}
        stats = {
            "critical_items": 0,
            "high_items": 0,
            "medium_items": 0
        }

        for item in feed_items:
            # Count by severity
            if item.severity == FeedSeverity.CRITICAL:
                stats["critical_items"] += 1
            elif item.severity == FeedSeverity.HIGH:
                stats["high_items"] += 1
            elif item.severity == FeedSeverity.MEDIUM:
                stats["medium_items"] += 1

            # Collect evidence (dedupe by ref_id)
            for evidence in item.evidence_refs:
                if evidence.ref_id not in evidence_map:
                    evidence_map[evidence.ref_id] = evidence

            # Collect actions (dedupe by action_id)
            for action in item.actions:
                if action.action_id not in action_map:
                    action_map[action.action_id] = action

        return list(evidence_map.values()), list(action_map.values()), stats

    def calculate_summary(
        self,
        evidence_list: List[EvidenceRef],
        action_list: List[FeedAction],
        stats: Dict[str, int]
    ) -> BundleSummary:
        """Calculate bundle summary statistics"""
        total = len(evidence_list)
        available = sum(1 for e in evidence_list if e.status == EvidenceStatus.AVAILABLE)
        missing = sum(1 for e in evidence_list if e.status == EvidenceStatus.MISSING)
        pending_actions = sum(1 for a in action_list if a.status == ActionStatus.PENDING)

        return BundleSummary(
            total_evidence=total,
            available_evidence=available,
            missing_evidence=missing,
            completion_rate=(available / total * 100) if total > 0 else 100.0,
            critical_items=stats.get("critical_items", 0),
            high_items=stats.get("high_items", 0),
            total_actions=len(action_list),
            pending_actions=pending_actions
        )

    def generate_pdf(
        self,
        manifest: EvidenceBundleManifest
    ) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
        """
        Generate PDF report from manifest

        Returns:
            Tuple of (pdf_path, error_dict)
        """
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.units import cm
        except ImportError:
            return None, {
                "error": "reportlab_not_installed",
                "missing_data": ["reportlab"],
                "actions": ["pip install reportlab"],
                "reason": "PDF olusturmak icin reportlab kutuphanesi gerekli"
            }

        try:
            pdf_filename = f"{manifest.bundle_id}.pdf"
            pdf_path = self.output_dir / pdf_filename

            doc = SimpleDocTemplate(
                str(pdf_path),
                pagesize=A4,
                rightMargin=2*cm,
                leftMargin=2*cm,
                topMargin=2*cm,
                bottomMargin=2*cm
            )

            styles = getSampleStyleSheet()
            elements = []

            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=16,
                spaceAfter=20,
                textColor=colors.HexColor('#1a365d')
            )
            elements.append(Paragraph("LYNTOS Kanit Paketi Raporu", title_style))
            elements.append(Spacer(1, 10))

            # Meta info
            meta_style = styles['Normal']
            elements.append(Paragraph(f"<b>Paket ID:</b> {manifest.bundle_id}", meta_style))
            elements.append(Paragraph(f"<b>SMMM:</b> {manifest.smmm_id}", meta_style))
            elements.append(Paragraph(f"<b>Mukellef:</b> {manifest.client_id}", meta_style))
            elements.append(Paragraph(f"<b>Donem:</b> {manifest.period}", meta_style))
            elements.append(Paragraph(f"<b>Olusturma:</b> {manifest.generated_at.strftime('%d.%m.%Y %H:%M')}", meta_style))
            elements.append(Spacer(1, 20))

            # Summary table
            elements.append(Paragraph("Ozet", styles['Heading2']))
            summary = manifest.summary
            summary_data = [
                ["Metrik", "Deger"],
                ["Toplam Kanit", str(summary.total_evidence)],
                ["Mevcut Kanit", str(summary.available_evidence)],
                ["Eksik Kanit", str(summary.missing_evidence)],
                ["Tamamlanma Orani", f"%{summary.completion_rate:.1f}"],
                ["Kritik Bulgu", str(summary.critical_items)],
                ["Yuksek Oncelikli Bulgu", str(summary.high_items)],
                ["Bekleyen Aksiyon", str(summary.pending_actions)]
            ]

            summary_table = Table(summary_data, colWidths=[8*cm, 4*cm])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f7fafc')),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
                ('PADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(summary_table)
            elements.append(Spacer(1, 20))

            # Evidence list
            elements.append(Paragraph("Kanit Listesi", styles['Heading2']))
            if manifest.evidence_list:
                ev_data = [["ID", "Kaynak", "Aciklama", "Durum"]]
                for ev in manifest.evidence_list:
                    status_text = "Mevcut" if ev.status == EvidenceStatus.AVAILABLE else "Eksik"
                    desc = ev.description[:35] + "..." if len(ev.description) > 35 else ev.description
                    ev_data.append([ev.ref_id, ev.source_type, desc, status_text])

                ev_table = Table(ev_data, colWidths=[3*cm, 2.5*cm, 7*cm, 2.5*cm])
                ev_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 8),
                    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
                    ('PADDING', (0, 0), (-1, -1), 6),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')])
                ]))
                elements.append(ev_table)
            else:
                elements.append(Paragraph("Kanit bulunamadi.", meta_style))

            elements.append(Spacer(1, 20))

            # Action items
            if manifest.action_items:
                elements.append(Paragraph("Gerekli Aksiyonlar", styles['Heading2']))
                for idx, action in enumerate(manifest.action_items, 1):
                    responsible = f" ({action.responsible})" if action.responsible else ""
                    elements.append(Paragraph(
                        f"{idx}. {action.description}{responsible}",
                        meta_style
                    ))
                elements.append(Spacer(1, 20))

            # Footer
            elements.append(Spacer(1, 30))
            footer_style = ParagraphStyle(
                'Footer',
                parent=styles['Italic'],
                fontSize=8,
                textColor=colors.HexColor('#718096')
            )
            elements.append(Paragraph(
                "Bu rapor LYNTOS tarafindan otomatik olarak olusturulmustur. "
                "Kanit paketi, SMMM onayi ile mukellefe teslim edilebilir.",
                footer_style
            ))

            doc.build(elements)
            return str(pdf_path), None

        except Exception as e:
            return None, {
                "error": str(e),
                "missing_data": [],
                "actions": ["Check PDF generation logs"],
                "reason": f"PDF olusturma hatasi: {str(e)}"
            }

    def create_zip_bundle(
        self,
        manifest: EvidenceBundleManifest,
        pdf_path: Optional[str],
        evidence_files_dir: Optional[str] = None
    ) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
        """
        Create the final ZIP bundle

        Contents:
        - manifest.json
        - report.pdf (if generated)
        - evidence/ folder with available evidence files
        """
        try:
            zip_path = self.output_dir / f"{manifest.bundle_id}.zip"

            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                # Add manifest
                manifest_json = json.dumps(manifest.to_dict(), indent=2, ensure_ascii=False)
                zf.writestr('manifest.json', manifest_json)

                # Add PDF
                if pdf_path and os.path.exists(pdf_path):
                    zf.write(pdf_path, 'report.pdf')

                # Add evidence files if directory provided
                if evidence_files_dir:
                    ev_dir = Path(evidence_files_dir)
                    if ev_dir.exists():
                        for ev in manifest.evidence_list:
                            if ev.status == EvidenceStatus.AVAILABLE and ev.file_path:
                                file_path = ev_dir / ev.file_path
                                if file_path.exists():
                                    zf.write(file_path, f"evidence/{ev.file_path}")

            return str(zip_path), None

        except Exception as e:
            return None, {
                "error": str(e),
                "missing_data": [],
                "actions": ["Check file system permissions"],
                "reason": f"ZIP olusturma hatasi: {str(e)}"
            }

    def generate_bundle(
        self,
        smmm_id: str,
        client_id: str,
        period: str,
        feed_items: List[FeedItem],
        evidence_files_dir: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main entry point: Generate complete evidence bundle

        Returns ResponseEnvelope-compatible dict
        """
        # Collect evidence and actions
        evidence_list, action_list, stats = self.collect_evidence(feed_items)

        # Calculate summary
        summary = self.calculate_summary(evidence_list, action_list, stats)

        # Create manifest
        manifest = EvidenceBundleManifest(
            bundle_id=EvidenceBundleManifest.generate_id(client_id, period),
            smmm_id=smmm_id,
            client_id=client_id,
            period=period,
            generated_at=datetime.now(),
            summary=summary,
            evidence_list=evidence_list,
            action_items=action_list,
            source_feed_ids=[item.id for item in feed_items]
        )

        # Generate PDF
        pdf_path, pdf_error = self.generate_pdf(manifest)
        if pdf_path:
            manifest.pdf_filename = os.path.basename(pdf_path)

        # Create ZIP
        zip_path, zip_error = self.create_zip_bundle(manifest, pdf_path, evidence_files_dir)

        # Build response
        response: Dict[str, Any] = {
            "schema": {
                "name": "EvidenceBundleResponse",
                "version": "1.0.0",
                "generated_at": datetime.now().isoformat()
            },
            "meta": {
                "smmm_id": smmm_id,
                "client_id": client_id,
                "period": period,
                "request_id": manifest.bundle_id,
                "trust_level": "system_generated"
            },
            "data": {
                "bundle_id": manifest.bundle_id,
                "summary": summary.to_dict(),
                "pdf_path": pdf_path,
                "zip_path": zip_path,
                "manifest": manifest.to_dict()
            },
            "errors": [],
            "warnings": []
        }

        # Add errors if any
        if pdf_error:
            response["errors"].append(pdf_error)
        if zip_error:
            response["errors"].append(zip_error)

        # Add warnings for missing evidence
        if summary.missing_evidence > 0:
            missing_refs = [e.ref_id for e in evidence_list if e.status == EvidenceStatus.MISSING]
            response["warnings"].append({
                "type": "missing_evidence",
                "count": summary.missing_evidence,
                "refs": missing_refs,
                "message": f"{summary.missing_evidence} adet eksik kanit var"
            })

        return response


# Singleton
_service: Optional[EvidenceBundleService] = None


def get_evidence_bundle_service() -> EvidenceBundleService:
    global _service
    if _service is None:
        _service = EvidenceBundleService()
    return _service
