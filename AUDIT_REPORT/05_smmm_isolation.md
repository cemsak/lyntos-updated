# LYNTOS SMMM Veri Izolasyonu Denetim Raporu

**Tarih:** 2026-02-09
**Kapsam:** Backend API v1 + v2 tum endpoint dosyalari
**Branch:** refactor/backend-upload

---

## OZET

| Metrik | Deger |
|--------|-------|
| Taranan v1 dosya sayisi | 12 |
| Taranan v2 dosya sayisi | 38 |
| Auth kullanan v2 dosya | **1** (ingest.py) |
| Auth KULLANMAYAN v2 dosya | **35+** |
| Spoofable smmm_id lokasyonu | **15+** |
| client_id filtresiz endpoint | **14+** |
| NO AUTH REQUIRED yorumu | **12** |
| KRITIK bulgu | **7** |
| CIDDI bulgu | **9** |
| IYILESTIRME bulgu | **5** |

**Genel Durum: KRITIK** -- v2 API katmani neredeyse tamamen auth'suz. Tek dogru implementasyon ingest.py.

---

## 1. REFERANS: DOGRU IMPLEMENTASYON

### 1.1 middleware/auth.py (Merkezi Auth Modulu)

Dosya: `backend/middleware/auth.py`

- `verify_token`: JWT'den user dict doner (id, name, role)
- `check_client_access`: client tablosunda `WHERE id = ? AND smmm_id = ?` kontrolu
- `get_user_clients`: `WHERE smmm_id = ?` ile sadece o SMMM'nin musterilerini doner

### 1.2 api/v2/ingest.py (Altin Standart)

Dosya: `backend/api/v2/ingest.py`

- `user: dict = Depends(verify_token)` -- JWT AUTH
- `smmm_id = user.get("id", "")` -- Token'dan alinir
- Client ownership check: `SELECT id FROM clients WHERE id = ? AND smmm_id = ?`
- **Durum: TAMAM** -- Tum diger v2 endpoint'ler bunu ornek almali.

---

## 2. KRITIK BULGULAR (7 adet)

### K-01: donem_complete.py -- Ana Dashboard Endpointi Auth'suz

**Dosya:** `backend/api/v2/donem_complete.py`
**Seviye:** KRITIK
**Endpoint'ler:** GET /{client_id}/{period}, DELETE /{client_id}/{period}, GET /list

**Problem:**
- Auth yok, `Depends(verify_token)` yok
- `smmm_id: str = Query(default="HKOZKAN")` -- SPOOFABLE, hardcoded default
- DELETE endpoint bile auth'suz -- herhangi biri donem silebilir
- Tum mali veriler (mizan, VDK risk analizi, mali oranlar) erisime acik

**Etki:** Herhangi bir kullanici, herhangi bir SMMM'nin herhangi bir mukellefinin tum finansal verilerini gorebilir ve silebilir.

---

### K-02: mizan_data.py -- Mizan Verileri Tamamen Acik

**Dosya:** `backend/api/v2/mizan_data.py`
**Seviye:** KRITIK
**Endpoint'ler:** GET /available, GET /load/{smmm_id}/{client_id}/{period}, GET /analyze, GET /account, GET /check

**Problem:**
- Auth yok
- smmm_id URL path parametresinden aliniyor (spoofable)
- `/available` endpoint'i GLOBAL olarak tum SMMM/client/period cizelgesini doner
- SQL sorgularinda smmm_id filtresi client_id uzerinden uygulanmiyor

**Etki:** Rakip SMMM'nin tum mukellef listesi ve mizan verileri gorulebilir. `/available` endpoint ozellikle tehlikeli -- tum platformdaki verilerin haritasini cikarir.

---

### K-03: brief.py -- Yonetici Ozeti smmm_id Spoofable

**Dosya:** `backend/api/v2/brief.py`
**Seviye:** KRITIK
**Endpoint:** POST /brief/generate

**Problem:**
- Auth yok
- smmm_id request body'den aliniyor (spoofable)
- Herhangi bir SMMM'nin herhangi bir mukellefinin executive brief'i uretilebilir

---

### K-04: dossier.py -- Denetim Dosyasi Auth'suz

**Dosya:** `backend/api/v2/dossier.py`
**Seviye:** KRITIK
**Endpoint'ler:** POST /dossier/generate, POST /dossier/full-package

**Problem:**
- Auth yok
- smmm_id body'den -- spoofable (2 farkli Pydantic model)
- Big-4 standart denetim dosyasi herkes tarafindan uretilebilir

---

### K-05: evidence_bundle.py -- Kanit Paketi Auth'suz

**Dosya:** `backend/api/v2/evidence_bundle.py`
**Seviye:** KRITIK
**Endpoint'ler:** POST /evidence-bundle/generate, GET /evidence-bundle/summary

**Problem:**
- Generate: smmm_id body'den (spoofable)
- Summary: smmm_id kontrolu hic yok, sadece client_id + period_id ile sorgulama
- Client ownership kontrolu yok

---

### K-06: cari_mutabakat.py -- 8+ Endpoint Tamamen Acik

**Dosya:** `backend/api/v2/cari_mutabakat.py`
**Seviye:** KRITIK
**Endpoint'ler:** upload, list, onayla, ozet, preview, karar, kararlar-toplu, get-kararlar

**Problem:**
- Dosya basinda acikca belirtilmis: "NO AUTH REQUIRED"
- smmm_id default "SMMM" -- gercek bir izolasyon yok
- SMMM kararlari (onayla/reddet) auth'suz yazilabiliyor
- Cari mutabakat verileri herkes tarafindan gorulebilir

---

### K-07: cross_check.py -- Capraz Kontrol tenant_id Spoofable

**Dosya:** `backend/api/v2/cross_check.py`
**Seviye:** KRITIK

**Problem:**
- Auth yok
- tenant_id query parametresinden aliniyor (spoofable)
- SQL sorgulari tenant_id filtresini kullaniyor AMA caller-controlled
- KDV, Muhtasar, Banka capraz kontrollerinin tum sonuclari erisime acik

---

## 3. CIDDI BULGULAR (9 adet)

### C-01: feed.py -- Bildirim Akisi smmm_id Spoofable

**Dosya:** `backend/api/v2/feed.py`
**Endpoint'ler:** GET /feed/{period} (smmm_id = Query(...)), GET /feed/{period}/critical

### C-02: agents.py -- AI Ajanlari Tamamen Acik

**Dosya:** `backend/api/v2/agents.py`
**Endpoint'ler (8 adet):** POST /orchestrate, POST /mevzuat/scan, POST /mevzuat/search, POST /rapor/generate, POST /rapor/izah, GET /status, GET /registered, GET /execution-log

### C-03: rules.py -- VDK Kural CRUD Tamamen Acik

**Dosya:** `backend/api/v2/rules.py`
**Endpoint'ler (18 adet):** GET /rules, POST /rules, PATCH /{rule_id}, POST /{rule_id}/deprecate, + 14 diger
**Not:** Dosyanin kendi yorumunda: "Yanlis kural = MALIYE CEZASI riski"

### C-04: reports.py -- Rapor Uretimi Auth'suz

**Dosya:** `backend/api/v2/reports.py`
**Endpoint'ler:** POST /reports/generate, GET /reports/list, GET /reports/download/{report_id}
smmm_id body'den default bos string.

### C-05: banka.py -- Banka Hareketleri Auth'suz

**Dosya:** `backend/api/v2/banka.py`
"NO AUTH REQUIRED" acikca belirtilmis. tenant_id query param'dan, default "default". SQL sorgularinda smmm_id filtresi YOK.

### C-06: period_summary.py -- Donem Ozeti Auth'suz

**Dosya:** `backend/api/v2/period_summary.py`
"NO AUTH REQUIRED" acikca belirtilmis. 5+ endpoint hepsi auth'suz. Beyanname, tahakkuk, KDV verileri acik.

### C-07: periods.py -- Donem CRUD Auth'suz, DELETE Dahil

**Dosya:** `backend/api/v2/periods.py`
**Endpoint'ler:** GET, POST, POST /ensure, DELETE -- hepsi auth'suz.

### C-08: checklists.py -- Kontrol Listesi Auth'suz

**Dosya:** `backend/api/v2/checklists.py`
Auth yok, client_id sorgusu smmm_id filtresi olmadan.

### C-09: registry.py (v1) -- Portfolio smmm_id URL'den

**Dosya:** `backend/api/v1/registry.py`
**Endpoint'ler:** GET /portfolio/{smmm_id}, POST /companies/{tax_number}/track, DELETE /companies/{tax_number}/track

---

## 4. IYILESTIRME BULGULARI (5 adet)

### I-01: contracts.py (v1) -- smmm_id Fallback Zinciri

Auth var (Depends(verify_token)) AMA `smmm_n = smmm or smmm_id or user.get("id")` -- query parametreleri JWT'den once kullaniliyor. Spoofing riski.

### I-02: 12 Dosyada "NO AUTH REQUIRED" Yorumu

Dosyalar: banka.py, edefter_rapor.py, period_summary.py, yevmiye.py, beyanname_tahakkuk.py, banka_mutabakat.py, kebir.py, cari_mutabakat.py, yevmiye_kebir.py, beyanname_muhtasar.py, beyanname_kdv.py, yeniden_degerleme.py (partial)

### I-03: yeniden_degerleme.py -- smmm_id Hardcoded Default

`smmm_id: str = Query(default="HKOZKAN")` -- Gelistirme kolayligi icin konmus ama uretimde tehlikeli.

### I-04: tenant_id vs smmm_id Tutarsizligi

Bazi dosyalar tenant_id, bazilari smmm_id kullaniyor. Ayni konsept icin farkli isimler.

### I-05: v1 Endpoint'lerde Genel Durum

v1 genelde Depends(verify_token) kullaniyor (iyi): contracts.py, tenants.py, documents.py, evidence.py, user.py, audit.py, beyannameler.py, defterler.py, tax_certificate.py, corporate.py, regwatch.py. Istisna: registry.py (C-09).

---

## 5. SPOOFABLE smmm_id LOKASYONLARI

| # | Dosya | Kaynak |
|---|-------|--------|
| 1 | brief.py | Request Body |
| 2 | dossier.py | Request Body (2 model) |
| 3 | evidence_bundle.py | Request Body |
| 4 | feed.py | Query Param |
| 5 | donem_complete.py | Query("HKOZKAN") (3 endpoint) |
| 6 | mizan_data.py | URL Path |
| 7 | yeniden_degerleme.py | Query("HKOZKAN") |
| 8 | cari_mutabakat.py | Body("SMMM") (2 model) |
| 9 | reports.py | Body("") |
| 10 | upload.py (deprecated) | Form("HKOZKAN") |
| 11 | bulk_upload.py (deprecated) | Form("HKOZKAN") |
| 12 | contracts.py (v1) | Query(None) |
| 13 | registry.py (v1) | URL Path |
| 14 | registry.py (v1) | Query("default") |
| 15 | tenants.py (v1) | Function Param("HKOZKAN") |

---

## 6. AUTH DURUM TABLOSU (v2 -- Tam Liste)

| Dosya | Auth | smmm_id Kaynagi | Seviye |
|-------|------|-----------------|--------|
| ingest.py | EVET | JWT (user["id"]) | OK |
| upload.py | - | Deprecated (410) | - |
| bulk_upload.py | - | Deprecated (410) | - |
| donem_complete.py | YOK | Query("HKOZKAN") | KRITIK |
| mizan_data.py | YOK | URL Path | KRITIK |
| brief.py | YOK | Body | KRITIK |
| dossier.py | YOK | Body | KRITIK |
| evidence_bundle.py | YOK | Body/YOK | KRITIK |
| cari_mutabakat.py | YOK | Body("SMMM") | KRITIK |
| cross_check.py | YOK | Query(tenant_id) | KRITIK |
| feed.py | YOK | Query | CIDDI |
| agents.py | YOK | N/A | CIDDI |
| rules.py | YOK | N/A | CIDDI |
| reports.py | YOK | Body("") | CIDDI |
| banka.py | YOK | Query("default") | CIDDI |
| period_summary.py | YOK | Query("default") | CIDDI |
| periods.py | YOK | N/A | CIDDI |
| checklists.py | YOK | N/A | CIDDI |
| yeniden_degerleme.py | YOK | Query("HKOZKAN") | IYILESTIRME |
| yevmiye.py | YOK | Query("default") | IYILESTIRME |
| kebir.py | YOK | Query("default") | IYILESTIRME |
| beyanname_tahakkuk.py | YOK | Query("default") | IYILESTIRME |
| banka_mutabakat.py | YOK | Query("default") | IYILESTIRME |
| yevmiye_kebir.py | YOK | Query("default") | IYILESTIRME |
| edefter_rapor.py | YOK | Query("default") | IYILESTIRME |
| beyanname_kdv.py | YOK | Query("default") | IYILESTIRME |
| beyanname_muhtasar.py | YOK | Query("default") | IYILESTIRME |
| mizan_analiz.py | YOK | N/A | IYILESTIRME |
| mizan_sync.py | YOK | N/A | IYILESTIRME |
| donem_sync.py | YOK | N/A | IYILESTIRME |
| donem_sonu_islem.py | YOK | N/A | IYILESTIRME |
| opening_balance.py | YOK | N/A | IYILESTIRME |
| defter_kontrol.py | YOK | N/A | IYILESTIRME |
| validate_vdk.py | YOK | N/A | IYILESTIRME |
| mevzuat_search.py | YOK | N/A (global) | IYILESTIRME |
| tax_parameters.py | YOK | N/A (global) | IYILESTIRME |
| gib_public.py | YOK | N/A (global) | IYILESTIRME |

Not: mevzuat_search.py, tax_parameters.py ve gib_public.py global referans verisi sundugu icin smmm izolasyonu gerekmeyebilir, ancak yine de auth'lu olmali.

---

## 7. ONERI: IMPLEMENTASYON PLANI

### Asama 1: Acil (KRITIK -- 1-2 gun)

1. Tum v2 endpoint'lere `Depends(verify_token)` ekle
2. smmm_id'yi HER ZAMAN `user["id"]`'den al (request parametresinden ASLA)
3. client_id iceren tum sorgulamalara `check_client_access(user, client_id)` ekle
4. `/available` endpoint'ini kaldir veya auth arkasina al
5. DELETE endpoint'lerine oncelikli auth ekle (periods.py, donem_complete.py)

### Asama 2: Orta Vade (CIDDI -- 1 hafta)

1. tenant_id parametresini tum dosyalardan kaldir, `smmm_id = user["id"]` kullan
2. rules.py CRUD endpoint'lerine role-based access ekle (sadece admin)
3. agents.py endpoint'lerine auth + rate limiting ekle
4. registry.py (v1) portfolio endpoint'ine auth ekle
5. v1 contracts.py fallback zincirini temizle

### Asama 3: Uzun Vade (IYILESTIRME -- 2 hafta)

1. "NO AUTH REQUIRED" yorumlarini tum dosyalardan kaldir
2. Birim testleri: Her endpoint icin auth kontrolu testi yaz
3. API Gateway/middleware seviyesinde zorunlu auth (whitelist disindaki tum route'lar)
4. Audit log: Her veri erisimini logla (kim, ne zaman, hangi client_id)

---

*Rapor Sonu -- 2026-02-09*
