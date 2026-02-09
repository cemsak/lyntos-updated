from typing import Any, Dict, Optional, List

def _safe_num(x):
    try:
        return float(x)
    except Exception:
        return None

def _first(items: List[Dict], key: str, val: Any):
    for it in items or []:
        if it.get(key) == val:
            return it
    return None

# ---------- RADAR: otomatik giriş üretimi ----------
def _make_radar_inputs_from_data(data: Dict[str, Any]) -> Dict[str, Optional[bool]]:
    """LUCA mizan + banka + kurgan nedenlerinden RADAR sinyalleri türetir."""
    mizan = (data.get("luca") or {}).get("mizan") or {}
    banka = data.get("banka") or {}
    nedenler = ((data.get("kurgan") or {}).get("risk_nedenleri")) or []
    borc = _safe_num(mizan.get("borc_toplam"))
    alacak = _safe_num(mizan.get("alacak_toplam"))

    # basit sinyaller (gerçek veri analizi - sahte veri YASAK)
    kasa_nakit_anormal = None  # gerçek tespit için kasa/banka alt kırılımlar gerekir
    babs_uyumsuzluk = None     # BA/BS datası yoksa None bırak
    stok_yuksek = None
    stok_deger_dusuklugu = None
    faaliyet_gider_sapma = None
    pos_has = None
    degerleme_hatalari = None
    amortisman_hatalari = None

    # “Mizan dengesi” varsa risk düşürücü sinyal yorum için not (skorlamayı burada yapmayacağız)
    # Banka toplamı → bilgi amaçlı
    _ = banka.get("toplam_bakiye")

    return {
        "kasa_nakit_anormal": kasa_nakit_anormal,
        "babs_uyumsuzluk": babs_uyumsuzluk,
        "stok_yuksek": stok_yuksek,
        "stok_deger_dusuklugu": stok_deger_dusuklugu,
        "karlilik_sektor_sapma": None,
        "pos_hasılat_uyumsuz": pos_has,
        "faaliyet_gider_sapma": faaliyet_gider_sapma,
        "degerleme_hatalari": degerleme_hatalari,
        "amortisman_hatalari": amortisman_hatalari,
    }

def _radar_rule_eval(radar_in: Dict[str, Optional[bool]]) -> Dict[str, Any]:
    """Basit kural setiyle 0-100 skor. None → skorlamaya **katma** (uydurma yok)."""
    weights = {
        "kasa_nakit_anormal": 10,
        "babs_uyumsuzluk": 12,
        "stok_yuksek": 8,
        "stok_deger_dusuklugu": 6,
        "karlilik_sektor_sapma": 10,
        "pos_hasılat_uyumsuz": 8,
        "faaliyet_gider_sapma": 6,
        "degerleme_hatalari": 12,
        "amortisman_hatalari": 8,
    }
    score = 0
    reasons = []
    for k, w in weights.items():
        v = radar_in.get(k)
        if v is True:
            score += w
            reasons.append(f"+ {k.replace('_',' ').title()}")
        elif v is False:
            # açıkça iyi sinyal gelirse hafif azalt (0’ın altına düşürme)
            score = max(0, score - w//4)

    score = max(0, min(100, score))
    durum = "Düşük" if score < 30 else ("Orta" if score < 60 else "Yüksek")
    return {"radar_risk_skoru": score, "radar_risk_durumu": durum, "nedenler": reasons}

# ---------- SMİYB: Genelge tabanlı değerlendirme ----------
def _analyze_shb(data: Dict[str, Any], params: Dict[str, Optional[bool]]) -> Dict[str, Any]:
    """
    Genelge maddelerine göre kanıt kontrolü.
    params: sevk_irsaliye(bool), dbs_kullanimi(bool), ciro_zinciri_temiz(bool), mbr_vtr_var(bool), depo_kapasitesi_yeterli(bool)
    """
    score = 0
    reasons = []
    missing = []

    def add(flag, pts, neden, kanit, oner):
        nonlocal score
        if flag is True:
            score += pts
            reasons.append({"neden": neden, "etki": "Artırıcı", "kanit": kanit, "onerı": oner})
        elif flag is False:
            reasons.append({"neden": neden, "etki": "Azaltıcı", "kanit": kanit, "onerı": "Mevcut uygulamayı sürdürün."})
        else:
            missing.append(neden)

    # 1.8 Sevk/taşıma belgeleri
    add(params.get("sevk_irsaliye"), 8, "1.8_sevkiyat_belgeleri", "Sevk/irsaliye var mı, güzergâh uyumu?", "Plaka/kilometre/güzergâh doğrulamaları saklayın.")
    # 1.9 Ödeme akışı, DBS ve ciro zinciri
    add(params.get("dbs_kullanimi"), 6, "1.9_odeme_akisi_dbs", "DBS ile ödeme yapıldı mı?", "DBS/çek dekontlarını dosyalayın.")
    add(params.get("ciro_zinciri_temiz"), 6, "1.9_cirolar_teminat", "Çek zinciri temiz mi?", "Ciro zincirini ve tahsil kayıtlarını ekleyin.")
    # 1.2 Faaliyetle ilgililik (elde veri yoksa dokunma)
    add(params.get("faaliyet_ilgisi"), 0, "1.2_faaliyet_ilgisi", "Faaliyetle uyum", "Satın alma onay kayıtlarını iliştirin.")
    # 1.7 Depo kapasitesi
    add(params.get("depo_kapasitesi_yeterli"), 4, "1.7_depolama_kapasitesi", "Depolama fiziki yeterlilik", "Kapasite/ambar kayıtlarını iliştirin.")
    # 1.1 MBR/VTR
    add(params.get("mbr_vtr_var"), 8, "1.1_vtr_mbr", "MBR/VTR referansı mevcut mu?", "VTR ve MBR ekran görüntülerini iliştirin.")
    # Karşı taraf risk
    karsi = ((data.get("kurgan") or {}).get("karsi_firma")) or []
    if _first(karsi, "risk", "Yüksek"):
        score += 6
        reasons.append({"neden": "Karşı tarafta yüksek risk", "etki": "Artırıcı",
                        "kanit": "karsi_firma listesinde 'Yüksek'", "onerı": "Karşıt tespit ve BA/BS mutabakatlarını güçlendirin."})

    score = max(0, min(100, score))
    durum = "Düşük" if score < 35 else ("Orta" if score < 60 else "Yüksek")
    return {"skor": score, "durum": durum, "nedenler": reasons, "eksik_veriler": missing}

# ---------- VDK & AI Yorum ----------
def _vdk_uzmani_yorumu(data: Dict[str, Any], radar: Dict[str, Any], shb: Dict[str, Any]) -> str:
    parts = []
    parts.append(f"RADAR: {radar.get('radar_risk_durumu','(yok)')} ({radar.get('radar_risk_skoru','-')}).")
    parts.append(f"SMİYB: {shb.get('durum','(yok)')} ({shb.get('skor','-')}).")
    # Kanıta dayalı kısa öneri
    aksiyon = []
    if (radar.get("radar_risk_skoru") or 0) >= 60:
        aksiyon.append("BA/BS ve değerleme kayıtlarını kontrol edin.")
    if (shb.get("durum") == "Orta") or (shb.get("durum") == "Yüksek"):
        aksiyon.append("Sevk/DBS/MBR-VTR kanıtlarını dosyaya ekleyin.")
    if not aksiyon:
        aksiyon.append("Mevcut kontrol seviyesini koruyun.")
    parts.append("Öneri: " + " ".join(aksiyon))
    return " ".join(parts)

def _ai_genel_analiz(data: Dict[str, Any], radar: Dict[str, Any], shb: Dict[str, Any]) -> str:
    # Kısa, kanıta dayalı özet
    ozet = []
    ozet.append(f"Genel risk: RADAR={radar.get('radar_risk_durumu','(yok)')}, SMİYB={shb.get('durum','(yok)')}.")
    if shb.get("eksik_veriler"):
        ozet.append("Eksik kanıt: " + ", ".join(shb["eksik_veriler"][:5]) + ("..." if len(shb["eksik_veriler"])>5 else ""))
    ozet.append("Genel Kanaat: " + (
        "Yüksek" if (radar.get("radar_risk_skoru",0)>=60 or shb.get("durum")=="Yüksek")
        else "Orta" if (radar.get("radar_risk_skoru",0)>=30 or shb.get("durum")=="Orta")
        else "Düşük"
    ))
    return " ".join(ozet)

# ---------- Tek giriş noktası ----------
def enrich_analysis(data: Dict[str, Any],
                    sevk_irsaliye: Optional[bool]=None,
                    dbs_kullanimi: Optional[bool]=None,
                    ciro_zinciri_temiz: Optional[bool]=None,
                    mbr_vtr_var: Optional[bool]=None,
                    depo_kapasitesi_yeterli: Optional[bool]=None,
                    faaliyet_ilgisi: Optional[bool]=None) -> Dict[str, Any]:
    """Mevcut data'yı bozmadan radar, smiyb, vdk & ai alanlarını üretir/iyileştirir."""
    try:
        # 1) RADAR
        if not data.get("radar"):
            radar_in = _make_radar_inputs_from_data(data)
            data["radar"] = _radar_rule_eval(radar_in)

        # 2) SMİYB
        params = {
            "sevk_irsaliye": sevk_irsaliye,
            "dbs_kullanimi": dbs_kullanimi,
            "ciro_zinciri_temiz": ciro_zinciri_temiz,
            "mbr_vtr_var": mbr_vtr_var,
            "depo_kapasitesi_yeterli": depo_kapasitesi_yeterli,
            "faaliyet_ilgisi": faaliyet_ilgisi,
        }
        data["sahte_fatura_riski"] = _analyze_shb(data, params)

        # 3) VDK & AI
        data["vdk_uzmani_yorumu"] = _vdk_uzmani_yorumu(data, data["radar"], data["sahte_fatura_riski"])
        data["ai_analizi"] = _ai_genel_analiz(data, data["radar"], data["sahte_fatura_riski"])
    except Exception as e:
        # Güvenli: hata olsa da eski data döner
        data.setdefault("_enrich_error", str(e))
    return data
