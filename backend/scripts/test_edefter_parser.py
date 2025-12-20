from pathlib import Path
import sys
import json

# --- Proje kökünü sys.path'e ekle (backend dizini) ---
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from data_engine.edefter_parser import parse_edefter_for_client


def main() -> None:
    # backend/data dizinine işaret eder
    data_root = BASE_DIR / "data"

    records = parse_edefter_for_client(
        base_dir=data_root,
        smmm_id="HKOZKAN",
        firma_id="OZKAN_KIRTASIYE",
        period="2025-Q2",
    )

    print(f"Toplam yevmiye satırı: {len(records)}\n")

    print("--- Örnek 10 kayıt ---")
    for rec in records[:10]:
        print(json.dumps(rec, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
