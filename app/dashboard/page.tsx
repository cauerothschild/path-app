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
import { buildBriefingMsg, type BriefingMsg } from '@/lib/briefing'
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
  const [briefingMsg, setBriefingMsg] = useState<BriefingMsg | null>(null)
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

    // Days active: first check-in date when available (YYYY-MM-DD, timezone-safe)
    // otherwise fall back to user account creation date
    let startDay: Date
    if (history.length > 0) {
      const [fy, fm, fd] = history[0].date.split('-').map(Number)
      startDay = new Date(fy, fm - 1, fd)
    } else {
      const ref = new Date(profile.created_at)
      startDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
    }
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
    setBriefingMsg(buildBriefingMsg(history, daysCount, habits.name ?? ''))

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
          {briefingMsg ? (
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-muted/60 uppercase tracking-widest mb-1">Observação</div>
                <p className="text-[14px] text-ink leading-relaxed">{briefingMsg.obs}</p>
              </div>
              <div>
                <div className="text-[10px] text-muted/60 uppercase tracking-widest mb-1">Interpretação</div>
                <p className="text-[13px] text-muted leading-relaxed">{briefingMsg.interp}</p>
              </div>
              <div className="pt-3 border-t border-border/30">
                <div className="text-[10px] text-primary/60 uppercase tracking-widest mb-1">Ação</div>
                <p className="text-[14px] text-ink leading-relaxed">{briefingMsg.acao}</p>
              </div>
            </div>
          ) : (
            <p className="text-[14px] text-muted leading-relaxed">Carregando briefing…</p>
          )}
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
