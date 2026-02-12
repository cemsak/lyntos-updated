# LYNTOS Teknik Denetim — Final Rapor

**Tarih:** 2026-02-09
**Kapsam:** 10 denetim alanı, 4 session, tam kod taraması
**Platform:** LYNTOS — Türk SMMM/YMM Vergi Uyum Platformu (VDK risk analizi, KURGAN puanlama, Big4 denetim)
**Teknoloji:** Next.js 15 + FastAPI + SQLite | 66 DB tablo | 55 router | ~349 endpoint | 51 sayfa | 284 component

---

## YÖNETİCİ ÖZETİ

LYNTOS, Türkiye'deki SMMM ve YMM'lerin vergi uyumunu yönetmek için geliştirilen kapsamlı bir platformdur. 10 alanda yapılan teknik denetim, platformun fonksiyonel açıdan zengin olduğunu ancak **güvenlik, stabilite ve bakım altyapısında kritik eksiklikler** bulunduğunu ortaya koymuştur.

### Durum Değerlendirmesi: 🔴 KRİTİK

**En acil 3 risk:**
1. **v2 API'nin %95'i kimlik doğrulamasız** — Herhangi biri herkesin verilerine erişebilir
2. **PII/VKN verisi filtresiz AI servislerine gönderiliyor** — KVKK ihlali
3. **SQL Injection açıkları** — 12+ lokasyonda f-string ile SQL oluşturma

**Olumlu tespitler:**
- İş mantığı zengin (180+ VDK/KURGAN kuralı, kapsamlı cross-check motoru)
- v2 ingest pipeline iyi tasarlanmış (SHA256 dedup, period validation, client ownership)
- Frontend'de TanStack Query ile client-side cache mevcut
- Bazı endpoint'lerde pagination uygulanmış

---

## BULGU DAĞILIMI

### Tüm Raporlar Bazında

| # | Rapor | KRİTİK | CİDDİ | İYİLEŞTİRME | TOPLAM |
|---|-------|--------|-------|-------------|--------|
| 01 | Backend Yapısı | 3 | 5 | 4 | 12 |
| 02 | Frontend Yapısı | 2 | 4 | 3 | 9 |
| 03 | Mali Modüller | 10 | 8 | 5 | 23 |
| 04 | Güvenlik & Teknik Borç | 6 | 6 | 3 | 15 |
| 05 | SMMM İzolasyonu | 7 | 9 | 5 | 21 |
| 06 | AI Entegrasyonu | 8 | 13 | 7 | 28 |
| 07 | Backend-Frontend Uyumu | 3 | 8 | 5 | 16 |
| 08 | Performans | 4 | 7 | 6 | 17 |
| 09 | Stabilite & Hata Dayanıklılığı | 5 | 8 | 5 | 18 |
| 10 | Gereksiz Dosya & Kod | 3 | 6 | 7 | 16 |
| **TOPLAM** | | **51** | **74** | **50** | **175** |

### Seviye Dağılımı

```
KRİTİK:      51 bulgu  ████████████████████████████████████  29%
CİDDİ:       74 bulgu  █████████████████████████████████████████████████  42%
İYİLEŞTİRME: 50 bulgu  ███████████████████████████████  29%
```

---

## TOP 10 ÖNCELİKLİ AKSİYON

### 🔴 HEMEN (Bu Hafta)

| # | Aksiyon | Rapor | Etki | Effort |
|---|---------|-------|------|--------|
| 1 | **v2 API'ye auth ekle** — 35+ dosyada `Depends(verify_token)` yok | 05 | Veri sızıntısı engellenir | Yüksek |
| 2 | **PII/VKN filtreleme** — AI promptlarından müşteri bilgilerini temizle | 06 | KVKK uyumu | Orta |
| 3 | **SQL Injection düzelt** — 12+ lokasyonda f-string → parameterized query | 04 | DB güvenliği | Orta |
| 4 | **SQLite WAL modu aktifle** — `PRAGMA journal_mode=WAL` tek satır | 08 | Concurrent performans | Düşük |
| 5 | **React Error Boundary ekle** — `error.tsx` + `global-error.tsx` | 09 | UI crash engellenir | Düşük |

### 🟡 1 HAFTA İÇİNDE

| # | Aksiyon | Rapor | Etki | Effort |
|---|---------|-------|------|--------|
| 6 | **Bare except'leri düzelt** — 19 lokasyonda hata yutma | 09 | Debug yapılabilirlik | Düşük |
| 7 | **Kritik tablolara index ekle** — 9+ tablo index'siz | 08 | Sorgu performansı | Düşük |
| 8 | **SSL doğrulamayı aç** — `ai_analyzer.py`'de `verify=False` | 06 | MITM koruması | Düşük |
| 9 | **Orphan script'leri temizle** — 17 kullanılmayan Python dosyası | 10 | Kod hijyeni | Düşük |
| 10 | **Transaction rollback ekle** — 10+ serviste commit var rollback yok | 09 | Veri bütünlüğü | Orta |

---

## 10 DENETİM ALANININ ÖZET TABLOLARI

### Rapor 01: Backend Yapısı
| Bulgu | Seviye |
|-------|--------|
| 55 router, ~349 endpoint — aşırı büyük | CİDDİ |
| 88 servis dosyası — modülarizasyon eksik | CİDDİ |
| Sadece 14 test dosyası | KRİTİK |
| 3 venv klasörü (venv, venv_new, .venv) | İYİLEŞTİRME |

### Rapor 02: Frontend Yapısı
| Bulgu | Seviye |
|-------|--------|
| 51 sayfa, 284 component — aşırı büyük | CİDDİ |
| v1 + v2 paralel yaşıyor | KRİTİK |
| Sadece 3 unit test + 1 e2e test | KRİTİK |
| 3 UI framework (MUI + Radix + Tailwind) | CİDDİ |

### Rapor 03: Mali Modüller
| Bulgu | Seviye |
|-------|--------|
| Bağımsız KDV hesaplama motoru yok | KRİTİK |
| Geçici vergi otomasyonu eksik | KRİTİK |
| Kurumlar vergisi hesaplama doğrulanmamış | KRİTİK |
| E-defter/e-fatura entegrasyonu stub seviyesinde | KRİTİK |
| Yeniden Değerleme (298/C) motoru basit | CİDDİ |

### Rapor 04: Güvenlik & Teknik Borç
| Bulgu | Seviye |
|-------|--------|
| SQL Injection — 12+ lokasyon f-string | KRİTİK |
| JWT zayıf konfigürasyon | KRİTİK |
| CORS `*` — tüm origin'lere açık | KRİTİK |
| API Key'ler .env'de açık | KRİTİK |
| 174 adet `any` type (TypeScript) | CİDDİ |
| SQLite WAL kapalı + boyut limiti yok | KRİTİK |

### Rapor 05: SMMM İzolasyonu
| Bulgu | Seviye |
|-------|--------|
| v2 API 35+ dosyada auth yok | KRİTİK |
| 15+ endpoint'te spoofable smmm_id | KRİTİK |
| Tek doğru implementasyon: ingest.py | KRİTİK |
| Client ownership check sadece ingest'te | CİDDİ |
| OR smmm_id IS NULL kalıntıları | KRİTİK |

### Rapor 06: AI Entegrasyonu
| Bulgu | Seviye |
|-------|--------|
| PII/VKN KVKK ihlali — AI'a filtresiz gönderim | KRİTİK |
| SSL doğrulama kapalı (MITM) | KRİTİK |
| Timeout/retry mekanizması yok | KRİTİK |
| Prompt injection koruması yok | KRİTİK |
| AI maliyet takibi yok | CİDDİ |
| Rate limiting yok | CİDDİ |

### Rapor 07: Backend-Frontend Uyumu
| Bulgu | Seviye |
|-------|--------|
| Response envelope tutarsız | KRİTİK |
| Type mismatch (summary vs statistics) | KRİTİK |
| Auth header double-prefix bug | KRİTİK |
| Error response formatı standart değil | CİDDİ |

### Rapor 08: Performans
| Bulgu | Seviye |
|-------|--------|
| SQLite WAL kapalı | KRİTİK |
| DB boyut limiti yok | KRİTİK |
| 9+ tabloda client_id+period_id index eksik | CİDDİ |
| evidence_bundle 14 ardışık SELECT | CİDDİ |
| contracts.py 4849 satır | KRİTİK |
| 12 dosya 1000+ satır (toplam ~25K satır) | KRİTİK |
| Bundle: MUI + AG Grid + pdfjs + xlsx + jspdf ağır | CİDDİ |
| Dynamic import sadece 2 yerde | İYİLEŞTİRME |

### Rapor 09: Stabilite & Hata Dayanıklılığı
| Bulgu | Seviye |
|-------|--------|
| 19 bare except: — hata yutma | KRİTİK |
| React Error Boundary yok | KRİTİK |
| Test kapsamı %16 (backend), <%1 (frontend) | KRİTİK |
| 40+ commit ama sadece 11 rollback | CİDDİ |
| Context manager kullanılmıyor | CİDDİ |
| Concurrent upload race condition | CİDDİ |
| Rate limiting yok | İYİLEŞTİRME |

### Rapor 10: Gereksiz Dosya & Kod
| Bulgu | Seviye |
|-------|--------|
| 17 orphan Python script (1295 satır) | KRİTİK |
| v1 API tümüyle gereksiz (21 dosya) | KRİTİK |
| 32 MD dosya proje kökünde | CİDDİ |
| .backups + LEGACY + BACKUP dosyaları (344KB) | İYİLEŞTİRME |
| 3 venv klasörü | İYİLEŞTİRME |
| contracts.py 4849 satır parçalanmalı | KRİTİK |

---

## İMPLEMENTASYON YOL HARİTASI

### 📅 Hafta 1: Acil Güvenlik & Stabilite

| Gün | Görev | Dosya(lar) | Effort |
|-----|-------|-----------|--------|
| 1 | v2 API auth middleware ekle | 35+ router dosyası | 4-6 saat |
| 1 | SQLite WAL + foreign_keys + max_page_count | database/db.py | 30 dk |
| 2 | SQL Injection düzelt (f-string → param) | 12+ lokasyon | 3-4 saat |
| 2 | PII/VKN maskeleme | ai_analyzer.py, orchestrator.py | 2-3 saat |
| 3 | SSL verify=True | ai_analyzer.py | 15 dk |
| 3 | Error Boundary ekle | error.tsx, global-error.tsx | 1 saat |
| 3 | Bare except düzelt | 19 lokasyon | 2 saat |
| 4 | Kritik tablolara index | db.py | 1 saat |
| 4 | Transaction rollback ekle | 10+ servis | 2-3 saat |
| 5 | Orphan script temizliği | 17 dosya sil/taşı | 1 saat |
| 5 | v2/upload.py, bulk_upload.py sil | 2 dosya | 15 dk |
| 5 | Eski venv'leri sil | venv/, venv_new/ | 5 dk |

### 📅 Hafta 2-4: Yapısal İyileştirme

| Hafta | Görev | Etki |
|-------|-------|------|
| 2 | v1 API deprecation — frontend referanslarını v2'ye geçir | Güvenlik |
| 2 | evidence_bundle sorgularını optimize et | Performans |
| 2 | AI timeout/retry/fallback mekanizması | Stabilite |
| 3 | contracts.py parçala (4849 → 4-5 modül) | Bakım |
| 3 | Dynamic import ekle (ag-grid, recharts, jspdf) | Bundle boyutu |
| 3 | Auth/ingest/cascade delete testleri yaz | Test kapsamı |
| 4 | Structured logging + PII maskeleme | Operasyonel görünürlük |
| 4 | CORS kısıtla (specific origins) | Güvenlik |
| 4 | 32 MD dosyayı docs/ altına düzenle | Kod hijyeni |

### 📅 Ay 2-3: Platform Olgunlaştırma

| Görev | Etki |
|-------|------|
| Test kapsamını %50'ye çıkar | Güvenli refactoring |
| v1 API'yi tamamen kaldır | 21 dosya + 4849 satır contracts.py |
| UI framework tekleştir (MUI veya Radix+Tailwind) | ~300KB bundle tasarrufu |
| Backend response cache | Performans |
| Health check + circuit breaker | Operasyonel dayanıklılık |
| KDV motoru geliştir | Mali doğruluk |
| Rate limiting + DDoS koruması | Güvenlik |
| React 19 upgrade | Modern özellikler |
| kurgan_calculator.py parçala (3399 satır) | Bakım |

---

## SONUÇ

LYNTOS, fonksiyonel açıdan zengin ve Türkiye vergi mevzuatına uygun bir platform olma potansiyeline sahiptir. Ancak **175 bulgunun 51'i KRİTİK seviyededir** ve bunların büyük çoğunluğu güvenlik ile ilgilidir.

**En acil risk:** v2 API'nin auth'suz olması, tek başına tüm platformu kullanılmaz kılar. Bir SMMM'nin müşteri verilerine herhangi biri erişebilir, bu da hem KVKK ihlali hem de mesleki sorumluluk riski oluşturur.

**Önerilen yaklaşım:** Hafta 1'deki güvenlik aksiyonları tamamlanmadan platformun production'a alınmaması veya kullanıcılara açılmaması tavsiye edilir.

---

*Bu rapor 4 denetim session'ında, toplam 10 denetim alanında yapılan kapsamlı kod taramasına dayanmaktadır.*
*Rapor dosyaları: 01_backend_structure.md ... 10_unused_code.md*
*Konum: /Users/cemsak/lyntos/AUDIT_REPORT/*
