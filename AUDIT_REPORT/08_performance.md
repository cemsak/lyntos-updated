# Rapor 8: Performans Denetimi

**Tarih:** 2026-02-09
**Denetçi:** Claude Code Session 4
**Kapsam:** DB index, N+1 query, bundle boyutu, cache, SQLite WAL, büyük dosyalar, frontend re-render, pagination

---

## ÖZET

| Seviye | Sayı |
|--------|------|
| KRİTİK | 4 |
| CİDDİ | 7 |
| İYİLEŞTİRME | 6 |
| **TOPLAM** | **17** |

---

## 1. SQLite WAL Modu & Pragma Eksiklikleri

### Bulgu 1.1: WAL Modu Aktif Değil (KRİTİK)
- **Dosya:** `backend/database/db.py`
- **Açıklama:** Tüm dosya tarandı — `PRAGMA journal_mode=WAL` komutu hiçbir yerde çağrılmıyor. SQLite varsayılan `DELETE` journal modunda çalışıyor.
- **Etki:** Concurrent okuma/yazma performansı ciddi şekilde düşük. Birden fazla SMMM aynı anda veri yüklediğinde DB lock'lanma riski. WAL modunda okuma ve yazma paralel çalışabilir.
- **Önceki doğrulama:** Session 1'de K5 olarak raporlanmış, hâlâ düzeltilmemiş.

### Bulgu 1.2: DB Boyut Limiti Yok (KRİTİK)
- **Dosya:** `backend/database/db.py`
- **Açıklama:** SQLite dosya boyutunu kontrol eden herhangi bir mekanizma yok. `PRAGMA max_page_count` veya disk alanı kontrolü yapılmıyor.
- **Etki:** Sınırsız dosya yükleme ile disk doldurulabilir, tüm sistem çöker.

### Bulgu 1.3: Foreign Keys Sadece clean_reset.py'de (İYİLEŞTİRME)
- **Dosya:** `backend/scripts/clean_reset.py:116`
- **Açıklama:** `PRAGMA foreign_keys = OFF/ON` sadece temizlik scriptinde kullanılıyor. Ana uygulama açılışında `PRAGMA foreign_keys = ON` çağrılmıyor.
- **Etki:** Referans bütünlüğü korunmuyor, orphan kayıtlar oluşabilir.

---

## 2. DB Index Eksiklikleri

### Bulgu 2.1: Temel Tablolarda Index Mevcut (OLUMLU)
- **Dosya:** `backend/database/db.py:107-282`
- **Açıklama:** Ana tablolarda (clients, periods, audit_log, mizan_entries, kdv_beyanname_data, banka_bakiye_data, tahakkuk_data, regwatch_events, tax_parameters) composite ve tekil index'ler oluşturulmuş.

### Bulgu 2.2: Sık Sorgulanan Tablolarda Index Eksik (CİDDİ)
- **Dosya:** `backend/database/db.py`
- **Açıklama:** Aşağıdaki tablolarda sık sorgulanan kolonlarda index yok:
  - `uploaded_files` — `client_id`, `period_code`, `sha256_hash` üzerinde index yok (dedup sorgusu yavaş)
  - `upload_sessions` — `client_id`, `smmm_id` üzerinde index yok
  - `journal_entries` — `client_id + period_id` composite index yok (yevmiye sayfası yavaş)
  - `ledger_entries` — `client_id + period_id` composite index yok (kebir sayfası yavaş)
  - `edefter_entries` — `client_id + period_id` composite index yok
  - `bank_transactions` — `client_id + period_id` composite index yok
  - `beyanname_entries` — `client_id + period_id` composite index yok
  - `feed_items` — `client_id` üzerinde index yok
  - `rule_execution_log` — `client_id`, `period_id` üzerinde index yok
- **Etki:** 66 tablonun çoğunda `WHERE client_id = ? AND period_id = ?` sorgusu full table scan yapıyor. Veri büyüdükçe performans lineer düşer. evidence_bundle.py tek endpoint'te 14 ayrı COUNT(*) sorgusu yapıyor — hepsi index'siz.

---

## 3. N+1 Query & Çoklu Sorgu Problemleri

### Bulgu 3.1: evidence_bundle.py — 14 Ardışık SELECT (CİDDİ)
- **Dosya:** `backend/api/v2/evidence_bundle.py:87-240`
- **Açıklama:** Tek bir API isteğinde 14 ayrı `SELECT COUNT(*)` sorgusu ardışık çalıştırılıyor (mizan, journal, ledger, kdv, beyanname, tahakkuk, edefter, efatura, bank, banka_bakiye vb.). Her biri ayrı cursor execute.
- **Etki:** 14 DB round-trip. Bunlar tek bir CTE veya UNION ALL sorgusuyla birleştirilebilir.

### Bulgu 3.2: period_summary.py — 5 Ardışık COUNT Sorgusu (CİDDİ)
- **Dosya:** `backend/api/v2/period_summary.py:438-466`
- **Açıklama:** bank_transactions, edefter_entries (3 farklı COUNT), mizan_entries için ardışık sorgular.

### Bulgu 3.3: periods.py — Her Period İçin Sub-SELECT (CİDDİ)
- **Dosya:** `backend/api/v2/periods.py:184-237`
- **Açıklama:** Period listesi dönerken her period için ayrı `SELECT COUNT(*) FROM document_uploads` alt sorgusu. Period sayısı arttıkça lineer yavaşlama.

### Bulgu 3.4: cross_check.py — sqlite_master + Dinamik Tablo Sorguları (İYİLEŞTİRME)
- **Dosya:** `backend/api/v2/cross_check.py:130-157`
- **Açıklama:** Önce `sqlite_master`'dan tablo varlığını kontrol edip sonra her tablo için ayrı COUNT yapıyor.

---

## 4. Pagination Analizi

### Bulgu 4.1: Bazı Endpoint'lerde Pagination Var (OLUMLU)
- **Dosya:** `backend/api/v2/yevmiye.py:49`, `banka.py:140`, `edefter_rapor.py:131`, `mevzuat_search.py:42`
- **Açıklama:** yevmiye, banka, edefter ve mevzuat endpoint'lerinde `page/page_size/offset/limit` parametreleri var.

### Bulgu 4.2: Kritik Endpoint'lerde Pagination Yok (CİDDİ)
- **Dosya:** `backend/api/v2/mizan_data.py`, `evidence_bundle.py`, `cross_check.py`, `period_summary.py`
- **Açıklama:** Mizan tüm hesapları tek seferde döner (`donem_complete.py:482` — `limit_accounts=500` ama varsayılan çok yüksek). Evidence bundle, cross-check, period summary pagination'sız çalışıyor.
- **Etki:** Büyük veri setlerinde response payload MB'larca olabilir.

### Bulgu 4.3: v1 API'de Pagination Hiç Yok (CİDDİ)
- **Dosya:** `backend/api/v1/defterler.py` (20 SELECT sorgusu), `registry.py` (11 SELECT), `beyannameler.py` (12 SELECT)
- **Açıklama:** v1 API'nin tamamında LIMIT/OFFSET kullanılmıyor. Tüm veri tek seferde dönüyor.

---

## 5. Bundle Boyutu & Frontend Bağımlılıkları

### Bulgu 5.1: Ağır Bağımlılık Seti (CİDDİ)
- **Dosya:** `lyntos-ui/package.json`
- **Açıklama:** Büyük kütüphaneler:
  - `@mui/material` + `@mui/icons-material` + `@emotion/*` — MUI tam paket (~300KB gzipped)
  - `ag-grid-community` + `ag-grid-react` — AG Grid (~200KB gzipped)
  - `recharts` — Chart kütüphanesi (~50KB)
  - `pdfjs-dist` — PDF parser (~400KB)
  - `xlsx` — Excel parser (~100KB)
  - `jspdf` + `jspdf-autotable` + `html2canvas` — PDF export (~150KB)
  - `react-force-graph-2d` — Graph görselleştirme
  - Radix UI bileşenleri (6 adet) + Tailwind + MUI birlikte → UI framework karmaşası
- **Etki:** İlk yükleme süresi çok yüksek. MUI + Radix + Tailwind üçlü kullanım gereksiz overhead.

### Bulgu 5.2: Dynamic Import Çok Az (İYİLEŞTİRME)
- **Dosya:** `lyntos-ui/app/v2/_components/upload/fileClassifier.ts:104`, `lyntos-ui/app/v2/_lib/parsers/pdf/pdfUtils.ts:21`
- **Açıklama:** Tüm projede sadece 2 yerde dynamic import var (`xlsx` ve `pdfjs-dist`). pdfjs-dist (~400KB) ve diğer ağır kütüphaneler (ag-grid, recharts, jspdf, html2canvas, react-force-graph-2d) statik import ile yükleniyor.
- **Etki:** Her sayfa yüklendiğinde kullanılmayan kütüphaneler de bundle'a dahil.

---

## 6. Cache Stratejisi

### Bulgu 6.1: Backend Cache Sadece Harici Servislerde (İYİLEŞTİRME)
- **Dosya:** `backend/services/gib_risk_service.py:114`, `efatura_kayitli_sorgulama.py:80`, `tcmb_evds_service.py:138`
- **Açıklama:** In-memory cache sadece GİB risk, e-fatura ve TCMB EVDS servislerinde var. Ana iş mantığında (mizan, cross-check, evidence bundle, VDK analiz) hiç cache yok. Redis veya merkezi cache altyapısı kullanılmıyor.
- **Etki:** Aynı müşterinin aynı dönem verisi her istekte yeniden sorgulanıyor. Dashboard yüklendiğinde 10+ ardışık API çağrısı yapılıyor, hepsi DB'yi tekrar tekrar sorguluyor.

### Bulgu 6.2: Frontend TanStack Query Var (OLUMLU)
- **Dosya:** `lyntos-ui/package.json:34`
- **Açıklama:** `@tanstack/react-query` kullanılıyor — client-side cache mevcudu.

---

## 7. Büyük Dosyalar (Bakım Maliyeti)

### Bulgu 7.1: contracts.py — 4849 Satır (KRİTİK)
- **Dosya:** `backend/api/v1/contracts.py` — 4849 satır
- **Açıklama:** Tek bir dosyada 4849 satır. Onlarca endpoint ve iş mantığı iç içe. Bakım, test ve refactor imkansız.
- **Etki:** Herhangi bir değişiklik tüm dosyayı etkileyebilir. Code review zorlaşır, bug riski artar.

### Bulgu 7.2: 1000+ Satırlık 12 Dosya (KRİTİK)
- **Açıklama:** En büyük proje dosyaları (venv hariç):
  1. `api/v1/contracts.py` — 4849 satır
  2. `services/kurgan_calculator.py` — 3399 satır
  3. `services/mizan_omurga.py` — 2029 satır
  4. `services/parse_service.py` — 1795 satır
  5. `database/db.py` — 1721 satır
  6. `risk_model/v1_engine.py` — 1612 satır
  7. `services/cari_mutabakat_service.py` — 1435 satır
  8. `services/cross_check_engine.py` — 1347 satır
  9. `services/ticaret_sicil_tam_entegrasyon.py` — 1233 satır
  10. `api/v2/ingest.py` — 1229 satır
  11. `api/v2/cross_check.py` — 1191 satır
  12. `services/cross_check_service.py` — 1173 satır
- **Etki:** 12 dosyanın toplam boyutu ~25.000 satır. Bakım maliyeti çok yüksek.

---

## 8. Frontend Re-render Riski

### Bulgu 8.1: useMemo/useCallback Kullanımı Yaygın (OLUMLU)
- **Açıklama:** 118 dosyada toplam 448 kullanım tespit edildi. Temel optimizasyon mevcut.

### Bulgu 8.2: 3 UI Framework Birlikte Kullanımı (İYİLEŞTİRME)
- **Dosya:** `lyntos-ui/package.json`
- **Açıklama:** MUI (@mui/material), Radix UI (6 component), ve Tailwind CSS birlikte kullanılıyor. Her birinin farklı styling sistemi var (Emotion CSS-in-JS, Tailwind utility classes, Radix inline styles).
- **Etki:** Bundle boyutu gereksiz şişer, tutarsız UI davranışı, geliştirici karışıklığı.

### Bulgu 8.3: React 18.3 + Next.js 15 (İYİLEŞTİRME)
- **Dosya:** `lyntos-ui/package.json:55`
- **Açıklama:** React 18 kullanılıyor ama Next.js 15 React 19 ile uyumlu. `useOptimistic`, `useFormStatus` gibi yeni API'ler kullanılamıyor.

---

## ÖNCELİKLİ AKSİYON PLANI

### Faz 1 — Hemen (Bu Hafta)
1. **SQLite WAL modunu aktifle** — `db.py` açılışında `PRAGMA journal_mode=WAL` ekle (1 satır, büyük etki)
2. **Kritik tablolara index ekle** — `uploaded_files`, `journal_entries`, `ledger_entries`, `edefter_entries`, `bank_transactions`, `beyanname_entries`, `feed_items`, `rule_execution_log` için `client_id + period_id` composite index
3. **DB boyut limiti** — `PRAGMA max_page_count` ile makul limit koy
4. **PRAGMA foreign_keys = ON** — `get_connection()` içine ekle

### Faz 2 — 1 Hafta
5. **evidence_bundle.py sorgularını birleştir** — 14 ardışık SELECT'i tek CTE/UNION ile çöz
6. **v1 API'ye pagination ekle** — defterler.py, beyannameler.py, registry.py
7. **Ağır kütüphaneleri dynamic import'a çevir** — ag-grid, recharts, jspdf, html2canvas, react-force-graph-2d

### Faz 3 — 1 Ay
8. **Backend response cache** — Sık değişmeyen veriler için TTL bazlı in-memory cache (mizan özet, cross-check sonuç)
9. **contracts.py parçala** — 4849 satırı mantıksal modüllere ayır
10. **UI framework tekleştir** — MUI veya Radix+Tailwind seç, diğerini kaldır
11. **React 19'a geçiş** — Next.js 15 uyumlu React 19 ile Server Components avantajı
