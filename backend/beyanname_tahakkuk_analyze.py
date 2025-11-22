import os
import pdfplumber
import pandas as pd
from fuzzywuzzy import process

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BEYAN_DIR = os.path.join(BASE_DIR, "data/luca/beyanname/beyannameler/")
TAHAKKUK_DIR = os.path.join(BASE_DIR, "data/luca/beyanname/tahakkuklar/")
TAHSILAT_DIR = os.path.join(BASE_DIR, "data/luca/beyanname/tahsilatlar/")
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

def parse_beyanname(pdf_path):
    text = extract_pdf_text(pdf_path)
    vergi_turu = process.extractOne("KDV", text)[0] if "KDV" in text else ""
    donem = process.extractOne("Dönem", text)[0] if "Dönem" in text else ""
    return {
        "dosya": pdf_path,
        "vergi_turu": vergi_turu,
        "donem": donem,
        "text": text
    }

def parse_tahakkuk(pdf_path):
    text = extract_pdf_text(pdf_path)
    vergi_turu = process.extractOne("KDV", text)[0] if "KDV" in text else ""
    donem = process.extractOne("Dönem", text)[0] if "Dönem" in text else ""
    tutar = ""
    # Tutarı metinden bul (örnek: "Tutar: 5000,00")
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

def analyze():
    print("Beyanname ve tahakkuk PDF’leri analiz ediliyor...")
    beyannameler = []
    for file in os.listdir(BEYAN_DIR):
        if file.lower().endswith('.pdf'):
            beyannameler.append(parse_beyanname(os.path.join(BEYAN_DIR, file)))
    tahakkuklar = []
    for file in os.listdir(TAHAKKUK_DIR):
        if file.lower().endswith('.pdf'):
            tahakkuklar.append(parse_tahakkuk(os.path.join(TAHAKKUK_DIR, file)))
    results = []
    for b in beyannameler:
        match = None
        for t in tahakkuklar:
            # Dönem ve vergi türüne fuzzy eşleştirme
            if b["donem"][:6] == t["donem"][:6] and b["vergi_turu"] == t["vergi_turu"]:
                match = t
                break
        results.append({
            "beyanname_dosya": os.path.basename(b["dosya"]),
            "vergi_turu": b["vergi_turu"],
            "donem": b["donem"],
            "tahakkuk_dosya": os.path.basename(match["dosya"]) if match else "",
            "tahakkuk_tutar": match["tutar"] if match else "",
            "odeme_durumu": "BEKLENIYOR"   # Bir sonraki adımda banka/tahsilat ile güncellenecek
        })
    df = pd.DataFrame(results)
    out_file = os.path.join(OUTPUT_DIR, "beyanname_tahakkuk_durum.csv")
    df.to_csv(out_file, index=False)
    print(f"Analiz tamamlandı. Sonuç dosyası: {out_file}")

if __name__ == "__main__":
    analyze()