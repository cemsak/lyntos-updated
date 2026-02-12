# Rapor 10: Gereksiz Dosya & Kod

**Tarih:** 2026-02-09
**Denetçi:** Claude Code Session 4
**Kapsam:** Dead code, v1/v2 overlap, unused imports, contracts.py parçalanması, duplicate code, orphan dosyalar, kullanılmayan dependency, gereksiz MD dosyaları

---

## ÖZET

| Seviye | Sayı |
|--------|------|
| KRİTİK | 3 |
| CİDDİ | 6 |
| İYİLEŞTİRME | 7 |
| **TOPLAM** | **16** |

---

## 1. Dead Code — Backend Kök Dizin Orphan Script'ler

### Bulgu 1.1: 17 Orphan Python Script (KRİTİK)
- **Dosyalar:** `backend/` kök dizininde `main.py` ve `__init__.py` dışında 17 bağımsız script:
  - `upload_api.py` (39 satır) — Eski upload API, hiçbir yerden import edilmiyor
  - `kpi_service.py` (380 satır) — Standalone KPI servisi, main.py'ye bağlı değil
  - `addons.py` (181 satır) — Ek fonksiyonlar, import referansı yok
  - `mizan_converter.py` (138 satır) — Standalone converter
  - `mizan_beyanname_analiz.py` (114 satır) — Standalone analiz
  - `bank_csv_auto_converter.py` (110 satır) — CSV converter
  - `beyanname_tahakkuk_banka.py` (87 satır) — Standalone analiz
  - `beyanname_tahakkuk_analyze.py` (83 satır) — Standalone analiz
  - `auto_analyze.py` (38 satır) — Otomatik analiz script'i
  - `luca_service.py` (31 satır) — Luca entegrasyonu (stub?)
  - `banka_service.py` (28 satır) — Banka servisi (stub?)
  - `excel_to_pdf_simple.py` (17 satır) — Utility
  - `whatsapp_send.py` (14 satır) — WhatsApp entegrasyonu
  - `csv_onay_kolon_ekle.py` (12 satır) — CSV utility
  - `png_to_jpg.py` (8 satır) — Görsel converter
  - `pdf_to_png.py` (8 satır) — PDF converter
  - `csv_to_excel.py` (7 satır) — CSV converter
- **Doğrulama:** `grep` ile hiçbirinin projede import edilmediği doğrulandı.
- **Etki:** Toplam 1295 satır dead code. Karışıklık yaratır, yanlışlıkla kullanılabilir. `whatsapp_send.py` güvenlik riski — API key içerebilir.

### Bulgu 1.2: v2/upload.py ve v2/bulk_upload.py Deprecated (CİDDİ)
- **Dosyalar:**
  - `backend/api/v2/upload.py` — 46 satır
  - `backend/api/v2/bulk_upload.py` — 44 satır
- **Açıklama:** v2 ingest pipeline `ingest.py` (1229 satır) üzerinden çalışıyor. Bu iki dosya eski upload mantığının kalıntısı. Önceki raporlarda (01) "deprecated" olarak işaretlenmiş.
- **Etki:** Karışıklık — yeni geliştirici yanlış dosyayı kullanabilir.

### Bulgu 1.3: v1/document_upload.py Eski Sistem (CİDDİ)
- **Dosya:** `backend/api/v1/document_upload.py` — 415 satır
- **Açıklama:** v1 upload sistemi. v2'de `ingest.py` bunu tamamen replace etti ama dosya hâlâ active router olarak kayıtlı.
- **Etki:** İki farklı upload mekanizması paralel çalışıyor — veri tutarsızlığı riski.

---

## 2. v1 vs v2 Overlap

### Bulgu 2.1: v1 API Tümüyle Gereksiz (KRİTİK)
- **Dosya:** `backend/api/v1/` — 21 Python dosyası
- **Dosya listesi:** `regwatch.py`, `user.py`, `tax_strategist.py`, `audit.py`, `inspector_prep.py`, `vdk_simulator.py`, `tax_certificate.py`, `registry.py`, `document_upload.py`, `documents.py`, `ai.py`, `corporate.py`, `beyannameler.py`, `defterler.py`, `chat.py`, `contracts.py`, `notifications.py`, `tenants.py`, `evidence.py`, `contracts_schema_meta.py`, `vdk_inspector.py`
- **Açıklama:** v2 API tüm v1 fonksiyonlarını karşılıyor veya karşılamalı. v1 endpoint'leri auth'suz (Rapor 05'te raporlanmış), güvenlik açığı. Ancak frontend'de hâlâ v1'e referans olabilir.
- **Etki:** 21 dosya + `contracts.py` (4849 satır) = büyük bakım yükü. Auth'suz endpoint'ler güvenlik riski.

### Bulgu 2.2: Legacy Frontend Katmanları (CİDDİ)
- **Dosyalar:**
  - `lyntos-ui/app/v1/_components/` — v1 dashboard component'leri (V1DashboardClient.tsx, V1DashboardClient_LEGACY.tsx, V1DashboardClient.BACKUP_1767417435.tsx vb.)
  - `lyntos-ui/src/_legacy/` — 160KB legacy dosyalar (LyntosDashboard.tsx, FileUpload.tsx, panels/ vb.)
  - `lyntos-ui/src/components/v1/` — 68KB v1 component'ler (RiskDetailClient.tsx, R401AView.tsx, R501View.tsx, HeaderBar.tsx vb.)
- **Açıklama:** v2'den v1'e hiçbir import yok (`grep` ile doğrulandı). Tüm v1 frontend kodu orphan.
- **Etki:** 344KB gereksiz frontend kodu. Bundle'a dahil olma riski (tree-shaking'e rağmen).

---

## 3. contracts.py Analizi

### Bulgu 3.1: contracts.py 4849 Satır — Parçalanması Şart (KRİTİK)
- **Dosya:** `backend/api/v1/contracts.py` — 4849 satır
- **Açıklama:** Tek dosyada şunlar var:
  - Axis-D denetim sözleşmeleri
  - VDK risk modeli entegrasyonu
  - Mizan bazlı hesaplamalar
  - Mali oran hesaplamaları
  - Legacy yapılar (satır 3261+ — açıkça "LEGACY METODLAR" diye işaretlenmiş)
  - `contracts_schema_meta.py` ayrı dosyada ama ona bağımlı
  - Satır 1928'de `# v61: trimmed legacy dead code` notu — kısmen temizlenmiş ama yetersiz
- **Etki:** Bakım imkansız, tek değişiklik tüm dosyayı etkiler, test yazılamaz. 4849 satırlık dosyada bug bulmak çok zor.

---

## 4. Gereksiz Markdown Dosyaları

### Bulgu 4.1: Proje Kökünde 32 MD Dosyası (CİDDİ)
- **Dosya:** `/Users/cemsak/lyntos/*.md`
- **Büyüklüğe göre ilk 10:**
  1. `LYNTOS_DASHBOARD_UI_ANALYSIS.md` — 40KB
  2. `LYNTOS_ARCHITECTURE_MASTER_DOC.md` — 36KB
  3. `ARCHITECTURE_REFACTOR_PLAN.md` — 32KB
  4. `LYNTOS_FRONTEND_TAM_RONTGEN.md` — 28KB
  5. `LYNTOS_SYSTEM.md` — 24KB
  6. `LYNTOS_PLATFORM_BRIEF.md` — 24KB
  7. `ARCHITECTURE_REFACTOR_STATUS.md` — 24KB
  8. `LYNTOS_V2_SESSION_BRIEF.md` — 20KB
  9. `LYNTOS_TEKNIK_BORC_BRIEF.md` — 20KB
  10. `LYNTOS_IS_REVISION_BRIEF.md` — 20KB
- **Tam liste:** COWORK_OPENING_PROMPT.md, COWORK_OPENING_PROMPT_V2.md, COWORK_OPENING_PROMPT_V3.md, YENI_PENCERE_PROMPT.md, PENCERE_11_PROMPT.md, WINDOW_11_OPENING_PROMPT.md, CLAUDE_BRIEFING.md, NEXT_STEPS.md, "NEXT_STEPS kopyası.md", BACKLOG_LYNTOS.md, TECHNICAL_DEBT.md, DASHBOARD_KOMPLE_RAPOR.md, DASHBOARD_RONTGEN_RAPORU.md, DASHBOARD_TAM_RONTGEN_RAPORU.md, LYNTOS_DURUM_RAPORU.md, LYNTOS_MASTER_PLAN.md, LYNTOS_PENCERE_PLANI_V2.md, CHECKPOINT_2026_01_25_DEDUPE_COMPLETE.md, CHECKPOINT_2026_01_25_TM2_DEFTER_KONTROL.md, MIZAN_DATA_INTEGRATION_RAPOR.md, RAPOR_YASAL_SURELER_SIRKETLER_ICIN.md, SMMM_DOSYA_TIPLERI_ANALIZ.md
- **Açıklama:** Claude Code session prompt'ları, checkpoint'ler, analiz raporları, briefing'ler — hepsi proje kökünde. Bir "docs/" klasörüne taşınmalı veya arşivlenmeli.
- **Etki:** Proje kökü karmaşık, `git status` okunmaz, yanlışlıkla commit edilebilir.

---

## 5. Backup/Legacy Frontend Dosyaları

### Bulgu 5.1: .backups Klasörü (İYİLEŞTİRME)
- **Dosya:** `lyntos-ui/.backups_phase_a_20260112_213801/` — 116KB
- **İçerik:** 6 dosya (CrossCheckPanel.tsx, GeciciVergiPanel.tsx, InflationPanel.tsx, MizanOmurgaPanel.tsx, RegWatchPanel.tsx, page.tsx)
- **Açıklama:** Phase A refactoring öncesi alınmış backup. Git history'de zaten mevcut.
- **Etki:** 116KB gereksiz dosya.

### Bulgu 5.2: BACKUP ve LEGACY İsimli Dosyalar (İYİLEŞTİRME)
- **Dosyalar:**
  - `V1DashboardClient_LEGACY.tsx`
  - `V1DashboardClient.BACKUP_1767417435.tsx`
- **Açıklama:** Git history'de zaten mevcut, ayrı dosya olarak tutmaya gerek yok.

---

## 6. Backend Legacy Yapılar

### Bulgu 6.1: kurgan_calculator.py Legacy Metotlar (CİDDİ)
- **Dosya:** `backend/services/kurgan_calculator.py:3261`
- **Açıklama:** 3399 satırlık dosyada satır 3261'den sonrası açıkça `# LEGACY METODLAR (Geriye Uyumluluk)` olarak işaretlenmiş. ~138 satır legacy kod.
- **Etki:** Her değişiklikte legacy kodu da düşünmek gerekiyor.

### Bulgu 6.2: source_registry.py Legacy Mapping (İYİLEŞTİRME)
- **Dosya:** `backend/services/source_registry.py:542-587`
- **Açıklama:** `LEGACY_TO_REF` dictionary ve `resolve_legacy()` fonksiyonu — eski string mapping'lerin yeni ID'lere dönüştürülmesi. Transition dönemi geçtiyse kaldırılabilir.

### Bulgu 6.3: main.py Legacy V1 Endpoint'ler (İYİLEŞTİRME)
- **Dosya:** `backend/main.py:219`
- **Açıklama:** `# LEGACY V1 ENDPOINTS (Risk Model & Dashboard)` açıkça legacy olarak etiketlenmiş ama hâlâ aktif.

---

## 7. Kullanılmayan Dependency Potansiyeli

### Bulgu 7.1: MUI + Radix + Tailwind Üçlü Kullanım (CİDDİ — Rapor 8'den tekrar)
- **Dosya:** `lyntos-ui/package.json`
- **Açıklama:** Üç UI framework birlikte: @mui/material + @emotion (CSS-in-JS), Radix UI (6 component), Tailwind CSS (utility). Tek birine indirgenmeli.
- **Etki:** ~300KB+ gereksiz bundle boyutu.

### Bulgu 7.2: Backend 3 venv Klasörü (İYİLEŞTİRME)
- **Dosyalar:**
  - `backend/venv/` (Python 3.14)
  - `backend/venv_new/` (Python 3.10)
  - `backend/.venv/` (Python 3.12 — aktif)
- **Açıklama:** 3 farklı Python sürümüne ait venv. Sadece `.venv` aktif, diğer ikisi gereksiz.
- **Etki:** Büyük disk alanı israfı (her biri yüzlerce MB).

### Bulgu 7.3: react-force-graph-2d Kullanımı Sınırlı (İYİLEŞTİRME)
- **Dosya:** `lyntos-ui/package.json`
- **Açıklama:** Graph görselleştirme kütüphanesi. Büyük olasılıkla sadece 1-2 sayfada kullanılıyor. Dynamic import yapılmıyor.

---

## ÖNCELİKLİ AKSİYON PLANI

### Faz 1 — Hemen (Bu Hafta)
1. **17 orphan script'i sil veya `scripts/` altına taşı** — özellikle `whatsapp_send.py` güvenlik riski
2. **v2/upload.py ve v2/bulk_upload.py sil** — ingest.py replace etti
3. **Eski venv klasörlerini sil** — `venv/` ve `venv_new/` (sadece `.venv` kalsın)
4. **Backup dosyaları sil** — `.backups_phase_a_*`, `*_LEGACY.tsx`, `*.BACKUP_*.tsx`

### Faz 2 — 1 Hafta
5. **32 MD dosyayı düzenle** — `docs/archive/` altına taşı, güncel olanları `docs/` altına al
6. **v1 API deprecation planı** — Frontend'den v1 referanslarını tespit et, v2'ye migrate et
7. **contracts.py parçala** — axis_d.py, mizan_calculations.py, financial_ratios.py, legacy_compat.py olarak böl
8. **v1 frontend kodunu temizle** — `src/_legacy/`, `src/components/v1/`, LEGACY/BACKUP dosyaları sil

### Faz 3 — 1 Ay
9. **v1 API'yi tamamen kaldır** — Tüm frontend v2'ye geçtikten sonra v1 router'larını sil
10. **UI framework tekleştir** — MUI veya Radix+Tailwind seç, diğerini kaldır
11. **kurgan_calculator.py parçala** — 3399 satır → modüler yapı
12. **Kullanılmayan dependency'leri kaldır** — `npx depcheck` veya `pnpm dlx depcheck` ile tespit
