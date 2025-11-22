import os
import pdfplumber
import pandas as pd
from fuzzywuzzy import process

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TAHAKKUK_DIR = os.path.join(BASE_DIR, "data/luca/beyanname/tahakkuklar/")
BANKA_DIR = os.path.join(BASE_DIR, "data/banka/converted/")
OUTPUT_DIR = os.path.join(BASE_DIR, "data/luca/beyanname/converted/")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def extract_pdf_text(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            try:
                t = page.extract_text()
                if t: text += t + "\n"
            except: continue
    return text

def parse_tahakkuk(pdf_path):
    text = extract_pdf_text(pdf_path)
    vergi_turu = process.extractOne("KDV", text)[0] if "KDV" in text else ""
    donem = process.extractOne("Dönem", text)[0] if "Dönem" in text else ""
    tutar = ""
    import re
    match = re.search(r"Tutar[:\s]*([0-9\.,]+)", text)
    if match:
        tutar = match.group(1)
    return {
        "dosya": pdf_path,
        "vergi_turu": vergi_turu,
        "donem": donem,
        "tutar": tutar,
        "text": text
    }

def find_payment_in_bank_csv(tahakkuk, banka_dir):
    tahakkuk_tutar = str(tahakkuk["tutar"]).replace('.', '').replace(',', '.')
    try:
        tahakkuk_tutar_float = float(tahakkuk_tutar)
    except:
        tahakkuk_tutar_float = None
    keywords = ["GIB", "VERGI", "KDV", "MUHTASAR", "GEÇICI", "BEYANNAME", "TAHAKKUK"]
    for file in os.listdir(banka_dir):
        if not file.endswith(".csv"):
            continue
        df = pd.read_csv(os.path.join(banka_dir, file))
        for idx, row in df.iterrows():
            aciklama = str(row.get("aciklama", "")).upper()
            tutar = float(row.get("tutar", 0))
            tarih = str(row.get("islem_tarihi", ""))
            if any(k in aciklama for k in keywords):
                if tahakkuk_tutar_float and abs(tutar - tahakkuk_tutar_float) < 2:
                    return {
                        "dosya": file,
                        "tarih": tarih,
                        "aciklama": aciklama,
                        "tutar": tutar
                    }
    return None

def analyze_beyanname_tahakkuk_banka():
    tahakkuklar = []
    for file in os.listdir(TAHAKKUK_DIR):
        if file.lower().endswith('.pdf'):
            tahakkuklar.append(parse_tahakkuk(os.path.join(TAHAKKUK_DIR, file)))
    results = []
    for t in tahakkuklar:
        odeme_durumu = "BEKLENIYOR"
        match = find_payment_in_bank_csv(t, BANKA_DIR)
        if match:
            odeme_durumu = f"ODEME BANKADA ({match['dosya']}, {match['tarih']})"
        results.append({
            "tahakkuk_dosya": os.path.basename(t["dosya"]),
            "vergi_turu": t["vergi_turu"],
            "donem": t["donem"],
            "tahakkuk_tutar": t["tutar"],
            "odeme_durumu": odeme_durumu
        })
    df = pd.DataFrame(results)
    out_file = os.path.join(OUTPUT_DIR, "beyanname_tahakkuk_odeme.csv")
    df.to_csv(out_file, index=False)
    print(f"Banka CSV ödeme analizi tamamlandı. Sonuç dosyası: {out_file}")

if __name__ == "__main__":
    analyze_beyanname_tahakkuk_banka()