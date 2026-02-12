# LYNTOS Frontend Yapi Raporu

**Tarih:** 2026-02-09
**Dizin:** `/Users/cemsak/lyntos/lyntos-ui/`
**Framework:** Next.js 15.5.6 + React 18.3.1 + TypeScript + Tailwind CSS 4

---

## 1. Sayfalar (app/v2/**/page.tsx)

**Toplam v2 sayfa sayisi: 51**

| Grup | Sayfalar |
|------|----------|
| Root / Dashboard | `v2/page.tsx`, `v2/dashboard-v3/page.tsx` |
| Istemci | `clients/page.tsx` |
| Upload | `upload/page.tsx` |
| Login | `login/page.tsx` |
| Banka | `banka/page.tsx`, `banka/mutabakat/page.tsx` |
| Beyanname | `beyanname/kdv/page.tsx`, `beyanname/gecici/page.tsx`, `beyanname/kurumlar/page.tsx`, `beyanname/muhtasar/page.tsx`, `beyanname/tahakkuk/page.tsx` |
| Beyan (dinamik) | `beyan/[tip]/page.tsx` |
| Declarations | `declarations/page.tsx` |
| Defter | `yevmiye/page.tsx`, `kebir/page.tsx`, `edefter/rapor/page.tsx` |
| Mutabakat | `mutabakat/page.tsx`, `mutabakat/cari/page.tsx`, `mutabakat-matrisi/page.tsx` |
| Cross-check | `cross-check/page.tsx` |
| Donem | `donem-ozet/page.tsx`, `donem-sonu/page.tsx` |
| Vergi | `vergi/gecici/page.tsx`, `vergi/kurumlar/page.tsx`, `vergus/page.tsx` |
| Enflasyon | `enflasyon/page.tsx`, `enflasyon/upload/page.tsx` |
| Risk | `risk/rules/page.tsx` |
| VDK | `vdk/page.tsx`, `vdk/[id]/page.tsx` |
| Quarterly | `quarterly/page.tsx` |
| Reports | `reports/page.tsx`, `reports/evidence/page.tsx` |
| RegWatch | `regwatch/page.tsx`, `regwatch/[id]/page.tsx`, `regwatch/chat/page.tsx` |
| Corporate | `corporate/page.tsx`, `corporate/chat/page.tsx` |
| Asistan | `asistan/page.tsx` |
| Pratik Bilgiler | `pratik-bilgiler/page.tsx`, `pratik-bilgiler/beyan-tarihleri/page.tsx`, `pratik-bilgiler/cezalar/page.tsx`, `pratik-bilgiler/gecikme/page.tsx`, `pratik-bilgiler/hadler/page.tsx`, `pratik-bilgiler/hesaplamalar/page.tsx`, `pratik-bilgiler/kontrol-listeleri/page.tsx`, `pratik-bilgiler/oranlar/page.tsx`, `pratik-bilgiler/sgk/page.tsx` |
| Settings | `settings/page.tsx` |
| Help | `help/page.tsx` |

Ayrica v1 altinda 3 sayfa, root'ta 2 sayfa (`app/page.tsx`, `app/dashboard/page.tsx`) mevcut.

---

## 2. _lib Dosyalari (app/v2/_lib/)

**Toplam: 57 dosya**

| Klasor | Dosya Sayisi | Icerik |
|--------|-------------|--------|
| `config/` | 1 | `api.ts` (API endpoint tanimlari) |
| `api/` | 3 | `donemSync.ts`, `mizanData.ts`, `mizanSync.ts` |
| `stores/` | 3 | `donemStore.ts`, `mizanStore.ts`, `oranlarStore.ts` (Zustand) |
| `utils/` | 1 | `docStatusHelper.ts` |
| `constants/` | 1 | `docTypes.ts` |
| `parsers/` | 25 | Mizan, banka, beyanname, tahakkuk, e-defter, KDV, muhtasar, crosscheck parserlari |
| `evidence/` | 8 | PDF/bundle generation, quarterly manifest |
| `rule-engine/` | 8 | Orchestrator, registry, phase0-3 kurallari |
| Root dosyalar | 7 | `auth.ts`, `authFetch.ts`, `exportCsv.ts`, `format.ts`, `messages.ts`, `sanitize.ts`, `vergiTakvimi.ts` |

---

## 3. _components (app/v2/_components/)

**Toplam: 284 dosya (.tsx + .ts)**

| Klasor | Icerik |
|--------|--------|
| `layout/` | Sidebar, TopBar, DashboardShell, ClientSelector, PeriodSelector, V2LayoutClient, useLayoutContext, useLayoutData |
| `scope/` | ScopeProvider, ScopeSelector, DataEntryGuard, useDashboardScope, useDonemValidation |
| `dashboard/` | KpiStrip, KontrolModal, NotificationCenter, QuickActions, RiskSummaryWidget, TodayActionsWidget |
| `deepdive/` | Mizan omurga, VDK expert, KURGAN alert, cross-check, yatay/dikey analiz, enflasyon, sahte fatura risk |
| `kpi/` | KpiCard, KpiStrip, ExplainModal, detay modallari (Enflasyon, GeciciVergi, RiskSkoru, VeriKalitesi vb.) |
| `feed/` | IntelligenceFeed, FeedCard, ContextRail, pipeline, useFeedSignals |
| `modals/` | UploadModal, IngestStatisticsView, PipelineProgress, DeleteDonemModal |
| `upload/` | fileClassifier, mizanParser, bankRegistry, QuickRiskSummary, useVdkValidation |
| `operations/` | AksiyonKuyruguPanel, RegWatchPanel, MissingDataPanel |
| `risk-review/` | RiskReviewQueue, RiskReviewDetail, RiskFactorCard, RiskScoreGauge |
| `vergus-strategist/` | VergusStrategistPanel, WhatIfAnalysis, ScenarioCard, OpportunityCard |
| `vergi-analiz/` | GeciciVergiPanel, KurumlarVergisiPanel, MatrahHesaplama |
| `corporate/` | TTK376Widget, DocumentChecklist, MinCapitalBanner |
| `vdk-simulator/` | VDKSimulatorPanel, KurganAlarmCard |
| `shared/` | Card, Badge, RiskBadge, StatCard, PanelState, Toast, EvidenceModal, ConnectionError |
| `ui/` | AlertBanner, PageHeader, Skeleton, ProgressIndicator, design-tokens |
| Diger | beyanname, chat, contracts, document-checklist, donem-verileri, evidence, hooks, inspector-prep, kokpit, notifications, panels, pdf, quarterly, signals, smmm, sources, tax-certificate, vdk |

---

## 4. _hooks (app/v2/_hooks/)

**14 dosya:**

- `useAiAnalysis.ts`, `useBackendFeed.ts`, `useCorporateTax.ts`, `useCrossCheck.ts`
- `useDashboardData.ts`, `useDonemData.ts`, `useMizanData.ts`, `useQuarterlyAnalysis.ts`
- `useRightRailData.ts`, `useVdkFullAnalysis.ts`, `useVdkOracle.ts`, `useVdkRiskScore.ts`
- `useYasalSureler.ts`, `index.ts`

---

## 5. Dependencies (package.json)

**Production (46 paket):**
- UI: `@mui/material`, `@mui/icons-material`, `@radix-ui/*` (checkbox, dialog, scroll-area, select, separator, slot, tabs, tooltip), `lucide-react`, `next-themes`, `tailwind-merge`, `tailwindcss-animate`
- Data: `@tanstack/react-query`, `@tanstack/react-table`, `@tanstack/react-virtual`, `ag-grid-community`, `ag-grid-react`, `zustand`
- Charts: `recharts`, `react-force-graph-2d`
- PDF/Export: `jspdf`, `jspdf-autotable`, `pdf-parse`, `pdfjs-dist`, `html2canvas`, `file-saver`, `xlsx`, `jszip`
- Diger: `react-dropzone`, `react-toastify`, `react-markdown`, `dompurify`, `iconv-lite`, `zod`, `clsx`, `class-variance-authority`
- Framework: `next@15.5.6`, `react@18.3.1`, `react-dom@18.3.1`, `@emotion/react`, `@emotion/styled`, `@mui/system`

**DevDependencies (15 paket):**
- Test: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@playwright/test`, `@vitest/coverage-v8`, `jsdom`
- Build: `typescript`, `tailwindcss@4`, `@tailwindcss/postcss`, `autoprefixer`, `eslint`, `eslint-config-next`, `@vitejs/plugin-react`, `tw-animate-css`

---

## 6. Provider Dosyalari

| Dosya | Konum |
|-------|-------|
| `providers.tsx` | `app/providers.tsx` -- Root provider (QueryClient, ThemeProvider vb.) |
| `ScopeProvider.tsx` | `app/v2/_components/scope/ScopeProvider.tsx` -- Client+Period scope yonetimi |
| `SourcesProvider.tsx` | `app/v2/_components/sources/SourcesProvider.tsx` -- Veri kaynaklari context |
| `useLayoutContext.tsx` | `app/v2/_components/layout/useLayoutContext.tsx` -- Layout state (LayoutProvider mantigi burada) |
| `useLayoutData.ts` | `app/v2/_components/layout/useLayoutData.ts` -- API calls (user/clients/periods) |
| `V2LayoutClient.tsx` | `app/v2/_components/layout/V2LayoutClient.tsx` -- V2 layout wrapper |

---

## 7. Test Dosyalari

**VAR -- 4 dosya (node_modules haric)**

| Dosya | Tip |
|-------|-----|
| `__tests__/unit/docStatusHelper.test.ts` | Unit (vitest) |
| `__tests__/unit/docTypes.test.ts` | Unit (vitest) |
| `__tests__/unit/mizanSync.test.ts` | Unit (vitest) |
| `e2e/critical-paths.spec.ts` | E2E (playwright) |

**Degerlendirme:** 284 component + 57 lib dosyasina karsi sadece 3 unit test. Test kapsami cok dusuk.

---

## 8. .env Dosyalari

| Dosya | Mevcut |
|-------|--------|
| `.env.example` | EVET |
| `.env.local` | EVET |

---

## 9. next.config.ts -- Onemli Ayarlar

```typescript
// Dosya: /Users/cemsak/lyntos/lyntos-ui/next.config.ts
{
  eslint: { ignoreDuringBuilds: true },     // ESLint build'de atlanir
  turbopack: { root: __dirname },           // Turbopack root
  rewrites: ['/api/:path*' -> 'http://localhost:8000/api/:path*'],  // Backend proxy
  webpack: { canvas: false, .mjs support }  // pdfjs-dist uyumu
}
```

**Onemli notlar:**
- ESLint build sirasinda devre disi -- hatalari goremezsiniz
- API proxy: Frontend `/api/*` istekleri otomatik olarak backend 8000 portuna yonlendirilir
- pdfjs-dist icin ozel webpack config mevcut

---

## 10. Ek: lib/ (Root Level)

`lyntos-ui/lib/` altinda 19 dosya (eski/v1 donemi):
- `auth.ts` -- Eski auth
- `analysis/` -- Oran analizi, sektor benchmark
- `evidence/` -- Kanit paketi builder, yasal referanslar
- `rules/` -- VDK K-kodlari, KURGAN senaryolari, RAM tespit motoru
- `scoring/` -- KURGAN skorlama
- `ui/` -- design-tokens, components
- `hooks/` -- useFetch
- `types/` -- vdk-types

---

## Ozet Metrikler

| Metrik | Deger |
|--------|-------|
| Toplam v2 sayfa | 51 |
| _components dosya | 284 |
| _components alt-klasor | 34 |
| _lib dosya | 57 |
| _hooks dosya | 14 |
| lib/ (root) dosya | 19 |
| Provider dosya | 4 (+ 2 layout context) |
| Test dosya | 4 (3 unit + 1 e2e) |
| Production dep | 46 |
| Dev dep | 15 |
| Test kapsami | DUSUK |
