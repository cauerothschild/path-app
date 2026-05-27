/**
 * PATH — Briefing Matinal + Insights
 * Regras condicionais sobre o histórico. Tom diagnóstico, nunca motivacional.
 */

import type { TimeBucket } from './grit'

export interface BriefingInput {
  history: Array<{
    date: string
    executed: boolean
    difficulty: 1 | 2 | 3
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
