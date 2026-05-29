'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { bucketFromDate } from '@/lib/grit'
import WavePath from '@/components/WavePath'
import BottomNav from '@/components/BottomNav'

interface CheckInRow {
  date: string
  executed: boolean
  difficulty: 1 | 2 | 3
  failure_reason: string | null
  execution_time: string | null
  check_in_time: string
}

type InsightType = 'pattern' | 'directive' | 'context'

interface InsightBlock {
  type: InsightType
  headline: string
  meta: string
}

export default function InsightsScreen() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [habitName, setHabitName] = useState('')
  const [insights, setInsights] = useState<InsightBlock[]>([])

  useEffect(() => {
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
      .select('onboarding_done')
      .eq('id', userId)
      .single()

    if (!profile?.onboarding_done) {
      router.replace('/onboarding')
      return
    }

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

    setHabitName(habits.name)

    const { data: rows } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .eq('habit_id', habits.id)
      .order('date', { ascending: true })
      .limit(90)

    const history: CheckInRow[] = rows ?? []
    const blocks: InsightBlock[] = []

    // Context: Today
    const today = new Date().toISOString().slice(0, 10)
    const todayCheck = history.find(h => h.date === today)
    if (todayCheck) {
      const diffLabel = ['Fácil', 'Moderado', 'Difícil'][todayCheck.difficulty - 1]
      const reasonLabels: Record<string, string> = {
        tired: 'Cansaço', forgot: 'Esquecimento',
        chaotic: 'Dia caótico', unwilling: 'Falta de vontade',
      }
      blocks.push({
        type: 'context',
        headline: todayCheck.executed
          ? `Hábito mantido hoje com dificuldade ${diffLabel.toLowerCase()}.`
          : `Hábito não mantido hoje.`,
        meta: todayCheck.executed
          ? `DIFICULDADE: ${diffLabel.toUpperCase()} · HOJE`
          : `RAZÃO: ${(reasonLabels[todayCheck.failure_reason ?? ''] ?? 'Não especificada').toUpperCase()} · HOJE`,
      })
    }

    // Directive: Top failure reason
    const failuresByReason: Record<string, number> = {}
    history.forEach(h => {
      if (!h.executed && h.failure_reason) {
        failuresByReason[h.failure_reason] = (failuresByReason[h.failure_reason] || 0) + 1
      }
    })
    const topFailure = Object.entries(failuresByReason).sort((a, b) => b[1] - a[1])[0]
    if (topFailure) {
      const reasonLabels: Record<string, string> = {
        tired: 'Cansaço', forgot: 'Esquecimento',
        chaotic: 'Dia caótico', unwilling: 'Falta de vontade',
      }
      const label = reasonLabels[topFailure[0]] || topFailure[0]
      const totalFailures = history.filter(h => !h.executed).length
      const pct = totalFailures > 0 ? Math.round((topFailure[1] / totalFailures) * 100) : 0
      blocks.push({
        type: 'directive',
        headline: `${label} representa ${pct}% das suas falhas.`,
        meta: `OBSERVADO EM ${topFailure[1]} DOS ÚLTIMOS ${totalFailures} ERROS`,
      })
    }

    // Pattern: Morning consistency
    const morningSuccess = history.filter(h => {
      const t = h.execution_time ? new Date(h.execution_time) : new Date(h.check_in_time)
      return h.executed && t.getHours() < 12
    }).length
    const morningAttempts = history.filter(h => {
      const t = h.execution_time ? new Date(h.execution_time) : new Date(h.check_in_time)
      return t.getHours() < 12
    }).length
    const afternoonSuccess = history.filter(h => {
      const t = h.execution_time ? new Date(h.execution_time) : new Date(h.check_in_time)
      return h.executed && t.getHours() >= 12 && t.getHours() < 18
    }).length
    const afternoonAttempts = history.filter(h => {
      const t = h.execution_time ? new Date(h.execution_time) : new Date(h.check_in_time)
      return t.getHours() >= 12 && t.getHours() < 18
    }).length
    if (morningAttempts > 0) {
      const morningRate = Math.round((morningSuccess / morningAttempts) * 100)
      const afternoonRate = afternoonAttempts > 0
        ? Math.round((afternoonSuccess / afternoonAttempts) * 100)
        : 0
      blocks.push({
        type: 'pattern',
        headline: `Sua consistência ${morningRate > afternoonRate ? 'é maior' : 'cai'} antes das 12h.`,
        meta: `TAXA MATINAL: ${morningRate}% · TARDE: ${afternoonRate}%`,
      })
    }

    // Pattern: Best weekday
    const weekDayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
    const fullWeekDayNames = ['Domingos', 'Segundas', 'Terças', 'Quartas', 'Quintas', 'Sextas', 'Sábados']
    const successByDay = new Array(7).fill(0)
    const countByDay = new Array(7).fill(0)
    history.forEach(h => {
      const dayIndex = new Date(h.date).getDay()
      countByDay[dayIndex]++
      if (h.executed) successByDay[dayIndex]++
    })
    const bestDay = successByDay.reduce((best, val, idx) => (val > successByDay[best] ? idx : best), 0)
    const bestDayRate = countByDay[bestDay] > 0
      ? Math.round((successByDay[bestDay] / countByDay[bestDay]) * 100)
      : 0
    const totalRate = history.length > 0
      ? Math.round((history.filter(h => h.executed).length / history.length) * 100)
      : 0
    blocks.push({
      type: 'pattern',
      headline: `${fullWeekDayNames[bestDay]} são seu dia de maior consistência.`,
      meta: `${weekDayNames[bestDay].toUpperCase()} GRIT: ${bestDayRate}% · GERAL: ${totalRate}%`,
    })

    // Pattern: Difficult day persistence
    const totalExecuted = history.filter(h => h.executed).length
    const difficultButExecuted = history.filter(h => h.executed && h.difficulty === 3).length
    if (totalExecuted > 0) {
      const difficultyRate = Math.round((difficultButExecuted / totalExecuted) * 100)
      blocks.push({
        type: 'pattern',
        headline: `Você executa em ${difficultyRate}% dos dias classificados como difíceis.`,
        meta: `${difficultButExecuted} DE ${totalExecuted} EXECUÇÕES FORAM EM DIAS DIFÍCEIS`,
      })
    }

    setInsights(blocks)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted">
        <div className="w-32 text-primary/70">
          <WavePath variant="loader" />
        </div>
        <div className="eyebrow text-subtle">Analisando padrões…</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col pb-20 bg-bg relative overflow-hidden">
      <div className="ambient-glow opacity-30" />

      {/* Header */}
      <header className="relative z-10 px-6 pt-6 pb-4">
        <div className="hairline mb-4" />
        <div className="eyebrow mb-1">Inteligência comportamental</div>
        <h1 className="text-xl font-light text-ink">{habitName}</h1>
      </header>

      {/* Cards */}
      <div className="relative z-10 flex-1 flex flex-col gap-3 px-6 py-4 overflow-y-auto no-scroll pb-6">
        {insights.length === 0 && (
          <p className="text-sm text-muted mt-8 text-center">
            Continue registrando para desbloquear os insights.
          </p>
        )}
        {insights.map((insight, i) => (
          <InsightCard key={i} insight={insight} />
        ))}
      </div>

      <BottomNav />
    </main>
  )
}

const TYPE_CONFIG: Record<InsightType, { label: string; dotColor: string; labelColor: string }> = {
  pattern:   { label: 'PATTERN',   dotColor: 'bg-success',   labelColor: 'text-success' },
  directive: { label: 'DIRECTIVE', dotColor: 'bg-warn',      labelColor: 'text-warn' },
  context:   { label: 'CONTEXT',   dotColor: 'bg-subtle',    labelColor: 'text-muted' },
}

function InsightCard({ insight }: { insight: InsightBlock }) {
  const cfg = TYPE_CONFIG[insight.type]
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${cfg.dotColor} shrink-0`} />
        <span className={`text-[11px] font-semibold tracking-[0.14em] ${cfg.labelColor}`}>
          {cfg.label}
        </span>
      </div>
      <p className="text-[17px] font-light text-ink leading-snug mb-3">
        {insight.headline}
      </p>
      <p className="text-[10px] tracking-[0.12em] text-subtle uppercase">
        {insight.meta}
      </p>
    </div>
  )
}
