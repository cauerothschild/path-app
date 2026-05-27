'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  gritAccumulated,
  bucketFromDate,
  type DayInput,
} from '@/lib/grit'
import {
  generateBriefing,
  generateMonthlyDiagnostic,
  type Briefing,
  type Discovery,
} from '@/lib/briefing'
import StatusHeader from '@/components/StatusHeader'
import BottomNav from '@/components/BottomNav'

type Tab = 'briefing' | 'monthly'

export default function Insights() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('briefing')
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [discoveries, setDiscoveries] = useState<Discovery[]>([])
  const [daysActive, setDaysActive] = useState(0)
  const [metrics, setMetrics] = useState({ avgGrit: 0, consistency: 0, activeDays: 0 })
  const [today, setToday] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
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

    const history = rows ?? []

    const briefingHistory = history.map(r => ({
      date: r.date,
      executed: r.executed,
      difficulty: r.difficulty as 1 | 2 | 3,
      timeBucket: bucketFromDate(new Date(r.check_in_time)),
      failureReason: r.failure_reason,
    }))

    const dayInputs: DayInput[] = []
    let runningStreak = 0
    for (const r of history) {
      dayInputs.push({
        executed: r.executed,
        difficulty: r.difficulty,
        timeBucket: bucketFromDate(new Date(r.check_in_time)),
        streakBefore: runningStreak,
      })
      runningStreak = r.executed ? runningStreak + 1 : 0
    }

    const daysCount =
      Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000) + 1
    setDaysActive(daysCount)

    const b = generateBriefing({
      history: briefingHistory,
      targetHabit: habits.name,
      preferredTime: habits.preferred_time,
      gritScore: gritAccumulated(dayInputs),
      daysActive: daysCount,
      displayName: profile.display_name,
    })
    setBriefing(b)

    const d = generateMonthlyDiagnostic({
      history: briefingHistory,
      targetHabit: habits.name,
      preferredTime: habits.preferred_time,
      gritScore: gritAccumulated(dayInputs),
      daysActive: daysCount,
      displayName: profile.display_name,
    })
    setDiscoveries(d)

    // Métricas do período
    const executed = history.filter(h => h.executed).length
    const consistency = history.length > 0 ? Math.round((executed / history.length) * 100) : 0
    setMetrics({
      avgGrit: gritAccumulated(dayInputs),
      consistency,
      activeDays: history.length,
    })

    // Data formatada
    const now = new Date()
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
    ]
    setToday(`${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]}`)

    setLoading(false)
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

      <div className="px-6 mt-2">
        <h1 className="text-2xl font-light tracking-tight mb-1">Insights</h1>
      </div>

      {/* Tabs */}
      <div className="px-6 mt-5 mb-4">
        <div className="flex bg-surface/30 border border-border rounded-full p-1">
          <button
            onClick={() => setTab('briefing')}
            className={`flex-1 py-2 rounded-full text-sm transition ${
              tab === 'briefing' ? 'bg-primary text-bg font-medium' : 'text-muted'
            }`}
          >
            Briefing
          </button>
          <button
            onClick={() => setTab('monthly')}
            className={`flex-1 py-2 rounded-full text-sm transition ${
              tab === 'monthly' ? 'bg-primary text-bg font-medium' : 'text-muted'
            }`}
          >
            Diagnóstico
          </button>
        </div>
      </div>

      <div className="px-6 flex-1 overflow-y-auto no-scroll pb-6 space-y-4">
        {tab === 'briefing' && briefing && (
          <BriefingView briefing={briefing} dateLine={today} />
        )}
        {tab === 'monthly' && (
          <DiagnosticView discoveries={discoveries} metrics={metrics} />
        )}
      </div>

      <BottomNav />
    </main>
  )
}

// ============================================
// Briefing Matinal (estilo mockup tela 5)
// ============================================
function BriefingView({ briefing, dateLine }: { briefing: Briefing; dateLine: string }) {
  return (
    <div className="space-y-4 fade-in">
      <div>
        <h2 className="text-xl font-light tracking-tight">Briefing Matinal</h2>
        <p className="text-xs text-muted mt-1">{dateLine}</p>
      </div>

      {/* Seu contexto hoje */}
      <div className="bg-surface/30 border border-border rounded-2xl p-5">
        <div className="text-xs text-muted mb-4 uppercase tracking-wider">
          Seu contexto hoje
        </div>
        <div className="space-y-3 text-sm">
          <ContextRow
            icon="energy"
            label="Energia prevista"
            value={briefing.contextEnergy}
            valueColor={
              briefing.contextEnergy === 'Baixa'
                ? 'text-warn'
                : briefing.contextEnergy === 'Alta'
                ? 'text-primary'
                : 'text-ink'
            }
          />
          <ContextRow
            icon="risk"
            label="Risco de falha"
            value={briefing.riskLevel}
            valueColor={
              briefing.riskLevel === 'Alto'
                ? 'text-warn'
                : briefing.riskLevel === 'Baixo'
                ? 'text-primary'
                : 'text-ink'
            }
          />
          <ContextRow icon="time" label="Horário crítico" value={briefing.criticalTime} />
        </div>
      </div>

      {/* Análise */}
      <div className="bg-surface/30 border border-border rounded-2xl p-5">
        <div className="text-xs text-muted mb-2 uppercase tracking-wider">
          Análise do seu padrão
        </div>
        <p className="text-sm text-ink leading-relaxed">
          {briefing.analysisHeadline}{' '}
          <span className="text-muted">{briefing.analysisDetail}</span>
        </p>
      </div>

      {/* Sugestão */}
      <div className="bg-primary/10 border border-primary/30 rounded-2xl p-5">
        <div className="text-xs text-primary mb-2 uppercase tracking-wider">
          Sugestão de ajuste
        </div>
        <p className="text-sm text-ink leading-relaxed">{briefing.suggestion}</p>
      </div>
    </div>
  )
}

function ContextRow({
  icon,
  label,
  value,
  valueColor = 'text-ink',
}: {
  icon: 'energy' | 'risk' | 'time'
  label: string
  value: string
  valueColor?: string
}) {
  const iconPath =
    icon === 'energy'
      ? 'M13 2L4 14h6l-1 8 9-12h-6l1-8z'
      : icon === 'risk'
      ? 'M12 2L2 22h20L12 2zm0 6v6m0 3v.5'
      : 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'

  return (
    <div className="flex items-center gap-3">
      <div className="text-muted">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d={iconPath} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="text-muted flex-1">{label}:</div>
      <div className={`font-medium ${valueColor}`}>{value}</div>
    </div>
  )
}

// ============================================
// Diagnóstico Mensal (estilo mockup tela 7)
// ============================================
function DiagnosticView({
  discoveries,
  metrics,
}: {
  discoveries: Discovery[]
  metrics: { avgGrit: number; consistency: number; activeDays: number }
}) {
  const now = new Date()
  const monthName = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][now.getMonth()]

  return (
    <div className="space-y-4 fade-in">
      <div className="bg-surface/30 border border-border rounded-2xl p-5">
        <h2 className="text-lg font-light tracking-tight mb-1">Diagnóstico Mensal</h2>
        <p className="text-xs text-muted mb-5">{monthName}/{now.getFullYear()}</p>

        <div className="space-y-5">
          {discoveries.length === 0 && (
            <p className="text-sm text-muted">Continue registrando para desbloquear o relatório.</p>
          )}
          {discoveries.map((d, i) => (
            <div key={i} className="border-l-2 border-primary/40 pl-4">
              <p className="text-sm text-ink leading-relaxed mb-2">{d.headline}</p>
              <p className="text-xs text-muted leading-relaxed mb-2">{d.data}</p>
              <p className="text-xs text-primary/90 leading-relaxed italic">{d.implication}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Métricas do período */}
      <div className="bg-surface/30 border border-border rounded-2xl p-5">
        <div className="text-xs text-muted mb-4 uppercase tracking-wider">
          Métricas do período
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Metric label="Grit médio" value={String(metrics.avgGrit)} />
          <Metric label="Consistência" value={`${metrics.consistency}%`} />
          <Metric label="Dias ativos" value={String(metrics.activeDays)} />
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-light tabular text-ink">{value}</div>
      <div className="text-[10px] text-muted mt-1 uppercase tracking-wider">{label}</div>
    </div>
  )
}
