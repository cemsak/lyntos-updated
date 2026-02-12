"""
LYNTOS AI Agents API
====================

MasterChef ve alt ajanlar için API endpoint'leri.

Endpoints:
- POST /api/v2/agents/orchestrate - Görev orkestre et
- POST /api/v2/agents/mevzuat/scan - Mevzuat taraması
- POST /api/v2/agents/mevzuat/search - Mevzuat araması
- POST /api/v2/agents/rapor/generate - Rapor oluştur
- GET /api/v2/agents/status - Ajan durumları
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

from middleware.auth import verify_token
from services.ai.prompt_guard import validate_user_input

# Agent imports
from services.ai.agents import (
    MasterChefAgent,
    MevzuatTakipAgent,
    RaporAgent,
    AgentTask,
    AgentResult,
)
from services.ai.agents.base_agent import TaskPriority, AgentStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["AI Agents"])

# Singleton agent instances
_masterchef: Optional[MasterChefAgent] = None
_mevzuat: Optional[MevzuatTakipAgent] = None
_rapor: Optional[RaporAgent] = None


def get_masterchef() -> MasterChefAgent:
    global _masterchef
    if _masterchef is None:
        _masterchef = MasterChefAgent()
    return _masterchef


def get_mevzuat_agent() -> MevzuatTakipAgent:
    global _mevzuat
    if _mevzuat is None:
        _mevzuat = MevzuatTakipAgent()
    return _mevzuat


def get_rapor_agent() -> RaporAgent:
    global _rapor
    if _rapor is None:
        _rapor = RaporAgent()
    return _rapor


# ============================================================================
# Request/Response Models
# ============================================================================

class OrchestrateRequest(BaseModel):
    """Orkestrasyon isteği"""
    user_request: str = Field(..., description="Kullanıcının isteği")
    context: Dict[str, Any] = Field(default_factory=dict, description="Ek bağlam")
    priority: str = Field(default="medium", description="Öncelik: critical, high, medium, low")


class MevzuatScanRequest(BaseModel):
    """Mevzuat tarama isteği"""
    period: str = Field(default="today", description="Tarama dönemi: today, week")


class MevzuatSearchRequest(BaseModel):
    """Mevzuat arama isteği"""
    query: str = Field(..., description="Arama sorgusu")


class RaporGenerateRequest(BaseModel):
    """Rapor oluşturma isteği"""
    rapor_tipi: str = Field(..., description="Rapor tipi")
    mukellef: Dict[str, Any] = Field(default_factory=dict, description="Mükellef bilgileri")
    donem: str = Field(default="", description="Dönem")
    risk_data: Dict[str, Any] = Field(default_factory=dict, description="Risk verileri")
    format: str = Field(default="json", description="Çıktı formatı")


class AgentResponse(BaseModel):
    """Ajan yanıtı"""
    success: bool
    task_id: str
    agent_name: str
    status: str
    output: Any = None
    error: Optional[str] = None
    processing_time_ms: int = 0
    tokens_used: int = 0
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AgentStatusResponse(BaseModel):
    """Ajan durumu yanıtı"""
    agents: List[Dict[str, Any]]
    total_agents: int
    healthy: int


# ============================================================================
# Helper Functions
# ============================================================================

def convert_result_to_response(result: AgentResult) -> AgentResponse:
    """AgentResult'ı API response'a dönüştür"""
    return AgentResponse(
        success=result.success,
        task_id=result.task_id,
        agent_name=result.agent_name,
        status=result.status.value,
        output=result.output,
        error=result.error,
        processing_time_ms=result.processing_time_ms,
        tokens_used=result.tokens_used,
        metadata=result.metadata
    )


def get_priority(priority_str: str) -> TaskPriority:
    """String'den TaskPriority'ye dönüştür"""
    mapping = {
        "critical": TaskPriority.CRITICAL,
        "high": TaskPriority.HIGH,
        "medium": TaskPriority.MEDIUM,
        "low": TaskPriority.LOW,
    }
    return mapping.get(priority_str.lower(), TaskPriority.MEDIUM)


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/orchestrate", response_model=AgentResponse)
async def orchestrate_task(request: OrchestrateRequest, user: dict = Depends(verify_token)):
    """
    MasterChef ile görev orkestre et.

    Kullanıcı isteğini analiz eder, uygun ajanlara dağıtır
    ve sonuçları birleştirir.

    Örnek:
    ```json
    {
        "user_request": "Bu müvekkil için VDK risk analizi yap ve rapor hazırla",
        "context": {
            "client_id": "CLIENT_001",
            "period": "2025-Q1"
        },
        "priority": "high"
    }
    ```
    """
    is_valid, error_msg = validate_user_input(request.user_request)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    try:
        chef = get_masterchef()
        result = await chef.orchestrate(
            user_request=request.user_request,
            context=request.context,
            priority=get_priority(request.priority)
        )
        return convert_result_to_response(result)
    except Exception as e:
        logger.error(f"Orchestration failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mevzuat/scan", response_model=AgentResponse)
async def scan_mevzuat(request: MevzuatScanRequest, user: dict = Depends(verify_token)):
    """
    Mevzuat taraması yap.

    GİB, TURMOB ve Resmi Gazete'deki değişiklikleri tarar.

    Örnek:
    ```json
    {
        "period": "today"
    }
    ```
    """
    try:
        agent = get_mevzuat_agent()
        task = AgentTask(
            task_type="daily_scan",
            description="Mevzuat taraması",
            context={"period": request.period}
        )
        result = await agent.run(task)
        return convert_result_to_response(result)
    except Exception as e:
        logger.error(f"Mevzuat scan failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mevzuat/search", response_model=AgentResponse)
async def search_mevzuat(request: MevzuatSearchRequest, user: dict = Depends(verify_token)):
    """
    Mevzuat araması yap.

    Belirli konuda mevzuat, özelge ve tebliğ ara.

    Örnek:
    ```json
    {
        "query": "KDV oranı değişikliği 2026"
    }
    ```
    """
    is_valid, error_msg = validate_user_input(request.query)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    try:
        agent = get_mevzuat_agent()
        task = AgentTask(
            task_type="search",
            description=f"Mevzuat araması: {request.query}",
            context={"query": request.query}
        )
        result = await agent.run(task)
        return convert_result_to_response(result)
    except Exception as e:
        logger.error(f"Mevzuat search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rapor/generate", response_model=AgentResponse)
async def generate_rapor(request: RaporGenerateRequest, user: dict = Depends(verify_token)):
    """
    Profesyonel rapor oluştur.

    Big 4+ kalitesinde rapor üretir.

    Rapor tipleri:
    - vdk_izah: VDK İzah Metni
    - smmm_danismanlik: SMMM Danışmanlık Raporu
    - ymm_denetim: YMM Özel Denetim Raporu
    - risk_degerlendirme: Risk Değerlendirme Raporu
    - due_diligence: Due Diligence Raporu
    - kurumlar_vergisi: Kurumlar Vergisi Raporu
    - gecici_vergi: Geçici Vergi Raporu

    Örnek:
    ```json
    {
        "rapor_tipi": "risk_degerlendirme",
        "mukellef": {"ad": "ABC Ltd.", "vkn": "1234567890"},
        "donem": "2025-Q1",
        "format": "json"
    }
    ```
    """
    try:
        agent = get_rapor_agent()
        task = AgentTask(
            task_type="generate",
            description=f"Rapor oluştur: {request.rapor_tipi}",
            context={
                "rapor_tipi": request.rapor_tipi,
                "mukellef": request.mukellef,
                "donem": request.donem,
                "risk_data": request.risk_data,
                "format": request.format
            }
        )
        result = await agent.run(task)
        return convert_result_to_response(result)
    except Exception as e:
        logger.error(f"Rapor generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rapor/izah", response_model=AgentResponse)
async def generate_izah_metni(
    senaryo: str,
    risk_data: Dict[str, Any] = None,
    specific_issue: str = None,
    user: dict = Depends(verify_token),
):
    """
    VDK izah metni oluştur.

    İzaha davet için savunma metni hazırlar.
    """
    is_valid, error_msg = validate_user_input(senaryo)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    try:
        agent = get_rapor_agent()
        task = AgentTask(
            task_type="izah_metni",
            description=f"İzah metni: {senaryo}",
            context={
                "senaryo": senaryo,
                "risk_data": risk_data or {},
                "specific_issue": specific_issue
            }
        )
        result = await agent.run(task)
        return convert_result_to_response(result)
    except Exception as e:
        logger.error(f"Izah metni generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", response_model=AgentStatusResponse)
async def get_agent_status(user: dict = Depends(verify_token)):
    """
    Tüm ajanların durumunu getir.
    """
    try:
        chef = get_masterchef()
        mevzuat = get_mevzuat_agent()
        rapor = get_rapor_agent()

        agents = [
            chef.get_metrics(),
            mevzuat.get_metrics(),
            rapor.get_metrics(),
        ]

        healthy = sum(1 for a in agents if a.get("status") != "failed")

        return AgentStatusResponse(
            agents=agents,
            total_agents=len(agents),
            healthy=healthy
        )
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/registered")
async def get_registered_agents(user: dict = Depends(verify_token)):
    """
    MasterChef'e kayıtlı tüm ajanları listele.
    """
    try:
        chef = get_masterchef()
        return {
            "agents": chef.get_registered_agents(),
            "count": len(chef.get_registered_agents())
        }
    except Exception as e:
        logger.error(f"Get registered agents failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/execution-log")
async def get_execution_log(limit: int = 50, user: dict = Depends(verify_token)):
    """
    Son çalıştırma loglarını getir.
    """
    try:
        chef = get_masterchef()
        logs = chef.get_execution_log()
        return {
            "logs": logs[-limit:],
            "total": len(logs)
        }
    except Exception as e:
        logger.error(f"Get execution log failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
