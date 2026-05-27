'use client'

interface Props {
  score: number
  daysActive: number
}

export default function GritDisplay({ score, daysActive }: Props) {
  const status =
    daysActive < 3
      ? 'Aprendendo seu padrão'
      : score >= 70
      ? 'Alta consistência'
      : score >= 40
      ? 'Em formação'
      : 'Base inicial'

  return (
    <div className="flex flex-col items-center py-12">
      <p className="text-xs text-muted uppercase tracking-widest mb-4">Grit</p>
      <div className="grit-number text-8xl text-frost mb-2">{score}</div>
      <p className="text-xs text-muted">{status}</p>
    </div>
  )
}
