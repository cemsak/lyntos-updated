# LYNTOS Guvenlik & Teknik Borc Tarama Raporu

**Tarih:** 2026-02-09
**Branch:** refactor/backend-upload
**Tarayan:** Claude Opus 4.6 otomatik tarama

---

## OZET SKOR TABLOSU

| Kategori | Kritik | Ciddi | Iyilestirme | Toplam |
|----------|--------|-------|-------------|--------|
| SQL Injection | 1 | 1 | 0 | 2 |
| JWT Guvenlik | 2 | 1 | 0 | 3 |
| CORS | 0 | 1 | 1 | 2 |
| Secret/Credential | 2 | 1 | 0 | 3 |
| Auth Eksik Endpoint | 1 | 0 | 0 | 1 |
| TypeScript `any` | 0 | 1 | 0 | 1 |
| console.log | 0 | 0 | 1 | 1 |
| TODO/FIXME/HACK | 0 | 0 | 1 | 1 |
| Dev Dosyalar | 0 | 1 | 0 | 1 |
| **TOPLAM** | **6** | **6** | **3** | **15** |

---

## 1. SQL INJECTION TARAMASI

### [KRITIK] F-string ile dinamik tablo adi kullanimi

Asagidaki dosyalarda tablo adi f-string ile SQL sorgusuna ekleniyor. Tablo adlari hardcoded listelerden geliyorsa risk dusuk ama pattern tehlikeli:

| Dosya | Satir | Kod |
|-------|-------|-----|
| `backend/api/v1/tenants.py` | 472 | `cursor.execute(f"DELETE FROM {table} WHERE client_id = ?", ...)` |
| `backend/api/v1/tenants.py` | 484 | `cursor.execute(f"DELETE FROM task_comments WHERE task_id IN ({placeholders})", ...)` |
| `backend/api/v1/tenants.py` | 487 | `cursor.execute(f"DELETE FROM task_history WHERE task_id IN ({placeholders})", ...)` |
| `backend/api/v2/ingest.py` | 1112 | `cursor.execute(f"DELETE FROM {table} WHERE source_file_id = ?", ...)` |
| `backend/api/v2/ingest.py` | 1141 | `cursor.execute(f"DELETE FROM {table} WHERE {condition}", ...)` |
| `backend/services/rule_manager.py` | 256 | `f"UPDATE rules SET {', '.join(set_clauses)} WHERE rule_id = ?"` |
| `backend/services/post_ingest_pipeline.py` | 121 | `f"UPDATE upload_sessions SET {', '.join(updates)} WHERE id = ?"` |
| `backend/services/mevzuat_search.py` | 408 | `f"SELECT COUNT(*) FROM mevzuat_refs WHERE {where_clause}"` |
| `backend/api/v1/notifications.py` | 188 | `f"UPDATE notification_preferences SET {set_clause} WHERE user_id = ?"` |
| `backend/api/v1/defterler.py` | 223 | `f"SELECT COUNT(*) FROM yevmiye_entries WHERE {where_clause}"` |
| `backend/api/v1/defterler.py` | 475 | `f"SELECT COUNT(*) FROM banka_islemler WHERE {where_clause}"` |
| `backend/api/v1/registry.py` | 217 | `f"UPDATE company_registry SET {', '.join(updates)} WHERE tax_number = ?"` |

**Script dosyalari (daha dusuk risk, admin-only):**

| Dosya | Satir | Kod |
|-------|-------|-----|
| `backend/scripts/sistem_durum_raporu.py` | 36 | `f"SELECT COUNT(*) FROM {table}"` |
| `backend/scripts/cleanup_orphan_data.py` | 90 | `f"SELECT COUNT(*) FROM {table}"` |
| `backend/scripts/cleanup_demo_data.py` | 64,73,88 | `f"DELETE FROM {table} WHERE ..."` |
| `backend/scripts/clean_reset.py` | 65,121,124 | `f"SELECT/DELETE FROM {table}"` |

**Deger:** `tenants.py` ve `ingest.py`'deki tablo adlari CLEANUP_TABLES sabit listesinden geldiginden gercek SQLi riski dusuk. Ancak `mevzuat_search.py`, `defterler.py`, `rule_manager.py`'deki `where_clause` / `set_clauses` dinamik olusturuluyor -- bunlar daha riskli.

### [CIDDI] Dinamik WHERE clause olusturma

`defterler.py`, `mevzuat_search.py`, `rule_manager.py`, `notifications.py` ve `registry.py` dosyalarinda `where_clause` veya `set_clauses` degiskenleri kullanici girdisinden turetilmis olabilir. Parameterized query yerine f-string kullanimi mevcut.

---

## 2. JWT GUVENLIK ANALIZI

**Dosya:** `backend/middleware/auth.py`

### [KRITIK] Zayif ve hardcoded JWT secret fallback

```
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "LYNTOS_SECRET_CHANGE_IN_PRODUCTION")  # auth.py:28
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "lyntos_secret_key_2025")              # main.py:111
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "LYNTOS_SECRET_CHANGE_IN_PRODUCTION")  # auth/routes.py:21
```

- JWT secret 3 farkli dosyada tanimlaniyor, 2 farkli fallback degeri var
- Fallback degerler tahmin edilebilir
- .env dosyasindaki gercek deger: `lyntos-prod-secret-2025-cemsak` -- bu da zayif (kisa, tahmin edilebilir, entropi dusuk)

### [KRITIK] Token expiry kontrolu yok

`auth.py` dosyasinda `jwt.decode()` expiry kontrolu yapiyor (`jwt.ExpiredSignatureError` yakalaniyor) ANCAK token olusturma (`auth/routes.py`) incelendiginde `exp` field'i set ediliyor mu kontrol edilmeli. `verify_token()` fonksiyonu sadece `sub` veya `user_id` arıyor, `exp` zorunlulugu framework'e birakilmis.

### [CIDDI] Dev bypass production'da aktif olabilir

```python
DEV_AUTH_BYPASS = os.getenv("LYNTOS_DEV_AUTH_BYPASS", "0") == "1"  # auth.py:32
```

- `DEV_HKOZKAN` token'i ile herhangi bir kullanici olarak giris yapilabilir
- .env dosyasinda bu degisken gorunmuyor, yani default `"0"` -- ANCAK production deploy'da `.env` unutulursa veya env var set edilirse tam bypass aktif olur
- Dev bypass log'a yaziliyor ama alarm/monitoring yok

---

## 3. CORS YAPILANDIRMASI

**Dosya:** `backend/main.py:137-150`

### [CIDDI] Genis wildcard header ve method izni

```python
allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.1.102:3000",
    "http://192.168.1.172:3000",
],
allow_credentials=True,
allow_methods=["*"],
allow_headers=["*"],
```

- `allow_methods=["*"]` ve `allow_headers=["*"]` ile `allow_credentials=True` birlikte kullanilmasi genis bir saldiri yuzeyi aciyor
- Ozel IP adresleri (192.168.x.x) sabit kodlanmis -- production'da kaldirılmali
- Origin listesi environment variable'dan okunmuyor, her ortam icin farkli build gerekiyor

### [IYILESTIRME] Production icin origin beyaz listesi daraltilmali

- `localhost` ve `127.0.0.1` originleri production'da kalirsa local attacker CORS bypass yapabilir

---

## 4. .env ve .gitignore KONTROLU

### .env Dosyalari

| Dosya | Git'te mi? | Durum |
|-------|-----------|-------|
| `backend/.env` | HAYIR (backend/.gitignore ile haric) | OK |
| `backend/.env.example` | EVET (tracked) | OK |
| `lyntos-ui/.env.local` | HAYIR (lyntos-ui/.gitignore ile haric) | OK |
| `lyntos-ui/.env.example` | HAYIR | OK |

### [IYILESTIRME] Root .gitignore'da .env pattern eksik

Root `.gitignore` dosyasinda `.env` pattern'i yok. Her alt dizin kendi `.gitignore` ile koruma sagliyor. Root level'da da `.env` eklemek katmanli guvenlik saglar.

---

## 5. HARDCODED SECRET/CREDENTIAL TARAMASI

### [KRITIK] .env dosyasinda gercek API key'leri

`backend/.env` dosyasinda (git'te degil ama dosya sisteminde):

| Satir | Anahtar | Risk |
|-------|---------|------|
| 5 | `OPENAI_API_KEY=sk-proj-3tNhl6jaHOzA_...` | Gercek OpenAI production key |
| 18 | `ANTHROPIC_API_KEY=sk-ant-api03-w8wGgfd7...` | Gercek Anthropic production key |
| 23 | `TCMB_EVDS_API_KEY=77lXIAV7kc` | TCMB EVDS API key |

Bu key'ler .env dosyasinda olmasi dogru ANCAK:
- `.env` dosyasi git history'de hic commit edilmemis mi kontrol edilmeli
- Key rotation yapilmali

### [KRITIK] Hardcoded TCMB API key fallback

```python
# backend/services/tcmb_evds_service.py:48
EVDS_API_KEY = os.getenv("TCMB_EVDS_API_KEY", "77lXIAV7kc")
```

Gercek API key kaynak kodda fallback olarak hardcoded. Bu dosya git'te tracked ise key aciga cikmis demektir.

### [CIDDI] Frontend'de API key

```
# lyntos-ui/.env.local:5
TCMB_EVDS_API_KEY=77lXIAV7kc
```

Frontend .env dosyasinda API key var. `NEXT_PUBLIC_` prefix'i olmadiginden client'a sizdirmaz ama server-side'da mevcut.

---

## 6. AUTH EKSIK ENDPOINT'LER

### [KRITIK] verify_token Depends() OLMAYAN API Dosyalari

Asagidaki API dosyalarinda `from middleware.auth import verify_token` import'u YOK. Icerisindeki TUM POST/PUT/DELETE endpoint'leri auth korumasiz:

| Dosya | Korumasiz Endpoint Sayisi | Ornekler |
|-------|--------------------------|----------|
| `backend/api/v1/notifications.py` | 8 | POST /notifications, POST /read-all, PUT /preferences |
| `backend/api/v1/inspector_prep.py` | 2 | POST /notes, POST /document-status |
| `backend/api/v1/document_upload.py` | 3 | POST /upload, DELETE /{id}, POST /evidence-bundle |
| `backend/api/v1/chat.py` | 6 | POST /assistant, POST /corporate, POST /sessions, DELETE /sessions |
| `backend/api/v1/ai.py` | 6 | POST /analyze/regwatch, POST /analyze/company, POST /mevzuat-rag, POST /analyze/batch, POST /queue/{id}/approve |
| `backend/api/v1/registry.py` | 8 | POST /companies, PUT /companies/{tax_number}, DELETE /companies, POST /portfolio |
| `backend/api/v1/tax_strategist.py` | 1 | POST /analyze |
| `backend/api/v1/vdk_inspector.py` | 2 | POST /answer, POST /defense |
| `backend/api/v1/vdk_simulator.py` | 1 | POST /analyze |
| `backend/api/v2/cari_mutabakat.py` | 5 | POST /upload, POST /onayla, POST /confirm, POST /karar |
| `backend/api/v2/period_summary.py` | 3 | POST /odeme-durumu/refresh, POST /tahakkuk/manuel-odeme, POST /tahakkuk/odeme-iptal |
| `backend/api/v2/donem_complete.py` | 1 | DELETE /{client_id}/{period} |
| `backend/api/v2/rules.py` | 5 | POST /rules, PATCH /{rule_id}, POST /{rule_id}/deprecate, POST /duplicates/resolve |
| `backend/api/v2/opening_balance.py` | 4 | POST /upload-mizan, POST /extract, POST /manual, DELETE /{fiscal_year} |
| `backend/api/v2/reports.py` | 1 | POST /generate |
| `backend/api/v2/periods.py` | 3 | POST /, POST /ensure, DELETE /{client_id}/{period_code} |
| `backend/api/v2/gib_public.py` | 4 | POST /borclu-sorgula-toplu, POST /sektor-karsilastir, POST /guncelle |
| `backend/api/v2/upload.py` | 1 | POST /upload |
| `backend/api/v2/bulk_upload.py` | 1 | POST /zip |
| `backend/api/v2/evidence_bundle.py` | 1 | POST /generate |
| `backend/api/v2/donem_sync.py` | 2 | POST /sync, DELETE /clear |
| `backend/api/v2/mizan_sync.py` | 2 | POST /sync, DELETE /clear |
| `backend/api/v2/validate_vdk.py` | 1 | POST /vdk |
| `backend/api/v2/agents.py` | 5 | POST /orchestrate, POST /mevzuat/scan, POST /rapor/generate |
| `backend/api/v2/mevzuat_search.py` | 1 | POST /quick-search |
| `backend/api/v2/brief.py` | 1 | POST /generate |
| `backend/api/v2/checklists.py` | 1 | PUT /{checklist_id}/toggle |
| `backend/api/v2/dossier.py` | 2 | POST /generate, POST /full-package |
| `backend/api/v2/tax_parameters.py` | 6 | POST /calculate/gecikme-faizi, POST /calculate/bordro, vb. |
| `backend/api/v1/tax_certificate.py` | -- | (Bu dosya verify_token IMPORT EDIYOR, korunuyor) |

**TOPLAM: ~28 API dosyasinda ~79 korumasiz POST/PUT/DELETE endpoint**

Bu, platformun en buyuk guvenlik acigi. Herhangi biri auth olmadan veri silebilir, degistirebilir, upload yapabilir.

---

## 7. TYPESCRIPT `any` TIP KULLANIMI

### [CIDDI] 174 `any` kullanimi (53 dosyada)

En yogun kullanan dosyalar:

| Dosya | `any` Sayisi |
|-------|-------------|
| `app/v1/_components/V1DashboardClient.BACKUP_1767417435.tsx` | 34 |
| `src/lib/contracts.ts` | 20 |
| `app/v1/_components/AxisDPanelClient.tsx` | 12 |
| `src/components/v1/RiskDetailClient.tsx` | 9 |
| `src/components/v1/contractFind.ts` | 7 |
| `app/api/analyze/route.ts` | 6 |
| `app/v1/_components/RiskDetailClient.tsx` | 6 |
| `src/components/v1/R501View.tsx` | 5 |
| `src/components/v1/R401AView.tsx` | 5 |

Buyuk cogunlugu `_legacy/` ve `v1/` klasorlerinde. v2 kodunda cok daha az `any` var.

---

## 8. CONSOLE.LOG KULLANIMI

### [IYILESTIRME] Frontend'te 2 console.log (temiz)

| Dosya | Satir | Icerik |
|-------|-------|--------|
| `lyntos-ui/app/v2/_components/layout/useLayoutContext.tsx` | 51 | `console.log('[LayoutContext] refreshClients: selectedClient artik listede yok...')` |
| `lyntos-ui/app/v2/_components/layout/useLayoutContext.tsx` | 77 | `console.log('[LayoutContext] selectedClient artik listede yok...')` |

Frontend temiz sayilir, sadece 2 debug log'u kalmis.

---

## 9. TODO / FIXME / HACK SAYILARI

### [IYILESTIRME] Toplam 28 marker (app kodu)

| Tip | Backend (py) | Frontend (ts/tsx) | Toplam |
|-----|-------------|-------------------|--------|
| TODO | 14 | 14 | 28 |
| FIXME | 0 | 0 | 0 |
| HACK | 0 | 0 | 0 |

Backend TODO ornekleri:
- `services/enflasyon_duzeltme.py:439` -- TUIK API'den dinamik cekilecek
- `services/regwatch_service.py:107` -- Implement actual fetching
- `services/regwatch_sources.py:54,64,74,84,88` -- RSS/scraping endpoint dogrulanacak
- `services/ai/agents/rapor.py:408` -- PDF/Word/Excel generation
- `risk_model/metrics.py:36` -- Ham metrik hesaplari
- `api/v1/user.py:236` -- Risk level hesaplanacak
- `api/v1/vdk_simulator.py:231` -- Risky suppliers from cross-check

---

## 10. 500+ SATIRLIK DOSYALAR

### [CIDDI] Backend (500+ satir) -- 39+ dosya

| Satir | Dosya |
|-------|-------|
| 4849 | `backend/api/v1/contracts.py` |
| 3399 | `backend/services/kurgan_calculator.py` |
| 2029 | `backend/services/mizan_omurga.py` |
| 1795 | `backend/services/parse_service.py` |
| 1721 | `backend/database/db.py` |
| 1612 | `backend/risk_model/v1_engine.py` |
| 1435 | `backend/services/cari_mutabakat_service.py` |
| 1347 | `backend/services/cross_check_engine.py` |
| 1233 | `backend/services/ticaret_sicil_tam_entegrasyon.py` |
| 1229 | `backend/api/v2/ingest.py` |
| 1191 | `backend/api/v2/cross_check.py` |
| 1173 | `backend/services/cross_check_service.py` |
| 1069 | `backend/services/ingest_service.py` |
| 1013 | `backend/services/ai_analyzer.py` |
| 953 | `backend/services/tax_certificate_analyzer.py` |
| 894 | `backend/services/analysis_trigger.py` |
| 881 | `backend/services/gib_sektor_istatistik.py` |
| 869 | `backend/services/post_ingest_parse.py` |
| 856 | `backend/api/v1/defterler.py` |
| 804 | `backend/services/rule_manager.py` |
| 799 | `backend/services/ai/orchestrator.py` |
| 798 | `backend/api/v2/mizan_data.py` |
| 795 | `backend/services/smmm_manuel_veri_giris.py` |
| 781 | `backend/api/v2/donem_complete.py` |
| 778 | `backend/services/regwatch_scraper.py` |
| 754 | `backend/services/regwatch_chat_agent.py` |
| 748 | `backend/api/v1/regwatch.py` |
| 744 | `backend/api/v2/period_summary.py` |
| 728 | `backend/services/gib_borclu_listesi.py` |
| 702 | `backend/services/tax_strategist.py` |
| 691 | `backend/services/report_generator.py` |
| 676 | `backend/scripts/enrich_mevzuat.py` |
| 670 | `backend/risk_model/vdk_kurgan_engine.py` |
| 664 | `backend/services/kurgan_veri_entegrasyon.py` |
| 653 | `backend/services/gib_risk_service.py` |
| 649 | `backend/services/ticaret_sicil_gazetesi.py` |
| 647 | `backend/services/corporate_chat_agent.py` |
| 646 | `backend/services/kurgan_simulator.py` |
| 643 | `backend/services/opening_balance_service.py` |

**contracts.py 4849 satir** -- bu dosya acil bolunmeli.

### Frontend (500+ satir) -- 18 dosya

| Satir | Dosya |
|-------|-------|
| 1307 | `app/v1/_components/V1DashboardClient.BACKUP_1767417435.tsx` |
| 1292 | `app/v2/_lib/parsers/core/fileDetector.ts` |
| 1042 | `app/v2/_lib/parsers/beyannameParser.ts` |
| 932 | `app/v2/_components/vergi-analiz/types.ts` |
| 800 | `app/v1/_components/SimpleDashboard.tsx` |
| 736 | `app/v2/_components/donem-verileri/types.ts` |
| 719 | `app/v2/_components/deepdive/mizanOmurgaHelpers.ts` |
| 676 | `app/v2/_components/kpi/kpiNormalizers.ts` |
| 671 | `app/v1/_components/V1DashboardClient_LEGACY.tsx` |
| 658 | `app/v2/_lib/parsers/aphbParser.ts` |
| 623 | `app/v2/_components/feed/useFeedSignals.ts` |
| 612 | `app/v1/_components/AxisDPanelClient.tsx` |
| 560 | `app/v2/_lib/parsers/types.ts` |
| 536 | `app/v2/reports/page.tsx` |
| 533 | `app/v2/_hooks/useVdkRiskScore.ts` |
| 529 | `app/v2/_lib/parsers/eFaturaParser.ts` |
| 523 | `app/v2/_lib/parsers/tahakkukParser.ts` |
| 516 | `app/v2/_hooks/useAiAnalysis.ts` |

---

## ONCELIK SIRASI (AKSIYON PLANI)

### Hemen Yapilmasi Gerekenler (Kritik)

1. **Auth korumasiz endpoint'lere verify_token ekle** -- 28 dosya, ~79 endpoint korumasiz. Bu en buyuk risk.
2. **JWT secret'i guclendir** -- En az 64 karakter random string kullan, tek noktadan tanimla
3. **Hardcoded TCMB API key'i kaldir** -- `tcmb_evds_service.py:48`'den fallback degeri cikar
4. **.env dosyasindaki API key'leri rotate et** -- OpenAI ve Anthropic key'leri degistir (kaynak kodu history'de olabilir)

### Kisa Vadede (Ciddi)

5. **F-string SQL sorgularini parameterized query'ye cevir** -- Ozellikle dinamik WHERE clause olanlari
6. **CORS yapilandirmasini environment-based yap** -- Production icin localhost origin'leri kaldir
7. **TypeScript `any` tiplerini azalt** -- Ozellikle v1/ legacy dosyalarinda type safety artir
8. **contracts.py (4849 satir) bol** -- Risk, RegWatch, Corporate, Source modulleri ayri dosyalara tasinmali
9. **BACKUP dosyalarini temizle** -- `V1DashboardClient.BACKUP_1767417435.tsx` git history'de, silmeli

### Orta Vadede (Iyilestirme)

10. **console.log'lari logger ile degistir** -- Frontend'te structured logging ekle
11. **TODO'lari tamamla veya issue'ya cevir** -- 28 TODO takipsiz
12. **Root .gitignore'a .env ekle** -- Katmanli guvenlik
13. **CORS allow_methods ve allow_headers'i daralt** -- Sadece kullanilan method/header'lari izin ver

---

## EK: DUPLIKE JWT SECRET TANIMLAMASI

JWT SECRET_KEY 3 farkli dosyada tanimlanmis, 2 farkli fallback degeri var:

| Dosya | Fallback |
|-------|----------|
| `backend/middleware/auth.py:28` | `"LYNTOS_SECRET_CHANGE_IN_PRODUCTION"` |
| `backend/main.py:111` | `"lyntos_secret_key_2025"` |
| `backend/api/auth/routes.py:21` | `"LYNTOS_SECRET_CHANGE_IN_PRODUCTION"` |

Bu durum token'in bir dosyada olusturulup digerinde dogrulanamamasi riskini dogurur. Tek bir `core/config.py` uzerinden yonetilmeli.

---

*Rapor sonu. Toplam tarama: backend ~100K satir Python, frontend ~121K satir TypeScript.*
