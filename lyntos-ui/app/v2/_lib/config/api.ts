/**
 * LYNTOS API Configuration
 * Centralized API URL management - TEK KAYNAK
 *
 * ⚠️ TÜM API çağrıları bu dosyadan endpoint almalıdır
 * ⚠️ Hardcoded URL kullanımı YASAKTIR
 */

// ════════════════════════════════════════════════════════════════════════════
// API Base URL
// ════════════════════════════════════════════════════════════════════════════

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

// ════════════════════════════════════════════════════════════════════════════
// V1 LEGACY ENDPOINTS (contracts pattern)
// ════════════════════════════════════════════════════════════════════════════

const API_BASE = '/api/v1';

/**
 * V1 Contracts Endpoints - Legacy panel data
 * Bu endpoint'ler contracts/ klasöründen taşındı
 */
export const ENDPOINTS = {
  // Tenant/Taxpayer
  TAXPAYERS: (tenantId: string) => `${API_BASE}/tenants/${tenantId}/taxpayers`,
  PERIODS: (tenantId: string, taxpayerId: string) => `${API_BASE}/tenants/${tenantId}/taxpayers/${taxpayerId}/periods`,

  // Contracts (Dashboard Panels)
  PORTFOLIO: `${API_BASE}/contracts/portfolio`,
  KURGAN_RISK: `${API_BASE}/contracts/kurgan-risk`,
  DATA_QUALITY: `${API_BASE}/contracts/data-quality`,
  ACTIONABLE_TASKS: `${API_BASE}/contracts/actionable-tasks`,
  CORPORATE_TAX: `${API_BASE}/contracts/corporate-tax`,
  CORPORATE_TAX_FORECAST: `${API_BASE}/contracts/corporate-tax-forecast`,
  QUARTERLY_TAX: `${API_BASE}/contracts/quarterly-tax`,
  MIZAN_ANALYSIS: `${API_BASE}/contracts/mizan-analysis`,
  INFLATION_ADJUSTMENT: `${API_BASE}/contracts/inflation-adjustment`,
  CROSS_CHECK: `${API_BASE}/contracts/cross-check`,
  REGWATCH_STATUS: `${API_BASE}/contracts/regwatch-status`,
  FAKE_INVOICE_RISK: `${API_BASE}/contracts/fake-invoice-risk`,

  // Documents
  PERIOD_COMPLETENESS: `${API_BASE}/documents/period-completeness`,

  // Sources
  SOURCES: `${API_BASE}/contracts/sources`,
  SOURCE_BY_ID: (id: string) => `${API_BASE}/contracts/sources/${id}`,

  // Evidence
  EVIDENCE_RULES: `${API_BASE}/evidence/rules`,
  EVIDENCE_BUNDLE: (ruleId: string) => `${API_BASE}/evidence/bundle/${ruleId}`,

  // Export
  EXPORT_PDF: `${API_BASE}/contracts/export-pdf`,
} as const;

// ════════════════════════════════════════════════════════════════════════════
// V2 ENDPOINTS (with full URL)
// ════════════════════════════════════════════════════════════════════════════

/**
 * V2 Endpoints - New features with full URL
 */
export const ENDPOINTS_V2 = {
  // Mizan Data - From disk (Luca exports)
  MIZAN_LOAD: (smmm_id: string, client_id: string, period: string) =>
    `${API_BASE_URL}/api/v2/mizan-data/load/${smmm_id}/${client_id}/${period}`,
  MIZAN_ANALYZE: (smmm_id: string, client_id: string, period: string) =>
    `${API_BASE_URL}/api/v2/mizan-data/analyze/${smmm_id}/${client_id}/${period}`,
  MIZAN_AVAILABLE: `${API_BASE_URL}/api/v2/mizan-data/available`,

  // E-Defter Rapor
  EDEFTER_RAPOR: `${API_BASE_URL}/api/v2/edefter/rapor`,
  EDEFTER_DETAY: `${API_BASE_URL}/api/v2/edefter/detay`,
  EDEFTER_DURUM: `${API_BASE_URL}/api/v2/edefter/durum`,

  // Mizan Analiz - IS-7 (Hesap Kartı, Yatay/Dikey Analiz)
  MIZAN_HESAP_KARTI: (client_id: string, period: string, hesap_kodu: string) =>
    `${API_BASE_URL}/api/v2/mizan-analiz/hesap-karti/${client_id}/${period}/${hesap_kodu}`,
  MIZAN_YATAY: (client_id: string, period: string) =>
    `${API_BASE_URL}/api/v2/mizan-analiz/yatay/${client_id}/${period}`,
  MIZAN_DIKEY: (client_id: string, period: string) =>
    `${API_BASE_URL}/api/v2/mizan-analiz/dikey/${client_id}/${period}`,

  // Feed (Intelligence Feed)
  FEED: (period: string) => `${API_BASE_URL}/api/v2/feed/${period}`,
} as const;

// ════════════════════════════════════════════════════════════════════════════
// API_ENDPOINTS (Structured by feature)
// ════════════════════════════════════════════════════════════════════════════

export const API_ENDPOINTS = {
  // ─── V2: Dönem Sync ───────────────────────────────────────────────────────
  donem: {
    sync: `${API_BASE_URL}/api/v2/donem/sync`,
    status: (periodId: string) => `${API_BASE_URL}/api/v2/donem/status/${encodeURIComponent(periodId)}`,
    clear: (periodId: string) => `${API_BASE_URL}/api/v2/donem/clear/${encodeURIComponent(periodId)}`,
  },

  // ─── V2: Mizan Sync ───────────────────────────────────────────────────────
  mizan: {
    sync: `${API_BASE_URL}/api/v2/mizan/sync`,
    summary: (periodId: string) => `${API_BASE_URL}/api/v2/mizan/summary/${encodeURIComponent(periodId)}`,
    entries: (periodId: string) => `${API_BASE_URL}/api/v2/mizan/entries/${encodeURIComponent(periodId)}`,
    clear: (periodId: string) => `${API_BASE_URL}/api/v2/mizan/clear/${encodeURIComponent(periodId)}`,
  },

  // ─── V2: Mizan Data (disk-based) ──────────────────────────────────────────
  mizanData: {
    check: `${API_BASE_URL}/api/v2/mizan-data/check`,
    available: `${API_BASE_URL}/api/v2/mizan-data/available`,
    load: (smmmId: string, clientId: string, period: string) =>
      `${API_BASE_URL}/api/v2/mizan-data/load/${encodeURIComponent(smmmId)}/${encodeURIComponent(clientId)}/${encodeURIComponent(period)}`,
    analyze: (smmmId: string, clientId: string, period: string) =>
      `${API_BASE_URL}/api/v2/mizan-data/analyze/${encodeURIComponent(smmmId)}/${encodeURIComponent(clientId)}/${encodeURIComponent(period)}`,
    account: (smmmId: string, clientId: string, period: string, hesapKodu: string) =>
      `${API_BASE_URL}/api/v2/mizan-data/account/${encodeURIComponent(smmmId)}/${encodeURIComponent(clientId)}/${encodeURIComponent(period)}/${encodeURIComponent(hesapKodu)}`,
  },

  // ─── V2: Cross Check ──────────────────────────────────────────────────────
  crossCheck: {
    run: (periodId: string) => `${API_BASE_URL}/api/v2/cross-check/run/${encodeURIComponent(periodId)}`,
    status: (periodId: string) => `${API_BASE_URL}/api/v2/cross-check/status/${encodeURIComponent(periodId)}`,
  },

  // ─── V2: Defter Kontrol ───────────────────────────────────────────────────
  defterKontrol: {
    full: `${API_BASE_URL}/api/v2/defter-kontrol/full`,
  },

  // ─── V2: Opening Balance ──────────────────────────────────────────────────
  openingBalance: {
    status: (clientId: string, periodId: string) =>
      `${API_BASE_URL}/api/v2/opening-balance/${clientId}/${periodId}/status`,
  },

  // ─── V2: Period Summary ───────────────────────────────────────────────────
  periodSummary: {
    ozet: `${API_BASE_URL}/api/v2/period-summary/ozet`,
    odemeDurumu: `${API_BASE_URL}/api/v2/period-summary/odeme-durumu`,
    refresh: `${API_BASE_URL}/api/v2/period-summary/odeme-durumu/refresh`,
    manuelOdeme: `${API_BASE_URL}/api/v2/period-summary/tahakkuk/manuel-odeme`,
  },

  // ─── V2: Rules (Kural Kütüphanesi) ────────────────────────────────────────
  rules: {
    list: `${API_BASE_URL}/api/v2/rules`,
    statistics: `${API_BASE_URL}/api/v2/rules/statistics`,
    categories: `${API_BASE_URL}/api/v2/rules/categories`,
    duplicates: `${API_BASE_URL}/api/v2/rules/duplicates/all`,
    resolve: `${API_BASE_URL}/api/v2/rules/duplicates/resolve`,
    byId: (id: string) => `${API_BASE_URL}/api/v2/rules/${id}`,
  },

  // ─── V2: Beyanname ────────────────────────────────────────────────────────
  beyanname: {
    kdv: `${API_BASE_URL}/api/v2/beyanname/kdv`,
    muhtasar: `${API_BASE_URL}/api/v2/beyanname/muhtasar`,
    tahakkuk: `${API_BASE_URL}/api/v2/beyanname/tahakkuk`,
    kurumlar: `${API_BASE_URL}/api/v2/beyanname/kurumlar`,
  },

  // ─── V2: E-Defter ─────────────────────────────────────────────────────────
  edefter: {
    durum: `${API_BASE_URL}/api/v2/edefter/durum`,
    rapor: `${API_BASE_URL}/api/v2/edefter/rapor`,
    detay: `${API_BASE_URL}/api/v2/edefter/detay`,
  },

  // ─── V2: Mevzuat (RegWatch) ───────────────────────────────────────────────
  mevzuat: {
    recent: `${API_BASE_URL}/api/v2/mevzuat/recent`,
    search: `${API_BASE_URL}/api/v2/mevzuat/search`,
    statistics: `${API_BASE_URL}/api/v2/mevzuat/statistics`,
  },

  // ─── V2: Upload/Ingest ────────────────────────────────────────────────────
  upload: `${API_BASE_URL}/api/v2/upload`,  // DEPRECATED → 410 Gone
  ingest: {
    upload: `${API_BASE_URL}/api/v2/ingest`,
    files: (clientId: string, period: string) =>
      `${API_BASE_URL}/api/v2/ingest/files/${encodeURIComponent(clientId)}/${encodeURIComponent(period)}`,
    deleteFile: (fileId: string) =>
      `${API_BASE_URL}/api/v2/ingest/file/${encodeURIComponent(fileId)}`,
    pipelineStatus: (sessionId: string) =>
      `${API_BASE_URL}/api/v2/ingest/pipeline-status/${encodeURIComponent(sessionId)}`,
  },

  // ─── V2: Feed ─────────────────────────────────────────────────────────────
  feed: {
    byPeriod: (period: string) => `${API_BASE_URL}/api/v2/feed/${encodeURIComponent(period)}`,
  },

  // ─── V2: Periods ──────────────────────────────────────────────────────────
  periods: {
    status: (clientId: string, periodId: string) =>
      `${API_BASE_URL}/api/v2/periods/${encodeURIComponent(clientId)}/${encodeURIComponent(periodId)}/status`,
  },

  // ─── V2: Cari Mutabakat ───────────────────────────────────────────────────
  cariMutabakat: {
    ozet: `${API_BASE_URL}/api/v2/cari-mutabakat/ozet`,
    list: `${API_BASE_URL}/api/v2/cari-mutabakat/list`,
    upload: `${API_BASE_URL}/api/v2/cari-mutabakat/upload`,
    onayla: `${API_BASE_URL}/api/v2/cari-mutabakat/onayla`,
    preview: `${API_BASE_URL}/api/v2/cari-mutabakat/preview`,
    confirm: `${API_BASE_URL}/api/v2/cari-mutabakat/confirm`,
    karar: `${API_BASE_URL}/api/v2/cari-mutabakat/karar`,
    kararlar: `${API_BASE_URL}/api/v2/cari-mutabakat/kararlar`,
    kararlarToplu: `${API_BASE_URL}/api/v2/cari-mutabakat/kararlar/toplu`,
  },

  // ─── V2: Kebir ────────────────────────────────────────────────────────────
  kebir: {
    hesap: (hesapKodu: string) => `${API_BASE_URL}/api/v2/kebir/hesap/${encodeURIComponent(hesapKodu)}`,
    hesapListesi: `${API_BASE_URL}/api/v2/kebir/hesap-listesi`,
  },

  // ─── V2: Banka ────────────────────────────────────────────────────────────
  banka: {
    islemler: `${API_BASE_URL}/api/v2/banka/islemler`,
    hesaplar: `${API_BASE_URL}/api/v2/banka/hesaplar`,
    mutabakat: `${API_BASE_URL}/api/v2/banka/mutabakat`,
  },

  // ─── V2: Yevmiye ──────────────────────────────────────────────────────────
  yevmiye: {
    list: `${API_BASE_URL}/api/v2/yevmiye/list`,
  },

  // ─── V1: Contracts (Legacy Dashboard) ─────────────────────────────────────
  contracts: {
    kurganRisk: `${API_BASE_URL}/api/v1/contracts/kurgan-risk`,
    dataQuality: `${API_BASE_URL}/api/v1/contracts/data-quality`,
    crossCheck: `${API_BASE_URL}/api/v1/contracts/cross-check`,
    quarterlyTax: `${API_BASE_URL}/api/v1/contracts/quarterly-tax`,
    corporateTax: `${API_BASE_URL}/api/v1/contracts/corporate-tax`,
    corporateTaxForecast: `${API_BASE_URL}/api/v1/contracts/corporate-tax-forecast`,
    inflationAdjustment: `${API_BASE_URL}/api/v1/contracts/inflation-adjustment`,
    regwatchStatus: `${API_BASE_URL}/api/v1/contracts/regwatch-status`,
    actionableTasks: `${API_BASE_URL}/api/v1/contracts/actionable-tasks`,
    fakeInvoiceRisk: `${API_BASE_URL}/api/v1/contracts/fake-invoice-risk`,
    sources: `${API_BASE_URL}/api/v1/contracts/sources`,
    exportPdf: `${API_BASE_URL}/api/v1/contracts/export-pdf`,
    declarations: `${API_BASE_URL}/api/v1/contracts/declarations`,
    vdkAiAnalysis: `${API_BASE_URL}/api/v1/contracts/vdk-ai-analysis`,
    riskQueue: `${API_BASE_URL}/api/v1/contracts/risk-queue`,
  },

  // ─── V1: Chat ─────────────────────────────────────────────────────────────
  chat: {
    assistant: `${API_BASE_URL}/api/v1/chat/assistant`,
    corporate: `${API_BASE_URL}/api/v1/chat/corporate`,
    regwatch: `${API_BASE_URL}/api/v1/chat/regwatch`,
    history: (sessionId: string) => `${API_BASE_URL}/api/v1/chat/history/${sessionId}`,
  },

  // ─── V1: AI ───────────────────────────────────────────────────────────────
  ai: {
    analyzeRegwatch: `${API_BASE_URL}/api/v1/ai/analyze/regwatch`,
    analyzeCompany: `${API_BASE_URL}/api/v1/ai/analyze/company`,
    analyzeBatch: `${API_BASE_URL}/api/v1/ai/analyze/batch`,
    analyses: `${API_BASE_URL}/api/v1/ai/analyses`,
    mevzuatRag: `${API_BASE_URL}/api/v1/ai/mevzuat-rag`,
  },

  // ─── V1: RegWatch ─────────────────────────────────────────────────────────
  regwatch: {
    changes: `${API_BASE_URL}/api/v1/regwatch/changes`,
    stats: `${API_BASE_URL}/api/v1/regwatch/stats`,
    scrape: `${API_BASE_URL}/api/v1/regwatch/scrape`,
    status: `${API_BASE_URL}/api/v1/regwatch/status`,
    pending: `${API_BASE_URL}/api/v1/regwatch/pending`,
  },

  // ─── V1: User ─────────────────────────────────────────────────────────────
  user: {
    me: `${API_BASE_URL}/api/v1/user/me`,
    clients: `${API_BASE_URL}/api/v1/user/me/clients`,
    clientPeriods: (clientId: string) => `${API_BASE_URL}/api/v1/user/clients/${clientId}/periods`,
    profile: `${API_BASE_URL}/api/v1/user/me`,  // H-04: /profile -> /user/me (ayni endpoint)
  },

  // ─── V1: Tenants ──────────────────────────────────────────────────────────
  tenants: {
    taxpayers: (tenantId: string) => `${API_BASE_URL}/api/v1/tenants/${tenantId}/taxpayers`,
    taxpayerById: (tenantId: string, taxpayerId: string) =>
      `${API_BASE_URL}/api/v1/tenants/${tenantId}/taxpayers/${taxpayerId}`,
  },

  // ─── V1: Tax Certificate ──────────────────────────────────────────────────
  taxCertificate: {
    parse: `${API_BASE_URL}/api/v1/tax-certificate/parse`,
    upload: `${API_BASE_URL}/api/v1/tax-certificate/upload`,
    confirm: `${API_BASE_URL}/api/v1/tax-certificate/confirm`,
    byClient: (clientId: string) => `${API_BASE_URL}/api/v1/tax-certificate/${encodeURIComponent(clientId)}`,
  },

  // ─── V1: Notifications ────────────────────────────────────────────────────
  notifications: {
    list: `${API_BASE_URL}/api/v1/notifications`,
    stats: `${API_BASE_URL}/api/v1/notifications/stats`,
    read: (id: string) => `${API_BASE_URL}/api/v1/notifications/${id}/read`,
    readAll: `${API_BASE_URL}/api/v1/notifications/read-all`,
    dismiss: (id: string) => `${API_BASE_URL}/api/v1/notifications/${id}/dismiss`,
  },

  // ─── V1: Corporate ────────────────────────────────────────────────────────
  corporate: {
    eventTypes: `${API_BASE_URL}/api/v1/corporate/event-types`,
    eventTypeById: (code: string) => `${API_BASE_URL}/api/v1/corporate/event-types/${code}`,
    ttk376Analysis: `${API_BASE_URL}/api/v1/corporate/ttk376-analysis`,
    minCapitalRequirements: `${API_BASE_URL}/api/v1/corporate/min-capital-requirements`,
    gkQuorumGuide: `${API_BASE_URL}/api/v1/corporate/gk-quorum-guide`,
  },

  // ─── V1: Documents ────────────────────────────────────────────────────────
  documents: {
    upload: `${API_BASE_URL}/api/v1/documents/upload`,
    periodCompleteness: `${API_BASE_URL}/api/v1/documents/period-completeness`,
  },

  // ─── V1: Evidence ─────────────────────────────────────────────────────────
  evidence: {
    rules: `${API_BASE_URL}/api/v1/evidence/rules`,
    bundle: (ruleId: string) => `${API_BASE_URL}/api/v1/evidence/bundle/${ruleId}`,
  },

  // ─── V1: VDK Inspector ────────────────────────────────────────────────────
  vdkInspector: {
    answer: `${API_BASE_URL}/api/v1/vdk-inspector/answer`,
  },

  // ─── V1: Vergus (Tax Strategist) ──────────────────────────────────────────
  vergus: {
    analyze: `${API_BASE_URL}/api/v1/vergus/analyze`,
    quickCheck: (clientId: string) => `${API_BASE_URL}/api/v1/vergus/quick-check/${encodeURIComponent(clientId)}`,
  },

  // ─── V1: Inspector Prep ───────────────────────────────────────────────────
  inspectorPrep: {
    notes: `${API_BASE_URL}/api/v1/inspector-prep/notes`,
    notesById: (clientId: string) => `${API_BASE_URL}/api/v1/inspector-prep/notes/${encodeURIComponent(clientId)}`,
    progress: (clientId: string) => `${API_BASE_URL}/api/v1/inspector-prep/progress/${encodeURIComponent(clientId)}`,
    exportPdf: (clientId: string) => `${API_BASE_URL}/api/v1/inspector-prep/export-pdf/${encodeURIComponent(clientId)}`,
    documentStatus: `${API_BASE_URL}/api/v1/inspector-prep/document-status`,
  },

  // ─── V1: Analysis ─────────────────────────────────────────────────────────
  analysis: {
    riskItems: `${API_BASE_URL}/api/v1/analysis/risk-items`,
  },

  // ─── TCMB (External) ──────────────────────────────────────────────────────
  tcmb: {
    yiufe: `${API_BASE_URL}/api/v2/tcmb/yiufe`,
  },

  // ─── V2: Tax Parameters (Pratik Bilgiler) ────────────────────────────────
  taxParams: {
    byCategory: (category: string) =>
      `${API_BASE_URL}/api/v2/tax-parameters/by-category/${encodeURIComponent(category)}`,
    effective: `${API_BASE_URL}/api/v2/tax-parameters/effective`,
    byKey: (key: string) =>
      `${API_BASE_URL}/api/v2/tax-parameters/by-key/${encodeURIComponent(key)}`,
    history: (key: string) =>
      `${API_BASE_URL}/api/v2/tax-parameters/history/${encodeURIComponent(key)}`,
    deadlinesUpcoming: `${API_BASE_URL}/api/v2/tax-parameters/deadlines/upcoming`,
    deadlines: `${API_BASE_URL}/api/v2/tax-parameters/deadlines`,
    calculateGecikme: `${API_BASE_URL}/api/v2/tax-parameters/calculate/gecikme-faizi`,
    calculateKidem: `${API_BASE_URL}/api/v2/tax-parameters/calculate/kidem-tazminati`,
    calculateIhbar: `${API_BASE_URL}/api/v2/tax-parameters/calculate/ihbar-tazminati`,
    calculateDamga: `${API_BASE_URL}/api/v2/tax-parameters/calculate/damga-vergisi`,
    calculateGelirVergisi: `${API_BASE_URL}/api/v2/tax-parameters/calculate/gelir-vergisi`,
    calculateBordro: `${API_BASE_URL}/api/v2/tax-parameters/calculate/bordro`,
  },

  // ─── V2: Checklists (Kontrol Listeleri Kayıt) ───────────────────────────
  checklists: {
    progress: (checklistId: string) =>
      `${API_BASE_URL}/api/v2/checklists/${encodeURIComponent(checklistId)}/progress`,
    toggle: (checklistId: string) =>
      `${API_BASE_URL}/api/v2/checklists/${encodeURIComponent(checklistId)}/toggle`,
    summary: `${API_BASE_URL}/api/v2/checklists/summary`,
  },

  // ─── V2: Reports (Raporlama) ────────────────────────────────────────────
  reports: {
    generate: `${API_BASE_URL}/api/v2/reports/generate`,
    list: `${API_BASE_URL}/api/v2/reports/list`,
    download: (reportId: string) =>
      `${API_BASE_URL}/api/v2/reports/download/${encodeURIComponent(reportId)}`,
  },

  // ─── V2: Evidence Bundle (Kanıt Paketi) ────────────────────────────────
  evidenceBundle: {
    summary: (clientId: string, periodId: string) =>
      `${API_BASE_URL}/api/v2/evidence-bundle/summary?client_id=${encodeURIComponent(clientId)}&period_id=${encodeURIComponent(periodId)}`,
    generate: `${API_BASE_URL}/api/v2/evidence-bundle/generate`,
    download: (bundleId: string) =>
      `${API_BASE_URL}/api/v2/evidence-bundle/download/${encodeURIComponent(bundleId)}`,
  },
} as const;

// ════════════════════════════════════════════════════════════════════════════
// Scope Helpers
// ════════════════════════════════════════════════════════════════════════════

export interface ScopeParams {
  smmm_id: string;
  client_id: string;
  period: string;
}

/**
 * URL'e scope parametreleri ekler
 */
export function buildScopedUrl(endpoint: string, scope: ScopeParams): string {
  const params = new URLSearchParams({
    smmm_id: scope.smmm_id,
    client_id: scope.client_id,
    period: scope.period,
  });
  return `${endpoint}?${params.toString()}`;
}

/**
 * URL'e query parametreleri ekler
 */
export function buildUrl(baseUrl: string, params: Record<string, string | undefined>): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, value);
    }
  });
  return url.toString();
}

export default API_BASE_URL;
