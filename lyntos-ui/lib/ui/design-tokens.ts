// LYNTOS Design System Tokens - Kartela Uyumlu

// ═══════════════════════════════════════════════════════════════════════════
// RENK PALETI (Karteladan)
// ═══════════════════════════════════════════════════════════════════════════
export const COLORS = {
  // Mavi Scale
  blue: {
    900: '#00287F',
    700: '#0049AA',  // PRIMARY
    500: '#0078D0',
    400: '#00B4EB',
    200: '#5ED6FF',
    50: '#ABEBFF',
  },
  // Turuncu Scale
  orange: {
    900: '#E67324',
    700: '#FA841E',
    500: '#FFB114',  // WARNING
    400: '#FFCE19',
    200: '#FFE045',
    50: '#FFF08C',
  },
  // Yeşil Scale
  green: {
    900: '#005A46',
    700: '#00804D',
    500: '#00A651',  // SUCCESS
    400: '#00CB50',
    200: '#6BDB83',
    50: '#AAE8B8',
  },
  // Kırmızı Scale
  red: {
    900: '#980F30',  // CRITICAL
    700: '#BF192B',
    500: '#F0282D',  // HIGH/ERROR
    400: '#FF555F',
    200: '#FF9196',
    50: '#FFC7C9',
  },
  // Nötr Scale
  neutral: {
    900: '#000000',
    800: '#2E2E2E',  // PRIMARY TEXT
    600: '#5A5A5A',  // SECONDARY TEXT
    400: '#969696',
    300: '#B4B4B4',
    100: '#E5E5E5',  // BORDERS
    50: '#F5F6F8',   // BACKGROUND
  },
} as const;

export const RISK_LEVELS = {
  KRITIK: {
    key: 'KRITIK',
    label: 'Kritik',
    icon: '🔴',
    color: {
      bg: 'bg-[#FEF2F2]',
      bgSolid: 'bg-[#980F30]',
      border: 'border-[#FF9196]',
      text: 'text-[#980F30]',
      textLight: 'text-[#FFC7C9]',
      hex: '#980F30',
      hexBg: '#FEF2F2',
    },
    priority: 1,
  },
  YUKSEK: {
    key: 'YUKSEK',
    label: 'Yüksek',
    icon: '🟠',
    color: {
      bg: 'bg-[#FFC7C9]',
      bgSolid: 'bg-[#F0282D]',
      border: 'border-[#FF9196]',
      text: 'text-[#BF192B]',
      textLight: 'text-[#FFC7C9]',
      hex: '#F0282D',
      hexBg: '#FFC7C9',
    },
    priority: 2,
  },
  ORTA: {
    key: 'ORTA',
    label: 'Orta',
    icon: '🟡',
    color: {
      bg: 'bg-[#FFFBEB]',
      bgSolid: 'bg-[#FFB114]',
      border: 'border-[#FFE045]',
      text: 'text-[#E67324]',
      textLight: 'text-[#FFF08C]',
      hex: '#FFB114',
      hexBg: '#FFFBEB',
    },
    priority: 3,
  },
  DUSUK: {
    key: 'DUSUK',
    label: 'Düşük',
    icon: '🟢',
    color: {
      bg: 'bg-[#ECFDF5]',
      bgSolid: 'bg-[#00A651]',
      border: 'border-[#6BDB83]',
      text: 'text-[#00804D]',
      textLight: 'text-[#AAE8B8]',
      hex: '#00A651',
      hexBg: '#ECFDF5',
    },
    priority: 4,
  },
  NORMAL: {
    key: 'NORMAL',
    label: 'Normal',
    icon: '✓',
    color: {
      bg: 'bg-[#F5F6F8]',
      bgSolid: 'bg-[#5A5A5A]',
      border: 'border-[#E5E5E5]',
      text: 'text-[#5A5A5A]',
      textLight: 'text-[#B4B4B4]',
      hex: '#5A5A5A',
      hexBg: '#F5F6F8',
    },
    priority: 5,
  },
} as const;

export type RiskLevel = keyof typeof RISK_LEVELS;

export const KURGAN_ACTIONS = {
  INCELEME: {
    key: 'INCELEME',
    label: 'İnceleme',
    color: 'bg-[#980F30]',
    textColor: 'text-[#980F30]',
    bgLight: 'bg-[#FEF2F2]',
    hex: '#980F30',
    riskRange: [90, 100] as const,
  },
  IZAHA_DAVET: {
    key: 'IZAHA_DAVET',
    label: 'İzaha Davet',
    color: 'bg-[#F0282D]',
    textColor: 'text-[#BF192B]',
    bgLight: 'bg-[#FFC7C9]',
    hex: '#F0282D',
    riskRange: [75, 89] as const,
  },
  BILGI_ISTEME: {
    key: 'BILGI_ISTEME',
    label: 'Bilgi İsteme',
    color: 'bg-[#FFB114]',
    textColor: 'text-[#E67324]',
    bgLight: 'bg-[#FFFBEB]',
    hex: '#FFB114',
    riskRange: [60, 74] as const,
  },
  TAKIP: {
    key: 'TAKIP',
    label: 'Takip',
    color: 'bg-[#0049AA]',
    textColor: 'text-[#0049AA]',
    bgLight: 'bg-[#E6F9FF]',
    hex: '#0049AA',
    riskRange: [0, 59] as const,
  },
} as const;

export type KurganAction = keyof typeof KURGAN_ACTIONS;

// Oran kategorileri - Kartela Uyumlu
export const ORAN_KATEGORILERI = {
  LIKIDITE: {
    key: 'LIKIDITE',
    label: 'Likidite',
    icon: '💧',
    color: 'bg-[#0078D0]',
    bgLight: 'bg-[#E6F9FF]',
    textColor: 'text-[#0049AA]',
    hex: '#0078D0',
  },
  FAALIYET: {
    key: 'FAALIYET',
    label: 'Faaliyet',
    icon: '⚙️',
    color: 'bg-[#00B4EB]',
    bgLight: 'bg-[#ABEBFF]',
    textColor: 'text-[#0078D0]',
    hex: '#00B4EB',
  },
  MALI_YAPI: {
    key: 'MALI_YAPI',
    label: 'Mali Yapı',
    icon: '🏛️',
    color: 'bg-[#0049AA]',
    bgLight: 'bg-[#E6F9FF]',
    textColor: 'text-[#00287F]',
    hex: '#0049AA',
  },
  KARLILIK: {
    key: 'KARLILIK',
    label: 'Karlılık',
    icon: '📈',
    color: 'bg-[#00A651]',
    bgLight: 'bg-[#ECFDF5]',
    textColor: 'text-[#00804D]',
    hex: '#00A651',
  },
} as const;

export type OranKategorisi = keyof typeof ORAN_KATEGORILERI;

// Helper functions
export function getRiskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return 'KRITIK';
  if (score >= 60) return 'YUKSEK';
  if (score >= 40) return 'ORTA';
  if (score >= 20) return 'DUSUK';
  return 'NORMAL';
}

export function getKurganActionFromScore(score: number): KurganAction {
  if (score >= 90) return 'INCELEME';
  if (score >= 75) return 'IZAHA_DAVET';
  if (score >= 60) return 'BILGI_ISTEME';
  return 'TAKIP';
}

export function getRiskLevelConfig(level: RiskLevel) {
  return RISK_LEVELS[level];
}

export function getKurganActionConfig(action: KurganAction) {
  return KURGAN_ACTIONS[action];
}

// ============================================
// TYPOGRAPHY
// ============================================
export const TYPOGRAPHY = {
  heading: {
    xl: 'text-2xl font-bold',
    lg: 'text-lg font-semibold',
    md: 'text-base font-semibold',
    sm: 'text-sm font-semibold',
  },
  body: {
    lg: 'text-base',
    md: 'text-sm',
    sm: 'text-xs',
  },
  label: {
    md: 'text-sm font-medium text-slate-700',
    sm: 'text-xs font-medium text-slate-600',
  },
  caption: 'text-xs text-slate-500',
  mono: 'font-mono text-sm',
} as const;

// ============================================
// SPACING
// ============================================
export const SPACING = {
  panel: {
    padding: 'p-5',
    headerPadding: 'px-5 py-4',
    gap: 'gap-4',
  },
  card: {
    padding: 'p-4',
    headerPadding: 'px-4 py-3',
    gap: 'gap-3',
  },
  compact: {
    padding: 'p-3',
    gap: 'gap-2',
  },
  section: {
    gap: 'gap-6',
    marginBottom: 'mb-6',
  },
} as const;

// ============================================
// BUTTONS
// ============================================
export const BUTTONS = {
  primary: {
    base: 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0078D0]',
    default: 'bg-[#0049AA] text-white hover:bg-[#00287F]',
    disabled: 'bg-[#ABEBFF] text-[#5A5A5A] cursor-not-allowed',
  },
  secondary: {
    base: 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B4B4B4]',
    default: 'bg-white border border-[#E5E5E5] text-[#2E2E2E] hover:bg-[#F5F6F8]',
    disabled: 'bg-[#F5F6F8] text-[#969696] cursor-not-allowed',
  },
  ghost: {
    base: 'inline-flex items-center justify-center font-medium rounded-lg transition-colors',
    default: 'text-[#5A5A5A] hover:bg-[#F5F6F8]',
    disabled: 'text-[#B4B4B4] cursor-not-allowed',
  },
  danger: {
    base: 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9196]',
    default: 'bg-[#F0282D] text-white hover:bg-[#BF192B]',
    disabled: 'bg-[#FFC7C9] text-[#5A5A5A] cursor-not-allowed',
  },
  link: {
    base: 'inline-flex items-center font-medium transition-colors',
    default: 'text-[#0049AA] hover:text-[#0078D0] hover:underline',
    disabled: 'text-[#ABEBFF] cursor-not-allowed',
  },
  sizes: {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
    icon: {
      sm: 'p-1.5',
      md: 'p-2',
      lg: 'p-2.5',
    },
  },
} as const;

// ============================================
// ICONS
// ============================================
export const ICON_SIZES = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
} as const;

// ============================================
// STATES (Loading, Error, Empty)
// ============================================
export const STATES = {
  loading: {
    spinner: {
      sm: 'h-4 w-4 border-2 border-[#E5E5E5] border-t-[#0049AA] rounded-full animate-spin',
      md: 'h-6 w-6 border-2 border-[#E5E5E5] border-t-[#0049AA] rounded-full animate-spin',
      lg: 'h-8 w-8 border-3 border-[#B4B4B4] border-t-[#0078D0] rounded-full animate-spin',
    },
    skeleton: 'bg-[#E5E5E5] animate-pulse rounded',
    overlay: 'absolute inset-0 bg-white/80 flex items-center justify-center',
  },
  error: {
    container: 'bg-[#FEF2F2] border border-[#FF9196] rounded-lg p-4',
    icon: 'text-[#F0282D]',
    title: 'text-[#980F30] font-semibold',
    message: 'text-[#BF192B] text-sm',
    retryButton: 'mt-3 px-4 py-2 bg-[#F0282D] text-white rounded-lg hover:bg-[#BF192B] text-sm font-medium',
  },
  empty: {
    container: 'bg-[#F5F6F8] border border-[#E5E5E5] rounded-lg p-6 text-center',
    icon: 'text-[#969696] mx-auto mb-3',
    title: 'text-[#2E2E2E] font-medium',
    message: 'text-[#5A5A5A] text-sm mt-1',
    action: 'mt-4',
  },
  success: {
    container: 'bg-[#ECFDF5] border border-[#6BDB83] rounded-lg p-4',
    icon: 'text-[#00A651]',
    title: 'text-[#005A46] font-semibold',
    message: 'text-[#00804D] text-sm',
  },
  warning: {
    container: 'bg-[#FFFBEB] border border-[#FFE045] rounded-lg p-4',
    icon: 'text-[#FFB114]',
    title: 'text-[#E67324] font-semibold',
    message: 'text-[#FA841E] text-sm',
  },
  info: {
    container: 'bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-4',
    icon: 'text-[#0078D0]',
    title: 'text-[#00287F] font-semibold',
    message: 'text-[#0049AA] text-sm',
  },
} as const;

// ============================================
// CARDS & PANELS
// ============================================
export const CONTAINERS = {
  card: {
    base: 'bg-white border border-[#E5E5E5] rounded-lg shadow-sm',
    hover: 'hover:border-[#B4B4B4] hover:shadow-md transition-all',
    padding: 'p-4',
  },
  panel: {
    base: 'bg-white border border-[#E5E5E5] rounded-xl shadow-sm',
    padding: 'p-5',
  },
  section: {
    base: 'bg-[#F5F6F8] rounded-lg',
    padding: 'p-4',
  },
} as const;

// ============================================
// BADGES
// ============================================
export const BADGES = {
  base: 'inline-flex items-center font-medium rounded-full',
  sizes: {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1 text-sm',
  },
  variants: {
    default: 'bg-[#F5F6F8] text-[#5A5A5A]',
    primary: 'bg-[#E6F9FF] text-[#0049AA]',
    success: 'bg-[#ECFDF5] text-[#00804D]',
    warning: 'bg-[#FFFBEB] text-[#E67324]',
    danger: 'bg-[#FEF2F2] text-[#BF192B]',
    info: 'bg-[#ABEBFF] text-[#0078D0]',
  },
} as const;

// ============================================
// TABLES
// ============================================
export const TABLES = {
  container: 'overflow-x-auto',
  table: 'min-w-full divide-y divide-[#E5E5E5]',
  header: {
    row: 'bg-[#F5F6F8]',
    cell: 'px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase tracking-wider',
  },
  body: {
    row: 'border-b border-[#E5E5E5] hover:bg-[#F5F6F8] transition-colors',
    cell: 'px-4 py-3 text-sm text-[#2E2E2E]',
  },
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================
export function getButtonClasses(
  variant: keyof typeof BUTTONS = 'primary',
  size: keyof typeof BUTTONS.sizes = 'md',
  disabled = false
): string {
  if (variant === 'sizes') return '';
  const btn = BUTTONS[variant];
  const sizeClass = typeof BUTTONS.sizes[size] === 'string' ? BUTTONS.sizes[size] : '';
  return `${btn.base} ${disabled ? btn.disabled : btn.default} ${sizeClass}`;
}

export function getSpinnerClasses(size: keyof typeof STATES.loading.spinner = 'md'): string {
  return STATES.loading.spinner[size];
}

export function getBadgeClasses(
  variant: keyof typeof BADGES.variants = 'default',
  size: keyof typeof BADGES.sizes = 'md'
): string {
  return `${BADGES.base} ${BADGES.sizes[size]} ${BADGES.variants[variant]}`;
}
