#!/usr/bin/env bash
set -euo pipefail

SMMM="${1:?smmm required}"
CLIENT="${2:?client required}"
PERIODS_CSV="${3:-2025-Q1,2025-Q2,2025-Q3}"
BASE_URL="${4:-http://localhost:8000}"

python3 scripts/validate_period_data.py \
  --smmm "$SMMM" \
  --client "$CLIENT" \
  --periods-csv "$PERIODS_CSV" \
  --json-out /tmp/validate_period_data.json || true

export PERIODS_CSV

for P in ${PERIODS_CSV//,/ }; do
  URL="$BASE_URL/api/v1/contracts/axis/D?smmm=$SMMM&client=$CLIENT&period=$P"
  curl -sS -o "/tmp/axisD_$P.json" -w "P=$P HTTP=%{http_code} BYTES=%{size_download}\n" "$URL"
done

python3 - <<'PY'
import json, os
periods=os.environ.get("PERIODS_CSV","").split(",")
for p in periods:
    fn=f"/tmp/axisD_{p}.json"
    try:
        o=json.load(open(fn,"r",encoding="utf-8"))
        if isinstance(o, dict) and "detail" in o and len(o.keys()) == 1:
            print(p, "detail=", o.get("detail"))
            continue
        t=o.get("trend") or {}
        print(p, "prev_available=", t.get("prev_available"), "prev_period=", t.get("prev_period"), "reason_tr=", t.get("reason_tr"))
    except Exception as e:
        body=open(fn,"r",encoding="utf-8", errors="ignore").read().strip()
        body_short=(body[:160] + ("..." if len(body) > 160 else ""))
        print(p, "non_json_body=", body_short)
PY