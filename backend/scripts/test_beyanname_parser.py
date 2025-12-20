from pathlib import Path
import json
import sys

# backend klasörünü sys.path'e ekle
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from data_engine.beyanname_parser import parse_beyanname_for_client


def main():
    # backend/data klasörünün yolu
    base_dir = BASE_DIR / "data"

    records = parse_beyanname_for_client(
        base_dir=base_dir,
        smmm_id="HKOZKAN",
        entity_id="OZKAN_KIRTASIYE",
        period="2025-Q2",
    )

    # Sonucu ekrana JSON olarak yaz
    print(json.dumps(records, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
