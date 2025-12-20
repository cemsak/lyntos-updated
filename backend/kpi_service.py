"""
kpi_service.py

LYNTOS KPI ve panel servisleri.

Bu sürümde:
- Eski demo / MVP tarzı skor hesapları KALDIRILMIŞTIR.
- Tüm risk skorları risk_model paketine yönlendirilir.
- Henüz formülü yazılmamış skorlar None döndürür veya
  "not_implemented" bayrağı ile işaretlenir.
- Böylece SMMM'lere hiçbir şekilde sahte, uydurma skor verilmez.

Not:
- Bu dosya sadece backend tarafındaki iş mantığını içerir.
- CSV okuma, Luca export'ları vb. için basit yardımcılar kullanılır.
"""

from __future__ import annotations

from typing import Any, Dict

from utils.read_csv_as_dict import read_csv_as_dict
from data_engine import load_data_for_firma_period
from risk_model import (
    compute_all_metrics,
    compute_scores_from_metrics,
    RISK_MODEL_VERSION,
)
from ai_layer import build_ai_explanation


def _not_implemented(name: str, reason: str) -> Dict[str, Any]:
    """
    Henüz tanımlanmamış panel / skor fonksiyonları için
    standart bir çıktı üretir.
    """
    return {
        "ok": False,
        "not_implemented": True,
        "name": name,
        "reason": reason,
    }


def risk_model_v1_scores(firma: str, donem: str) -> Dict[str, Any]:
    """
    Lyntos Risk Model v1 ana giriş fonksiyonu.

    Adımlar:
    1) data_engine üzerinden ilgili firma/döneme ait tüm ham veriyi yükler.
    2) risk_model.metrics ile ham metrikleri hesaplar.
    3) risk_model.scoring ile ana skorları üretir.
    4) ai_layer ile skor ve metriklere dair açıklama/tavsiye iskeletini döndürür.

    ÖNEMLİ:
    - Şu an risk_model.metrics ve scoring içinde formüller
      kademeli olarak yazılacaktır.
    - Hiçbir yerde "kafadan atılmış" rakam yoktur.
      Henüz tanımlanmayan skorlar None olarak kalır.
    """
    try:
        data_bundle = load_data_for_firma_period(firma, donem)
    except Exception as exc:
        return {
            "ok": False,
            "error": "DATA_LOAD_ERROR",
            "message": str(exc),
        }

    # Ham metrikler (şu an için boş sözlük dönebilir)
    metrics = compute_all_metrics(firma, donem, data_bundle)

    # Ana skorlar (şu an için her biri None olabilir)
    scores_struct = compute_scores_from_metrics(metrics)
    scores = scores_struct.get("scores", {})

    # AI açıklama katmanı (şu an için boş stringler dönebilir)
    ai_explanation = build_ai_explanation(scores, metrics)

    return {
        "ok": True,
        "version": RISK_MODEL_VERSION,
        "firma": firma,
        "donem": donem,
        "metrics": metrics,
        "scores": scores,
        "ai": ai_explanation,
    }


# ---------------------------------------------------------------------------
#  Aşağıdaki fonksiyonlar, main.py'nin import ettiği eski isimleri korur.
#  Böylece frontend kodu kırılmadan, yeni risk motoruna yönlendirme yapılabilir.
# ---------------------------------------------------------------------------

def kurgan_risk_score(firma: str, donem: str) -> Dict[str, Any]:
    """
    Eski kurgan_risk_score yerine, yeni risk motorundan sadece
    kurgan_risk skorunu döndürür.

    Eğer skor henüz hesaplanmıyorsa (None), bu bilgi aynen çağırana iletilir.
    Demo amaçlı hiçbir uydurma skor üretmez.
    """
    base = risk_model_v1_scores(firma, donem)
    if not base.get("ok"):
        return base
    skor = (base.get("scores") or {}).get("kurgan_risk")
    return {
        "ok": True,
        "version": base.get("version"),
        "firma": firma,
        "donem": donem,
        "score": skor,
    }


def radar_risk_score(firma: str, donem: str) -> Dict[str, Any]:
    """
    Yeni risk motorundaki RADAR / RAS benzeri skor alanı için
    placeholder fonksiyonu.

    Gerçek formül risk_model.scoring içinde tanımlanacaktır.
    """
    base = risk_model_v1_scores(firma, donem)
    if not base.get("ok"):
        return base
    skor = (base.get("scores") or {}).get("radar_risk")
    return {
        "ok": True,
        "version": base.get("version"),
        "firma": firma,
        "donem": donem,
        "score": skor,
    }


def tax_compliance_score(firma: str, donem: str) -> Dict[str, Any]:
    """
    Vergi uyum skorunun yeni risk motorundan alınan hali.

    Gerçek kriterler:
    - Beyanname verme ve ödeme tarihlerinin zamanında olup olmadığı
    - Son yıllardaki ceza kayıtları vb.
    risk_model.metrics & scoring'te tanımlanacaktır.
    """
    base = risk_model_v1_scores(firma, donem)
    if not base.get("ok"):
        return base
    skor = (base.get("scores") or {}).get("tax_compliance")
    return {
        "ok": True,
        "version": base.get("version"),
        "firma": firma,
        "donem": donem,
        "score": skor,
    }


def smiyb_risk_status(firma: str, donem: str) -> Dict[str, Any]:
    """
    Sahte / muhteviyatı itibariyle yanıltıcı belge (SMİYB) analizi için
    skor alanını döndürür.

    Burada da gerçek formül risk_model tarafında olacaktır. Bu fonksiyon,
    sadece skorun kendisini ve basit bir "status" alanını taşır.
    """
    base = risk_model_v1_scores(firma, donem)
    if not base.get("ok"):
        return base
    skor = (base.get("scores") or {}).get("smiyb_risk")

    status = None
    if isinstance(skor, (int, float)):
        # Eşikler ileride yeniden tanımlanabilir; şu an sadece örnek mantık
        # olarak boş bırakıyoruz.
        status = None

    return {
        "ok": True,
        "version": base.get("version"),
        "firma": firma,
        "donem": donem,
        "score": skor,
        "status": status,
    }


# ---------------------------------------------------------------------------
#  Panel fonksiyonları
#  (Şimdilik büyük kısmı "henüz tasarlanmamış" olarak işaretleniyor.)
# ---------------------------------------------------------------------------

def uyum_panel_data(firma: str, donem: str) -> Dict[str, Any]:
    return _not_implemented(
        "uyum_panel_data",
        "Uyum paneli, risk_model metrics sonuçlarına göre tasarlanacaktır."
    )


def mizan_panel_data(firma: str, donem: str) -> Dict[str, Any]:
    """
    Mizan paneli için basit, demo olmayan özet:
    - Sadece mizan satır sayısı ve toplam borç/alacak gibi agregasyonlar döner.
    - Risk skoru üretmez.
    """
    try:
        rows = read_csv_as_dict("data/converted/mizan.csv")
    except Exception as exc:
        return {
            "ok": False,
            "error": "DATA_READ_ERROR",
            "message": str(exc),
        }

    borc = 0.0
    alacak = 0.0
    satir_sayisi = 0

    for r in rows:
        if r.get("firma") == firma and r.get("period") == donem:
            try:
                borc += float(r.get("borc_toplam") or 0)
                alacak += float(r.get("alacak_toplam") or 0)
            except (TypeError, ValueError):
                continue
            satir_sayisi += 1

    return {
        "ok": True,
        "firma": firma,
        "donem": donem,
        "borc_toplam": round(borc, 2),
        "alacak_toplam": round(alacak, 2),
        "dengeli": abs(borc - alacak) < 0.01,
        "satir_sayisi": satir_sayisi,
    }


def banka_mutabakat_panel_data(firma: str, donem: str) -> Dict[str, Any]:
    return _not_implemented(
        "banka_mutabakat_panel_data",
        "Banka mutabakat paneli henüz yeni risk mimarisine göre tasarlanmamıştır."
    )


def karsifirma_panel_data(firma: str, donem: str) -> Dict[str, Any]:
    return _not_implemented(
        "karsifirma_panel_data",
        "Karşı firma risk paneli henüz tanımlanmadı."
    )


def matrix13_panel_data(firma: str, donem: str) -> Dict[str, Any]:
    return _not_implemented(
        "matrix13_panel_data",
        "Matrix 13 paneli, risk_model KPI seti netleşince yazılacaktır."
    )


def fmea_panel_data(firma: str, donem: str) -> Dict[str, Any]:
    return _not_implemented(
        "fmea_panel_data",
        "FMEA paneli henüz tanımlanmadı."
    )


def anomaly_panel_data(firma: str, donem: str) -> Dict[str, Any]:
    return _not_implemented(
        "anomaly_panel_data",
        "Anomali paneli, risk_model metrikslerine göre tasarlanacaktır."
    )


def ag_panel_data(firma: str, donem: str) -> Dict[str, Any]:
    return _not_implemented(
        "ag_panel_data",
        "Ağ / fraud paneli henüz tanımlanmadı."
    )


def bowtie_panel_data(firma: str, donem: str) -> Dict[str, Any]:
    return _not_implemented(
        "bowtie_panel_data",
        "COSO/BowTie kontrol tasarımı paneli henüz tanımlanmadı."
    )


def capa_panel_data(firma: str, donem: str) -> Dict[str, Any]:
    return _not_implemented(
        "capa_panel_data",
        "CAPA/8D aksiyon takip paneli henüz tanımlanmadı."
    )


def why5_panel_data(firma: str, donem: str) -> Dict[str, Any]:
    return _not_implemented(
        "why5_panel_data",
        "5N1K / 5 Why kök neden paneli henüz tanımlanmadı."
    )


def ishikawa_panel_data(firma: str, donem: str) -> Dict[str, Any]:
    return _not_implemented(
        "ishikawa_panel_data",
        "Balık kılçığı (Ishikawa) paneli henüz tanımlanmadı."
    )


def ai_panel_data(firma: str, donem: str) -> Dict[str, Any]:
    """
    Genel AI paneli:
    - risk_model_v1_scores çıktılarını ve metrikleri kullanarak
      SMMM için özet / checklist / tavsiye üretmek amacıyla kullanılacaktır.
    - Şimdilik sadece risk_model_v1_scores sonucunu pass-through ediyor.
    """
    return risk_model_v1_scores(firma, donem)


def vdk_panel_data(firma: str, donem: str) -> Dict[str, Any]:
    return _not_implemented(
        "vdk_panel_data",
        "VDK odaklı detay panel (kasa, alacaklar, stoklar, amortisman vb.) "
        "risk_model KPI sözlüğü tamamlandıktan sonra yazılacaktır."
    )


def edefter_panel_data(firma: str, donem: str) -> Dict[str, Any]:
    """
    E-defter paneli:
    - Sadece veri var/yok, satır sayısı gibi basit bilgileri döndürür.
    - Risk veya mevzuata uygunluk skoru üretmez.
    """
    try:
        rows = read_csv_as_dict("data/converted/edefter.csv")
    except Exception as exc:
        return {
            "ok": False,
            "error": "DATA_READ_ERROR",
            "message": str(exc),
        }

    count = 0
    for r in rows:
        if r.get("firma") == firma and r.get("period") == donem:
            count += 1

    return {
        "ok": True,
        "firma": firma,
        "donem": donem,
        "record_count": count,
    }


def musteri_panel_data(firma: str, donem: str) -> Dict[str, Any]:
    """
    Müşteri paneli:
    - Sadece müşteri satır sayısını döndürür.
    - Risk skoru üretmez.
    """
    try:
        rows = read_csv_as_dict("data/converted/musteri.csv")
    except Exception as exc:
        return {
            "ok": False,
            "error": "DATA_READ_ERROR",
            "message": str(exc),
        }

    count = 0
    for r in rows:
        if r.get("firma") == firma and r.get("period") == donem:
            count += 1

    return {
        "ok": True,
        "firma": firma,
        "donem": donem,
        "record_count": count,
    }
