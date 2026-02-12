# LYNTOS Backend Structure Audit Report

**Tarih:** 2026-02-09
**Branch:** `refactor/backend-upload`
**Backend:** Python 3.12, FastAPI, SQLite
**Dizin:** `/Users/cemsak/lyntos/backend/`

---

## 1. main.py Router Haritasi

main.py toplam **55 router** kaydi iceriyor. Bunlarin dagilimi:

### v1 Router'lar (20 adet)
| Router | Prefix | Tag |
|--------|--------|-----|
| contracts | `/api/v1` | - |
| evidence | `/api/v1` | Evidence |
| regwatch | `/api/v1` | RegWatch |
| audit | `/api/v1` | Audit |
| documents | `/api/v1/documents` | Documents |
| tenants | `/api/v1` | Tenants |
| tax_certificate | `/api/v1` | TaxCertificate |
| vdk_simulator | `/api/v1` | VDKSimulator |
| vdk_inspector | `/api/v1` | VDKInspector |
| inspector_prep | (no prefix) | InspectorPrep |
| document_upload | (no prefix) | DocumentUpload |
| tax_strategist | `/api/v1` | VERGUS |
| corporate | `/api/v1` | Corporate |
| registry | `/api/v1` | Registry |
| ai | `/api/v1` | AI |
| notifications | `/api/v1` | Notifications |
| chat | `/api/v1` | Chat |
| user | `/api/v1` | User |
| defterler | `/api/v1` | Defterler |
| beyannameler | `/api/v1` | Beyannameler |

### v2 Router'lar (33 adet)
| Router | Prefix | Aciklama |
|--------|--------|----------|
| validate_vdk | (in-router) | VDK Dogrulama |
| donem_sync | (in-router) | Donem Senkronizasyon |
| mizan_sync | (in-router) | Mizan Sync |
| cross_check | (in-router) | Cross-Check Engine |
| feed | `/api/v2` | Kokpit Feed |
| evidence_bundle | `/api/v2` | Kanit Paketi |
| brief | `/api/v2` | Risk Brief |
| dossier | `/api/v2` | Dosya Paketi |
| periods | `/api/v2` | Donem Yonetimi |
| bulk_upload | `/api/v2` | Toplu Yukleme |
| mizan_data | (in-router) | Mizan Veri |
| donem_complete | (in-router) | Donem Tam Veri |
| upload | (in-router) | ZIP Upload |
| period_summary | (in-router) | Donem Ozet |
| yevmiye | (in-router) | Yevmiye V2 |
| kebir | (in-router) | Kebir V2 |
| banka | (in-router) | Banka V2 |
| banka_mutabakat | (in-router) | Banka Mutabakat |
| beyanname_kdv | (in-router) | KDV Beyanname |
| beyanname_muhtasar | (in-router) | Muhtasar |
| beyanname_tahakkuk | (in-router) | Tahakkuk |
| yevmiye_kebir | (in-router) | Yevmiye-Kebir Cross |
| ingest | (in-router) | Dedupe Ingest |
| defter_kontrol | (in-router) | Defter Kontrol |
| opening_balance | `/api/v2` | Acilis Bakiyesi |
| edefter_rapor | (in-router) | E-Defter Rapor |
| gib_public | `/api/v2` | GIB Public Data |
| agents | `/api/v2` | AI Agents |
| rules | `/api/v2` | Kural Kutuphanesi |
| mevzuat_search | (in-router) | Mevzuat Arama |
| yeniden_degerleme | (in-router) | Yeniden Degerleme |
| donem_sonu_islem | (in-router) | Donem Sonu Islemleri |
| cari_mutabakat | (in-router) | Cari Mutabakat |

### Auth ve Diger
| Router | Prefix |
|--------|--------|
| auth | `/api` |
| tax_parameters | `/api/v2` |
| checklists | `/api/v2` |
| reports | `/api/v2` |

### Legacy Endpoint'ler (main.py icinde tanimli)
- `GET /v1/risk_model_v1` - Risk motoru v1
- `GET /api/lyntos_dashboard` - Eski dashboard
- `GET /health` - Saglik kontrolu
- `GET/HEAD /v1/dossier/bundle` - Dossier ZIP download
- `GET /v1/scheduler/status` - RegWatch scheduler durum

---

## 2. API Dosyalari ve Endpoint Sayilari

Toplam: **~349 endpoint** (router dekorator sayisi)

### api/v1/ (20 dosya, ~157 endpoint)

| Dosya | Endpoint |
|-------|----------|
| `contracts.py` | 26 |
| `defterler.py` | 12 |
| `notifications.py` | 14 |
| `registry.py` | 17 |
| `chat.py` | 12 |
| `ai.py` | 14 |
| `corporate.py` | 8 |
| `tax_strategist.py` | 8 |
| `inspector_prep.py` | 7 |
| `tax_certificate.py` | 5 |
| `document_upload.py` | 5 |
| `documents.py` | 8 |
| `beyannameler.py` | 5 |
| `tenants.py` | 4 |
| `evidence.py` | 3 |
| `user.py` | 4 |
| `audit.py` | 2 |
| `regwatch.py` | 14 |
| `vdk_simulator.py` | 2 |
| `vdk_inspector.py` | 2 |

### api/v2/ (33 dosya, ~185 endpoint)

| Dosya | Endpoint |
|-------|----------|
| `rules.py` | 19 |
| `tax_parameters.py` | 12 |
| `gib_public.py` | 11 |
| `cari_mutabakat.py` | 10 |
| `mevzuat_search.py` | 9 |
| `defter_kontrol.py` | 9 |
| `agents.py` | 8 |
| `opening_balance.py` | 8 |
| `periods.py` | 7 |
| `period_summary.py` | 6 |
| `evidence_bundle.py` | 5 |
| `mizan_data.py` | 5 |
| `mizan_sync.py` | 4 |
| `edefter_rapor.py` | 4 |
| `ingest.py` | 4 |
| `dossier.py` | 4 |
| `feed.py` | 3 |
| `brief.py` | 3 |
| `donem_complete.py` | 3 |
| `reports.py` | 3 |
| `donem_sonu_islem.py` | 3 |
| `checklists.py` | 3 |
| `yevmiye.py` | 3 |
| `banka.py` | 3 |
| `kebir.py` | 3 |
| `donem_sync.py` | 3 |
| `beyanname_kdv.py` | 2 |
| `beyanname_muhtasar.py` | 2 |
| `beyanname_tahakkuk.py` | 2 |
| `banka_mutabakat.py` | 2 |
| `yevmiye_kebir.py` | 2 |
| `validate_vdk.py` | 2 |
| `yeniden_degerleme.py` | 2 |
| `cross_check.py` | 2 |
| `mizan_analiz.py` | 3 |
| `bulk_upload.py` | 1 |
| `upload.py` | 1 |

### api/auth/ (1 dosya, 4 endpoint)
| Dosya | Endpoint |
|-------|----------|
| `routes.py` | 4 (login, token, me, register) |

### api/controllers/ (1 dosya, 1 endpoint)
| Dosya | Endpoint |
|-------|----------|
| `kurgan_controller.py` | 1 |

### api/routes/ (eski, 1 dosya)
| Dosya | Not |
|-------|-----|
| `routes.py` | Legacy route dosyasi |

---

## 3. Services Dizini (88 dosya)

### Kok Servisler (37 dosya)
| Dosya | Alan |
|-------|------|
| `ai_alerts.py` | OpenAI ile AI uyarilari |
| `ai_analyzer.py` | AI analiz servisi |
| `ai_policies.py` | AI politika yonetimi |
| `analysis_trigger.py` | Post-ingest analiz tetikleme |
| `assistant_context.py` | AI asistan baglam yonetimi |
| `cari_mutabakat_service.py` | Cari mutabakat motoru |
| `client_resolver.py` | Mukellef cozumleme |
| `corporate_chat_agent.py` | Sirketler hukuku chat |
| `corporate_tax_calculator.py` | Kurumlar vergisi hesaplama |
| `cross_check_engine.py` | Cross-check motoru |
| `cross_check_service.py` | Cross-check servisi |
| `data_enrichment.py` | Veri zenginlestirme |
| `data_quality_service.py` | Veri kalitesi kontrolu |
| `efatura_kayitli_sorgulama.py` | E-Fatura sorgulama |
| `enflasyon_duzeltme.py` | Enflasyon duzeltmesi |
| `gib_borclu_listesi.py` | GIB borclu listesi |
| `gib_risk_service.py` | GIB risk servisi |
| `gib_sektor_istatistik.py` | GIB sektor istatistikleri |
| `ingest_service.py` | Dosya yukleeme & parse |
| `kurgan_calculator.py` | KURGAN skor hesaplama |
| `kurgan_simulator.py` | KURGAN simulatoru |
| `kurgan_veri_entegrasyon.py` | KURGAN veri entegrasyonu |
| `llm_guard.py` | LLM guvenlik katmani |
| `lyntos_assistant_agent.py` | LYNTOS asistan ajan |
| `mersis_sorgulama.py` | MERSIS sorgulama |
| `mevzuat_bridge.py` | Mevzuat koprusu |
| `mevzuat_search.py` | Mevzuat arama motoru |
| `mizan_omurga.py` | Mizan omurga servisi |
| `notification_service.py` | Bildirim servisi |
| `opening_balance_service.py` | Acilis bakiyesi servisi |
| `parse_service.py` | Dosya parse servisi |
| `pdf_generator.py` | PDF olusturma |
| `period_validator.py` | Donem dogrulama |
| `post_ingest_parse.py` | Post-ingest parse islemleri |
| `post_ingest_pipeline.py` | Post-ingest pipeline |
| `quarterly_file_manager.py` | Ceyrek dosya yonetimi |
| `quarterly_tax_calculator.py` | Gecici vergi hesaplama |

### Regwatch Servisleri (7 dosya)
| Dosya | Alan |
|-------|------|
| `regwatch_chat_agent.py` | Mevzuat chat (Claude API) |
| `regwatch_engine.py` | Mevzuat takip motoru |
| `regwatch_rss_parser.py` | RSS parser |
| `regwatch_scheduler.py` | APScheduler ile zamanlama |
| `regwatch_scraper.py` | Web scraper |
| `regwatch_service.py` | Mevzuat servisi |
| `regwatch_sources.py` | Kaynak yonetimi |

### Diger Servisler
| Dosya | Alan |
|-------|------|
| `radar_engine.py` | Risk radar motoru |
| `radar_rules.py` | Radar kurallari |
| `report_generator.py` | Rapor uretimi |
| `rule_manager.py` | Kural yonetimi |
| `shb_risk.py` | SHB risk analizi |
| `simple_cache.py` | Basit cache |
| `smmm_manuel_veri_giris.py` | Manuel veri girisi |
| `source_registry.py` | Kaynak kayit defteri |
| `tax_certificate_analyzer.py` | Vergi levhasi analizi |
| `tax_parameter_service.py` | Vergi parametreleri |
| `tax_strategist.py` | Vergi strateji motoru |
| `tcmb_evds_service.py` | TCMB EVDS entegrasyonu |
| `ticaret_sicil_gazetesi.py` | TTSG entegrasyonu |
| `ticaret_sicil_tam_entegrasyon.py` | Tam ticaret sicil |
| `trade_registry_service.py` | Ticaret sicil servisi |
| `ttsg_scraper.py` | TTSG scraper |
| `turkish_text.py` | Turkce metin islemleri |
| `vergi_odeme_takip.py` | Vergi odeme takibi |
| `yeniden_degerleme.py` | Yeniden degerleme |
| `test_kurgan.py` | KURGAN test (!) |

### services/parsers/ (3 dosya)
| Dosya | Alan |
|-------|------|
| `banka_parser.py` | Banka ekstresi parser |
| `berat_parser.py` | E-Defter berat parser |
| `mizan_parser.py` | Mizan dosyasi parser |

### services/ai/ (8 dosya) -- Detayli bkz. Bolum 8
| Dosya | Alan |
|-------|------|
| `__init__.py` | AI servis export |
| `base_provider.py` | Temel AI provider |
| `claude_provider.py` | Anthropic Claude entegrasyonu |
| `openai_provider.py` | OpenAI GPT entegrasyonu |
| `demo_provider.py` | Demo/fallback provider |
| `router.py` | Akilli AI yonlendirici |
| `orchestrator.py` | AI orkestratoru |
| `agents/` | Alt ajan sistemi (5 dosya) |

### services/ai/agents/ (5 dosya)
| Dosya | Alan |
|-------|------|
| `__init__.py` | Agent exports |
| `base_agent.py` | Temel ajan sinifi |
| `masterchef.py` | MasterChef orkestrator ajan |
| `mevzuat_takip.py` | Mevzuat takip ajani |
| `rapor.py` | Rapor ajani |
| `vdk_inspector.py` | VDK denetci ajani |

### services/feed/, evidence_bundle/, brief/, dossier/ (birer service.py)

---

## 4. Middleware (2 dosya)

### middleware/auth.py
- `verify_token()` -- JWT dogrulama (FastAPI Depends)
- `check_client_access()` -- SMMM-Mukellef erisim kontrolu
- `get_user_clients()` -- Kullanici mukellefleri
- `get_client_periods()` -- Mukellef donemleri
- **Dev Bypass:** `LYNTOS_DEV_AUTH_BYPASS=1` ile `DEV_HKOZKAN` token kabul eder
- **JWT:** `HS256` algoritma, `JWT_SECRET_KEY` env degiskeni
- **Izolasyon:** `WHERE smmm_id = ?` ile SMMM bazli veri izolasyonu

### middleware/__init__.py
- Bos init dosyasi

---

## 5. Database (database/db.py)

- **Motor:** SQLite3 (`sqlite3.Row` ile dict-like erisim)
- **Dosya:** `backend/database/lyntos.db`
- **Baglanti:** `get_connection()` context manager
- **init_database():** Import sirasinda otomatik calisir
- **seed_pilot_data():** Pilot SMMM kullanici olusturur (HKOZKAN)

### Tablo Sayisi: ~40+ tablo (db.py icinde tanimlanan)
Kategoriler:
1. **Multi-Tenant:** users, clients, periods, audit_log
2. **Muhasebe:** mizan_entries, kdv_beyanname_data, banka_bakiye_data, tahakkuk_data
3. **RegWatch:** regwatch_events, source_registry
4. **Vergi Parametre:** tax_parameters, tax_change_log, regulatory_sources
5. **Dokuman:** document_uploads, ingestion_audit_log, migration_review_queue
6. **NACE/Levha:** nace_codes, tax_certificates
7. **Denetim Hazirligi:** preparation_notes, document_preparation
8. **Sirketler Hukuku:** corporate_event_types, company_capital, corporate_events
9. **Ticaret Sicil:** company_registry, company_changes, client_portfolio, trade_registry_offices
10. **AI Analiz:** ai_analyses, parameter_update_queue
11. **Bildirim:** notifications, notification_preferences, email_queue
12. **Chat:** chat_sessions, chat_messages
13. **Muhasebe Veri:** bank_transactions, journal_entries, ledger_entries, edefter_entries, beyanname_entries, tahakkuk_entries, tahakkuk_kalemleri
14. **Feed:** feed_items
15. **Acilis Bakiye:** opening_balances, opening_balance_summary
16. **Kural Kutuphanesi:** rules, mevzuat_refs, mevzuat_refs_fts (FTS5), rule_mevzuat_link, rule_duplicates, rule_execution_log
17. **Gorev Merkezi:** tasks, task_comments, task_history, deadline_calendar
18. **Cari Mutabakat:** cari_ekstreler
19. **Checklist:** checklist_progress
20. **Raporlar:** generated_reports
21. **Ingest:** upload_sessions, uploaded_files

### Ozel Ozellikler
- FTS5 full-text search (`mevzuat_refs_fts`) trigger bazli senkronizasyon
- Soft delete (`is_deleted`, `is_active` flagleri)
- SHA256 dedupe (`content_hash_sha256`, `file_hash_sha256`)
- Time Shield sistemi (`time_shield_status`)

---

## 6. Test Dosyalari

### backend/tests/ (14 dosya)
| Dosya | Kapsam |
|-------|--------|
| `test_mizan_sync.py` | Mizan senkronizasyon |
| `test_cross_check.py` | Cross-check |
| `test_ai_orchestrator.py` | AI orkestrator |
| `test_evidence_bundle.py` | Kanit paketi |
| `test_feed.py` | Feed |
| `test_brief.py` | Brief |
| `test_dossier.py` | Dossier |
| `test_services_coverage.py` | Servis kapsami |
| `test_api_integration.py` | API entegrasyon |
| `test_schemas.py` | Sema dogrulama |
| `test_full_pipeline.py` | Tam pipeline |
| `test_data_ingestion.py` | Veri ingestion |
| `test_cross_check_integration.py` | Cross-check entegrasyon |
| `test_cross_check_algorithm.py` | Cross-check algoritma |

### Diger Test Dosyalari
- `services/test_kurgan.py` -- Yanlis yerde, services/ icinde

### Test Altyapisi
- `pytest.ini` mevcut
- `requirements-test.txt` mevcut
- `.coverage` dosyasi ve `htmlcov/` dizini mevcut (pytest-cov kullaniliyor)
- `.pytest_cache/` mevcut

**Eksiklik:** v2 API endpoint'lerinin cogu (ingest, rules, agents, mevzuat vb.) icin test YOK.

---

## 7. Requirements (requirements.txt)

### Core
| Paket | Versiyon | Kullanim |
|-------|----------|----------|
| fastapi | 0.119.0 | Web framework |
| uvicorn | 0.37.0 | ASGI server |
| pydantic | 2.12.2 | Veri validasyon |
| python-jose | 3.5.0 | JWT |
| PyJWT | 2.10.1 | JWT (ikinci!) |
| python-dotenv | 1.1.1 | Env yonetimi |
| python-multipart | 0.0.20 | Dosya upload |
| httpx | 0.28.1 | HTTP istemci |

### AI/LLM
| Paket | Versiyon |
|-------|----------|
| openai | 2.4.0 |
| (anthropic -- requirements.txt'de YOK ama kodda import ediliyor!) |

### PDF/Belge Isleme
| Paket | Kullanim |
|-------|----------|
| pdfplumber | PDF parse |
| reportlab | PDF olusturma |
| PyMuPDF >= 1.24.0 | PDF render |
| pytesseract >= 0.3.10 | OCR |
| Pillow >= 10.0.0 | Goruntu isleme |

### Veri/Scraping
| Paket | Kullanim |
|-------|----------|
| beautifulsoup4 | HTML parse |
| requests | HTTP |
| aiohttp | Async HTTP |
| feedparser | RSS parse |
| lxml | XML parse |
| openpyxl | Excel okuma |

### Diger
| Paket | Kullanim |
|-------|----------|
| pyyaml | YAML parse |
| jsonschema | JSON sema |
| apscheduler | Zamanlanmis gorevler |
| cryptography | Kriptografi |
| tqdm | Progress bar |

**UYARI:** `anthropic` paketi requirements.txt'de EKSIK ama `services/ai/claude_provider.py` ve `services/regwatch_chat_agent.py` icinde import ediliyor. try/except ile handle ediliyor ama resmi bagimlilik olarak eklenmeli.

**UYARI:** Hem `python-jose` hem `PyJWT` mevcut - duplikasyon.

---

## 8. AI/LLM Entegrasyonu

### Mimari: Multi-Provider Akilli Yonlendirme

```
AIRouter (services/ai/router.py)
  |-- ClaudeProvider  (services/ai/claude_provider.py)  -- anthropic SDK
  |-- OpenAIProvider  (services/ai/openai_provider.py)  -- openai SDK (gpt-4o)
  |-- OpenAIMiniProvider                                 -- openai SDK (gpt-4o-mini)
  |-- DemoProvider    (services/ai/demo_provider.py)     -- Fallback/demo
```

### Yonlendirme Kurallari
| Gorev | Provider |
|-------|----------|
| Hukuki Analiz (HIGH/MED) | Claude |
| Risk Aciklama (HIGH/MED) | Claude |
| Mevzuat Yorum | Claude |
| VDK Denetci | Claude |
| Chat (Corporate/RegWatch) | Claude |
| Genel | Claude |
| JSON Uretim | GPT-4o |
| Tablo/Rapor | GPT-4o |
| Brief/Kanit Paketi | GPT-4o |
| Siniflandirma | GPT-4o-mini |
| Hizli Ozet/Cevap | GPT-4o-mini |
| Ceviri | GPT-4o-mini |

### Fallback Zinciri
`Claude -> GPT-4o -> GPT-4o-mini -> Demo`

### AI Kullanan Dosyalar
| Dosya | Provider | Kullanim |
|-------|----------|----------|
| `services/ai/claude_provider.py` | Anthropic | claude-sonnet-4-20250514 |
| `services/ai/openai_provider.py` | OpenAI | gpt-4o, gpt-4o-mini |
| `services/ai_alerts.py` | OpenAI | gpt-4.1-mini (uyari ozeti) |
| `services/regwatch_chat_agent.py` | Anthropic | claude-sonnet-4-20250514 |
| `services/corporate_chat_agent.py` | (AI uzerinden) | Sirket hukuku chat |
| `services/llm_guard.py` | (guard katmani) | AI guvenlik |
| `services/ai/agents/masterchef.py` | (orkestrator) | Ajan yonetimi |
| `services/ai/agents/vdk_inspector.py` | (ajan) | VDK denetim simulasyonu |
| `services/ai/agents/mevzuat_takip.py` | (ajan) | Mevzuat takip |
| `services/ai/agents/rapor.py` | (ajan) | Rapor uretimi |
| `services/ai/orchestrator.py` | (orkestrator) | AI cagri yonetimi |
| `api/v2/agents.py` | (endpoint) | 8 AI agent endpoint |

### Env Degiskenleri
- `ANTHROPIC_API_KEY` -- Claude icin
- `OPENAI_API_KEY` -- OpenAI icin
- `OPENAI_MODEL_DEFAULT` -- Varsayilan OpenAI model

---

## Ozet Istatistikler

| Metrik | Deger |
|--------|-------|
| Toplam Router | 55 |
| Toplam Endpoint (approx) | ~349 |
| API v1 Dosya | 20 |
| API v2 Dosya | 33 |
| Servis Dosya | ~88 |
| Test Dosya | 14 |
| DB Tablo | ~40+ |
| AI Provider | 3 (Claude, GPT-4o, GPT-4o-mini) + Demo |
| Dependency | 38 paket |

### Kritik Bulgular
1. **anthropic paketi requirements.txt'de eksik** -- kodda kullaniliyor ama bagimlilik listesinde yok
2. **JWT duplikasyonu** -- hem `python-jose` hem `PyJWT` mevcut
3. **Test kapsaminda bosluk** -- 349 endpoint'e karsilik sadece 14 test dosyasi, v2 API'lerin cogu test edilmemis
4. **services/ icinde test dosyasi** -- `test_kurgan.py` yanlis konumda
5. **Bircok v2 endpoint NO AUTH** -- main.py'deki yorumlar "NO AUTH" olanlar belirtilmis
6. **Legacy v1 + modern v2 birlikte** -- refactoring devam ediyor, bazilari cift endpoint
