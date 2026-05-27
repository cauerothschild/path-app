'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Logo from '@/components/Logo'

export default function Home() {
  const [phase, setPhase] = useState<'splash' | 'auth'>('splash')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Auto-redireciona se já estiver logado
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('onboarding_done')
          .eq('id', data.user.id)
          .single()
        router.replace(profile?.onboarding_done ? '/dashboard' : '/onboarding')
      } else {
        setChecking(false)
      }
    })
  }, [])

  // Avança splash → auth após 1.6s
  useEffect(() => {
    if (checking) return
    const t = setTimeout(() => setPhase('auth'), 1600)
    return () => clearTimeout(t)
  }, [checking])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    })
    setLoading(false)
    if (error) {
  console.error(error)
  alert(error.message)
} else {
  setSent(true)
}
  }

  if (checking || phase === 'splash') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
        {/* Onda decorativa atrás */}
        <svg
          className="absolute bottom-0 left-0 right-0 opacity-25"
          viewBox="0 0 400 200"
          preserveAspectRatio="none"
          height="200"
          width="100%"
        >
          <path
            d="M0,120 Q100,80 200,110 T400,90 L400,200 L0,200 Z"
            fill="url(#wave)"
          />
          <path
            d="M0,140 Q100,100 200,130 T400,120 L400,200 L0,200 Z"
            fill="url(#wave2)"
          />
          <defs>
            <linearGradient id="wave" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#a4dcb5" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#a4dcb5" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="wave2" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#035147" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#035147" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        <div className="fade-in text-primary mb-4">
          <Logo size={72} />
        </div>
        <div className="fade-in text-2xl font-light tracking-[0.4em] text-ink">
          PATH
        </div>
        <div className="absolute bottom-12 text-xs text-muted tracking-widest">
          Learning your patterns.
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col px-6 py-12">
      <div className="flex items-center gap-3 mb-16">
        <div className="text-primary"><Logo size={32} /></div>
        <span className="text-xl font-light tracking-[0.3em] text-ink">PATH</span>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <h1 className="text-3xl font-light leading-tight mb-3">Entrar</h1>
        <p className="text-sm text-muted mb-8 leading-relaxed">
          Você não falha aleatoriamente. Você falha sempre nas mesmas condições — esse padrão existe.
        </p>

        {!sent ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-surface/40 border border-border px-4 py-3.5 rounded-xl text-ink placeholder:text-subtle focus:outline-none focus:border-primary/50 transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-bg font-medium py-3.5 rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Continuar'}
            </button>
          </form>
        ) : (
          <div className="bg-surface/40 border border-primary/30 rounded-xl p-5">
            <p className="text-sm text-ink mb-1">Link enviado.</p>
            <p className="text-xs text-muted">
              Verifique seu email para continuar.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
