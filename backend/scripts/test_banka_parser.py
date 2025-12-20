from pathlib import Path
import json
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from data_engine.banka_parser import parse_banka_for_client


def main():
    data_root = BASE_DIR / "data"

    records = parse_banka_for_client(
        base_dir=data_root,
        smmm_id="HKOZKAN",
        entity_id="OZKAN_KIRTASIYE",
        period="2025-Q2",
    )

    print(f"Toplam hareket sayısı: {len(records)}")

    # İlk 5 hareketi göster
    print("\n--- Örnek 5 hareket ---")
    print(json.dumps(records[:5], ensure_ascii=False, indent=2))

    # Basit bir kontrol: toplam borç / alacak
    total_borc = sum(r["borc"] for r in records)
    total_alacak = sum(r["alacak"] for r in records)
    print(f"\nToplam Borç: {total_borc}")
    print(f"Toplam Alacak: {total_alacak}")


if __name__ == "__main__":
    main()
