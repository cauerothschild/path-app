// ─── Types ───────────────────────────────────────────────────────────────────

export type InsightType = 'context' | 'pattern' | 'directive' | 'premium' | 'locked'

export interface InsightBlock {
  type: InsightType
  headline: string
  meta: string
}

export interface CheckInRow {
  date: string
  executed: boolean
  difficulty: 1 | 2 | 3 | 4
  failure_reason: string | null
  execution_time: string | null
  check_in_time: string
  energy_level: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strips the optional "HH:MM · " or "8h – 12h · " time prefix from energy_level */
export function extractFactor(energyLevel: string | null): string | null {
  if (!energyLevel) return null
  const parts = energyLevel.split(' · ')
  return parts[parts.length - 1].trim()
}

/** Derives time bucket from user-reported time (energy_level prefix) or fallback timestamps */
export function timeBucket(h: CheckInRow): string {
  // Try HH:MM prefix from new drum-picker format
  if (h.energy_level) {
    const prefix = h.energy_level.split(' · ')[0].trim()
    const hhmm = prefix.match(/^(\d{1,2}):(\d{2})$/)
    if (hhmm) {
      const hr = parseInt(hhmm[1])
      if (hr < 8)  return 'before_8'
      if (hr < 12) return '8_12'
      if (hr < 17) return '12_17'
      if (hr < 21) return '17_21'
      return 'after_21'
    }
    // Legacy slot labels
    if (/antes das 8/i.test(prefix))            return 'before_8'
    if (/8h\s*[–-]\s*12h/i.test(prefix))        return '8_12'
    if (/12h\s*[–-]\s*17h/i.test(prefix))       return '12_17'
    if (/17h\s*[–-]\s*21h/i.test(prefix))       return '17_21'
    if (/depois das 21|madrugada/i.test(prefix)) return 'after_21'
  }
  // Fallback to DB timestamps
  const t = h.execution_time ? new Date(h.execution_time) : new Date(h.check_in_time)
  const hr = t.getHours()
  if (hr < 8)  return 'before_8'
  if (hr < 12) return '8_12'
  if (hr < 17) return '12_17'
  if (hr < 21) return '17_21'
  return 'after_21'
}

function countMap(arr: (string | null)[]): Record<string, number> {
  const m: Record<string, number> = {}
  arr.forEach(v => { if (v) m[v] = (m[v] || 0) + 1 })
  return m
}

function topEntry(m: Record<string, number>): [string, number] | null {
  const entries = Object.entries(m).sort((a, b) => b[1] - a[1])
  return entries.length > 0 ? entries[0] : null
}

function rate(n: number, total: number): number {
  return total > 0 ? n / total : 0
}

function pctStr(n: number, total: number): string {
  return `${Math.round(rate(n, total) * 100)}%`
}

// ─── Locked placeholder ───────────────────────────────────────────────────────

function lockedBlock(
  tier: 'directive' | 'pattern' | 'premium',
  required: number,
  current: number,
): InsightBlock {
  const label = tier === 'directive' ? 'Directive' : tier === 'pattern' ? 'Pattern' : 'Premium'
  const remaining = required - current
  return {
    type: 'locked',
    headline: `Realize mais ${remaining} check-in${remaining === 1 ? '' : 's'} para desbloquear ${label} Insights.`,
    meta: `${current} / ${required} CHECK-INS REGISTRADOS`,
  }
}

// ─── CONTEXT ─────────────────────────────────────────────────────────────────

function buildContextBlock(history: CheckInRow[]): InsightBlock | null {
  const today = new Date().toISOString().slice(0, 10)
  const ci = history.find(h => h.date === today)
  if (!ci) return null

  const { executed, difficulty, failure_reason } = ci
  const factor = extractFactor(ci.energy_level)

  let headline = ''

  if (executed) {
    // Combined conditions first
    if (difficulty === 3 && factor === 'Boa energia')
      headline = 'Mesmo com dificuldade, sua energia ajudou a sustentar a execução.'
    else if (difficulty === 3 && factor === 'Rotina estável')
      headline = 'A rotina ajudou você a manter o comportamento mesmo em um dia difícil.'
    else if (difficulty === 3 && factor === 'Comecei pequeno')
      headline = 'Uma pequena ação foi suficiente para preservar a consistência.'
    // Single factor
    else if (factor === 'Boa energia')
      headline = 'Boa energia foi o principal facilitador da execução hoje.'
    else if (factor === 'Ambiente organizado')
      headline = 'Um ambiente organizado favoreceu sua execução hoje.'
    else if (factor === 'Rotina estável')
      headline = 'Uma rotina estável contribuiu para sua execução hoje.'
    else if (factor === 'Comecei pequeno')
      headline = 'Começar pequeno ajudou você a realizar o hábito hoje.'
    else if (factor === 'Estava motivado')
      headline = 'A motivação contribuiu para sua execução hoje.'
    else if (factor === 'Horário funcionou bem')
      headline = 'O horário escolhido favoreceu sua execução hoje.'
    // Difficulty fallback
    else if (difficulty === 1)
      headline = 'Hábito mantido hoje com dificuldade fácil.'
    else if (difficulty === 2)
      headline = 'Hábito mantido hoje com dificuldade moderada.'
    else
      headline = 'Hábito mantido hoje apesar da dificuldade.'
  } else {
    // Failure combined conditions
    if (failure_reason === 'Cansaço' && factor === 'Mais energia')
      headline = 'Hoje a energia parece ter sido a principal barreira.'
    else if (failure_reason === 'Esqueci' && factor === 'Lembrete')
      headline = 'Um lembrete poderia ter aumentado suas chances de executar hoje.'
    else if (failure_reason === 'Distrações' && factor === 'Menos distração')
      headline = 'As interrupções parecem ter pesado mais do que o planejado hoje.'
    else if (failure_reason === 'Falta de tempo' && factor === 'Meta menor')
      headline = 'Uma versão menor do hábito poderia ter sido mais viável hoje.'
    // Single reason
    else if (failure_reason === 'Cansaço')        headline = 'O cansaço foi o principal obstáculo hoje.'
    else if (failure_reason === 'Dia caótico')    headline = 'Os imprevistos dificultaram sua execução hoje.'
    else if (failure_reason === 'Esqueci')         headline = 'O hábito saiu do radar hoje.'
    else if (failure_reason === 'Falta de tempo') headline = 'O tempo disponível não foi suficiente para executar.'
    else if (failure_reason === 'Baixa motivação')headline = 'A motivação esteve abaixo do necessário hoje.'
    else if (failure_reason === 'Distrações')     headline = 'As distrações competiram com sua intenção de agir.'
    else if (failure_reason === 'Quebrei a rotina')headline = 'A quebra da rotina dificultou a execução hoje.'
    else if (failure_reason === 'Não quis')       headline = 'Hoje foi uma escolha consciente de não executar.'
    else                                           headline = 'Hábito não mantido hoje.'
  }

  const diffLabel = ['Fácil', 'Moderado', 'Difícil', 'Quase não aconteceu'][difficulty - 1] ?? 'Difícil'
  const metaParts = executed
    ? [
        `DIFICULDADE: ${diffLabel.toUpperCase()}`,
        factor ? `FATOR: ${factor.toUpperCase()}` : null,
        'HOJE',
      ]
    : [
        `RAZÃO: ${(failure_reason ?? 'NÃO INFORMADO').toUpperCase()}`,
        factor ? `SOLUÇÃO: ${factor.toUpperCase()}` : null,
        'HOJE',
      ]

  return {
    type: 'context',
    headline,
    meta: metaParts.filter(Boolean).join(' · '),
  }
}

// ─── PATTERN ─────────────────────────────────────────────────────────────────

function buildPatternBlock(history: CheckInRow[]): InsightBlock | null {
  const successRows = history.filter(h => h.executed)
  const failureRows = history.filter(h => !h.executed)
  const total      = history.length
  const succTotal  = successRows.length
  const failTotal  = failureRows.length

  const sfMap = countMap(successRows.map(h => extractFactor(h.energy_level)))
  const frMap = countMap(failureRows.map(h => h.failure_reason))

  // ── Time bucket analysis ──────────────────────────────────────────────────
  const BUCKETS = ['before_8', '8_12', '12_17', '17_21', 'after_21']
  const bs: Record<string, { ok: number; n: number }> = {}
  BUCKETS.forEach(b => { bs[b] = { ok: 0, n: 0 } })
  history.forEach(h => {
    const b = timeBucket(h)
    bs[b].n++
    if (h.executed) bs[b].ok++
  })
  const validBuckets  = BUCKETS.filter(b => bs[b].n >= 3)
  const avgRate       = rate(succTotal, total)

  const bucketLabels: Record<string, string> = {
    before_8: 'Antes das 8h', '8_12': '8h–12h', '12_17': '12h–17h',
    '17_21': '17h–21h', after_21: 'Depois das 21h',
  }
  const bucketMessages: Record<string, string> = {
    before_8: 'As primeiras horas do dia favorecem sua execução.',
    '8_12':   'Sua consistência é maior entre 8h e 12h.',
    '12_17':  'Seu melhor período costuma acontecer entre 12h e 17h.',
    '17_21':  'Você tende a executar melhor no fim da tarde.',
  }

  // Best bucket (non-after_21)
  const ranked = validBuckets
    .filter(b => b !== 'after_21')
    .sort((a, b) => rate(bs[b].ok, bs[b].n) - rate(bs[a].ok, bs[a].n))
  const bestBucket = ranked[0]
  if (bestBucket && rate(bs[bestBucket].ok, bs[bestBucket].n) >= 0.65) {
    const r = bs[bestBucket].ok / bs[bestBucket].n
    return {
      type: 'pattern',
      headline: bucketMessages[bestBucket],
      meta: `${bucketLabels[bestBucket].toUpperCase()}: ${Math.round(r * 100)}% DE SUCESSO`,
    }
  }

  // Late night worst by >20pp
  if (validBuckets.includes('after_21')) {
    const lateRate = rate(bs['after_21'].ok, bs['after_21'].n)
    if (avgRate - lateRate >= 0.20)
      return {
        type: 'pattern',
        headline: 'Execuções tardias parecem mais vulneráveis a falhas.',
        meta: `DEPOIS DAS 21H: ${Math.round(lateRate * 100)}% · GERAL: ${Math.round(avgRate * 100)}%`,
      }
    if (lateRate < avgRate)
      return {
        type: 'pattern',
        headline: 'Execuções após as 21h tendem a ser menos consistentes.',
        meta: `DEPOIS DAS 21H: ${Math.round(lateRate * 100)}% DE SUCESSO`,
      }
  }

  // ── Success factor patterns ───────────────────────────────────────────────
  const boeCount = sfMap['Boa energia'] ?? 0
  if (succTotal > 0 && rate(boeCount, succTotal) > 0.40)
    return {
      type: 'pattern',
      headline: 'Boa energia está presente em grande parte das suas execuções.',
      meta: `BOA ENERGIA EM ${pctStr(boeCount, succTotal)} DOS SUCESSOS`,
    }

  const aoCount = sfMap['Ambiente organizado'] ?? 0
  if (succTotal > 0 && rate(aoCount, succTotal) > 0.40)
    return {
      type: 'pattern',
      headline: 'Um ambiente organizado frequentemente te ajuda a realizar o hábito.',
      meta: `AMBIENTE ORGANIZADO EM ${pctStr(aoCount, succTotal)} DOS SUCESSOS`,
    }
  if (succTotal > 0 && rate(aoCount, succTotal) > 0.20)
    return {
      type: 'pattern',
      headline: 'Você executa melhor quando o ambiente já está preparado.',
      meta: `PADRÃO OBSERVADO EM ${aoCount} EXECUÇÕES`,
    }

  const rsCount = sfMap['Rotina estável'] ?? 0
  const qrCount = frMap['Quebrei a rotina'] ?? 0
  if (succTotal > 0 && rate(rsCount, succTotal) > 0.40)
    return {
      type: 'pattern',
      headline: 'Seus melhores dias tendem a seguir uma estrutura parecida.',
      meta: `ROTINA ESTÁVEL EM ${pctStr(rsCount, succTotal)} DOS SUCESSOS`,
    }
  if (succTotal > 0 && failTotal > 0 && rate(rsCount, succTotal) > 0.30 && rate(qrCount, failTotal) > 0.30)
    return {
      type: 'pattern',
      headline: 'Seus dados mostram um contraste claro entre estabilidade e interrupção.',
      meta: `ROTINA ESTÁVEL: ${pctStr(rsCount, succTotal)} SUCESSOS · QUEBRAS: ${pctStr(qrCount, failTotal)} FALHAS`,
    }
  if (succTotal > 0 && rate(rsCount, succTotal) > 0.20)
    return {
      type: 'pattern',
      headline: 'Seu hábito prospera quando seus dias seguem uma estrutura previsível.',
      meta: `ROTINA ESTÁVEL MENCIONADA ${rsCount}x`,
    }

  const cpCount = sfMap['Comecei pequeno'] ?? 0
  if (succTotal > 0 && rate(cpCount, succTotal) > 0.30)
    return {
      type: 'pattern',
      headline: 'Pequenos começos parecem gerar grandes resultados.',
      meta: `COMECEI PEQUENO EM ${pctStr(cpCount, succTotal)} DOS SUCESSOS`,
    }

  const hwCount = sfMap['Horário funcionou bem'] ?? 0
  if (succTotal > 0 && rate(hwCount, succTotal) > 0.25)
    return {
      type: 'pattern',
      headline: 'O horário da execução influencia seus resultados.',
      meta: `HORÁRIO FUNCIONOU BEM: ${hwCount} OCORRÊNCIAS`,
    }

  // ── Difficulty patterns ───────────────────────────────────────────────────
  const diffHard = successRows.filter(h => h.difficulty === 3).length
  if (succTotal > 0 && rate(diffHard, succTotal) > 0.50)
    return {
      type: 'pattern',
      headline: 'Você mantém o hábito mesmo quando ele exige esforço significativo.',
      meta: `DIFÍCIL EM ${pctStr(diffHard, succTotal)} DAS EXECUÇÕES`,
    }
  if (succTotal > 0 && rate(diffHard, succTotal) > 0.25)
    return {
      type: 'pattern',
      headline: 'Você mantém o hábito mesmo quando ele exige esforço.',
      meta: `DIFÍCIL EM ${diffHard} DE ${succTotal} EXECUÇÕES`,
    }

  // ── Resilience: quick return after failure ────────────────────────────────
  let quickReturns = 0
  let totalFails   = 0
  for (let i = 0; i < history.length - 1; i++) {
    if (!history[i].executed) {
      totalFails++
      const diff = Math.round(
        (new Date(history[i + 1].date).getTime() - new Date(history[i].date).getTime()) / 86400000
      )
      if (diff <= 2 && history[i + 1].executed) quickReturns++
    }
  }
  if (totalFails >= 3 && rate(quickReturns, totalFails) > 0.70)
    return {
      type: 'pattern',
      headline: 'Uma falha isolada raramente vira abandono.',
      meta: `RETOMADA EM ATÉ 2 DIAS: ${pctStr(quickReturns, totalFails)} DAS VEZES`,
    }
  if (totalFails >= 3 && rate(quickReturns, totalFails) > 0.50)
    return {
      type: 'pattern',
      headline: 'Você costuma retomar rapidamente após falhar.',
      meta: `RETOMADA EM ATÉ 2 DIAS: ${pctStr(quickReturns, totalFails)} DAS VEZES`,
    }

  // ── Independence from motivation ─────────────────────────────────────────
  const emCount = sfMap['Estava motivado'] ?? 0
  if (emCount <= 1 && avgRate >= 0.70 && total >= 14)
    return {
      type: 'pattern',
      headline: 'Você consegue agir mesmo sem depender de motivação.',
      meta: `TAXA DE SUCESSO: ${Math.round(avgRate * 100)}% · MOTIVAÇÃO MENCIONADA: ${emCount}x`,
    }

  // ── Failure patterns ──────────────────────────────────────────────────────
  const cansacoCount = frMap['Cansaço'] ?? 0
  if (failTotal > 0 && rate(cansacoCount, failTotal) > 0.40)
    return {
      type: 'pattern',
      headline: 'A maior parte das suas falhas está relacionada ao cansaço.',
      meta: `CANSAÇO EM ${pctStr(cansacoCount, failTotal)} DAS FALHAS`,
    }

  const topSF = topEntry(sfMap)
  if (topSF && topSF[0] === 'Boa energia' && topSF[1] >= 2)
    return {
      type: 'pattern',
      headline: 'Sua consistência parece estar fortemente ligada aos níveis de energia.',
      meta: `BOA ENERGIA: FATOR MAIS FREQUENTE COM ${topSF[1]} OCORRÊNCIAS`,
    }

  return null
}

// ─── DIRECTIVE ───────────────────────────────────────────────────────────────

function buildDirectiveBlock(history: CheckInRow[]): InsightBlock | null {
  const failureRows = history.filter(h => !h.executed)
  const failTotal   = failureRows.length
  if (failTotal === 0) return null

  const frMap = countMap(failureRows.map(h => h.failure_reason))
  const bsMap = countMap(failureRows.map(h => extractFactor(h.energy_level)))
  const topBS = topEntry(bsMap)

  const cansacoCount   = frMap['Cansaço']          ?? 0
  const esqueciCount   = frMap['Esqueci']           ?? 0
  const maisEnCount    = bsMap['Mais energia']      ?? 0
  const lembreteCount  = bsMap['Lembrete']          ?? 0
  const mpCount        = bsMap['Me preparar antes'] ?? 0
  const mdCount        = bsMap['Menos distração']   ?? 0
  const ambCount       = bsMap['Ambiente melhor']   ?? 0
  const ohCount        = bsMap['Outro horário']     ?? 0
  const mmCount        = bsMap['Meta menor']        ?? 0
  const nsiCount       = bsMap['Não sei identificar'] ?? 0

  // Cansaço + Mais energia (cross)
  if (cansacoCount >= 2 && maisEnCount >= 2)
    return {
      type: 'directive',
      headline: 'Os dados sugerem que energia é sua principal dificuldade atual.',
      meta: `CANSAÇO: ${cansacoCount}x · MAIS ENERGIA: ${maisEnCount}x`,
    }

  if (failTotal > 0 && rate(cansacoCount, failTotal) > 0.40)
    return {
      type: 'directive',
      headline: 'Descansar mais parece ser sua principal oportunidade para conseguir executar o hábito.',
      meta: `CANSAÇO EM ${pctStr(cansacoCount, failTotal)} DAS FALHAS`,
    }
  if (failTotal > 0 && rate(cansacoCount, failTotal) > 0.30)
    return {
      type: 'directive',
      headline: 'Considere executar mais cedo em dias de baixa energia.',
      meta: `CANSAÇO: ${pctStr(cansacoCount, failTotal)} DAS FALHAS`,
    }

  // Esqueci + Lembrete (cross)
  if (esqueciCount >= 2 && lembreteCount >= 1)
    return {
      type: 'directive',
      headline: 'Seu desafio parece estar mais relacionado à lembrança do que à execução.',
      meta: `ESQUECI: ${esqueciCount}x · LEMBRETE: ${lembreteCount}x`,
    }

  if (failTotal > 0 && rate(lembreteCount, failTotal) > 0.30)
    return {
      type: 'directive',
      headline: 'Seu desafio parece estar mais relacionado à lembrança do que à execução.',
      meta: `LEMBRETE EM ${pctStr(lembreteCount, failTotal)} DAS SITUAÇÕES`,
    }
  if (lembreteCount >= 2)
    return {
      type: 'directive',
      headline: 'Um lembrete simples pode recuperar parte da sua consistência.',
      meta: `LEMBRETE MENCIONADO ${lembreteCount}x`,
    }

  if (failTotal > 0 && rate(mpCount, failTotal) > 0.40)
    return {
      type: 'directive',
      headline: 'Antecipar decisões parece ser uma das maiores oportunidades de melhoria.',
      meta: `ME PREPARAR ANTES: ${pctStr(mpCount, failTotal)} DAS SITUAÇÕES`,
    }
  if (failTotal > 0 && rate(mpCount, failTotal) > 0.30)
    return {
      type: 'directive',
      headline: 'Grande parte das dificuldades acontece antes mesmo de começar.',
      meta: `ME PREPARAR ANTES: ${pctStr(mpCount, failTotal)} DAS SITUAÇÕES`,
    }
  if (mpCount >= 2)
    return {
      type: 'directive',
      headline: 'Preparar o ambiente antecipadamente pode reduzir suas falhas.',
      meta: `ME PREPARAR ANTES MENCIONADO ${mpCount}x`,
    }

  if (failTotal > 0 && rate(mdCount, failTotal) > 0.30)
    return {
      type: 'directive',
      headline: 'Seu ambiente atual parece gerar mais interrupções do que o ideal.',
      meta: `MENOS DISTRAÇÃO: ${pctStr(mdCount, failTotal)} DAS SITUAÇÕES`,
    }
  if (mdCount >= 2)
    return {
      type: 'directive',
      headline: 'Reduzir interrupções parece ser uma oportunidade clara de melhoria.',
      meta: `MENOS DISTRAÇÃO MENCIONADO ${mdCount}x`,
    }

  if (failTotal > 0 && rate(ambCount, failTotal) > 0.30)
    return {
      type: 'directive',
      headline: 'Seu contexto atual pode estar criando mais atrito do que ajudando.',
      meta: `AMBIENTE MELHOR: ${pctStr(ambCount, failTotal)} DAS SITUAÇÕES`,
    }
  if (ambCount >= 2)
    return {
      type: 'directive',
      headline: 'Pequenas mudanças no ambiente podem aumentar sua execução.',
      meta: `AMBIENTE MELHOR MENCIONADO ${ambCount}x`,
    }

  if (failTotal > 0 && rate(ohCount, failTotal) > 0.30)
    return {
      type: 'directive',
      headline: 'O momento da execução parece merecer ajustes.',
      meta: `OUTRO HORÁRIO: ${pctStr(ohCount, failTotal)} DAS SITUAÇÕES`,
    }
  if (topBS?.[0] === 'Outro horário' && topBS[1] >= 2)
    return {
      type: 'directive',
      headline: 'Experimentar um novo horário pode aumentar sua consistência.',
      meta: `OUTRO HORÁRIO: SOLUÇÃO MAIS FREQUENTE`,
    }

  if (failTotal > 0 && rate(mmCount, failTotal) > 0.30)
    return {
      type: 'directive',
      headline: 'Seu hábito pode estar maior do que o necessário em alguns dias.',
      meta: `META MENOR: ${pctStr(mmCount, failTotal)} DAS SITUAÇÕES`,
    }
  if (mmCount >= 2)
    return {
      type: 'directive',
      headline: 'Uma versão menor do hábito pode ser mais sustentável em dias difíceis.',
      meta: `META MENOR MENCIONADO ${mmCount}x`,
    }

  if (topBS?.[0] === 'Mais energia' && topBS[1] >= 2)
    return {
      type: 'directive',
      headline: 'Os dados sugerem que energia influencia mais sua execução do que motivação.',
      meta: `MAIS ENERGIA: SOLUÇÃO MAIS FREQUENTE (${topBS[1]}x)`,
    }

  if (failTotal > 0 && rate(nsiCount, failTotal) > 0.40)
    return {
      type: 'directive',
      headline: 'Talvez seja cedo para identificar um padrão consistente.',
      meta: `PADRÃO NÃO IDENTIFICADO EM ${pctStr(nsiCount, failTotal)} DAS FALHAS`,
    }
  if (nsiCount >= 2)
    return {
      type: 'directive',
      headline: 'Seus dados ainda não apontam um obstáculo dominante.',
      meta: `OBSTÁCULO NÃO IDENTIFICADO ${nsiCount}x`,
    }

  const topFR = topEntry(frMap)
  if (topFR)
    return {
      type: 'directive',
      headline: `${topFR[0]} é seu principal obstáculo recente.`,
      meta: `${topFR[0].toUpperCase()}: ${topFR[1]} DE ${failTotal} FALHAS`,
    }

  return null
}

// ─── PREMIUM ─────────────────────────────────────────────────────────────────

function buildPremiumBlock(history: CheckInRow[]): InsightBlock | null {
  const successRows = history.filter(h => h.executed)
  const failureRows = history.filter(h => !h.executed)
  const total      = history.length
  const succTotal  = successRows.length
  const failTotal  = failureRows.length
  if (succTotal === 0) return null

  const sfMap = countMap(successRows.map(h => extractFactor(h.energy_level)))
  const frMap = countMap(failureRows.map(h => h.failure_reason))
  const bsMap = countMap(failureRows.map(h => extractFactor(h.energy_level)))
  const avgRate = rate(succTotal, total)

  const topSF = topEntry(sfMap)
  const topFR = topEntry(frMap)
  const topBS = topEntry(bsMap)

  // Boa energia (top success) + Mais energia (top solution) + Cansaço (top failure)
  if (topSF?.[0] === 'Boa energia' && topFR?.[0] === 'Cansaço' && topBS?.[0] === 'Mais energia')
    return {
      type: 'premium',
      headline: 'Seus melhores dias e suas principais dificuldades apontam para a mesma direção: energia.',
      meta: `BOA ENERGIA: ${topSF[1]} SUCESSOS · CANSAÇO: ${topFR[1]} FALHAS · MAIS ENERGIA: ${topBS[1]} SOLUÇÕES`,
    }

  if (topSF?.[0] === 'Boa energia' && topFR?.[0] === 'Cansaço')
    return {
      type: 'premium',
      headline: 'Sua consistência parece depender mais da energia disponível do que da motivação.',
      meta: `BOA ENERGIA: ${topSF[1]} SUCESSOS · CANSAÇO: ${topFR[1]} FALHAS`,
    }

  if (topSF?.[0] === 'Rotina estável' && topFR?.[0] === 'Quebrei a rotina')
    return {
      type: 'premium',
      headline: 'Seu maior aliado é a previsibilidade. Seu maior risco é a quebra da rotina.',
      meta: `ROTINA ESTÁVEL: ${topSF[1]} SUCESSOS · QUEBRAS: ${topFR[1]} FALHAS`,
    }

  if (topSF?.[0] === 'Ambiente organizado' && topBS?.[0] === 'Me preparar antes')
    return {
      type: 'premium',
      headline: 'Quando o ambiente está pronto, suas chances de execução aumentam significativamente.',
      meta: `AMBIENTE ORGANIZADO: ${topSF[1]} SUCESSOS · ME PREPARAR ANTES: ${topBS[1]} SOLUÇÕES`,
    }

  if (topSF?.[0] === 'Ambiente organizado' && topBS?.[0] === 'Ambiente melhor')
    return {
      type: 'premium',
      headline: 'Os dados indicam que o ambiente influencia mais seus resultados do que a motivação.',
      meta: `AMBIENTE ORGANIZADO: ${topSF[1]} SUCESSOS · AMBIENTE MELHOR: ${topBS[1]} SOLUÇÕES`,
    }

  if (topSF?.[0] === 'Comecei pequeno' && topBS?.[0] === 'Meta menor')
    return {
      type: 'premium',
      headline: 'Quando a barreira inicial diminui, sua taxa de execução aumenta.',
      meta: `COMECEI PEQUENO: ${topSF[1]} SUCESSOS · META MENOR: ${topBS[1]} SOLUÇÕES`,
    }

  if (topSF?.[0] === 'Comecei pequeno' && topFR?.[0] === 'Falta de tempo')
    return {
      type: 'premium',
      headline: 'Seu histórico sugere que simplificar o hábito pode ajudar nos dias corridos.',
      meta: `COMECEI PEQUENO: ${topSF[1]} SUCESSOS · FALTA DE TEMPO: ${topFR[1]} FALHAS`,
    }

  if (topSF?.[0] === 'Comecei pequeno' && topFR?.[0] === 'Dia caótico')
    return {
      type: 'premium',
      headline: 'Em dias imprevisíveis, reduzir o tamanho da ação pode ser suficiente para manter a sequência.',
      meta: `COMECEI PEQUENO: ${topSF[1]} SUCESSOS · DIA CAÓTICO: ${topFR[1]} FALHAS`,
    }

  if (topSF?.[0] === 'Horário funcionou bem' && topBS?.[0] === 'Outro horário')
    return {
      type: 'premium',
      headline: 'Seu hábito parece sensível ao momento do dia em que é executado.',
      meta: `HORÁRIO FUNCIONOU BEM: ${topSF[1]} SUCESSOS · OUTRO HORÁRIO: ${topBS[1]} SOLUÇÕES`,
    }

  // Boa energia + Ambiente organizado + Rotina estável frequentes juntos
  const tripleCtx = Math.min(
    sfMap['Boa energia'] ?? 0,
    sfMap['Ambiente organizado'] ?? 0,
    sfMap['Rotina estável'] ?? 0,
  )
  if (tripleCtx >= 3)
    return {
      type: 'premium',
      headline: 'Seus melhores resultados acontecem quando energia, ambiente e rotina trabalham juntos.',
      meta: `CONTEXTO COMBINADO OBSERVADO EM ${tripleCtx}+ EXECUÇÕES`,
    }

  // Esqueci + Lembrete
  if (topFR?.[0] === 'Esqueci' && topBS?.[0] === 'Lembrete')
    return {
      type: 'premium',
      headline: 'Seu desafio parece estar mais relacionado à lembrança do que à execução.',
      meta: `ESQUECI: ${topFR[1]} FALHAS · LEMBRETE: ${topBS[1]} SOLUÇÕES`,
    }

  // Não quis > 30% + consistência alta
  const nqCount = frMap['Não quis'] ?? 0
  if (failTotal > 0 && rate(nqCount, failTotal) > 0.30)
    return {
      type: 'premium',
      headline: 'Talvez seja hora de revisar o significado desse hábito para você.',
      meta: `NÃO QUIS: ${pctStr(nqCount, failTotal)} DAS FALHAS`,
    }
  if (nqCount > 0 && avgRate >= 0.70)
    return {
      type: 'premium',
      headline: 'Mesmo com pausas ocasionais, você mantém uma boa consistência.',
      meta: `TAXA DE SUCESSO: ${Math.round(avgRate * 100)}% · PAUSAS CONSCIENTES: ${nqCount}`,
    }

  // Estava motivado pouco + alta consistência
  const emCount = sfMap['Estava motivado'] ?? 0
  if (emCount <= 1 && avgRate >= 0.70)
    return {
      type: 'premium',
      headline: 'Você consegue agir mesmo quando não está especialmente motivado.',
      meta: `TAXA DE SUCESSO: ${Math.round(avgRate * 100)}% · MOTIVAÇÃO: ${emCount} MENÇÕES`,
    }

  // Resilience
  let quickReturns = 0
  let totalFails   = 0
  for (let i = 0; i < history.length - 1; i++) {
    if (!history[i].executed) {
      totalFails++
      const diff = Math.round(
        (new Date(history[i + 1].date).getTime() - new Date(history[i].date).getTime()) / 86400000
      )
      if (diff <= 2 && history[i + 1].executed) quickReturns++
    }
  }
  if (totalFails >= 3 && rate(quickReturns, totalFails) > 0.70)
    return {
      type: 'premium',
      headline: 'Seu maior ponto forte não é evitar erros. É sua capacidade de voltar rapidamente.',
      meta: `RETOMADA EM ATÉ 2 DIAS: ${pctStr(quickReturns, totalFails)} DAS VEZES`,
    }

  return null
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function buildInsights(history: CheckInRow[]): InsightBlock[] {
  const total  = history.length
  const blocks: InsightBlock[] = []

  // ── Context (always) ──
  const ctx = buildContextBlock(history)
  if (ctx) blocks.push(ctx)

  // ── Pattern / Premium ──
  if (total >= 21) {
    const premium = buildPremiumBlock(history)
    const pattern = buildPatternBlock(history)
    blocks.push(premium ?? pattern ?? lockedBlock('pattern', 14, total))
  } else if (total >= 14) {
    blocks.push(buildPatternBlock(history) ?? lockedBlock('pattern', 14, total))
  } else {
    blocks.push(lockedBlock('pattern', 14, total))
  }

  // ── Directive ──
  if (total >= 7) {
    blocks.push(buildDirectiveBlock(history) ?? lockedBlock('directive', 7, total))
  } else {
    blocks.push(lockedBlock('directive', 7, total))
  }

  return blocks
}
