import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Background
        bg: '#0a1614',          // fundo mais escuro (quase preto)
        surface: '#0d2827',     // verde profundo (cards/superfícies)
        elevated: '#102e2c',    // cards levemente elevados
        border: '#1a3835',      // bordas sutis
        // Acentos
        primary: '#a4dcb5',     // celadon - botões primários e Grit
        primaryDim: '#7fb893',  // versão menos vibrante
        accent: '#035147',      // verde médio
        // Texto
        ink: '#f6f5fc',         // texto principal
        muted: '#7d918f',       // texto secundário
        subtle: '#4a605d',      // texto bem secundário
        // Alertas
        warn: '#d97b5a',        // laranja queimado (não fiz / alerta)
        warnDim: '#a35c43',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.05em',
      },
    },
  },
  plugins: [],
}
export default config
