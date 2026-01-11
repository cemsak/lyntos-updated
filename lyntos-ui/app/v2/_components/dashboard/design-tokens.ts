/**
 * LYNTOS Design Tokens
 * Single Source of Truth for all visual styles
 *
 * Strategy: Stripe Minimalism + LYNTOS Brand Identity
 * Rule: NO hardcoded values in components - EVERYTHING from here
 */

// ============================================
// COLORS - LYNTOS BRAND
// ============================================
export const colors = {
  // Brand - LYNTOS Identity (Aksan renkleri)
  brand: {
    primary: '#6366F1',      // Indigo-500 - Ana marka rengi
    primaryHover: '#4F46E5', // Indigo-600
    primaryLight: '#EEF2FF', // Indigo-50 - Hafif arka plan
    secondary: '#8B5CF6',    // Purple-500 - Ikincil aksan
    secondaryLight: '#F5F3FF', // Purple-50
  },

  // Backgrounds - Stripe Inspired (Clean & Minimal)
  bg: {
    page: '#F8FAFC',         // Slate-50 - Sayfa arka plani
    card: '#FFFFFF',         // Beyaz - Kart arka plani
    cardHover: '#F1F5F9',    // Slate-100 - Hover durumu
    muted: '#F8FAFC',        // Slate-50 - Soluk arka plan
  },

  // Borders
  border: {
    default: '#E2E8F0',      // Slate-200 - Normal border
    light: '#F1F5F9',        // Slate-100 - Hafif border
    focus: '#6366F1',        // Brand primary - Focus durumu
  },

  // Text
  text: {
    primary: '#1E293B',      // Slate-800 - Ana metin
    secondary: '#475569',    // Slate-600 - Ikincil metin
    muted: '#94A3B8',        // Slate-400 - Soluk metin
    inverse: '#FFFFFF',      // Beyaz - Koyu arka plan uzerinde
  },

  // Status Colors - Semantic (Subtle, not neon)
  status: {
    // Success - Yesil
    success: '#10B981',        // Emerald-500
    successBg: '#ECFDF5',      // Emerald-50
    successBorder: '#A7F3D0',  // Emerald-200
    successText: '#065F46',    // Emerald-800

    // Warning - Amber
    warning: '#F59E0B',        // Amber-500
    warningBg: '#FFFBEB',      // Amber-50
    warningBorder: '#FCD34D',  // Amber-300
    warningText: '#92400E',    // Amber-800

    // Error/Danger - Kirmizi
    error: '#EF4444',          // Red-500
    errorBg: '#FEF2F2',        // Red-50
    errorBorder: '#FECACA',    // Red-200
    errorText: '#991B1B',      // Red-800

    // Info - Mavi
    info: '#3B82F6',           // Blue-500
    infoBg: '#EFF6FF',         // Blue-50
    infoBorder: '#BFDBFE',     // Blue-200
    infoText: '#1E40AF',       // Blue-800

    // Neutral - Gri
    neutral: '#64748B',        // Slate-500
    neutralBg: '#F8FAFC',      // Slate-50
    neutralBorder: '#E2E8F0',  // Slate-200
    neutralText: '#334155',    // Slate-700
  },
} as const;

// ============================================
// SPACING - Dense & Consistent
// ============================================
export const spacing = {
  xs: '4px',    // 0.25rem
  sm: '8px',    // 0.5rem
  md: '12px',   // 0.75rem
  lg: '16px',   // 1rem
  xl: '24px',   // 1.5rem
  '2xl': '32px', // 2rem
  '3xl': '48px', // 3rem
} as const;

// Tailwind class equivalents (for JSX className)
export const spacingClass = {
  xs: 'p-1',
  sm: 'p-2',
  md: 'p-3',
  lg: 'p-4',
  xl: 'p-6',
  '2xl': 'p-8',
} as const;

// ============================================
// TYPOGRAPHY
// ============================================
export const typography = {
  fontFamily: {
    sans: "'Inter', 'IBM Plex Sans', system-ui, -apple-system, sans-serif",
    mono: "'IBM Plex Mono', 'Fira Code', monospace",
  },
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px - KPI degerleri icin
    '4xl': '2.25rem',  // 36px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

// ============================================
// SHADOWS - Subtle & Professional
// ============================================
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
} as const;

// ============================================
// BORDER RADIUS
// ============================================
export const radius = {
  none: '0',
  sm: '4px',
  default: '8px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

// ============================================
// TRANSITIONS
// ============================================
export const transitions = {
  fast: '150ms ease',
  default: '200ms ease',
  slow: '300ms ease',
} as const;

// ============================================
// Z-INDEX SCALE
// ============================================
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  modal: 30,
  toast: 40,
  tooltip: 50,
} as const;

// ============================================
// COMPONENT PRESETS - Ready-to-use combinations
// ============================================
export const presets = {
  // Card styles
  card: {
    base: `bg-white border border-slate-200 rounded-lg shadow-sm`,
    hover: `hover:shadow-md hover:border-slate-300 transition-all duration-200`,
    interactive: `bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer`,
  },

  // KPI Card status variants
  kpiCard: {
    success: `bg-emerald-50 border-emerald-200`,
    warning: `bg-amber-50 border-amber-300`,
    error: `bg-red-50 border-red-200`,
    info: `bg-blue-50 border-blue-200`,
    neutral: `bg-slate-50 border-slate-200`,
  },

  // Badge/Chip styles
  badge: {
    success: `bg-emerald-100 text-emerald-800 border border-emerald-200`,
    warning: `bg-amber-100 text-amber-800 border border-amber-200`,
    error: `bg-red-100 text-red-800 border border-red-200`,
    info: `bg-blue-100 text-blue-800 border border-blue-200`,
    neutral: `bg-slate-100 text-slate-700 border border-slate-200`,
    brand: `bg-indigo-100 text-indigo-800 border border-indigo-200`,
  },

  // Button styles
  button: {
    primary: `bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg px-4 py-2 transition-colors`,
    secondary: `bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg px-4 py-2 border border-slate-200 transition-colors`,
    ghost: `hover:bg-slate-100 text-slate-600 font-medium rounded-lg px-4 py-2 transition-colors`,
  },

  // Panel header
  panelHeader: `text-lg font-semibold text-slate-800`,
  panelSubheader: `text-sm text-slate-500`,
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get status-based colors
 */
export function getStatusColors(status: 'success' | 'warning' | 'error' | 'info' | 'neutral') {
  const statusMap = {
    success: {
      bg: colors.status.successBg,
      border: colors.status.successBorder,
      text: colors.status.successText,
      icon: colors.status.success,
    },
    warning: {
      bg: colors.status.warningBg,
      border: colors.status.warningBorder,
      text: colors.status.warningText,
      icon: colors.status.warning,
    },
    error: {
      bg: colors.status.errorBg,
      border: colors.status.errorBorder,
      text: colors.status.errorText,
      icon: colors.status.error,
    },
    info: {
      bg: colors.status.infoBg,
      border: colors.status.infoBorder,
      text: colors.status.infoText,
      icon: colors.status.info,
    },
    neutral: {
      bg: colors.status.neutralBg,
      border: colors.status.neutralBorder,
      text: colors.status.neutralText,
      icon: colors.status.neutral,
    },
  };
  return statusMap[status];
}

/**
 * Get KPI card preset class based on status
 */
export function getKpiCardClass(status: 'success' | 'warning' | 'error' | 'info' | 'neutral'): string {
  return presets.kpiCard[status];
}

/**
 * Get badge preset class based on variant
 */
export function getBadgeClass(variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand'): string {
  return presets.badge[variant];
}

// Default export for convenience
export default {
  colors,
  spacing,
  typography,
  shadows,
  radius,
  transitions,
  zIndex,
  presets,
  getStatusColors,
  getKpiCardClass,
  getBadgeClass,
};
