'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import WavePath from '@/components/WavePath'
import BottomNav from '@/components/BottomNav'

interface Habit {
  id: string
  name: string
  preferred_time: string
  target_duration_min: number
  current_time: string
  current_anchor: string | null
}

const WINDOW_PRESETS = [
  { label: 'Manhã', value: '06h - 09h' },
  { label: 'Tarde', value: '12h - 15h' },
  { label: 'Noite', value: '18h - 21h' },
  { label: 'Personalizado', value: 'custom' },
]

function windowFromHabit(habit: Habit): string {
  const t = habit.current_time
  if (!t) return 'Não definida'
  if (t.includes('-')) return t
  return t
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [habit, setHabit] = useState<Habit | null>(null)
  const [daysActive, setDaysActive] = useState(0)
  const [displayName, setDisplayName] = useState('')

  const [editName, setEditName] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('18h - 21h')
  const [customWindow, setCustomWindow] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      router.replace('/')
      return
    }

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userData.user.id)
      .single()

    if (!profile?.onboarding_done) {
      router.replace('/onboarding')
      return
    }

    setUserId(userData.user.id)
    setDisplayName(profile.display_name || '')
    const daysCount =
      Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000) + 1
    setDaysActive(daysCount)

    const { data: habits } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('active', true)
      .limit(1)
      .single()

    if (habits) {
      setHabit(habits)
      initEditState(habits)
    }
    setLoading(false)
  }

  function initEditState(h: Habit) {
    setEditName(h.name)
    const window = windowFromHabit(h)
    const matchedPreset = WINDOW_PRESETS.find(p => p.value === window && p.value !== 'custom')
    if (matchedPreset) {
      setSelectedPreset(matchedPreset.value)
      setIsCustom(false)
    } else {
      setSelectedPreset('custom')
      setCustomWindow(window !== 'Não definida' ? window : '')
      setIsCustom(true)
    }
  }

  function openEdit() {
    if (habit) initEditState(habit)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
  }

  function getWindowValue(): string {
    if (isCustom) return customWindow.trim() || 'Não definida'
    return selectedPreset
  }

  async function saveHabit() {
    if (!habit) return
    setSaving(true)
    setSaveError('')

    const windowValue = getWindowValue()
    const { error } = await supabase
      .from('habits')
      .update({
        name: editName.trim(),
        current_time: windowValue,
        preferred_time: windowValue,
      })
      .eq('id', habit.id)
      .eq('user_id', userId)

    if (!error) {
      setHabit({ ...habit, name: editName.trim(), current_time: windowValue })
      setEditing(false)
    } else {
      setSaveError(error.message || 'Erro ao salvar. Tente novamente.')
    }
    setSaving(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/')
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

  const hasHabit = !!habit
  const displayWindow = habit ? windowFromHabit(habit) : 'Não definida'

  return (
    <main className="min-h-screen flex flex-col bg-bg relative overflow-hidden">
      <div className="ambient-glow opacity-30" />

      {/* Header */}
      <header className="relative z-10 px-6 pt-6 pb-2">
        <div className="hairline mb-4" />
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow mb-0.5">Meu perfil</div>
            <h1 className="text-xl font-light text-ink">{displayName || '—'}</h1>
          </div>
          <button
            onClick={logout}
            className="text-muted hover:text-ink transition"
            aria-label="Configurações"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <div className="relative z-10 px-6 space-y-4 flex-1 overflow-y-auto no-scroll py-6 pb-24">

        {/* SISTEMA */}
        <div className="card p-5">
          <div className="eyebrow mb-4">Sistema</div>

          {hasHabit ? (
            <>
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] text-muted uppercase tracking-wider mb-1">Comportamento principal</div>
                  <div className="text-base text-ink">{habit!.name}</div>
                </div>
                <div className="hairline" />
                <div>
                  <div className="text-[11px] text-muted uppercase tracking-wider mb-1">Janela alvo</div>
                  <div className="text-base text-ink">{displayWindow}</div>
                </div>
              </div>
              <button
                onClick={openEdit}
                className="mt-5 w-full flex items-center justify-between text-sm text-muted hover:text-ink transition py-1 group"
              >
                <span>Editar comportamento</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-0.5 transition-transform">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] text-muted uppercase tracking-wider mb-1">Comportamento principal</div>
                  <div className="text-base text-subtle italic">Não definido</div>
                </div>
                <div className="hairline" />
                <div>
                  <div className="text-[11px] text-muted uppercase tracking-wider mb-1">Janela alvo</div>
                  <div className="text-base text-subtle italic">Não definida</div>
                </div>
              </div>
              <button
                onClick={openEdit}
                className="w-full bg-primary/15 text-primary border border-primary/40 text-sm font-medium py-2.5 rounded-lg hover:bg-primary/25 transition"
              >
                Configurar comportamento
              </button>
            </div>
          )}
        </div>

        {/* OBSERVAÇÃO */}
        <div className="card p-5">
          <div className="eyebrow mb-4">Observação</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Janela de calibração</span>
              <span className="text-sm text-ink">1 / 30 dias</span>
            </div>
            <div className="hairline" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Briefings diários</span>
              <span className="text-sm text-ink">{daysActive}</span>
            </div>
          </div>
        </div>

        {/* PREFERÊNCIAS */}
        <div className="card p-5">
          <div className="eyebrow mb-3">Preferências</div>
          <button className="w-full flex items-center justify-between py-2 text-left">
            <div className="flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-muted">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.5 0"
                  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <div className="text-sm text-ink">Notificações</div>
                <div className="text-xs text-muted">Gerenciar lembretes</div>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-muted">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <button
          onClick={logout}
          className="w-full text-sm text-muted py-3 hover:text-warn transition"
        >
          Sair da conta
        </button>
      </div>

      {/* Bottom sheet edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cancelEdit} />
          <div className="relative bg-[#0d1a19] border-t border-border rounded-t-3xl p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-light text-ink">Editar comportamento</h2>
              <button onClick={cancelEdit} className="text-muted hover:text-ink transition p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <Field label="Comportamento principal">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Ex: Treinar"
                className="w-full bg-surface/40 border border-border px-3 py-2.5 rounded-lg text-sm text-ink placeholder:text-subtle focus:outline-none focus:border-primary/50"
              />
            </Field>

            <Field label="Janela alvo">
              <div className="grid grid-cols-2 gap-2 mb-2">
                {WINDOW_PRESETS.map(preset => {
                  const isSelected =
                    preset.value === 'custom'
                      ? isCustom
                      : selectedPreset === preset.value && !isCustom
                  return (
                    <button
                      key={preset.value}
                      onClick={() => {
                        if (preset.value === 'custom') {
                          setIsCustom(true)
                          setSelectedPreset('custom')
                        } else {
                          setIsCustom(false)
                          setSelectedPreset(preset.value)
                        }
                      }}
                      className={`py-2 px-3 rounded-lg text-sm border transition ${
                        isSelected
                          ? 'bg-primary/20 border-primary/50 text-primary'
                          : 'bg-surface/30 border-border text-muted hover:text-ink'
                      }`}
                    >
                      {preset.value === 'custom' ? 'Personalizado' : `${preset.label} · ${preset.value}`}
                    </button>
                  )
                })}
              </div>
              {isCustom && (
                <input
                  value={customWindow}
                  onChange={e => setCustomWindow(e.target.value)}
                  placeholder="Ex: 18h - 20h"
                  className="w-full bg-surface/40 border border-border px-3 py-2.5 rounded-lg text-sm text-ink placeholder:text-subtle focus:outline-none focus:border-primary/50 mt-1"
                />
              )}
            </Field>

            {saveError && (
              <p className="text-xs text-error px-1">{saveError}</p>
            )}

            <button
              onClick={saveHabit}
              disabled={saving || !editName.trim()}
              className="w-full bg-primary text-bg font-medium py-3 rounded-xl hover:bg-primary/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] text-muted mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )
}

