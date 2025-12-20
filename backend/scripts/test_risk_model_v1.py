import sys
import json
from pathlib import Path

# --- Lyntos backend kök klasörünü PYTHONPATH'e ekle ---
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Artık risk_model import edilebilir
from risk_model.v1_engine import run_risk_model_v1


def main() -> None:
    # data klasörünün yolu
    data_root = BASE_DIR / "data"

    # Test edeceğimiz SMMM ve mükellef
    smmm_id = "HKOZKAN"
    client_id = "OZKAN_KIRTASIYE"
    period = "2025-Q2"  # şu an gerçek veriyi bu dönem için hazırladık

    # KURGAN v1 risk modelini çalıştır
    result = run_risk_model_v1(
        base_dir=data_root,
        smmm_id=smmm_id,
        client_id=client_id,
        period=period,
    )

    # Çıktıyı okunur JSON olarak bastıralım
    output = {
        "ok": True,
        "version": "v1",
        "smmm_id": smmm_id,
        "client_id": client_id,
        "period": period,
        **result,
    }

    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
