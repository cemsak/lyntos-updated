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
        // LYNTOS BRAND COLORS
        // ═══════════════════════════════════════════════════════════════
        lyntos: {
          // Backgrounds
          bg: {
            primary: '#09090b',    // zinc-950 - main background
            secondary: '#18181b',  // zinc-900 - elevated surfaces
            card: '#27272a',       // zinc-800 - cards
            elevated: '#3f3f46',   // zinc-700 - hover states
            input: '#18181b',      // zinc-900 - input fields
          },
          // Accent (amber)
          accent: {
            DEFAULT: '#f59e0b',    // amber-500
            light: '#fbbf24',      // amber-400
            dark: '#d97706',       // amber-600
            muted: '#78350f',      // amber-900
          },
          // Risk (red)
          risk: {
            bg: '#7f1d1d',         // red-900
            DEFAULT: '#dc2626',    // red-600
            light: '#fca5a5',      // red-300
            muted: '#991b1b',      // red-800
          },
          // Success (green)
          success: {
            bg: '#14532d',         // green-900
            DEFAULT: '#16a34a',    // green-600
            light: '#86efac',      // green-300
            muted: '#166534',      // green-800
          },
          // Warning (amber)
          warning: {
            bg: '#78350f',         // amber-900
            DEFAULT: '#f59e0b',    // amber-500
            light: '#fcd34d',      // amber-300
            muted: '#92400e',      // amber-800
          },
          // Info (blue)
          info: {
            bg: '#1e3a8a',         // blue-900
            DEFAULT: '#3b82f6',    // blue-500
            light: '#93c5fd',      // blue-300
            muted: '#1e40af',      // blue-800
          },
          // Borders
          border: {
            DEFAULT: '#3f3f46',    // zinc-700
            light: '#52525b',      // zinc-600
            dark: '#27272a',       // zinc-800
          },
          // Text
          text: {
            primary: '#fafafa',    // zinc-50
            secondary: '#a1a1aa',  // zinc-400
            muted: '#71717a',      // zinc-500
            inverted: '#09090b',   // zinc-950
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
      },
    },
  },
  plugins: [],
} satisfies Config;
