#!/usr/bin/env bash
set -euo pipefail
HOST=${HOST:-http://127.0.0.1:8000}

echo "1) health"
curl -sSf $HOST/health | python -m json.tool >/dev/null

echo "2) login + header"
TOKEN=$(curl -sSf -X POST $HOST/v1/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"12345"}' \
 | python -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')
H_AUTH="Authorization: Bearer $TOKEN"

echo "3) analyze (basic)"
curl -sSf "$HOST/v1/kurgan/analyze" -H "$H_AUTH" >/dev/null

echo "4) analyze (radar hints)"
curl -sSf "$HOST/v1/kurgan/analyze?babs_uyumsuzluk=true&kasa_nakit_anormal=true&stok_yuksek=true&stok_deger_dusuklugu=true&karlilik_sektor_sapma=true&pos_hasilat_uyumsuz=true&faaliyet_gider_sapma=true&degerleme_hatalari=true&amortisman_hatalari=true&kredi_varken_yuksek_nakit=true&ortaklara_borclanma_katsayi=3.6" -H "$H_AUTH" >/dev/null

echo "OK: smoke passed"
