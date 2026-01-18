"""
C-Level Brief Service
Composes 5-slide executive brief from feed items
LYNTOS Anayasa: Evidence-gated, no dummy data, AI-labeled
"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from schemas.feed import (
    FeedItem, EvidenceRef, FeedSeverity, EvidenceStatus
)
from schemas.brief import (
    CLevelBrief, BriefSlide, SlideType, ContentSource,
    KPIMetric, RiskHighlight, MissingDocument, Opportunity, SMMNote
)
from services.feed import get_feed_service


class BriefService:
    """
    C-Level Brief generation service

    Transforms feed items into 5-slide executive summary:
    1. Period Summary (KPIs)
    2. Critical Risks (top 2)
    3. Missing Documents
    4. Opportunity
    5. SMMM Signature

    NO DUMMY DATA - returns fail-soft if no feed data
    """

    def __init__(self):
        self.feed_service = get_feed_service()

    def _calculate_risk_level(self, feed_items: List[FeedItem]) -> str:
        """Calculate overall risk level from feed items"""
        if not feed_items:
            return "BELIRSIZ"

        critical_count = sum(1 for f in feed_items if f.severity == FeedSeverity.CRITICAL)
        high_count = sum(1 for f in feed_items if f.severity == FeedSeverity.HIGH)

        if critical_count >= 2:
            return "COK YUKSEK"
        elif critical_count >= 1 or high_count >= 3:
            return "YUKSEK"
        elif high_count >= 1:
            return "ORTA"
        else:
            return "DUSUK"

    def _calculate_compliance_rate(self, feed_items: List[FeedItem]) -> float:
        """Calculate compliance rate based on evidence availability"""
        if not feed_items:
            return 0.0

        total_evidence = 0
        available_evidence = 0

        for item in feed_items:
            for ev in item.evidence_refs:
                total_evidence += 1
                if ev.status == EvidenceStatus.AVAILABLE:
                    available_evidence += 1

        if total_evidence == 0:
            return 100.0

        return round((available_evidence / total_evidence) * 100, 1)

    def _calculate_total_impact(self, feed_items: List[FeedItem]) -> float:
        """Sum up TL impact from all feed items"""
        total = 0.0
        for item in feed_items:
            if item.impact.amount_try:
                total += item.impact.amount_try
        return total

    def _format_impact(self, item: FeedItem) -> str:
        """Format impact for display"""
        parts = []
        if item.impact.amount_try:
            parts.append(f"{item.impact.amount_try:,.0f} TL")
        if item.impact.pct:
            parts.append(f"%{item.impact.pct:.1f}")
        if item.impact.points:
            parts.append(f"{item.impact.points} puan")
        return " / ".join(parts) if parts else "Belirsiz"

    def _build_slide_1_period_summary(
        self,
        feed_items: List[FeedItem],
        client_id: str,
        period: str
    ) -> BriefSlide:
        """Build Slide 1: Period Summary (KPIs)"""
        risk_level = self._calculate_risk_level(feed_items)
        compliance_rate = self._calculate_compliance_rate(feed_items)
        total_impact = self._calculate_total_impact(feed_items)

        kpis = [
            KPIMetric(
                name="Risk Seviyesi",
                value=risk_level,
                trend="stable"
            ),
            KPIMetric(
                name="Uyum Durumu",
                value=f"%{compliance_rate:.0f}",
                trend="up" if compliance_rate >= 80 else "down"
            ),
            KPIMetric(
                name="Toplam Etki",
                value=f"{total_impact:,.0f} TL" if total_impact > 0 else "Hesaplaniyor",
                trend="down" if total_impact > 50000 else "stable"
            )
        ]

        # If no items, add info message
        message = None
        if not feed_items:
            message = "Bu donem icin veri bulunamadi. Kontroller veri yuklendikten sonra calisacaktir."
        elif not any(f.severity in [FeedSeverity.CRITICAL, FeedSeverity.HIGH] for f in feed_items):
            message = "Bu donem kritik uyari bulunmamaktadir. Kontroller tamamlanmistir."

        return BriefSlide(
            slide_number=1,
            slide_type=SlideType.PERIOD_SUMMARY,
            title=f"{period} Donem Ozeti",
            content={
                "client_id": client_id,
                "period": period,
                "kpis": [k.to_dict() for k in kpis],
                "message": message
            },
            source=ContentSource.SYSTEM,
            evidence_refs=[]
        )

    def _build_slide_2_critical_risks(
        self,
        feed_items: List[FeedItem]
    ) -> Optional[BriefSlide]:
        """Build Slide 2: Top 2 Critical Risks"""
        # Filter CRITICAL and HIGH, sort by score
        critical_items = [
            f for f in feed_items
            if f.severity in [FeedSeverity.CRITICAL, FeedSeverity.HIGH]
        ]
        critical_items.sort(key=lambda x: (-1 if x.severity == FeedSeverity.CRITICAL else 0, -x.score))

        if not critical_items:
            return None  # No slide if no critical risks

        # Take top 2
        top_items = critical_items[:2]

        risks = []
        all_evidence_refs = []

        for item in top_items:
            # Get first action
            action_text = item.actions[0].description if item.actions else "Aksiyon belirlenmedi"

            risk = RiskHighlight(
                title=item.title,
                impact=self._format_impact(item),
                why=item.why,
                action=action_text,
                evidence_refs=[e.ref_id for e in item.evidence_refs],
                source_feed_id=item.id,
                severity=item.severity
            )
            risks.append(risk)
            all_evidence_refs.extend([e.ref_id for e in item.evidence_refs])

        return BriefSlide(
            slide_number=2,
            slide_type=SlideType.CRITICAL_RISKS,
            title="Kritik Riskler",
            content={
                "risks": [r.to_dict() for r in risks],
                "total_critical": sum(1 for i in critical_items if i.severity == FeedSeverity.CRITICAL),
                "total_high": sum(1 for i in critical_items if i.severity == FeedSeverity.HIGH)
            },
            source=ContentSource.SYSTEM,
            evidence_refs=list(set(all_evidence_refs))
        )

    def _build_slide_3_missing_docs(
        self,
        feed_items: List[FeedItem]
    ) -> Optional[BriefSlide]:
        """Build Slide 3: Missing Documents"""
        missing_docs = []
        seen_refs = set()

        for item in feed_items:
            for ev in item.evidence_refs:
                if ev.status == EvidenceStatus.MISSING and ev.ref_id not in seen_refs:
                    missing_docs.append(MissingDocument(
                        ref_id=ev.ref_id,
                        description=ev.description,
                        source_type=ev.source_type,
                        required_by=item.title
                    ))
                    seen_refs.add(ev.ref_id)

        if not missing_docs:
            return None  # No slide if no missing docs

        # Limit to top 5 most important
        missing_docs = missing_docs[:5]

        return BriefSlide(
            slide_number=3,
            slide_type=SlideType.MISSING_DOCS,
            title="Eksik Belgeler",
            content={
                "documents": [d.to_dict() for d in missing_docs],
                "total_missing": len(missing_docs),
                "cta": "Belgeleri yukleyin veya talep edin"
            },
            source=ContentSource.SYSTEM,
            evidence_refs=[d.ref_id for d in missing_docs]
        )

    def _build_slide_4_opportunity(
        self,
        feed_items: List[FeedItem]
    ) -> Optional[BriefSlide]:
        """Build Slide 4: Opportunity (Vergus style)"""
        # Look for Vergus category items or positive impacts
        opportunity_items = [
            f for f in feed_items
            if f.category.value == "VERGUS" or f.severity == FeedSeverity.INFO
        ]

        if not opportunity_items:
            # Create generic opportunity based on compliance
            compliance_rate = self._calculate_compliance_rate(feed_items)
            if compliance_rate >= 90:
                return BriefSlide(
                    slide_number=4,
                    slide_type=SlideType.OPPORTUNITY,
                    title="Firsat",
                    content={
                        "opportunity": Opportunity(
                            title="Yuksek Uyum Seviyesi",
                            description="Mevcut uyum seviyeniz yuksek. Bu durum denetim riskini azaltir.",
                            applicability_note="Mevcut duzeni koruyun."
                        ).to_dict()
                    },
                    source=ContentSource.SYSTEM,
                    evidence_refs=[]
                )
            return None

        # Use first opportunity item
        item = opportunity_items[0]
        opportunity = Opportunity(
            title=item.title,
            potential_savings_try=item.impact.amount_try,
            description=item.summary,
            applicability_note=item.why,
            evidence_refs=[e.ref_id for e in item.evidence_refs]
        )

        return BriefSlide(
            slide_number=4,
            slide_type=SlideType.OPPORTUNITY,
            title="Firsat",
            content={"opportunity": opportunity.to_dict()},
            source=ContentSource.SYSTEM,
            evidence_refs=opportunity.evidence_refs
        )

    def _build_slide_5_smmm_signature(
        self,
        smmm_id: str,
        client_id: str,
        period: str
    ) -> BriefSlide:
        """Build Slide 5: SMMM Signature"""
        smm_note = SMMNote(
            smmm_id=smmm_id,
            note=None,  # To be filled by SMMM
            is_signed=False
        )

        return BriefSlide(
            slide_number=5,
            slide_type=SlideType.SMMM_SIGNATURE,
            title="SMMM Onayi",
            content={
                "smm_note": smm_note.to_dict(),
                "prepared_for": client_id,
                "period": period,
                "disclaimer": "Bu rapor LYNTOS tarafindan hazirlanmistir. SMMM onayi ile mukellefe teslim edilebilir."
            },
            source=ContentSource.EXPERT,
            evidence_refs=[]
        )

    def generate_brief(
        self,
        smmm_id: str,
        client_id: str,
        period: str,
        feed_items: Optional[List[FeedItem]] = None,
        bundle_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate C-Level Brief from feed items

        NO DUMMY DATA: If no feed_items provided, fetches from feed service.
        If still empty, returns fail-soft response with warnings.

        Returns ResponseEnvelope-compatible dict
        """
        # Get feed items if not provided
        if feed_items is None:
            feed_items = self.feed_service.get_feed_items(
                smmm_id=smmm_id,
                client_id=client_id,
                period=period
            )

        # Build slides
        slides = []

        # Slide 1: Always included (even if empty data)
        slide_1 = self._build_slide_1_period_summary(feed_items, client_id, period)
        slides.append(slide_1)

        # Slide 2: Only if critical risks exist
        slide_2 = self._build_slide_2_critical_risks(feed_items)
        if slide_2:
            slides.append(slide_2)

        # Slide 3: Only if missing docs exist
        slide_3 = self._build_slide_3_missing_docs(feed_items)
        if slide_3:
            slides.append(slide_3)

        # Slide 4: Opportunity (optional)
        slide_4 = self._build_slide_4_opportunity(feed_items)
        if slide_4:
            slides.append(slide_4)

        # Slide 5: Always included
        slide_5 = self._build_slide_5_smmm_signature(smmm_id, client_id, period)
        slides.append(slide_5)

        # Renumber slides
        for i, slide in enumerate(slides, 1):
            slide.slide_number = i

        # Calculate metadata
        critical_count = sum(1 for f in feed_items if f.severity == FeedSeverity.CRITICAL)
        high_count = sum(1 for f in feed_items if f.severity == FeedSeverity.HIGH)
        missing_count = sum(
            1 for f in feed_items
            for e in f.evidence_refs
            if e.status == EvidenceStatus.MISSING
        )
        total_impact = self._calculate_total_impact(feed_items)

        # Create brief
        brief = CLevelBrief(
            brief_id=CLevelBrief.generate_id(client_id, period),
            smmm_id=smmm_id,
            client_id=client_id,
            period=period,
            generated_at=datetime.now(),
            slides=slides,
            total_risks=len([f for f in feed_items if f.severity in [FeedSeverity.CRITICAL, FeedSeverity.HIGH]]),
            critical_count=critical_count,
            high_count=high_count,
            missing_docs_count=missing_count,
            total_impact_try=total_impact,
            source_feed_ids=[f.id for f in feed_items],
            source_bundle_id=bundle_id
        )

        # Build response
        response: Dict[str, Any] = {
            "schema": {
                "name": "CLevelBriefResponse",
                "version": "1.0.0",
                "generated_at": datetime.now().isoformat()
            },
            "meta": {
                "smmm_id": smmm_id,
                "client_id": client_id,
                "period": period,
                "request_id": brief.brief_id,
                "trust_level": "system_generated"
            },
            "data": brief.to_dict(),
            "errors": [],
            "warnings": []
        }

        # Add warnings if no data
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
                "message": f"{missing_count} adet eksik belge var."
            })

        return response


# Singleton
_service: Optional[BriefService] = None


def get_brief_service() -> BriefService:
    global _service
    if _service is None:
        _service = BriefService()
    return _service
