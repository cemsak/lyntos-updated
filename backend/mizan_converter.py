import os
import pandas as pd
import re
import unicodedata
from fuzzywuzzy import process

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_DIR = os.path.join(BASE_DIR, "data/luca/mizan/")
OUTPUT_DIR = os.path.join(BASE_DIR, "data/luca/mizan/converted/")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def fix_turkish(s):
    if not s:
        return ""
    s = unicodedata.normalize('NFKD', str(s))
    s = (
        s.replace("ý", "i").replace("þ", "s").replace("ð", "g")
        .replace("ı", "i").replace("İ", "I")
        .replace("ş", "s").replace("Ş", "S")
        .replace("ğ", "g").replace("Ğ", "G")
        .replace("ü", "u").replace("Ü", "U")
        .replace("ö", "o").replace("Ö", "O")
        .replace("ç", "c").replace("Ç", "C")
        .replace("’", "").replace("‘", "")
        .replace("́", "").replace(" ", "_").replace(";", "")
        .strip()
    )
    return s.lower()

def clean_number(val):
    if pd.isna(val) or str(val).strip() == "":
        return 0.0
    val = str(val).replace('.', '').replace(',', '.').replace(' ', '')
    try:
        return float(val)
    except:
        return 0.0

def fuzzy_find(colnames, targets, min_score=65):
    col_map = {}
    for target in targets:
        match, score = process.extractOne(target, colnames)
        if score >= min_score:
            col_map[target] = match
        else:
            col_map[target] = None
    return col_map

def process_csv(file_path):
    with open(file_path, encoding="utf-8") as f:
        lines = f.readlines()
    header_row_idx = None
    for i, line in enumerate(lines):
        if "HESAP KODU" in line.upper() and "HESAP ADI" in line.upper():
            header_row_idx = i
            break
    if header_row_idx is None:
        print(f"Başlık bulunamadı: {file_path}")
        return None
    header_line = lines[header_row_idx]
    header_cols = [fix_turkish(h) for h in header_line.strip().split(";")]
    targets = [
        "hesap_kodu", "hesap_adi", "tip", "borc", "alacak", "borc_bakiyesi", "alacak_bakiyesi"
    ]
    col_map = fuzzy_find(header_cols, targets)
    data_lines = []
    for line in lines[header_row_idx + 1:]:
        if not line.strip(): continue
        if re.search(r"\d", line) and ";" in line:
            data_lines.append(line.strip())
    print(f"{file_path} içinde veri satırı sayısı: {len(data_lines)}")
    rows = []
    for row in data_lines:
        cols = [c.strip() for c in row.split(";")]
        while len(cols) < len(header_cols):
            cols.append("")
        try:
            hesap_kodu = cols[header_cols.index(col_map["hesap_kodu"])] if col_map["hesap_kodu"] else ""
            hesap_adi  = cols[header_cols.index(col_map["hesap_adi"])] if col_map["hesap_adi"] else ""
            tip        = cols[header_cols.index(col_map["tip"])] if col_map["tip"] else ""
            borc       = clean_number(cols[header_cols.index(col_map["borc"])] if col_map["borc"] else "")
            alacak     = clean_number(cols[header_cols.index(col_map["alacak"])] if col_map["alacak"] else "")
            borc_bakiyesi = clean_number(cols[header_cols.index(col_map["borc_bakiyesi"])] if col_map["borc_bakiyesi"] else "")
            alacak_bakiyesi = clean_number(cols[header_cols.index(col_map["alacak_bakiyesi"])] if col_map["alacak_bakiyesi"] else "")
            rows.append([hesap_kodu, hesap_adi, tip, borc, alacak, borc_bakiyesi, alacak_bakiyesi])
        except Exception as e:
            print(f"Hatalı satır: {row} ({e})")
    return pd.DataFrame(rows, columns=targets)

def process_xlsx(file_path):
    try:
        df = pd.read_excel(file_path)
        df.columns = [fix_turkish(c) for c in df.columns]
        targets = [
            "hesap_kodu", "hesap_adi", "tip", "borc", "alacak", "borc_bakiyesi", "alacak_bakiyesi"
        ]
        col_map = fuzzy_find(list(df.columns), targets)
        rows = []
        for idx, row in df.iterrows():
            try:
                hesap_kodu = row[col_map["hesap_kodu"]] if col_map["hesap_kodu"] else ""
                hesap_adi  = row[col_map["hesap_adi"]] if col_map["hesap_adi"] else ""
                tip        = row[col_map["tip"]] if col_map["tip"] else ""
                borc       = clean_number(row[col_map["borc"]]) if col_map["borc"] else 0.0
                alacak     = clean_number(row[col_map["alacak"]]) if col_map["alacak"] else 0.0
                borc_bakiyesi = clean_number(row[col_map["borc_bakiyesi"]]) if col_map["borc_bakiyesi"] else 0.0
                alacak_bakiyesi = clean_number(row[col_map["alacak_bakiyesi"]]) if col_map["alacak_bakiyesi"] else 0.0
                rows.append([hesap_kodu, hesap_adi, tip, borc, alacak, borc_bakiyesi, alacak_bakiyesi])
            except Exception as e:
                print(f"Hatalı satır (Excel): {e}")
        return pd.DataFrame(rows, columns=targets)
    except Exception as e:
        print(f"Excel dosya okunamadı: {e}")
        return None

def convert_all_mizan():
    print(f"Input klasöründeki dosyalar: {os.listdir(INPUT_DIR)}")
    for file in os.listdir(INPUT_DIR):
        input_path = os.path.join(INPUT_DIR, file)
        if os.path.isdir(input_path):
            continue
        output_path = os.path.join(OUTPUT_DIR, "converted_" + file.replace('.xlsx', '.csv'))
        if file.lower().endswith('.csv'):
            print(f"İşleniyor (CSV): {input_path}")
            df = process_csv(input_path)
        elif file.lower().endswith('.xlsx'):
            print(f"İşleniyor (Excel): {input_path}")
            df = process_xlsx(input_path)
        else:
            print(f"Geçersiz dosya tipi: {file}")
            continue
        if df is not None and not df.empty:
            df.to_csv(output_path, index=False)
            print(f"Converted: {output_path}")
        else:
            print(f"Hiç veri işlenemedi: {file}")

if __name__ == "__main__":
    convert_all_mizan()