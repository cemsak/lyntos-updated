"""
VDK Inspector API
Sprint 8.1 - LYNTOS V2

POST /api/v1/vdk-inspector/answer - Müfettiş sorusuna cevap hazırla
POST /api/v1/vdk-inspector/defense - Alarm için savunma dosyası hazırla
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vdk-inspector", tags=["vdk-inspector"])

# Lazy agent singleton
_vdk_inspector_agent = None


def _get_agent():
    """Get VDK Inspector Agent (lazy)"""
    global _vdk_inspector_agent
    if _vdk_inspector_agent is None:
        from services.ai.agents.vdk_inspector import VdkInspectorAgent
        _vdk_inspector_agent = VdkInspectorAgent()
    return _vdk_inspector_agent


def _get_client_risk_context(client_id: str, period: Optional[str]) -> Dict[str, Any]:
    """
    Client ve risk verilerini gerçek veritabanından çek.
    Inspector Agent'ın zengin bağlamla çalışmasını sağlar.
    """
    risk_data = {}
    client_info = {"client_id": client_id, "period": period}

    try:
        # Client bilgisi (NACE, sektör, VKN)
        from api.v1.vdk_simulator import get_client_info, get_nace_info
        client = get_client_info(client_id)
        if client:
            client_info["name"] = client.get("name", "")
            client_info["vkn"] = client.get("vkn", "")
            client_info["nace_code"] = client.get("nace_code", "")
            client_info["sector"] = client.get("sector", "")

            # NACE detayı
            nace_code = client.get("nace_code")
            if nace_code:
                nace_info = get_nace_info(nace_code)
                if nace_info:
                    client_info["nace_description"] = nace_info.get("description_tr", "")
                    client_info["sector_group"] = nace_info.get("sector_group", "")
                    client_info["risk_profile"] = nace_info.get("risk_profile", "")

        # KURGAN risk skoru ve tetiklenen alarmlar (mevcut endpoint'i dahili çağır)
        # Not: get_kurgan_risk tüm veriyi hesaplıyor, biz sadece özet risk bilgisi alıyoruz
        from api.v1.contracts import _get_mizan_data_from_db
        mizan_result = _get_mizan_data_from_db(period or "2025-Q1")
        if mizan_result:
            risk_data["data_source"] = "database"
            risk_data["mizan_entry_count"] = mizan_result.get("entry_count", 0)

            # Özet hesap bilgileri (agent'ın bağlam oluşturması için)
            accounts = mizan_result.get("accounts", {})
            key_accounts = {}
            for code, info in accounts.items():
                # Sadece önemli hesapları geçir (kasa, ortaklar, stok, KDV, sermaye)
                if code.startswith(("100", "102", "120", "131", "153", "190", "191",
                                     "254", "257", "320", "331", "360", "500", "580")):
                    key_accounts[code] = {
                        "ad": info.get("hesap_adi", ""),
                        "bakiye": info.get("borc_bakiye", 0) - info.get("alacak_bakiye", 0)
                    }
            if key_accounts:
                risk_data["key_accounts"] = key_accounts

        # Simulator alarmları (eğer period varsa)
        try:
            from api.v1.vdk_simulator import get_mizan_data, get_tax_certificates
            from services.kurgan_simulator import KurganSimulator

            sim_mizan = get_mizan_data(client_id, period or "2025-Q1")
            if sim_mizan:
                tax_certs = get_tax_certificates(client_id)
                _nace = client_info.get("nace_code")
                _sector_avgs = {}
                if _nace:
                    try:
                        from services.tcmb_evds_service import get_sector_data_for_nace
                        _sector_avgs = get_sector_data_for_nace(_nace) or {}
                    except Exception:
                        pass
                simulator = KurganSimulator()
                sim_result = simulator.simulate(
                    client_id=client_id,
                    period=period or "2025-Q1",
                    nace_code=_nace,
                    sector_group=client_info.get("sector_group"),
                    mizan_data=sim_mizan,
                    tax_certificates=tax_certs,
                    risky_suppliers=[],
                    sector_averages=_sector_avgs
                )
                if sim_result:
                    risk_data["risk_score"] = sim_result.risk_score
                    risk_data["risk_level"] = sim_result.risk_level
                    risk_data["triggered_count"] = sim_result.triggered_count

                    # Tetiklenen alarm özetleri
                    triggered_summaries = []
                    for alarm in sim_result.alarms:
                        if alarm.triggered:
                            triggered_summaries.append({
                                "rule_id": alarm.rule_id,
                                "rule_name": alarm.rule_name,
                                "severity": alarm.severity,
                                "finding_summary": alarm.finding_summary,
                                "legal_references": alarm.legal_references,
                            })
                    if triggered_summaries:
                        risk_data["triggered_alarms"] = triggered_summaries

        except Exception as sim_err:
            logger.warning(f"[VDK Inspector] Simulator veri çekme hatası (devam): {sim_err}")

    except Exception as e:
        logger.warning(f"[VDK Inspector] Context verisi çekme hatası (devam): {e}")

    return {
        "risk_data": risk_data,
        "client_info": client_info,
    }


@router.post("/answer")
async def answer_inspector_question(
    client_id: str = Query(..., description="Müşteri ID"),
    period: Optional[str] = Query(None, description="Dönem (YYYY/QN)"),
    question: str = Query(..., description="Müfettiş sorusu"),
    alarm_code: Optional[str] = Query(None, description="KURGAN alarm kodu (K-09, K-15 vb.)"),
    category: Optional[str] = Query(None, description="Kategori (likidite, ortaklar vb.)"),
):
    """
    VDK Inspector Agent'a müfettiş sorusu sorar.

    5 uzman perspektifinden (SMMM + YMM + Vergi Müfettişi +
    Hesap Uzmanı + VDK Uzmanı) savunma cevabı üretir.

    Gerçek müşteri verisi, KURGAN risk skoru ve tetiklenen alarmlar
    otomatik olarak bağlama eklenir.
    """
    try:
        agent = _get_agent()

        # Gerçek veriyi çek
        context_data = _get_client_risk_context(client_id, period)

        from services.ai.agents.base_agent import AgentTask

        task = AgentTask(
            task_type="answer_inspector_question",
            description=f"Müfettiş sorusu cevapla: {question[:100]}",
            context={
                "question": question,
                "alarm_code": alarm_code or "",
                "category": category or "",
                "client_info": context_data["client_info"],
                "risk_data": context_data["risk_data"],
            }
        )

        result = await agent.run(task)

        if result.success:
            return {
                "success": True,
                "data": {
                    "answer": result.output.get("answer", ""),
                    "question": question,
                    "alarm_code": alarm_code,
                    "category": category,
                    "model": result.output.get("model", ""),
                    "tokens_used": result.tokens_used,
                    "processing_time_ms": result.processing_time_ms,
                }
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Agent hatası: {result.error}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[VDK Inspector] API hatası: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"VDK Inspector hatası: {str(e)}"
        )


@router.post("/defense")
async def prepare_defense_brief(
    client_id: str = Query("", description="Müşteri ID"),
    period: Optional[str] = Query(None, description="Dönem"),
    alarm_code: str = Query(..., description="KURGAN alarm kodu"),
    alarm_name: str = Query("", description="Alarm adı"),
    finding_summary: str = Query("", description="Tespit özeti"),
    severity: str = Query("medium", description="Önem seviyesi"),
):
    """
    Belirli bir KURGAN alarmı için savunma dosyası hazırla.

    Gerçek alarm detayları, mevzuat referansları ve müfettiş soruları
    otomatik olarak kontekse eklenir.
    """
    try:
        agent = _get_agent()

        # Alarm için gerçek veriyi bul
        alarm_data = {
            "rule_id": alarm_code,
            "rule_name": alarm_name,
            "finding_summary": finding_summary,
            "severity": severity,
            "details": {},
            "legal_references": [],
            "inspector_questions": [],
        }

        # Simulator'dan gerçek alarm detaylarını çek
        try:
            if client_id and period:
                from api.v1.vdk_simulator import get_client_info, get_mizan_data, get_nace_info, get_tax_certificates
                from services.kurgan_simulator import KurganSimulator

                client = get_client_info(client_id)
                nace_code = client.get("nace_code") if client else None
                sector_group = None
                if nace_code:
                    nace_info = get_nace_info(nace_code)
                    sector_group = nace_info.get("sector_group") if nace_info else None

                sim_mizan = get_mizan_data(client_id, period)
                if sim_mizan:
                    tax_certs = get_tax_certificates(client_id)
                    _sector_avgs2 = {}
                    if nace_code:
                        try:
                            from services.tcmb_evds_service import get_sector_data_for_nace
                            _sector_avgs2 = get_sector_data_for_nace(nace_code) or {}
                        except Exception:
                            pass
                    simulator = KurganSimulator()
                    sim_result = simulator.simulate(
                        client_id=client_id,
                        period=period,
                        nace_code=nace_code,
                        sector_group=sector_group,
                        mizan_data=sim_mizan,
                        tax_certificates=tax_certs,
                        risky_suppliers=[],
                        sector_averages=_sector_avgs2
                    )
                    # Bu alarm koduna ait gerçek alarm objesini bul
                    for alarm in sim_result.alarms:
                        if alarm.rule_id == alarm_code:
                            alarm_data["finding_summary"] = alarm.finding_summary or finding_summary
                            alarm_data["severity"] = alarm.severity or severity
                            alarm_data["details"] = alarm.details or {}
                            alarm_data["legal_references"] = alarm.legal_references or []
                            alarm_data["inspector_questions"] = alarm.inspector_questions or []
                            break

        except Exception as sim_err:
            logger.warning(f"[VDK Inspector] Defense alarm veri çekme hatası (devam): {sim_err}")

        from services.ai.agents.base_agent import AgentTask

        task = AgentTask(
            task_type="prepare_defense",
            description=f"Savunma dosyası hazırla: {alarm_code}",
            context={
                "alarm_data": alarm_data,
            }
        )

        result = await agent.run(task)

        if result.success:
            return {
                "success": True,
                "data": {
                    "defense_brief": result.output.get("defense_brief", ""),
                    "alarm_code": alarm_code,
                    "model": result.output.get("model", ""),
                    "tokens_used": result.tokens_used,
                    "processing_time_ms": result.processing_time_ms,
                }
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Agent hatası: {result.error}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[VDK Inspector] Defense API hatası: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"VDK Inspector hatası: {str(e)}"
        )
