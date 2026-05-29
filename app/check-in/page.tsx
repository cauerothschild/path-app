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

type Step = 'availability' | 'execution' | 'context' | 'energy' | 'completed'

// Se for antes das 03:00h, o hábito ainda pertence ao dia anterior
function getHabitDay(now: Date): Date {
  const d = new Date(now)
  if (d.getHours() < 3) d.setDate(d.getDate() - 1)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Extrai hora/minuto de início de strings como "18h - 21h" ou "18:00"
function parseWindowStart(timeStr: string): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 18, minutes: 0 }
  const rangeMatch = timeStr.match(/(\d{1,2})h/)
  if (rangeMatch) return { hours: parseInt(rangeMatch[1]), minutes: 0 }
  const colonMatch = timeStr.match(/(\d{1,2}):(\d{2})/)
  if (colonMatch) return { hours: parseInt(colonMatch[1]), minutes: parseInt(colonMatch[2]) }
  return { hours: 18, minutes: 0 }
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
  const [energy, setEnergy] = useState<'high' | 'medium' | 'low' | null>(null)
  const [executionTime, setExecutionTime] = useState<string | null>(null)
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
      .single()

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

    const windowSrc = habits.current_time || habits.preferred_time || '18:00'
    const { hours, minutes } = parseWindowStart(windowSrc)
    const label = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    setAvailableAt(label)

    const windowOpen = new Date(habitDay.getFullYear(), habitDay.getMonth(), habitDay.getDate(), hours, minutes)
    // Janela fecha às 03:00 do dia seguinte ao dia do hábito
    const deadline = new Date(habitDay.getFullYear(), habitDay.getMonth(), habitDay.getDate() + 1, 3, 0)

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
      setStep('execution')
    } else {
      setStep('availability')
    }

    setLoading(false)
  }

  async function submitCheckIn() {
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

    const timeForGrit = executionTime ? new Date(`${today}T${executionTime}:00`) : now
    const dayGrit = gritOfDayWithExecutionTime({
      executed: executed!,
      difficulty: difficulty ?? 2,
      executionTime: executed ? timeForGrit : null,
      streakBefore,
    })

    await supabase.from('check_ins').upsert(
      {
        user_id: userId,
        habit_id: habitId,
        date: today,
        executed,
        difficulty: difficulty ?? 2,
        failure_reason: failureReason,
        check_in_time: now.toISOString(),
        execution_time: executionTime ? timeForGrit.toISOString() : null,
        energy_level: energy,
        grit_score: dayGrit,
      },
      { onConflict: 'user_id,habit_id,date' }
    )

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

  return (
    <main className="min-h-screen flex flex-col pb-20 bg-bg relative overflow-hidden">
      <div className="ambient-glow opacity-30" />

      {/* Header */}
      <header className="relative z-10 px-6 pt-6 pb-4">
        <div className="hairline mb-4" />
        <div className="eyebrow mb-1">Check-in diário</div>
        <p className="text-[13px] text-muted">{habitName}</p>
      </header>

      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-8">

        {/* Step: Availability */}
        {step === 'availability' && (
          <div className="space-y-6 max-w-sm mx-auto w-full animate-fade-up">
            <div>
              <h2 className="text-xl font-light text-ink">Check-in disponível em breve</h2>
              <p className="text-sm text-muted mt-2">
                O check-in fica disponível às {availableAt}.
              </p>
            </div>
            <div className="card p-6 text-center">
              <div className="text-4xl font-light text-primary mb-2 tabular-nums">
                {availableAt.split(':')[0]}h
              </div>
              <p className="text-xs text-muted">Volte nesse horário.</p>
            </div>
          </div>
        )}

        {/* Step: Execution */}
        {step === 'execution' && (
          <div className="space-y-6 max-w-sm mx-auto w-full animate-fade-up">
            <h2 className="text-xl font-light text-ink">Você manteve o comportamento hoje?</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setExecuted(true); setStep('context') }}
                className="btn btn-primary py-5"
              >
                Fiz
              </button>
              <button
                onClick={() => { setExecuted(false); setStep('context') }}
                className="btn btn-ghost py-5 border-error/30 text-error hover:border-error/60"
              >
                Não fiz
              </button>
            </div>
          </div>
        )}

        {/* Step: Context */}
        {step === 'context' && (
          <div className="space-y-5 max-w-sm mx-auto w-full animate-fade-up">
            {executed === true ? (
              <>
                <h2 className="text-xl font-light text-ink">Como foi a dificuldade hoje?</h2>
                <div className="space-y-2">
                  {([
                    { value: 1 as const, label: 'Fácil' },
                    { value: 2 as const, label: 'Moderado' },
                    { value: 3 as const, label: 'Difícil' },
                  ]).map(d => (
                    <button
                      key={d.value}
                      onClick={() => { setDifficulty(d.value); setStep('energy') }}
                      className={`opt-pill w-full py-4 text-sm ${difficulty === d.value ? 'selected' : ''}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setDifficulty(2)
                    setExecutionTime(new Date().toTimeString().slice(0, 5))
                    setStep('energy')
                  }}
                  className="text-xs text-muted hover:text-ink2 transition"
                >
                  Pular
                </button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-light text-ink">O que mais pesou hoje?</h2>
                <div className="space-y-2">
                  {[
                    { key: 'tired', label: 'Cansaço' },
                    { key: 'forgot', label: 'Esqueci' },
                    { key: 'chaotic', label: 'Dia caótico' },
                    { key: 'unwilling', label: 'Não quis' },
                  ].map(r => (
                    <button
                      key={r.key}
                      onClick={() => { setFailureReason(r.key); setStep('energy') }}
                      className={`opt-pill w-full py-4 text-sm ${failureReason === r.key ? 'selected' : ''}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step: Energy */}
        {step === 'energy' && (
          <div className="space-y-5 max-w-sm mx-auto w-full animate-fade-up">
            <h2 className="text-xl font-light text-ink">Como estava sua energia hoje?</h2>
            <div className="space-y-2">
              {[
                { value: 'high' as const, label: 'Alta' },
                { value: 'medium' as const, label: 'Média' },
                { value: 'low' as const, label: 'Baixa' },
              ].map(e => (
                <button
                  key={e.value}
                  onClick={() => {
                    setEnergy(e.value)
                    submitCheckIn()
                  }}
                  className={`opt-pill w-full py-4 text-sm ${energy === e.value ? 'selected' : ''}`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Completed */}
        {step === 'completed' && (
          <div className="space-y-6 max-w-sm mx-auto w-full text-center animate-fade-up">
            <div className="text-3xl text-primary mb-2">✓</div>
            <div>
              <h2 className="text-xl font-light text-ink">Check-in completo</h2>
              <p className="text-sm text-muted mt-2">Até amanhã.</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn btn-ghost w-full py-4 text-sm"
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
