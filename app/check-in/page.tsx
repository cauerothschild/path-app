'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { gritOfDayWithExecutionTime, currentStreak } from '@/lib/grit'
import WavePath from '@/components/WavePath'
import BottomNav from '@/components/BottomNav'

interface CheckInRow {
  executed: boolean
  difficulty: 1 | 2 | 3
  check_in_time: string
}

type Step = 'availability' | 'q1' | 'q2' | 'q3' | 'completed'

const SUCCESS_MSGS = ['Continuidade registrada.', 'Padrão reforçado.', 'Contexto salvo.']
const FAILURE_MSGS = ['Contexto registrado.', 'Ajustando estratégia.', 'Um dia isolado não define a trajetória.']

const DIFFICULTY_OPTS: { label: string; value: 1 | 2 | 3 }[] = [
  { label: 'Fácil', value: 1 },
  { label: 'Médio', value: 2 },
  { label: 'Difícil', value: 3 },
  { label: 'Quase não aconteceu', value: 3 },
]
const FAILURE_OPTS = ['Cansaço', 'Dia caótico', 'Esqueci', 'Falta de tempo', 'Baixa motivação', 'Distrações', 'Quebrei a rotina', 'Não quis']
const POSITIVE_OPTS = ['Boa energia', 'Ambiente organizado', 'Rotina estável', 'Comecei pequeno', 'Estava motivado', 'Horário funcionou bem']
const BARRIER_OPTS = ['Meta menor', 'Outro horário', 'Mais estrutura', 'Menos distração', 'Ambiente melhor', 'Lembrete', 'Mais energia', 'Não sei identificar']

// Se for antes das 03:00h, o hábito ainda pertence ao dia anterior
function getHabitDay(now: Date): Date {
  const d = new Date(now)
  if (d.getHours() < 3) d.setDate(d.getDate() - 1)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Extrai hora/minuto de início de strings como "18h - 21h" ou "18:00".
// Retorna null se não encontrar nenhum número (ex: valores antigos como 'noite', 'evening').
function parseWindowStart(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null
  const rangeMatch = timeStr.match(/(\d{1,2})h/)
  if (rangeMatch) return { hours: parseInt(rangeMatch[1]), minutes: 0 }
  const colonMatch = timeStr.match(/(\d{1,2}):(\d{2})/)
  if (colonMatch) return { hours: parseInt(colonMatch[1]), minutes: parseInt(colonMatch[2]) }
  return null
}

export default function CheckInScreen() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>('availability')
  const [loading, setLoading] = useState(true)
  const [habitId, setHabitId] = useState('')
  const [habitName, setHabitName] = useState('')
  const [executed, setExecuted] = useState<boolean | null>(null)
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | null>(null)
  const [failureReason, setFailureReason] = useState<string | null>(null)
  const [completionMsg, setCompletionMsg] = useState('')
  const [availableAt, setAvailableAt] = useState('18:00')
  const [habitDateStr, setHabitDateStr] = useState('')

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

    setHabitId(habits.id)
    setHabitName(habits.name)

    const now = new Date()
    const habitDay = getHabitDay(now)
    const hds = [
      habitDay.getFullYear(),
      String(habitDay.getMonth() + 1).padStart(2, '0'),
      String(habitDay.getDate()).padStart(2, '0'),
    ].join('-')
    setHabitDateStr(hds)

    const windowSrc = habits.schedule_time || habits.preferred_time || ''
    const parsed = parseWindowStart(windowSrc)
    const label = parsed
      ? `${String(parsed.hours).padStart(2, '0')}:${String(parsed.minutes).padStart(2, '0')}`
      : '00:00'
    setAvailableAt(label)

    // windowOpen é sempre em relação ao dia atual (não habitDay) para janelas da manhã
    const today = new Date()
    const windowOpen = parsed
      ? new Date(today.getFullYear(), today.getMonth(), today.getDate(), parsed.hours, parsed.minutes)
      : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0)
    // Janela fecha às 03:00 do dia seguinte
    const deadline = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 3, 0)

    const { data: todayCheckIn } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .eq('habit_id', habits.id)
      .eq('date', hds)
      .single()

    if (todayCheckIn) {
      setExecuted(todayCheckIn.executed)
      setStep('completed')
    } else if (now >= windowOpen && now <= deadline) {
      setStep('q1')
    } else {
      setStep('availability')
    }

    setLoading(false)
  }

  async function submitCheckIn(
    execVal: boolean,
    diffVal: 1 | 2 | 3,
    reasonVal: string | null,
    contextVal: string
  ) {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const userId = userData.user.id
    const today = habitDateStr || getHabitDay(new Date()).toISOString().slice(0, 10)
    const now = new Date()

    const { data: existing } = await supabase
      .from('check_ins')
      .select('executed')
      .eq('user_id', userId)
      .eq('habit_id', habitId)
      .lt('date', today)
      .order('date', { ascending: true })

    const streakBefore = currentStreak(existing ?? [])
    const dayGrit = gritOfDayWithExecutionTime({
      executed: execVal,
      difficulty: diffVal,
      executionTime: execVal ? now : null,
      streakBefore,
    })

    await supabase.from('check_ins').upsert(
      {
        user_id: userId,
        habit_id: habitId,
        date: today,
        executed: execVal,
        difficulty: diffVal,
        failure_reason: reasonVal,
        check_in_time: now.toISOString(),
        execution_time: execVal ? now.toISOString() : null,
        energy_level: contextVal,
        grit_score: dayGrit,
      },
      { onConflict: 'user_id,habit_id,date' }
    )

    const msgs = execVal ? SUCCESS_MSGS : FAILURE_MSGS
    setCompletionMsg(msgs[Math.floor(Math.random() * msgs.length)])
    setStep('completed')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted">
        <div className="w-32 text-primary/70">
          <WavePath variant="loader" />
        </div>
        <div className="eyebrow text-subtle">Carregando…</div>
      </div>
    )
  }

  const stepIndex = { q1: 0, q2: 1, q3: 2 } as Record<string, number>
  const currentDot = stepIndex[step] ?? -1

  return (
    <main className="min-h-screen flex flex-col pb-20 bg-bg relative overflow-hidden">
      <div className="ambient-glow opacity-30" />

      {/* Header */}
      <header className="relative z-10 px-6 pt-6 pb-4">
        <div className="eyebrow mb-1">Check-in diário</div>
        <p className="text-[13px] text-muted">{habitName}</p>
        {currentDot >= 0 && (
          <div className="flex gap-1.5 mt-4">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentDot ? 'w-6 bg-primary' : i < currentDot ? 'w-2 bg-primary/40' : 'w-2 bg-border'
                }`}
              />
            ))}
          </div>
        )}
      </header>

      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-4">

        {/* Availability */}
        {step === 'availability' && (
          <div className="space-y-6 max-w-sm mx-auto w-full animate-fade-up">
            <h2 className="text-xl font-light text-ink">Check-in disponível em breve</h2>
            <div className="card p-6 text-center">
              <div className="text-4xl font-light text-primary mb-2 tabular-nums">
                {availableAt.split(':')[0]}h
              </div>
              <p className="text-xs text-muted">Volte nesse horário.</p>
            </div>
          </div>
        )}

        {/* Q1: Sim / Não */}
        {step === 'q1' && (
          <div className="space-y-8 max-w-sm mx-auto w-full animate-fade-up">
            <h2 className="text-2xl font-light text-ink leading-snug">
              Você manteve o comportamento hoje?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setExecuted(true); setStep('q2') }}
                className="btn btn-primary py-6 text-base"
              >
                Sim
              </button>
              <button
                onClick={() => { setExecuted(false); setStep('q2') }}
                className="btn btn-ghost py-6 text-base border-error/30 text-error hover:border-error/60"
              >
                Não
              </button>
            </div>
          </div>
        )}

        {/* Q2: difficulty (sim) or failure reason (não) */}
        {step === 'q2' && (
          <div className="space-y-5 max-w-sm mx-auto w-full animate-fade-up" key="q2">
            <h2 className="text-2xl font-light text-ink leading-snug">
              {executed ? 'Quão difícil foi manter hoje?' : 'O que pesou mais hoje?'}
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {(executed ? DIFFICULTY_OPTS : FAILURE_OPTS.map(l => ({ label: l, value: l }))).map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => {
                    if (executed) setDifficulty((opt as typeof DIFFICULTY_OPTS[0]).value)
                    else setFailureReason(opt.label)
                    setStep('q3')
                  }}
                  className="opt-pill py-4 text-sm"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Q3: positive context (sim) or barrier (não) */}
        {step === 'q3' && (
          <div className="space-y-5 max-w-sm mx-auto w-full animate-fade-up" key="q3">
            <h2 className="text-2xl font-light text-ink leading-snug">
              {executed ? 'O que mais influenciou hoje?' : 'O que teria tornado mais possível?'}
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {(executed ? POSITIVE_OPTS : BARRIER_OPTS).map(opt => (
                <button
                  key={opt}
                  onClick={() => submitCheckIn(executed!, difficulty ?? 2, failureReason, opt)}
                  className="opt-pill py-4 text-sm"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {step === 'completed' && (
          <div className="space-y-6 max-w-sm mx-auto w-full text-center animate-fade-up">
            <div className="text-3xl text-primary">✓</div>
            <p className="text-xl font-light text-ink">
              {completionMsg || 'Contexto salvo.'}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn btn-ghost w-full py-4 text-sm mt-4"
            >
              Voltar para Home
            </button>
          </div>
        )}

      </div>

      <BottomNav />
    </main>
  )
}
