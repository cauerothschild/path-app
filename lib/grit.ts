/**
 * PATH — Fórmula do Grit (V2)
 *
 * 4 níveis de dificuldade: Fácil (1), Médio (2), Difícil (3), Quase não aconteceu (4)
 * Peso de horário: baseado em consistência com horário planejado, não em faixa fixa
 *
 * Grit do dia = E × (D × H) × (1 + log(1+S)/4)
 *   E — execução (1 ou 0)
 *   D — dificuldade declarada (1, 2, 3, ou 4)
 *   H — peso de consistência com horário planejado (1.0 no horário, degrada se fora)
 *   S — sequência sem falha antes desse dia
 *
 * Grit acumulado = média móvel ponderada dos últimos 14 dias, normalizada 0–100
 */

export type TimeBucket = 'morning' | 'afternoon' | 'evening'

/**
 * Dados de um dia (interface para compatibilidade com versão antiga)
 * Usa bucket fixo de horário (V1)
 */
export interface DayInput {
  executed: boolean
  difficulty: 1 | 2 | 3 | 4
  timeBucket: TimeBucket
  streakBefore: number
}

/**
 * Dados de um check-in com horário real (nova interface)
 * Calcula peso baseado em desvio do horário planejado
 */
export interface CheckInData {
  executed: boolean
  difficulty: 1 | 2 | 3 | 4
  executionTime: Date | null           // Horário real quando foi feito
  streakBefore: number
  plannedHour?: number                 // Hora planejada (0-23)
  plannedMinute?: number               // Minuto planejado (0-59)
}

// ─────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────

/** Janela de tolerância: ±15 min do horário planejado = peso cheio (H=1.0) */
const ON_TIME_WINDOW_MINUTES = 15

/** Teto de normalização para Grit 0-100 */
const MAX_GRIT = 5.0

// ─────────────────────────────────────────────────────────────────────────
// Cálculo do peso de horário
// ─────────────────────────────────────────────────────────────────────────

/**
 * Calcula peso do horário (H) baseado no desvio do horário planejado.
 *
 * Se o usuário planejou 7h e fez às 7h05: H = 1.0 (perfeito)
 * Se planejou 7h e fez às 8h30: H ≈ 0.5 (fez mas fora da rotina)
 * Se planejou 7h e fez às 19h: H = 0.2 (muito fora, mínimo)
 */
function timeWeightFromPlannedTime(
  executionTime: Date | null,
  plannedHour?: number,
  plannedMinute?: number,
): number {
  // Fallback para V1 se não tem horário planejado
  if (plannedHour === undefined || plannedHour === null || executionTime === null) {
    const h = executionTime?.getHours() ?? 12
    if (h < 12) return 1.0   // morning
    if (h < 18) return 1.1   // afternoon
    return 1.3               // evening
  }

  const execHour   = executionTime.getHours()
  const execMinute = executionTime.getMinutes()

  const execTotalMin    = execHour * 60 + execMinute
  const plannedTotalMin = plannedHour * 60 + (plannedMinute ?? 0)

  // Diferença com wrap-around (ex: 23:55 vs 0:05 = 10 min)
  let diffMin = Math.abs(execTotalMin - plannedTotalMin)
  if (diffMin > 12 * 60) diffMin = 24 * 60 - diffMin

  if (diffMin <= ON_TIME_WINDOW_MINUTES) return 1.0

  const excess  = diffMin - ON_TIME_WINDOW_MINUTES
  const degrade = (excess / ON_TIME_WINDOW_MINUTES) * 0.1
  return Math.max(0.2, 1.0 - degrade)
}

// ─────────────────────────────────────────────────────────────────────────
// Funções exportadas
// ─────────────────────────────────────────────────────────────────────────

/**
 * Converte horário para bucket temporal (compatibilidade V1)
 */
export function bucketFromDate(date: Date): TimeBucket {
  const h = date.getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

/**
 * Calcula Grit de um dia (V1 – bucket fixo, mantido para compatibilidade)
 */
export function gritOfDay(input: DayInput): number {
  if (!input.executed) return 0
  const D = input.difficulty
  const H = input.timeBucket === 'morning' ? 1.0
    : input.timeBucket === 'afternoon' ? 1.1
    : 1.3
  const S = Math.max(0, input.streakBefore)
  const streakBonus = 1 + Math.log(1 + S) / 4
  return D * H * streakBonus
}

/**
 * Calcula Grit de um dia (V2 – horário planejado). Use esta função.
 */
export function gritOfDayWithExecutionTime(input: CheckInData): number {
  if (!input.executed) return 0

  const D = input.difficulty
  const H = timeWeightFromPlannedTime(input.executionTime, input.plannedHour, input.plannedMinute)
  const S = Math.max(0, input.streakBefore)
  const streakBonus = 1 + Math.log(1 + S) / 4

  return D * H * streakBonus
}

/**
 * Calcula Grit acumulado (média móvel ponderada de 14 dias, normalizada 0–100)
 * Aceita ambas as interfaces (DayInput ou CheckInData)
 */
export function gritAccumulated(recentDays: DayInput[] | CheckInData[]): number {
  if (recentDays.length === 0) return 0

  const window = recentDays.slice(-14)
  let weightedSum = 0
  let weightTotal = 0

  window.forEach((day, i) => {
    const weight = i + 1
    const grit = 'executionTime' in day
      ? gritOfDayWithExecutionTime(day as CheckInData)
      : gritOfDay(day as DayInput)
    weightedSum += grit * weight
    weightTotal += weight
  })

  const avg = weightedSum / weightTotal
  return Math.round(Math.min(100, (avg / MAX_GRIT) * 100))
}

/**
 * Calcula sequência atual sem falha
 */
export function currentStreak(history: { executed: boolean }[]): number {
  let s = 0
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].executed) s++
    else break
  }
  return s
}

/**
 * Calcula variação do Grit nas últimas 24h (para mostrar "+4 hoje")
 */
export function gritDelta(allDays: DayInput[] | CheckInData[]): number {
  if (allDays.length < 2) return 0
  const today     = gritAccumulated(allDays)
  const yesterday = gritAccumulated(allDays.slice(0, -1))
  return today - yesterday
}
