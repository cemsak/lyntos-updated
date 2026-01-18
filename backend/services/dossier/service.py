"""
Full Dossier Service
Composes 6-section Big-4 standard dossier from feed items
LYNTOS Anayasa: Evidence-gated, AI-labeled, SMMM authority
"""
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from pathlib import Path

from schemas.feed import (
    FeedItem, EvidenceRef, FeedAction, FeedSeverity, EvidenceStatus, FeedCategory
)
from schemas.brief import ContentSource
from schemas.dossier import (
    FullDossier, DossierSection, DossierSectionType,
    DossierFinding, FindingSeverityLevel, EvidenceListItem,
    ActionPlanItem, RegulatoryImpact, SMMSignatureBlock
)
from services.feed import get_feed_service


class DossierService:
    """
    Full Dossier generation service

    Creates 6-section Big-4 standard dossier:
    1. Executive Summary
    2. Critical Findings
    3. Evidence List
    4. Action Plan
    5. Regulatory Impact
    6. SMMM Signature

    NO DUMMY DATA - returns fail-soft if no data
    AI CANNOT INVENT - only improves existing content
    """

    def __init__(self, output_dir: str = "/tmp/lyntos_dossiers"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.feed_service = get_feed_service()
        self._ai_orchestrator = None

    def _get_ai_orchestrator(self):
        """Lazy load AI orchestrator"""
        if self._ai_orchestrator is None:
            try:
                from services.ai import get_orchestrator
                self._ai_orchestrator = get_orchestrator()
            except ImportError:
                self._ai_orchestrator = None
        return self._ai_orchestrator

    def _severity_to_finding_level(self, severity: FeedSeverity) -> FindingSeverityLevel:
        """Map feed severity to dossier finding level"""
        mapping = {
            FeedSeverity.CRITICAL: FindingSeverityLevel.CRITICAL,
            FeedSeverity.HIGH: FindingSeverityLevel.HIGH,
            FeedSeverity.MEDIUM: FindingSeverityLevel.MEDIUM,
            FeedSeverity.LOW: FindingSeverityLevel.LOW,
            FeedSeverity.INFO: FindingSeverityLevel.OBSERVATION
        }
        return mapping.get(severity, FindingSeverityLevel.MEDIUM)

    def _format_impact(self, item: FeedItem) -> str:
        """Format impact for display"""
        parts = []
        if item.impact.amount_try:
            parts.append(f"{item.impact.amount_try:,.0f} TL tutarinda potansiyel risk")
        if item.impact.pct:
            parts.append(f"%{item.impact.pct:.1f} oraninda sapma")
        if item.impact.points:
            parts.append(f"{item.impact.points} risk puani")
        return ". ".join(parts) if parts else "Etki degerlendirmesi yapilmaktadir."

    def _build_section_1_executive_summary(
        self,
        feed_items: List[FeedItem],
        client_id: str,
        period: str
    ) -> DossierSection:
        """Build Bolum 1: Yonetici Ozeti"""
        # Calculate statistics
        critical_count = sum(1 for f in feed_items if f.severity == FeedSeverity.CRITICAL)
        high_count = sum(1 for f in feed_items if f.severity == FeedSeverity.HIGH)
        total_impact = sum(f.impact.amount_try or 0 for f in feed_items)

        # Calculate evidence stats
        all_evidence = []
        for item in feed_items:
            all_evidence.extend(item.evidence_refs)
        total_evidence = len(all_evidence)
        missing_evidence = sum(1 for e in all_evidence if e.status == EvidenceStatus.MISSING)

        # Determine risk assessment
        if critical_count >= 2:
            risk_assessment = "COK YUKSEK - Acil mudahale gerektirir"
        elif critical_count >= 1 or high_count >= 3:
            risk_assessment = "YUKSEK - Oncelikli aksiyon gerektirir"
        elif high_count >= 1:
            risk_assessment = "ORTA - Takip edilmeli"
        elif feed_items:
            risk_assessment = "DUSUK - Normal izleme"
        else:
            risk_assessment = "BELIRSIZ - Veri bekleniyor"

        summary_text = f"""Bu rapor, {client_id} mukellefinin {period} donemi icin hazirlanmistir.

Donem icerisinde toplam {len(feed_items)} adet bulgu tespit edilmistir:
- {critical_count} adet kritik bulgu
- {high_count} adet yuksek oncelikli bulgu
- Toplam potansiyel etki: {total_impact:,.0f} TL

Kanit durumu: {total_evidence} kanitten {total_evidence - missing_evidence} adedi mevcut, {missing_evidence} adedi eksiktir.

Risk Degerlendirmesi: {risk_assessment}"""

        return DossierSection(
            section_number=1,
            section_type=DossierSectionType.EXECUTIVE_SUMMARY,
            title="Yonetici Ozeti",
            content={
                "summary_text": summary_text,
                "statistics": {
                    "total_findings": len(feed_items),
                    "critical_count": critical_count,
                    "high_count": high_count,
                    "total_impact_try": total_impact,
                    "total_evidence": total_evidence,
                    "missing_evidence": missing_evidence
                },
                "risk_assessment": risk_assessment,
                "period": period,
                "client_id": client_id
            },
            source=ContentSource.SYSTEM
        )

    def _build_section_2_critical_findings(
        self,
        feed_items: List[FeedItem]
    ) -> DossierSection:
        """Build Bolum 2: Kritik Bulgular"""
        findings = []
        all_evidence_refs = []

        # Sort by severity and score
        sorted_items = sorted(
            feed_items,
            key=lambda x: (
                0 if x.severity == FeedSeverity.CRITICAL else
                1 if x.severity == FeedSeverity.HIGH else
                2 if x.severity == FeedSeverity.MEDIUM else 3,
                -x.score
            )
        )

        for item in sorted_items:
            evidence_refs = [e.ref_id for e in item.evidence_refs]
            all_evidence_refs.extend(evidence_refs)

            # Get first action as recommendation
            recommendation = item.actions[0].description if item.actions else "Aksiyon plani olusturulmali"

            finding = DossierFinding(
                finding_id=f"FND-{item.id[-8:]}",
                title=item.title,
                description=item.summary,
                severity=self._severity_to_finding_level(item.severity),
                impact_description=self._format_impact(item),
                impact_amount_try=item.impact.amount_try,
                root_cause=item.why,
                recommendation=recommendation,
                evidence_refs=evidence_refs,
                source_feed_id=item.id,
                source=ContentSource.SYSTEM
            )
            findings.append(finding)

        return DossierSection(
            section_number=2,
            section_type=DossierSectionType.CRITICAL_FINDINGS,
            title="Kritik Bulgular",
            content={
                "findings": [f.to_dict() for f in findings],
                "total_count": len(findings),
                "by_severity": {
                    "critical": sum(1 for f in findings if f.severity == FindingSeverityLevel.CRITICAL),
                    "high": sum(1 for f in findings if f.severity == FindingSeverityLevel.HIGH),
                    "medium": sum(1 for f in findings if f.severity == FindingSeverityLevel.MEDIUM),
                    "low": sum(1 for f in findings if f.severity == FindingSeverityLevel.LOW)
                }
            },
            source=ContentSource.SYSTEM,
            evidence_refs=list(set(all_evidence_refs))
        )

    def _build_section_3_evidence_list(
        self,
        feed_items: List[FeedItem]
    ) -> DossierSection:
        """Build Bolum 3: Kanit Listesi"""
        evidence_map: Dict[str, EvidenceListItem] = {}

        for item in feed_items:
            for ev in item.evidence_refs:
                if ev.ref_id not in evidence_map:
                    evidence_map[ev.ref_id] = EvidenceListItem(
                        ref_id=ev.ref_id,
                        source_type=ev.source_type,
                        description=ev.description,
                        status=ev.status,
                        account_code=ev.account_code,
                        document_date=ev.document_date,
                        period=item.scope.period,
                        file_path=ev.file_path,
                        related_findings=[item.id]
                    )
                else:
                    # Add to related findings
                    if item.id not in evidence_map[ev.ref_id].related_findings:
                        evidence_map[ev.ref_id].related_findings.append(item.id)

        evidence_list = list(evidence_map.values())

        # Sort: missing first, then by source type
        evidence_list.sort(key=lambda x: (
            0 if x.status == EvidenceStatus.MISSING else 1,
            x.source_type
        ))

        return DossierSection(
            section_number=3,
            section_type=DossierSectionType.EVIDENCE_LIST,
            title="Kanit Listesi",
            content={
                "evidence_items": [e.to_dict() for e in evidence_list],
                "summary": {
                    "total": len(evidence_list),
                    "available": sum(1 for e in evidence_list if e.status == EvidenceStatus.AVAILABLE),
                    "missing": sum(1 for e in evidence_list if e.status == EvidenceStatus.MISSING),
                    "pending": sum(1 for e in evidence_list if e.status == EvidenceStatus.PENDING)
                },
                "by_source_type": {}
            },
            source=ContentSource.SYSTEM,
            evidence_refs=[e.ref_id for e in evidence_list]
        )

    def _build_section_4_action_plan(
        self,
        feed_items: List[FeedItem]
    ) -> DossierSection:
        """Build Bolum 4: Aksiyon Plani"""
        action_map: Dict[str, ActionPlanItem] = {}

        for item in feed_items:
            for action in item.actions:
                if action.action_id not in action_map:
                    action_map[action.action_id] = ActionPlanItem(
                        action_id=action.action_id,
                        description=action.description,
                        responsible=action.responsible or "SMMM",
                        deadline=action.deadline,
                        status=action.status.value if hasattr(action.status, 'value') else str(action.status),
                        priority=action.priority,
                        related_findings=[item.id],
                        related_evidence=action.related_evidence or []
                    )
                else:
                    if item.id not in action_map[action.action_id].related_findings:
                        action_map[action.action_id].related_findings.append(item.id)

        action_list = list(action_map.values())
        action_list.sort(key=lambda x: x.priority)

        return DossierSection(
            section_number=4,
            section_type=DossierSectionType.ACTION_PLAN,
            title="Aksiyon Plani",
            content={
                "action_items": [a.to_dict() for a in action_list],
                "summary": {
                    "total": len(action_list),
                    "pending": sum(1 for a in action_list if a.status == "pending"),
                    "in_progress": sum(1 for a in action_list if a.status == "in_progress"),
                    "completed": sum(1 for a in action_list if a.status == "completed")
                },
                "by_responsible": {
                    "smmm": sum(1 for a in action_list if a.responsible == "SMMM"),
                    "mukellef": sum(1 for a in action_list if a.responsible == "Mukellef"),
                    "sistem": sum(1 for a in action_list if a.responsible == "Sistem")
                }
            },
            source=ContentSource.SYSTEM
        )

    def _build_section_5_regulatory_impact(
        self,
        feed_items: List[FeedItem]
    ) -> Optional[DossierSection]:
        """Build Bolum 5: Mevzuat/RegWatch Etkileri"""
        # Find Mevzuat category items
        regulatory_items = [f for f in feed_items if f.category == FeedCategory.MEVZUAT]

        if not regulatory_items:
            return None  # Optional section

        impacts = []
        for item in regulatory_items:
            # Extract regulation info from metadata if available
            reg_id = f"REG-{item.id[-6:]}"

            impact = RegulatoryImpact(
                regulation_id=reg_id,
                regulation_name=item.title,
                description=item.summary,
                impact_summary=item.why,
                affected_findings=[item.id]
            )
            impacts.append(impact)

        return DossierSection(
            section_number=5,
            section_type=DossierSectionType.REGULATORY_IMPACT,
            title="Mevzuat ve RegWatch Etkileri",
            content={
                "regulatory_impacts": [r.to_dict() for r in impacts],
                "total_count": len(impacts),
                "disclaimer": "Mevzuat degisiklikleri RegWatch modulu tarafindan izlenmektedir."
            },
            source=ContentSource.SYSTEM,
            evidence_refs=[e.ref_id for item in regulatory_items for e in item.evidence_refs]
        )

    def _build_section_6_smmm_signature(
        self,
        smmm_id: str,
        client_id: str,
        period: str
    ) -> DossierSection:
        """Build Bolum 6: SMMM Notu ve Imza"""
        signature_block = SMMSignatureBlock(
            smmm_id=smmm_id,
            prepared_for_client=client_id,
            is_signed=False
        )

        return DossierSection(
            section_number=6,
            section_type=DossierSectionType.SMMM_SIGNATURE,
            title="SMMM Onayi ve Imza",
            content={
                "signature_block": signature_block.to_dict(),
                "certification_text": f"""Isbu rapor, {client_id} mukellefinin {period} donemi icin hazirlanmistir.

Raporda yer alan bulgular, mevcut kanitlara dayanmaktadir. Eksik kanitlar ilgili bolumlerde belirtilmistir.

SMMM onayi ile bu rapor mukellefe teslim edilebilir.""",
                "signature_placeholder": {
                    "name": "[SMMM Ad Soyad]",
                    "title": "Serbest Muhasebeci Mali Musavir",
                    "date": "[Tarih]",
                    "signature": "[Imza]"
                }
            },
            source=ContentSource.EXPERT
        )

    def generate_pdf(self, dossier: FullDossier) -> Tuple[Optional[str], Optional[Dict]]:
        """Generate PDF from dossier"""
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.units import cm
        except ImportError:
            return None, {
                "error": "reportlab_not_installed",
                "actions": ["pip install reportlab"]
            }

        try:
            pdf_path = self.output_dir / f"{dossier.dossier_id}.pdf"
            doc = SimpleDocTemplate(str(pdf_path), pagesize=A4,
                                   rightMargin=2*cm, leftMargin=2*cm,
                                   topMargin=2*cm, bottomMargin=2*cm)

            styles = getSampleStyleSheet()
            elements = []

            # Title
            title_style = ParagraphStyle('Title', parent=styles['Heading1'],
                                        fontSize=18, spaceAfter=30,
                                        textColor=colors.HexColor('#1a365d'))
            elements.append(Paragraph("LYNTOS Client-Ready Dossier", title_style))
            elements.append(Spacer(1, 10))

            # Meta info
            meta_style = styles['Normal']
            elements.append(Paragraph(f"<b>Dossier ID:</b> {dossier.dossier_id}", meta_style))
            elements.append(Paragraph(f"<b>Mukellef:</b> {dossier.client_id}", meta_style))
            elements.append(Paragraph(f"<b>Donem:</b> {dossier.period}", meta_style))
            elements.append(Paragraph(f"<b>Olusturma:</b> {dossier.generated_at.strftime('%d.%m.%Y %H:%M')}", meta_style))
            elements.append(Spacer(1, 20))

            # Sections
            section_style = ParagraphStyle('Section', parent=styles['Heading2'],
                                          fontSize=14, spaceBefore=20, spaceAfter=10,
                                          textColor=colors.HexColor('#2c5282'))

            for section in dossier.sections:
                elements.append(Paragraph(f"{section.section_number}. {section.title}", section_style))

                if section.section_type == DossierSectionType.EXECUTIVE_SUMMARY:
                    summary_text = section.content.get("summary_text", "")
                    for para in summary_text.split("\n\n"):
                        if para.strip():
                            elements.append(Paragraph(para.strip(), meta_style))
                            elements.append(Spacer(1, 6))

                elif section.section_type == DossierSectionType.CRITICAL_FINDINGS:
                    findings = section.content.get("findings", [])
                    for f in findings[:10]:  # Limit to 10 for PDF
                        elements.append(Paragraph(f"<b>{f['title']}</b> [{f['severity'].upper()}]", meta_style))
                        elements.append(Paragraph(f"{f['description']}", styles['Italic']))
                        elements.append(Paragraph(f"Etki: {f['impact_description']}", meta_style))
                        elements.append(Spacer(1, 8))

                elif section.section_type == DossierSectionType.EVIDENCE_LIST:
                    evidence = section.content.get("evidence_items", [])
                    if evidence:
                        ev_data = [["ID", "Kaynak", "Durum"]]
                        for e in evidence[:15]:
                            status_mark = "OK" if e["status"] == "available" else "X"
                            ev_data.append([e["ref_id"], e["source_type"], status_mark])

                        ev_table = Table(ev_data, colWidths=[4*cm, 4*cm, 2*cm])
                        ev_table.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
                            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
                            ('FONTSIZE', (0, 0), (-1, -1), 8),
                            ('PADDING', (0, 0), (-1, -1), 4),
                        ]))
                        elements.append(ev_table)

                elif section.section_type == DossierSectionType.ACTION_PLAN:
                    actions = section.content.get("action_items", [])
                    for idx, a in enumerate(actions[:10], 1):
                        elements.append(Paragraph(
                            f"{idx}. {a['description']} <i>({a['responsible']})</i>",
                            meta_style
                        ))

                elif section.section_type == DossierSectionType.SMMM_SIGNATURE:
                    cert_text = section.content.get("certification_text", "")
                    elements.append(Paragraph(cert_text, meta_style))
                    elements.append(Spacer(1, 30))
                    elements.append(Paragraph("_" * 40, meta_style))
                    elements.append(Paragraph("SMMM Imza", styles['Italic']))

                elements.append(Spacer(1, 15))

            # Footer
            elements.append(Spacer(1, 30))
            footer_style = ParagraphStyle('Footer', parent=styles['Italic'],
                                         fontSize=8, textColor=colors.HexColor('#718096'))
            elements.append(Paragraph(
                "Bu rapor LYNTOS tarafindan otomatik olusturulmustur. AI destekli bolumler etiketlenmistir.",
                footer_style
            ))

            doc.build(elements)
            return str(pdf_path), None

        except Exception as e:
            return None, {"error": str(e)}

    def generate_dossier(
        self,
        smmm_id: str,
        client_id: str,
        period: str,
        feed_items: Optional[List[FeedItem]] = None,
        bundle_id: Optional[str] = None,
        brief_id: Optional[str] = None,
        generate_pdf: bool = True,
        use_ai_enhancement: bool = False
    ) -> Dict[str, Any]:
        """
        Generate Full Dossier

        NO DUMMY DATA: If no feed_items, returns fail-soft response
        AI CANNOT INVENT: AI only improves existing content (if enabled)

        Returns ResponseEnvelope-compatible dict
        """
        # Get feed items if not provided
        if feed_items is None:
            feed_items = self.feed_service.get_feed_items(
                smmm_id=smmm_id,
                client_id=client_id,
                period=period
            )

        # Build sections
        sections = []

        # Section 1: Always included
        section_1 = self._build_section_1_executive_summary(feed_items, client_id, period)
        sections.append(section_1)

        # Section 2: Critical Findings
        section_2 = self._build_section_2_critical_findings(feed_items)
        sections.append(section_2)

        # Section 3: Evidence List
        section_3 = self._build_section_3_evidence_list(feed_items)
        sections.append(section_3)

        # Section 4: Action Plan
        section_4 = self._build_section_4_action_plan(feed_items)
        sections.append(section_4)

        # Section 5: Regulatory (optional)
        section_5 = self._build_section_5_regulatory_impact(feed_items)
        if section_5:
            sections.append(section_5)

        # Section 6: SMMM Signature (always last)
        section_6 = self._build_section_6_smmm_signature(smmm_id, client_id, period)
        sections.append(section_6)

        # Renumber sections
        for i, section in enumerate(sections, 1):
            section.section_number = i

        # Calculate metadata
        critical_count = sum(1 for f in feed_items if f.severity == FeedSeverity.CRITICAL)
        high_count = sum(1 for f in feed_items if f.severity == FeedSeverity.HIGH)
        all_evidence = [e for f in feed_items for e in f.evidence_refs]
        missing_count = sum(1 for e in all_evidence if e.status == EvidenceStatus.MISSING)
        all_actions = [a for f in feed_items for a in f.actions]
        pending_count = sum(1 for a in all_actions if str(a.status) == "pending")
        total_impact = sum(f.impact.amount_try or 0 for f in feed_items)

        # Create dossier
        dossier = FullDossier(
            dossier_id=FullDossier.generate_id(client_id, period),
            smmm_id=smmm_id,
            client_id=client_id,
            period=period,
            generated_at=datetime.now(),
            sections=sections,
            total_findings=len(feed_items),
            critical_findings=critical_count,
            high_findings=high_count,
            total_evidence=len(all_evidence),
            missing_evidence=missing_count,
            total_actions=len(all_actions),
            pending_actions=pending_count,
            total_impact_try=total_impact,
            source_feed_ids=[f.id for f in feed_items],
            source_bundle_id=bundle_id,
            source_brief_id=brief_id
        )

        # Generate PDF if requested
        pdf_path = None
        pdf_error = None
        if generate_pdf:
            pdf_path, pdf_error = self.generate_pdf(dossier)
            dossier.pdf_path = pdf_path

        # Build response
        response: Dict[str, Any] = {
            "schema": {
                "name": "FullDossierResponse",
                "version": "1.0.0",
                "generated_at": datetime.now().isoformat()
            },
            "meta": {
                "smmm_id": smmm_id,
                "client_id": client_id,
                "period": period,
                "request_id": dossier.dossier_id,
                "trust_level": "system_generated"
            },
            "data": dossier.to_dict(),
            "errors": [],
            "warnings": []
        }

        # Add errors
        if pdf_error:
            response["errors"].append(pdf_error)

        # Add warnings
        if not feed_items:
            response["warnings"].append({
                "type": "no_feed_data",
                "message": "Bu donem icin feed verisi bulunamadi.",
                "actions": ["Mizan yukleyin", "E-defter yukleyin", "Beyanname yukleyin"]
            })
        elif missing_count > 0:
            response["warnings"].append({
                "type": "missing_evidence",
                "count": missing_count,
                "message": f"{missing_count} adet eksik kanit var."
            })

        return response


# Singleton
_service: Optional[DossierService] = None


def get_dossier_service() -> DossierService:
    global _service
    if _service is None:
        _service = DossierService()
    return _service
