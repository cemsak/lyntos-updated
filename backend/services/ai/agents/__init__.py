"""
LYNTOS AI Agents Package
========================

MasterChef Ajan sistemi ve alt ajanlar.

Mevcut Ajanlar:
- MasterChefAgent: Tüm ajanların orkestratörü
- MevzuatTakipAgent: GİB/TURMOB mevzuat tarama
- RaporAgent: Big 4+ kalitesinde rapor üretimi
- VDKRiskAgent: VDK risk analizi (4 modül)

Kullanım:
    from services.ai.agents import MasterChefAgent

    chef = MasterChefAgent()
    result = await chef.orchestrate(task="VDK analizi yap", context=risk_data)
"""

from .masterchef import MasterChefAgent
from .mevzuat_takip import MevzuatTakipAgent
from .rapor import RaporAgent
from .vdk_inspector import VdkInspectorAgent
from .base_agent import BaseAgent, AgentTask, AgentResult

__all__ = [
    "MasterChefAgent",
    "MevzuatTakipAgent",
    "RaporAgent",
    "VdkInspectorAgent",
    "BaseAgent",
    "AgentTask",
    "AgentResult",
]
