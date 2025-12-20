"""
ai_layer/explanations.py

Görev:
- risk_model skor ve KPI sonuçlarını alıp
- SMMM için okunabilir "özet / kontrol listesi / genel tavsiye" metni üretmek.

Şimdilik:
- Sadece imza fonksiyonu var, içerik yok.
"""

from typing import Dict, Any


def build_ai_explanation(scores: Dict[str, Any], kpi_results: Dict[str, Any]) -> Dict[str, str]:
    """
    İleride:
    - Burada OpenAI vb. model çağrısı için prompt hazırlanacak.
    - docs/risk_model_v1.md içindeki "Neden risk / Ne kontrol etmeli / Genel tavsiye"
      alanları burada kullanılacak.

    Şimdilik:
    - Boş yapıyla döner.
    """
    return {
        "summary": "",
        "checklist": "",
        "advice": "",
    }
