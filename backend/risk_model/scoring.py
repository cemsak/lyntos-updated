"""
risk_model/scoring.py

Görev:
- metrics.compute_all_metrics çıktısını alıp
- Lyntos ana skorlarını (0–100) hesaplamak.

Şimdilik:
- Gerçek formülleri yazmıyoruz.
- Sadece yapıyı hazırlıyoruz.
"""

from typing import Dict, Any
from .model_config import MAIN_SCORES, RISK_MODEL_VERSION


def compute_scores_from_metrics(metrics: Dict[str, float]) -> Dict[str, Any]:
    """
    Ham metriklerden ana skorları üretir.
    Şu an gerçek skor üretmiyoruz; sadece iskelet bir yapı döndürüyoruz.

    İleride:
    - Her ana skor için, ilgili KPI'lar ve ağırlıkları burada kullanılacak.
    """
    scores: Dict[str, Any] = {
        "version": RISK_MODEL_VERSION,
        "scores": {},
    }

    for key in MAIN_SCORES:
        scores["scores"][key] = None  # gerçek skorlar daha sonra gelecek

    return scores
