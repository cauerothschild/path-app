import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Matte black & superfícies — sem azulado, sem verdoso
        bg: '#000000',
        surface: '#0c0c0d',          // cards
        elevated: '#131315',         // cards elevados
        hairline: 'rgba(255,255,255,0.06)',
        border: 'rgba(255,255,255,0.08)',
        // Mint — acento único, luminoso
        primary: '#B8FFCF',          // mint signature
        primarySoft: 'rgba(184,255,207,0.12)',
        primaryGlow: 'rgba(184,255,207,0.35)',
        primaryDim: '#7FCC95',
        accent: '#1a3835',
        // Texto — escala editorial
        ink: '#F2F3F2',              // primary
        ink2: '#C8CECB',             // secondary
        muted: '#7A827E',            // tertiary (eyebrows)
        subtle: '#3F4543',           // disabled / faintest
        // Alertas e status
        warn: '#D9A57B',
        warnDim: '#8C6B52',
        success: '#6BCB8B',
        error: '#E07070',
      },
      fontFamily: {
        sans: [
          'SF Pro Text',
          'SF Pro Display',
          '-apple-system',
          'var(--font-inter)',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
        display: [
          'SF Pro Display',
          '-apple-system',
          'var(--font-inter)',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
      },
      letterSpacing: {
        tightest: '-0.04em',
        editorial: '-0.02em',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        glow: '0 0 24px 0 rgba(184,255,207,0.18)',
        glowSoft: '0 0 60px 0 rgba(184,255,207,0.10)',
      },
      transitionTimingFunction: {
        // Easing premium "ease-out-expo-like"
        premium: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-up': 'fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 1.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'breath': 'breath 6s ease-in-out infinite',
        'wave-draw': 'waveDraw 1.6s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        breath: {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
        waveDraw: {
          '0%': { strokeDashoffset: '600' },
          '100%': { strokeDashoffset: '0' },
        },
      },
    },
  },
  plugins: [],
}
export default config
