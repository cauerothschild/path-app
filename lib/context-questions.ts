export interface ContextQuestion {
  id: number
  text: string
  options: string[]
}

export const CONTEXT_QUESTIONS: ContextQuestion[] = [
  {
    id: 1,
    text: 'Como está sua energia agora?',
    options: ['Alta', 'Média', 'Baixa', 'Esgotada'],
  },
  {
    id: 2,
    text: 'Quanto você dormiu ontem?',
    options: ['7+ horas', '5-7 horas', '3-5 horas', '<3 horas'],
  },
  {
    id: 3,
    text: 'Seu corpo está em qual estado?',
    options: ['Descansado', 'Normal', 'Tenso', 'Machucado / inflamado'],
  },
  {
    id: 4,
    text: 'Seu nível de stress é:',
    options: ['Baixo', 'Normal', 'Alto', 'Crítico'],
  },
  {
    id: 5,
    text: 'Sua mente está em que estado?',
    options: ['Clara e estruturada', 'Normal', 'Caótica / muitas abas abertas', 'Congelada / bloqueada'],
  },
  {
    id: 6,
    text: 'Como foi sua interação social hoje?',
    options: ['Energizante', 'Normal', 'Nenhuma / isolado'],
  },
  {
    id: 7,
    text: 'Seu ambiente está:',
    options: ['Tranquilo', 'Normal', 'Caótico', 'Impossível'],
  },
  {
    id: 8,
    text: 'Seu desejo de fazer hábitos hoje:',
    options: ['Forte', 'Normal', 'Fraco', 'Não existe'],
  },
  {
    id: 9,
    text: 'Como você está se sentindo em relação ao fim de semana?',
    options: ['Ansioso (começando semana)', 'Normal', 'Cansado (fim de semana perto)', 'Destruído (fim de semana chegou)'],
  },
  {
    id: 10,
    text: 'Como você está se sentindo em relação à semana?',
    options: ['Ansioso', 'Normal', 'Cansado', 'Destruído'],
  },
  {
    id: 11,
    text: 'Como foi sua semana em termos de consistência?',
    options: ['Mantive tudo', 'Mantive maioria', 'Tive algumas falhas', 'Semana caótica'],
  },
]

/**
 * Picks one context question deterministically for the given date.
 * - Mondays: prioritizes Q10
 * - Weekends (Sat/Sun): prioritizes Q9 and Q11
 * - All other days: rotates through Q1, Q3–Q8
 */
export function pickContextQuestion(date: Date): ContextQuestion {
  const dow = date.getDay() // 0=Sun 1=Mon … 6=Sat
  const isWeekend = dow === 0 || dow === 6
  const isMonday  = dow === 1

  let pool: number[]
  if (isMonday) {
    pool = [10, 1, 3, 4, 5, 6, 7, 8]
  } else if (isWeekend) {
    pool = [9, 11, 1, 3, 4, 5, 6, 7, 8]
  } else {
    pool = [1, 3, 4, 5, 6, 7, 8]
  }

  const start      = new Date(date.getFullYear(), 0, 0)
  const dayOfYear  = Math.round((date.getTime() - start.getTime()) / 86400000)
  const qId        = pool[dayOfYear % pool.length]

  return CONTEXT_QUESTIONS.find(q => q.id === qId)!
}
