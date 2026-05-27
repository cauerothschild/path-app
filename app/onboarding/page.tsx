'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

// Opções pré-definidas dos passos 2-4 (estilo mockup)
const HABIT_OPTIONS = ['Treinar', 'Ler', 'Meditar', 'Dormir cedo', 'Estudar', 'Beber água']
const ANCHOR_OPTIONS = ['Tomar café', 'Escovar os dentes', 'Abrir o notebook', 'Chegar em casa', 'Tomar banho']
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
  daily_anchor: string
  main_obstacles: string[]
}

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({
    display_name: '',
    target_habit: '',
    daily_anchor: '',
    main_obstacles: [],
  })
  const [otherHabit, setOtherHabit] = useState('')
  const [otherAnchor, setOtherAnchor] = useState('')
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
      daily_anchor: answers.daily_anchor,
      main_obstacles: answers.main_obstacles,
      onboarding_done: true,
    }).eq('id', userData.user.id)

    await supabase.from('habits').insert({
      user_id: userData.user.id,
      name: answers.target_habit,
      preferred_time: 'morning',
      current_time: '08:00',
      current_anchor: answers.daily_anchor,
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
      case 2: return answers.daily_anchor.length > 0
      case 3: return answers.main_obstacles.length > 0
      default: return false
    }
  })()

  return (
    <main className="min-h-screen flex flex-col px-6 pt-12 pb-8">
      {/* Indicador "1/4" */}
      <div className="text-sm text-muted mb-12 tabular">
        {step + 1}/{totalSteps}
      </div>

      <div className="flex-1">
        {step === 0 && (
          <StepName
            value={answers.display_name}
            onChange={v => setAnswers({ ...answers, display_name: v })}
          />
        )}
        {step === 1 && (
          <StepChoice
            title="Qual comportamento você quer tornar inevitável?"
            hint="Escolha ou escreva o seu."
            options={HABIT_OPTIONS}
            value={answers.target_habit}
            otherValue={otherHabit}
            onOther={setOtherHabit}
            onSelect={v => setAnswers({ ...answers, target_habit: v })}
          />
        )}
        {step === 2 && (
          <StepChoice
            title="O que você já faz todos os dias sem pensar?"
            hint="Isso vai nos ajudar a te ancorar."
            options={ANCHOR_OPTIONS}
            value={answers.daily_anchor}
            otherValue={otherAnchor}
            onOther={setOtherAnchor}
            onSelect={v => setAnswers({ ...answers, daily_anchor: v })}
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

      <div className="space-y-3 mt-8">
        <button
          onClick={next}
          disabled={!canAdvance || saving}
          className="w-full bg-primary text-bg font-medium py-3.5 rounded-xl hover:bg-primary/90 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {saving ? 'Iniciando...' : step === totalSteps - 1 ? 'Finalizar' : 'Continuar'}
        </button>

        <button
          onClick={step === 0 ? () => router.replace('/') : back}
          className="w-full text-sm text-muted py-2 hover:text-ink transition"
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

function StepName({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="fade-in">
      <h1 className="text-2xl font-light leading-snug mb-2">
        Como posso<br />te chamar?
      </h1>
      <p className="text-sm text-muted mb-10">Ex: Caio, Ana, Rafael</p>
      <input
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Digite seu nome"
        className="w-full bg-surface/40 border border-border px-4 py-3.5 rounded-xl text-ink placeholder:text-subtle focus:outline-none focus:border-primary/50 transition"
      />
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
    <div className="fade-in">
      <h1 className="text-2xl font-light leading-snug mb-2">{title}</h1>
      <p className="text-sm text-muted mb-8">{hint}</p>

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
    <div className="fade-in">
      <h1 className="text-2xl font-light leading-snug mb-2">{title}</h1>
      <p className="text-sm text-muted mb-8">{hint}</p>

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
