'use client'

import { useState } from 'react'

const REASONS = [
  { key: 'tired', label: 'Cansaço' },
  { key: 'forgot', label: 'Esqueci' },
  { key: 'chaotic', label: 'Dia caótico' },
  { key: 'unwilling', label: 'Não quis' },
]

const DIFFICULTIES = [
  { value: 1 as const, label: 'Fácil' },
  { value: 2 as const, label: 'Médio' },
  { value: 3 as const, label: 'Difícil' },
]

interface Props {
  appOpenTime: number
  alreadyChecked: { executed: boolean; failure_reason: string | null } | null
  onSubmit: (data: {
    executed: boolean
    difficulty: 1 | 2 | 3
    failureReason: string | null
    responseSpeedMs: number
  }) => Promise<void>
}

export default function CheckInPanel({ appOpenTime, alreadyChecked, onSubmit }: Props) {
  const [executed, setExecuted] = useState<boolean | null>(
    alreadyChecked ? alreadyChecked.executed : null
  )
  const [selectedReason, setSelectedReason] = useState<string | null>(
    alreadyChecked?.failure_reason ?? null
  )
  const [showDifficulty, setShowDifficulty] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(!!alreadyChecked)

  async function pickReason(reason: string) {
    setSelectedReason(reason)
    setSubmitting(true)
    await onSubmit({
      executed: false,
      difficulty: 2,
      failureReason: reason,
      responseSpeedMs: Date.now() - appOpenTime,
    })
    setSubmitting(false)
    setDone(true)
  }

  async function pickDifficulty(d: 1 | 2 | 3) {
    setSubmitting(true)
    await onSubmit({
      executed: true,
      difficulty: d,
      failureReason: null,
      responseSpeedMs: Date.now() - appOpenTime,
    })
    setSubmitting(false)
    setDone(true)
  }

  if (done) {
    const reasonLabel = REASONS.find(r => r.key === selectedReason)?.label.toLowerCase()
    return (
      <div className="bg-surface/30 border border-border rounded-2xl p-5">
        <div className="text-xs text-muted mb-1">Check-in de hoje</div>
        <div className="text-sm text-ink">
          {executed ? 'Comportamento mantido.' : `Não executado — ${reasonLabel ?? '—'}.`}
        </div>
        <div className="text-[11px] text-muted mt-3">Volte amanhã.</div>
      </div>
    )
  }

  return (
    <div className="bg-surface/30 border border-border rounded-2xl p-5 space-y-4">
      <div>
        <div className="text-xs text-muted mb-0.5">Check-in diário</div>
        <div className="text-sm text-ink">Você manteve o comportamento hoje?</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            setExecuted(true)
            setShowDifficulty(true)
          }}
          disabled={submitting}
          className={`py-3.5 rounded-xl font-medium transition disabled:opacity-50 ${
            executed === true
              ? 'bg-primary text-bg'
              : 'bg-surface/60 border border-border text-ink hover:bg-surface/80'
          }`}
        >
          Fiz
        </button>
        <button
          onClick={() => {
            setExecuted(false)
            setShowDifficulty(false)
          }}
          disabled={submitting}
          className={`py-3.5 rounded-xl font-medium transition disabled:opacity-50 ${
            executed === false
              ? 'bg-warn/90 text-bg'
              : 'bg-surface/60 border border-border text-ink hover:bg-surface/80'
          }`}
        >
          Não fiz
        </button>
      </div>

      {/* Micro-input: razão de falha */}
      {executed === false && (
        <div className="pt-2 fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted">O que mais pesou hoje?</div>
            <button
              onClick={() => setExecuted(null)}
              className="text-muted hover:text-ink"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {REASONS.map(r => (
              <button
                key={r.key}
                onClick={() => pickReason(r.key)}
                disabled={submitting}
                className={`py-3 rounded-xl text-sm border transition ${
                  selectedReason === r.key
                    ? 'bg-warn/15 border-warn/60 text-warn'
                    : 'bg-surface/40 border-border text-ink hover:bg-surface/60'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Micro-input: dificuldade do dia */}
      {executed === true && showDifficulty && (
        <div className="pt-2 fade-in">
          <div className="text-xs text-muted mb-3">Como foi o dia?</div>
          <div className="grid grid-cols-3 gap-2.5">
            {DIFFICULTIES.map(d => (
              <button
                key={d.value}
                onClick={() => pickDifficulty(d.value)}
                disabled={submitting}
                className="py-3 rounded-xl text-sm bg-surface/40 border border-border text-ink hover:bg-surface/60 transition disabled:opacity-50"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
