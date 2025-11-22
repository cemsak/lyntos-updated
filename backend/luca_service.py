import csv
from typing import Dict, List

def read_csv_as_dict(file_path: str) -> List[Dict]:
    data = []
    try:
        with open(file_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                data.append(row)
    except FileNotFoundError:
        print(f"[WARN] CSV bulunamadı: {file_path}")
    return data

def get_luca_mizan(period: str = "2025-Q4") -> Dict:
    file_path = f"data/luca/mizan_{period}.csv"
    rows = read_csv_as_dict(file_path)
    borc = sum(float(r.get("borc", 0) or 0) for r in rows)
    alacak = sum(float(r.get("alacak", 0) or 0) for r in rows)
    dengeli = abs(borc - alacak) < 0.01
    return {
        "toplam_hesap": len(rows),
        "borc_toplam": round(borc, 2),
        "alacak_toplam": round(alacak, 2),
        "dengeli": dengeli,
        "detay": rows,
    }

def get_luca_beyanlar(period: str = "2025-Q4") -> List[Dict]:
    file_path = f"data/luca/beyanlar_{period}.csv"
    rows = read_csv_as_dict(file_path)
    return rows