# LYNTOS PLATFORM BRIEF — Yeni Pencere İçin Kapsamlı Referans Dokümanı

> **Tarih:** 2025-01-27
> **Amaç:** Yeni Claude penceresi bu dokümanı okuyacak, platformun tamamını denetleyecek, teknik borç/hata/uyuşmazlık raporu yazacak ve "tavsiye mektubu" bekleniyor.

---

## 1. LYNTOS NEDİR?

LYNTOS, Türkiye'deki Serbest Muhasebeci Mali Müşavirler (SMMM) için geliştirilmiş bir **Mali Analiz ve Risk Değerlendirme Platformu**dur.

**Temel Misyon:** SMMM'lerin mükellefleri (kurumsal vergi mükellefleri) için dönemsel mali denetim, vergi risk analizi, mevzuat takibi ve raporlama süreçlerini dijitalleştirmek.

**Teknik Stack:**
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS v4
- **Backend:** Python FastAPI, SQLite veritabanı (localhost:8000)
- **Dizin:** `/Users/cemsak/lyntos/lyntos-ui` (frontend), `/Users/cemsak/lyntos/backend` (backend)
- **Paket Yönetici:** npm
- **Build:** `npx next build` (60/60 sayfa başarılı, son doğrulama)

---

## 2. KRİTİK KURALLAR VE YASAKLAR

### 2.1 Değiştirilmez Kurallar
| # | Kural | Açıklama |
|---|-------|----------|
| 1 | **Backend ASLA değiştirilmez** | `/backend/` altındaki hiçbir dosya frontend geliştirme sırasında modifiye edilmez. API sözleşmeleri mevcut haliyle korunur. |
| 2 | **Scope zorunluluğu** | Her API çağrısı `smmm_id`, `client_id`, `period` (veya `period_id`) parametreleri ile yapılır. Scope olmadan veri çekilmez. |
| 3 | **DEFTER_DIŞI izolasyonu** | SMMM tarafından "defter dışı" işaretlenen veriler risk hesaplamalarına, CFO dashboard'una ve KPI'lara kesinlikle dahil edilmez. |
| 4 | **Design token uyumu** | Tüm renkler `lib/ui/design-tokens.ts` kartelasından gelir. Hardcoded hex kullanılabilir ama karteladaki renklerle tutarlı olmalı. |
| 5 | **Mevcut bileşen yeniden kullanımı** | `app/v2/_components/shared/` altındaki Badge, Card, StatCard, DataFreshness vb. bileşenler yeniden yazılmaz, kullanılır. |
| 6 | **localStorage scope-aware key** | Tüm localStorage key'leri `lyntos_${feature}_${clientId}_${period}` formatında olmalı. Client/period değişiminde eski veri görünmemeli. |
| 7 | **Auth token pattern** | `getAuthToken()` fonksiyonu (`_lib/auth.ts`) kullanılır. Dev modda `DEV_HKOZKAN` bypass token'ı aktif. |

### 2.2 Mimari Yasaklar
- Monolitik sayfa yazılmaz (max ~200 satır orchestrator + bileşenler)
- API endpoint URL'leri hardcoded yazılmaz → `app/v2/_lib/config/api.ts` kullanılır
- `any` tipi kullanılmaz (TypeScript strict)
- `useEffect` dependency array'leri boş bırakılmaz (lint uyarısı)
- Inline style kullanılmaz (Tailwind CSS kullanılır)

### 2.3 Mevzuat Referansları
LYNTOS Türk vergi mevzuatına referans verir:
- **VUK** (Vergi Usul Kanunu): Md. 323 (şüpheli alacaklar), Md. 328 (amortismanlar)
- **TTK** (Türk Ticaret Kanunu): Şirket işlemleri, ticaret sicili
- **KVK** (Kurumlar Vergisi Kanunu): Kurumlar vergisi hesaplamaları
- **GVK** (Gelir Vergisi Kanunu): Geçici vergi
- **TDHP** (Tekdüzen Hesap Planı): Hesap kodları (1xx=Aktif, 2xx=Borçlar, 3xx=Özkaynaklar, 5xx=Gelir, 6xx=Gider, 7xx=Maliyet)

---

## 3. MİMARİ GENEL BAKIŞ

### 3.1 Provider Hiyerarşisi (Dıştan İçe)
```
RootLayout (app/layout.tsx)
  └─ V2Layout (app/v2/layout.tsx)
       └─ Suspense
            └─ SourcesProvider (veri kaynakları)
                 └─ DashboardShell (sidebar + header + layout)
                      └─ LayoutProvider (client/period/user seçimi)
                           └─ ScopeProvider (smmm_id, client_id, period → context)
                                └─ ToastProvider (bildirimler)
                                     └─ {children} (sayfa içeriği)
```

### 3.2 Scope Sistemi
`useDashboardScope()` hook'u tüm sayfalarda kullanılır:
```typescript
interface DashboardScope {
  smmm_id: string;    // Giriş yapan SMMM'nin ID'si
  client_id: string;  // Seçili mükellef
  period: string;     // Seçili dönem (2025-Q1 formatı)
  advanced: boolean;  // Gelişmiş mod
}
```
- Header'daki dropdown'lardan client ve period seçilir
- LayoutContext → ScopeProvider senkronizasyonu otomatik
- URL parametreleri temizlenir (güvenlik)

### 3.3 Veri Akışı
```
Header Dropdown (Client/Period seçimi)
  → LayoutContext güncellenir
    → ScopeProvider scope'u günceller
      → Sayfalar useDashboardScope() ile scope alır
        → useDonemData() veya özel hook'lar API çağrısı yapar
          → Backend response → UI render
```

### 3.4 Auth Sistemi
- JWT token, localStorage key: `lyntos_token`
- Dev bypass: `NEXT_PUBLIC_DEV_AUTH_BYPASS=1` → `DEV_HKOZKAN` token
- `getAuthToken()` → `Authorization: Bearer {token}` header
- `authFetch()` wrapper (bazı sayfalarda kullanılır)

---

## 4. NAVİGASYON YAPISI (8 KATEGORİ, 25+ MENÜ ÖĞESİ)

Navigasyon: `app/v2/_components/layout/navigation.ts`

### Kategori 1: KOKPİT
| Sayfa | Route | Dosya | Açıklama |
|-------|-------|-------|----------|
| Kokpit | `/v2` | `app/v2/page.tsx` | Ana dashboard, tüm KPI'lar, risk özeti, görevler |
| Q1 Beyanname Özet | `/v2/q1-ozet` | `app/v2/q1-ozet/page.tsx` | Çeyrek dönem beyanname özeti ve risk kontrolü |

### Kategori 2: VERİ & DEFTERLER
| Sayfa | Route | Dosya | Açıklama |
|-------|-------|-------|----------|
| Veri Yükleme | `/v2/upload` | `app/v2/upload/page.tsx` | ZIP/dosya yükleme (mizan, yevmiye, e-defter XML) |
| Mükellefler | `/v2/clients` | `app/v2/clients/page.tsx` | SMMM portföyündeki mükelleflerin listesi |
| Yevmiye Defteri | `/v2/yevmiye` | `app/v2/yevmiye/page.tsx` | Yevmiye fişleri listesi ve arama |
| Defteri Kebir | `/v2/kebir` | `app/v2/kebir/page.tsx` | Hesap bazlı muavin hareketleri |
| Banka Hareketleri | `/v2/banka` | `app/v2/banka/page.tsx` | Banka hesap hareketleri |
| Banka Mutabakat | `/v2/banka/mutabakat` | `app/v2/banka/mutabakat/page.tsx` | Banka - defter mutabakat kontrolü |
| Yevmiye-Kebir Kontrol | `/v2/cross-check` | `app/v2/cross-check/page.tsx` | 4 çapraz kontrol (borç-alacak, yevmiye-kebir, vb.) |
| E-Defter Raporları | `/v2/edefter/rapor` | `app/v2/edefter/rapor/page.tsx` | E-defter XML raporları |

### Kategori 3: RİSK & ANALİZ
| Sayfa | Route | Dosya | Açıklama |
|-------|-------|-------|----------|
| VDK Risk Analizi | `/v2/vdk` | `app/v2/vdk/page.tsx` | KURGAN risk skorlama (16 VDK senaryosu), 5 tab |
| Kural Kütüphanesi | `/v2/risk/rules` | `app/v2/risk/rules/page.tsx` | Risk kuralları listesi |

### Kategori 4: VERGİ & ANALİZ
| Sayfa | Route | Dosya | Açıklama |
|-------|-------|-------|----------|
| Vergi Stratejisti (VerGüS) | `/v2/vergus` | `app/v2/vergus/page.tsx` | AI destekli vergi stratejisi |
| Dönem Sonu İşlemleri | `/v2/donem-sonu` | `app/v2/donem-sonu/page.tsx` | Dönem sonu kontrol listesi |
| Geçici Vergi | `/v2/vergi/gecici` | `app/v2/vergi/gecici/page.tsx` | Geçici vergi hesaplama |
| Kurumlar Vergisi | `/v2/vergi/kurumlar` | `app/v2/vergi/kurumlar/page.tsx` | Kurumlar vergisi hesaplama |
| Cari Mutabakat | `/v2/mutabakat` | `app/v2/mutabakat/page.tsx` | Cari hesap ekstre mutabakatı (YENİ — detaylı) |
| Yeniden Değerleme | `/v2/enflasyon` | `app/v2/enflasyon/page.tsx` | VUK Mükerrer Md. 298 enflasyon düzeltmesi |

### Kategori 5: MEVZUAT & KURUMSAL
| Sayfa | Route | Dosya | Açıklama |
|-------|-------|-------|----------|
| Mevzuat Takibi | `/v2/regwatch` | `app/v2/regwatch/page.tsx` | Mevzuat değişiklik takibi (RegWatch) |
| Şirket İşlemleri | `/v2/corporate` | `app/v2/corporate/page.tsx` | TTK uyum ve şirket işlemleri |
| Ticaret Sicili | `/v2/registry` | `app/v2/registry/page.tsx` | Şirket ticaret sicili kayıtları |
| Chat Asistanı | `/v2/corporate/chat` | `app/v2/corporate/chat/page.tsx` | Mevzuat/kurumsal AI chat |

### Kategori 6: PRATİK BİLGİLER
| Sayfa | Route | Dosya | Açıklama |
|-------|-------|-------|----------|
| Tüm Bilgiler | `/v2/pratik-bilgiler` | `app/v2/pratik-bilgiler/page.tsx` | Vergi oranları, parametreler, referans |
| Hesaplamalar | `/v2/pratik-bilgiler/hesaplamalar` | alt sayfa | Pratik hesaplama araçları |
| Kontrol Listeleri | `/v2/pratik-bilgiler/kontrol-listeleri` | alt sayfa | Dönemsel kontrol listeleri |

### Kategori 7: RAPORLAR
| Sayfa | Route | Dosya | Açıklama |
|-------|-------|-------|----------|
| Raporlar | `/v2/reports` | `app/v2/reports/page.tsx` | Tüm rapor çıktıları |
| Kanıt Paketi | `/v2/reports/evidence` | `app/v2/reports/evidence/page.tsx` | Big 4 audit trail kanıt paketi |

### Kategori 8: SİSTEM
| Sayfa | Route | Dosya | Açıklama |
|-------|-------|-------|----------|
| Ayarlar | `/v2/settings` | `app/v2/settings/page.tsx` | Platform ayarları |
| Yardım | `/v2/help` | `app/v2/help/page.tsx` | Yardım ve dokümantasyon |

---

## 5. BACKEND API YAPISI

### 5.1 API Endpoint Konfigürasyonu
Merkezi config: `app/v2/_lib/config/api.ts`
Base URL: `process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'`

### 5.2 V2 API Endpoint Grupları
```
/api/v2/donem/          → sync, status/{periodId}, clear/{periodId}
/api/v2/mizan/          → sync, summary/{periodId}, entries/{periodId}, clear/{periodId}
/api/v2/mizan-data/     → available, load/{smmm}/{client}/{period}, analyze/..., account/...
/api/v2/cross-check/    → run/{periodId}, status/{periodId}
/api/v2/cari-mutabakat/ → ozet, list, upload, onayla
/api/v2/kebir/          → hesap/{hesapKodu}
/api/v2/banka/          → islemler
/api/v2/yevmiye/        → list
```

### 5.3 V1 API Endpoint Grupları (Legacy, hâlâ kullanılıyor)
```
/api/v1/contracts/      → kurgan-risk, data-quality, cross-check, quarterly-tax,
                          corporate-tax, corporate-tax-forecast, inflation-adjustment,
                          regwatch-status, actionable-tasks
/api/v1/chat/           → corporate, regwatch
/api/v1/ai/             → analyze/regwatch, analyze/company, analyze/batch, analyses
/api/v1/registry/       → companies, portfolio/{smmmId}
/api/v1/regwatch/       → changes, stats
```

### 5.4 Backend Servis Modülleri (66 dosya)
En büyük servisler:
- `kurgan_calculator.py` (161KB) — KURGAN risk skorlama motoru
- `mizan_omurga.py` (91KB) — Mizan omurga analizi
- `cross_check_service.py` — Çapraz kontrol servisi
- `cari_mutabakat_service.py` (656 satır) — Cari mutabakat
- `tax_*.py` serisi — Vergi hesaplamaları

---

## 6. DESIGN SYSTEM (LYNTOS KAIZEN)

### 6.1 Renk Paleti (`lib/ui/design-tokens.ts`)
```
Mavi:    #00287F → #0049AA (PRIMARY) → #0078D0 → #00B4EB → #5ED6FF → #ABEBFF
Turuncu: #E67324 → #FA841E → #FFB114 (WARNING) → #FFCE19 → #FFE045 → #FFF08C
Yeşil:   #005A46 → #00804D → #00A651 (SUCCESS) → #00CB50 → #6BDB83 → #AAE8B8
Kırmızı: #980F30 (CRITICAL) → #BF192B → #F0282D (ERROR) → #FF555F → #FF9196 → #FFC7C9
Nötr:    #000000 → #2E2E2E (TEXT) → #5A5A5A → #969696 → #B4B4B4 → #E5E5E5 → #F5F6F8 (BG)
```

### 6.2 Risk Seviyeleri
| Seviye | Renk | Skor | KURGAN Aksiyonu |
|--------|------|------|-----------------|
| Kritik | #980F30 | 80-100 | İnceleme (90+) |
| Yüksek | #F0282D | 60-79 | İzaha Davet (75-89) |
| Orta | #FFB114 | 40-59 | Bilgi İsteme (60-74) |
| Düşük | #00A651 | 20-39 | Takip (0-59) |
| Normal | #5A5A5A | 0-19 | — |

### 6.3 Shared Bileşenler (`app/v2/_components/shared/`)
| Bileşen | Dosya | Props |
|---------|-------|-------|
| Badge | `Badge.tsx` | variant: default/success/warning/error/info/purple/money, size: sm/md/lg, style: soft/solid/outline/gradient, icon? |
| Card | `Card.tsx` | variant: default/elevated/outlined/highlight/stat, children |
| StatCard | `StatCard.tsx` | label, value, icon, trend?, bgClass, valueClass |
| DataFreshness | `DataFreshness.tsx` | lastUpdated: string/null |
| EvidenceModal | `EvidenceModal.tsx` | İnceleme kanıtı modal penceresi |
| PanelState | `PanelState.tsx` | loading/error/empty durumları |
| RiskProgressBar | `RiskProgressBar.tsx` | Risk skor çubuğu |
| Toast | `Toast.tsx` | Bildirim sistemi |
| MevzuatTag | `MevzuatTag.tsx` | Mevzuat referans etiketi |

### 6.4 Tipografi
```
heading.xl: text-2xl font-bold
heading.lg: text-lg font-semibold
heading.md: text-base font-semibold
body.md: text-sm
body.sm: text-xs
caption: text-xs text-slate-500
mono: font-mono text-sm
```

### 6.5 CSS Animasyonları (`globals.css`)
- `shimmer` — Yükleme efekti
- `slideUp` — Aşağıdan yukarı kayma
- `popIn` — Ölçeklenerek belirme
- `glowPulse` — Nabız efekti
- `slide-in-right` — Sağdan panel kayması (Tailwind config'de)
- `.hover-lift` — Hover kaldırma efekti
- `.hover-glow` — Hover parlama efekti

---

## 7. CANONICAL HOOK'LAR

### 7.1 useDonemData (Ana Veri Hook'u)
```typescript
// Tüm dashboard verisini tek endpoint'ten alır
const { data, isLoading, error, refetch } = useDonemData();
// data.mizan, data.analysis.vdk_risks, data.files, vb.
```
- localStorage KULLANMAZ, tüm veri backend'den gelir
- Scope değişiminde otomatik refetch

### 7.2 useBackendFeed
- Backend'den feed/bildirim akışı
- Polling mekanizması

### 7.3 useRightRailData
- Sağ panel (right rail) verisi
- Görevler, uyarılar, aksiyon öğeleri

### 7.4 useDashboardScope
- Scope context'i okur (smmm_id, client_id, period)
- Tüm sayfalarda kullanılır

### 7.5 useScopeComplete
- Scope'un tamam olup olmadığını kontrol eder
- `smmm_id && client_id && period` → true

---

## 8. CARİ MUTABAKAT MODÜLÜ (YENİ İMPLEMENTASYON)

### 8.1 Dosya Yapısı
```
app/v2/mutabakat/
├── page.tsx                     # Orchestrator (~170 satır)
├── _types/cariMutabakat.ts      # Tüm tipler, config'ler, sabitler
├── _hooks/
│   ├── useCariMutabakat.ts      # Data fetch + karar state (localStorage)
│   ├── useRootCauseEngine.ts    # Enrichment: root cause + SMMM karar
│   └── useEvidenceSearch.ts     # 4 paralel kanıt API çağrısı
├── _components/
│   ├── CariMutabakatHeader.tsx  # Upload zone + filtre bar
│   ├── OzetKartlari.tsx         # 5 KPI kart
│   ├── MutabakatTablosu.tsx     # Ana tablo (RootCause + Karar kolonları)
│   ├── SatirDetayPanel.tsx      # Slide-over detay paneli
│   ├── EvidenceBlocks.tsx       # 4 kanıt bloğu (Defter/Banka/Kasa/Mahsup)
│   ├── SmmmKararDropdown.tsx    # SMMM karar seçici
│   ├── RootCauseTag.tsx         # Root cause badge
│   ├── FinalizeGate.tsx         # Sonuçlandırma kapısı
│   └── RaporOlustur.tsx         # 3 rapor butonu
└── _lib/
    └── rootCauseAnalysis.ts     # Pure function: 7-adım karar ağacı
```

### 8.2 Root Cause Karar Ağacı
```
1. fark ≤ 10 TL (tolerans)     → UYUMLU
2. mizan > 0, ekstre = 0       → EKSTRE_EKSIK
3. mizan = 0, ekstre > 0       → KAYITSIZ_HAREKET
4. Son hareket dönem son 5 gün  → CUT_OFF (şimdilik devre dışı, muavinSonHareket=null)
5. Fark küçük yuvarlak sayı    → YUVARLAMA
6. aging > 365 gün              → SUPHELI_ALACAK (VUK 323)
7. Hiçbiri uymaz                → BILINMEYEN_FARK
```

### 8.3 SMMM Karar Sistemi
| Karar | Rapor Etkisi | Risk Etkisi |
|-------|-------------|-------------|
| RESMİ | Resmi Mutabakat Raporu'na girer | Risk hesabına dahil |
| DEFTER_DIŞI | Defter Dışı Bilgi Raporu'na girer | Risk/KPI'ya 0 etki |
| BİLİNMİYOR | Açık Konular Raporu'na girer | Finalize engeli |

### 8.4 Bilinen Sınırlamalar
- `muavinSonHareket: null` → CUT_OFF tespiti devre dışı (TODO: Kebir API'den çekilecek)
- Kararlar localStorage'da (backend'e persist edilmiyor)
- Banka filtresi client-side text match (karsiTaraf adı ile)

---

## 9. KURGAN RİSK SKORLAMA SİSTEMİ

KURGAN, VDK (Vergi Denetim Kurulu) senaryolarını simüle eden risk skorlama motorudur.

### 9.1 16 VDK Senaryosu
Backend'de `kurgan_calculator.py` (161KB) ile hesaplanır.
Frontend'de `/v2/vdk` sayfasında 5 tab halinde gösterilir:
1. Genel Bakış
2. Kural Detayları
3. Senaryo Analizi
4. Trend
5. Aksiyon Planı

### 9.2 Aksiyonlar
| Skor | Aksiyon | Anlamı |
|------|---------|--------|
| 90-100 | İnceleme | VDK incelemesi muhtemel |
| 75-89 | İzaha Davet | İzaha davet gelebilir |
| 60-74 | Bilgi İsteme | Bilgi isteme yazısı gelebilir |
| 0-59 | Takip | Normal takip |

---

## 10. DOĞRULAMA DURUMU

### Son Build (27 Ocak 2025)
- `npx tsc --noEmit` → **0 hata**
- `npx next build` → **60/60 sayfa başarılı**
- Cari Mutabakat modülü → **28/28 kontrol geçti**, 6 teknik borç düzeltildi

### Bilinen Teknik Borçlar (Platform Geneli — DENETLENMEDİ)
Cari Mutabakat modülü dışındaki sayfalar henüz kapsamlı denetimden geçmedi. Yeni pencere şunları kontrol etmeli:

- [ ] Tüm sayfalarda `API_ENDPOINTS` kullanımı (hardcoded URL var mı?)
- [ ] Tüm sayfalarda scope kontrolü (`useScopeComplete` kullanılıyor mu?)
- [ ] Unused import'lar (tüm dosyalarda)
- [ ] Error boundary eksiklikleri
- [ ] Loading/error/empty state tutarlılığı
- [ ] a11y (erişilebilirlik) eksiklikleri
- [ ] Responsive tasarım sorunları
- [ ] Backend API sözleşme uyumu (tüm sayfalar)
- [ ] Design token tutarlılığı (hardcoded renkler vs kartela)
- [ ] Monolitik sayfalar (bölünmesi gereken büyük dosyalar)
- [ ] localStorage key izolasyonu (scope-aware mi?)
- [ ] TypeScript `any` kullanımları
- [ ] Dead code / unreachable code
- [ ] Eksik veya yanlış tiplemeler
- [ ] Hook dependency array sorunları

---

## 11. ÖNEMLİ DOSYA REFERANSLARI

### Konfigürasyon
```
tailwind.config.ts                          # Tailwind v4 + custom animasyonlar
lib/ui/design-tokens.ts                     # Renk paleti, risk seviyeleri, tipografi
app/v2/_lib/config/api.ts                   # Tüm API endpoint'leri
app/v2/_lib/auth.ts                         # Auth token yönetimi
app/v2/_lib/authFetch.ts                    # Auth wrapper fetch
```

### Layout & Navigation
```
app/v2/layout.tsx                           # V2 root layout
app/v2/_components/layout/DashboardShell.tsx # Sidebar + header + content area
app/v2/_components/layout/navigation.ts     # 8 kategori, 25+ menü öğesi
app/v2/_components/layout/useLayoutContext.tsx # Layout context hook
app/v2/_components/scope/ScopeProvider.tsx   # Scope context (smmm_id, client_id, period)
```

### Shared Bileşenler
```
app/v2/_components/shared/Badge.tsx         # 7 variant, 3 style
app/v2/_components/shared/Card.tsx          # 5 variant
app/v2/_components/shared/StatCard.tsx      # KPI kartı
app/v2/_components/shared/DataFreshness.tsx # Son güncelleme göstergesi
app/v2/_components/shared/Toast.tsx         # Bildirim sistemi
```

### Hook'lar
```
app/v2/_hooks/useDonemData.ts               # Ana veri hook'u
app/v2/_hooks/useBackendFeed.ts             # Backend feed
app/v2/_hooks/useRightRailData.ts           # Sağ panel verisi
app/v2/_components/scope/useDashboardScope.ts # Scope hook
```

---

## 12. BACKEND KLASÖR YAPISI (Referans)

```
backend/
├── api/
│   ├── v1/                    # Legacy endpoint'ler
│   └── v2/                    # Aktif endpoint'ler
│       ├── donem.py
│       ├── mizan.py
│       ├── mizan_data.py
│       ├── cross_check.py
│       ├── cari_mutabakat.py
│       ├── kebir.py
│       ├── banka.py
│       └── yevmiye.py
├── services/                   # 66 servis modülü
│   ├── kurgan_calculator.py   # 161KB — risk motoru
│   ├── mizan_omurga.py        # 91KB — mizan analizi
│   ├── cari_mutabakat_service.py
│   ├── cross_check_service.py
│   ├── tax_*.py               # Vergi hesaplamaları
│   └── ...
├── models/                     # SQLAlchemy modelleri
└── main.py                     # FastAPI app
```

---

## 13. BANKA MUTABAKAT (AYRI MODÜL — DOKUNULMAZ)

`/v2/banka/mutabakat` sayfası Cari Mutabakat'tan tamamen bağımsızdır.
- Farklı API endpoint'leri kullanır
- Farklı iş mantığı (banka ↔ defter karşılaştırması)
- Bu sayfaya yapılan değişiklikler Cari Mutabakat'ı etkilemez ve tersi

---
