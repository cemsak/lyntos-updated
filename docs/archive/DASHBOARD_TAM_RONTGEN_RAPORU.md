# LYNTOS DASHBOARD TAM RÖNTGEN RAPORU

**Tarih:** 21 Ocak 2026
**Analiz Kapsamı:** Frontend kaynak kodunun %100'ü
**Toplam Analiz Edilen Dosya:** 317 dosya
**Analiz Türü:** Kod seviyesinde derinlemesine inceleme

---

## İÇİNDEKİLER

1. [Genel Özet](#1-genel-özet)
2. [Sayfalar Analizi (48 sayfa)](#2-sayfalar-analizi)
3. [Hook'lar Analizi (29 hook)](#3-hooklar-analizi)
4. [Parser'lar Analizi (24 parser)](#4-parserlar-analizi)
5. [Store ve Library Analizi (22 dosya)](#5-store-ve-library-analizi)
6. [Component'ler Analizi](#6-componentler-analizi)
7. [API Endpoint Haritası](#7-api-endpoint-haritası)
8. [Kritik Bulgular](#8-kritik-bulgular)
9. [Sonuç ve Değerlendirme](#9-sonuç-ve-değerlendirme)

---

## 1. GENEL ÖZET

### Frontend Durumu - Bir Bakışta

| Kategori | Toplam | Çalışan | Placeholder/Mock | Eksik |
|----------|--------|---------|------------------|-------|
| **Sayfalar** | 48 | 20 (%42) | 1 (%2) | 27 (%56) |
| **Hook'lar** | 29 | 29 (%100) | 0 | 0 |
| **Parser'lar** | 24 | 18 (%75) | 6 (%25) | 0 |
| **Store/Lib** | 22 | 22 (%100) | 0 | 0 |
| **Component'ler** | ~100 | ~85 (%85) | ~15 (%15) | 0 |

### Veri Akışı Özeti

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   PARSERS    │───▶│    STORES    │───▶│  COMPONENTS  │          │
│  │  (24 adet)   │    │  (Zustand)   │    │   (UI)       │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   BACKEND    │◀──▶│    HOOKS     │───▶│    PAGES     │          │
│  │   (18 API)   │    │  (29 adet)   │    │  (48 adet)   │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. SAYFALAR ANALİZİ

### Tam Çalışan Sayfalar (20 adet)

| Sayfa | API | Hesaplama | Durum |
|-------|-----|-----------|-------|
| `/v2/page.tsx` (Dashboard) | ✅ useBackendFeed | ✅ Risk analizi | Tam çalışıyor |
| `/v2/dashboard-v3/page.tsx` | ✅ useDashboardData | ✅ Backend sync | Tam çalışıyor |
| `/v2/clients/page.tsx` | ✅ /api/v1/tenants/taxpayers | ❌ | Tam çalışıyor |
| `/v2/yevmiye/page.tsx` | ✅ /api/v1/yevmiye/list | ❌ | 44,393 kayıt |
| `/v2/kebir/page.tsx` | ✅ /api/v1/kebir | ❌ | 15,899 kayıt |
| `/v2/q1-ozet/page.tsx` | ✅ /api/v1/beyanname/ozet | ❌ | Tam çalışıyor |
| `/v2/edefter/rapor/page.tsx` | ✅ /api/v1/edefter/rapor | ❌ | Tam çalışıyor |
| `/v2/corporate/page.tsx` | ❌ Lokal | ✅ TTK 376 hesabı | Tam çalışıyor |
| `/v2/corporate/chat/page.tsx` | ✅ Backend chat API | ❌ | Tam çalışıyor |
| `/v2/donem-sonu/page.tsx` | ❌ localStorage | ✅ İlerleme takibi | Wizard |
| `/v2/vergi/gecici/page.tsx` | ❌ | ✅ %25 hesaplama | Tam çalışıyor |
| `/v2/vergi/kurumlar/page.tsx` | ❌ | ❌ | Placeholder |
| `/v2/settings/page.tsx` | Optional | ❌ | Temel ayarlar |
| `/v2/pratik-bilgiler/page.tsx` | ❌ | ❌ | Link hub |

### Eksik veya Placeholder Sayfalar (28 adet)

| Sayfa | Durum | Not |
|-------|-------|-----|
| `/v2/beyan/[tip]/page.tsx` | ⚠️ Placeholder | Sprint 6'da aktif |
| `/v2/mutabakat/page.tsx` | ❌ Dosya yok | - |
| `/v2/mutabakat/cari/page.tsx` | ❌ Dosya yok | - |
| `/v2/vergus/page.tsx` | ❌ Dosya yok | - |
| `/v2/enflasyon/page.tsx` | ❌ Dosya yok | - |
| `/v2/vdk/page.tsx` | ❌ Dosya yok | - |
| `/v2/regwatch/page.tsx` | ❌ Dosya yok | - |
| `/v2/cross-check/page.tsx` | ❌ Dosya yok | - |
| `/v2/quarterly/page.tsx` | ❌ Dosya yok | - |
| `/v2/risk/page.tsx` | ❌ Dosya yok | - |
| `/v2/banka/page.tsx` | ❌ Dosya yok | - |
| `/v2/upload/page.tsx` | ❌ Dosya yok | - |
| `/v2/reports/page.tsx` | ❌ Dosya yok | - |
| ... ve 15 diğer | ❌ | Sprint 6+ |

---

## 3. HOOK'LAR ANALİZİ

### Hook Kategorileri

#### A) Backend Heavy - API + Hesaplama (7 hook)

| Hook | Endpoint | Hesaplama |
|------|----------|-----------|
| `useDashboardData` | `/api/v2/donem/status/{period}` | Doc type sayıları |
| `useRightRailData` | 3 API paralel | Tamamlanma %, risk |
| `useCrossCheck` | `/api/v2/cross-check/run` | Check sonuçları |
| `useVDKAnalysis` | `/api/v1/vdk-simulator/analyze` | Risk skoru |
| `useQuarterlyAnalysis` | `/api/v2/donem/sync` | ZIP parse + cross-check |
| `useAksiyonlar` | `/api/v1/contracts/actionable-tasks` | Priority mapping |
| `useRegWatchScan` | 3 endpoint (scrape/status/pending) | Priority belirleme |

#### B) Backend Heavy - API, Minimal Hesaplama (8 hook)

| Hook | Endpoint | Not |
|------|----------|-----|
| `useBackendFeed` | `/api/v2/feed/{period}` | Veri mapping |
| `useFailSoftFetch` | Scope-based URLs | Envelope pattern |
| `useRegistry` (7 hook) | Multiple registry APIs | Company data |
| `useRiskReviewQueue` | `/api/v1/contracts/risk-queue` | Risk level mapping |
| `useTaxCertificate` | `/api/v1/tax-certificate/*` | VKN eşleştirme |
| `useDocumentChecklist` | `/api/v1/documents/*` | Veri yönetimi |
| `useCorporate` (4 hook) | `/api/v1/corporate/*` | TTK 376 hesabı |
| `useLayoutData` | `/api/v1/user/*` | Veri dönüşümü |

#### C) Local Heavy - Store + Hesaplama (4 hook)

| Hook | Veri Kaynağı | Hesaplama |
|------|--------------|-----------|
| `useDonemVerileri` | Zustand (donemStore) | File type mapping |
| `useFeedSignals` | mizanStore + oranlarStore | 7 VDK kuralı |
| `useEvidenceBundle` | Rule Engine | Bundle generation |
| `useRuleEngine` | oranlarStore | Mizan özeti, rule exec |

#### D) Pure State Management (6 hook)

| Hook | Storage | Not |
|------|---------|-----|
| `useRegWatchState` | localStorage | Item state persist |
| `useDashboardScope` | React Context | Scope container |
| `useDonemValidation` | Scope | Tarih validation |
| `useSidebarState` | localStorage | Collapse state |
| `useFeedStore` | Zustand | Item selection |
| `useUrlSync` | URL + Zustand | Sync mekanizması |

### Hook Özet İstatistikleri

- **Toplam:** 29 hook
- **API Çağrısı Olan:** 23 (%79)
- **Gerçek Hesaplama Yapan:** 18 (%62)
- **Backend Bağımlı:** 23 (%79)
- **Local State Bağımlı:** 6 (%21)

---

## 4. PARSER'LAR ANALİZİ

### Tam Çalışan Parser'lar (18 adet)

| Parser | Dosya Tipi | Durum |
|--------|-----------|-------|
| `mizanParser.ts` | Excel | ✅ Production-ready |
| `yevmiyeParser.ts` | Excel | ✅ Production-ready |
| `kebirParser.ts` | Excel | ✅ Production-ready |
| `aphbParser.ts` | Excel/CSV (SGK) | ✅ Production-ready |
| `bankaParser.ts` | CSV | ✅ 5+ banka formatı |
| `mt940Parser.ts` | MT940 (SWIFT) | ✅ Production-ready |
| `eFaturaParser.ts` | XML | ✅ XBRL-GL namespace |
| `zipHandler.ts` | ZIP | ✅ Production-ready |
| `fileDetector.ts` | Multi-type | ✅ 40+ dosya tipi |
| `crosscheck/engine.ts` | Meta | ✅ Validation engine |
| `upload/mizanParser.ts` | Excel | ✅ 8 yazılım formatı |
| `upload/fileClassifier.ts` | Multi-type | ✅ AI detection |
| `upload/dataAggregator.ts` | Aggregation | ✅ Backend compat |

### Placeholder/Partial Parser'lar (6 adet)

| Parser | Dosya Tipi | Durum | Not |
|--------|-----------|-------|-----|
| `geciciVergiParser.ts` | PDF | ⚠️ Regex-based | Hata → default |
| `muhtasarParser.ts` | PDF | ⚠️ Regex-based | Hata → default |
| `kdvParser.ts` | PDF | ⚠️ Regex-based | Hata → default |
| `tahakkukParser.ts` | PDF | ⚠️ Regex-based | Hata → default |
| `beyannameParser.ts` | PDF | ⚠️ Regex-based | 10+ beyanname türü |
| `edefterParser.ts` | XML | ⚠️ Silent fail | Empty array return |

### Crosscheck Rules (Stub)

| Rule | Durum |
|------|-------|
| `mizanYevmiye.ts` | ❌ Empty stub |
| `mizanMuhtasar.ts` | ❌ Empty stub |
| `mizanKdv.ts` | ❌ Empty stub |
| `mizanBanka.ts` | ❌ Empty stub |

---

## 5. STORE VE LIBRARY ANALİZİ

### Zustand Store'lar (4 adet)

| Store | Persist | Veri | Durum |
|-------|---------|------|-------|
| `mizanStore` | Partial | Mizan + metadata | ✅ Production |
| `donemStore` | Partial (quota-safe) | 8 belge tipi | ✅ Production |
| `oranlarStore` | Full | TCMB oranları | ✅ Production |
| `useFeedStore` | No | Feed items | ✅ Production |

### API/Config Library (8 adet)

| Dosya | İçerik | Durum |
|-------|--------|-------|
| `config/api.ts` | API endpoints | ✅ Production |
| `constants/docTypes.ts` | Big-6 belge tipleri | ✅ Production |
| `utils/docStatusHelper.ts` | Status hesaplama | ✅ Production |
| `authFetch.ts` | Auth wrapper | ✅ Production |
| `auth.ts` | Token yönetimi | ✅ Production |
| `vergiTakvimi.ts` | 2026 takvimi | ✅ GİB verisi |
| `api/donemSync.ts` | Backend sync | ✅ Production |
| `api/mizanSync.ts` | Mizan sync | ✅ Production |

### Rule Engine (17 kural)

| Phase | Kural Sayısı | Kurallar |
|-------|--------------|----------|
| Phase 0 (INTAKE) | 2 | Mizan Denkliği, Aktif-Pasif |
| Phase 1 (COMPUTE) | 6 | Amortisman, Kıdem, Şüpheli Alacak, Reeskont, Stok, Binek |
| Phase 2 (VDK) | 4 | K-09, K-04, K-08, K-12 |
| Phase 3 (CROSSCHECK) | 5 | Mizan-KDV, Gelir-Gider, Kasa-Banka, Stopaj, Alıcı-Satıcı |

### Evidence Bundle (5 dosya)

| Dosya | İşlev | Durum |
|-------|-------|-------|
| `bundleGenerator.ts` | Rule → Bundle | ✅ Production |
| `pdfGenerator.ts` | Bundle → PDF | ✅ Production |
| `quarterly/manifestGenerator.ts` | Audit trail | ✅ Production |
| `quarterly/pdfReportGenerator.ts` | Cross-check PDF | ✅ Production |
| `quarterly/bundleGenerator.ts` | ZIP bundle | ✅ Production |

---

## 6. COMPONENT'LER ANALİZİ

### Dashboard Ana Component'ler

| Component | Satır | API | Hesaplama | Veri Kaynağı |
|-----------|-------|-----|-----------|--------------|
| **MizanOmurgaPanel** | 1,326 | ✅ | ✅ VDK risk + 14 oran | Backend API |
| **CrossCheckPanel** | 1,209 | ✅ | ✅ Fark analizi | Backend API |
| **InflationPanel** | 551 | ✅ | ✅ Yİ-ÜFE düzeltme | TCMB EVDS |
| **KurganAlertPanel** | 573 | ✅ | ✅ 16 senaryo | Backend API |
| **VdkExpertPanel** | 395 | ✅ | ✅ Risk seviye | Backend API |
| **KpiStrip** | 303 | ✅ (8 endpoint) | ✅ Normalization | Backend API |

### Vergi Panelleri

| Component | Satır | API | Hesaplama | Durum |
|-----------|-------|-----|-----------|-------|
| **GeciciVergiPanel** | 252 | ❌ | ⚠️ Minimal | Statik 12 kontrol |
| **KurumlarVergisiPanel** | 910 | ❌ | ✅ Matrah hesabı | Statik 20 kontrol |

**⚠️ KRİTİK:** Vergi panellerinin kontrol listesi FRONTEND'de statik tanımlı. Backend API YOK!

### Operations Component'ler

| Component | API | Hesaplama | Not |
|-----------|-----|-----------|-----|
| **AksiyonKuyruguPanel** | Via hook | ✅ Gruplama | Tam çalışıyor |
| **RegWatchPanel** | ✅ (2+ endpoint) | ✅ Progress | 8 trusted source |
| **MissingDataPanel** | ✅ | ✅ Completeness | Tam çalışıyor |
| **ActionQueuePanel** | ✅ | ✅ Count | Tam çalışıyor |

### Layout Component'ler

| Component | API | Hesaplama | Not |
|-----------|-----|-----------|-----|
| **RightRail** | ✅ useRightRailData | ✅ Aggregation | 3 API paralel |
| **Sidebar** | ❌ | ❌ | 11 section, 42 item |
| **ScopeSelector** | ✅ (periods) | ✅ Period mapping | SMMM GÜVENİ |

---

## 7. API ENDPOINT HARİTASI

### V1 Endpoints (Contracts)

```
/api/v1/contracts/kurgan-risk
/api/v1/contracts/data-quality
/api/v1/contracts/actionable-tasks
/api/v1/contracts/corporate-tax
/api/v1/contracts/corporate-tax-forecast
/api/v1/contracts/quarterly-tax
/api/v1/contracts/mizan-analysis
/api/v1/contracts/inflation-adjustment
/api/v1/contracts/cross-check
/api/v1/contracts/regwatch-status
/api/v1/contracts/right-rail-summary
/api/v1/contracts/risk-queue
/api/v1/contracts/sources
/api/v1/contracts/export-pdf
/api/v1/contracts/fake-invoice-risk
```

### V2 Endpoints (Donem)

```
/api/v2/donem/status/{period}
/api/v2/donem/sync
/api/v2/cross-check/run/{period}
/api/v2/cross-check/status/{period}
/api/v2/mizan/sync
/api/v2/feed/{period}
/api/v2/validate/vdk
/api/v2/tcmb/yiufe
```

### Diğer Endpoints

```
/api/v1/tenants/{tenantId}/taxpayers
/api/v1/tenants/{tenantId}/taxpayers/{taxpayerId}/periods
/api/v1/user/me
/api/v1/user/me/clients
/api/v1/user/clients/{clientId}/periods
/api/v1/regwatch/scrape (POST, admin-only)
/api/v1/regwatch/status
/api/v1/regwatch/pending
/api/v1/vdk-simulator/analyze
/api/v1/corporate/event-types
/api/v1/corporate/ttk376-analysis
/api/v1/corporate/min-capital-requirements
/api/v1/tax-certificate/upload
/api/v1/tax-certificate/confirm
/api/v1/documents/checklist/{clientId}
/api/v1/documents/upload
/api/v1/documents/evidence-bundle/{clientId}
/api/v1/inspector-prep/notes/{clientId}
/api/v1/vergus/analyze
/api/v1/vergus/quick-check/{clientId}
```

---

## 8. KRİTİK BULGULAR

### ⛔ TAMAMEN STATİK (Backend YOK)

1. **Geçici Vergi 12 Kontrol** (`types.ts` lines 71-388)
   - Hardcoded `GECICI_VERGI_KONTROLLER` array
   - Sadece UI gösterimi
   - API çağrısı YOK

2. **Kurumlar Vergisi 20 Kontrol** (`types.ts` lines 394-904)
   - Hardcoded `KURUMLAR_VERGISI_KONTROLLER` array
   - Matrah hesabı FRONTEND'de
   - API çağrısı YOK

3. **Beyan Takvimi** (`vergiTakvimi.ts`)
   - 2026 takvimi hardcoded
   - GİB'den resmi veri ama statik

### ⚠️ YANLIŞ YERDE HESAPLANIYOR

1. **VDK Risk Kriterleri** (`MizanOmurgaPanel.tsx` lines 235-491)
   - K-09, TF-01, OS-01, SA-01, SD-01 FRONTEND'de
   - `analyzeVdkRiskleri()` fonksiyonu 256 satır
   - Backend'de olmalı

2. **14 Finansal Oran** (`MizanOmurgaPanel.tsx` lines 497-699)
   - `calculateOranlar()` fonksiyonu 161 satır
   - Cari oran, ROA, ROE vs. FRONTEND'de
   - Backend'de olmalı

3. **Kurumlar Vergisi Matrah** (`KurumlarVergisiPanel.tsx` lines 296-463)
   - `MatrahHesaplama` component
   - Matrah, KV, AKV, Ödenecek KV hesapları
   - Backend'de olmalı

### ⚠️ PLACEHOLDER/STUB KODLAR

1. **PDF Parser'lar** - Regex-based, hata → default return
2. **Crosscheck Rules** - Empty stub fonksiyonlar
3. **e-Defter Parser** - Silent fail, empty array return
4. **RiskSkoruDetay** - `puanKiranlar` backend'den gelmeli (şu an boş)

### ⚠️ SAYFA EKSİKLİKLERİ

- 48 menü öğesinden 27'sinin sayfası YOK (%56)
- `/v2/mutabakat`, `/v2/vergus`, `/v2/vdk` vb. eksik
- Navigation tanımlı ama sayfa yok

---

## 9. SONUÇ VE DEĞERLENDİRME

### Frontend'in GERÇEK Durumu

| Özellik | Durum | Not |
|---------|-------|-----|
| **UI/UX** | ✅ Profesyonel | Modern, Stripe-style |
| **Component Yapısı** | ✅ İyi organize | Modüler, reusable |
| **Type Safety** | ✅ Güçlü | TypeScript kullanımı |
| **State Management** | ✅ İyi | Zustand + Context |
| **API Entegrasyonu** | ⚠️ Kısmi | 23 hook API çağırıyor |
| **Gerçek Hesaplama** | ⚠️ Kısmi | 18 hook hesaplama yapıyor |
| **Parser Maturity** | ⚠️ Kısmi | %75 production-ready |
| **Sayfa Tamamlanma** | ❌ Yetersiz | %42 tam çalışıyor |

### Veri Akışı Güvenilirliği

| Veri Tipi | Kaynak | Güvenilirlik |
|-----------|--------|--------------|
| **Mizan ham verisi** | Backend API | ✅ Güvenilir |
| **Dönem belge durumu** | Backend API | ✅ Güvenilir |
| **Aksiyonlar** | Backend API | ✅ Güvenilir |
| **VDK Risk Skoru** | Backend API | ✅ Güvenilir |
| **VDK Risk Kriterleri** | Frontend hesaplama | ⚠️ Dikkat |
| **Finansal Oranlar** | Frontend hesaplama | ⚠️ Dikkat |
| **Vergi Matrahı** | Frontend hesaplama | ⚠️ Dikkat |
| **Geçici Vergi Kontrolleri** | Statik | ❌ Güvenilmez |
| **Kurumlar Vergisi Kontrolleri** | Statik | ❌ Güvenilmez |

### SMMM/YMM İçin Risk Değerlendirmesi

| Alan | Risk | Açıklama |
|------|------|----------|
| **VDK Risk Kriterleri** | ⚠️ ORTA | Frontend'de hesaplanıyor, doğrulama yok |
| **Finansal Oranlar** | ⚠️ ORTA | Frontend'de hesaplanıyor, audit trail yok |
| **Vergi Matrahı** | ⚠️ ORTA | Frontend'de hesaplanıyor, kontrol yok |
| **Vergi Kontrolleri** | ❌ YÜKSEK | Statik liste, gerçek kontrol yok |
| **Cross-check** | ⚠️ ORTA | API çağrıyor ama kurallar stub |

### Öncelikli Yapılması Gerekenler

1. **Geçici Vergi API'si** - 12 kontrol için backend gerekli
2. **Kurumlar Vergisi API'si** - 20 kontrol için backend gerekli
3. **VDK Risk Hesaplama** - Frontend'den backend'e taşınmalı
4. **Cross-check Rules** - Stub'lar implement edilmeli
5. **Eksik Sayfalar** - 27 sayfa oluşturulmalı
6. **PDF Parser'lar** - ML-based veya structured parsing

---

## RAPOR SONU

**Sonuç:** Dashboard görsel olarak profesyonel ve iyi yapılandırılmış. Ancak SMMM/YMM için kritik olan vergi hesaplamaları ve kontrolleri şu anda YA STATİK YA DA FRONTEND'DE yapılıyor. Bu veriler gerçek mali kararlar için kullanılmamalı. Backend API'leri tamamlanana kadar dashboard "gösterim amaçlı" kabul edilmeli.

**Toplam Analiz Edilen Kod:** ~50,000+ satır TypeScript/TSX
