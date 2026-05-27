'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  gritOfDay,
  gritAccumulated,
  gritDelta,
  bucketFromDate,
  currentStreak,
  type DayInput,
} from '@/lib/grit'
import { generateBriefing, homeStatusLine, type Briefing } from '@/lib/briefing'
import GritRing from '@/components/GritRing'
import StatusHeader from '@/components/StatusHeader'
import CheckInPanel from '@/components/CheckInPanel'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

interface CheckInRow {
  id: string
  date: string
  executed: boolean
  difficulty: 1 | 2 | 3
  failure_reason: string | null
  check_in_time: string
}

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [habitId, setHabitId] = useState('')
  const [gritScore, setGritScore] = useState(0)
  const [delta, setDelta] = useState(0)
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [statusLine, setStatusLine] = useState('')
  const [todayCheckIn, setTodayCheckIn] = useState<CheckInRow | null>(null)
  const [daysActive, setDaysActive] = useState(0)
  const [greeting, setGreeting] = useState('Bom dia')
  const [appOpenTime] = useState(Date.now())

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
      .single()

    if (!habits) {
      setLoading(false)
      return
    }

    setHabitId(habits.id)

    const { data: rows } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .eq('habit_id', habits.id)
      .order('date', { ascending: true })
      .limit(60)

    const history: CheckInRow[] = rows ?? []
    const today = new Date().toISOString().slice(0, 10)
    setTodayCheckIn(history.find(r => r.date === today) ?? null)

    // Grit
    const dayInputs: DayInput[] = []
    let runningStreak = 0
    for (const row of history) {
      const tb = bucketFromDate(new Date(row.check_in_time))
      dayInputs.push({
        executed: row.executed,
        difficulty: row.difficulty,
        timeBucket: tb,
        streakBefore: runningStreak,
      })
      runningStreak = row.executed ? runningStreak + 1 : 0
    }
    const grit = gritAccumulated(dayInputs)
    setGritScore(grit)
    setDelta(gritDelta(dayInputs))

    // Briefing
    const daysCount =
      Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000) + 1
    setDaysActive(daysCount)

    const briefingHistory = history.map(r => ({
      date: r.date,
      executed: r.executed,
      difficulty: r.difficulty,
      timeBucket: bucketFromDate(new Date(r.check_in_time)),
      failureReason: r.failure_reason,
    }))

    const b = generateBriefing({
      history: briefingHistory,
      targetHabit: habits.name,
      preferredTime: habits.preferred_time,
      gritScore: grit,
      daysActive: daysCount,
      displayName: profile.display_name,
    })
    setBriefing(b)
    setStatusLine(
      homeStatusLine({
        history: briefingHistory,
        targetHabit: habits.name,
        preferredTime: habits.preferred_time,
        gritScore: grit,
        daysActive: daysCount,
        displayName: profile.display_name,
      })
    )

    await supabase.from('daily_context').upsert(
      {
        user_id: userId,
        date: today,
        first_open_time: new Date().toISOString(),
      },
      { onConflict: 'user_id,date', ignoreDuplicates: true }
    )

    setLoading(false)
  }

  async function handleCheckIn(data: {
    executed: boolean
    difficulty: 1 | 2 | 3
    failureReason: string | null
    responseSpeedMs: number
  }) {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const today = new Date().toISOString().slice(0, 10)
    const now = new Date()
    const tb = bucketFromDate(now)

    const { data: existing } = await supabase
      .from('check_ins')
      .select('executed')
      .eq('user_id', userData.user.id)
      .eq('habit_id', habitId)
      .lt('date', today)
      .order('date', { ascending: true })

    const streakBefore = currentStreak(existing ?? [])
    const dayGrit = gritOfDay({
      executed: data.executed,
      difficulty: data.difficulty,
      timeBucket: tb,
      streakBefore,
    })

    await supabase.from('check_ins').upsert(
      {
        user_id: userData.user.id,
        habit_id: habitId,
        date: today,
        executed: data.executed,
        difficulty: data.difficulty,
        failure_reason: data.failureReason,
        check_in_time: now.toISOString(),
        app_open_time: new Date(appOpenTime).toISOString(),
        response_speed_ms: data.responseSpeedMs,
        grit_score: dayGrit,
      },
      { onConflict: 'user_id,habit_id,date' }
    )

    await loadAll()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-sm">
        carregando...
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col">
      <StatusHeader daysObserving={daysActive} />

      <div className="px-6 mt-2 mb-6">
        <h1 className="text-2xl font-light tracking-tight">
          {greeting}, {displayName.split(' ')[0]}.
        </h1>
        <p className="text-sm text-muted mt-1">{statusLine}</p>
      </div>

      {/* Anel do Grit */}
      <div className="flex justify-center mb-8 mt-2">
        <GritRing score={gritScore} delta={delta} size={220} />
      </div>

      {/* Check-in */}
      <div className="px-6 mb-4">
        <CheckInPanel
          appOpenTime={appOpenTime}
          alreadyChecked={
            todayCheckIn
              ? { executed: todayCheckIn.executed, failure_reason: todayCheckIn.failure_reason }
              : null
          }
          onSubmit={handleCheckIn}
        />
      </div>

      {/* Atalho para Diagnóstico do dia */}
      {briefing && (
        <div className="px-6 mb-6">
          <Link
            href="/insights"
            className="flex items-center justify-between bg-surface/30 border border-border rounded-2xl p-5 hover:bg-surface/50 transition"
          >
            <div className="flex-1 pr-3">
              <div className="text-xs text-muted mb-1">Diagnóstico do dia</div>
              <div className="text-sm text-ink leading-snug">
                {briefing.analysisHeadline}
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-muted">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </Link>
        </div>
      )}

      <div className="flex-1" />

      <BottomNav />
    </main>
  )
}
