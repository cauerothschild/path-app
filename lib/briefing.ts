/**
 * PATH — Briefing Matinal + Insights
 * Regras condicionais sobre o histórico. Tom diagnóstico, nunca motivacional.
 */

import type { TimeBucket } from './grit'

export interface BriefingInput {
  history: Array<{
    date: string
    executed: boolean
    difficulty: 1 | 2 | 3 | 4
    timeBucket: TimeBucket
    failureReason: string | null
  }>
  targetHabit: string
  preferredTime: TimeBucket
  gritScore: number
  daysActive: number
  displayName: string | null
}

export interface Briefing {
  contextEnergy: 'Alta' | 'Média' | 'Baixa'
  riskLevel: 'Baixo' | 'Médio' | 'Alto'
  criticalTime: string
  analysisHeadline: string
  analysisDetail: string
  suggestion: string
}

const DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export function generateBriefing(input: BriefingInput): Briefing {
  const { history, targetHabit, preferredTime, gritScore, daysActive } = input

  // ----- Caso onboarding inicial -----
  if (daysActive <= 1 || history.length === 0) {
    return {
      contextEnergy: 'Média',
      riskLevel: 'Médio',
      criticalTime: 'Aprendendo',
      analysisHeadline: 'Hoje o app começa a aprender você.',
      analysisDetail: 'A próxima semana já mostra o primeiro padrão.',
      suggestion: `Faça o check-in de ${targetHabit} quando o dia terminar.`,
    }
  }

  // ----- Cálculos de padrões -----
  const tail = history.slice(-3)
  const lastTwoFailed =
    tail.length >= 2 && !tail[tail.length - 1].executed && !tail[tail.length - 2].executed

  const todayDay = new Date().getDay()
  const sameDayHistory = history.filter(h => new Date(h.date).getDay() === todayDay)
  const sameDayFailRate =
    sameDayHistory.length > 0
      ? sameDayHistory.filter(h => !h.executed).length / sameDayHistory.length
      : 0

  const streak = computeStreak(history)
  const yesterday = history[history.length - 1]

  // ----- Risco -----
  let riskLevel: Briefing['riskLevel'] = 'Baixo'
  if (lastTwoFailed || sameDayFailRate > 0.6) riskLevel = 'Alto'
  else if (sameDayFailRate > 0.4 || (yesterday && yesterday.difficulty === 3)) riskLevel = 'Médio'

  // ----- Energia prevista (heurística) -----
  let contextEnergy: Briefing['contextEnergy'] = 'Média'
  if (gritScore >= 70 && streak >= 3) contextEnergy = 'Alta'
  if (riskLevel === 'Alto' || (yesterday && yesterday.difficulty === 3 && !yesterday.executed))
    contextEnergy = 'Baixa'

  // ----- Horário crítico -----
  const criticalTime =
    preferredTime === 'morning'
      ? 'Antes das 10h'
      : preferredTime === 'afternoon'
      ? 'Entre 14h e 17h'
      : 'Após 20h'

  // ----- Headline e suggestion (regras priorizadas) -----
  let analysisHeadline = ''
  let analysisDetail = ''
  let suggestion = ''

  if (lastTwoFailed) {
    analysisHeadline = 'Risco alto hoje.'
    analysisDetail = `Você falhou dois dias seguidos. Nos padrões anteriores, o terceiro dia é onde o hábito tipicamente se desfaz.`
    suggestion = `Comece com uma versão reduzida de ${targetHabit} — basta começar.`
  } else if (sameDayHistory.length >= 3 && sameDayFailRate > 0.6) {
    const dayName = DAY_NAMES[todayDay]
    analysisHeadline = `Você falha ${Math.round(sameDayFailRate * 100)}% das vezes nas ${dayName}s após dias intensos.`
    analysisDetail = `O padrão se repete há ${sameDayHistory.length} semanas.`
    suggestion = `Antecipe seu hábito para antes das ${
      preferredTime === 'evening' ? '18h' : '10h'
    } ou reduza a meta para 20 min.`
  } else if (preferredTime === 'evening' && yesterday && yesterday.difficulty === 3) {
    analysisHeadline = 'Seu padrão noturno é frágil em dias difíceis.'
    analysisDetail = 'Ontem foi difícil. À noite, sua consistência cai.'
    suggestion = `Considere mover ${targetHabit} para a manhã hoje.`
  } else if (streak >= 5) {
    analysisHeadline = 'Janela de consolidação em progresso.'
    analysisDetail = `Sequência de ${streak} dias. Você está em zona de automatização neural.`
    suggestion = 'Manter hoje pesa mais do que manter ontem.'
  } else {
    analysisHeadline = gritStatusLine(gritScore)
    analysisDetail = `Hábito alvo: ${targetHabit}.`
    suggestion = 'Faça o check-in quando concluir, ou marque a razão se não der.'
  }

  return {
    contextEnergy,
    riskLevel,
    criticalTime,
    analysisHeadline,
    analysisDetail,
    suggestion,
  }
}

// ============================================
// Mensagem curta para o Home (debaixo do nome)
// ============================================
export function homeStatusLine(input: BriefingInput): string {
  const { history } = input
  if (history.length < 5) return 'Aprendendo seu padrão.'

  // Procura o dia da semana com maior taxa de falha
  const byDay = new Array(7).fill(null).map(() => ({ total: 0, fail: 0 }))
  history.forEach(h => {
    const d = new Date(h.date).getDay()
    byDay[d].total++
    if (!h.executed) byDay[d].fail++
  })

  let worstDay = -1
  let worstRate = 0
  byDay.forEach((b, i) => {
    if (b.total >= 2) {
      const rate = b.fail / b.total
      if (rate > worstRate) {
        worstRate = rate
        worstDay = i
      }
    }
  })

  if (worstDay >= 0 && worstRate > 0.4) {
    return `Seu padrão costuma cair nas ${DAY_NAMES[worstDay]}s.`
  }

  return 'Seu padrão está se estabilizando.'
}

// ============================================
// Diagnóstico Mensal (3 descobertas)
// ============================================
export interface Discovery {
  headline: string
  data: string
  implication: string
}

export function generateMonthlyDiagnostic(input: BriefingInput): Discovery[] {
  const { history } = input
  if (history.length < 10) {
    return [
      {
        headline: 'O diagnóstico mensal estará disponível em breve.',
        data: `${history.length} de 30 dias necessários para o primeiro relatório.`,
        implication: 'Continue registrando para desbloquear seus padrões.',
      },
    ]
  }

  const discoveries: Discovery[] = []

  // ----- Descoberta 1: pior dia da semana -----
  const byDay = new Array(7).fill(null).map(() => ({ total: 0, fail: 0 }))
  history.forEach(h => {
    const d = new Date(h.date).getDay()
    byDay[d].total++
    if (!h.executed) byDay[d].fail++
  })

  let worstDay = -1
  let worstRate = 0
  byDay.forEach((b, i) => {
    if (b.total >= 2) {
      const rate = b.fail / b.total
      if (rate > worstRate) {
        worstRate = rate
        worstDay = i
      }
    }
  })

  if (worstDay >= 0) {
    discoveries.push({
      headline: `Seu principal padrão de falha é cansaço acumulado no fim de semana.`,
      data: `Você falhou em ${Math.round(worstRate * 100)}% das ${DAY_NAMES[worstDay]}s.`,
      implication: `Considere reduzir a meta de ${DAY_NAMES[worstDay]} para metade da padrão.`,
    })
  }

  // ----- Descoberta 2: razão dominante de falha -----
  const reasons: Record<string, number> = {}
  history.forEach(h => {
    if (h.failureReason) reasons[h.failureReason] = (reasons[h.failureReason] || 0) + 1
  })

  const reasonLabels: Record<string, string> = {
    tired: 'cansaço',
    forgot: 'esquecimento',
    chaotic: 'dia caótico',
    unwilling: 'falta de vontade',
  }

  const dominantReason = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0]
  if (dominantReason) {
    const totalFails = Object.values(reasons).reduce((a, b) => a + b, 0)
    const pct = Math.round((dominantReason[1] / totalFails) * 100)
    discoveries.push({
      headline: `Sua razão dominante de falha é ${reasonLabels[dominantReason[0]] ?? dominantReason[0]}.`,
      data: `${pct}% das suas falhas vêm dessa causa.`,
      implication: 'Saber a razão é o primeiro passo para desativá-la.',
    })
  }

  // ----- Descoberta 3: manhã vs noite -----
  const byTime = { morning: { t: 0, f: 0 }, afternoon: { t: 0, f: 0 }, evening: { t: 0, f: 0 } }
  history.forEach(h => {
    byTime[h.timeBucket].t++
    if (h.executed) byTime[h.timeBucket].f++
  })
  const morningRate = byTime.morning.t > 0 ? byTime.morning.f / byTime.morning.t : 0
  const eveningRate = byTime.evening.t > 0 ? byTime.evening.f / byTime.evening.t : 0

  if (morningRate > eveningRate && morningRate > 0.5) {
    discoveries.push({
      headline: 'Você mantém hábitos pela manhã com consistência muito maior.',
      data: `${Math.round(morningRate * 100)}% pela manhã contra ${Math.round(eveningRate * 100)}% à noite.`,
      implication: 'Ancorar o hábito pela manhã pode triplicar sua consistência.',
    })
  }

  return discoveries.slice(0, 3)
}

function computeStreak(history: BriefingInput['history']): number {
  let s = 0
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].executed) s++
    else break
  }
  return s
}

function gritStatusLine(grit: number): string {
  if (grit >= 70) return 'Você está em zona de alta consistência.'
  if (grit >= 40) return 'Consistência média. Hoje conta mais do que parece.'
  return 'Sua base ainda está se formando.'
}

// ============================================================
// buildBriefingMsg — Regras 1-41 (Bloco 1, genéricas)
// ============================================================

export interface DashCheckIn {
  date: string
  executed: boolean
  difficulty: 1 | 2 | 3 | 4
  failure_reason: string | null
  check_in_time: string
  execution_time: string | null
}

export interface BriefingMsg {
  obs: string
  interp: string
  acao: string
}

function bm(obs: string, interp: string, acao: string): BriefingMsg {
  return { obs, interp, acao }
}

// ── helpers ─────────────────────────────────────────────────

function curStreak(h: DashCheckIn[]): number {
  let s = 0
  for (let i = h.length - 1; i >= 0; i--) { if (h[i].executed) s++; else break }
  return s
}

function topStreak(h: DashCheckIn[]): number {
  let best = 0, cur = 0
  for (const r of h) { if (r.executed) { cur++; if (cur > best) best = cur } else cur = 0 }
  return best
}

function failStreak(h: DashCheckIn[]): number {
  let s = 0
  for (let i = h.length - 1; i >= 0; i--) { if (!h[i].executed) s++; else break }
  return s
}

function daysSinceLast(h: DashCheckIn[]): number {
  const last = [...h].reverse().find(r => r.executed)
  if (!last) return 999
  const [y, m, d] = last.date.split('-').map(Number)
  const ref = new Date(y, m - 1, d)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.round((now.getTime() - ref.getTime()) / 86400000)
}

function successRate(h: DashCheckIn[]): number {
  return h.length ? h.filter(r => r.executed).length / h.length : 0
}

function isImproving(h: DashCheckIn[]): boolean {
  if (h.length < 10) return false
  const prev = h.slice(-14, -7), last = h.slice(-7)
  return successRate(last) > successRate(prev) + 0.15
}

function isDeclining(h: DashCheckIn[]): boolean {
  if (h.length < 10) return false
  const prev = h.slice(-14, -7), last = h.slice(-7)
  return successRate(last) < successRate(prev) - 0.15
}

function bucketOf(isoStr: string): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date(isoStr).getHours()
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

function bestPeriod(h: DashCheckIn[]): 'morning' | 'afternoon' | 'evening' | null {
  const s: Record<string, { ok: number; t: number }> = {
    morning: { ok: 0, t: 0 }, afternoon: { ok: 0, t: 0 }, evening: { ok: 0, t: 0 },
  }
  for (const r of h) {
    const ref = r.execution_time || r.check_in_time
    if (!ref) continue
    const b = bucketOf(ref)
    s[b].t++
    if (r.executed) s[b].ok++
  }
  const valid = Object.entries(s).filter(([, v]) => v.t >= 3)
  if (valid.length < 2) return null
  const [key, val] = valid.sort(([, a], [, b]) => b.ok / b.t - a.ok / a.t)[0]
  return val.ok / val.t >= 0.65 ? (key as 'morning' | 'afternoon' | 'evening') : null
}

function timeConsistency(h: DashCheckIn[]): 'high' | 'low' | null {
  const executed = h.filter(r => r.executed && (r.execution_time || r.check_in_time))
  if (executed.length < 5) return null
  const hours = executed.map(r => new Date(r.execution_time || r.check_in_time!).getHours())
  const mean = hours.reduce((a, b) => a + b, 0) / hours.length
  const std = Math.sqrt(hours.reduce((s, v) => s + (v - mean) ** 2, 0) / hours.length)
  if (std < 2) return 'high'
  if (std > 3.5) return 'low'
  return null
}

function delayedPattern(h: DashCheckIn[]): boolean {
  if (h.length < 6) return false
  const late = h.filter(r => { const ref = r.execution_time || r.check_in_time; return ref && new Date(ref).getHours() >= 17 })
  const early = h.filter(r => { const ref = r.execution_time || r.check_in_time; return ref && new Date(ref).getHours() < 17 })
  if (late.length < 3 || early.length < 3) return false
  return (late.filter(r => !r.executed).length / late.length) > (early.filter(r => !r.executed).length / early.length) + 0.3
}

function before8Rate(h: DashCheckIn[]): number {
  const sub = h.filter(r => { const ref = r.execution_time || r.check_in_time; return ref && new Date(ref).getHours() < 8 })
  return sub.length >= 3 ? sub.filter(r => r.executed).length / sub.length : 0
}

function afterWorkRate(h: DashCheckIn[]): number {
  const sub = h.filter(r => { const ref = r.execution_time || r.check_in_time; return ref && new Date(ref).getHours() >= 17 })
  return sub.length >= 3 ? sub.filter(r => r.executed).length / sub.length : 0
}

function diffAvg7d(h: DashCheckIn[]): 'high' | 'low' | null {
  const ex = h.slice(-7).filter(r => r.executed)
  if (ex.length < 3) return null
  const avg = ex.reduce((s, r) => s + r.difficulty, 0) / ex.length
  if (avg >= 3) return 'high'
  if (avg <= 1.5) return 'low'
  return null
}

function lastReason(h: DashCheckIn[]): string {
  return [...h].reverse().find(r => !r.executed && r.failure_reason)?.failure_reason?.toLowerCase() ?? ''
}

function repeatedReason(h: DashCheckIn[]): string {
  const counts: Record<string, number> = {}
  h.slice(-7).filter(r => !r.executed && r.failure_reason).forEach(r => {
    const k = r.failure_reason!.toLowerCase()
    counts[k] = (counts[k] || 0) + 1
  })
  const top = Object.entries(counts).filter(([, c]) => c >= 2).sort(([, a], [, b]) => b - a)[0]
  return top ? top[0] : ''
}

function dayRate(h: DashCheckIn[], dow: number): number {
  const sub = h.filter(r => { const [y, m, d] = r.date.split('-').map(Number); return new Date(y, m - 1, d).getDay() === dow })
  return sub.length >= 2 ? sub.filter(r => r.executed).length / sub.length : -1
}

// reason matchers
const IS_TEMPO   = (s: string) => s.includes('tempo')
const IS_ESQUECI = (s: string) => s.includes('esque')
const IS_ENERGIA = (s: string) => s.includes('energia') || s.includes('cansa') || s.includes('motiva')
const IS_QUIS    = (s: string) => s.includes('quis') || s.includes('vontade')
const IS_ROTINA  = (s: string) => s.includes('rotina')
const IS_CAOS    = (s: string) => s.includes('caóti') || s.includes('imprevisto')
const IS_NASEI   = (s: string) => s.includes('sei')
const IS_AMBIENT = (s: string) => s.includes('distrac') || s.includes('ambient') || s.includes('caóti')

// ── Habit matchers ──────────────────────────────────────────
const IS_TREINAR  = (n: string) => /trein/i.test(n)
const IS_LER      = (n: string) => /\bler\b|leitur/i.test(n)
const IS_MEDITAR  = (n: string) => /medita/i.test(n)
const IS_ESTUDAR  = (n: string) => /estud/i.test(n)
const IS_ALONG    = (n: string) => /along/i.test(n)
const IS_IDIOMA   = (n: string) => /idioma|ingl|espanh|franc|portug|alem|japon/i.test(n)
const IS_DEEP     = (n: string) => /deep.?work|foco.?profund|trabalho.?profund/i.test(n)
const IS_PLANEJAR = (n: string) => /plane|planej/i.test(n)
const IS_ORGANIZ  = (n: string) => /organi/i.test(n)

interface HabitCtx {
  streak: number
  bp: 'morning' | 'afternoon' | 'evening' | null
  lr: string
  rr: string
  da7: 'high' | 'low' | null
  f7: number
  s7: number
  tc: 'high' | 'low' | null
  today: number
}

// ── Block 2: habit-specific rules 51–100 ────────────────────

function treinarBlock(h: DashCheckIn[], c: HabitCtx): BriefingMsg | null {
  const isWeekend = c.today === 0 || c.today === 6

  // rule 54: last reason = sem_energia
  if (IS_ENERGIA(c.lr)) return bm(
    'Energia atrapalhou seu último treino.',
    'Em dias assim, o erro é exigir intensidade alta logo de início.',
    'Comece pelo aquecimento e decida o restante depois.'
  )
  // rule 55: last reason = sem_tempo
  if (IS_TEMPO(c.lr)) return bm(
    'Tempo foi o obstáculo do último treino.',
    'Um treino curto mantém a identidade ativa melhor do que cancelar.',
    'Defina uma versão mínima de 10 a 15 minutos.'
  )
  // rule 57: difficulty high
  if (c.da7 === 'high') return bm(
    'Treinar tem parecido pesado nos últimos dias.',
    'Forçar intensidade pode quebrar a sequência.',
    'Hoje faça um treino mais leve se sentir que tem grande chance de não realizar.'
  )
  // rule 60: fail rate > 0.5
  if (c.f7 > 0.5) return bm(
    'Sua meta de treino pode estar alta para sua rotina atual.',
    'Metas grandes aumentam resistência em semanas instáveis.',
    'Experimente reduzir a duração para o hábito se encaixar melhor na sua rotina. Algumas vezes realizar uma versão menor mas com uma frequência maior na semana facilita a execução.'
  )
  // rule 56: delayed pattern
  if (delayedPattern(h)) return bm(
    'Quando o treino é adiado, sua chance de falhar aumenta.',
    'Treino adiado vira negociação mental.',
    'Comece antes do horário em que normalmente você empurra para depois.'
  )
  // rule 59: weekend
  if (isWeekend) return bm(
    'Treinar no fim de semana costuma depender menos da rotina automática.',
    'Sem horário definido, o treino tende a escorregar.',
    'Escolha agora o horário exato do treino de hoje.'
  )
  // rule 52: best_time morning
  if (c.bp === 'morning') return bm(
    'Você costuma treinar melhor pela manhã.',
    'Nesse período, o dia ainda tem menos interferências.',
    'Tente iniciar antes das primeiras demandas importantes.'
  )
  // rule 53: best_time evening
  if (c.bp === 'evening') return bm(
    'Seu treino funciona melhor no período da noite.',
    'Esse hábito parece encaixar como fechamento do dia.',
    'Reserve este horário e evite preencher esse espaço com outra tarefa.'
  )
  // rule 51: baseline
  return bm(
    'Treinar exige preparação antes da motivação aparecer.',
    'Roupa, tênis e local prontos reduzem a chance de desistência.',
    'Deixe tudo visível antes do horário planejado.'
  )
}

function lerBlock(h: DashCheckIn[], c: HabitCtx): BriefingMsg | null {
  // rule 64: last reason = sem_tempo
  if (IS_TEMPO(c.lr)) return bm(
    'Tempo atrapalhou sua última leitura.',
    'Ler poucas páginas ainda mantém contato com o hábito.',
    'Hoje defina uma meta pequena, como 2 páginas ou 5 minutos.'
  )
  // rule 65: last reason = esqueci
  if (IS_ESQUECI(c.lr)) return bm(
    'Você esqueceu de ler recentemente.',
    'A leitura provavelmente não está visível no seu ambiente.',
    'Coloque o livro no local onde você já passa todos os dias.'
  )
  // rule 66: difficulty high
  if (c.da7 === 'high') return bm(
    'A leitura tem parecido mais difícil nos últimos registros.',
    'Pode haver atrito no hábito, no horário ou no ambiente.',
    'Hoje experimente facilitar a execução, escolha um local mais fácil de começar, deixe o livro ou o Kindle visível, e leia quando se sentir disposto e estar disponível.'
  )
  // rule 69: fail rate > 0.5
  if (c.f7 > 0.5) return bm(
    'Sua meta de páginas pode estar alta para o momento atual.',
    'Metas grandes aumentam a chance de não começar, quando a rotina está muito puxada.',
    'Hoje experimente ler uma versão menor e mais possível de realizar na sua rotina atual.'
  )
  // rule 67: success rate >= 0.8
  if (c.s7 >= 0.8) return bm(
    'Sua leitura está consistente.',
    'Isso indica que o formato atual está funcionando.',
    'Repita o mesmo horário e mantenha a meta simples.'
  )
  // rule 68: delayed pattern
  if (delayedPattern(h)) return bm(
    'Quando você deixa a leitura para muito tarde, ela costuma falhar.',
    'Cansaço e distrações vencem com mais facilidade no fim do dia.',
    'Antecipe alguns minutos de leitura.'
  )
  // rule 62: best_time morning
  if (c.bp === 'morning') return bm(
    'Você lê melhor pela manhã.',
    'Esse período pode oferecer mais clareza antes do excesso de estímulos.',
    'Leia algumas páginas antes de abrir redes ou mensagens.'
  )
  // rule 63: best_time evening
  if (c.bp === 'evening') return bm(
    'Sua leitura costuma acontecer melhor à noite.',
    'Esse horário pode funcionar como transição para desacelerar.',
    'Separe um bloco curto antes que o cansaço domine.'
  )
  // rule 61: baseline
  return bm(
    'Leitura acontece mais quando o livro está acessível.',
    'Se o livro não aparece, o hábito precisa competir com distrações mais visíveis.',
    'Deixe sua leitura em um lugar impossível de ignorar.'
  )
}

function meditarBlock(h: DashCheckIn[], c: HabitCtx): BriefingMsg | null {
  // rule 75: last reason = nao_quis
  if (IS_QUIS(c.lr)) return bm(
    'A vontade não apareceu na última tentativa.',
    'Meditação costuma ter resistência antes do início.',
    'Comprometa-se apenas com sentar e respirar por um minuto, e aos poucos você vai aumentando a prática.'
  )
  // rule 74: last reason = sem_tempo
  if (IS_TEMPO(c.lr)) return bm(
    'O tempo atrapalhou sua última meditação.',
    'Meditação curta ainda mantém o treino de atenção ativo.',
    'Hoje faça uma versão possível para sua rotina, se o dia estiver apertado.'
  )
  // rule 76: repeated reason = esqueci
  if (c.rr && IS_ESQUECI(c.rr)) return bm(
    'Você tem esquecido de meditar.',
    'Ligar em algo existente na sua rotina facilita a execução.',
    'Escolha um gatilho fixo, como depois de escovar os dentes ou tomar café, experimente ancorar em um comportamento que já está fixo na sua rotina.'
  )
  // rule 77: difficulty high
  if (c.da7 === 'high') return bm(
    'Meditar tem parecido difícil recentemente.',
    'Talvez a sessão esteja longa ou o ambiente esteja cheio de distrações.',
    'Reduza a duração e escolha um local mais silencioso.'
  )
  // rule 79: fail rate > 0.5
  if (c.f7 > 0.5) return bm(
    'Sua meta de meditação pode estar grande demais para a rotina atual.',
    'Sessões longas são boas, mas sessões que são mais possíveis e realistas para sua rotina, funcionam melhor.',
    'Experimente realizar uma versão mais curta.'
  )
  // rule 80: streak >= 7
  if (c.streak >= 7) return bm(
    'Você já meditou de forma consistente por vários dias.',
    'A repetição está criando familiaridade com a prática.',
    'Mantenha a duração estável antes de tentar aumentar.'
  )
  // rule 72: best_time morning
  if (c.bp === 'morning') return bm(
    'Sua meditação funciona melhor pela manhã.',
    'Antes do dia acelerar, há menos ruído para competir com a prática.',
    'Medite antes de entrar nas primeiras demandas.'
  )
  // rule 73: best_time evening
  if (c.bp === 'evening') return bm(
    'Você costuma meditar melhor à noite.',
    'Esse horário pode funcionar como fechamento mental do dia.',
    'Separe alguns minutos antes de iniciar outra atividade passiva.'
  )
  // rule 71: baseline
  return bm(
    'Meditar exige menos condição perfeita do que parece.',
    'A prática geralmente cria o estado mental, não o contrário.',
    'Hoje sente por poucos minutos e comece simples.'
  )
}

function estudarBlock(h: DashCheckIn[], c: HabitCtx): BriefingMsg | null {
  // rule 85: last reason = sem_tempo
  if (IS_TEMPO(c.lr)) return bm(
    'Tempo atrapalhou seu último estudo.',
    'Sessões menores ainda mantêm progresso e reduzem culpa.',
    'Hoje escolha uma tarefa de estudo que funcione na sua rotina, experimente diminuir o tempo do hábito, para ser melhor de executar.'
  )
  // rule 86: last reason = ambiente/distrações
  if (IS_AMBIENT(c.lr)) return bm(
    'O ambiente atrapalhou sua última sessão.',
    'Estudo exige menos distrações do que outras tarefas.',
    'Prepare mesa e material antes. Realize quando estiver mais disposto e quando sua atenção estiver preservada.'
  )
  // rule 88: difficulty high
  if (c.da7 === 'high') return bm(
    'Estudar tem exigido muito esforço recentemente.',
    'Talvez o primeiro passo esteja grande ou pouco claro.',
    'Transforme a sessão de hoje em uma tarefa específica e pequena. Tente realizar pequenos blocos de estudos com uma duração menor, para ser menos cansativo.'
  )
  // rule 89: fail rate > 0.5
  if (c.f7 > 0.5) return bm(
    'Sua meta de estudo pode estar pesada para a semana atual.',
    'Metas longas aumentam resistência quando a rotina está instável.',
    'Hoje faça um bloco menor, com começo e fim claros.'
  )
  // rule 87: delayed pattern
  if (delayedPattern(h)) return bm(
    'Quando você adia o estudo, a chance de falhar aumenta.',
    'Estudo exige energia de decisão, e essa energia costuma cair ao longo do dia.',
    'Tente começar antes e quando estiver disposto.'
  )
  // rule 82: best_time morning
  if (c.bp === 'morning') return bm(
    'Você estuda melhor pela manhã.',
    'Esse horário pode ter mais energia mental e menos acúmulo de tarefas.',
    'Comece pelo conteúdo mais importante cedo.'
  )
  // rule 83: best_time afternoon
  if (c.bp === 'afternoon') return bm(
    'Sua execução de estudo funciona melhor à tarde.',
    'Esse período parece equilibrar energia e disponibilidade.',
    'Bloqueie um espaço objetivo para estudar hoje.'
  )
  // rule 84: best_time evening
  if (c.bp === 'evening') return bm(
    'Você costuma estudar melhor à noite.',
    'Esse horário pode funcionar quando as demandas externas diminuem.',
    'Prepare o material antes para não depender de energia no fim do dia.'
  )
  // rule 81: baseline
  return bm(
    'Estudar fica mais fácil quando o objetivo é específico.',
    'Ambiguidade costuma virar procrastinação.',
    'Defina exatamente o conteúdo que será estudado hoje.'
  )
}

function alongarBlock(h: DashCheckIn[], c: HabitCtx): BriefingMsg | null {
  const isWeekend = c.today === 0 || c.today === 6

  // rule 94: last reason = sem_tempo
  if (IS_TEMPO(c.lr)) return bm(
    'Tempo atrapalhou seu último alongamento.',
    'Alongamento é um hábito que sobrevive bem em versões curtas.',
    'Hoje faça apenas uma sequência mínima.'
  )
  // rule 95: last reason = esqueci
  if (IS_ESQUECI(c.lr)) return bm(
    'Você esqueceu de alongar recentemente.',
    'O hábito precisa de uma pista visual ou corporal.',
    'Associe o alongamento a levantar da cadeira, banho ou troca de roupa.'
  )
  // rule 96: difficulty high
  if (c.da7 === 'high') return bm(
    'Alongar tem parecido mais difícil do que deveria.',
    'A sequência pode estar longa ou sem encaixe claro.',
    'Hoje escolha apenas 2 movimentos.'
  )
  // rule 99: fail rate > 0.5
  if (c.f7 > 0.5) return bm(
    'Sua meta de alongamento pode estar longa para a rotina atual.',
    'Alongamentos curtos e frequentes tendem a ser mais sustentáveis.',
    'Hoje reduza a duração e mantenha o hábito vivo.'
  )
  // rule 100: streak >= 7
  if (c.streak >= 7) return bm(
    'Você vem alongando com consistência.',
    'A frequência está ajudando o comportamento a ficar mais automático.',
    'Mantenha o mesmo horário antes de aumentar a sequência.'
  )
  // rule 98: weekend
  if (isWeekend) return bm(
    'Finais de semana podem quebrar seus gatilhos normais de alongamento.',
    'Sem rotina fixa, o hábito precisa de horário escolhido.',
    'Defina agora um momento simples para alongar.'
  )
  // rule 92: best_time morning
  if (c.bp === 'morning') return bm(
    'Você alonga melhor pela manhã.',
    'Esse horário pode ajudar a encaixar o movimento antes da correria.',
    'Faça uma sequência curta logo no começo do dia.'
  )
  // rule 93: best_time evening
  if (c.bp === 'evening') return bm(
    'Seu alongamento costuma funcionar melhor à noite.',
    'Esse momento pode servir como transição depois das demandas do dia.',
    'Reserve alguns minutos antes de entrar em modo descanso.'
  )
  // rule 91: baseline
  return bm(
    'Alongar funciona melhor quando exige poucas decisões.',
    'Quanto mais simples o início, maior a chance de execução.',
    'Escolha agora onde e quando fará o alongamento.'
  )
}

function idiomaBlock(h: DashCheckIn[], c: HabitCtx): BriefingMsg | null {
  // rule 105: last reason = sem_tempo
  if (IS_TEMPO(c.lr)) return bm(
    'Tempo atrapalhou sua última prática.',
    'Idioma permite versões muito pequenas sem perder continuidade.',
    'Hoje faça uma revisão de 3 a 5 minutos.'
  )
  // rule 106: last reason = esqueci
  if (IS_ESQUECI(c.lr)) return bm(
    'Você esqueceu de praticar recentemente.',
    'O idioma precisa aparecer no seu ambiente antes das distrações.',
    'Coloque o aplicativo, caderno ou lembrete na tela inicial.'
  )
  // rule 107: difficulty high
  if (c.da7 === 'high') return bm(
    'Praticar idioma tem parecido difícil nos últimos registros.',
    'A atividade pode estar exigindo mais esforço do que o necessário para manter frequência.',
    'Hoje faça revisão leve em vez de conteúdo novo.'
  )
  // rule 109: fail rate > 0.5
  if (c.f7 > 0.5) return bm(
    'Sua meta de idioma pode estar longa demais para a rotina atual.',
    'Sessões longas aumentam resistência quando a semana está instável.',
    'Hoje faça uma prática curta e mantenha o contato. Tente realizar blocos menores e aumente a frequência, ao invés de sessões longas.'
  )
  // rule 110: streak >= 7
  if (c.streak >= 7) return bm(
    'Você manteve contato com o idioma por vários dias.',
    'Essa frequência ajuda a memória a reconhecer padrões com mais facilidade.',
    'Continue praticando no mesmo formato que funcionou.'
  )
  // rule 102: best_time morning
  if (c.bp === 'morning') return bm(
    'Você pratica melhor pela manhã.',
    'Esse horário pode facilitar retenção antes do excesso de estímulos do dia.',
    'Faça a primeira prática antes de abrir outras distrações.'
  )
  // rule 103: best_time afternoon
  if (c.bp === 'afternoon') return bm(
    'Sua prática de idioma funciona melhor à tarde.',
    'Esse período parece encaixar bem na sua energia e disponibilidade.',
    'Reserve um bloco curto para revisar ou praticar.'
  )
  // rule 104: best_time evening
  if (c.bp === 'evening') return bm(
    'Você costuma praticar idioma melhor à noite.',
    'Esse horário pode funcionar como prática leve depois das obrigações.',
    'Deixe o app ou material pronto antes do fim do dia.'
  )
  // rule 101: baseline
  return bm(
    'Aprender idioma depende muito de contato frequente.',
    'Poucos minutos repetidos costumam valer mais do que sessões raras e longas.',
    'Hoje mantenha contato com o idioma, mesmo que seja por pouco tempo.'
  )
}

function deepWorkBlock(h: DashCheckIn[], c: HabitCtx): BriefingMsg | null {
  // rule 115: last reason = ambiente/distrações
  if (IS_AMBIENT(c.lr)) return bm(
    'O ambiente atrapalhou sua última sessão profunda.',
    'Foco profundo não resiste bem a interrupções previsíveis.',
    'Remova notificações, abas e distrações antes de começar.'
  )
  // rule 116: last reason = sem_tempo
  if (IS_TEMPO(c.lr)) return bm(
    'Tempo atrapalhou sua última tentativa de foco.',
    'Mesmo um bloco curto pode gerar progresso se tiver prioridade clara.',
    'Hoje faça uma sessão menor, mas sem interrupção.'
  )
  // rule 118: difficulty high
  if (c.da7 === 'high') return bm(
    'Focar profundamente tem exigido muito esforço.',
    'Pode haver excesso de escopo ou distrações demais.',
    'Reduza a sessão a uma tarefa única e claramente finalizável.'
  )
  // rule 119: fail rate > 0.5
  if (c.f7 > 0.5) return bm(
    'Sua meta de Deep Work pode estar longa para sua rotina atual.',
    'Blocos grandes são frágeis quando o dia tem muitas interrupções.',
    'Hoje faça um bloco menor e protegido.'
  )
  // rule 117: delayed pattern
  if (delayedPattern(h)) return bm(
    'Quando você adia o Deep Work, ele costuma ser engolido por tarefas menores.',
    'Trabalho profundo precisa ser protegido antes do caos operacional.',
    'Execute antes de abrir tarefas reativas.'
  )
  // rule 112: best_time morning
  if (c.bp === 'morning') return bm(
    'Seu foco profundo funciona melhor pela manhã.',
    'Esse período pode ter menos ruído e mais energia cognitiva.',
    'Proteja sua primeira janela de atenção para a tarefa principal.'
  )
  // rule 113: best_time afternoon
  if (c.bp === 'afternoon') return bm(
    'Você entra melhor em foco profundo durante a tarde.',
    'Esse horário parece combinar melhor com seu ritmo produtivo.',
    'Bloqueie uma janela sem interrupções nesse período.'
  )
  // rule 114: best_time evening
  if (c.bp === 'evening') return bm(
    'Seu Deep Work costuma funcionar melhor à noite.',
    'O ambiente provavelmente fica mais silencioso nesse período.',
    'Defina início, fim e tarefa antes do horário chegar.'
  )
  // rule 111: baseline
  return bm(
    'Deep Work depende de clareza antes de foco.',
    'Sem uma tarefa específica, a atenção se dispersa rápido.',
    'Escolha uma única prioridade para a sessão de hoje.'
  )
}

function planejamentoBlock(_h: DashCheckIn[], c: HabitCtx): BriefingMsg | null {
  // rule 124: last reason = sem_tempo
  if (IS_TEMPO(c.lr)) return bm(
    'Tempo atrapalhou seu último planejamento.',
    'Um planejamento curto ainda reduz incerteza.',
    'Hoje defina apenas prioridade, horário e primeiro passo.'
  )
  // rule 125: last reason = nao_quis
  if (IS_QUIS(c.lr)) return bm(
    'Você não quis planejar recentemente.',
    'Isso pode acontecer quando o planejamento parece burocrático demais.',
    'Hoje faça uma versão de 2 minutos, sem tentar organizar tudo.'
  )
  // rule 126: difficulty high
  if (c.da7 === 'high') return bm(
    'Planejar tem parecido pesado.',
    'Talvez você esteja tentando prever demais em vez de decidir o essencial.',
    'Escolha só o que precisa acontecer hoje.'
  )
  // rule 129: fail rate > 0.5
  if (c.f7 > 0.5) return bm(
    'Seu planejamento pode estar longo demais para a rotina atual.',
    'Planejar demais pode virar mais uma tarefa difícil de iniciar.',
    'Hoje faça uma versão curta e objetiva.'
  )
  // rule 130: success rate >= 0.8
  if (c.s7 >= 0.8) return bm(
    'Seu planejamento está acontecendo com boa frequência.',
    'Isso pode estar deixando seus dias mais previsíveis.',
    'Mantenha o formato simples que já está funcionando.'
  )
  // rule 128: monday
  if (c.today === 1) return bm(
    'Segunda-feira aumenta o número de decisões da semana.',
    'Sem planejamento, o dia tende a começar reativo.',
    'Defina uma prioridade principal antes de começar outras tarefas.'
  )
  // rule 122: best_time morning
  if (c.bp === 'morning') return bm(
    'Você planeja melhor pela manhã.',
    'Planejar cedo reduz decisões improvisadas ao longo do dia.',
    'Defina prioridades antes de entrar em execução.'
  )
  // rule 123: best_time evening
  if (c.bp === 'evening') return bm(
    'Seu planejamento funciona melhor à noite.',
    'Planejar antes pode reduzir atrito no dia seguinte.',
    'Use hoje para deixar a próxima execução mais clara.'
  )
  // rule 121: baseline
  return bm(
    'Planejar funciona melhor quando transforma incerteza em decisão.',
    'Listas grandes sem prioridade podem aumentar confusão.',
    'Escolha as 3 prioridades mais importantes do dia.'
  )
}

function organizacaoBlock(_h: DashCheckIn[], c: HabitCtx): BriefingMsg | null {
  const isWeekend = c.today === 0 || c.today === 6

  // rule 134: last reason = sem_tempo
  if (IS_TEMPO(c.lr)) return bm(
    'Tempo atrapalhou sua última organização.',
    'Organização não precisa ser uma faxina completa.',
    'Hoje faça uma melhoria de 5 minutos.'
  )
  // rule 135: last reason = ambiente/distrações
  if (IS_AMBIENT(c.lr)) return bm(
    'O próprio ambiente dificultou sua organização.',
    'Quando o espaço está caótico, o primeiro passo precisa ser muito pequeno.',
    'Escolha apenas um ponto visível para começar.'
  )
  // rule 136: difficulty high
  if (c.da7 === 'high') return bm(
    'Organizar tem parecido mais difícil recentemente.',
    'A área escolhida pode estar grande demais.',
    'Reduza o alvo para uma gaveta, mesa, pasta ou canto.'
  )
  // rule 139: fail rate > 0.5
  if (c.f7 > 0.5) return bm(
    'Sua meta de organização parece ampla para sua rotina atual.',
    'Metas grandes dificultam começar.',
    'Hoje escolha apenas uma parte do ambiente.'
  )
  // rule 140: streak >= 7
  if (c.streak >= 7) return bm(
    'Você vem organizando com consistência.',
    'Pequenas melhorias repetidas tornam o ambiente mais fácil de manter.',
    'Continue com áreas pequenas para preservar a frequência.'
  )
  // rule 138: weekend
  if (isWeekend) return bm(
    'Finais de semana podem facilitar organização, mas também aumentam dispersão.',
    'Sem limite claro, organizar pode parecer grande demais.',
    'Defina uma área pequena e pare quando ela estiver melhor.'
  )
  // rule 132: best_time morning
  if (c.bp === 'morning') return bm(
    'Você organiza melhor pela manhã.',
    'Começar o dia com ambiente mais funcional pode reduzir atrito depois.',
    'Organize uma pequena área antes das principais tarefas.'
  )
  // rule 133: best_time evening
  if (c.bp === 'evening') return bm(
    'Sua organização costuma funcionar melhor à noite.',
    'Esse horário pode preparar o ambiente para o dia seguinte.',
    'Escolha uma área pequena para deixar pronta antes de encerrar o dia.'
  )
  // rule 131: baseline
  return bm(
    'Organização funciona melhor quando o alvo é pequeno.',
    'Tentar organizar tudo aumenta resistência e reduz início.',
    'Escolha uma área específica para melhorar hoje.'
  )
}

const BP_LABEL: Record<string, string> = {
  morning: 'manhã', afternoon: 'tarde', evening: 'noite',
}

function personalizadoBlock(_h: DashCheckIn[], c: HabitCtx): BriefingMsg {
  // rule 147: repeated reason = sem_tempo
  if (c.rr && IS_TEMPO(c.rr)) return bm(
    'Seu hábito personalizado tem falhado por falta de tempo.',
    'A versão atual pode estar grande demais para a rotina real.',
    'Crie uma versão mínima que leve menos de 5 minutos.'
  )
  // rule 149: fail rate > 0.6
  if (c.f7 > 0.6) return bm(
    'Seu hábito personalizado teve mais falhas do que sucessos recentemente.',
    'O desenho atual do hábito precisa ser ajustado, não apenas insistido.',
    'Hoje reduza escopo, escolha um horário melhor e registre o resultado.'
  )
  // rule 146: best time detected
  if (c.bp) return bm(
    'O PATH identificou um horário em que seu hábito personalizado funciona melhor.',
    'Esse período parece reduzir atrito para você.',
    `Tente executar hoje dentro da janela da ${BP_LABEL[c.bp]}.`
  )
  // rule 150: no specific pattern (fallback for custom)
  return bm(
    'Ainda não existe um padrão claro para este hábito personalizado.',
    'O próximo check-in vai ajudar o PATH a entender quando e como você funciona melhor.',
    'Execute hoje de forma simples e registre horário, dificuldade e principal influência.'
  )
}

function habitBlock(name: string, h: DashCheckIn[], c: HabitCtx): BriefingMsg | null {
  if (!name) return null
  if (IS_TREINAR(name))  return treinarBlock(h, c)
  if (IS_LER(name))      return lerBlock(h, c)
  if (IS_MEDITAR(name))  return meditarBlock(h, c)
  if (IS_ESTUDAR(name))  return estudarBlock(h, c)
  if (IS_ALONG(name))    return alongarBlock(h, c)
  if (IS_IDIOMA(name))   return idiomaBlock(h, c)
  if (IS_DEEP(name))     return deepWorkBlock(h, c)
  if (IS_PLANEJAR(name)) return planejamentoBlock(h, c)
  if (IS_ORGANIZ(name))  return organizacaoBlock(h, c)
  return personalizadoBlock(h, c)
}

// ── Main ────────────────────────────────────────────────────

export function buildBriefingMsg(
  history: DashCheckIn[],
  daysActive: number,
  habitName = ''
): BriefingMsg {
  const streak  = curStreak(history)
  const best    = topStreak(history)
  const fStreak = failStreak(history)
  const dSince  = daysSinceLast(history)
  const s7      = successRate(history.slice(-7))
  const f7      = 1 - s7
  const lr      = lastReason(history)
  const rr      = repeatedReason(history)
  const bp      = bestPeriod(history)
  const tc      = timeConsistency(history)
  const da7     = diffAvg7d(history)
  const avgRate = successRate(history)
  const today   = new Date().getDay() // 0=Dom … 6=Sáb

  // ── Rule 1: early user (< 3 days) ─────────────────────────
  if (daysActive < 3) return bm(
    'Você ainda está no começo deste hábito.',
    'Nesta fase, o mais importante não é desempenho. É criar uma primeira referência de execução.',
    'Hoje escolha um horário que você se sente disposto e faça uma versão possível desse hábito, evite fazer metas muito altas que você não consiga cumprir.'
  )

  // ── Rule 2: few check-ins ──────────────────────────────────
  if (history.length < 3) return bm(
    'Ainda existem poucos registros sobre este comportamento.',
    'O PATH precisa observar seus padrões antes de sugerir ajustes mais precisos.',
    'Hoje execute e registre o check-in para começar a construir seu histórico.'
  )

  // ── Rule 17: 7+ days without execution ────────────────────
  if (dSince >= 7) return bm(
    'Este hábito ficou parado por uma semana ou mais.',
    'O retorno exige menos cobrança e mais simplicidade.',
    'Execute apenas uma versão que seja possível executar e registre o check-in.'
  )

  // ── Rule 16: 3+ days without execution ────────────────────
  if (dSince >= 3) return bm(
    'Faz alguns dias desde sua última execução.',
    'Retomar costuma ser mais importante do que compensar o atraso.',
    'Hoje faça uma versão pequena o suficiente para ser quase impossível recusar.'
  )

  // ── Rule 19: failure streak >= 4 ──────────────────────────
  if (fStreak >= 4) return bm(
    'A sequência recente mostra um risco de abandono.',
    'Quando o hábito começa a escapar, a melhor resposta é simplificar.',
    'Faça a menor versão possível e reconstrua a partir dela.'
  )

  // ── Rule 18: failure streak >= 2 ──────────────────────────
  if (fStreak >= 2) return bm(
    'As últimas tentativas não viraram execução.',
    'Repetir a mesma estratégia provavelmente vai gerar o mesmo resultado.',
    'Hoje reduza a dificuldade ou mude o horário.'
  )

  // ── Rule 20: fail rate 7d > 60% ───────────────────────────
  if (f7 > 0.6) return bm(
    'Nos últimos 7 dias, houve mais falhas do que execuções.',
    'A versão atual do hábito pode estar pesada para sua rotina real.',
    'Hoje diminua o tempo, intensidade ou complexidade. Experimente reduzir o hábito, para uma versão mais possível e que se encaixe na sua rotina.'
  )

  // ── Rule 15: new personal record ──────────────────────────
  if (streak >= 3 && streak >= best && best > 0) return bm(
    'Esta é sua maior sequência registrada.',
    'Seu sistema atual está produzindo resultado.',
    'Não mude demais agora. Repita o que já está funcionando.'
  )

  // ── Rules 14 / 13 / 12 / 11: streak milestones ────────────
  if (streak >= 21) return bm(
    'Este comportamento está ficando mais previsível na sua rotina.',
    'Quanto mais previsível, menor precisa ser o esforço mental para executar.',
    'Hoje mantenha o padrão sem tentar aumentar a dificuldade.'
  )
  if (streak >= 14) return bm(
    'Você já passou de duas semanas mantendo este comportamento.',
    'O risco agora é relaxar a preparação porque o hábito parece mais fácil.',
    'Continue preparando o contexto antes da execução.'
  )
  if (streak >= 7) return bm(
    'Você completou uma semana de consistência.',
    'Uma sequência assim normalmente nasce de rotina, não de motivação isolada.',
    'Proteja hoje o mesmo horário, ambiente ou gatilho que ajudou até aqui.'
  )
  if (streak >= 3) return bm(
    'Você manteve este comportamento por alguns dias seguidos.',
    'A repetição recente mostra que existe um sistema funcionando.',
    'Hoje tente repetir o mesmo contexto dos últimos sucessos.'
  )

  // ── Habit-specific block (rules 51–150) ───────────────────
  const habitMsg = habitBlock(habitName, history, { streak, bp, lr, rr, da7, f7: f7, s7, tc, today })
  if (habitMsg) return habitMsg

  // ── Repeated reason rules (28 / 30 / 31 / 32 / 33 / 35) ──
  if (rr && IS_TEMPO(rr)) return bm(
    'Falta de tempo apareceu mais de uma vez.',
    'O hábito provavelmente está competindo com blocos ocupados do seu dia.',
    'Antecipe a execução ou reduza a duração.'
  )
  if (rr && IS_ESQUECI(rr)) return bm(
    'Esquecimento virou um padrão recente.',
    'O hábito ainda não está ligado a uma pista clara da rotina.',
    'Associe a execução a algo que você já faz todos os dias.'
  )
  if (rr && IS_ENERGIA(rr)) return bm(
    'Baixa energia apareceu várias vezes nos seus registros.',
    'A versão atual pode estar exigindo mais do que sua rotina consegue entregar.',
    'Troque intensidade por consistência hoje, experimente fazer uma versão reduzida e aos poucos aumente a frequência que você realiza durante a semana.'
  )
  if (rr && IS_QUIS(rr)) return bm(
    'A falta de vontade apareceu mais de uma vez.',
    'Isso pode indicar que o hábito está grande demais ou pouco conectado ao seu dia.',
    'Hoje faça uma versão menor e mais fácil de iniciar.'
  )
  if (rr && IS_ROTINA(rr)) return bm(
    'Quebra de rotina apareceu como obstáculo recorrente.',
    'Seu hábito precisa de um plano alternativo para dias fora do padrão.',
    'Crie uma versão para dias que fogem da rotina.'
  )
  if (rr && IS_CAOS(rr)) return bm(
    'Imprevistos apareceram mais de uma vez.',
    'Seu plano precisa de flexibilidade para sobreviver ao dia real.',
    'Crie uma versão curta para executar mesmo fora do horário ideal.'
  )

  // ── Single last-reason rules (27 / 29 / 34 / 36) ──────────
  if (IS_TEMPO(lr)) return bm(
    'Na última falha, o tempo foi o principal obstáculo.',
    'Quando tempo é o problema, a solução não é força de vontade. É versão mínima.',
    'Defina hoje a menor execução aceitável.'
  )
  if (IS_ESQUECI(lr)) return bm(
    'A última falha aconteceu por esquecimento.',
    'Esquecer normalmente indica falta de gatilho visível.',
    'Crie um lembrete físico ou digital antes que o dia acelere.'
  )
  if (IS_CAOS(lr)) return bm(
    'Um imprevisto interrompeu sua última tentativa.',
    'Imprevistos não são falha de disciplina. São parte da rotina real.',
    'Defina uma segunda opção de horário.'
  )
  if (IS_NASEI(lr)) return bm(
    'Você não identificou claramente o que atrapalhou.',
    'Quando o obstáculo não está claro, observar já é progresso.',
    'Hoje perceba o primeiro momento em que o hábito começa a escapar.'
  )

  // ── Rule 21: success rate 7d >= 80% ───────────────────────
  if (s7 >= 0.8) return bm(
    'Sua taxa de execução recente está alta.',
    'Isso indica que o sistema atual está bem calibrado.',
    'Hoje não complique. Apenas repita o padrão.'
  )

  // ── Rule 23 / 22: improving / declining ───────────────────
  if (isDeclining(history)) return bm(
    'Sua frequência começou a cair recentemente.',
    'Esse é um sinal inicial de atrito acumulado.',
    'Hoje simplifique antes que a rotina quebre mais.'
  )
  if (isImproving(history)) return bm(
    'Sua consistência vem melhorando nos últimos registros.',
    'Pequenos ajustes parecem estar funcionando.',
    'Observe o que facilitou os últimos sucessos e repita hoje.'
  )

  // ── Rule 25: difficulty avg high ──────────────────────────
  if (da7 === 'high') return bm(
    'Os últimos registros mostram esforço alto.',
    'Quando o esforço fica alto por muitos dias, a chance de abandono aumenta.',
    'Hoje faça uma versão mais leve para preservar a continuidade.'
  )

  // ── Rule 24: last executed but difficult ──────────────────
  const lastCI = history[history.length - 1]
  if (lastCI?.executed && lastCI.difficulty >= 3) return bm(
    'Você executou mesmo quando foi difícil.',
    'Esse tipo de repetição fortalece o sistema, porque não depende de um dia perfeito.',
    'Hoje reduza a barreira de entrada e realize o hábito.'
  )

  // ── Rule 26: difficulty avg low ───────────────────────────
  if (da7 === 'low') return bm(
    'Este comportamento tem parecido mais fácil recentemente.',
    'Isso sugere que sua rotina está se adaptando.',
    'Continue executando no mesmo contexto antes de aumentar a meta.'
  )

  // ── Rules 37 / 38: Monday / Friday pattern ────────────────
  if (today === 1) {
    const mr = dayRate(history, 1)
    if (mr >= 0 && mr < avgRate - 0.1) return bm(
      'Segundas-feiras costumam ser mais frágeis para este hábito.',
      'O início da semana aumenta decisões e muda o ritmo.',
      'Execute em um horário que se sinta mais disposto e tente organizar antes do seu primeiro compromisso.'
    )
  }
  if (today === 5) {
    const fr = dayRate(history, 5)
    if (fr >= 0 && fr < avgRate - 0.1) return bm(
      'Sextas-feiras tendem a mudar seu ritmo.',
      'Quando o dia foge do padrão, o hábito precisa ser protegido antes.',
      'Faça a execução antes de entrar no modo fim de semana, se for muito difícil experimente fazer uma versão reduzida.'
    )
  }

  // ── Rules 3–5: best period (morning / afternoon / evening) ─
  if (daysActive >= 7 && bp) {
    if (bp === 'morning') return bm(
      'Seu histórico mostra melhor execução pela manhã.',
      'Esse período parece ter menos atrito para este comportamento.',
      'Se possível, execute antes das primeiras demandas do dia.'
    )
    if (bp === 'afternoon') return bm(
      'Você costuma executar melhor durante a tarde.',
      'Esse período parece encaixar melhor no seu ritmo.',
      'Tente reservar esse espaço no seu dia, antes que outras tarefas ocupem o horário.'
    )
    if (bp === 'evening') return bm(
      'Seus melhores resultados aparecem no período da noite.',
      'Esse horário pode funcionar melhor por estar depois das principais obrigações.',
      'Planeje a execução agora para facilitar o hábito.'
    )
  }

  // ── Rule 9: success before 8 am ───────────────────────────
  if (before8Rate(history) >= 0.6) return bm(
    'Uma parte forte dos seus sucessos aconteceu antes das 8h.',
    'Esse horário parece proteger o hábito antes da rotina ficar pesada.',
    'Se for possível, faça a execução logo no começo do dia.'
  )

  // ── Rule 10: success after work ───────────────────────────
  if (afterWorkRate(history) >= 0.6) return bm(
    'Você costuma executar melhor depois das principais responsabilidades.',
    'Esse hábito pode funcionar como fechamento do dia.',
    'Deixe o momento pós-trabalho reservado para essa execução.'
  )

  // ── Rule 6 / 7: time consistency ──────────────────────────
  if (tc === 'high') return bm(
    'Você costuma executar este comportamento em horários parecidos.',
    'A repetição de contexto reduz a necessidade de decidir.',
    'Tente manter hoje o mesmo horário dos seus últimos sucessos.'
  )
  if (tc === 'low') return bm(
    'Seus horários de execução ainda variam bastante.',
    'Horários instáveis podem aumentar esquecimento e adiamento.',
    'Escolha um horário fixo para testar hoje.'
  )

  // ── Rule 8: delayed execution pattern ─────────────────────
  if (delayedPattern(history)) return bm(
    'Você costuma ter mais falhas quando adia este comportamento.',
    'Quanto mais tarde a decisão fica, mais obstáculos aparecem.',
    'Hoje tente começar antes do horário em que normalmente começa a adiar.'
  )

  // ── Rule 41: no specific pattern (fallback) ───────────────
  return bm(
    'Ainda não existe um padrão forte o bastante neste hábito.',
    'Hoje é uma oportunidade de gerar um dado útil.',
    'Execute, registre e observe o que facilitou ou atrapalhou.'
  )
}
