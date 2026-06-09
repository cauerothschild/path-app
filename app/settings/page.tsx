'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import WavePath from '@/components/WavePath'

interface UserSettings {
  share_location: boolean
  collect_open_time: boolean
  notifications_enabled: boolean
  quiet_start: string
  quiet_end: string
  quiet_mode: boolean
}

const DEFAULTS: UserSettings = {
  share_location: false,
  collect_open_time: true,
  notifications_enabled: false,
  quiet_start: '21:00',
  quiet_end: '08:00',
  quiet_mode: true,
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-surface/90 backdrop-blur-sm px-5 py-2.5 rounded-full text-[13px] text-ink border border-border shadow-lg animate-fade-up whitespace-nowrap">
      {message}
    </div>
  )
}

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${value ? 'bg-primary' : 'bg-white/10'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <span
        style={{ transform: value ? 'translateX(20px)' : 'translateX(4px)' }}
        className="absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
      />
    </button>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <div className="eyebrow px-1 mb-2 mt-1">{title}</div>
}

function ToggleRow({ label, sub, value, onChange, disabled }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 gap-4">
      <div className="min-w-0">
        <div className="text-[14px] text-ink">{label}</div>
        {sub && <div className="text-[12px] text-muted mt-0.5 leading-snug">{sub}</div>}
      </div>
      <Toggle value={value} onChange={onChange} disabled={disabled} />
    </div>
  )
}

function ActionRow({ label, sub, onClick, danger, loading }: { label: string; sub?: string; onClick: () => void; danger?: boolean; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-between px-5 py-4 gap-4 text-left active:bg-white/5 transition-colors disabled:opacity-50"
    >
      <div className="min-w-0">
        <div className={`text-[14px] ${danger ? 'text-error' : 'text-ink'}`}>{loading ? 'Aguarde…' : label}</div>
        {sub && <div className="text-[12px] text-muted mt-0.5 leading-snug">{sub}</div>}
      </div>
      {!loading && <span className="text-muted text-[16px]">›</span>}
    </button>
  )
}

function Divider() {
  return <div className="hairline mx-5" />
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [settings, setSettings] = useState<UserSettings>(DEFAULTS)
  const [toast, setToast] = useState('')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [showPwForm, setShowPwForm] = useState(false)
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  const toast$ = useCallback((msg: string) => setToast(msg), [])

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/'); return }
    setUserEmail(user.email ?? '')
    setUserId(user.id)

    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) {
      setSettings({
        share_location:        data.share_location        ?? DEFAULTS.share_location,
        collect_open_time:     data.collect_open_time     ?? DEFAULTS.collect_open_time,
        notifications_enabled: data.notifications_enabled ?? DEFAULTS.notifications_enabled,
        quiet_start:           data.quiet_start           ?? DEFAULTS.quiet_start,
        quiet_end:             data.quiet_end             ?? DEFAULTS.quiet_end,
        quiet_mode:            data.quiet_mode            ?? DEFAULTS.quiet_mode,
      })
    }
    setLoading(false)
  }

  async function save<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    const next = { ...settings, [key]: value }
    setSettings(next)
    await supabase.from('user_settings').upsert(
      { user_id: userId, ...next, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    toast$('Salvo')
  }

  async function exportCSV() {
    setExporting(true)
    const { data: habits } = await supabase.from('habits').select('id').eq('user_id', userId).eq('active', true).limit(1).maybeSingle()
    if (!habits) { setExporting(false); toast$('Nenhum dado para exportar'); return }

    const { data: rows } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .eq('habit_id', habits.id)
      .order('date', { ascending: true })

    if (!rows?.length) { setExporting(false); toast$('Nenhum dado para exportar'); return }

    const headers = ['Data', 'Executado', 'Dificuldade', 'Motivo de falha', 'Contexto', 'Grit Score', 'Check-in time', 'Execution time']
    const csvRows = rows.map(r =>
      [r.date, r.executed ? 'Sim' : 'Não', r.difficulty ?? '', r.failure_reason ?? '', r.energy_level ?? '', r.grit_score ?? '', r.check_in_time ?? '', r.execution_time ?? '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
    const csv = '\ufeff' + [headers.join(','), ...csvRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `path-historico-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setExporting(false)
    toast$('Exportado com sucesso')
  }

  async function deleteHistory() {
    setDeleting(true)
    await supabase.from('check_ins').delete().eq('user_id', userId)
    await supabase.from('context_questions').delete().eq('user_id', userId)
    await supabase.from('users').update({ deleted_history: true }).eq('id', userId)
    setDeleting(false)
    setShowDeleteModal(false)
    toast$('Histórico deletado')
  }

  async function changePassword() {
    setPwError('')
    if (pwNew !== pwConfirm) { setPwError('As senhas não coincidem.'); return }
    if (pwNew.length < 6) { setPwError('Mínimo de 6 caracteres.'); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pwNew })
    setPwSaving(false)
    if (error) { setPwError(error.message); return }
    setPwNew(''); setPwConfirm(''); setShowPwForm(false)
    toast$('Senha atualizada')
  }

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted">
        <div className="w-32 text-primary/70"><WavePath variant="loader" /></div>
        <div className="eyebrow text-subtle">Loading patterns...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col pb-24 bg-bg relative overflow-hidden">
      <div className="ambient-glow opacity-30" />

      {toast && <Toast message={toast} onDone={() => setToast('')} />}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-md rounded-t-2xl p-6 space-y-5 animate-fade-up border-t border-border">
            <div className="space-y-2">
              <h3 className="text-[17px] font-medium text-ink">Deletar histórico</h3>
              <p className="text-[13px] text-muted leading-relaxed">
                Esta ação é <span className="text-error font-medium">irreversível</span>. Todos os seus check-ins, respostas de contexto e pontuações Grit serão permanentemente removidos.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-ghost py-3 text-sm rounded-xl">
                Cancelar
              </button>
              <button
                onClick={deleteHistory}
                disabled={deleting}
                className="py-3 rounded-xl text-sm font-medium bg-error/15 text-error border border-error/30 disabled:opacity-50 active:bg-error/25 transition-colors"
              >
                {deleting ? 'Deletando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 px-5 pt-5 pb-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-border text-muted hover:text-ink transition-colors"
        >
          ←
        </button>
        <div className="eyebrow">Configurações</div>
      </header>

      <div className="relative z-10 px-5 space-y-5">

        {/* ── PRIVACIDADE & DADOS ── */}
        <div>
          <SectionHeader title="Privacidade & Dados" />
          <div className="card divide-y divide-border/30">
            <ToggleRow
              label="Compartilhar dados de localização"
              value={settings.share_location}
              onChange={v => save('share_location', v)}
            />
            <ToggleRow
              label="Coletar horário de abertura do app"
              value={settings.collect_open_time}
              onChange={v => save('collect_open_time', v)}
            />
            <ActionRow
              label="Exportar meu histórico"
              sub="Gera CSV com check-ins, timestamps e Grit"
              onClick={exportCSV}
              loading={exporting}
            />
            <ActionRow
              label="Deletar meu histórico"
              sub="Remove todos os registros permanentemente"
              onClick={() => setShowDeleteModal(true)}
              danger
            />
            <ActionRow
              label="Política de privacidade"
              onClick={() => router.push('/privacy')}
            />
          </div>
        </div>

        {/* ── NOTIFICAÇÕES ── */}
        <div>
          <SectionHeader title="Notificações" />
          <div className="card divide-y divide-border/30">
            <ToggleRow
              label="Ativar notificações"
              value={settings.notifications_enabled}
              onChange={v => save('notifications_enabled', v)}
            />
            {settings.notifications_enabled && (
              <>
                <ToggleRow
                  label="Silencioso fora do horário"
                  sub="Desativa notificações durante horário de quietude"
                  value={settings.quiet_mode}
                  onChange={v => save('quiet_mode', v)}
                />
                {settings.quiet_mode && (
                  <div className="px-5 py-4 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] text-muted uppercase tracking-wider mb-2">Início quietude</div>
                      <input
                        type="time"
                        value={settings.quiet_start}
                        onChange={e => save('quiet_start', e.target.value)}
                        className="w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div>
                      <div className="text-[11px] text-muted uppercase tracking-wider mb-2">Fim quietude</div>
                      <input
                        type="time"
                        value={settings.quiet_end}
                        onChange={e => save('quiet_end', e.target.value)}
                        className="w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>
                )}
                <div className="px-5 py-3">
                  <p className="text-[12px] text-muted leading-relaxed">
                    Você receberá no máximo 1 notificação por dia. Apenas alertas de risco, nunca lembretes.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── CONTA ── */}
        <div>
          <SectionHeader title="Conta" />
          <div className="card divide-y divide-border/30">

            {/* Email */}
            <div className="px-5 py-4">
              <div className="text-[11px] text-muted uppercase tracking-wider mb-1">Email</div>
              <div className="text-[14px] text-ink">{userEmail}</div>
            </div>

            {/* Mudar senha */}
            <ActionRow
              label="Mudar senha"
              onClick={() => { setShowPwForm(v => !v); setPwError('') }}
            />
            {showPwForm && (
              <div className="px-5 pb-5 pt-1 space-y-3">
                <input
                  type="password"
                  placeholder="Nova senha"
                  value={pwNew}
                  onChange={e => setPwNew(e.target.value)}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-ink text-sm placeholder:text-muted focus:outline-none focus:border-primary/50"
                />
                <input
                  type="password"
                  placeholder="Confirmar nova senha"
                  value={pwConfirm}
                  onChange={e => setPwConfirm(e.target.value)}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-ink text-sm placeholder:text-muted focus:outline-none focus:border-primary/50"
                />
                {pwError && <p className="text-[12px] text-error">{pwError}</p>}
                <button
                  onClick={changePassword}
                  disabled={pwSaving}
                  className="w-full btn btn-primary py-3 text-sm disabled:opacity-50"
                >
                  {pwSaving ? 'Salvando…' : 'Confirmar'}
                </button>
              </div>
            )}

            {/* 2FA */}
            <ToggleRow
              label="Autenticação em dois fatores"
              sub="Em breve"
              value={false}
              onChange={() => toast$('Em breve')}
              disabled
            />

            {/* Logout */}
            <ActionRow label="Sair da conta" onClick={logout} danger />

          </div>
        </div>

      </div>

      <BottomNav />
    </main>
  )
}
