/**
 * PATH — Fórmula do Grit
 *
 * Grit do dia = E × (D × H) × (1 + log(1+S)/4)
 *
 *   E — execução (1 ou 0)
 *   D — dificuldade declarada (1 fácil, 2 médio, 3 difícil)
 *   H — peso do horário (manhã 1.0, tarde 1.1, noite 1.3)
 *   S — sequência sem falha antes desse dia
 *
 * Grit acumulado = média móvel ponderada de 14 dias, normalizada 0–100
 */

export type TimeBucket = 'morning' | 'afternoon' | 'evening'

export interface DayInput {
  executed: boolean
  difficulty: 1 | 2 | 3
  timeBucket: TimeBucket
  streakBefore: number
}

const HOUR_WEIGHT: Record<TimeBucket, number> = {
  morning: 1.0,
  afternoon: 1.1,
  evening: 1.3,
}

export function gritOfDay(input: DayInput): number {
  if (!input.executed) return 0
  const D = input.difficulty
  const H = HOUR_WEIGHT[input.timeBucket]
  const S = Math.max(0, input.streakBefore)
  const streakBonus = 1 + Math.log(1 + S) / 4
  return D * H * streakBonus
}

export function gritAccumulated(recentDays: DayInput[]): number {
  if (recentDays.length === 0) return 0
  const window = recentDays.slice(-14)
  let weightedSum = 0
  let weightTotal = 0
  window.forEach((day, i) => {
    const weight = i + 1
    weightedSum += gritOfDay(day) * weight
    weightTotal += weight
  })
  const avg = weightedSum / weightTotal
  const MAX_GRIT = 6.4
  return Math.round(Math.min(100, (avg / MAX_GRIT) * 100))
}

export function bucketFromDate(date: Date): TimeBucket {
  const h = date.getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

export function currentStreak(history: { executed: boolean }[]): number {
  let s = 0
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].executed) s++
    else break
  }
  return s
}

/**
 * Variação do Grit nas últimas 24h (para mostrar "+4 hoje").
 * Compara Grit acumulado atual vs Grit acumulado sem o último dia.
 */
export function gritDelta(allDays: DayInput[]): number {
  if (allDays.length < 2) return 0
  const today = gritAccumulated(allDays)
  const yesterday = gritAccumulated(allDays.slice(0, -1))
  return today - yesterday
}
