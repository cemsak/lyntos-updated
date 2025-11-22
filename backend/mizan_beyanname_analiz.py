import os
import pandas as pd
import pdfplumber
from fuzzywuzzy import process

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MIZAN_CSV = os.path.join(BASE_DIR, "data/luca/mizan/converted/converted_özkan mizan 3 ay.csv")
BEYAN_DIR = os.path.join(BASE_DIR, "data/luca/beyanname/beyannameler/")
OUTPUT_DIR = os.path.join(BASE_DIR, "data/luca/beyanname/converted/")
os.makedirs(OUTPUT_DIR, exist_ok=True)

BEYANNAME_HESAPLARI = {
    'KDV': ['391'],
    'KDV2': ['392'],
    'GEÇICI': ['371', '372'],
    'MUHTASAR': ['360'],
    'POŞET': ['340'],
    'KURUMLAR': ['370', '371'],
    'DAMGA': ['368'],
    'GELIR': ['360', '370', '371'],
    'ÇEVRE': ['380'],
    'TURİZM': ['381'],
    'KONAKLAMA': ['382'],
    'MTV': ['383'],
    'EMLAK': ['384'],
    'İLAN': ['385'],
    'ŞANS': ['386'],
}

anahtarlar_dict = {
    'KDV': ['KDV Tutarı', 'KDV2 Tutarı', 'KDV', 'KDV2', 'Vergi Tutarı'],
    'KDV2': ['KDV2 Tutarı', 'KDV2', 'Vergi Tutarı'],
    'GEÇICI': ['Geçici Vergi Tutarı', 'Geçici', 'Vergi Tutarı'],
    'MUHTASAR': ['Muhtasar Tutarı', 'Muhtasar', 'Vergi Tutarı'],
    'POŞET': ['Poşet Tutarı', 'Poşet', 'Vergi Tutarı'],
    'KURUMLAR': ['Kurumlar Vergisi Tutarı', 'Kurumlar', 'Vergi Tutarı'],
    'DAMGA': ['Damga Vergisi Tutarı', 'Damga', 'Vergi Tutarı'],
    'GELIR': ['Gelir Vergisi Tutarı', 'Gelir', 'Vergi Tutarı'],
    'ÇEVRE': ['Çevre Temizlik Vergisi', 'Çevre', 'Vergi Tutarı'],
    'TURİZM': ['Turizm Payı', 'Turizm', 'Vergi Tutarı'],
    'KONAKLAMA': ['Konaklama Vergisi', 'Konaklama', 'Vergi Tutarı'],
    'MTV': ['Motorlu Taşıtlar Vergisi', 'MTV', 'Vergi Tutarı'],
    'EMLAK': ['Emlak Vergisi', 'Emlak', 'Vergi Tutarı'],
    'İLAN': ['İlan Reklam Vergisi', 'İlan', 'Vergi Tutarı'],
    'ŞANS': ['Şans Oyunları Vergisi', 'Şans', 'Vergi Tutarı'],
}

def get_mizan_bakiye(mizan_path, hesap_kodlari):
    df = pd.read_csv(mizan_path)
    results = {}
    for kod in hesap_kodlari:
        matches = df[df['hesap_kodu'].astype(str).str.startswith(str(kod))]
        bakiye = matches['borc_bakiyesi'].sum() - matches['alacak_bakiyesi'].sum()
        results[str(kod)] = bakiye
    return results

def get_beyanname_tutar(pdf_path, anahtarlar):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t: text += t + "\n"
    import re
    for anahtar in anahtarlar:
        match = re.search(rf"{anahtar}[:\s]*([0-9\.,]+)", text, re.IGNORECASE)
        if match:
            tutar = match.group(1).replace('.', '').replace(',', '.')
            try:
                return float(tutar)
            except:
                continue
    return None

def analyze_mizan_beyanname():
    results = []
    for file in os.listdir(BEYAN_DIR):
        if not file.lower().endswith('.pdf'):
            continue
        beyanname_turu = None
        for tur in BEYANNAME_HESAPLARI.keys():
            if tur in file.upper():
                beyanname_turu = tur
                break
        if not beyanname_turu:
            for tur in BEYANNAME_HESAPLARI.keys():
                text = file.upper()
                if process.extractOne(tur, text)[1] > 80:
                    beyanname_turu = tur
                    break
        if not beyanname_turu:
            beyanname_turu = 'KDV'  # Varsayılan

        anahtarlar = anahtarlar_dict.get(beyanname_turu, ['Vergi Tutarı'])
        beyanname_tutar = get_beyanname_tutar(os.path.join(BEYAN_DIR, file), anahtarlar)
        mizan_kodlari = BEYANNAME_HESAPLARI[beyanname_turu]
        mizan_bakiye = get_mizan_bakiye(MIZAN_CSV, mizan_kodlari)
        mizan_tutar = sum(mizan_bakiye.values())
        fark = None
        if mizan_tutar is not None and beyanname_tutar is not None:
            fark = round(mizan_tutar - beyanname_tutar, 2)
        results.append({
            'beyanname_dosya': file,
            'beyanname_turu': beyanname_turu,
            'beyanname_tutar': beyanname_tutar,
            'mizan_hesap_kodlari': ','.join(mizan_kodlari),
            'mizan_tutar': mizan_tutar,
            'fark': fark
        })
    df = pd.DataFrame(results)
    out_file = os.path.join(OUTPUT_DIR, "mizan_beyanname_analiz.csv")
    df.to_csv(out_file, index=False)
    print(f"Tüm beyannameler için analiz tamamlandı: {out_file}")

if __name__ == "__main__":
    analyze_mizan_beyanname()