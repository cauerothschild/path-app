'use client'

/**
 * Onda assinatura — linguagem visual recorrente do Path.
 *
 * Variantes:
 *  - "logo"        → onda completa (4 elevações) usada na splash/header
 *  - "divider"     → onda de baixa amplitude para separar seções (página inteira)
 *  - "accent"      → onda discreta, decorativa
 *  - "loader"      → onda animada de carregamento
 *
 * Sempre desenhada com `currentColor` para herdar do contexto.
 */

interface Props {
  variant?: 'logo' | 'divider' | 'accent' | 'loader'
  className?: string
  /** opacidade da linha (0..1). Default depende da variante. */
  opacity?: number
  /** thin stroke em unidades do viewBox. Default depende da variante. */
  strokeWidth?: number
  /** anima desenho progressivo (stroke-dashoffset) */
  animated?: boolean
}

const PATHS = {
  logo:
    'M 10 46 ' +
    'C 14 46 18 34 24 34 ' +
    'C 30 34 34 46 40 52 ' +
    'C 46 58 54 58 60 52 ' +
    'C 68 44 72 16 82 8 ' +
    'C 92 0 100 22 108 38 ' +
    'C 114 50 122 56 128 50 ' +
    'C 134 44 138 30 146 30 ' +
    'C 154 30 158 42 164 50 ' +
    'C 168 56 174 58 178 52 ' +
    'C 182 46 186 36 192 36 ' +
    'C 196 36 198 42 200 46',
  /** onda longa de baixa amplitude (full-bleed) */
  divider:
    'M 0 30 ' +
    'C 60 30 80 18 140 18 ' +
    'C 200 18 220 42 280 42 ' +
    'C 340 42 360 22 400 22',
  accent:
    'M 0 20 ' +
    'C 20 20 30 6 50 6 ' +
    'C 70 6 80 34 100 34',
} as const

const VIEWBOXES = {
  logo: '0 0 200 60',
  divider: '0 0 400 60',
  accent: '0 0 100 40',
  loader: '0 0 200 60',
}

export default function WavePath({
  variant = 'logo',
  className = '',
  opacity,
  strokeWidth,
  animated = false,
}: Props) {
  const d = variant === 'loader' ? PATHS.logo : PATHS[variant]
  const vb = VIEWBOXES[variant]

  const defaultOpacity =
    variant === 'divider' ? 0.18 : variant === 'accent' ? 0.45 : 1
  const defaultStroke =
    variant === 'divider' ? 1.5 : variant === 'accent' ? 2.5 : 6

  const op = opacity ?? defaultOpacity
  const sw = strokeWidth ?? defaultStroke

  const drawAnim =
    animated || variant === 'loader'
      ? {
          strokeDasharray: 600,
          strokeDashoffset: 600,
          animation: 'waveDraw 1.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        }
      : undefined

  return (
    <svg
      viewBox={vb}
      preserveAspectRatio={variant === 'divider' ? 'none' : 'xMidYMid meet'}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={op}
        style={drawAnim}
      />
    </svg>
  )
}
