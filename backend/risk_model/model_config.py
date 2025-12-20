"""
risk_model/model_config.py

Lyntos Risk Model v1 için temel konfigürasyon.
Detaylı açıklama: docs/risk_model_v1.md
"""

from typing import Dict, Any

# Dokümandaki versiyon
RISK_MODEL_VERSION: str = "v1"

# Ana skorların listesi (şimdilik sadece isimler)
MAIN_SCORES = [
    "kurgan_risk",
    "tax_compliance",
    "smiyb_risk",
    "radar_risk",
    "edefter_risk",
    "inflation_risk",
]

# KPI tanımları için yer:
# İleride buraya risk_model_v1.md'deki ayrıntılı KPI sözlüğünü ekleyeceğiz.
# Şimdilik boş bir sözlük bırakıyoruz ki backend yapısı hazır olsun.
KPI_DEFINITIONS: Dict[str, Dict[str, Any]] = {}
