'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { gritAccumulated, bucketFromDate, type CheckInData } from '@/lib/grit'
import WavePath from '@/components/WavePath'
import BottomNav from '@/components/BottomNav'

interface CheckInRow {
  id: string
  date: string
  executed: boolean
  difficulty: 1 | 2 | 3 | 4
  check_in_time: string
  execution_time: string | null
}

const DAY_NAMES = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados']

function computeBestStreak(history: CheckInRow[]): number {
  let best = 0, cur = 0
  for (const r of history) {
    if (r.executed) { cur++; if (cur > best) best = cur }
    else cur = 0
  }
  return best
}

export default function StatsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [gritScore, setGritScore] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [bucketRates, setBucketRates] = useState({ morning: -1, afternoon: -1, evening: -1 })
  const [patternPhrase, setPatternPhrase] = useState('')
  const [supportData, setSupportData] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { router.replace('/'); return }

    const { data: habits } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('active', true)
      .limit(1)
      .maybeSingle()

    if (!habits) { setLoading(false); return }

    const { data: rows } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('habit_id', habits.id)
      .order('date', { ascending: true })
      .limit(60)

    const history: CheckInRow[] = rows ?? []

    const windowSrc = habits.schedule_time || habits.preferred_time || ''
    const plannedParsed = (() => {
      const hhmm = windowSrc.match(/^(\d{1,2}):(\d{2})$/)
      if (hhmm) return { hour: parseInt(hhmm[1]), minute: parseInt(hhmm[2]) }
      const hmatch = windowSrc.match(/(\d{1,2})h/)
      if (hmatch) return { hour: parseInt(hmatch[1]), minute: 0 }
      return null
    })()

    const dayInputs: CheckInData[] = []
    let runningStreak = 0
    for (const row of history) {
      const timeToUse = row.execution_time ? new Date(row.execution_time) : new Date(row.check_in_time)
      dayInputs.push({
        executed: row.executed,
        difficulty: row.difficulty,
        executionTime: row.executed ? timeToUse : null,
        streakBefore: runningStreak,
        ...(plannedParsed ? { plannedHour: plannedParsed.hour, plannedMinute: plannedParsed.minute } : {}),
      })
      runningStreak = row.executed ? runningStreak + 1 : 0
    }
    setGritScore(gritAccumulated(dayInputs))

    setBestStreak(computeBestStreak(history))

    const bstats: Record<string, { ok: number; total: number }> = {
      morning:   { ok: 0, total: 0 },
      afternoon: { ok: 0, total: 0 },
      evening:   { ok: 0, total: 0 },
    }
    history.forEach(h => {
      const ref = h.execution_time || h.check_in_time
      const b = bucketFromDate(new Date(ref))
      bstats[b].total++
      if (h.executed) bstats[b].ok++
    })
    setBucketRates({
      morning:   bstats.morning.total   >= 3 ? Math.round(bstats.morning.ok   / bstats.morning.total   * 100) : -1,
      afternoon: bstats.afternoon.total >= 3 ? Math.round(bstats.afternoon.ok / bstats.afternoon.total * 100) : -1,
      evening:   bstats.evening.total   >= 3 ? Math.round(bstats.evening.ok   / bstats.evening.total   * 100) : -1,
    })

    const contextMap: Record<string, { fail: number; total: number }> = {}
    history.forEach(h => {
      const [y, m, d] = h.date.split('-').map(Number)
      const dow = new Date(y, m - 1, d).getDay()
      const ref = h.execution_time || h.check_in_time
      const bucket = bucketFromDate(new Date(ref))
      const key = `${dow}_${bucket}`
      if (!contextMap[key]) contextMap[key] = { fail: 0, total: 0 }
      contextMap[key].total++
      if (!h.executed) contextMap[key].fail++
    })

    const sorted = Object.entries(contextMap)
      .filter(([, v]) => v.total >= 3)
      .sort(([, a], [, b]) => (b.fail / b.total) - (a.fail / a.total))

    if (sorted.length > 0) {
      const [key, stats] = sorted[0]
      const [dowStr, bucket] = key.split('_')
      const dayName = DAY_NAMES[parseInt(dowStr)]
      const period = bucket === 'morning' ? 'manhã' : bucket === 'afternoon' ? 'tarde' : 'noite'
      const failRate = Math.round(stats.fail / stats.total * 100)
      setPatternPhrase(`Consistência mais baixa às ${dayName} pela ${period}.`)
      setSupportData(`Falhou em ${failRate}% das vezes nesse contexto.`)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted">
        <div className="w-32 text-primary/70"><WavePath variant="loader" /></div>
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col pb-24 bg-bg relative overflow-hidden">
      <div className="ambient-glow opacity-30" />

      {/* Header */}
      <header className="relative z-10 px-5 pt-5 pb-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-border text-muted hover:text-ink transition-colors text-base"
        >
          ←
        </button>
        <div className="eyebrow">Estatísticas</div>
      </header>

      <div className="relative z-10 px-5 space-y-3">

        {/* Grit médio */}
        <div className="card p-6 flex flex-col items-center">
          <div className="eyebrow mb-5">Grit médio</div>
          <div
            className="tabular font-extralight text-ink leading-none"
            style={{ fontSize: 96, letterSpacing: '-0.04em' }}
          >
            {gritScore}
          </div>
          <div className="text-[12px] text-muted mt-3">Índice de consistência comportamental</div>
        </div>

        {/* Consistência por período */}
        <div className="card p-5 space-y-4">
          <div className="eyebrow">Consistência por período</div>
          <div className="space-y-4">
            {(['morning', 'afternoon', 'evening'] as const).map(key => {
              const label = key === 'morning' ? 'Manhã' : key === 'afternoon' ? 'Tarde' : 'Noite'
              const rate = bucketRates[key]
              return (
                <div key={key}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[13px] text-muted">{label}</span>
                    <span className="text-[13px] text-ink tabular">
                      {rate < 0 ? '—' : `${rate}%`}
                    </span>
                  </div>
                  {rate >= 0 ? (
                    <div className="h-[3px] rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${rate}%`, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }}
                      />
                    </div>
                  ) : (
                    <div className="text-[11px] text-subtle italic">Poucos dados</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Melhor sequência */}
        <div className="card p-5 flex items-center justify-between">
          <div className="text-[13px] text-muted">Melhor sequência</div>
          <div className="flex items-baseline gap-1.5">
            <span
              className="tabular font-extralight text-ink"
              style={{ fontSize: 32, letterSpacing: '-0.03em' }}
            >
              {bestStreak}
            </span>
            <span className="text-[13px] text-muted">dias consecutivos</span>
          </div>
        </div>

        {/* Padrão detectado */}
        <div className="card p-5 space-y-3">
          <div className="eyebrow">Padrão detectado</div>
          {patternPhrase ? (
            <>
              <p className="text-[16px] font-light text-ink leading-snug">{patternPhrase}</p>
              <p className="text-[13px] text-muted">{supportData}</p>
            </>
          ) : (
            <p className="text-[13px] text-subtle italic">
              Dados insuficientes. Continue registrando para detectar padrões.
            </p>
          )}
        </div>

      </div>

      <BottomNav />
    </main>
  )
}
