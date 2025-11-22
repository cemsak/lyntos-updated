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

def get_banka_data(period: str = "2025-Q4") -> Dict:
    file_path = f"data/banka/banka_{period}.csv"
    rows = read_csv_as_dict(file_path)
    toplam_bakiye = sum(float(r.get("bakiye", 0) or 0) for r in rows)
    gunluk_akisi = sum(float(r.get("gunluk_akisi", 0) or 0) for r in rows)
    detaylar = [
        {"banka": r.get("banka"), "bakiye": float(r.get("bakiye", 0))}
        for r in rows
    ]
    return {
        "toplam_bakiye": round(toplam_bakiye, 2),
        "gunluk_nakit_akisi": round(gunluk_akisi, 2),
        "hesap_sayisi": len(rows),
        "detaylar": detaylar,
    }