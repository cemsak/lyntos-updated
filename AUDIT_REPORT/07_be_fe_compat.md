# LYNTOS Backend-Frontend Uyumluluk Denetim Raporu

**Tarih:** 2026-02-09
**Kapsam:** Frontend API cagrilari vs Backend endpoint'leri uyumu
**Branch:** refactor/backend-upload

---

## OZET

| Seviye | Bulgu Sayisi |
|--------|-------------|
| KRITIK | 3 |
| CIDDI | 8 |
| IYILESTIRME | 5 |
| **TOPLAM** | **16** |

---

## 1. KRITIK BULGULAR

### K-01: Auth Header Tutarsizligi

**Problem:** Frontend sayfalarinin bir kismi `getAuthToken()` ile Authorization header gonderiyor, bir kismi gondermiyor. Backend v2 endpoint'leri zaten auth gerektirmiyor (bkz. 05_smmm_isolation.md).

**Auth Gonderen Frontend Dosyalari:**
- `app/v2/_lib/config/api.ts` (getAuthToken mevcut)
- Upload/ingest islemleri (dogru)
- v1 API cagrilari (dogru)

**Auth GONDERMEYEN Frontend Dosyalari:**
- `app/v2/regwatch/_components/regwatch-api.ts` -- 4 fonksiyon (searchMevzuat, fetchStatistics, fetchRecent, fetchByType) hepsi raw `fetch()` ile, Authorization header YOK
- `app/v2/_hooks/useDashboardData.ts` -- donem status API cagrisi auth'suz
- `app/v2/donem-sonu/page.tsx` -- period status check auth'suz
- `app/v2/beyanname/kurumlar/page.tsx` -- kurumlar vergisi verisi auth'suz

**Etki:** Backend auth eklendiginde bu sayfalar 401 alacak ve kirilacak. Auth ekleme refactoru sirasinda tum frontend cagrilari da guncellenmeli.

---

### K-02: Response Envelope Tutarsizligi

**Problem:** Backend endpoint'lerinin bir kismi `{success: true, data: {...}}` envelope donduruyor, digerleri raw JSON donduruyor. Frontend her iki pattern'i handle ediyor ama tutarsiz.

**Envelope Kullanan Backend Endpoint'ler:**
- ingest.py: `{"success": True, "session_id": ..., "statistics": {...}}`
- mevzuat_search.py: `{"success": True, "data": {...}}`
- gib_public.py: `{"success": True, "data": [...]}`

**Raw JSON Dondurenler:**
- donem_complete.py: direkt dict
- mizan_data.py: direkt dict
- cross_check.py: direkt dict
- period_summary.py: direkt dict
- banka.py: direkt dict

**Frontend Etkileri:**
- regwatch-api.ts: `data.success` ve `data.data` kontrolu yapiyor (envelope bekliyor)
- useDashboardData.ts: `result` direkt kullaniyor (raw JSON bekliyor)
- Yanlis pattern eslesmesinde sessiz hata veya undefined data

---

### K-03: Varolmayan Endpoint'lere Cagri

**Problem:** Frontend bazi endpoint'leri cagiriyor ama bu endpoint'ler backend'de mevcut degil veya farkli path'te.

| Frontend Cagrisi | Backend Durumu |
|------------------|---------------|
| `/api/v2/beyanname/kurumlar` | **MEVCUT DEGIL** -- frontend sifir deger ile sessiz devam |
| `/api/v2/risk-queue` | **MEVCUT DEGIL** |
| `/api/v2/fake-invoice-risk` | **MEVCUT DEGIL** |
| `/api/v2/profile` | **MEVCUT DEGIL** (user.py v1'de) |
| `/api/v2/tcmb/yiufe` | **MEVCUT DEGIL** (yeniden_degerleme.py farkli path) |

**Etki:** Kullanicilar bu sayfalarda her zaman bos/sifir veri gorurler. Hata loglanmiyor veya sadece console.warn ile.

---

## 2. CIDDI BULGULAR

### C-01: UploadResult Type Uyumsuzlugu

**Frontend tipi bekliyor:**
- `summary` alani
- `donem_id` alani
- `file` alani
- `rows` alani
- `success` status

**Backend gercekte donduruyor:**
- `statistics` alani (summary degil)
- `session_id` alani (donem_id degil)
- `filename` alani (file degil)
- `parsed_row_count` alani (rows degil)
- `OK` status (success degil)

**Etki:** Upload sonuc ekraninda yanlis veri gosterilmesi veya "undefined" gorunmesi riski.

---

### C-02: Period Format Uyumsuzlugu

**Frontend:** `2025-Q1` (tire) gonderir
**Backend DB:** `2025_Q1` (alt cizgi) saklar
**Normalizasyon:** `ingest.py`'de `period_code.replace('-', '_').upper()` var

**Sorun:** Bu normalizasyon sadece ingest.py'de var. Diger endpoint'lerde (donem_complete, mizan_data, periods) bu donusum yapilmiyor. Frontend'den tire ile gelen period kodu DB'de eslesmeyebilir.

---

### C-03: tenant_id vs smmm_id Parametre Uyumsuzlugu

**Frontend gonderiyor:**
- `tenant_id=default` (useDashboardData.ts)
- `smmm_id=HKOZKAN` (bazi sayfalar)
- Parametre gondermeyenler de var

**Backend bekliyor:**
- Bazi endpoint'ler `tenant_id` (banka.py, period_summary.py, cross_check.py)
- Bazi endpoint'ler `smmm_id` (donem_complete.py, mizan_data.py)
- Default degerleri farkli ("default" vs "HKOZKAN" vs "SMMM")

---

### C-04: Hata Isleme Tutarsizligi

| Frontend Dosyasi | Hata Isleme Yontemi |
|-----------------|---------------------|
| regwatch-api.ts | `throw new Error('...')` -- hata firlatir |
| useDashboardData.ts | `setIsError(true)` -- state gunceller |
| donem-sonu/page.tsx | `setHasData(false)` -- sessiz bos gosterir |
| beyanname/kurumlar/page.tsx | `console.warn('...')` -- sessiz sifir devam |

**Sorun:** Bazi sayfalar hatada crash olabilir (throw), bazilari sessizce yanlis veri gosterir. Kullaniciya tutarsiz deneyim.

---

### C-05: Pagination Eksikligi

List endpoint'lerinde pagination genelde yok:
- `GET /rules` -- tum kurallari tek seferde donduruyor (180+ kural)
- `GET /feed/{period}` -- tum bildirimleri donduruyor
- `GET /reports/list` -- tum raporlari donduruyor

Frontend'de de infinite scroll veya sayfalama yok. Veri buyudukce performans sorunu olusacak.

---

### C-06: Hardcoded Degerler

| Dosya | Hardcoded Deger | Sorun |
|-------|----------------|-------|
| useDashboardData.ts | `tenant_id=default` | SMMM izolasyonunu bypass |
| donem_complete.py | `smmm_id=HKOZKAN` | Tek kullanici varsayimi |
| cari_mutabakat.py | `smmm_id=SMMM` | Test degeri production'da |
| yeniden_degerleme.py | `smmm_id=HKOZKAN` | Tek kullanici varsayimi |

---

### C-07: Period Errors Frontend'de Handle Edilmiyor

Backend ingest yaniti `period_errors` alani donduruyor:
```json
"period_errors": [{"filename": "mizan.xlsx", "detected_period": "2024_Q4", "selected_period": "2025_Q1"}]
```

Frontend upload sonuc ekraninda bu alani gostermiyor veya uyari vermiyor. Kullanici yanlis doneme veri yukleyip fark etmeyebilir.

---

### C-08: API_ENDPOINTS Kullanimdan Dusmus

`app/v2/_lib/config/api.ts` icinde API_ENDPOINTS objesi kapsamli tanimlanmis, ancak bircok sayfa bunu kullanmiyor:
- regwatch-api.ts: Manuel URL birlesimi
- useDashboardData.ts: `${apiBase}/api/v2/...` seklinde hardcoded
- beyanname/kurumlar/page.tsx: Manuel URL
- donem-sonu/page.tsx: Manuel URL

---

## 3. IYILESTIRME BULGULARI

### I-01: Merkezi API Client Eksik

Her sayfa kendi `fetch()` cagrisini yapiyor. Olmasi gereken: tek bir API client wrapper ile auth header, error handling, retry, timeout merkezi.

### I-02: TypeScript Strict Mode

Frontend'de 174 `any` tipi var. Strict mode'da bunlar hata verir. Backend-frontend tip uyumu zorlanamiyor.

### I-03: API Versiyonlama

v1 ve v2 API'ler paralel calisiyor. Frontend'de hem v1 hem v2 cagrilari var. Temiz bir geçis stratejisi yok.

### I-04: CORS Yapilandirmasi

Backend'de CORS wildcard (`*`) var. Production'da frontend origin'e kisitlanmali.

### I-05: WebSocket / SSE Eksik

Uzun suren islemler (ingest pipeline, AI analiz) icin real-time progress yok. Frontend sadece polling yapiyor.

---

## 4. ONCELIKLI AKSIYON PLANI

### Asama 1: Acil (auth refactoru ile birlikte)
1. Tum frontend fetch cagrilarina `getAuthToken()` ile Authorization header ekle
2. Merkezi API client olustur (auth, error handling, timeout)
3. UploadResult type'ini backend yaniti ile eslestir
4. Period format normalizasyonunu backend middleware'ine tasi

### Asama 2: Orta Vade (1-2 hafta)
5. Response envelope standardini belirle ve tum endpoint'lerde uygula
6. Varolmayan endpoint'leri implement et veya frontend'den kaldir
7. Pagination ekle (rules, feed, reports list)
8. period_errors'u frontend'de goster

### Asama 3: Uzun Vade
9. tenant_id/smmm_id parametresini birlestir
10. API_ENDPOINTS config'ini tum sayfalarda kullan
11. TypeScript strict mode + shared types paketi
12. WebSocket/SSE ile real-time progress

---

*Rapor Sonu -- 2026-02-09*
