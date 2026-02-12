# LYNTOS - Muhasebe Yapay Zeka Platformu
## Master System Documentation v1.0

> **Bu dosya yeni Claude session'lar icin hazirlanmistir.**
> Yeni session'da once bu dosyayi oku, sonra kullanicinin direktifini bekle.

---

## 1. PROJE OZETI

LYNTOS, Turkiye'deki SMMM (Serbest Muhasebeci Mali Musavir) ve YMM'ler icin gelistirilen yapay zeka destekli muhasebe analiz platformudur.

**Temel Amac:** Mukelleflerin mali verilerini (mizan, beyanname, e-defter, banka) yukleyip analiz etmek, risk tespiti yapmak, mevzuat uyumu kontrol etmek ve AI destekli oneriler sunmak.

**Kullanici Hiyerarsisi:**
- **SMMM/YMM** (Ana kullanici) → Birden fazla mukellefe sahip
- **Mukellef** (Client) → Her mukellefin birden fazla donemi var
- **Donem** (Period) → 2025-Q1, 2025-Q2 gibi ceyreklik donemler

---

## 2. TEKNIK STACK

### 2.1 Backend
| Teknoloji | Versiyon | Aciklama |
|-----------|----------|----------|
| Python | 3.10+ | Ana dil |
| FastAPI | 0.119.0 | Web framework |
| Uvicorn | 0.37.0 | ASGI server |
| SQLite3 | - | Veritabani (lyntos.db) |
| PyJWT | 2.10.1 | Authentication |
| Pydantic | 2.12.2 | Data validation |
| OpenAI | 2.4.0 | AI/LLM entegrasyonu |
| APScheduler | 3.10.0 | Zamanlanmis gorevler |

### 2.2 Frontend
| Teknoloji | Versiyon | Aciklama |
|-----------|----------|----------|
| Next.js | 15.5.6 | React framework |
| React | 18.3.1 | UI library |
| TypeScript | 5 (strict) | Tip guvenligi |
| TailwindCSS | 4 | Styling |
| Zustand | 5.0.8 | Client state |
| TanStack Query | 5.90.5 | Server state |
| pnpm | - | Paket yoneticisi |

### 2.3 Port Yapilandirmasi
| Servis | Port | Baslama Komutu |
|--------|------|----------------|
| Backend (FastAPI) | 8000 | `cd backend && .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload` |
| Frontend (Next.js) | 3000 | `cd lyntos-ui && pnpm dev` |

---

## 3. DIZIN YAPISI

```
/Users/cemsak/lyntos/
├── backend/                     # FastAPI backend
│   ├── main.py                  # Ana entry point, 22 v1 + 35 v2 router
│   ├── api/
│   │   ├── v1/                  # Legacy API routes (22 router)
│   │   └── v2/                  # Modern API routes (35 router)
│   ├── services/                # Is mantigi (57+ servis)
│   ├── data_engine/             # Parser'lar (mizan, beyanname, banka, edefter)
│   ├── database/
│   │   ├── db.py                # SQLite baglantisi
│   │   └── lyntos.db            # Ana veritabani (~110MB)
│   ├── middleware/
│   │   └── auth.py              # JWT dogrulama
│   ├── config/                  # Konfigurasyon dosyalari
│   └── requirements.txt         # Python bagimliklar
│
├── lyntos-ui/                   # Next.js frontend
│   ├── app/v2/                  # Ana uygulama
│   │   ├── _components/         # Paylasilan bilesenler (40+ klasor)
│   │   ├── _hooks/              # Custom hook'lar (13+)
│   │   ├── _lib/                # Yardimci kutuphaneler
│   │   │   ├── config/api.ts    # MERKEZI API endpoint tanimlari
│   │   │   ├── auth.ts          # Auth token yonetimi
│   │   │   ├── authFetch.ts     # Auth'lu fetch wrapper
│   │   │   ├── format.ts        # Veri formatlama
│   │   │   ├── parsers/         # Client-side dosya parser'lari
│   │   │   ├── stores/          # Zustand store'lar
│   │   │   └── rule-engine/     # Is kurallari motoru
│   │   ├── dashboard-v3/        # Ana dashboard sayfasi
│   │   ├── vdk/                 # VDK (Vergi Denetim Kurulu) analiz
│   │   ├── vergi/               # Vergi analiz sayfalari
│   │   ├── upload/              # Dosya yukleme
│   │   ├── clients/             # Mukellef yonetimi
│   │   └── [37+ sayfa klasoru]
│   ├── .env.local               # Ortam degiskenleri
│   ├── next.config.ts           # Next.js yapilandirma
│   ├── tailwind.config.ts       # Tailwind renk sistemi
│   ├── tsconfig.json            # TypeScript yapilandirma
│   └── package.json             # Node.js bagimliklar
│
├── docs/                        # Dokumantasyon
└── LYNTOS_SYSTEM.md             # BU DOSYA
```

---

## 4. AUTHENTICATION VE SCOPE SISTEMI

### 4.1 Auth Akisi

**Dosya:** `lyntos-ui/app/v2/_lib/auth.ts`

```
Gelistirme Modu:
  .env.local → NEXT_PUBLIC_DEV_AUTH_BYPASS=1
  ↓
  getAuthToken() → localStorage'da token yoksa → "DEV_HKOZKAN" doner
  ↓
  API isteklerinde: Authorization: DEV_HKOZKAN

Uretim Modu:
  Login → JWT token → localStorage('lyntos_token')
  ↓
  getAuthToken() → localStorage'dan token
```

**KRITIK:** `@/*` tsconfig alias'i `./src/*` dizinine isaret eder, `./app/*` degil! `app/v2/` altindaki dosyalar icin **relative import** kullanilmalidir.

### 4.2 Scope Zinciri (SMMM Guveni)

```
useLayoutData.ts
  ├── /api/v1/user/me → User (SMMM) bilgisi
  ├── /api/v1/user/me/clients → Mukellef listesi
  └── /api/v1/user/clients/{id}/periods → Donem listesi
      ↓
LayoutProvider → { user, selectedClient, selectedPeriod }
      ↓
ScopeProvider → DashboardScope { smmm_id, client_id, period, advanced }
      ↓
URL Sync: ?smmm=XX&client=YY&period=2025-Q1
      ↓
useDashboardScope() → Tum bilesenler scope'a erisir
useScopeComplete() → smmm_id + client_id + period dolu mu?
```

**SMMM GUVENI Prensibi:** Scope tamamlanmadan hicbir panel veri cekmez. `useScopeComplete()` false ise → "Donem secildikten sonra veri gorunecektir" mesaji.

### 4.3 Scope Secimleri (Header'daki Dropdown'lar)

**Dosya:** `_components/layout/PremiumHeader.tsx` + `ClientSelector.tsx` + `ScopeSelector.tsx`

- **SMMM:** Tek SMMM varsa otomatik secilir, dropdown disable
- **Mukellef:** Tek mukellef varsa otomatik secilir
- **Donem:** ASLA otomatik secilmez! (SMMM Guveni - bilinçli secim gerekli)

---

## 5. API ENDPOINT YAPILANMASI

### 5.1 Merkezi Konfigurasyon

**Dosya:** `lyntos-ui/app/v2/_lib/config/api.ts` (404 satir)

**Kural:** TUM API cagrilari bu dosyadan endpoint alir. Hardcoded URL YASAKTIR.

```typescript
API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

ENDPOINTS = {
  // V1 Legacy (contracts pattern)
  PORTFOLIO: '/api/v1/contracts/portfolio',
  KURGAN_RISK: '/api/v1/contracts/kurgan-risk',
  INFLATION_ADJUSTMENT: '/api/v1/contracts/inflation-adjustment',
  ...
}

ENDPOINTS_V2 = {
  // V2 Modern (scope parametreli)
  MIZAN_LOAD: (smmm, client, period) => `${BASE}/api/v2/mizan-data/load/${smmm}/${client}/${period}`,
  FEED: (period) => `${BASE}/api/v2/feed/${period}`,
  UPLOAD: `${BASE}/api/v2/upload`,
  ...
}
```

### 5.2 Next.js Proxy

**Dosya:** `next.config.ts` → Rewrites: `/api/*` → `http://localhost:8000/api/*`

Bu sayede frontend `/api/v1/...` olarak cagirir, Next.js backend'e yonlendirir.

### 5.3 Backend V2 Router'lar (35 adet)

| Router | Endpoint | Aciklama |
|--------|----------|----------|
| upload.py | /api/v2/upload | ZIP dosya yukleme |
| ingest.py | /api/v2/ingest | Yeni dedupe sistemi |
| feed.py | /api/v2/feed/{period} | Akilli bildirim feed'i |
| cross_check.py | /api/v2/cross-check/* | Capraz kontrol |
| mizan_data.py | /api/v2/mizan-data/* | Mizan analiz |
| agents.py | /api/v2/agents/* | AI ajanlar (MasterChef) |
| beyanname_kdv.py | /api/v2/beyanname/kdv | KDV beyanname |
| beyanname_muhtasar.py | /api/v2/beyanname/muhtasar | Muhtasar beyanname |
| mevzuat_search.py | /api/v2/mevzuat-search | Mevzuat arama |
| rules.py | /api/v2/rules | Kural kutuphanesi |
| donem_sonu_islem.py | /api/v2/donem-sonu-islem | Donem sonu islemleri |
| cari_mutabakat.py | /api/v2/cari-mutabakat/* | Cari mutabakat |
| edefter_rapor.py | /api/v2/edefter-rapor/* | E-Defter raporlama |
| validate_vdk.py | /api/v2/validate-vdk | VDK dogrulama |
| ... | ... | (Toplam 35 router) |

---

## 6. VERITABANI SEMASI

**Dosya:** `backend/database/lyntos.db` (SQLite3, ~110MB)

### 6.1 Core Tablolar

```sql
users (SMMM hesaplari)
  ├── id (PK)
  ├── name, email, password_hash
  ├── role (admin | smmm | viewer)
  └── created_at, updated_at

clients (Mukellefler)
  ├── id (PK)
  ├── smmm_id (FK → users.id) CASCADE
  ├── name, tax_id, sector
  └── folder_name (dosya sistemi dizini)

periods (Donemler)
  ├── id (PK)
  ├── client_id (FK → clients.id) CASCADE
  ├── start_date, end_date
  └── status (active | closed | draft)

audit_log (Izleme)
  ├── id, user_id, action, entity_type, entity_id
  └── details (JSON), created_at
```

---

## 7. FRONTEND BILESEN MIMARISI

### 7.1 Layout Katmani

```
DashboardLayout (ana kabuk)
├── PremiumHeader (ust bar: SMMM/Mukellef/Donem dropdown'lari)
│   ├── ClientSelector (Mukellef secici)
│   └── ScopeSelector (Donem secici)
├── Sidebar (sol menu navigasyonu)
├── RightRail (sag bilgi paneli)
└── {children} (sayfa icerigi)
```

### 7.2 Paylasilmis Bilesenler

**Dizin:** `_components/shared/`

| Bilesen | Amac |
|---------|------|
| Card.tsx | Panel kart wrapper |
| Badge.tsx | Durum badge'leri |
| PanelState.tsx | Loading/error/empty state handler |
| Toast/ToastProvider | Bildirim toast'lari |
| Modal.tsx | Modal dialog |
| Table.tsx | Tablo bileseni |

### 7.3 Onemli Hook'lar

| Hook | Dosya | Amac |
|------|-------|------|
| useFailSoftFetch | hooks/useFailSoftFetch.ts | API cagri + hata yonetimi |
| useDashboardScope | scope/ScopeProvider.tsx | Scope erisimi |
| useScopeComplete | scope/ScopeProvider.tsx | Scope hazir mi? |
| useLayoutContext | layout/useLayoutContext.ts | Layout bilgisi |
| useAiAnalysis | _hooks/useAiAnalysis.ts | AI analiz |
| useMizanData | _hooks/useMizanData.ts | Mizan verisi |
| useCrossCheck | _hooks/useCrossCheck.ts | Capraz kontrol |

### 7.4 Contracts Envelope Deseni

**Dosya:** `_components/contracts/envelope.ts`

Backend'den gelen her panel verisi "envelope" yapisindadir:

```typescript
{
  status: 'loading' | 'ok' | 'empty' | 'missing' | 'auth' | 'error',
  reason_tr: string,           // Turkce aciklama
  data: T | null,              // Panel verisi
  analysis?: ExpertAnalysis,   // AI analiz
  trust?: TrustLevel,          // Guvenilirlik seviyesi
  legal_basis_refs?: LegalBasisRef[],  // Yasal dayanak
  evidence_refs?: EvidenceRef[],       // Kanit referanslari
  meta?: { ... }               // Meta bilgi
}
```

---

## 8. RENK SISTEMI VE TASARIM TOKENLARI

**Dosya:** `tailwind.config.ts` + `lib/ui/design-tokens.ts`

### 8.1 Marka Renkleri

| Renk | Hex | Kullanim |
|------|-----|----------|
| Primary Blue 700 | #0049AA | Ana aksiyonlar, basliklar |
| Primary Blue 500 | #0078D0 | Ikincil vurgular |
| Primary Blue 900 | #00287F | Koyu arka planlar |
| Success Green | #00A651 | Basarili durumlar |
| Warning Orange | #FFB114 | Uyari durumlar |
| Error Red | #F0282D | Hata/yuksek risk |
| Critical Red | #980F30 | Kritik risk |

### 8.2 Notr Renkler

| Renk | Hex | Kullanim |
|------|-----|----------|
| Text Primary | #2E2E2E | Ana metin |
| Text Secondary | #5A5A5A | Ikincil metin |
| Text Muted | #969696 | Soluk metin |
| Border | #E5E5E5 | Kenar cizgileri |
| Background | #F5F6F8 | Arka plan |
| Background Light | #F8FAFC | Acik arka plan |

### 8.3 Risk Seviyeleri

| Seviye | Turkce | Renk | Badge BG |
|--------|--------|------|----------|
| critical | Kritik | #980F30 | #FEF2F2 |
| high | Yuksek | #F0282D | #FEF2F2 |
| medium | Orta | #FFB114 | #FFFBEB |
| low | Dusuk | #00A651 | #ECFDF5 |
| unknown | Belirsiz | #5A5A5A | #F5F6F8 |

---

## 9. BACKEND SERVISLER (Onemli Olanlar)

### 9.1 Risk Analiz Motorlari

| Servis | Dosya | Aciklama |
|--------|-------|----------|
| KURGAN | kurgan_calculator.py | 20 kriter risk skoru (0-100) |
| RADAR | radar_engine.py | Dinamik risk radar'i |
| GIB Risk | gib_risk_service.py | GIB denetim olasilik hesabi |
| Sahte Fatura | - | Sahte fatura risk analizi |

### 9.2 Veri Isleme

| Servis | Dosya | Aciklama |
|--------|-------|----------|
| Parse | parse_service.py | Dosya parse orchestrator |
| Ingest | ingest_service.py | Veri yutma + dedupe |
| Post-Ingest | post_ingest_pipeline.py | Yutma sonrasi analiz |
| Cross-Check | cross_check_engine.py | Capraz kontrol motoru |

### 9.3 Dis Veri Kaynaklari

| Servis | Dosya | Aciklama |
|--------|-------|----------|
| TCMB EVDS | tcmb_evds_service.py | Yi-UFE enflasyon verileri |
| TTSG | ttsg_scraper.py | Ticaret Sicil Gazetesi |
| GIB Borclu | gib_borclu_listesi.py | GIB borclu listesi |
| RegWatch | regwatch_scraper.py | Mevzuat degisiklik takibi |

### 9.4 AI Servisleri

| Servis | Dosya | Aciklama |
|--------|-------|----------|
| AI Analyzer | ai_analyzer.py | OpenAI LLM entegrasyonu |
| AI Policies | ai_policies.py | Prompt politikalari |
| AI Alerts | ai_alerts.py | AI destekli uyari uretimi |
| LLM Guard | llm_guard.py | Prompt injection korumasi |
| MasterChef Agent | (v2/agents.py) | Ana AI ajan orchestrator |

---

## 10. ORTAM DEGISKENLERI

### 10.1 Frontend (.env.local)

```bash
NEXT_PUBLIC_DEV_AUTH_BYPASS=1          # Dev modda auth bypass (1=acik)
NEXT_PUBLIC_API_URL=http://localhost:8000  # Backend URL
TCMB_EVDS_API_KEY=xxxxx               # TCMB ekonomik veri API anahtari
```

### 10.2 Backend

```bash
JWT_SECRET_KEY=xxxxx                   # JWT imzalama anahtari
OPENAI_API_KEY=xxxxx                   # OpenAI API anahtari (AI analiz icin)
```

---

## 11. ONEMLI KURALLAR VE KONVANSIYONLAR

### 11.1 Import Kurallari
- `@/*` alias'i `./src/*` dizinine isaret eder
- `app/v2/` icindeki dosyalar arasi **relative import** kullanilmali
- `@/app/v2/...` seklinde import YANLISTIR, build hatasi verir

### 11.2 Toast Kullanimi
```typescript
import { useToast, showToast } from '../shared/Toast'; // Relative import!
```

### 11.3 API Endpoint Kullanimi
```typescript
import { ENDPOINTS, ENDPOINTS_V2 } from '../../_lib/config/api'; // Merkezi kaynak
// ASLA hardcoded URL kullanma!
```

### 11.4 Scope Kontrolu
Her panel bileseninde scope kontrolu:
```typescript
const scopeComplete = useScopeComplete();
if (!scopeComplete) return <ScopeUyarisi />;
```

### 11.5 Build ve Test
```bash
cd lyntos-ui
pnpm build          # TypeScript type-check + production build
pnpm dev            # Development server (port 3000)
pnpm test           # Vitest runner
```

### 11.6 Paralel Ajan Kurali
Birden fazla ajan `pnpm build` calistirirsa `.next` cache bozulur! Cozum:
```bash
rm -rf .next && pnpm dev
```

---

## 12. GIT DURUMU

| Bilgi | Deger |
|-------|-------|
| Branch | refactor/backend-upload |
| Son commit | feat: Add PDF beyanname/tahakkuk parsers |
| Remote | origin (GitHub) |

### Son 10 Commit:
```
2a44369 feat: Add PDF beyanname/tahakkuk parsers and nested ZIP support
ca89075 feat: Implement comprehensive SMMM document parsers
b9fe5de fix(parser): Add Excel mizan support and improve file type detection
8e747d3 feat(backend): Add ZIP upload endpoint and fix Turkish number parsing
2f60acd docs: Add comprehensive architecture master document
5c0c043 refactor: Migrate DonemVerileriPanel to backend-only V2 hook
5d77661 feat: Add unified donem data endpoint and hooks
af8f3d1 feat: Sprint 4 + CrossCheck kurallari backend'e tasindi
be3b6b6 feat(upload): Phase 1 Bridge - auto-refresh contracts after ZIP upload
573581b feat(auth): DEV_HKOZKAN fallback for development mode
```

---

## 13. TAMAMLANAN REFACTORING CALISMALARI

### P8: DonemVerileri Hook Birlestirme
- 5 ayri donem hook'u tek `useDonemData.ts` altinda birlesti
- Backend-only V2 hook: tum veri backend'den gelir

### P9: Technical Debt Temizligi
- `console.log` temizligi (145 dosya)
- Kullanilmayan import temizligi
- `any` type elimination
- Toast alert modernizasyonu (window.alert → Toast notification)

### P11: Buyuk Dosya Refactoring (500+ satir)
Asagidaki dosyalar alt bilesenlere ayrildi:

| Dosya | Onceki | Sonraki | Durum |
|-------|--------|---------|-------|
| MizanOmurgaPanel | 1629 | ~237 | Tamamlandi |
| CrossCheckPanel | 1249 | ~353 | Tamamlandi |
| KpiStrip | 1155 | ~105 | Tamamlandi |
| q1-ozet/page | 809 | ~393 | Tamamlandi |
| KurganTab | 728 | ~350 | Tamamlandi |
| WhatIfAnalysis | 690 | ~137 | Tamamlandi |
| regwatch/page | 687 | ~233 | Tamamlandi |
| evidence | 661 | ~127 | Tamamlandi |
| AddClientModal | 643 | ~294 | Tamamlandi |
| upload | 636 | ~195 | Tamamlandi |
| enflasyon | 611 | ~137 | Tamamlandi |
| YatayDikeyAnaliz | 579 | ~300 | Tamamlandi |
| ContextRail | 578 | ~199 | Tamamlandi |
| AiDanismanTab | 574 | ~99 | ✅ Tamamlandi |
| KurganAlertPanel | 573 | ~186 | ✅ Tamamlandi |
| donem-sonu | 562 | ~300 | ✅ Tamamlandi |
| edefter/rapor | 575 | ~300 | ✅ Tamamlandi |
| HesapAnalizleriTab | 565 | ~211 | ✅ Tamamlandi |
| InflationPanel | 552 | ~175 | ✅ Tamamlandi |
| SektorKarsilastirma | 546 | ~153 | ✅ Tamamlandi |
| UploadModal | 545 | ~303 | ✅ Tamamlandi |
| MevzuatReferansModal | 529 | ~152 | ✅ Tamamlandi |
| KurumlarVergisiPanel | 521 | ~273 | ✅ Tamamlandi |
| RightRail | 509 | ~317 | ✅ Tamamlandi |
| vergi/kurumlar/page | 506 | ~297 | ✅ Tamamlandi |

### P11 Detayli Cikarilan Bilesenler

**AiDanismanTab (574→99):**
- `ProaktifUyarilar.tsx` - Proaktif uyari paneli
- `HizliOzetPanel.tsx` - Hizli ozet goruntuleme
- `DetayliAnalizPanel.tsx` - Detayli analiz goruntuleme
- `ChatPanel.tsx` - AI sohbet arayuzu

**KurganAlertPanel (573→186):**
- `kurganAlertHelpers.ts` - Tip tanimlari ve yardimci fonksiyonlar
- `KurganInfoModal.tsx` - Bilgi modali
- `KurganScenarioCard.tsx` - Senaryo karti bileseni

**HesapAnalizleriTab (565→211):**
- `hesapAnalizHelpers.ts` - Yardimci fonksiyonlar
- `KontrolCard.tsx` - Kontrol karti bileseni

**InflationPanel (552→175):**
- `inflationTypes.ts` - YiufeData, InflationItem, InflationResult tipleri
- `VukInfoModal.tsx` - VUK bilgi modali
- `YiufeIndicators.tsx` - Yi-UFE gostergeleri
- `InflationTable.tsx` - Enflasyon tablosu (LegalBasisRef[], TrustLevel tip duzeltmeleri)

**SektorKarsilastirma (546→153):**
- `sektorTypes.ts` - MukellefOranlari, ORAN_TANIMLARI, hesaplaSapma, formatDeger
- `OranDetayModal.tsx` - Oran detay modali
- `OranKarsilastirmaRow.tsx` - Karsilastirma satiri

**UploadModal (545→303):**
- `uploadModalTypes.ts` - Tip tanimlari
- `PipelineProgress.tsx` - Pipeline ilerleme gostergesi
- `IngestStatisticsView.tsx` - Yutma istatistikleri
- `UploadContent.tsx` - Yukleme icerik bileseni

**MevzuatReferansModal (529→152):**
- `mevzuatData.ts` - Mevzuat referans verileri
- `MevzuatReferansCard.tsx` - Referans karti bileseni

**KurumlarVergisiPanel (521→273):**
- `KontrolItem.tsx` - Kontrol ogesi (DURUM_ICONS, RISK_COLORS, TIP_CONFIG)
- `MatrahPlaceholder.tsx` - Matrah placeholder bileseni

**RightRail (509→317):**
- `RailCard.tsx` - Rail karti bileseni
- `QuickLink.tsx` - Hizli link bileseni
- `EksikBelgelerPopover.tsx` - Eksik belgeler popover
- `KanitPaketiPopover.tsx` - Kanit paketi popover

**vergi/kurumlar/page (506→297):**
- `KpiCard.tsx` - KPI karti bileseni
- `CalculationRow.tsx` - Hesaplama satiri
- `KontrolDetayModal.tsx` - Kontrol detay modali

---

## 14. BILINEN SORUNLAR VE NOTLAR

1. **PremiumHeader overflow-hidden:** Gradient arka plan div'inde `overflow-hidden` dropdown'lari kliplerdi → Dekoratif katmana tasindi (COZULDU)
2. **ClientSelector z-index:** Dropdown z-index `z-[9999]` olarak yukseltildi (COZULDU)
3. **RailHeader/RailNotFound RefObject:** `React.RefObject<HTMLButtonElement | null>` → `React.RefObject<HTMLButtonElement>` (COZULDU)
4. **InflationTable tip hatalari:** `string[]` → `LegalBasisRef[]`, `string` → `TrustLevel` (COZULDU)
5. **Backend baslangic:** MacBook restart sonrasi backend otomatik baslamaz, elle baslatilmali
6. **Paralel build:** Birden fazla `pnpm build` eslezamanlı calisirsa `.next` cache bozulur

---

## 15. BUILD DURUMU

```
✅ Son build: 07 Subat 2026 - BASARILI (SIFIR HATA)
✅ TypeScript strict mode: PASSED
✅ 75+ route basariyla olusturuldu
✅ En buyuk TSX dosyasi: 471 satir (vergus/page.tsx) - 500 limitinin altinda
```

---

## 16. YENI SESSION ICIN DIREKTIFLER

1. **Bu dosyayi okuduktan sonra** kullanicinin talimatini bekle
2. Backend calistigindan emin ol: `curl -s http://localhost:8000/docs | head -1`
3. Frontend calistigindan emin ol: `curl -s http://localhost:3000 | head -1`
4. Herhangi bir degisiklik yapmadan once **mutlaka `pnpm build` calistir** ve mevcut durumu dogrula
5. Import'larda `@/app/v2/...` KULLANMA, relative import kullan
6. `_lib/config/api.ts` merkezi endpoint kaynagi - hardcoded URL yasak
7. Her panel bileseninde `useScopeComplete()` kontrolu zorunlu
8. Dosyalar 500 satiri gecmemeli, gerekirse alt bilesenlere ayir

---

*Bu dokuman 07 Subat 2026 tarihinde guncellenmistir.*
*Branch: refactor/backend-upload*
*Son build durumu: ✅ BASARILI - SIFIR HATA*
