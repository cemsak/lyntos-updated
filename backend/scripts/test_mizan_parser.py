from pathlib import Path
import json
import sys

# backend klasörünü sys.path'e ekle
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from data_engine.mizan_parser import parse_mizan_for_client


def main():
    base_dir = BASE_DIR / "data"

    records = parse_mizan_for_client(
        base_dir=base_dir,
        smmm_id="HKOZKAN",
        entity_id="OZKAN_KIRTASIYE",
        period="2025-Q2",
    )

    # İlk 20 satırı göstermek, gerisi için sadece sayıyı yazmak mantıklı
    print(json.dumps(records[:20], ensure_ascii=False, indent=2))
    print(f"\nToplam satır sayısı: {len(records)}")


if __name__ == "__main__":
    main()
