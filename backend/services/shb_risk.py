from typing import Dict, Any, List, Tuple

# Basit ağırlık seti (toplam ~100 olacak şekilde)
WEIGHTS = {
    "1.1_vtr_bilerek": 15,
    "1.2_faaliyet_ilgisi": 8,
    "1.3_maliyet_kdv_oran": 10,
    "1.4_iliskili_kisi_musavir": 8,
    "1.5_karlilik_uyum": 8,
    "1.6_coklu_tedarikci": 5,
    "1.7_depolama_kapasitesi": 6,
    "1.8_sevkiyat_belgeleri": 12,
    "1.9_odeme_akisi": 12,
    "1.10_yoklama_tespit": 4,
    "1.11_gecmis_inceleme": 6,
    "1.12_ortak_yonetici_gecmis": 4,
    "1.13_e_imza_tarihleri": 2,
}

def _mk(reason:str, effect:str, evidence:str, suggestion:str)->Dict[str,str]:
    return {"neden":reason, "etki":effect, "kanit":evidence, "onerı":suggestion}

def analyze_shb(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    inputs beklenen alanlar (olanı kullanır, olmayanı 'veri yok' yazar):
      - vtr_bilerek (bool veya None)
      - faaliyet_ilgisi (bool/None)
      - maliyet_kdv_oran: {"belge_kdv_orani": float, "toplam_ind_kdv": float, "oran": float} (None olabilir)
      - iliskili_kisi (bool/None), musavir_degisim (bool/None), musavir_ifade (str/None)
      - karlilik_uyum (str: "uyumlu"|"sapma"|"veri_yok")
      - coklu_tedarikci (bool/None)
      - depo_kapasite_yeterli (bool/None)
      - sevk_belgeleri ({"vardir": bool/None, "uyumlu": bool/None, "plaka_anomali": bool/None})
      - odeme_akisi ({"gercek": bool/None, "iade": bool/None, "dbs": bool/None, "cek_anomali": bool/None})
      - yoklama_tespiti (bool/None)
      - gecmis_inceleme_bilerek (bool/None), yil_sayisi (int/None)
      - ortak_yonetici_gecmis (bool/None)
      - e_imza_tarih_uyum (bool/None)
      - karsi_firma_riskleri: [{"unvan":..., "risk":"Düşük/Orta/Yüksek", "durum":...}, ...]
    """
    reasons: List[Dict[str,str]] = []
    score = 0
    missing: List[str] = []

    def plus(flag, key, reason, effect_if_true, suggestion, evidence_true, evidence_false="veri yok/olumsuz"):
        nonlocal score, reasons, missing
        w = WEIGHTS[key]
        if flag is None:
            missing.append(key)
            return
        if flag:
            score += w
            reasons.append(_mk(reason, effect_if_true, evidence_true, suggestion))
        else:
            # veri var ama olumsuzluk yok → etki azaltıcı
            reasons.append(_mk(reason, "Azaltıcı", evidence_false, "Mevcut prosedürü sürdür."))

    # 1.1
    plus(inputs.get("vtr_bilerek"), "1.1_vtr_bilerek",
         "VTR'de bilerek kullanım tespiti", "Artırıcı",
         "Karşı taraf teyidi ve alış kanıtı güçlendirilmeli.",
         "VTR: bilerek kullanım var")

    # 1.2
    fi = inputs.get("faaliyet_ilgisi")
    plus(fi, "1.2_faaliyet_ilgisi",
         "Belge konusu mal/hizmet faaliyetle ilgili mi", "Azaltıcı" if fi else "Artırıcı",
         "Satın alma onay süreçleri/tedarikçi uygunluk kontrolü.",
         "Faaliyetle uyumlu", "Faaliyet dışı veya zayıf ilişki")

    # 1.3
    mko = inputs.get("maliyet_kdv_oran")
    if mko is None:
        missing.append("1.3_maliyet_kdv_oran")
    else:
        oran = mko.get("oran")
        if oran is None:
            missing.append("1.3_maliyet_kdv_oran.oran")
        else:
            if oran > 0.35:  # indirilecek KDV içindeki pay yüksek → risk artışı
                score += WEIGHTS["1.3_maliyet_kdv_oran"]
                reasons.append(_mk("Sahte belge KDV payı yüksek", "Artırıcı",
                                   f"İndirilecek KDV payı: {oran:.2%}", "Karşıt tespit ve belge teyidi artırılmalı."))
            else:
                reasons.append(_mk("Sahte belge KDV payı", "Azaltıcı",
                                   f"İndirilecek KDV payı: {oran:.2%}", "Mevcut iç kontroller yeterli."))

    # 1.4
    iliskili = inputs.get("iliskili_kisi")
    musdeg = inputs.get("musavir_degisim")
    plus(iliskili, "1.4_iliskili_kisi_musavir",
         "İlişkili kişi/meslek mensubu etkisi", "Artırıcı",
         "İlişkili işlemlerde emsal ve belge zinciri güçlendirilmeli.",
         "İlişkili kişi ilişkisi var")
    if musdeg is True:
        score += 3  # alt katkı
        reasons.append(_mk("MM sözleşme feshi/değişim", "Artırıcı",
                           (inputs.get("musavir_ifade") or "MM değişimi mevcut"),
                           "Fesih gerekçesi ve süreç kayıtları incelenmeli."))

    # 1.5
    k_uyum = inputs.get("karlilik_uyum", "veri_yok")
    if k_uyum == "sapma":
        score += WEIGHTS["1.5_karlilik_uyum"]
        reasons.append(_mk("Karlılık/ciro/vergi uyumu sapması", "Artırıcı",
                           "Sektör/önceki dönemlerle uyumsuz", "Oran analizleri ve düzeltme girişleri incelenmeli."))
    elif k_uyum == "uyumlu":
        reasons.append(_mk("Karlılık/ciro/vergi uyumu", "Azaltıcı",
                           "Sektör/önceki dönemle uyumlu", "Mevcut takip sürdürülmeli."))
    else:
        missing.append("1.5_karlilik_uyum")

    # 1.6
    plus(inputs.get("coklu_tedarikci"), "1.6_coklu_tedarikci",
         "Sahte belgeyi birden fazla mükelleften alma", "Artırıcı",
         "Tedarikçi doğrulama ve limit kontrolü sıkılaştırılmalı.",
         "Birden fazla tedarikçi tespiti")

    # 1.7
    depo = inputs.get("depo_kapasite_yeterli")
    if depo is None:
        missing.append("1.7_depolama_kapasitesi")
    else:
        if depo is False:
            score += WEIGHTS["1.7_depolama_kapasitesi"]
            reasons.append(_mk("Depolama kapasitesi yetersiz", "Artırıcı",
                               "Fiziksel kapasite beyan edilen mal miktarını karşılamıyor",
                               "Stok/doğrulama ve fiili sayım yapılmalı."))
        else:
            reasons.append(_mk("Depolama kapasitesi", "Azaltıcı",
                               "Kapasite yeterli", "Stok kayıt prosedürleri sürdür."))

    # 1.8
    sevk = inputs.get("sevk_belgeleri", {})
    if not sevk:
        missing.append("1.8_sevkiyat_belgeleri")
    else:
        vardir = sevk.get("vardir")
        uyumlu = sevk.get("uyumlu")
        plaka = sevk.get("plaka_anomali")
        if vardir is True and uyumlu is True and not plaka:
            reasons.append(_mk("Sevk/taşıma belgeleri", "Azaltıcı", "İrsaliye/tesellüm/plaka uyumlu", "Mevcut süreç iyi."))
        else:
            score += WEIGHTS["1.8_sevkiyat_belgeleri"]
            reasons.append(_mk("Sevk/taşıma belgelerinde sorun", "Artırıcı",
                               "Belge yok/uyumsuz veya plaka anomali", "Sevk zinciri kanıtları güçlendirilmeli."))

    # 1.9
    odeme = inputs.get("odeme_akisi", {})
    if not odeme:
        missing.append("1.9_odeme_akisi")
    else:
        gercek = odeme.get("gercek")
        iade = odeme.get("iade")
        cek_anom = odeme.get("cek_anomali")
        if gercek is False or iade is True or cek_anom is True:
            score += WEIGHTS["1.9_odeme_akisi"]
            reasons.append(_mk("Ödeme akışında şüphe", "Artırıcı",
                               "Fiktif/iade/çek ciro anomali", "Banka kayıtları ve ciro silsilesi detaylı incelenmeli."))
        else:
            reasons.append(_mk("Ödeme akışı", "Azaltıcı",
                               "Gerçek ve izlenebilir", "DBS/iban/doğrulanmış akış tercih edilmeli."))

    # 1.10
    plus(inputs.get("yoklama_tespiti"), "1.10_yoklama_tespit",
         "Yoklamalarda emtia tespiti", "Azaltıcı",
         "Yoklama bulguları stok kayıtlarıyla eşleştirilmeli.",
         "Yoklamada emtia tespiti var")

    # 1.11
    plus(inputs.get("gecmis_inceleme_bilerek"), "1.11_gecmis_inceleme",
         "Geçmişte bilerek kullanım raporu", "Artırıcı",
         "İç kontroller gözden geçirilmeli.",
         "Geçmişte bilerek kullanım raporu mevcut")

    # 1.12
    plus(inputs.get("ortak_yonetici_gecmis"), "1.12_ortak_yonetici_gecmis",
         "Ortak/yönetici geçmiş SMİYB bağlantısı", "Artırıcı",
         "Yönetici/ortak ilişkileri gözden geçirilmeli.",
         "İlişkide riskli geçmiş mevcut")

    # 1.13
    eim = inputs.get("e_imza_tarih_uyum")
    if eim is None:
        missing.append("1.13_e_imza_tarihleri")
    else:
        if eim is False:
            score += WEIGHTS["1.13_e_imza_tarihleri"]
            reasons.append(_mk("E-imza tarih uyumsuzluğu", "Artırıcı",
                               "Düzenleme vs e-imza tarihi uyumsuz", "Elektronik zaman damgası kayıtları incelenmeli."))
        else:
            reasons.append(_mk("E-imza tarihleri", "Azaltıcı",
                               "Uygun", "Standart e-belge kontrolleri sürdür."))

    # Karşı taraf risklerinden ek sinyal
    kf: List[Dict[str,Any]] = inputs.get("karsi_firma_riskleri") or []
    if any((r.get("risk") == "Yüksek") for r in kf):
        score += 8
        reasons.append(_mk("Karşı tarafta yüksek risk", "Artırıcı",
                           "Karsi_firma listesinde 'Yüksek' risk var",
                           "Karşıt tespit ve BA/BS mutabakatı güçlendirilmelidir."))

    # Skoru 0-100 aralığına sınırla
    score = max(0, min(100, score))

    if score >= 60:
        durum = "Yüksek"
    elif score >= 35:
        durum = "Orta"
    else:
        durum = "Düşük"

    return {
        "skor": score,
        "durum": durum,
        "nedenler": reasons,
        "eksik_veriler": missing,
    }
