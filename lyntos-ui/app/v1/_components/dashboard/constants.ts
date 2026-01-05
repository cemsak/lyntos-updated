// ════════════════════════════════════════════════════════════════════════════
// LYNTOS Dashboard - Enterprise Design Tokens
// Big-4 Audit Cockpit styling (Tabler-inspired density)
// ════════════════════════════════════════════════════════════════════════════

// Typography - Dense, professional
export const typography = {
  h1: 'text-xl font-semibold text-gray-900',
  h2: 'text-base font-semibold text-gray-900',
  h3: 'text-sm font-medium text-gray-900',
  body: 'text-sm text-gray-700',
  bodySmall: 'text-xs text-gray-600',
  caption: 'text-xs text-gray-500',
  label: 'text-xs font-medium text-gray-500 uppercase tracking-wide',
  mono: 'font-mono text-xs',
  tabular: 'tabular-nums',
};

// Colors - Neutral base, status only
export const colors = {
  // Base
  bgPage: '#f8fafc',
  bgCard: '#ffffff',
  borderSubtle: '#e2e8f0',
  borderMedium: '#cbd5e1',
  
  // Text
  textPrimary: '#1e293b',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  
  // Status (only use for indicators)
  success: '#10b981',
  successBg: '#ecfdf5',
  warning: '#f59e0b',
  warningBg: '#fffbeb',
  error: '#ef4444',
  errorBg: '#fef2f2',
  info: '#3b82f6',
  infoBg: '#eff6ff',
  
  // Accent (minimal)
  accent: '#2563eb',
  accentHover: '#1d4ed8',
};

// Spacing - Dense mode
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  
  // Component-specific
  cardPadding: 'p-4',
  cardPaddingDense: 'p-3',
  sectionGap: 'gap-4',
  panelGap: 'gap-3',
};

// Card styles
export const cardStyles = {
  base: 'bg-white rounded-lg border border-gray-200',
  hover: 'hover:border-gray-300 hover:shadow-sm transition-all',
  dense: 'bg-white rounded-lg border border-gray-200 p-3',
};

// Table styles (dense)
export const tableStyles = {
  wrapper: 'overflow-x-auto',
  table: 'w-full text-sm',
  thead: 'bg-gray-50 border-b border-gray-200',
  th: 'px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide',
  tbody: 'divide-y divide-gray-100',
  td: 'px-3 py-2 text-sm text-gray-700',
  tdMono: 'px-3 py-2 text-sm font-mono text-gray-700',
};

// Status labels (SMMM-friendly)
export const STATUS_LABELS: Record<string, string> = {
  'OK': 'Normal',
  'PASS': 'Uyumlu',
  'WARN': 'Dikkat',
  'WARNING': 'Dikkat',
  'ERROR': 'Hata',
  'FAIL': 'Uyumsuz',
  'ACTIVE': 'Aktif',
  'NEEDS_CHECK': 'Kontrol Gerekli',
  'BOOTSTRAP': 'Baslatilmadi',
  'NOT_STARTED': 'Baslatilmadi',
  'UNKNOWN': 'Bilinmiyor',
  'MISSING': 'Eksik',
  'LOADING': 'Yukleniyor',
};

// Status to color mapping
export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'OK': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'PASS': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'WARN': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'WARNING': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'ERROR': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'FAIL': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'UNKNOWN': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  'MISSING': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
};

// Required documents (Big-6)
export const REQUIRED_DOCS = [
  { key: 'MIZAN', label: 'Mizan' },
  { key: 'BANKA', label: 'Banka Ekstresi' },
  { key: 'BEYANNAME', label: 'Beyanname' },
  { key: 'TAHAKKUK', label: 'Tahakkuk' },
  { key: 'EDEFTER_BERAT', label: 'E-Defter Berat' },
  { key: 'EFATURA_ARSIV', label: 'E-Fatura Arsiv' },
];

// KPI definitions
export const KPI_DEFINITIONS = [
  { id: 'kurgan_risk', label: 'KURGAN Risk', unit: 'puan' },
  { id: 'data_quality', label: 'Veri Kalitesi', unit: '%' },
  { id: 'cross_check', label: 'Capraz Kontrol', unit: '' },
  { id: 'quarterly_tax', label: 'Gecici Vergi', unit: 'TL' },
  { id: 'corporate_tax', label: 'Kurumlar Vergisi', unit: 'TL' },
  { id: 'year_estimate', label: 'Yil Sonu Tahmini', unit: 'TL' },
  { id: 'inflation_impact', label: 'Enflasyon Etkisi', unit: '%' },
  { id: 'tms29_status', label: 'TMS 29 Uyum', unit: '' },
];
