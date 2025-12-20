"""
risk_model/metrics.py

Görev:
- data_engine'den gelen standart veri setlerini kullanarak
- ham metrikleri hesaplamak (oranlar, trendler, sayımlar vb.)

Şu an sadece iskelet fonksiyon var.
Gerçek metrikleri, Hakkı Özkan'ın verilerini gördükten sonra tek tek dolduracağız.
"""

from typing import Dict, Any


def compute_all_metrics(firma: str, donem: str, data_bundle: Dict[str, Any]) -> Dict[str, float]:
    """
    Tüm KPI'ların ihtiyaç duyacağı ham metrikleri hesaplar.
    Şimdilik sadece iskelet: boş sözlük döndürür.

    Parametreler:
        firma: Mükellef adı veya kodu
        donem: Örn. "2025-Q4"
        data_bundle: data_engine tarafından hazırlanmış birleşik veri:
            {
              "mizan": ...,
              "banka": ...,
              "beyanname": ...,
              "edefter": ...,
              "babs": ...,
              "enflasyon": ...
            }

    Dönüş:
        metrik_adi -> sayısal değer
    """
    # TODO: Buraya K1_KASA_CIRO_ORANI vb. ham metrik hesaplarını ekleyeceğiz.
    metrics: Dict[str, float] = {}

    # Örnek (ileride gerçek hesaplar gelecek):
    # metrics["K1_KASA_CIRO_ORANI"] = kasa_bakiyesi / net_satis

    return metrics
