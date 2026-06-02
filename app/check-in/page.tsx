'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { gritOfDayWithExecutionTime, currentStreak } from '@/lib/grit'
import WavePath from '@/components/WavePath'
import BottomNav from '@/components/BottomNav'
import TimeDrumPicker from '@/components/TimeDrumPicker'
import { getSuggestions } from '@/lib/path-suggestions'
import { pickContextQuestion, type ContextQuestion } from '@/lib/context-questions'

interface CheckInRow {
  executed: boolean
  difficulty: 1 | 2 | 3 | 4
  check_in_time: string
}

type Step = 'availability' | 'q1' | 'q_time' | 'q2' | 'q3' | 'completed' | 'context_q' | 'context_done'

const SUCCESS_MSGS = ['Continuidade registrada.', 'Padrão reforçado.', 'Contexto salvo.']
const FAILURE_MSGS = ['Contexto registrado.', 'Ajustando estratégia.', 'Um dia isolado não define a trajetória.']

const DIFFICULTY_OPTS: { label: string; value: 1 | 2 | 3 | 4 }[] = [
  { label: 'Fácil', value: 1 },
  { label: 'Médio', value: 2 },
  { label: 'Difícil', value: 3 },
  { label: 'Quase não aconteceu', value: 4 },
]
const FAILURE_OPTS = ['Cansaço', 'Dia caótico', 'Esqueci', 'Falta de tempo', 'Baixa motivação', 'Distrações', 'Quebrei a rotina', 'Não quis']
const POSITIVE_OPTS = ['Boa energia', 'Ambiente organizado', 'Rotina estável', 'Comecei pequeno', 'Estava motivado', 'Horário funcionou bem']
const BARRIER_OPTS = ['Meta menor', 'Outro horário', 'Me preparar antes', 'Menos distração', 'Ambiente melhor', 'Lembrete', 'Mais energia', 'Não sei identificar']
function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

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
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | null>(null)
  const [failureReason, setFailureReason] = useState<string | null>(null)
  const [completionMsg, setCompletionMsg] = useState('')
  const [availableAt, setAvailableAt] = useState('18:00')
  const [habitDateStr, setHabitDateStr] = useState('')
  const [executionTimeSlot, setExecutionTimeSlot] = useState<string | null>(null)
  const [selectedBarrier, setSelectedBarrier] = useState<string | null>(null)
  const [pickerTime, setPickerTime] = useState(nowHHMM)
  const [totalCheckIns, setTotalCheckIns] = useState(0)
  const [noHabitDay, setNoHabitDay] = useState(false)
  const [contextQuestion, setContextQuestion] = useState<ContextQuestion | null>(null)
  const [contextDoneMsg, setContextDoneMsg] = useState('')

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

    const now = new Date()
    const habitDay = getHabitDay(now)
    const hds = [
      habitDay.getFullYear(),
      String(habitDay.getMonth() + 1).padStart(2, '0'),
      String(habitDay.getDate()).padStart(2, '0'),
    ].join('-')
    setHabitDateStr(hds)

    if (!habits) {
      await initContextFlow(userId, habitDay, hds)
      setLoading(false)
      return
    }

    setHabitId(habits.id)
    setHabitName(habits.name)

    const dow = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][habitDay.getDay()]
    const scheduledToday = !habits.target_days || habits.target_days.length === 0 || habits.target_days.includes(dow)
    if (!scheduledToday) {
      const { count: ciCount } = await supabase
        .from('check_ins')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('habit_id', habits.id)
      setTotalCheckIns(ciCount ?? 0)
      await initContextFlow(userId, habitDay, hds)
      setLoading(false)
      return
    }

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

    const { count: ciCount } = await supabase
      .from('check_ins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('habit_id', habits.id)
    setTotalCheckIns(ciCount ?? 0)

    const { data: todayCheckIn } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .eq('habit_id', habits.id)
      .eq('date', hds)
      .maybeSingle()

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
    diffVal: 1 | 2 | 3 | 4,
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

    const { error: upsertErr } = await supabase.from('check_ins').upsert(
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

    if (upsertErr) {
      console.error('[CHECK-IN UPSERT ERROR]', upsertErr)
      alert(`Erro ao salvar check-in: ${upsertErr.message}`)
      return
    }

    setTotalCheckIns(prev => prev + 1)
    const msgs = execVal ? SUCCESS_MSGS : FAILURE_MSGS
    setCompletionMsg(msgs[Math.floor(Math.random() * msgs.length)])
    setStep('completed')
  }

  async function initContextFlow(userId: string, habitDay: Date, hds: string) {
    setNoHabitDay(true)
    const { data: existing } = await supabase
      .from('context_questions')
      .select('id')
      .eq('user_id', userId)
      .eq('date', hds)
      .maybeSingle()
    if (existing) {
      setContextDoneMsg('Você já registrou seu contexto hoje.')
      setStep('context_done')
      return
    }
    setContextQuestion(pickContextQuestion(habitDay))
    setStep('context_q')
  }

  async function submitContextQuestion(answer: string) {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user || !contextQuestion) return
    const today = habitDateStr || getHabitDay(new Date()).toISOString().slice(0, 10)
    const { error } = await supabase.from('context_questions').insert({
      user_id: userData.user.id,
      date: today,
      question_id: contextQuestion.id,
      question_text: contextQuestion.text,
      answer,
    })
    if (error) console.error('[CONTEXT Q ERROR]', error)
    setContextDoneMsg('Contexto registrado.')
    setStep('context_done')
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

  const isYesFlow = executed === true
  const dotMap: Record<string, number> = isYesFlow
    ? { q1: 0, q_time: 1, q2: 2, q3: 3 }
    : { q1: 0, q2: 1, q3: 2 }
  const totalDots = isYesFlow ? 4 : 3
  const currentDot = dotMap[step] ?? -1

  return (
    <main className="min-h-screen flex flex-col pb-20 bg-bg relative overflow-hidden">
      <div className="ambient-glow opacity-30" />

      {/* Header */}
      <header className="relative z-10 px-6 pt-6 pb-4">
        <div className="eyebrow mb-1">{noHabitDay ? 'Contexto diário' : 'Check-in diário'}</div>
        <p className="text-[13px] text-muted">{noHabitDay ? 'Observação passiva' : habitName}</p>
        {currentDot >= 0 && (
          <div className="flex gap-1.5 mt-4">
            {Array.from({ length: totalDots }, (_, i) => i).map(i => (
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
                onClick={() => { setExecuted(true); setPickerTime(nowHHMM()); setStep('q_time') }}
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

        {/* Q_TIME: horário de execução (só fluxo Sim) */}
        {step === 'q_time' && (
          <div className="space-y-6 max-w-sm mx-auto w-full animate-fade-up" key="q_time">
            <h2 className="text-2xl font-light text-ink leading-snug">
              Em qual horário você realizou?
            </h2>
            <TimeDrumPicker value={pickerTime} onChange={setPickerTime} />
            <button
              onClick={() => { setExecutionTimeSlot(pickerTime); setStep('q2') }}
              className="btn btn-primary w-full py-4 text-base"
            >
              Confirmar
            </button>
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
                  onClick={() => {
                    if (!executed) setSelectedBarrier(opt)
                    submitCheckIn(executed!, difficulty ?? 2, failureReason, executionTimeSlot ? `${executionTimeSlot} · ${opt}` : opt)
                  }}
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
          <div className="space-y-6 max-w-sm mx-auto w-full animate-fade-up">
            <div className="text-center">
              <div className="text-3xl text-primary">✓</div>
              <p className="text-xl font-light text-ink mt-3">
                {completionMsg || 'Contexto salvo.'}
              </p>
            </div>

            {/* Calibration progress card */}
            <div className="card px-5 py-4 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Calibração</span>
                {totalCheckIns < 30
                  ? <span className="text-[13px] text-ink2 tabular font-medium">
                      {totalCheckIns}<span className="text-muted">/30</span>
                    </span>
                  : <span className="text-[11px] text-primary/80 font-medium uppercase tracking-wider">Concluída</span>
                }
              </div>

              {/* Progress track */}
              <div className="h-[3px] rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.min((totalCheckIns / 30) * 100, 100)}%`,
                    transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
              </div>

              <p className="text-[12px] text-muted leading-snug">
                {totalCheckIns < 30
                  ? `Mais ${30 - totalCheckIns} dia${30 - totalCheckIns === 1 ? '' : 's'} de check-in para o app concluir sua calibração.`
                  : 'O app já tem dados suficientes para reconhecer seu padrão.'
                }
              </p>
            </div>

            {/* PATH SUGGESTION */}
            {(() => {
              if (executed || !failureReason || !selectedBarrier) return null
              const all = getSuggestions(failureReason)
              const match = all.find(s => s.title === selectedBarrier)
              if (!match) return null
              return (
                <div className="card p-5 text-left space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-warn shrink-0" />
                    <span className="text-[11px] font-semibold tracking-[0.14em] text-warn">
                      PATH SUGGESTION
                    </span>
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-ink mb-1">· {match.title}</p>
                    <p className="text-[13px] font-light text-muted leading-relaxed">{match.body}</p>
                  </div>
                </div>
              )
            })()}

            <button
              onClick={() => router.push('/dashboard')}
              className="btn btn-ghost w-full py-4 text-sm"
            >
              Voltar para Home
            </button>
          </div>
        )}

        {/* Context Question — dia sem hábito programado */}
        {step === 'context_q' && contextQuestion && (
          <div className="space-y-8 max-w-sm mx-auto w-full animate-fade-up">
            <div>
              <p className="text-[12px] text-muted uppercase tracking-[0.1em] mb-4">
                Você não tem hábitos programados pra hoje
              </p>
              <h2 className="text-2xl font-light text-ink leading-snug">
                {contextQuestion.text}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {contextQuestion.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => submitContextQuestion(opt)}
                  className="opt-pill py-4 text-sm"
                >
                  {opt}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setContextDoneMsg('Tudo bem. Você pode responder amanhã.'); setStep('context_done') }}
              className="w-full btn-quiet py-3 text-sm"
            >
              Pular
            </button>
          </div>
        )}

        {/* Context Done */}
        {step === 'context_done' && (
          <div className="space-y-6 max-w-sm mx-auto w-full animate-fade-up">
            <div className="text-center">
              <div className="text-3xl text-primary">◦</div>
              <p className="text-xl font-light text-ink mt-3">
                {contextDoneMsg || 'Contexto registrado.'}
              </p>
            </div>

            <div className="card px-5 py-4 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Calibração</span>
                {totalCheckIns < 30
                  ? <span className="text-[13px] text-ink2 tabular font-medium">
                      {totalCheckIns}<span className="text-muted">/30</span>
                    </span>
                  : <span className="text-[11px] text-primary/80 font-medium uppercase tracking-wider">Concluída</span>
                }
              </div>
              <div className="h-[3px] rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.min((totalCheckIns / 30) * 100, 100)}%`,
                    transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
              </div>
              <p className="text-[12px] text-muted leading-snug">
                {totalCheckIns < 30
                  ? `Mais ${30 - totalCheckIns} dia${30 - totalCheckIns === 1 ? '' : 's'} de check-in para o app concluir sua calibração.`
                  : 'O app já tem dados suficientes para reconhecer seu padrão.'
                }
              </p>
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
