// PATH SUGGESTION — conteúdo estático por motivo de falha

export interface Suggestion {
  title: string
  body: string
}

const S: Record<string, Record<string, Suggestion>> = {
  'Cansaço': {
    'Meta menor':         { title: 'Meta menor',         body: 'A energia estava baixa hoje. Reduza a versão do hábito para algo que possa ser feito mesmo em dias difíceis. Consistência é mais importante que intensidade.' },
    'Outro horário':      { title: 'Outro horário',      body: 'Seu horário atual pode estar competindo com sua energia. Experimente executar o hábito quando costuma se sentir mais disposto.' },
    'Me preparar antes':  { title: 'Me preparar antes',  body: 'Quando a energia é baixa, qualquer etapa extra pesa. Deixe tudo preparado antes do horário do hábito.' },
    'Menos distração':    { title: 'Menos distração',    body: 'A pouca energia disponível foi consumida por outras demandas. Proteja os primeiros minutos do hábito.' },
    'Ambiente melhor':    { title: 'Ambiente melhor',    body: 'O ambiente atual pode estar exigindo esforço adicional. Torne o local mais favorável para começar.' },
    'Lembrete':           { title: 'Lembrete',           body: 'Em dias cansativos, lembrar é mais difícil. Um lembrete simples pode reduzir a carga mental.' },
    'Mais energia':       { title: 'Mais energia',       body: 'Sua energia disponível hoje pode não ter sido suficiente para sustentar o hábito. Observe quais momentos do dia você costuma ter mais disposição e tente executar o hábito nesse período.' },
    'Não sei identificar':{ title: 'Não sei identificar',body: 'Você identificou que o cansaço teve um papel hoje, mas ainda não está claro o que teria ajudado. Tudo bem não ter uma resposta agora. Observe os próximos dias e tente perceber quando sua energia costuma estar mais alta.' },
  },

  'Falta de tempo': {
    'Meta menor':         { title: 'Meta menor',         body: 'Talvez o problema não seja falta de tempo. Talvez a versão atual do hábito seja grande demais para dias corridos.' },
    'Outro horário':      { title: 'Outro horário',      body: 'Seu horário atual pode estar muito congestionado. Teste um período com menos compromissos.' },
    'Me preparar antes':  { title: 'Me preparar antes',  body: 'Preparação reduz o tempo necessário para começar. Elimine etapas antes do horário crítico.' },
    'Menos distração':    { title: 'Menos distração',    body: 'Parte do seu tempo pode estar sendo consumida por interrupções. Proteja um bloco curto para o hábito.' },
    'Ambiente melhor':    { title: 'Ambiente melhor',    body: 'Um ambiente mais organizado reduz atrasos e decisões.' },
    'Lembrete':           { title: 'Lembrete',           body: 'Antecipar o compromisso aumenta as chances de execução.' },
    'Mais energia':       { title: 'Mais energia',       body: 'Quando a energia está baixa, tarefas simples parecem exigir mais tempo. Eliminar etapas para começar e preparar o ambiente pode facilitar a execução mesmo em dias corridos.' },
    'Não sei identificar':{ title: 'Não sei identificar',body: 'Você sentiu que faltou tempo hoje, mas ainda não está claro o que poderia ter ajudado. Observe quais compromissos costumam competir com esse hábito. Pequenos padrões podem revelar oportunidades de ajuste.' },
  },

  'Esqueci': {
    'Meta menor':         { title: 'Meta menor',         body: 'O tamanho do hábito não foi o problema. O desafio foi lembrar dele.' },
    'Outro horário':      { title: 'Outro horário',      body: 'Talvez exista um horário mais previsível para encaixar o hábito.' },
    'Me preparar antes':  { title: 'Me preparar antes',  body: 'Elementos visíveis funcionam como lembretes naturais.' },
    'Menos distração':    { title: 'Menos distração',    body: 'Muitas demandas podem ter tirado o hábito do radar.' },
    'Ambiente melhor':    { title: 'Ambiente melhor',    body: 'Deixe sinais visuais do hábito em locais estratégicos.' },
    'Lembrete':           { title: 'Lembrete',           body: 'Ache uma estratégia para te lembrar, para não depender apenas da memória.' },
    'Mais energia':       { title: 'Mais energia',       body: 'Baixa energia mental pode reduzir atenção e lembrança. Descansar e recarregar as suas energias ajuda a manter o hábito presente ao longo do dia.' },
    'Não sei identificar':{ title: 'Não sei identificar',body: 'Você percebeu que esqueceu o hábito hoje. Nem sempre sabemos imediatamente como resolver isso. Experimente colocar um lembrete. Observe em quais momentos do dia o hábito costuma sair do radar.' },
  },

  'Dia caótico': {
    'Meta menor':         { title: 'Meta menor',         body: 'Seu dia exigiu mais do que o esperado. Em dias assim, uma versão menor do hábito pode ser suficiente para manter a consistência.' },
    'Outro horário':      { title: 'Outro horário',      body: 'Talvez o horário escolhido tenha competido com muitas demandas. Experimente um período mais previsível do dia.' },
    'Me preparar antes':  { title: 'Me preparar antes',  body: 'Dias corridos deixam pouco espaço para decisões. Deixar tudo preparado reduz o esforço para começar.' },
    'Menos distração':    { title: 'Menos distração',    body: 'Quando muitas coisas acontecem ao mesmo tempo, o hábito pode acabar perdendo prioridade. Proteja alguns minutos para ele.' },
    'Ambiente melhor':    { title: 'Ambiente melhor',    body: 'Um ambiente organizado facilita a execução mesmo quando o restante do dia parece desorganizado.' },
    'Lembrete':           { title: 'Lembrete',           body: 'Em dias intensos, compromissos importantes podem passar despercebidos. Um lembrete pode ajudar a manter o hábito visível.' },
    'Mais energia':       { title: 'Mais energia',       body: 'Dias caóticos costumam consumir muita energia mental. Cuidar da sua disposição pode aumentar sua capacidade de manter o hábito mesmo em meio às demandas.' },
    'Não sei identificar':{ title: 'Não sei identificar',body: 'Seu dia parece ter saído do planejado. Nem sempre conseguimos prever ou controlar tudo. Observe se existe algum momento mais protegido da sua rotina onde o hábito poderia acontecer com mais facilidade.' },
  },

  'Distrações': {
    'Meta menor':         { title: 'Meta menor',         body: 'Começar pequeno reduz oportunidades para distração.' },
    'Outro horário':      { title: 'Outro horário',      body: 'Alguns horários naturalmente possuem menos interrupções.' },
    'Me preparar antes':  { title: 'Me preparar antes',  body: 'Quanto menos etapas houver, menos chances de perder o foco.' },
    'Menos distração':    { title: 'Menos distração',    body: 'A barreira principal parece ser o ambiente de atenção. Reduza estímulos concorrentes.' },
    'Ambiente melhor':    { title: 'Ambiente melhor',    body: 'O ambiente influencia a realização do hábito. Experimente preparar o local antes.' },
    'Lembrete':           { title: 'Lembrete',           body: 'Lembretes ajudam a recuperar o foco quando ele se perde.' },
    'Mais energia':       { title: 'Mais energia',       body: 'Manter o foco exige energia mental. Quando a disposição está baixa, distrações tendem a parecer mais atraentes.' },
    'Não sei identificar':{ title: 'Não sei identificar',body: 'Algo desviou sua atenção hoje, mas ainda não está claro o que teria ajudado. Observe quais situações costumam interromper seu foco. Com o tempo, essas distrações tendem a ficar mais previsíveis.' },
  },

  'Baixa motivação': {
    'Meta menor':         { title: 'Meta menor',         body: 'Ação costuma vir antes da motivação. Uma versão menor reduz a resistência inicial.' },
    'Outro horário':      { title: 'Outro horário',      body: 'Talvez exista um momento do dia em que a resistência seja menor.' },
    'Me preparar antes':  { title: 'Me preparar antes',  body: 'Reduzir atrito ajuda quando a motivação está baixa. Prepare o hábito antes para que exija menos esforço na hora de realizar.' },
    'Menos distração':    { title: 'Menos distração',    body: 'Distrações ficam mais atraentes quando falta motivação.' },
    'Ambiente melhor':    { title: 'Ambiente melhor',    body: 'Um ambiente adequado reduz a necessidade de disciplina.' },
    'Lembrete':           { title: 'Lembrete',           body: 'Lembrar o compromisso ajuda a superar a hesitação inicial.' },
    'Mais energia':       { title: 'Mais energia',       body: 'Baixa energia e baixa motivação costumam aparecer juntas. Pequenos ajustes que aumentem sua disposição podem reduzir a resistência para começar.' },
    'Não sei identificar':{ title: 'Não sei identificar',body: 'A motivação esteve mais baixa hoje. Isso acontece com todo mundo em alguns momentos. Continue observando os dias em que o hábito acontece naturalmente. Eles podem mostrar pistas importantes sobre o que funciona para você.' },
  },

  'Quebrei a rotina': {
    'Meta menor':         { title: 'Meta menor',         body: 'Após uma quebra de rotina, recomeçar pequeno costuma funcionar melhor.' },
    'Outro horário':      { title: 'Outro horário',      body: 'Talvez sua rotina tenha mudado e o horário precise mudar também.' },
    'Me preparar antes':  { title: 'Me preparar antes',  body: 'Preparação reduz a dificuldade de retomar o hábito.' },
    'Menos distração':    { title: 'Menos distração',    body: 'Após interrupções, recuperar o foco é prioridade.' },
    'Ambiente melhor':    { title: 'Ambiente melhor',    body: 'Reconstruir pistas visuais facilita o retorno da rotina.' },
    'Lembrete':           { title: 'Lembrete',           body: 'Lembretes aceleram a retomada após períodos de interrupção.' },
    'Mais energia':       { title: 'Mais energia',       body: 'Retomar um hábito exige esforço inicial. Mais energia pode facilitar o retorno ao ritmo que você deseja construir.' },
    'Não sei identificar':{ title: 'Não sei identificar',body: 'Sua rotina saiu do padrão hoje. Nem sempre sabemos imediatamente como retomar. Comece observando qual foi a primeira mudança que interrompeu sua sequência.' },
  },

  'Não quis': {
    'Meta menor':         { title: 'Meta menor',         body: 'Existem dias em que simplesmente não estamos com vontade. Uma versão menor do hábito pode tornar mais fácil dar o primeiro passo.' },
    'Outro horário':      { title: 'Outro horário',      body: 'Talvez o problema não tenha sido o hábito, mas o momento escolhido para realizá-lo. Experimente um horário que pareça mais natural para você.' },
    'Me preparar antes':  { title: 'Me preparar antes',  body: 'Quando tudo já está pronto, fica mais fácil agir mesmo quando a vontade não aparece.' },
    'Menos distração':    { title: 'Menos distração',    body: 'Quando não estamos muito afim, qualquer distração parece mais interessante. Reduzir interrupções pode facilitar o início.' },
    'Ambiente melhor':    { title: 'Ambiente melhor',    body: 'Um ambiente favorável pode diminuir a resistência e tornar a ação mais natural.' },
    'Lembrete':           { title: 'Lembrete',           body: 'Às vezes a vontade não surge sozinha. Um lembrete pode ajudar você a tomar uma decisão mais consciente no momento certo.' },
    'Mais energia':       { title: 'Mais energia',       body: 'Baixa energia e falta de vontade costumam aparecer juntas. Mais disposição pode tornar mais fácil começar.' },
    'Não sei identificar':{ title: 'Não sei identificar',body: 'Não tem problema. Existem dias em que simplesmente não queremos fazer algo. O mais importante é reconhecer isso com honestidade. Você não precisa ter uma solução agora. Observe como se sente amanhã e siga em frente sem transformar um dia difícil em uma regra.' },
  },
}

const SUGGESTION_ORDER = [
  'Meta menor',
  'Outro horário',
  'Me preparar antes',
  'Menos distração',
  'Ambiente melhor',
  'Lembrete',
  'Mais energia',
  'Não sei identificar',
]

export function getSuggestions(failureReason: string): Suggestion[] {
  const map = S[failureReason]
  if (!map) return []
  return SUGGESTION_ORDER.map(key => map[key]).filter(Boolean)
}
