from utils.read_csv_as_dict import read_csv_as_dict

def kurgan_risk_score(firma, donem):
    mizan = read_csv_as_dict("data/converted/converted_özkan mizan 3 ay.csv")
    # örnek risk hesaplaması:
    bakiye = sum(float(r['borc_bakiyesi']) for r in mizan if r['hesap_kodu'].startswith('102') and donem in r.values())
    score = min(100, bakiye // 10000)
    return {"score": score, "explanation": f"Banka bakiyesi: {bakiye}"}

def smiyb_risk_status(firma, donem):
    # örnek, data/converted/smiyb.csv dosyası ile çalışacak şekilde
    try:
        smiyb = read_csv_as_dict("data/converted/smiyb.csv")
        filtered = [r for r in smiyb if r.get("firma") == firma and r.get("period") == donem]
        score = len(filtered) * 10
        return {"score": score, "level": "Yüksek" if score >= 60 else "Düşük", "explanation": "Risk datası mevcut"}
    except:
        return {"score": 0, "level": "Eksik", "explanation": "SMIYB datası yüklenmemiş"}

def radar_risk_score(firma, donem):
    mizan = read_csv_as_dict("data/converted/converted_özkan mizan 3 ay.csv")
    rows = [r for r in mizan if donem in r.values()]
    satis_sum = sum(float(r.get("alacak_bakiyesi", 0)) for r in rows if r.get("hesap_adi", "").upper().find("SATIŞ") > -1)
    stock_sum = sum(float(r.get("borc_bakiyesi", 0)) for r in rows if r.get("hesap_kodu", "").startswith('153'))
    score = min(100, int(stock_sum // 1e6 + satis_sum // 1e5))
    return {"score": score, "explanation": f"Stok: {stock_sum}, Satış: {satis_sum}"}

def tax_compliance_score(firma, donem):
    try:
        ticaret = read_csv_as_dict("data/converted/beyanname_tahakkuk_durum.csv")
        filtered = [r for r in ticaret if r.get("donem") == donem]
        eksikler = [r for r in filtered if r.get("odeme_durumu", "") != "ÖDENDİ"]
        score = 100 - len(eksikler) * 10
        return {"score": max(score,0), "explanation": f"{len(eksikler)} eksik/ödenmemiş beyanname"}
    except:
        return {"score": 0, "explanation": "Beyanname datası eksik"}

def uyum_panel_data(firma, donem):
    try:
        uyum = read_csv_as_dict("data/converted/uyum.csv")
        filtered = [r for r in uyum if r.get("firma") == firma and r.get("period") == donem]
        eksik = [r for r in filtered if not r.get("tamam_mi", "1") == "1"]
        score = 100 - len(eksik)*10
        notes = [r.get("eksik_neden", "Bilinmiyor") for r in eksik]
        return {"score": max(score, 0), "explanation": "; ".join(notes) if notes else "Tam uyum"}
    except:
        return {"score": 0, "explanation": "Uyum datası eksik"}

def mizan_panel_data(firma, donem):
    mizan = read_csv_as_dict("data/converted/converted_özkan mizan 3 ay.csv")
    filtered = [r for r in mizan if donem in r.values()]
    toplam_bakiye = sum(float(r.get("borc_bakiyesi", 0)) for r in filtered)
    return {"toplam_bakiye": toplam_bakiye, "satir_sayisi": len(filtered)}

def banka_mutabakat_panel_data(firma, donem):
    files = [
        "data/converted/102.01_ykb_converted.csv",
        "data/converted/102.02_akbank_converted.csv",
        "data/converted/102.04_halkbank_converted.csv",
        "data/converted/102.09_zi_converted.csv",
        "data/converted/102.15_albaraka_converted.csv",
        "data/converted/102.19_zi_converted.csv",
        "data/converted/102.25_albaraka_converted.csv"
    ]
    all_tx = []
    for f in files:
        try: all_tx.extend(read_csv_as_dict(f))
        except: continue
    filtered = [r for r in all_tx if r.get("hesap_no") == firma]
    toplam_bakiye = sum(float(r.get("bakiye", 0)) for r in filtered)
    return {"bakiye": toplam_bakiye, "islem_sayisi": len(filtered), "son_islemler": filtered[-5:]}

def karsifirma_panel_data(firma, donem):
    try:
        karsifirma = read_csv_as_dict("data/converted/karsi_firma.csv")
        riskli = [r for r in karsifirma if r.get("firma") == firma and r.get("period") == donem and r.get("risklevel", "Düşük") == "Yüksek"]
        return {"riskli_sayi": len(riskli), "riskli_firmalar": [r.get("unvan") for r in riskli]}
    except:
        return {"riskli_sayi": 0, "riskli_firmalar": [], "explanation": "Mutabakat datası yok"}

def matrix13_panel_data(firma, donem):
    try:
        matrix = read_csv_as_dict("data/converted/matrix13.csv")
        filtered = [r for r in matrix if r.get("firma") == firma and r.get("period") == donem]
        score = sum(float(r.get("skor", 0)) for r in filtered)
        return {"score": score, "explanation": "Matrix riskleri"}
    except:
        return {"score": 0, "explanation": "Matrix datası eksik"}

def fmea_panel_data(firma, donem):
    try:
        fmea = read_csv_as_dict("data/converted/fmea.csv")
        kritiks = [r for r in fmea if r.get("firma") == firma and r.get("period") == donem and float(r.get("rpn", 0)) > 100]
        return {"count": len(kritiks), "critical_list": kritiks[:5]}
    except:
        return {"count": 0, "critical_list": [], "explanation": "FMEA datası yok"}

def anomaly_panel_data(firma, donem):
    try:
        anomaly = read_csv_as_dict("data/converted/anomaly.csv")
        anomali_sayi = sum(1 for r in anomaly if r.get("firma") == firma and r.get("period") == donem and r.get("anomaly", "0") == "1")
        return {"count": anomali_sayi}
    except:
        return {"count": 0, "explanation": "Anomaly datası eksik"}

def ag_panel_data(firma, donem):
    try:
        ag = read_csv_as_dict("data/converted/ag.csv")
        suspicious = [r for r in ag if r.get("firma") == firma and r.get("period") == donem]
        return {"count": len(suspicious), "items": suspicious}
    except:
        return {"count": 0, "items": []}

def bowtie_panel_data(firma, donem):
    try:
        bowtie = read_csv_as_dict("data/converted/bowtie.csv")
        risks = [r for r in bowtie if r.get("firma") == firma and r.get("period") == donem]
        return {"risk_count": len(risks), "risk_list": risks[:5]}
    except:
        return {"risk_count": 0, "risk_list": []}

def capa_panel_data(firma, donem):
    try:
        capa = read_csv_as_dict("data/converted/capa.csv")
        open_actions = [r for r in capa if r.get("firma") == firma and r.get("period") == donem and r.get("kapanis", "0") == "0"]
        return {"open_count": len(open_actions), "open_list": open_actions[:5]}
    except:
        return {"open_count": 0, "open_list": []}

def why5_panel_data(firma, donem):
    try:
        why5 = read_csv_as_dict("data/converted/why5.csv")
        chains = [r for r in why5 if r.get("firma") == firma and r.get("period") == donem]
        return {"chain_list": chains[:3]}
    except:
        return {"chain_list": []}

def ishikawa_panel_data(firma, donem):
    try:
        ishikawa = read_csv_as_dict("data/converted/ishikawa.csv")
        cats = [r for r in ishikawa if r.get("firma") == firma and r.get("period") == donem]
        return {"categories": [r.get("kategori") for r in cats]}
    except:
        return {"categories": []}

def ai_panel_data(firma, donem):
    try:
        ai = read_csv_as_dict("data/converted/ai.csv")
        preds = [r for r in ai if r.get("firma") == firma and r.get("period") == donem]
        return {"prediction_count": len(preds), "predictions": preds[:5]}
    except:
        return {"prediction_count": 0, "predictions": []}

def vdk_panel_data(firma, donem):
    try:
        vdk = read_csv_as_dict("data/converted/vdk.csv")
        raporlar = [r for r in vdk if r.get("firma") == firma and r.get("period") == donem]
        return {"reports": raporlar[:3]}
    except:
        return {"reports": [], "explanation": "VDK datası yok"}

# E-defter ve müşteri dataları geldiğinde benzer şekilde ekleyebilirsin:
def edefter_panel_data(firma, donem):
    try:
        edefter = read_csv_as_dict("data/converted/edefter.csv")
        records = [r for r in edefter if r.get("firma") == firma and r.get("period") == donem]
        return {"count": len(records), "records": records}
    except:
        return {"count": 0, "records": [], "explanation": "E-defter datası henüz yok"}

def musteri_panel_data(firma, donem):
    try:
        musteri = read_csv_as_dict("data/converted/musteri.csv")
        records = [r for r in musteri if r.get("firma") == firma and r.get("period") == donem]
        return {"count": len(records), "records": records}
    except:
        return {"count": 0, "records": [], "explanation": "Müşteri datası henüz yok"}