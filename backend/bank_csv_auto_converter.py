import os
import pandas as pd
import re
import unicodedata

try:
    from fuzzywuzzy import process
except ImportError:
    # fuzzywuzzy yüklü değilse hata ver, pip ile yükle: pip install fuzzywuzzy[speedup]
    print("Lütfen terminalde 'pip install fuzzywuzzy[speedup]' komutunu çalıştırın.")
    exit(1)

INPUT_DIR = "data/banka/"
OUTPUT_DIR = "data/banka/converted/"

os.makedirs(OUTPUT_DIR, exist_ok=True)

def fix_turkish(s):
    if not s:
        return ""
    # Unicode normalization
    s = unicodedata.normalize('NFKD', s)
    # Bozuk harfleri düzelt
    s = (s
        .replace("ý", "i").replace("þ", "s").replace("ð", "g")
        .replace("ı", "i").replace("İ", "I")
        .replace("ş", "s").replace("Ş", "S")
        .replace("ğ", "g").replace("Ğ", "G")
        .replace("ü", "u").replace("Ü", "U")
        .replace("ö", "o").replace("Ö", "O")
        .replace("ç", "c").replace("Ç", "C")
        .replace("�", "")
        .replace("’", "")
        .replace("‘", "")
        .replace("́", "") # combining acute accent
        .replace("̧", "") # combining cedilla
        .replace("̂", "") # combining circumflex
        .replace("̇", "") # combining dot
        .replace("̆", "") # combining breve
        .replace("̈", "") # combining diaeresis
        .replace(" ", "_")
        .strip()
    )
    return s.lower()

def parse_file_name(filename):
    m = re.match(r"([0-9]+\.[0-9]+)\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)", filename)
    if m:
        hesap_no = m.group(1)
        banka_adi = fix_turkish(m.group(2).upper())
        return hesap_no, banka_adi
    return "", ""

def fuzzy_find(colnames, targets, min_score=70):
    # En yakın başlığı bulmak için fuzzywuzzy kullan
    col_map = {}
    for target in targets:
        match, score = process.extractOne(target, colnames)
        if score >= min_score:
            col_map[target] = match
        else:
            col_map[target] = None
    return col_map

def convert_file(file_path):
    filename = os.path.basename(file_path)
    hesap_no, banka_adi = parse_file_name(filename)
    try:
        df = pd.read_csv(file_path, delimiter=';', encoding="latin1")
    except Exception:
        df = pd.read_csv(file_path, delimiter='\t', encoding="latin1")
    # Başlıkları temizle
    df.columns = [fix_turkish(str(c)) for c in df.columns]
    # Hedef başlıklar
    targets = ["tarih", "islem_tarihi", "aciklama", "islem_tutari", "tutar", "bakiye", "guncel_bakiye", "guncel_bakiye_tl", "yeni_bakiye"]
    # Fuzzy eşleme ile başlıkları bul
    col_map = fuzzy_find(list(df.columns), targets)
    # Asıl eşleşecekler:
    tarih_col = col_map.get("tarih") or col_map.get("islem_tarihi")
    aciklama_col = col_map.get("aciklama")
    tutar_col = col_map.get("tutar") or col_map.get("islem_tutari")
    bakiye_col = col_map.get("bakiye") or col_map.get("guncel_bakiye") or col_map.get("guncel_bakiye_tl") or col_map.get("yeni_bakiye")
    missing = []
    for col, name in zip([tarih_col, aciklama_col, tutar_col, bakiye_col], ["islem_tarihi", "aciklama", "tutar", "bakiye"]):
        if not col:
            missing.append(name)
    if missing:
        print(f"{filename} - Eksik kolonlar: {missing}. Temizlenmiş başlıklar: {df.columns.tolist()}")
        return
    df = df[[tarih_col, aciklama_col, tutar_col, bakiye_col]]
    df.columns = ["islem_tarihi", "aciklama", "tutar", "bakiye"]
    df["hesap_no"] = hesap_no
    df["banka_adi"] = banka_adi
    df["aciklama"] = df["aciklama"].map(fix_turkish)
    # Tutar ve bakiye formatlarını düzelt
    df["tutar"] = df["tutar"].astype(str).str.replace(".", "").str.replace(",", ".").astype(float)
    df["bakiye"] = df["bakiye"].astype(str).str.replace(".", "").str.replace(",", ".").astype(float)
    new_name = f"{hesap_no}_{banka_adi}_converted.csv"
    out_path = os.path.join(OUTPUT_DIR, new_name)
    df.to_csv(out_path, index=False)
    print(f"{file_path} => {out_path}")

def run_converter():
    for file in os.listdir(INPUT_DIR):
        if file.lower().endswith('.csv'):
            input_path = os.path.join(INPUT_DIR, file)
            print("İşlenecek dosya:", input_path)
            convert_file(input_path)

if __name__ == "__main__":
    run_converter()