from pathlib import Path
import sys
import json

# backend dizinini sys.path'e ekle
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from data_engine.loader import load_all_for_client_period  # noqa: E402


def main() -> None:
    data_root = BASE_DIR / "data"

    smmm_id = "HKOZKAN"
    firma_id = "OZKAN_KIRTASIYE"
    period = "2025-Q2"

    data = load_all_for_client_period(
        base_dir=data_root,
        smmm_id=smmm_id,
        firma_id=firma_id,
        period=period,
    )

    print("=== Özet ===")
    print(f"Beyanname kayıt sayısı : {len(data['beyanname'])}")
    print(f"Tahakkuk kayıt sayısı  : {len(data['tahakkuk'])}")
    print(f"Mizan satır sayısı     : {len(data['mizan'])}")
    print(f"Banka hareket sayısı   : {len(data['banka'])}")
    print(f"E-defter satır sayısı  : {len(data['edefter'])}")
    print()

    # Her kaynaktan 1-2 örnek gösterelim
    def show_sample(name: str, items: list[dict], limit: int = 2) -> None:
        print(f"--- {name} (örnek {min(limit, len(items))} kayıt) ---")
        for rec in items[:limit]:
            print(json.dumps(rec, ensure_ascii=False, indent=2))
        print()

    show_sample("Beyanname", data["beyanname"])
    show_sample("Tahakkuk", data["tahakkuk"])
    show_sample("Mizan", data["mizan"])
    show_sample("Banka", data["banka"])
    show_sample("E-defter", data["edefter"])


if __name__ == "__main__":
    main()
