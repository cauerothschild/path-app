'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import StatusHeader from '@/components/StatusHeader'
import BottomNav from '@/components/BottomNav'

interface Habit {
  id: string
  name: string
  preferred_time: 'morning' | 'afternoon' | 'evening'
  target_duration_min: number
  current_time: string
  current_anchor: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [habit, setHabit] = useState<Habit | null>(null)
  const [daysActive, setDaysActive] = useState(0)
  const [displayName, setDisplayName] = useState('')

  // Edit form
  const [editName, setEditName] = useState('')
  const [editTime, setEditTime] = useState('08:00')
  const [editDuration, setEditDuration] = useState(30)
  const [editAnchor, setEditAnchor] = useState('')

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
      setEditName(habits.name)
      setEditTime(habits.current_time || '08:00')
      setEditDuration(habits.target_duration_min || 30)
      setEditAnchor(habits.current_anchor || '')
    }
    setLoading(false)
  }

  async function saveHabit() {
    if (!habit) return
    const { error } = await supabase
      .from('habits')
      .update({
        name: editName,
        current_time: editTime,
        target_duration_min: editDuration,
        current_anchor: editAnchor,
      })
      .eq('id', habit.id)

    if (!error) {
      setHabit({
        ...habit,
        name: editName,
        current_time: editTime,
        target_duration_min: editDuration,
        current_anchor: editAnchor,
      })
      setEditing(false)
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/')
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

      <div className="px-6 mt-2 mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-light tracking-tight">Meu Perfil</h1>
        <button
          onClick={logout}
          className="text-muted hover:text-ink transition"
          aria-label="Configurações"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="px-6 space-y-4 flex-1 overflow-y-auto no-scroll pb-6">
        {/* Saudação */}
        <div className="bg-surface/30 border border-border rounded-2xl p-5">
          <div className="text-xs text-muted mb-1">Você é</div>
          <div className="text-lg text-ink">{displayName}</div>
        </div>

        {/* Hábito principal */}
        <div className="bg-surface/30 border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-muted mb-1">Hábito principal</div>
              <div className="text-lg text-ink">{habit?.name}</div>
              <div className="text-xs text-muted mt-1">
                Todos os dias · {habit?.target_duration_min} min
              </div>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="text-xs bg-primary/15 text-primary border border-primary/40 px-4 py-1.5 rounded-full hover:bg-primary/25 transition"
            >
              {editing ? 'Cancelar' : 'Editar'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-3 pt-3 border-t border-border">
              <Field label="Nome do hábito">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-surface/40 border border-border px-3 py-2 rounded-lg text-sm text-ink focus:outline-none focus:border-primary/50"
                />
              </Field>
              <Field label="Horário">
                <input
                  type="time"
                  value={editTime}
                  onChange={e => setEditTime(e.target.value)}
                  className="w-full bg-surface/40 border border-border px-3 py-2 rounded-lg text-sm text-ink focus:outline-none focus:border-primary/50"
                />
              </Field>
              <Field label="Meta (minutos)">
                <input
                  type="number"
                  value={editDuration}
                  onChange={e => setEditDuration(parseInt(e.target.value) || 30)}
                  className="w-full bg-surface/40 border border-border px-3 py-2 rounded-lg text-sm text-ink focus:outline-none focus:border-primary/50"
                />
              </Field>
              <Field label="Âncora">
                <input
                  value={editAnchor}
                  onChange={e => setEditAnchor(e.target.value)}
                  placeholder="Ex: depois do café"
                  className="w-full bg-surface/40 border border-border px-3 py-2 rounded-lg text-sm text-ink placeholder:text-subtle focus:outline-none focus:border-primary/50"
                />
              </Field>
              <button
                onClick={saveHabit}
                className="w-full bg-primary text-bg font-medium py-2.5 rounded-lg hover:bg-primary/90 transition"
              >
                Salvar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border text-sm">
              <InfoRow icon="clock" label="Horário atual" value={habit?.current_time || '08:00'} />
              <InfoRow icon="anchor" label="Âncora atual" value={habit?.current_anchor || '—'} />
              <InfoRow icon="target" label="Meta atual" value={`${habit?.target_duration_min} min`} />
            </div>
          )}
        </div>

        {/* Preferências */}
        <div className="bg-surface/30 border border-border rounded-2xl p-5">
          <div className="text-xs text-muted mb-3 uppercase tracking-wider">Preferências</div>
          <button className="w-full flex items-center justify-between py-2 text-left">
            <div className="flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-muted">
                <path
                  d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.5 0"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
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

        {/* Sair */}
        <button
          onClick={logout}
          className="w-full text-sm text-muted py-3 hover:text-warn transition"
        >
          Sair da conta
        </button>
      </div>

      <BottomNav />
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] text-muted mb-1 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: 'clock' | 'anchor' | 'target'
  label: string
  value: string
}) {
  const path =
    icon === 'clock'
      ? 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'
      : icon === 'anchor'
      ? 'M12 4v16M5 12a7 7 0 0 0 14 0M9 4h6'
      : 'M12 2v4M12 18v4M2 12h4M18 12h4M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0'

  return (
    <div className="flex items-center gap-2">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-muted shrink-0">
        <path d={path} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-muted uppercase tracking-wider">{label}</div>
        <div className="text-sm text-ink truncate">{value}</div>
      </div>
    </div>
  )
}
