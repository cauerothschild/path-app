'use client'

interface Props {
  score: number
  delta?: number
  size?: number
  label?: string
  hideScore?: boolean
  hideHalo?: boolean
  className?: string
}

/**
 * Grit Ring — peça icônica.
 *
 * - Track quase invisível (rgba branco 0.05)
 * - Progresso mint, stroke fino
 * - Halo externo soft (filter blur)
 * - Tipografia ultra-leve, tabular
 * - Anima entrada via stroke-dashoffset
 */
export default function GritRing({
  score,
  delta = 0,
  size = 240,
  label = 'GRIT',
  hideScore = false,
  hideHalo = false,
  className,
}: Props) {
  const stroke = 3.5
  const radius = (size - stroke - 8) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(100, Math.max(0, score)) / 100
  const arcLength = circumference // anel completo (mais sereno que 270°)
  const dashOffset = arcLength * (1 - progress)

  return (
    <div
      className={className ?? 'relative inline-block animate-fade-up'}
      style={{ width: size, height: size }}
    >
      {/* Halo externo */}
      {!hideHalo && (
        <div
          aria-hidden
          className="absolute inset-0 rounded-full pointer-events-none animate-breath"
          style={{
            background:
              'radial-gradient(circle, rgba(184,255,207,0.18) 0%, rgba(184,255,207,0.04) 40%, transparent 70%)',
            filter: 'blur(14px)',
          }}
        />
      )}

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative"
      >
        <defs>
          <filter id="grit-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />

        {/* Progresso */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#B8FFCF"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          filter="url(#grit-glow)"
          style={{
            transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>

      {/* Centro */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {!hideScore && (
          <div
            className="tabular font-extralight text-ink leading-none"
            style={{
              fontSize: size * 0.32,
              letterSpacing: '-0.04em',
            }}
          >
            {score}
          </div>
        )}
        <div className="eyebrow text-muted mt-3">{label}</div>
        {delta !== 0 && (
          <div className="absolute bottom-[16%] text-[11px] text-primary tabular tracking-wide">
            {delta > 0 ? '↑' : '↓'} {delta > 0 ? '+' : ''}{delta} hoje
          </div>
        )}
      </div>
    </div>
  )
}
