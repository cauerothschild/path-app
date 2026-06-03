'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  gritAccumulated,
  gritDelta,
  bucketFromDate,
  type CheckInData,
} from '@/lib/grit'
import GritRing from '@/components/GritRing'
import WavePath from '@/components/WavePath'
import BottomNav from '@/components/BottomNav'
import Image from 'next/image'

interface CheckInRow {
  id: string
  date: string
  executed: boolean
  difficulty: 1 | 2 | 3 | 4
  failure_reason: string | null
  check_in_time: string
  execution_time: string | null
}

const DAY_NAMES_PT = ['Domingos', 'Segundas', 'Terças', 'Quartas', 'Quintas', 'Sextas', 'Sábados']

function computeCurrentStreak(history: CheckInRow[]): number {
  let s = 0
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].executed) s++
    else break
  }
  return s
}

function computeBestStreak(history: CheckInRow[]): number {
  let best = 0, cur = 0
  for (const r of history) {
    if (r.executed) { cur++; if (cur > best) best = cur }
    else cur = 0
  }
  return best
}

function buildBriefingMsg(history: CheckInRow[]): string {
  if (history.length === 0)
    return 'Hoje é uma oportunidade de reforçar sua consistência.'

  const last = history[history.length - 1]
  const todayDay = new Date().getDay()

  // ── 3+ dias sem check-in ──
  const [ly, lm, ld] = last.date.split('-').map(Number)
  const lastDateObj = new Date(ly, lm - 1, ld)
  const todayObj = new Date(); todayObj.setHours(0, 0, 0, 0)
  const daysSinceLast = Math.round((todayObj.getTime() - lastDateObj.getTime()) / 86400000)
  if (daysSinceLast >= 3)
    return 'Faz alguns dias desde seu último registro. Hoje é uma oportunidade simples de retomar.'

  // ── Milestones ──
  const currentStreak = computeCurrentStreak(history)
  const bestStreak = computeBestStreak(history)
  const totalExecuted = history.filter(h => h.executed).length

  if (currentStreak > 3 && currentStreak >= bestStreak)
    return 'Esta é sua maior sequência até agora neste hábito.'

  if (currentStreak > 0 && bestStreak > currentStreak && bestStreak - currentStreak <= 3) {
    const diff = bestStreak - currentStreak
    return `Você está a apenas ${diff} dia${diff > 1 ? 's' : ''} de igualar sua melhor sequência.`
  }

  if (totalExecuted === 7)
    return 'Você completou sua primeira semana registrando este comportamento. Continue acumulando repetições.'

  // ── fail_rate últimos 7 dias > 60% ──
  const last7 = history.slice(-7)
  const failRate7 = last7.filter(h => !h.executed).length / last7.length
  if (failRate7 > 0.6)
    return 'Os últimos dias tiveram mais falhas do que sucessos. Considere reduzir a dificuldade hoje.'

  // ── Padrão repetido de motivo de falha (últimas 3 falhas) ──
  const recentFailed = history.filter(h => !h.executed && h.failure_reason).slice(-3)
  if (recentFailed.length >= 3) {
    const reasons = recentFailed.map(h => (h.failure_reason ?? '').toLowerCase())
    if (reasons.every(r => r.includes('esqueci')))
      return 'Esquecimento pode indicar falta de gatilho visível. Considere tornar o hábito mais aparente.'
    if (reasons.every(r => r.includes('tempo')))
      return 'Tempo costuma ser um desafio recorrente. Hoje tente criar uma versão mínima do hábito.'
    if (reasons.every(r => r.includes('cansa') || r.includes('energia') || r.includes('motiva')))
      return 'Seu maior obstáculo recente tem sido energia. Reduza a barreira de entrada para começar.'
  }

  // ── Mesmo obstáculo 2x nos últimos 7 dias ──
  const reasonCounts: Record<string, number> = {}
  history.slice(-7).filter(h => !h.executed && h.failure_reason).forEach(h => {
    const r = h.failure_reason!
    reasonCounts[r] = (reasonCounts[r] || 0) + 1
  })
  if (Object.values(reasonCounts).some(c => c >= 2))
    return 'Você encontrou o mesmo obstáculo mais de uma vez. Talvez seja hora de ajustar o ambiente.'

  // ── last check-in não executado ──
  if (!last.executed) {
    const todayStr = new Date().toISOString().slice(0, 10)
    const isToday = last.date === todayStr

    const beforeLast = history.slice(-3, -1)
    if (beforeLast.length >= 1 && beforeLast.every(h => !h.executed))
      return 'Retomar após uma interrupção costuma ser a parte mais difícil. Hoje o objetivo é apenas recomeçar.'

    return isToday
      ? 'Hoje não saiu como planejado. Tudo bem — o objetivo amanhã é apenas retomar.'
      : 'Ontem não saiu como planejado. O objetivo hoje é apenas retomar.'
  }

  // ── (a partir daqui: last.executed === true) ──

  // Retorno após sequência de falhas
  if (history.length >= 3 && !history[history.length - 2]?.executed)
    return 'Retomar após uma interrupção costuma ser a parte mais difícil. Hoje o objetivo é apenas recomeçar.'

  // 3 sucessos consecutivos
  const last3 = history.slice(-3)
  if (last3.length === 3 && last3.every(h => h.executed))
    return 'Os últimos dias mostraram consistência. Tente repetir exatamente o que funcionou.'

  // Difícil + executou
  if (last.difficulty === 3)
    return 'Mesmo com dificuldade você executou. Esse costuma ser um dos sinais mais fortes de consistência.'

  // ── Melhor horário de execução ──
  if (history.filter(h => h.executed).length >= 5) {
    const bucketStats: Record<string, { ok: number; total: number }> = {
      morning: { ok: 0, total: 0 },
      afternoon: { ok: 0, total: 0 },
      evening: { ok: 0, total: 0 },
    }
    history.forEach(h => {
      const ref = h.execution_time || h.check_in_time
      const b = bucketFromDate(new Date(ref))
      bucketStats[b].total++
      if (h.executed) bucketStats[b].ok++
    })
    const valid = Object.entries(bucketStats).filter(([, v]) => v.total >= 3)
    if (valid.length >= 2) {
      const best = valid.sort(([, a], [, b]) => (b.ok / b.total) - (a.ok / a.total))[0]
      if (best[1].ok / best[1].total >= 0.7) {
        if (best[0] === 'morning')
          return 'Você costuma ter mais sucesso quando executa pela manhã. Se possível, priorize esse período.'
        if (best[0] === 'evening')
          return 'Seu histórico mostra melhores resultados à noite. Planeje sua execução para esse horário.'
      }
    }
  }

  // ── Dia da semana com histórico ruim ──
  const sameDayHistory = history.filter(h => new Date(h.date).getDay() === todayDay)
  if (sameDayHistory.length >= 2) {
    const failRate = sameDayHistory.filter(h => !h.executed).length / sameDayHistory.length
    if (failRate > 0.5) {
      if (todayDay === 0 || todayDay === 6)
        return 'Finais de semana costumam ser mais difíceis para você. Planeje com antecedência.'
      if (todayDay === 1)
        return 'As segundas costumam quebrar seu ritmo. Priorize começar cedo.'
      return `${DAY_NAMES_PT[todayDay]} costumam ser mais difíceis para você.`
    }
  }

  const recent = history.slice(-5)
  const successes = recent.filter(h => h.executed).length
  if (successes >= 4)
    return `Você completou seu hábito em ${successes} dos últimos ${recent.length} dias.`

  return 'Hoje é uma oportunidade de reforçar sua consistência.'
}

function formatWindowStart(timeStr: string): string {
  if (!timeStr) return ''
  const h = timeStr.match(/(\d{1,2})h/)
  if (h) return `${String(parseInt(h[1])).padStart(2, '0')}:00`
  const c = timeStr.match(/(\d{2}):(\d{2})/)
  if (c) return c[0]
  return timeStr
}

export default function Home() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [gritScore, setGritScore] = useState(0)
  const [delta, setDelta] = useState(0)
  const [daysActive, setDaysActive] = useState(0)
  const [greeting, setGreeting] = useState('Bom dia')
  const [statusLine, setStatusLine] = useState('')
  const [habitName, setHabitName] = useState('')
  const [habitWindow, setHabitWindow] = useState('')
  const [briefingMsg, setBriefingMsg] = useState('')
  const [todayCheckedIn, setTodayCheckedIn] = useState(false)

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite')
    loadAll()
  }, [])

  async function loadAll() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      router.replace('/')
      return
    }

    const userId = userData.user.id

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profile?.onboarding_done) {
      router.replace('/onboarding')
      return
    }

    setDisplayName(profile.display_name || 'você')

    const { data: habits } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .limit(1)
      .maybeSingle()

    if (!habits) {
      setLoading(false)
      return
    }

    setHabitName(habits.name)
    setHabitWindow(habits.schedule_time || habits.preferred_time || '')

    const { data: rows } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .eq('habit_id', habits.id)
      .order('date', { ascending: true })
      .limit(60)

    const history: CheckInRow[] = rows ?? []

    // Parse planned time from habits.schedule_time for V2 grit
    const windowSrc = habits.schedule_time || habits.preferred_time || ''
    const plannedParsed = (() => {
      if (!windowSrc) return null
      const hhmm = windowSrc.match(/^(\d{1,2}):(\d{2})$/)
      if (hhmm) return { hour: parseInt(hhmm[1]), minute: parseInt(hhmm[2]) }
      const hmatch = windowSrc.match(/(\d{1,2})h/)
      if (hmatch) return { hour: parseInt(hmatch[1]), minute: 0 }
      return null
    })()

    // Grit calculation
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

    const grit = gritAccumulated(dayInputs)
    setGritScore(grit)
    setDelta(gritDelta(dayInputs))

    // Days since habit tracking started (local dates — sem erro de fuso)
    const habitCreated = new Date(habits.created_at)
    const startDay = new Date(habitCreated.getFullYear(), habitCreated.getMonth(), habitCreated.getDate())
    const now2 = new Date()
    const endDay = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate())
    const daysCount = Math.floor((endDay.getTime() - startDay.getTime()) / 86400000) + 1
    setDaysActive(daysCount)

    // Status line (header center)
    const todayDay = new Date().getDay()
    const byDay = new Array(7).fill(null).map(() => ({ total: 0, fail: 0 }))
    history.forEach(h => {
      const d = new Date(h.date).getDay()
      byDay[d].total++
      if (!h.executed) byDay[d].fail++
    })
    const todayStats = byDay[todayDay]
    if (history.length < 5) {
      setStatusLine('Learning your pattern.')
    } else if (todayStats.total >= 2 && todayStats.fail / todayStats.total > 0.4) {
      setStatusLine(`Padrão costuma cair às ${DAY_NAMES_PT[todayDay].toLowerCase()}.`)
    } else {
      setStatusLine('Seu padrão está se estabilizando.')
    }

    // Briefing message
    setBriefingMsg(buildBriefingMsg(history))

    // Today checked in?
    const todayStr = new Date().toISOString().slice(0, 10)
    const { data: todayCi } = await supabase
      .from('check_ins')
      .select('id')
      .eq('user_id', userId)
      .eq('habit_id', habits.id)
      .eq('date', todayStr)
      .maybeSingle()
    setTodayCheckedIn(!!todayCi)

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted">
        <div className="w-32 text-primary/70">
          <WavePath variant="loader" />
        </div>
        <div className="eyebrow text-subtle">Loading patterns…</div>
      </div>
    )
  }

  const nextTime = formatWindowStart(habitWindow)
  const nextLabel = todayCheckedIn ? 'Amanhã' : 'Hoje'

  return (
    <main className="min-h-screen flex flex-col pb-20 bg-bg relative overflow-hidden">
      <div className="ambient-glow opacity-30" />

      {/* Header */}
      <header className="relative z-10 px-5 pt-4 pb-3">
        <div className="grid grid-cols-3 items-center gap-2">

          {/* Left: text logo */}
          <div className="flex items-center">
            <div className="relative" style={{ width: 64, height: 21 }}>
              <Image src="/logo-text.png" alt="Path" fill className="object-contain object-left mix-blend-screen" />
            </div>
          </div>

          {/* Center: greeting + status */}
          <div className="text-center">
            <h1 className="text-[15px] font-medium text-ink leading-tight">
              {greeting}, {displayName.split(' ')[0]}.
            </h1>
            <p className="text-[11px] text-muted mt-0.5 leading-tight">{statusLine}</p>
          </div>

          {/* Right: days + OBSERVING */}
          <div className="flex items-center justify-end gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
            <div className="text-right">
              <div className="text-[11px] font-medium text-ink tabular leading-none">{daysActive}D</div>
              <div className="text-[9px] text-muted tracking-[0.12em] mt-0.5">OBSERVING</div>
            </div>
          </div>

        </div>
      </header>

      {/* Grit Score */}
      <button
        onClick={() => router.push('/stats')}
        className="relative z-10 px-6 pt-6 pb-2 animate-fade-up flex flex-col items-center text-center w-full"
      >
        <div className="eyebrow mb-4 flex items-center gap-1.5">
          Grit Score
          <span className="text-muted/50">›</span>
        </div>
        <GritRing score={gritScore} delta={delta} size={180} />
        <p className="text-[13px] text-muted leading-relaxed mt-3">
          Seu índice atual de consistência comportamental.
        </p>
      </button>

      <div className="relative z-10 px-6 mt-6 space-y-3">

        {/* Briefing Matinal */}
        <div className="card p-5">
          <div className="eyebrow mb-3">Briefing Matinal</div>
          <p className="text-[15px] text-ink leading-relaxed">
            {briefingMsg || 'Hoje é uma oportunidade de reforçar sua consistência.'}
          </p>
        </div>

        {/* Próxima Execução */}
        {habitName && (
          <div className="card p-5">
            <div className="eyebrow mb-3">Próxima execução</div>
            <div className="text-[17px] font-light text-ink mb-1">{habitName}</div>
            <div className="text-[13px] text-muted">
              {nextLabel}{nextTime ? ` • ${nextTime}` : ''}
            </div>
          </div>
        )}

      </div>

      <div className="flex-1" />
      <BottomNav />
    </main>
  )
}
