'use client'

interface Props {
  score: number
  delta?: number
  size?: number
  label?: string
}

/**
 * Anel circular do Grit. Estilo Oura Ring.
 * Mostra: número grande + label + delta ("↑ +4 hoje").
 */
export default function GritRing({ score, delta = 0, size = 200, label = 'GRIT' }: Props) {
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  // O anel cobre 270° (3/4 da volta), gap de 90° embaixo
  const arcLength = circumference * 0.75
  const progress = Math.min(100, Math.max(0, score)) / 100
  const dashOffset = arcLength * (1 - progress)
  // Rotação para o gap ficar embaixo
  const rotation = 135 // graus

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1a3835"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
        />
        {/* Progresso */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#a4dcb5"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arcLength - dashOffset} ${circumference}`}
          transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
        />
      </svg>

      {/* Centro */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="tabular text-6xl font-extralight text-ink leading-none -mt-2">
          {score}
        </div>
        <div className="text-[10px] tracking-[0.25em] text-muted mt-2 font-medium">
          {label}
        </div>
        {delta !== 0 && (
          <div className="absolute -bottom-1 text-[11px] text-primary font-medium tabular">
            {delta > 0 ? '↑' : '↓'} {delta > 0 ? '+' : ''}{delta} hoje
          </div>
        )}
      </div>
    </div>
  )
}
