import csv, os

def read_csv_as_dict(file_path):
    """CSV dosyalarını dict olarak okur. Hata durumunda [] döner."""
    if not os.path.exists(file_path): return []
    with open(file_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return [row for row in reader]