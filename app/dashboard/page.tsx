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
import { generateBriefing, homeStatusLine, type Briefing } from '@/lib/briefing'
import GritRing from '@/components/GritRing'
import WavePath from '@/components/WavePath'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import Image from 'next/image'

interface CheckInRow {
  id: string
  date: string
  executed: boolean
  difficulty: 1 | 2 | 3
  failure_reason: string | null
  check_in_time: string
  execution_time: string | null
}

export default function Home() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [gritScore, setGritScore] = useState(0)
  const [delta, setDelta] = useState(0)
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [statusLine, setStatusLine] = useState('')
  const [daysActive, setDaysActive] = useState(0)
  const [greeting, setGreeting] = useState('Bom dia')
  const [riskLevel, setRiskLevel] = useState<'low' | 'moderate' | 'high'>('moderate')
  const [quickInsight, setQuickInsight] = useState('')

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

    const { data: rows } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .eq('habit_id', habits.id)
      .order('date', { ascending: true })
      .limit(60)

    const history: CheckInRow[] = rows ?? []

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
      })
      runningStreak = row.executed ? runningStreak + 1 : 0
    }

    const grit = gritAccumulated(dayInputs)
    setGritScore(grit)
    setDelta(gritDelta(dayInputs))

    // Days active
    const daysCount =
      Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000) + 1
    setDaysActive(daysCount)

    // Briefing
    const briefingHistory = history.map(r => ({
      date: r.date,
      executed: r.executed,
      difficulty: r.difficulty,
      timeBucket: bucketFromDate(
        r.execution_time ? new Date(r.execution_time) : new Date(r.check_in_time)
      ),
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

    // Risk level
    const recentExecutions = history.slice(-7).filter(h => h.executed).length
    if (recentExecutions >= 6) setRiskLevel('low')
    else if (recentExecutions >= 4) setRiskLevel('moderate')
    else setRiskLevel('high')

    // Quick insight
    const morningCount = history.filter(h => {
      const t = h.execution_time ? new Date(h.execution_time) : new Date(h.check_in_time)
      return h.executed && t.getHours() < 12
    }).length
    const total = history.filter(h => h.executed).length
    if (total > 0) {
      const morningRate = Math.round((morningCount / total) * 100)
      setQuickInsight(
        `Sua melhor janela de consistência permanece entre 7h e 10h. Taxa: ${morningRate}% dos sucessos.`
      )
    }

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

  const riskColors = {
    low: 'bg-success/15 border-success/50 text-success',
    moderate: 'bg-warn/15 border-warn/50 text-warn',
    high: 'bg-error/15 border-error/50 text-error',
  }

  const riskLabels = {
    low: 'Baixo',
    moderate: 'Moderado',
    high: 'Alto',
  }

  return (
    <main className="min-h-screen flex flex-col pb-20 bg-bg relative overflow-hidden">
      <div className="ambient-glow opacity-30" />

      {/* Header */}
      <header className="relative z-10 px-5 pt-4 pb-3">
        <div className="grid grid-cols-3 items-center gap-2">

          {/* Left: symbol + text */}
          <div className="flex items-center gap-1.5">
            <div className="relative shrink-0" style={{ width: 20, height: 20 }}>
              <Image src="/logo-symbol.png" alt="" fill className="object-contain" />
            </div>
            <div className="relative" style={{ width: 82, height: 26 }}>
              <Image src="/logo-text.png" alt="Path" fill className="object-contain object-left" />
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

      {/* Grit Ring */}
      <div className="relative z-10 flex justify-center py-6">
        <GritRing score={gritScore} delta={delta} size={200} />
      </div>

      {/* Daily Briefing Card */}
      {briefing && (
        <div className="relative z-10 px-6 mb-4">
          <div className={`border rounded-2xl p-5 ${riskColors[riskLevel]}`}>
            <div className="text-xs font-medium mb-2 opacity-70">
              Nível de risco: {riskLabels[riskLevel]}
            </div>
            <p className="text-sm leading-relaxed mb-4">{briefing.analysisHeadline}</p>
            <Link
              href="/insights"
              className="inline-block text-xs font-medium border-b opacity-70 hover:opacity-100 transition"
            >
              Ver detalhes
            </Link>
          </div>
        </div>
      )}

      {/* Quick Insight Card */}
      {quickInsight && (
        <div className="relative z-10 px-6 mb-4">
          <div className="bg-surface/30 border border-border rounded-2xl p-5">
            <div className="text-xs text-muted mb-2">Descoberta comportamental</div>
            <p className="text-sm text-ink leading-relaxed">{quickInsight}</p>
          </div>
        </div>
      )}

      <div className="flex-1" />

      <BottomNav />
    </main>
  )
}
