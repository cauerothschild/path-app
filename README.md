# PATH — MVP

Sistema inteligente de performance pessoal baseado em neurociência comportamental.

App seguindo o mockup oficial: splash + onboarding de 4 etapas + Home (Grit + check-in) + Insights (Briefing + Diagnóstico Mensal) + Perfil.

## Stack
- Next.js 14 (App Router) + React 18
- Tailwind CSS com paleta oficial
- Supabase (Auth + Postgres + RLS)
- TypeScript

## Setup (15 minutos)

### 1. Supabase
1. https://supabase.com → New Project
2. SQL Editor → cole o conteúdo de `supabase/schema.sql` → Run
3. Authentication → Providers → "Email" ativado
4. Settings → API → copie a URL e a anon key

### 2. Variáveis de ambiente
```bash
cp .env.example .env.local
```
Preencha com as chaves do Supabase.

### 3. Rodar
```bash
npm install
npm run dev
```

Abra http://localhost:3000

## Estrutura
```
app/
  page.tsx                  → Splash + login (magic link)
  onboarding/page.tsx       → 4 perguntas (mockup tela 2)
  dashboard/page.tsx        → Home: Grit ring + check-in (telas 3-4)
  insights/page.tsx         → Briefing + Diagnóstico Mensal (telas 5, 7)
  profile/page.tsx          → Perfil + hábito (tela 8)
components/
  Logo.tsx                  → P estilizado em SVG
  GritRing.tsx              → Anel circular (estilo Oura)
  StatusHeader.tsx          → Logo + dias observando
  BottomNav.tsx             → 3 abas (Home, Insights, Perfil)
  CheckInPanel.tsx          → Fiz/Não fiz + micro-input
lib/
  grit.ts                   → Fórmula do Grit + delta
  briefing.ts               → Briefing + Diagnóstico Mensal + status line
  supabase.ts               → Cliente Supabase
supabase/
  schema.sql                → 4 tabelas + RLS + trigger de signup
```

## Funcionalidades implementadas

**Semana 1 (MVP):**
- [x] Splash com onda decorativa
- [x] Onboarding em 4 perguntas (nome + hábito + âncora + obstáculos)
- [x] Check-in diário com botões Fiz / Não fiz
- [x] Micro-input expansível (Cansaço / Esqueci / Dia caótico / Não quis)
- [x] Captura de dificuldade do dia (Fácil / Médio / Difícil)
- [x] Cálculo do Grit com peso por contexto
- [x] Anel circular do Grit + delta diário
- [x] Briefing Matinal com 6 regras condicionais
- [x] Camada 1 passiva (horário de abertura, velocidade de check-in)

**Adiantado (preparado para semana 4):**
- [x] Diagnóstico Mensal com 3 descobertas geradas automaticamente
- [x] Tela de Insights com Briefing detalhado + métricas
- [x] Perfil com edição do hábito principal

## Paleta
- `#0a1614` — bg (background mais escuro)
- `#0d2827` — surface (cards)
- `#1a3835` — border (bordas sutis)
- `#a4dcb5` — primary (celadon — Grit e CTAs)
- `#035147` — accent (verde médio)
- `#d97b5a` — warn (laranja queimado — alertas e "não fiz")
- `#f6f5fc` — ink (texto)

## Para abrir no Windsurf
`File → Open Folder → path-mvp`. Abra o Cascade (Cmd+L) e ele entende o projeto.

Para gerar a Semana 2 (Mapa de Padrões, Alerta de Risco, Modo Contexto):
> "Continue o desenvolvimento. Implemente o detector de padrões da Semana 2: agregação por dia da semana e faixa de horário, Alerta de Risco quando taxa de falha > 60% com amostra ≥ 4, e Modo Contexto (check-in de energia Alta/Média/Baixa) antes do horário crítico."
