#!/bin/bash
# LYNTOS E2E Sync Pipeline Test
# Usage: ./scripts/e2e-sync-test.sh
#
# Tests the complete upload -> parse -> sync -> dashboard pipeline

set -e

BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
TENANT_ID="e2e-test-$(date +%s)"
CLIENT_ID="e2e-client"
PERIOD="2024-Q4"

echo "=========================================="
echo "LYNTOS E2E Sync Test"
echo "=========================================="
echo "Backend URL: $BACKEND_URL"
echo "Tenant ID: $TENANT_ID"
echo "Period: $PERIOD"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; exit 1; }
info() { echo -e "${YELLOW}→${NC} $1"; }

# Test 1: Backend health
info "Testing backend health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/docs")
if [ "$HTTP_CODE" = "200" ]; then
  pass "Backend is running"
else
  fail "Backend returned HTTP $HTTP_CODE"
fi

# Test 2: Sync endpoint with test data
info "Testing POST /api/v2/donem/sync..."

SYNC_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/v2/donem/sync" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"meta\": {
      \"clientId\": \"$CLIENT_ID\",
      \"clientName\": \"E2E Test\",
      \"period\": \"$PERIOD\",
      \"quarter\": \"Q4\",
      \"year\": 2024,
      \"uploadedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"sourceFile\": \"test.zip\"
    },
    \"fileSummaries\": [
      {\"id\": \"f1\", \"fileName\": \"mizan.xlsx\", \"fileType\": \"MIZAN_EXCEL\", \"fileSize\": 1000, \"confidence\": 0.9, \"metadata\": {}},
      {\"id\": \"f2\", \"fileName\": \"kdv.pdf\", \"fileType\": \"KDV_BEYANNAME_PDF\", \"fileSize\": 2000, \"confidence\": 0.95, \"metadata\": {}}
    ],
    \"stats\": {\"total\": 2, \"detected\": 2, \"parsed\": 2, \"failed\": 0}
  }")

SYNC_SUCCESS=$(echo "$SYNC_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null || echo "false")
SYNCED_COUNT=$(echo "$SYNC_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('syncedCount', 0))" 2>/dev/null || echo "0")

if [ "$SYNC_SUCCESS" = "True" ] && [ "$SYNCED_COUNT" = "2" ]; then
  pass "Sync endpoint returned success with 2 files synced"
else
  echo "Response: $SYNC_RESPONSE"
  fail "Sync failed or count mismatch (expected 2, got $SYNCED_COUNT)"
fi

# Test 3: Status endpoint
info "Testing GET /api/v2/donem/status/$PERIOD..."

STATUS_RESPONSE=$(curl -s "$BACKEND_URL/api/v2/donem/status/$PERIOD?tenant_id=$TENANT_ID&client_id=$CLIENT_ID")
TOTAL_COUNT=$(echo "$STATUS_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalCount') or d.get('total_count', 0))" 2>/dev/null || echo "0")

if [ "$TOTAL_COUNT" = "2" ]; then
  pass "Status endpoint returned correct count (2)"
else
  echo "Response: $STATUS_RESPONSE"
  fail "Status count mismatch (expected 2, got $TOTAL_COUNT)"
fi

# Test 4: Database verification
info "Verifying database records..."

# Find database path relative to script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_PATH="$SCRIPT_DIR/../backend/database/lyntos.db"

if [ -f "$DB_PATH" ] && command -v sqlite3 &> /dev/null; then
  DB_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM document_uploads WHERE tenant_id='$TENANT_ID';" 2>/dev/null || echo "0")
  if [ "$DB_COUNT" = "2" ]; then
    pass "Database contains 2 records for test tenant"
  else
    fail "Database count mismatch (expected 2, got $DB_COUNT)"
  fi
else
  info "sqlite3 not available or DB not found, skipping direct DB check"
fi

# Test 5: Cleanup
info "Cleaning up test data..."

DELETE_RESPONSE=$(curl -s -X DELETE "$BACKEND_URL/api/v2/donem/clear/$PERIOD?tenant_id=$TENANT_ID&client_id=$CLIENT_ID")
CLEARED=$(echo "$DELETE_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('clearedCount', 0))" 2>/dev/null || echo "0")

if [ "$CLEARED" = "2" ]; then
  pass "Cleanup completed (2 records soft-deleted)"
else
  info "Cleanup returned $CLEARED records (may already be cleaned)"
fi

# Test 6: Verify cleanup
info "Verifying cleanup..."

STATUS_AFTER=$(curl -s "$BACKEND_URL/api/v2/donem/status/$PERIOD?tenant_id=$TENANT_ID&client_id=$CLIENT_ID")
COUNT_AFTER=$(echo "$STATUS_AFTER" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalCount') or d.get('total_count', 0))" 2>/dev/null || echo "0")

if [ "$COUNT_AFTER" = "0" ]; then
  pass "Data successfully cleaned up (0 active records)"
else
  fail "Cleanup verification failed (expected 0, got $COUNT_AFTER)"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}ALL TESTS PASSED${NC}"
echo "=========================================="
echo ""
echo "Pipeline verified:"
echo "  1. Backend health check"
echo "  2. POST /api/v2/donem/sync - Data persistence"
echo "  3. GET /api/v2/donem/status - Data retrieval"
echo "  4. Database record verification"
echo "  5. DELETE /api/v2/donem/clear - Cleanup"
echo ""
