import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ═══════════════════════════════════════════════════════════════
        // LYNTOS BRAND COLORS - Kartela Uyumlu Renk Paleti
        // ═══════════════════════════════════════════════════════════════
        lyntos: {
          // ★ LYNTOS BLUE SCALE - ANA RENK PALETİ (Karteladan)
          blue: {
            900: '#00287F',   // En koyu - Header gradient start
            700: '#0049AA',   // ★ PRIMARY - Butonlar, aktif state
            500: '#0078D0',   // Secondary - Links, accents
            400: '#00B4EB',   // Tertiary - Hover, highlights
            200: '#5ED6FF',   // Light - Hover backgrounds
            50:  '#ABEBFF',   // Lightest - Panel backgrounds
            25:  '#E6F9FF',   // Ultra light - Subtle backgrounds
            DEFAULT: '#0049AA',
          },
          // ★ TURUNCU SCALE - Warning/Orta Risk (Karteladan)
          orange: {
            900: '#E67324',   // Dark orange
            700: '#FA841E',   // Orange
            500: '#FFB114',   // ★ PRIMARY WARNING - Orta Risk
            400: '#FFCE19',   // Yellow-orange
            200: '#FFE045',   // Yellow
            50:  '#FFF08C',   // Light yellow
            25:  '#FFFBEB',   // Ultra light warning bg
            DEFAULT: '#FFB114',
          },
          // ★ YEŞİL SCALE - Success/Düşük Risk (Karteladan)
          green: {
            900: '#005A46',   // Dark green
            700: '#00804D',   // Forest green
            500: '#00A651',   // ★ PRIMARY SUCCESS - Düşük Risk
            400: '#00CB50',   // Bright green
            200: '#6BDB83',   // Light green
            50:  '#AAE8B8',   // Lightest green
            25:  '#ECFDF5',   // Ultra light success bg
            DEFAULT: '#00A651',
          },
          // ★ KIRMIZI SCALE - Error/Yüksek-Kritik Risk (Karteladan)
          red: {
            900: '#980F30',   // ★ KRITIK RISK - Darkest red
            700: '#BF192B',   // Deep red
            500: '#F0282D',   // ★ YÜKSEK RISK - Primary error
            400: '#FF555F',   // Medium red
            200: '#FF9196',   // Light red
            50:  '#FFC7C9',   // Lightest red
            25:  '#FEF2F2',   // Ultra light error bg
            DEFAULT: '#F0282D',
          },
          // ★ NÖTR SCALE - Griler (Karteladan)
          neutral: {
            900: '#000000',   // Black (nadir kullanım)
            800: '#2E2E2E',   // ★ PRIMARY TEXT
            600: '#5A5A5A',   // ★ SECONDARY TEXT
            400: '#969696',   // Muted text, placeholders
            300: '#B4B4B4',   // Disabled states
            100: '#E5E5E5',   // ★ BORDERS
            50:  '#F5F6F8',   // ★ PAGE BACKGROUND
            25:  '#FAFBFC',   // Card backgrounds
            bg: '#F5F6F8',
            card: '#FFFFFF',
            border: '#E5E5E5',
            'text-dark': '#2E2E2E',
            'text-light': '#5A5A5A',
          },
          // ★ RISK RENKLERI - Semantic (Karteladan)
          risk: {
            critical: '#980F30',     // Kritik - Koyu kırmızı
            high: '#F0282D',         // Yüksek - Kırmızı
            medium: '#FFB114',       // Orta - Turuncu/Amber
            low: '#00A651',          // Düşük - Yeşil
            'critical-bg': '#FEF2F2',
            'high-bg': '#FFC7C9',
            'medium-bg': '#FFFBEB',
            'low-bg': '#ECFDF5',
            DEFAULT: '#F0282D',
          },
          // Backgrounds (light mode)
          bg: {
            primary: '#F5F6F8',      // Main background
            secondary: '#FFFFFF',    // Elevated surfaces
            card: '#FFFFFF',         // Cards
            elevated: '#F8FAFC',     // Hover states
            input: '#FFFFFF',        // Input fields
          },
          // Accent - LYNTOS Blue
          accent: {
            DEFAULT: '#0049AA',      // Primary Blue
            light: '#0078D0',        // Secondary Blue
            dark: '#00287F',         // Dark Blue
            muted: '#E6F9FF',        // Ultra Light Blue
          },
          // Success (Fluent Green)
          success: {
            bg: '#ECFDF5',
            DEFAULT: '#107C10',
            light: '#34D399',
            muted: '#D1FAE5',
          },
          // Warning (Fluent Amber)
          warning: {
            bg: '#FFFBEB',
            DEFAULT: '#FFB900',
            light: '#FCD34D',
            muted: '#FEF3C7',
          },
          // Info (LYNTOS Blue)
          info: {
            bg: '#E6F9FF',
            DEFAULT: '#0078D0',
            light: '#5ED6FF',
            muted: '#ABEBFF',
          },
          // Borders
          border: {
            DEFAULT: '#E1E1E1',
            light: '#F1F5F9',
            dark: '#CBD5E1',
          },
          // Text
          text: {
            primary: '#1E1E1E',
            secondary: '#737373',
            muted: '#9CA3AF',
            inverted: '#FFFFFF',
          },
          // CSS Variable-based colors (for light/dark switching)
          surface: {
            DEFAULT: 'var(--lyntos-surface)',
            muted: 'var(--lyntos-surface-muted)',
            elevated: 'var(--lyntos-surface-elevated)',
          },
        },
      },
      // Spacing tokens
      spacing: {
        'card': '1rem',      // 16px - card padding
        'section': '2rem',   // 32px - section gap
        'panel': '1.5rem',   // 24px - panel padding
      },
      // Border radius tokens
      borderRadius: {
        'card': '0.5rem',    // 8px
        'button': '0.375rem', // 6px
        'badge': '9999px',   // full
      },
      // Box shadow tokens
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'elevated': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
