# Rapor 9: Stabilite & Hata Dayanıklılığı

**Tarih:** 2026-02-09
**Denetçi:** Claude Code Session 4
**Kapsam:** Bare except, transaction yönetimi, ErrorBoundary, input validation, test kapsamı, edge case'ler, logging, graceful degradation

---

## ÖZET

| Seviye | Sayı |
|--------|------|
| KRİTİK | 5 |
| CİDDİ | 8 |
| İYİLEŞTİRME | 5 |
| **TOPLAM** | **18** |

---

## 1. Bare Except & Hata Yutma

### Bulgu 1.1: 19 Adet Bare `except:` (Proje Kodunda) (KRİTİK)
- **Dosyalar ve satırlar:**
  - `backend/services/kurgan_calculator.py:3173, 3208`
  - `backend/services/gib_sektor_istatistik.py:373`
  - `backend/services/feed/service.py:242`
  - `backend/api/v2/opening_balance.py:150`
  - `backend/services/vergi_odeme_takip.py:203, 328`
  - `backend/services/ai/agents/masterchef.py:477`
  - `backend/api/v2/banka_mutabakat.py:61`
  - `backend/services/data_enrichment.py:114`
  - `backend/beyanname_tahakkuk_analyze.py:20`
  - `backend/services/ingest_service.py:961`
  - `backend/beyanname_tahakkuk_banka.py:19, 43`
  - `backend/mizan_converter.py:36`
  - `backend/mizan_beyanname_analiz.py:70`
  - `backend/scripts/sistem_durum_raporu.py:38`
  - `backend/scripts/cleanup_orphan_data.py:94`
  - `backend/utils/audit.py:113`
- **Açıklama:** Bare `except:` tüm hataları (KeyboardInterrupt, SystemExit dahil) yutar. Hata mesajı loglanmaz, debug imkansız. Özellikle `ingest_service.py:961` kritik — dosya yükleme sırasındaki hatalar sessizce geçiliyor.
- **Etki:** Production'da hatalar görünmez olur. Müşteri verisi bozulsa bile hata raporlanmaz.

### Bulgu 1.2: Geniş `except Exception` Blokları (CİDDİ)
- **Açıklama:** Bare except dışında ~200+ adet `except Exception` bloğu var. Bunların çoğu hatayı logluyor ama bazıları sadece `pass` veya `continue` ile geçiyor.
- **Öne çıkan örnekler:**
  - `ingest_service.py:473` — `except Exception: pass` (dosya okuma hatası sessiz)
  - `parsers/berat_parser.py:29` — `except Exception: return {}` (parse hatası boş dict)
  - `radar_engine.py:25` — `except Exception: return 0.0` (risk skoru hatalıysa 0 dön)
- **Etki:** Risk hesaplaması hatalıysa 0.0 döner — SMMM yanlış "risksiz" bilgisi alır.

---

## 2. Transaction Yönetimi

### Bulgu 2.1: commit Var Ama rollback Eksik (CİDDİ)
- **Açıklama:** 40+ yerde `conn.commit()` var ama sadece 11 yerde `conn.rollback()` var (proje kodu, venv hariç).
- **rollback bulunan dosyalar:** `ticaret_sicil_tam_entegrasyon.py`, `ingest_service.py`, `smmm_manuel_veri_giris.py`, `post_ingest_parse.py`, `tenants.py`, `donem_complete.py`, `ingest.py` ve bazı script'ler.
- **rollback OLMAYAN ama commit yapan dosyalar:**
  - `regwatch_rss_parser.py` — commit var, rollback yok
  - `efatura_kayitli_sorgulama.py` — commit var, rollback yok
  - `opening_balance_service.py` — 4 commit, rollback yok
  - `rule_manager.py` — 7 commit, rollback yok
  - `quarterly_file_manager.py` — 3 commit, rollback yok
  - `regwatch_chat_agent.py` — 2 commit, rollback yok
  - `gib_sektor_istatistik.py` — 2 commit, rollback yok
  - `notification_service.py` — 7 commit, rollback yok
  - `feed/service.py` — 2 commit, rollback yok
  - `mevzuat_bridge.py` — 1 commit, rollback yok
- **Etki:** Hata durumunda yarı tamamlanmış veri DB'de kalır. Özellikle `opening_balance_service` çok riskli — açılış bakiyeleri yarım yazılabilir.

### Bulgu 2.2: Context Manager Kullanılmıyor (CİDDİ)
- **Açıklama:** `get_connection()` raw connection döner. `with conn:` veya SQLAlchemy session gibi otomatik commit/rollback mekanizması yok. Her endpoint kendi commit/rollback'ini yönetmek zorunda.
- **Etki:** Geliştirici commit/rollback unutursa veri tutarsızlığı kaçınılmaz.

---

## 3. ErrorBoundary (Frontend)

### Bulgu 3.1: React Error Boundary Yok (KRİTİK)
- **Dosya:** `lyntos-ui/` — tüm proje tarandı
- **Açıklama:** Projede hiçbir yerde `ErrorBoundary`, `error.boundary`, `componentDidCatch` veya `getDerivedStateFromError` kullanılmıyor. Next.js 15'in `error.tsx` dosyası da bulunamadı.
- **Etki:** Herhangi bir React component'te unhandled error olursa **tüm uygulama beyaz ekran** gösterir. SMMM iş akışı ortasında uygulama crash'lenir, kaydedilmemiş veri kaybolur.

---

## 4. Input Validation

### Bulgu 4.1: Pydantic Kullanımı Var Ama Tutarsız (CİDDİ)
- **Dosya:** `backend/api/v2/` — 29 dosyada 202 adet BaseModel/Field kullanımı
- **Açıklama:** v2 API'de Pydantic modelleri aktif kullanılıyor (cross_check, periods, donem_complete, rules, tax_parameters vb.). Ancak:
  - v1 API'de neredeyse hiç Pydantic yok — raw dict kullanılıyor
  - Bazı v2 endpoint'lerde de Pydantic skip edilmiş (direkt Form/Query param)
- **Etki:** v1 API'deki endpoint'ler invalid input ile çağrılabilir.

### Bulgu 4.2: Dosya Upload Boyut Limiti 10MB (OLUMLU ama yetersiz kontrol)
- **Dosya:** `backend/config/storage.py:28`
- **Açıklama:** `MAX_FILE_SIZE = 10 * 1024 * 1024` (10MB) tanımlı ve `validate_file()` fonksiyonu var. Ancak bu kontrol yalnızca belirli yerlerde çağrılıyor — tüm upload endpoint'lerinde değil.

---

## 5. Test Kapsamı

### Bulgu 5.1: Backend Test Kapsamı Yetersiz (KRİTİK)
- **Dosya:** `backend/tests/` — 14 test dosyası, toplam 4653 satır
- **Test dosyaları:**
  - `test_cross_check_algorithm.py` — 444 satır
  - `test_full_pipeline.py` — 419 satır
  - `test_api_integration.py` — 379 satır
  - `test_cross_check.py` — 386 satır
  - `test_schemas.py` — 574 satır
  - `test_services_coverage.py` — 383 satır
  - `test_brief.py` — 351 satır
  - `test_evidence_bundle.py` — 215 satır
  - `test_dossier.py` — 375 satır
  - `test_feed.py` — 276 satır
  - `test_data_ingestion.py` — 267 satır
  - `test_mizan_sync.py` — 249 satır
  - `test_cross_check_integration.py` — 189 satır
  - `test_ai_orchestrator.py` — 146 satır
- **Açıklama:** 14 test dosyası / ~88 servis+router dosyası = **%16 kapsam**. Kritik alanlar test edilmiyor:
  - Auth/JWT sistemi — test yok
  - Ingest pipeline (dosya yükleme) — sadece 1 test dosyası
  - Cascade delete — test yok
  - SMMM izolasyonu — test yok
  - Risk hesaplama (kurgan_calculator 3399 satır) — test yok
  - VDK engine — test yok
  - Pagination — test yok
- **Etki:** Refactoring güvenli yapılamaz. Regresyon riski çok yüksek.

### Bulgu 5.2: Frontend Test Kapsamı Çok Düşük (KRİTİK)
- **Dosyalar:**
  - `lyntos-ui/__tests__/unit/docTypes.test.ts`
  - `lyntos-ui/__tests__/unit/mizanSync.test.ts`
  - `lyntos-ui/__tests__/unit/docStatusHelper.test.ts`
  - `lyntos-ui/e2e/critical-paths.spec.ts` (Playwright e2e)
- **Açıklama:** 51 sayfa, 284 component, 57 lib, 14 hook için sadece **3 unit test + 1 e2e test**. Kapsam oranı %1'in altında.
- **Etki:** Frontend değişiklikleri tamamen elle test ediliyor. Regression kaçınılmaz.

---

## 6. Edge Case'ler

### Bulgu 6.1: Boş Dosya Upload (CİDDİ)
- **Dosya:** `backend/services/ingest_service.py`, `backend/config/storage.py`
- **Açıklama:** `validate_file()` dosya boyutunu kontrol ediyor ama `file_size == 0` kontrolü eksik. Boş dosya yüklendiğinde parse fonksiyonları beklenmeyen davranış gösterebilir.

### Bulgu 6.2: Concurrent Upload Koruması Yok (CİDDİ)
- **Dosya:** `backend/api/v2/ingest.py`
- **Açıklama:** Aynı müşteri/dönem için eşzamanlı upload yapılırsa SHA256 dedup race condition'a açık. İki aynı dosya aynı anda yüklenirse ikisi de geçebilir.
- **Etki:** Duplicate veri oluşabilir.

### Bulgu 6.3: AI Servis Fail Fallback (CİDDİ)
- **Dosya:** `backend/services/ai_analyzer.py`, `backend/services/ai/orchestrator.py`
- **Açıklama:** AI servisleri (Anthropic/OpenAI) fail ederse genel except ile yakalanıyor ama kullanıcıya anlamlı fallback sunulmuyor. Timeout değerleri belirtilmemiş.
- **Etki:** AI analiz başarısız olursa SMMM boş veya hatalı sonuç alır, neden hata aldığını bilemez.

---

## 7. Logging

### Bulgu 7.1: Logging Yaygın Ama Yapılandırılmamış (İYİLEŞTİRME)
- **Açıklama:** 30+ dosyada ~197 logging çağrısı var. `logger.info/warning/error` kullanılıyor. Ancak:
  - Merkezi log konfigürasyonu yok (her dosya kendi logger'ını oluşturuyor)
  - Structured logging (JSON format) yok
  - Log rotation/retention politikası yok
  - Request ID / correlation ID yok — distributed tracing imkansız
- **Etki:** Production'da hata takibi çok zor. Hangi SMMM'nin hangi isteğinde hata olduğu bilinemez.

### Bulgu 7.2: Hassas Veri Loglanıyor Olabilir (İYİLEŞTİRME)
- **Açıklama:** Log mesajlarında VKN, dosya adları, müşteri bilgileri loglanıyor olabilir. PII maskeleme yok.
- **Etki:** Log dosyaları KVKK/GDPR ihlali oluşturabilir.

---

## 8. Graceful Degradation

### Bulgu 8.1: Backend Startup Hatası = Tam Çökme (İYİLEŞTİRME)
- **Dosya:** `backend/database/db.py`
- **Açıklama:** DB bağlantısı veya tablo oluşturma başarısız olursa uygulama tamamen başlamaz. Health check endpoint yok.
- **Etki:** Migration hatası tüm uygulamayı durdurur.

### Bulgu 8.2: Tek Servis Hatası Cascade Yayılır (İYİLEŞTİRME)
- **Açıklama:** Dashboard yüklenirken 10+ API çağrısı yapılıyor. Bir tanesi fail ederse diğerleri de durabilir (client-side). Circuit breaker pattern yok.
- **Etki:** Tek bir servis problemi tüm dashboard'u etkiler.

### Bulgu 8.3: Rate Limiting Yok (İYİLEŞTİRME)
- **Dosya:** `backend/main.py`
- **Açıklama:** FastAPI uygulamasında rate limiting middleware yok. Tüm endpoint'ler sınırsız çağrılabilir.
- **Etki:** DDoS veya API abuse ile sistem durdurulabilir.

---

## ÖNCELİKLİ AKSİYON PLANI

### Faz 1 — Hemen (Bu Hafta)
1. **Tüm bare `except:` → `except Exception as e:` + logging** — 19 lokasyon
2. **React Error Boundary ekle** — En azından root layout'a `error.tsx` ve `global-error.tsx`
3. **Kritik rollback'ler ekle** — opening_balance_service, rule_manager, notification_service
4. **Boş dosya upload kontrolü** — `file_size == 0` check'i

### Faz 2 — 1 Hafta
5. **Auth/SMMM izolasyonu testleri yaz** — En kritik güvenlik alanı
6. **Ingest pipeline edge case testleri** — Boş dosya, büyük dosya, duplicate, concurrent
7. **AI fallback mekanizması** — Timeout + retry + kullanıcıya bildirim
8. **Transaction context manager** — `with get_connection() as conn:` pattern'i

### Faz 3 — 1 Ay
9. **Test kapsamını %50'ye çıkar** — Öncelik: auth, ingest, cascade delete, risk hesaplama
10. **Structured logging** — JSON format, request ID, PII maskeleme
11. **Rate limiting middleware** — slowapi veya custom
12. **Health check endpoint** — `/health` ile DB + servis durumu kontrolü
13. **Circuit breaker** — Frontend'de fail eden servisleri izole et
