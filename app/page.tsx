'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'
import GritRing from '@/components/GritRing'

export default function Home() {
  const [phase, setPhase] = useState<'splash' | 'auth'>('splash')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgot, setIsForgot] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    })
    if (resetError) {
      setError(resetError.message)
    } else {
      setForgotSent(true)
    }
    setLoading(false)
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      })
      if (signUpError) {
        setError(signUpError.message)
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) {
          setError(loginError.message)
        } else {
          router.replace('/onboarding')
        }
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signInError.message)
      } else {
        const { data: user } = await supabase.auth.getUser()
        const { data: profile } = await supabase
          .from('users')
          .select('onboarding_done')
          .eq('id', user.user?.id)
          .single()
        router.replace(profile?.onboarding_done ? '/dashboard' : '/onboarding')
      }
    }
    setLoading(false)
  }

  if (checking || phase === 'splash') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-black">
        {/* Grit Ring completo como splash art */}
        <GritRing
          score={100}
          size={180}
          label=""
          hideScore
          hideHalo
          className="relative inline-block animate-fade-in"
        />

        {/* Tagline com fade ainda mais lento */}
        <div
          className="absolute bottom-12 eyebrow text-subtle animate-fade-in"
          style={{ animationDuration: '2s', animationDelay: '0.6s' }}
        >
          Learning your patterns
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col px-7 py-14 relative overflow-hidden">
      <div className="ambient-glow opacity-60" />

      <div className="relative z-10 flex justify-center mb-14">
        <div className="relative" style={{ width: 72, height: 28 }}>
          <Image src="/logo-text.png" alt="Path" fill className="object-contain mix-blend-screen" priority />
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-sm w-full mx-auto animate-fade-up">
        <div className="eyebrow mb-5">{isForgot ? 'Recuperar senha' : isSignUp ? 'Criar conta' : 'Entrar'}</div>
        <h1 className="headline-lg mb-6">Você não falha aleatoriamente.</h1>
        <p className="body mb-10 text-muted">
          Você falha sempre nas mesmas condições. Esse padrão existe — e é o que vamos observar juntos.
        </p>

        {isForgot ? (
          forgotSent ? (
            <div className="space-y-6">
              <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-4">
                <p className="text-sm text-primary leading-relaxed">
                  Link enviado para <strong>{email}</strong>. Verifique sua caixa de entrada.
                </p>
              </div>
              <button
                onClick={() => { setIsForgot(false); setForgotSent(false); setError('') }}
                className="text-sm text-muted hover:text-ink2 transition"
              >
                ← Voltar para o login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-muted mb-2">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="input"
              />

              {error && (
                <div className="bg-warn/10 border border-warn/40 rounded-xl px-4 py-3">
                  <p className="text-sm text-warn">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full mt-2"
              >
                {loading ? 'Enviando…' : 'Enviar link'}
                {!loading && <span aria-hidden>→</span>}
              </button>

              <button
                type="button"
                onClick={() => { setIsForgot(false); setError('') }}
                disabled={loading}
                className="mt-2 text-sm text-muted hover:text-ink2 transition w-full text-center"
              >
                ← Voltar para o login
              </button>
            </form>
          )
        ) : (
          <>
            <form onSubmit={handleAuth} className="space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="input"
              />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="senha"
                className="input"
              />

              {!isSignUp && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => { setIsForgot(true); setError('') }}
                    className="text-xs text-muted hover:text-ink2 transition"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              {error && (
                <div className="bg-warn/10 border border-warn/40 rounded-xl px-4 py-3">
                  <p className="text-sm text-warn">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full mt-2"
              >
                {loading ? 'Loading patterns...' : isSignUp ? 'Criar conta' : 'Entrar'}
                {!loading && <span aria-hidden>→</span>}
              </button>
            </form>

            <button
              onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              disabled={loading}
              className="mt-6 text-sm text-muted hover:text-ink2 transition"
            >
              {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Criar'}
            </button>
          </>
        )}
      </div>
    </main>
  )
}
