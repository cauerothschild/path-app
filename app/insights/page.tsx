'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import WavePath from '@/components/WavePath'
import BottomNav from '@/components/BottomNav'
import { buildInsights, type InsightBlock, type InsightType } from '@/lib/insights'

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
      .maybeSingle()

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

    const history = (rows ?? []) as Parameters<typeof buildInsights>[0]
    setInsights(buildInsights(history))
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted">
        <div className="w-32 text-primary/70">
          <WavePath variant="loader" />
        </div>
        <div className="eyebrow text-subtle">Loading patterns...</div>
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
  context:   { label: 'CONTEXT',   dotColor: 'bg-subtle',    labelColor: 'text-muted'    },
  pattern:   { label: 'PATTERN',   dotColor: 'bg-success',   labelColor: 'text-success'  },
  directive: { label: 'DIRECTIVE', dotColor: 'bg-warn',      labelColor: 'text-warn'     },
  premium:   { label: 'PREMIUM',   dotColor: 'bg-primary',   labelColor: 'text-primary'  },
  locked:    { label: 'LOCKED',    dotColor: 'bg-surface',   labelColor: 'text-subtle'   },
}

function InsightCard({ insight }: { insight: InsightBlock }) {
  const cfg = TYPE_CONFIG[insight.type]
  const isLocked = insight.type === 'locked'
  return (
    <div className={`card p-5 ${isLocked ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${cfg.dotColor} shrink-0`} />
        <span className={`text-[11px] font-semibold tracking-[0.14em] ${cfg.labelColor}`}>
          {cfg.label}
        </span>
      </div>
      <p className={`text-[17px] font-light leading-snug mb-3 ${isLocked ? 'text-muted' : 'text-ink'}`}>
        {insight.headline}
      </p>
      <p className="text-[10px] tracking-[0.12em] text-subtle uppercase">
        {insight.meta}
      </p>
    </div>
  )
}
