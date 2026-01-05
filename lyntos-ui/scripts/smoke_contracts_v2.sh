#!/usr/bin/env bash
# LYNTOS V2 Dashboard - Contract Smoke Test
# Tests all backend contract endpoints required by the V2 dashboard

set -e

BASE="http://127.0.0.1:8000/api/v1"
AUTH="Authorization: DEV_HKOZKAN"
PARAMS="smmm_id=HKOZKAN&client_id=OZKAN_KIRTASIYE&period=2025-Q2"

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║     LYNTOS V2 Dashboard - Contract Smoke Test                        ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

PASS=0
FAIL=0

check_endpoint() {
  local name="$1"
  local url="$2"

  printf "%-30s " "$name"

  status=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$url" 2>/dev/null || echo "000")

  if [ "$status" = "200" ]; then
    echo "✓ 200 OK"
    PASS=$((PASS + 1))
  else
    echo "✗ $status FAIL"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Contract Endpoints ==="
echo ""

check_endpoint "kurgan-risk" "$BASE/contracts/kurgan-risk?$PARAMS"
check_endpoint "quarterly-tax" "$BASE/contracts/quarterly-tax?$PARAMS"
check_endpoint "corporate-tax" "$BASE/contracts/corporate-tax?$PARAMS"
check_endpoint "cross-check" "$BASE/contracts/cross-check?$PARAMS"
check_endpoint "data-quality" "$BASE/contracts/data-quality?$PARAMS"
check_endpoint "actionable-tasks" "$BASE/contracts/actionable-tasks?$PARAMS"
check_endpoint "mizan-analysis" "$BASE/contracts/mizan-analysis?$PARAMS"
check_endpoint "inflation-adjustment" "$BASE/contracts/inflation-adjustment?$PARAMS"
check_endpoint "regwatch-status" "$BASE/contracts/regwatch-status?$PARAMS"
check_endpoint "corporate-tax-forecast" "$BASE/contracts/corporate-tax-forecast?$PARAMS"

echo ""
echo "=== Document Endpoints ==="
echo ""

DOC_PARAMS="tenant_id=HKOZKAN&client_id=OZKAN_KIRTASIYE&period_id=2025-Q2"
check_endpoint "period-completeness" "$BASE/documents/period-completeness?$DOC_PARAMS"

echo ""
echo "=== Sources Endpoint ==="
echo ""

check_endpoint "sources/SRC-0001" "$BASE/contracts/sources/SRC-0001"

echo ""
echo "══════════════════════════════════════════════════════════════════════"
echo "Results: $PASS passed, $FAIL failed"
echo "══════════════════════════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

echo ""
echo "All contract endpoints responding correctly!"
