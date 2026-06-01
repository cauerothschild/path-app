'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'

const HABIT_OPTIONS = ['Treinar', 'Ler', 'Meditar', 'Dormir cedo', 'Estudar', 'Beber água']

const WINDOW_PRESETS = [
  { label: 'Manhã', value: '06h - 09h' },
  { label: 'Tarde', value: '12h - 15h' },
  { label: 'Noite', value: '18h - 21h' },
]

const WEEK_DAYS = [
  { key: 'Dom', label: 'D' },
  { key: 'Seg', label: 'S' },
  { key: 'Ter', label: 'T' },
  { key: 'Qua', label: 'Q' },
  { key: 'Qui', label: 'Q' },
  { key: 'Sex', label: 'S' },
  { key: 'Sáb', label: 'S' },
]

const OBSTACLE_OPTIONS = [
  'Cansaço',
  'Falta de tempo',
  'Esquecimento',
  'Sono ruim',
  'Dia caótico',
  'Desmotivação',
  'Falta de energia',
  'Excesso de cobrança',
  'Ansiedade',
  'Quando falho um dia, abandono',
]

interface Answers {
  display_name: string
  target_habit: string
  target_window: string
  target_days: string[]
  main_obstacles: string[]
}

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({
    display_name: '',
    target_habit: '',
    target_window: '',
    target_days: [],
    main_obstacles: [],
  })
  const [otherHabit, setOtherHabit] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/')
    })
  }, [])

  const totalSteps = 4

  async function finalize() {
    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      router.replace('/')
      return
    }

    await supabase.from('users').update({
      display_name: answers.display_name.trim(),
      target_habit: answers.target_habit,
      main_obstacles: answers.main_obstacles,
      onboarding_done: true,
    }).eq('id', userData.user.id)

    await supabase.from('habits').insert({
      user_id: userData.user.id,
      name: answers.target_habit,
      preferred_time: answers.target_window,
      current_time: answers.target_window,
      target_days: answers.target_days,
      target_duration_min: 30,
      active: true,
    })

    router.replace('/dashboard')
  }

  function next() {
    if (step < totalSteps - 1) setStep(step + 1)
    else finalize()
  }

  function back() {
    if (step > 0) setStep(step - 1)
  }

  const canAdvance = (() => {
    switch (step) {
      case 0: return answers.display_name.trim().length > 0
      case 1: return answers.target_habit.length > 0
      case 2: return answers.target_window.length > 0
      case 3: return answers.main_obstacles.length > 0
      default: return false
    }
  })()

  return (
    <main className="min-h-screen flex flex-col px-7 pt-10 pb-7 relative overflow-hidden">
      <div className="ambient-glow opacity-50" />

      {/* Logo */}
      <div className="relative z-10 flex justify-center mb-8">
        <div className="relative" style={{ width: 140, height: 52 }}>
          <Image src="/logo-full.png" alt="Path" fill className="object-contain mix-blend-screen" priority />
        </div>
      </div>

      {/* Header: 0X / 04 · CALIBRATION */}
      <div className="relative z-10 meta-row mb-2 tabular">
        <span>{String(step + 1).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}</span>
        <span>CALIBRATION</span>
      </div>

      {/* Wave-progress: indicador de progresso usando a onda assinatura */}
      <div className="relative z-10 mb-14">
        <div className="relative h-[1px] bg-white/[0.06]">
          <div
            className="absolute left-0 top-0 h-[1px] bg-primary transition-all duration-700 ease-premium"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="relative z-10 flex-1" key={step}>
        {step === 0 && (
          <StepName
            value={answers.display_name}
            onChange={v => setAnswers({ ...answers, display_name: v })}
          />
        )}
        {step === 1 && (
          <StepChoice
            title='Qual comportamento você quer tornar <kw>inevitável?</kw>'
            hint="Um comportamento. Específico. Repetível."
            options={HABIT_OPTIONS}
            value={answers.target_habit}
            otherValue={otherHabit}
            onOther={setOtherHabit}
            onSelect={v => setAnswers({ ...answers, target_habit: v })}
          />
        )}
        {step === 2 && (
          <StepSchedule
            window={answers.target_window}
            days={answers.target_days}
            onWindowChange={v => setAnswers({ ...answers, target_window: v })}
            onDaysChange={v => setAnswers({ ...answers, target_days: v })}
          />
        )}
        {step === 3 && (
          <StepMulti
            title="O que normalmente quebra sua consistência?"
            hint="Selecione o que mais acontece com você."
            options={OBSTACLE_OPTIONS}
            values={answers.main_obstacles}
            onToggle={v => {
              const set = new Set(answers.main_obstacles)
              if (set.has(v)) set.delete(v); else set.add(v)
              setAnswers({ ...answers, main_obstacles: Array.from(set) })
            }}
          />
        )}
      </div>

      <div className="relative z-10 space-y-1 mt-8">
        <button
          onClick={next}
          disabled={!canAdvance || saving}
          className="btn btn-primary w-full"
        >
          <span>
            {saving
              ? 'Iniciando…'
              : step === totalSteps - 1
              ? 'Begin observation'
              : 'Continue'}
          </span>
          {!saving && <span aria-hidden>→</span>}
        </button>

        <button
          onClick={step === 0 ? () => router.replace('/') : back}
          className="w-full btn-quiet py-3"
        >
          {step === 0 ? 'Pular' : 'Voltar'}
        </button>
      </div>
    </main>
  )
}

// ============================================
// Sub-componentes
// ============================================

/** Renderiza string com tags <kw>...</kw> como spans com classe .kw (mint sublinhado). */
function renderTitle(title: string) {
  const parts = title.split(/(<kw>.*?<\/kw>)/g)
  return parts.map((p, i) => {
    const m = p.match(/^<kw>(.*?)<\/kw>$/)
    if (m) return <span key={i} className="kw">{m[1]}</span>
    return <span key={i}>{p}</span>
  })
}

function StepName({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="animate-fade-up">
      <h1 className="headline-lg mb-4">Como posso te chamar?</h1>
      <p className="body text-muted mb-12">
        Um nome ajuda a entregar briefings em tom direto.
      </p>
      <input
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Digite seu nome"
        className="input"
      />
    </div>
  )
}

function StepSchedule({
  window: selectedWindow,
  days,
  onWindowChange,
  onDaysChange,
}: {
  window: string
  days: string[]
  onWindowChange: (v: string) => void
  onDaysChange: (v: string[]) => void
}) {
  const [customActive, setCustomActive] = useState(false)
  const [customValue, setCustomValue] = useState('')

  function toggleDay(key: string) {
    const set = new Set(days)
    if (set.has(key)) set.delete(key); else set.add(key)
    onDaysChange(Array.from(set))
  }

  return (
    <div className="animate-fade-up">
      <h1 className="headline-lg mb-4">
        Quais horários você quer <span className="kw">realizar seu hábito?</span>
      </h1>
      <p className="body text-muted mb-10">Escolha a janela que melhor encaixa na sua rotina.</p>

      <div className="space-y-2 mb-8">
        {WINDOW_PRESETS.map(p => (
          <button
            key={p.value}
            type="button"
            onClick={() => { setCustomActive(false); onWindowChange(p.value) }}
            className={`opt-pill w-full text-left ${selectedWindow === p.value && !customActive ? 'selected' : ''}`}
          >
            <span className="font-medium">{p.label}</span>
            <span className="ml-2 opacity-60">{p.value}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setCustomActive(true); onWindowChange(customValue || ' ') }}
          className={`opt-pill w-full text-left ${customActive ? 'selected' : ''}`}
        >
          {customActive ? (
            <input
              autoFocus
              value={customValue}
              onChange={e => { setCustomValue(e.target.value); onWindowChange(e.target.value) }}
              placeholder="Ex: 07h - 08h"
              className="bg-transparent outline-none w-full text-inherit placeholder:text-bg/50"
            />
          ) : (
            'Personalizado'
          )}
        </button>
      </div>

      <p className="text-[11px] text-muted uppercase tracking-wider mb-3">Dias da semana (opcional)</p>
      <div className="flex gap-2">
        {WEEK_DAYS.map(d => (
          <button
            key={d.key}
            type="button"
            onClick={() => toggleDay(d.key)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-medium border transition ${
              days.includes(d.key)
                ? 'bg-primary/20 border-primary/50 text-primary'
                : 'bg-surface/30 border-border text-muted hover:text-ink'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function StepChoice({
  title,
  hint,
  options,
  value,
  otherValue,
  onOther,
  onSelect,
}: {
  title: string
  hint: string
  options: string[]
  value: string
  otherValue: string
  onOther: (v: string) => void
  onSelect: (v: string) => void
}) {
  const isOther = value && !options.includes(value)

  return (
    <div className="animate-fade-up">
      <h1 className="headline-lg mb-4">{renderTitle(title)}</h1>
      <p className="body text-muted mb-10 max-w-md">{hint}</p>

      <div className="grid grid-cols-2 gap-2.5 mb-3">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={`opt-pill ${value === opt ? 'selected' : ''}`}
          >
            {opt}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onSelect(otherValue || ' ')}
        className={`w-full opt-pill text-left ${isOther ? 'selected' : ''}`}
      >
        {isOther ? (
          <input
            autoFocus
            value={otherValue}
            onChange={e => {
              onOther(e.target.value)
              onSelect(e.target.value)
            }}
            placeholder="Escreva aqui"
            className="bg-transparent outline-none w-full text-inherit placeholder:text-bg/60"
          />
        ) : (
          'Outro (escrever)'
        )}
      </button>
    </div>
  )
}

function StepMulti({
  title,
  hint,
  options,
  values,
  onToggle,
}: {
  title: string
  hint: string
  options: string[]
  values: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div className="animate-fade-up">
      <h1 className="headline-lg mb-4">{renderTitle(title)}</h1>
      <p className="body text-muted mb-10 max-w-md">{hint}</p>

      <div className="grid grid-cols-2 gap-2.5">
        {options.map(opt => {
          const selected = values.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`opt-pill text-left ${selected ? 'selected' : ''}`}
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    selected ? 'bg-bg' : 'bg-muted'
                  }`}
                />
                {opt}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
