# LYNTOS V2 — Teknik Borç Temizleme Brief'i

> **Tarih:** 4 Şubat 2026
> **Hedef:** 3 büyük teknik borcu çöz: İkili scope sistemi, HKOZKAN fallback'leri, localStorage iş verisi
> **Önceki Sprint:** 25 adımlık IS revizyon planı %100 tamamlandı, TypeScript + Build geçiyor

---

## SEN KİMSİN

Sen **LYNTOS V2 Frontend Teknik Borç Mühendisi**sin.

**Uzmanlıkların:**
- Next.js 15 App Router + React 19 + TypeScript mimarisi
- React Context API tasarımı ve provider refactoring
- Türk muhasebe yazılımı terminolojisi (SMMM, YMM, Mizan, Kebir, Yevmiye, KDV, Muhtasar)
- Güvenli auth token yönetimi ve dev/production ayrımı
- State management geçişleri (localStorage → Context → API)

**Görevin:**
Bu brief'i oku, codebase'i analiz et (MCP ve tüm araçları kullan), 3 teknik borç için kapsamlı bir plan yaz, kullanıcının onayını al, sonra uygula.

---

## İŞ AKIŞI

```
1. Bu brief'i oku ve anla
2. Codebase'i derinlemesine incele (MCP kullanarak browser'da da test et)
3. Her 3 teknik borç için bağımsız analiz yap
4. Kullanıcıya sorular sor (yaklaşım tercihleri, öncelikler)
5. Plan yaz ve onaya sun
6. Onay sonrası uygula
7. Her adımda: npx tsc --noEmit + npx next build
```

---

## PROJE MİMARİSİ

### Teknoloji Stack
- **Next.js 15** (App Router, `app/v2/` altında)
- **React 19** (use client directive)
- **TypeScript** (strict mode)
- **Tailwind CSS v4**
- **Backend:** FastAPI (Python) — `http://localhost:8000`

### Provider Hiyerarşisi (KRİTİK!)
```
DashboardShell
  └── LayoutProvider          ← useLayoutContext() kaynağı
       └── ScopeProvider      ← useDashboardScope() kaynağı (LayoutContext'e bağımlı!)
            └── ToastProvider
                 └── Page
```

**ScopeProvider, LayoutProvider'ın İÇİNDE.** Yani `useDashboardScope()`, aslında `useLayoutContext()`'ten veri alıyor ve onu `{ smmm_id, client_id, period, advanced }` formatına dönüştürüyor.

### Dosya Yapısı
```
app/v2/
├── _components/
│   ├── layout/
│   │   ├── DashboardShell.tsx       ← Ana shell, provider nesting
│   │   ├── useLayoutContext.tsx      ← ESKİ scope sistemi (LayoutProvider + Context)
│   │   ├── useLayoutData.ts         ← API'den user/clients/periods çeker
│   │   ├── types.ts                 ← User, Client, Period, LayoutContextType tipleri
│   │   ├── PremiumHeader.tsx        ← Header bileşeni
│   │   ├── TopBar.tsx               ← Üst bar
│   │   ├── ClientSelector.tsx       ← Client seçici dropdown
│   │   ├── PeriodSelector.tsx       ← Dönem seçici dropdown
│   │   └── navigation.ts           ← Sol menü yapısı
│   ├── scope/
│   │   ├── ScopeProvider.tsx        ← YENİ scope sistemi (useLayoutContext'e bağımlı!)
│   │   ├── useDashboardScope.ts     ← Re-export + helper hooks
│   │   ├── ScopeSelector.tsx        ← Scope seçici UI
│   │   └── DataEntryGuard.tsx       ← Scope guard wrapper
│   └── shared/
│       └── DataFreshness.tsx        ← Veri tazeliği göstergesi
├── _lib/
│   ├── auth.ts                      ← Auth token yönetimi (HKOZKAN burada!)
│   ├── authFetch.ts                 ← Authenticated fetch utility
│   ├── config/api.ts                ← Merkezi API URL config
│   └── exportCsv.ts                ← CSV export helper
├── _hooks/
│   ├── useMizanData.ts             ← Mizan veri çekici (HKOZKAN fallback!)
│   ├── useBackendFeed.ts           ← Backend feed hook (HKOZKAN fallback!)
│   └── useCorporateTax.ts          ← Kurumlar vergisi hook
└── [sayfalar]/                      ← 30+ sayfa dosyası
```

---

## TEKNİK BORÇ 1: İKİLİ SCOPE SİSTEMİ

### Durum
İki farklı scope mekanizması var:

**ESKİ: `useLayoutContext()`** — 10 sayfa + 12 bileşen kullanıyor
```typescript
// Döndürdükleri:
interface LayoutContextType {
  user: User | null;                    // { id, name, title, email, initials }
  selectedClient: Client | null;        // { id, name, shortName, vkn, riskLevel, ... }
  selectedPeriod: Period | null;        // { id, code, label, year, periodNumber, ... }
  clients: Client[];
  periods: Period[];
  loading: boolean;
  error: string | null;
  setSelectedClient: (client: Client | null) => void;
  setSelectedPeriod: (period: Period | null) => void;
  refreshPeriods: (clientId: string) => Promise<void>;
}
```

**YENİ: `useDashboardScope()`** — 18 sayfa + 33 bileşen kullanıyor
```typescript
// Döndürdükleri:
interface ScopeContextValue {
  scope: {
    smmm_id: string;      // = user?.id || ''
    client_id: string;     // = selectedClient?.id || ''
    period: string;        // = selectedPeriod?.code || '' (2025-Q1 formatı)
    advanced: boolean;
  };
  setScope: (updates: Partial<DashboardScope>) => void;
  isReady: boolean;
}
```

### Sorun
- `useDashboardScope` zaten `useLayoutContext`'ten veri alıyor (ScopeProvider satır 30)
- Ama bazı sayfalar `useLayoutContext`'i doğrudan kullanıyor
- `useLayoutContext` zengin tipler döndürür (Client objesi, Period objesi)
- `useDashboardScope` düz string'ler döndürür (client_id, period)
- Bazı sayfalar `selectedClient.name`, `selectedPeriod.year` gibi zengin alanlara ihtiyaç duyuyor

### useLayoutContext Kullanan Sayfalar (HER BİRİ İÇİN NEDEN KULLANDIĞINI KONTROL ET)

| Dosya | Kullandığı Alanlar | Neden |
|-------|-------------------|-------|
| `upload/page.tsx` | `selectedClient, selectedPeriod, user` | `selectedClient.id`, `selectedPeriod.year`, `selectedPeriod.periodNumber`, `user.id` |
| `clients/page.tsx` | `user` | `user.id` (smmmId olarak API'ye gönderiliyor) |
| `donem-sonu/page.tsx` | `selectedClient, selectedPeriod` | `selectedClient.id`, `selectedPeriod.code` |
| `q1-ozet/page.tsx` | `selectedClient, selectedPeriod, user` | `selectedClient.id`, `selectedClient.name`, `selectedPeriod.code`, `user.id` |
| `vergus/page.tsx` | `selectedClient, selectedPeriod` | `selectedClient.id`, `selectedClient.name`, `selectedPeriod.code` |
| `vergi/gecici/page.tsx` | `selectedPeriod` | `selectedPeriod.year`, `selectedPeriod.periodNumber` |
| `mutabakat/page.tsx` | `selectedClient, selectedPeriod` | `selectedClient.id`, `selectedPeriod.code` |
| `vdk/_components/VdkHeader.tsx` | `selectedClient` | `selectedClient.name`, `selectedClient.vkn` |
| `_components/smmm/SirketUyumDurumuPanel.tsx` | `selectedClient` | `selectedClient.name`, `selectedClient.vkn`, `selectedClient.naceCode` |
| `_components/smmm/useSirketUyum.ts` | `selectedClient` | `selectedClient.id`, `selectedClient.name` |

### Layout-Only Bileşenler (DOKUNMA — bunlar layout infra'sı)

| Dosya | Neden |
|-------|-------|
| `PremiumHeader.tsx` | Header UI — user, client gösterir |
| `TopBar.tsx` | Üst bar — user gösterir |
| `ClientSelector.tsx` | Client dropdown — setSelectedClient |
| `PeriodSelector.tsx` | Dönem dropdown — setSelectedPeriod |
| `InlinePeriodSelector.tsx` | Inline dönem seçici |
| `TimelinePeriodSelector.tsx` | Timeline dönem seçici |
| `UserGreeting.tsx` | Kullanıcı selamı |
| `ScopeSelector.tsx` | Scope seçici UI |
| `ScopeProvider.tsx` | Scope provider — bridge |

---

## TEKNİK BORÇ 2: HKOZKAN DEV FALLBACK'LERİ

### Durum
`HKOZKAN`, development ortamında kullanılan sabit SMMM ID'si. Auth sistemi henüz production'da tamamlanmadı, bu yüzden dev modda bu ID fallback olarak kullanılıyor.

### Mimari (Zaten İyi Olan Kısım)
`_lib/auth.ts` merkezi auth yöneticisi:
```typescript
const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';
const DEV_TOKEN = 'DEV_HKOZKAN';

export function getAuthToken(): string | null {
  const token = localStorage.getItem('lyntos_token');
  if (!token && DEV_AUTH_BYPASS) return DEV_TOKEN;
  return token;
}
```

Bu merkezi sistem iyi tasarlanmış. Sorun, bazı dosyaların bu merkezi sistemi BYPASS EDİP doğrudan `'HKOZKAN'` string literal kullanması.

### HKOZKAN Occurrence Haritası

| Dosya | Satır | Kullanım | Durum |
|-------|-------|----------|-------|
| `_lib/auth.ts` | 12 | `DEV_TOKEN = 'DEV_HKOZKAN'` | ✅ Merkezi tanım — DOKUNMA |
| `_lib/auth.ts` | 6,23 | Yorumlarda | ✅ Yorum — DOKUNMA |
| `_lib/authFetch.ts` | 3,19 | Yorumlarda | ✅ Yorum — DOKUNMA |
| `_hooks/useBackendFeed.ts` | 200 | Yorumda | ✅ Yorum — DOKUNMA |
| `_components/hooks/useFailSoftFetch.ts` | 42,81 | Yorumlarda | ✅ Yorum — DOKUNMA |
| `_components/layout/useLayoutData.ts` | 8,28 | Yorumlarda | ✅ Yorum — DOKUNMA |
| **`upload/page.tsx`** | **203** | **`user?.id \|\| 'HKOZKAN'`** | 🔴 **DOĞRUDAN FALLBACK** |
| **`clients/page.tsx`** | **293** | **`user?.id \|\| 'HKOZKAN'`** | 🔴 **DOĞRUDAN FALLBACK** |
| **`_components/modals/UploadModal.tsx`** | **122** | **`scope.smmm_id \|\| 'HKOZKAN'`** | 🔴 **DOĞRUDAN FALLBACK** |
| **`_hooks/useMizanData.ts`** | **91-92, 179-180** | **`smmmId.includes('HKOZKAN')` → `'HKOZKAN'`** | 🔴 **NORMALIZASYON** |

### Çözüm Yönü
- `upload.tsx` ve `clients.tsx`: `user?.id` zaten `useLayoutContext()`'ten geliyor. `user` null olursa scope incomplete olmalı — fallback yerine guard ekle
- `UploadModal.tsx`: `scope.smmm_id` zaten ScopeProvider'dan geliyor. Boşsa upload engellemeli
- `useMizanData.ts`: Bu normalizasyon backend'in `HKOZKAN` yerine `DEV_HKOZKAN` token beklemesinden kaynaklanıyor olabilir — backend davranışını kontrol et

---

## TEKNİK BORÇ 3: localStorage İŞ VERİSİ

### Durum
15 dosya localStorage kullanıyor. Bazıları meşru (UI tercihleri), bazıları iş verisi (kaybedilmemeli).

### Kategorizasyon

**KATEGORİ A: MEŞRu UI TERCİHLERİ — DOKUNMA**
| Dosya | Key | Veri | Neden Meşru |
|-------|-----|------|-------------|
| `useSidebarState.ts` | `lyntos-sidebar-collapsed` | boolean | Sidebar açık/kapalı |
| `useLayoutContext.tsx` | `lyntos-selected-client`, `lyntos-selected-period` | string (ID) | Son seçilen client/period — UX kolaylığı |
| `ScopeProvider.tsx` | `lyntos_scope` | JSON | Scope senkronizasyonu — URL'ye de yazılıyor |
| `settings/page.tsx` | `lyntos-settings`, `lyntos_profile` | JSON | Kullanıcı ayarları |
| `auth.ts` | `lyntos_token` | string | Auth token — standart yaklaşım |

**KATEGORİ B: İŞ VERİSİ — BACKEND'E TAŞINMALI**
| Dosya | Key | Veri | Risk |
|-------|-----|------|------|
| `donem-sonu/page.tsx` | `lyntos_donem_sonu_{clientId}_{periodId}` | `{ completedSteps: number[] }` | Dönem sonu adım durumu — tarayıcı temizlenirse kaybolur |
| `enflasyon/page.tsx` | `lyntos_enflasyon_{clientId}_{periodId}` | `{ completedSteps: number[] }` | Enflasyon muhasebesi adım durumu |
| `reports/page.tsx` | `lyntos_uploaded_data`, `lyntos_clients` | JSON | Upload ve client verisi — stale olabilir |
| `regwatch/[id]/page.tsx` | `regwatch-{id}` | `{ aksiyonlar: [...] }` | Mevzuat aksiyonları durumu |
| `_components/operations/useRegWatchState.ts` | `lyntos-regwatch-states` | JSON | Mevzuat tarama durumları |
| `_components/operations/useRegWatchScan.ts` | `lyntos-regwatch-last-scan` | timestamp | Son tarama zamanı |
| `_components/operations/RegWatchPanel.tsx` | `lyntos-regwatch-active` | boolean | Regwatch aktif mi |
| `_components/panels/MevzuatSummaryPanel.tsx` | `lyntos-regwatch-active` | boolean | Aynı key |
| `vdk/_components/tabs/vdk-oracle/DocumentChecklist.tsx` | `vdk-oracle-checklist-{id}` | Set<string> | VDK belge checklist durumu |
| `_lib/stores/donemStore.ts` | zustand persist | JSON | Dönem store verisi |

**KATEGORİ C: GRUPLAMA**
- **donem-sonu + enflasyon:** `completedSteps` → Backend'de `step_status` tablosu
- **regwatch + mevzuat:** Tarama durumu → Backend'de `regwatch_state` tablosu
- **vdk checklist:** Belge durumu → Backend'de `document_check` tablosu
- **reports:** Zaten backend'den gelmeli, localStorage cache'i temizlenmeli

---

## MEVCUT SOL MENÜ YAPISI (Referans)

```
📊 Kokpit (/v2)
📊 Q1 Beyanname Özet & Risk Kontrolü (/v2/q1-ozet)

📁 Veri & Defterler
   ├── Veri Yükleme (/v2/upload)
   ├── Mükellefler (/v2/clients)
   ├── Yevmiye Defteri (/v2/yevmiye)
   ├── Defteri Kebir (/v2/kebir)
   ├── Banka Hareketleri (/v2/banka)
   ├── Banka Mutabakat (/v2/banka/mutabakat)
   ├── Yevmiye-Kebir Kontrol (/v2/cross-check)
   └── E-Defter Raporları (/v2/edefter/rapor)

🔍 Risk & Analiz
   ├── VDK Risk Analizi (/v2/vdk)
   └── Kural Kütüphanesi (/v2/risk/rules)

💰 Vergi & Analiz
   ├── Vergi Stratejisti (/v2/vergus)
   ├── Dönem Sonu İşlemleri (/v2/donem-sonu)
   ├── Geçici Vergi (/v2/vergi/gecici)
   ├── Kurumlar Vergisi (/v2/vergi/kurumlar)
   ├── Cari Mutabakat (/v2/mutabakat)
   └── Yeniden Değerleme (/v2/enflasyon)

📜 Mevzuat & Kurumsal
   ├── Mevzuat Takibi (/v2/regwatch)
   ├── Şirket İşlemleri (/v2/corporate)
   ├── Ticaret Sicili (/v2/registry)
   └── Chat Asistanı (/v2/corporate/chat)

📚 Pratik Bilgiler
📄 Raporlar
⚙️ Sistem
```

---

## BAŞLAMADAN ÖNCE YAPMAN GEREKENLER

### Adım 1: Brief'i Oku (BU DOSYA)
Bu dosyayı baştan sona oku ve anla.

### Adım 2: Codebase Keşfi
Aşağıdaki dosyaları OKU ve anla:

```
# Scope sistemi
/Users/cemsak/lyntos/lyntos-ui/app/v2/_components/layout/useLayoutContext.tsx
/Users/cemsak/lyntos/lyntos-ui/app/v2/_components/layout/types.ts
/Users/cemsak/lyntos/lyntos-ui/app/v2/_components/layout/useLayoutData.ts
/Users/cemsak/lyntos/lyntos-ui/app/v2/_components/layout/DashboardShell.tsx
/Users/cemsak/lyntos/lyntos-ui/app/v2/_components/scope/ScopeProvider.tsx
/Users/cemsak/lyntos/lyntos-ui/app/v2/_components/scope/useDashboardScope.ts

# Auth sistemi
/Users/cemsak/lyntos/lyntos-ui/app/v2/_lib/auth.ts
/Users/cemsak/lyntos/lyntos-ui/app/v2/_lib/authFetch.ts

# HKOZKAN kullanan sayfalar
/Users/cemsak/lyntos/lyntos-ui/app/v2/upload/page.tsx
/Users/cemsak/lyntos/lyntos-ui/app/v2/clients/page.tsx
/Users/cemsak/lyntos/lyntos-ui/app/v2/_components/modals/UploadModal.tsx
/Users/cemsak/lyntos/lyntos-ui/app/v2/_hooks/useMizanData.ts

# localStorage kullanan kritik sayfalar
/Users/cemsak/lyntos/lyntos-ui/app/v2/donem-sonu/page.tsx
/Users/cemsak/lyntos/lyntos-ui/app/v2/enflasyon/page.tsx
/Users/cemsak/lyntos/lyntos-ui/app/v2/reports/page.tsx
/Users/cemsak/lyntos/lyntos-ui/app/v2/regwatch/[id]/page.tsx

# useLayoutContext kullanan sayfalar (scope migration hedefleri)
/Users/cemsak/lyntos/lyntos-ui/app/v2/q1-ozet/page.tsx
/Users/cemsak/lyntos/lyntos-ui/app/v2/vergus/page.tsx
/Users/cemsak/lyntos/lyntos-ui/app/v2/donem-sonu/page.tsx
/Users/cemsak/lyntos/lyntos-ui/app/v2/vergi/gecici/page.tsx
/Users/cemsak/lyntos/lyntos-ui/app/v2/mutabakat/page.tsx
```

### Adım 3: Analiz Et
Her teknik borç için:
1. Mevcut durumu doğrula (brief doğru mu?)
2. Bağımlılıkları tespit et (A değişirse B kırılır mı?)
3. Risk seviyesini belirle
4. En güvenli geçiş stratejisini tasarla

### Adım 4: Kullanıcıya Sorular Sor
Analiz sonrası şunları sor:
- Scope birleştirme stratejisi: useDashboardScope'a mı, yoksa yeni bir unified hook'a mı geçelim?
- HKOZKAN: DEV guard mı ekleyelim yoksa tamamen kaldıralım mı?
- localStorage: Hangi veriler backend'e taşınsın, hangileri kalsın?
- Öncelik sırası ne olsun?

### Adım 5: Plan Yaz ve Onaya Sun
ExitPlanMode kullanarak planı kullanıcıya sun.

---

## KRİTİK KURALLAR

1. **HER ADIM SONRASI:** `cd /Users/cemsak/lyntos/lyntos-ui && npx tsc --noEmit` çalıştır
2. **SON ADIMDA:** `npx next build` ile tam build kontrolü yap
3. **Layout bileşenlerine DOKUNMA** (PremiumHeader, TopBar, ClientSelector, PeriodSelector) — bunlar infra
4. **ScopeProvider.tsx** değiştirilecekse ÇOK DİKKATLİ ol — tüm `useDashboardScope` kullanıcıları etkilenir
5. **Backend endpoint'leri DEĞİŞMEZ** — sadece frontend refactoring
6. **Mevcut çalışan davranışı BOZMA** — önce testler, sonra refactoring
7. **Commit YAPMA** — kullanıcı isteyene kadar

---

## MERKEZİ API CONFIG

Tüm API çağrıları artık merkezi config'den gelir:
```typescript
// /Users/cemsak/lyntos/lyntos-ui/app/v2/_lib/config/api.ts
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';
```

Yeni dosyalarda doğrudan `process.env` KULLANMA, `API_BASE_URL` import et.

---

## BAŞARI KRİTERLERİ

Plan tamamlandığında:
- [ ] `useLayoutContext()` sadece layout bileşenlerinde kullanılıyor (Header, Sidebar, Selectors)
- [ ] Tüm sayfalar `useDashboardScope()` veya unified hook kullanıyor
- [ ] Hiçbir sayfada doğrudan `'HKOZKAN'` string literal yok (auth.ts hariç)
- [ ] localStorage'da sadece UI tercihleri var, iş verisi yok
- [ ] `npx tsc --noEmit` → 0 hata
- [ ] `npx next build` → başarılı
- [ ] Mevcut fonksiyonellik korunuyor
