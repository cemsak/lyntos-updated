/**
 * LYNTOS Design Tokens - Kaizen Görsel Sistem
 *
 * Tutarlı renk, tipografi ve spacing değerleri
 * Tüm V2 sayfalarında kullanılacak
 */

// =============================================================================
// RENK PALETİ
// =============================================================================

export const colors = {
  // ★ LYNTOS Primary Blue Scale - ANA RENK: #0049AA
  primary: {
    25: '#E6F9FF',   // Ultra light - Subtle backgrounds
    50: '#ABEBFF',   // Lightest - Panel backgrounds
    100: '#5ED6FF',  // Light
    200: '#5ED6FF',  // Light - Hover backgrounds
    300: '#00B4EB',  // Tertiary - Hover
    400: '#00B4EB',  // Tertiary - Hover, highlights
    500: '#0078D0',  // Secondary - Links, accents (Ana ton)
    600: '#0049AA',  // ★ PRIMARY - Sidebar aktif, butonlar
    700: '#0049AA',  // ★ PRIMARY
    800: '#00287F',  // En koyu - Deep headers
    900: '#00287F',  // En koyu
  },

  // Success (LYNTOS Fluent Green)
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#107C10', // ★ LYNTOS Risk Low (Fluent Green)
    600: '#0E6B0E',
    700: '#0A5A0A',
  },

  // Warning (LYNTOS Fluent Amber)
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#FFB900', // ★ LYNTOS Risk Medium (Fluent Amber)
    600: '#D97706',
    700: '#B45309',
  },

  // Error (LYNTOS Fluent Red)
  error: {
    50: '#FDF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#E74C3C', // ★ LYNTOS Risk High (Fluent Red)
    600: '#A4373A', // ★ LYNTOS Risk Critical (Dark Red)
    700: '#8B2D2F',
  },

  // Neutral (LYNTOS Grays)
  neutral: {
    50: '#F5F6F8',   // ★ LYNTOS Background
    100: '#F1F5F9',
    200: '#E1E1E1',  // ★ LYNTOS Border
    300: '#CBD5E1',
    400: '#9CA3AF',
    500: '#737373',  // ★ LYNTOS Text Light
    600: '#475569',
    700: '#334155',
    800: '#1E1E1E',  // ★ LYNTOS Text Dark
    900: '#0F172A',
  },

  // Accent (LYNTOS Blue Variants)
  accent: {
    blue: '#0049AA',     // ★ LYNTOS Primary
    lightBlue: '#0078D0', // LYNTOS Secondary
    cyan: '#00B4EB',      // LYNTOS Tertiary
    orange: '#F97316',    // Accent Orange
  },

  // Gradients (LYNTOS Blue Based)
  gradients: {
    primary: 'linear-gradient(135deg, #0049AA 0%, #0078D0 100%)',      // LYNTOS Blue
    secondary: 'linear-gradient(135deg, #0078D0 0%, #00B4EB 100%)',    // Light Blue
    success: 'linear-gradient(135deg, #107C10 0%, #34D399 100%)',      // Fluent Green
    warning: 'linear-gradient(135deg, #FFB900 0%, #FCD34D 100%)',      // Fluent Amber
    error: 'linear-gradient(135deg, #E74C3C 0%, #F87171 100%)',        // Fluent Red
    dark: 'linear-gradient(135deg, #1E1E1E 0%, #334155 100%)',         // LYNTOS Dark
    money: 'linear-gradient(135deg, #FFB900 0%, #F97316 100%)',        // Money Gold
    sektor: 'linear-gradient(135deg, #0049AA 0%, #0078D0 50%, #00B4EB 100%)', // Sektör Panel
    tcmb: 'linear-gradient(135deg, #107C10 0%, #34D399 100%)',         // TCMB Panel
  },
};

// =============================================================================
// TİPOGRAFİ
// =============================================================================

export const typography = {
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  // Component internal padding
  card: {
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },

  // Section gaps
  section: {
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px',
  },

  // Grid gaps
  grid: {
    sm: '12px',
    md: '16px',
    lg: '24px',
  },
};

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const borderRadius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  full: '9999px',
};

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  glow: {
    primary: '0 0 20px rgba(0, 73, 170, 0.3)',     // LYNTOS Blue
    secondary: '0 0 20px rgba(0, 120, 208, 0.3)', // LYNTOS Light Blue
    success: '0 0 20px rgba(16, 124, 16, 0.3)',   // Fluent Green
    warning: '0 0 20px rgba(255, 185, 0, 0.3)',   // Fluent Amber
    error: '0 0 20px rgba(231, 76, 60, 0.3)',     // Fluent Red
  },
};

// =============================================================================
// ANİMASYONLAR
// =============================================================================

export const animations = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },

  easing: {
    ease: 'ease',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  keyframes: {
    fadeIn: `
      from { opacity: 0; }
      to { opacity: 1; }
    `,
    slideUp: `
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    `,
    slideDown: `
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    `,
    scaleIn: `
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    `,
    pulse: `
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    `,
    shimmer: `
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    `,
  },
};

// =============================================================================
// Z-INDEX
// =============================================================================

export const zIndex = {
  dropdown: 100,
  sticky: 200,
  modal: 300,
  popover: 400,
  tooltip: 500,
  toast: 600,
};

// =============================================================================
// BREAKPOINTS
// =============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// =============================================================================
// DURUM RENKLERİ (Risk, VDK, Beyanname vb.)
// =============================================================================

export const statusColors = {
  // ★ Risk seviyeleri (LYNTOS Fluent Palette)
  risk: {
    low: { bg: 'bg-[#ECFDF5]', text: 'text-[#107C10]', border: 'border-[#34D399]', dot: 'bg-[#107C10]' },        // Fluent Green
    medium: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', border: 'border-[#FCD34D]', dot: 'bg-[#FFB900]' },      // Fluent Amber
    high: { bg: 'bg-[#FEF2F2]', text: 'text-[#E74C3C]', border: 'border-[#FCA5A5]', dot: 'bg-[#E74C3C]' },        // Fluent Red
    critical: { bg: 'bg-[#FDF2F2]', text: 'text-[#A4373A]', border: 'border-[#E74C3C]', dot: 'bg-[#A4373A]' },    // Fluent Dark Red
  },

  // VDK kriterleri (LYNTOS Fluent)
  vdk: {
    pass: { bg: 'bg-[#ECFDF5]', text: 'text-[#107C10]', icon: 'text-[#107C10]' },      // Fluent Green
    warning: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', icon: 'text-[#FFB900]' },   // Fluent Amber
    fail: { bg: 'bg-[#FEF2F2]', text: 'text-[#E74C3C]', icon: 'text-[#E74C3C]' },      // Fluent Red
    pending: { bg: 'bg-[#F5F6F8]', text: 'text-[#737373]', icon: 'text-[#9CA3AF]' },   // LYNTOS Neutral
  },

  // İş akışı durumları (LYNTOS Blue + Fluent)
  workflow: {
    completed: { bg: 'bg-[#ECFDF5]', text: 'text-[#107C10]', border: 'border-[#34D399]' },   // Fluent Green
    current: { bg: 'bg-[#E6F9FF]', text: 'text-[#0049AA]', border: 'border-[#0078D0]' },     // LYNTOS Blue
    pending: { bg: 'bg-[#F5F6F8]', text: 'text-[#737373]', border: 'border-[#E1E1E1]' },     // LYNTOS Neutral
    locked: { bg: 'bg-[#F5F6F8]', text: 'text-[#9CA3AF]', border: 'border-[#E1E1E1]' },      // LYNTOS Light Gray
  },

  // Beyanname durumları (LYNTOS Fluent)
  beyanname: {
    submitted: { bg: 'bg-[#ECFDF5]', text: 'text-[#107C10]' },   // Fluent Green
    pending: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]' },     // Fluent Amber
    overdue: { bg: 'bg-[#FEF2F2]', text: 'text-[#E74C3C]' },     // Fluent Red
    upcoming: { bg: 'bg-[#E6F9FF]', text: 'text-[#0049AA]' },    // LYNTOS Blue
  },
};

// =============================================================================
// COMPONENT VARIANTS
// =============================================================================

export const componentVariants = {
  // Card variants
  card: {
    default: 'bg-white border border-slate-200 rounded-xl shadow-sm',
    elevated: 'bg-white border border-slate-100 rounded-xl shadow-lg',
    outlined: 'bg-transparent border-2 border-slate-200 rounded-xl',
    filled: 'bg-slate-50 border border-slate-200 rounded-xl',
    interactive: 'bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer',
  },

  // Button variants (LYNTOS Blue)
  button: {
    primary: 'bg-[#0049AA] text-white hover:bg-[#00287F] active:bg-[#00287F]',        // LYNTOS Blue
    secondary: 'bg-[#F5F6F8] text-[#1E1E1E] hover:bg-[#E1E1E1] active:bg-[#CBD5E1]',  // LYNTOS Neutral
    outline: 'border border-[#E1E1E1] text-[#1E1E1E] hover:bg-[#F5F6F8] active:bg-[#E1E1E1]',
    ghost: 'text-[#737373] hover:bg-[#F5F6F8] active:bg-[#E1E1E1]',
    danger: 'bg-[#E74C3C] text-white hover:bg-[#A4373A] active:bg-[#A4373A]',         // Fluent Red
    success: 'bg-[#107C10] text-white hover:bg-[#0E6B0E] active:bg-[#0A5A0A]',        // Fluent Green
  },

  // Badge variants (LYNTOS Palette)
  badge: {
    default: 'bg-[#F5F6F8] text-[#737373]',
    primary: 'bg-[#E6F9FF] text-[#0049AA]',      // LYNTOS Blue
    success: 'bg-[#ECFDF5] text-[#107C10]',      // Fluent Green
    warning: 'bg-[#FFFBEB] text-[#D97706]',      // Fluent Amber
    error: 'bg-[#FEF2F2] text-[#E74C3C]',        // Fluent Red
    info: 'bg-[#E6F9FF] text-[#0078D0]',         // LYNTOS Light Blue
  },

  // Input variants (LYNTOS Blue Focus)
  input: {
    default: 'border border-[#E1E1E1] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0049AA] focus:border-[#0049AA]',
    error: 'border border-[#E74C3C] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E74C3C] focus:border-[#E74C3C]',
    disabled: 'border border-[#E1E1E1] rounded-lg px-3 py-2 text-sm bg-[#F5F6F8] text-[#9CA3AF] cursor-not-allowed',
  },
};

// =============================================================================
// ICON SIZES
// =============================================================================

export const iconSizes = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  '2xl': 'w-10 h-10',
};

// =============================================================================
// GLASSMORPHISM STYLES
// =============================================================================

export const glassmorphism = {
  light: 'bg-white/80 backdrop-blur-sm',
  medium: 'bg-white/70 backdrop-blur-md',
  heavy: 'bg-white/60 backdrop-blur-lg',
  dark: 'bg-slate-900/80 backdrop-blur-sm',
};

// =============================================================================
// EXPORT ALL
// =============================================================================

export const designTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations,
  zIndex,
  breakpoints,
  statusColors,
  componentVariants,
  iconSizes,
  glassmorphism,
};

export default designTokens;
