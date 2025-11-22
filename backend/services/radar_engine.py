# ~/lyntos/backend/services/radar_engine.py
# RADAR Engine v1 — VDK/RAS kriterlerine dayalı risk skoru
# Not: Eksik veri alanlarını güvenle varsayar; hiçbir zaman exception fırlatmaz.

from typing import Dict, Any, List, Tuple

############################
# Yardımcı Fonksiyonlar
############################

def _safe_get(d: Dict, path: List[str], default=None):
    cur = d or {}
    for p in path:
        if isinstance(cur, dict) and p in cur:
            cur = cur[p]
        else:
            return default
    return cur

def _pct(x: float, y: float) -> float:
    try:
        if y == 0 or y is None:
            return 0.0
        return float(x) / float(y)
    except Exception:
        return 0.0

def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def _as_bool(x) -> bool:
    return bool(x) if x is not None else False

def _add_reason(nedenler: List[Dict[str, Any]], baslik: str, etki: str, kanit: str, puan: float):
    """
    etki: 'Düşük', 'Orta', 'Yüksek' (etkinin şiddeti)
    puan: bu alt kriterden gelen 0–100 risk puanı (ham).
    """
    if puan <= 0:
        return
    nedenler.append({
        "baslik": baslik,
        "etki": etki,
        "kanit": kanit,
        "puan": round(puan, 1)
    })

############################
# Ana Kategori Kontrolleri
############################

def _check_hazir_degerler(data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]], List[str]]:
    """
    Kasa/Banka dengesizlikleri, nakit varken kredi kullanımı vb.
    Girdi alanları:
        banka.toplam_bakiye
        metrics.nakit_var_kredi_var (bool)
    """
    nedenler, oneriler = [], []

    banka_toplam = _safe_get(data, ["banka", "toplam_bakiye"], 0.0)
    mizan_borc = _safe_get(data, ["luca", "mizan", "borc_toplam"], 0.0)
    mizan_alacak = _safe_get(data, ["luca", "mizan", "alacak_toplam"], 0.0)
    mizan_dengeli = bool(_safe_get(data, ["luca", "mizan", "dengeli"], True))
    nakit_var_kredi_var = _as_bool(_safe_get(data, ["metrics", "nakit_var_kredi_var"], False))

    # 1) Aşırı nakit birikimi (kaba ölçüt: nakit / (borç+alacak))
    den = (mizan_borc + mizan_alacak) or 1.0
    nakit_orani = _pct(banka_toplam, den)
    # 0.5 üstü agresif kabul edelim (demo mantık)
    puan_nakit_sis = _clamp((nakit_orani - 0.3) / (0.5 - 0.3), 0, 1) * 100 if nakit_orani > 0.3 else 0
    if puan_nakit_sis > 0:
        _add_reason(nedenler, "Kasa/Banka Şişmesi", "Orta", f"Nakit oranı %{round(nakit_orani*100,1)}", puan_nakit_sis)
        oneriler.append("Nakit fazlasını verimli enstrümanlarda değerlendirin; kredi ihtiyacı varsa azaltın.")

    # 2) Nakit varken kredi kullanımı
    puan_kredi = 70.0 if nakit_var_kredi_var else 0.0
    if puan_kredi > 0:
        _add_reason(nedenler, "Nakit varken kredi kullanımı", "Yüksek", "Verimsiz finansman yapısı", puan_kredi)
        oneriler.append("Kredi kullanımı ile nakit seviyesi aynı dönemde yüksek; kredi azaltımı ve refinansman düşünün.")

    # 3) Mizan dengesizliği (hazır değerler kategorisine hafif olumsuz)
    puan_mizan = 0.0 if mizan_dengeli else 30.0
    if puan_mizan > 0:
        _add_reason(nedenler, "Mizan dengesizliği", "Orta", "Borç/Alacak eşitliği bozulmuş", puan_mizan)
        oneriler.append("Mizan eşitliğini sağlayın; dönem sonu düzeltmelerini kontrol edin.")

    toplam_puan = _clamp(puan_nakit_sis + puan_kredi + puan_mizan, 0, 100)
    return toplam_puan, nedenler, oneriler


def _check_ticari_alacaklar(data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]], List[str]]:
    """
    Alacak/Satış oranı ve şüpheli alacak karşılığı
    Girdi alanları (opsiyonel):
        metrics.alacak_satis_orani (0–3 tipik)
        metrics.supheli_alacak_orani (0–1)
    """
    nedenler, oneriler = [], []
    alacak_satis = float(_safe_get(data, ["metrics", "alacak_satis_orani"], 0.8))  # ~0.8 varsayalım
    supheli_oran = float(_safe_get(data, ["metrics", "supheli_alacak_orani"], 0.03))

    puan1 = 0.0
    if alacak_satis > 1.2:
        # 1.2 → 0 puan eşiği, 2.0 → 100 puan
        puan1 = _clamp((alacak_satis - 1.2) / (2.0 - 1.2), 0, 1) * 100
        _add_reason(nedenler, "Tahsilat Riski", "Yüksek", f"Alacak/Satış oranı: {alacak_satis:.2f}", puan1)
        oneriler.append("Vade ve tahsilat koşullarını gözden geçirin; problemli müşterilere limit uygulayın.")

    puan2 = 0.0
    if supheli_oran > 0.10:
        puan2 = _clamp((supheli_oran - 0.10) / (0.30 - 0.10), 0, 1) * 100
        _add_reason(nedenler, "Yüksek Şüpheli Alacak", "Orta", f"Şüpheli karşılık oranı %{supheli_oran*100:.1f}", puan2)
        oneriler.append("Takipteki alacaklar için icra/dava süreçlerini hızlandırın; tahsilat planı yapın.")

    toplam = _clamp(puan1 + puan2, 0, 100)
    return toplam, nedenler, oneriler


def _check_ticari_borclar_babs(data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]], List[str]]:
    """
    Ba/Bs ve KDV beyan uyumu
    metrics.ba_bs_uyumsuz (bool)
    metrics.kdv_beyan_tutarsiz (bool)
    """
    nedenler, oneriler = [], []
    ba_bs_uyumsuz = _as_bool(_safe_get(data, ["metrics", "ba_bs_uyumsuz"], False))
    kdv_tutarsiz = _as_bool(_safe_get(data, ["metrics", "kdv_beyan_tutarsiz"], False))

    puan = 0.0
    if ba_bs_uyumsuz:
        puan += 60.0
        _add_reason(nedenler, "Ba/Bs Uyumsuzluğu", "Yüksek", "Alış/Satış bildirimi uyumsuz", 60.0)
        oneriler.append("e-Fatura/e-Arşiv ile Ba/Bs kayıtlarını mutabık hale getirin.")

    if kdv_tutarsiz:
        puan += 40.0
        _add_reason(nedenler, "KDV Beyan Tutarsızlığı", "Orta", "KDV beyanı ile kayıtlar uyumsuz", 40.0)
        oneriler.append("KDV matrah/indirilecek kalemleri yeniden kontrol edin, düzeltme beyanı gerekebilir.")

    return _clamp(puan, 0, 100), nedenler, oneriler


def _check_stoklar(data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]], List[str]]:
    """
    metrics.stok_orani (Stok/Dönen varlık ~ 0–1)
    metrics.stok_deger_dusus_orani (0–1)
    """
    nedenler, oneriler = [], []
    stok_oran = float(_safe_get(data, ["metrics", "stok_orani"], 0.35))
    stok_ddo = float(_safe_get(data, ["metrics", "stok_deger_dusus_orani"], 0.02))

    puan1 = 0.0
    if stok_oran > 0.5:
        puan1 = _clamp((stok_oran - 0.5) / (0.9 - 0.5), 0, 1) * 100
        _add_reason(nedenler, "Stok Şişmesi", "Orta", f"Stok/Dönen: {stok_oran:.2f}", puan1)
        oneriler.append("Yavaş dönen stokları tasfiye edin; satın alma politikalarını revize edin.")

    puan2 = 0.0
    if stok_ddo > 0.1:
        puan2 = _clamp((stok_ddo - 0.1) / (0.3 - 0.1), 0, 1) * 100
        _add_reason(nedenler, "Stok Değer Düşüklüğü", "Hafif", f"Oran %{stok_ddo*100:.1f}", puan2)
        oneriler.append("Değer düşüklüğü yüksek; fiyat/raf stratejisini ve kaliteyi gözden geçirin.")

    return _clamp(puan1 + puan2, 0, 100), nedenler, oneriler


def _check_duran_varliklar(data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]], List[str]]:
    """
    metrics.duran_varlik_orani (Duran/Aktif)
    metrics.amortisman_yontem_degisti (bool)
    """
    nedenler, oneriler = [], []
    d_oran = float(_safe_get(data, ["metrics", "duran_varlik_orani"], 0.45))
    amort_degisti = _as_bool(_safe_get(data, ["metrics", "amortisman_yontem_degisti"], False))

    puan1 = 0.0
    if d_oran > 0.7:
        puan1 = _clamp((d_oran - 0.7) / (0.95 - 0.7), 0, 1) * 100
        _add_reason(nedenler, "Likidite Zayıf (Duran Ağırlık)", "Orta", f"Duran/Aktif: {d_oran:.2f}", puan1)
        oneriler.append("Duran varlık yatırımlarını nakit akışına göre planlayın.")

    puan2 = 40.0 if amort_degisti else 0.0
    if puan2 > 0:
        _add_reason(nedenler, "Amortisman Yöntemi Değişmiş", "Orta", "VUK kontrollü olmalı", puan2)
        oneriler.append("Amortisman yöntemi değişimi VUK’a uygun mu? Belgeleri hazırlayın.")

    return _clamp(puan1 + puan2, 0, 100), nedenler, oneriler


def _check_mali_borclar(data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]], List[str]]:
    """
    metrics.banka_kredileri (TL)
    metrics.ortaklara_borc_sermaye_orani (x)
    """
    nedenler, oneriler = [], []
    krediler = float(_safe_get(data, ["metrics", "banka_kredileri"], 0.0))
    nakit = float(_safe_get(data, ["banka", "toplam_bakiye"], 0.0))
    ortak_borc_sermaye = float(_safe_get(data, ["metrics", "ortaklara_borc_sermaye_orani"], 0.5))

    puan1 = 0.0
    if nakit > 0 and krediler > 0:
        # nakit varken kredi: risk
        puan1 = 60.0
        _add_reason(nedenler, "Kredi + Yüksek Nakit", "Yüksek", f"Kredi ≈ ₺{krediler:,.0f} | Nakit ≈ ₺{nakit:,.0f}", puan1)
        oneriler.append("Kredi/nakit politikası optimize edilmeli (faiz gideri ↓).")

    puan2 = 0.0
    if ortak_borc_sermaye > 3.0:
        puan2 = _clamp((ortak_borc_sermaye - 3.0) / (5.0 - 3.0), 0, 1) * 100
        _add_reason(nedenler, "Örtülü Kazanç Riski (Ortaklara Borç)", "Yüksek", f"Oran {ortak_borc_sermaye:.2f}x", puan2)
        oneriler.append("Ortaklara borç/sermaye oranı yüksek; emsal faiz ve TF fiyatlandırması kontrol edilmeli.")

    return _clamp(puan1 + puan2, 0, 100), nedenler, oneriler


def _check_satislar_kar(data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]], List[str]]:
    """
    metrics.kar_marji (0–1)
    metrics.nakit_satis_orani (0–1)
    """
    nedenler, oneriler = [], []
    kar_marji = float(_safe_get(data, ["metrics", "kar_marji"], 0.12))
    nakit_satis = float(_safe_get(data, ["metrics", "nakit_satis_orani"], 0.25))

    puan1 = 0.0
    if kar_marji < 0.08:
        puan1 = _clamp((0.08 - kar_marji) / 0.08, 0, 1) * 100
        _add_reason(nedenler, "Düşük Karlılık", "Orta", f"Kar marjı %{kar_marji*100:.1f}", puan1)
        oneriler.append("Maliyet ve fiyat stratejisini gözden geçirin; düşük marjlı ürünler azaltılmalı.")

    puan2 = 0.0
    if nakit_satis < 0.10:
        puan2 = _clamp((0.10 - nakit_satis) / 0.10, 0, 1) * 100
        _add_reason(nedenler, "Düşük Nakit Satış Oranı", "Hafif", f"Nakit satış %{nakit_satis*100:.1f}", puan2)
        oneriler.append("POS/online satış verileri ile hasılat eşleşmesi gözden geçirilmeli (kayıt dışı riski).")

    return _clamp(puan1 + puan2, 0, 100), nedenler, oneriler


def _check_satis_indirimleri(data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]], List[str]]:
    """
    metrics.satici_iskonto_orani (0–1)
    metrics.iliskili_iskonto_var (bool)
    """
    nedenler, oneriler = [], []
    iskonto = float(_safe_get(data, ["metrics", "satici_iskonto_orani"], 0.08))
    iliskili = _as_bool(_safe_get(data, ["metrics", "iliskili_iskonto_var"], False))

    puan1 = 0.0
    if iskonto > 0.15:
        puan1 = _clamp((iskonto - 0.15) / (0.35 - 0.15), 0, 1) * 100
        _add_reason(nedenler, "Yüksek İskonto", "Orta", f"İskonto %{iskonto*100:.1f}", puan1)
        oneriler.append("İskonto politikası emsallere uygun hale getirilmeli.")

    puan2 = 40.0 if iliskili else 0.0
    if puan2 > 0:
        _add_reason(nedenler, "İlişkili Kişide Emsal Dışı İskonto", "Yüksek", "Örtülü kazanç riski", puan2)
        oneriler.append("İlişkili kişilerle iskontolarda emsal içi fiyatlandırma şart.")

    return _clamp(puan1 + puan2, 0, 100), nedenler, oneriler


def _check_faaliyet_giderleri(data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]], List[str]]:
    """
    metrics.faaliyet_gideri_oran (Gider/Hasılat, 0–1)
    """
    nedenler, oneriler = [], []
    fg = float(_safe_get(data, ["metrics", "faaliyet_gideri_oran"], 0.22))

    puan = 0.0
    if fg > 0.30:
        puan = _clamp((fg - 0.30) / (0.55 - 0.30), 0, 1) * 100
        _add_reason(nedenler, "Yüksek Faaliyet Gideri", "Orta", f"Gider/Hasılat %{fg*100:.1f}", puan)
        oneriler.append("Gider kalemlerini (özellikle temsil/ağırlama/reklam) optimize edin.")

    return puan, nedenler, oneriler


def _check_degerleme_amortisman(data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]], List[str]]:
    """
    metrics.dovizli_alacak_kur_farki_hatasi (bool)
    metrics.amortisman_yontem_degisti (bool) — zaten üstte de kullanıldı; burada da VUK vurgusu
    """
    nedenler, oneriler = [], []
    kur_hatasi = _as_bool(_safe_get(data, ["metrics", "dovizli_alacak_kur_farki_hatasi"], False))
    amort_degisti = _as_bool(_safe_get(data, ["metrics", "amortisman_yontem_degisti"], False))

    puan = 0.0
    if kur_hatasi:
        puan += 60.0
        _add_reason(nedenler, "Kur Farkı Değerleme Hatası", "Yüksek", "VUK’a aykırı kur uygulanmış", 60.0)
        oneriler.append("Dövizli alacak/borç değerlemelerini tebliğlere göre düzeltin.")

    if amort_degisti:
        # burada daha düşük ek puan; ana etkisini duran varlıklarda verdik
        puan += 20.0
        _add_reason(nedenler, "Amortisman Değişimi (ek)", "Hafif", "Yöntem değişimi tespiti", 20.0)

    return _clamp(puan, 0, 100), nedenler, oneriler


def _check_ihtilafli_alacaklar(data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]], List[str]]:
    """
    metrics.supheli_alacak_icra (bool) — dava/icra yoksa karşılık riskli
    """
    nedenler, oneriler = [], []
    icra_yok = not _as_bool(_safe_get(data, ["metrics", "supheli_alacak_icra"], True))  # default: icra var say
    puan = 0.0
    if icra_yok:
        puan = 70.0
        _add_reason(nedenler, "Şüpheli Alacakta İcra/Dava Yok", "Yüksek", "Karşılık geçersiz olabilir", 70.0)
        oneriler.append("Şüpheli alacaklar için icra/dava başlatın veya karşılığı gözden geçirin.")
    return puan, nedenler, oneriler


def _check_transfer_fiyatlandirmasi(data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]], List[str]]:
    """
    metrics.tf_emsal_faiz_altinda (bool)
    """
    nedenler, oneriler = [], []
    tf_alt = _as_bool(_safe_get(data, ["metrics", "tf_emsal_faiz_altinda"], False))
    puan = 50.0 if tf_alt else 0.0
    if puan > 0:
        _add_reason(nedenler, "TF – Emsal Faiz Altı", "Orta", "İlişkiliye borçta faiz düşük", puan)
        oneriler.append("TCMB ağırlıklı ortalama faizini dikkate alarak faiz oranlarını güncelleyin.")
    return puan, nedenler, oneriler


############################
# Ağırlıklar ve Toplayıcı
############################

WEIGHTS = {
    "hazir_degerler":            0.15,
    "ticari_alacaklar":          0.10,
    "ticari_borclar_babs":       0.10,
    "stoklar":                   0.05,
    "duran_varliklar":           0.10,
    "mali_borclar":              0.10,
    "satislar_kar":              0.10,
    "satis_indirimleri":         0.05,
    "faaliyet_giderleri":        0.05,
    "degerleme_amortisman":      0.05,
    "ihtilafli_alacaklar":       0.05,
    "transfer_fiyatlandirmasi":  0.05,
}
# Not: Toplam 1.0’a yakın. Aksi durumda normalize edeceğiz.

def _risk_durumu(skor: float) -> str:
    if skor >= 80:
        return "Yüksek"
    if skor >= 60:
        return "Orta"
    return "Düşük"

def calculate_radar_score(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Dış arayüz: main.py içinden çağırılır.
    Girdi: KURGAN / LUCA / Banka / metrics birleşik sözlüğü (eksik olabilir, sorun değil).
    Çıktı:
      {
        "radar_risk_skoru": float(0-100),
        "radar_risk_durumu": "Düşük/Orta/Yüksek",
        "nedenler": [ {baslik, etki, kanit, puan} ],
        "oneriler": [str, ...],
        "bilesen_puanlari": {kategori_adı: 0-100}
      }
    """

    # Her kategori puan, neden ve öneri döndürür:
    checks = [
        ("hazir_degerler",           _check_hazir_degerler),
        ("ticari_alacaklar",         _check_ticari_alacaklar),
        ("ticari_borclar_babs",      _check_ticari_borclar_babs),
        ("stoklar",                  _check_stoklar),
        ("duran_varliklar",          _check_duran_varliklar),
        ("mali_borclar",             _check_mali_borclar),
        ("satislar_kar",             _check_satislar_kar),
        ("satis_indirimleri",        _check_satis_indirimleri),
        ("faaliyet_giderleri",       _check_faaliyet_giderleri),
        ("degerleme_amortisman",     _check_degerleme_amortisman),
        ("ihtilafli_alacaklar",      _check_ihtilafli_alacaklar),
        ("transfer_fiyatlandirmasi", _check_transfer_fiyatlandirmasi),
    ]

    bilesen_puanlari: Dict[str, float] = {}
    tum_nedenler: List[Dict[str, Any]] = []
    tum_oneriler: List[str] = []
    w_sum = sum(WEIGHTS.values()) or 1.0

    # Her bir kategoriyi çalıştır
    for key, fn in checks:
        try:
            puan, nedenler, oneriler = fn(data)
        except Exception as e:
            # Her ihtimale karşı devrilme olmasın
            puan, nedenler, oneriler = 0.0, [], [f"{key} hesaplanamadı: {e}"]
        bilesen_puanlari[key] = _clamp(puan, 0, 100)
        tum_nedenler.extend(nedenler)
        tum_oneriler.extend(oneriler)

    # Ağırlıklı toplam → 0–100
    toplam = 0.0
    for key, puan in bilesen_puanlari.items():
        w = WEIGHTS.get(key, 0.0) / w_sum
        toplam += w * puan
    toplam = _clamp(toplam, 0, 100)

    out = {
        "radar_risk_skoru": round(toplam, 1),
        "radar_risk_durumu": _risk_durumu(toplam),
        "nedenler": tum_nedenler,            # [{baslik, etki, kanit, puan}]
        "oneriler": list(dict.fromkeys(tum_oneriler))[:12],  # tekrarları kırp, ilk 12 öneri
        "bilesen_puanlari": bilesen_puanlari  # debug/görselleştirme için yararlı
    }

    return out

