#!/usr/bin/env node

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

/**
 * PATH — Seed Script (CORRIGIDO)
 * Popula Supabase com 14 dias de dados realistas
 * Cria padrões detectáveis para Briefing, Dashboard e Insights
 *
 * Uso:
 * 1. npm install
 * 2. npx ts-node scripts/seed-demo.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "❌ Faltam variáveis de ambiente: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

// ─────────────────────────────────────────────────────────────────────────────
// DADOS DE DEMO
// ─────────────────────────────────────────────────────────────────────────────

interface DemoCheckIn {
  date: string;
  executed: boolean;
  difficulty: 1 | 2 | 3 | 4;
  failureReason: string | null;
  executionTime: string | null;
  energyLevel: string | null;
  gritScore: number;
}

/**
 * Gera 14 dias de dados com padrões detectáveis
 */
function generateDemoData(): DemoCheckIn[] {
  const data: DemoCheckIn[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Gera 14 dias para trás
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const dayOfWeek = date.getDay();

    // Define padrão por dia da semana
    let successRate = 0.6;
    let preferredHour = 7;
    let mainFailureReason = "Cansaço";

    switch (dayOfWeek) {
      case 0: // domingo
        successRate = 0.5;
        preferredHour = 9;
        mainFailureReason = "Dia caótico";
        break;
      case 1: // segunda
        successRate = 0.3;
        preferredHour = 7;
        mainFailureReason = "Cansaço";
        break;
      case 2: // terça
        successRate = 0.9;
        preferredHour = 7;
        mainFailureReason = "Esqueci";
        break;
      case 3: // quarta
        successRate = 0.8;
        preferredHour = 7;
        mainFailureReason = "Falta de tempo";
        break;
      case 4: // quinta
        successRate = 0.7;
        preferredHour = 16;
        mainFailureReason = "Distrações";
        break;
      case 5: // sexta
        successRate = 0.4;
        preferredHour = 21;
        mainFailureReason = "Baixa motivação";
        break;
      case 6: // sábado
        successRate = 0.5;
        preferredHour = 10;
        mainFailureReason = "Quebrei a rotina";
        break;
    }

    const executed = Math.random() < successRate;

    let difficulty: 1 | 2 | 3 | 4 = 2;
    let failureReason: string | null = null;
    let executionTime: string | null = null;
    let energyLevel: string | null = null;
    let gritScore = 0;

    if (executed) {
      difficulty =
        dayOfWeek === 1 || dayOfWeek === 5 ? 3 : dayOfWeek === 2 ? 1 : 2;

      // Horário de execução com variação
      const hour = preferredHour + Math.floor(Math.random() * 3 - 1);
      const minute = Math.floor(Math.random() * 60);
      
      // CORRIGIDO: criar novo Date object
      const execDate = new Date(date);
      execDate.setHours(hour, minute, 0, 0);
      executionTime = execDate.toISOString();

      // Energy level
      const posFactors = [
        "Boa energia",
        "Ambiente organizado",
        "Rotina estável",
        "Comecei pequeno",
        "Estava motivado",
        "Horário funcionou bem",
      ];
      energyLevel = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} · ${posFactors[Math.floor(Math.random() * posFactors.length)]}`;

      // Calcula Grit
      const difficultyWeight = difficulty / 2;
      const hourWeight = hour < 12 ? 1.0 : hour < 18 ? 1.1 : 1.3;
      gritScore = Math.round(difficultyWeight * hourWeight * 50) + 20;
    } else {
      difficulty = 1;
      failureReason = mainFailureReason;

      const negFactors = [
        "Mais energia",
        "Ambiente melhor",
        "Meta menor",
        "Lembrete",
        "Menos distração",
        "Preparação antes",
      ];
      energyLevel = `${String(preferredHour).padStart(2, "0")}:00 · ${negFactors[Math.floor(Math.random() * negFactors.length)]}`;

      gritScore = 0;
    }

    data.push({
      date: dateStr,
      executed,
      difficulty,
      failureReason,
      executionTime,
      energyLevel,
      gritScore,
    });
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 PATH Seed Script");
  console.log("─────────────────────────────────────────────────────────────");

  try {
    console.log("\n1️⃣  Usando usuário fixo para seed...");

const user = {
  id: "6b87993b-4b8f-4216-b058-6d6a6508cb56",
  email: "themilesledgerej@gmail.com",
};

console.log(`   ✓ Usuário: ${user.email}`);

    console.log("\n2️⃣  Verificando perfil de usuário...");
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, onboarding_done")
      .eq("id", user.id)
      .single();

if (profileError || !profile) {
  console.log("PROFILE ERROR:", profileError);
  console.log("PROFILE:", profile);

  console.error(
    "❌ Perfil não encontrado. Complete o onboarding primeiro."
  );

  process.exit(1);
}
    if (!profile.onboarding_done) {
      console.error("❌ Onboarding não completo. Finalize antes de fazer seed.");
      process.exit(1);
    }

    console.log(`   ✓ Perfil validado`);

    console.log("\n3️⃣  Buscando hábito ativo...");
    const { data: habit, error: habitError } = await supabase
      .from("habits")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("active", true)
      .single();

    if (habitError || !habit) {
      console.error("❌ Nenhum hábito ativo encontrado.");
      console.error("   Complete o onboarding ou crie um hábito em /profile");
      process.exit(1);
    }

    console.log(`   ✓ Hábito: "${habit.name}"`);

    console.log("\n4️⃣  Limpando check-ins anteriores...");
    const { error: deleteError } = await supabase
      .from("check_ins")
      .delete()
      .eq("user_id", user.id)
      .eq("habit_id", habit.id);

    if (deleteError) {
      console.warn(`   ⚠️  Aviso: ${deleteError.message}`);
    } else {
      console.log(`   ✓ Check-ins anteriores removidos`);
    }

    console.log("\n5️⃣  Gerando 14 dias de dados realistas...");
    const demoData = generateDemoData();
    console.log(`   ✓ ${demoData.length} check-ins gerados`);

    console.log("\n6️⃣  Salvando no Supabase...");
    const checkIns = demoData.map((item) => ({
      user_id: user.id,
      habit_id: habit.id,
      date: item.date,
      executed: item.executed,
      difficulty: item.difficulty,
      failure_reason: item.failureReason,
      check_in_time: item.executionTime || new Date().toISOString(),
      execution_time: item.executionTime,
      energy_level: item.energyLevel,
      grit_score: item.gritScore,
    }));

    const { error: insertError } = await supabase
      .from("check_ins")
      .insert(checkIns);

    if (insertError) {
      console.error(`❌ Erro ao inserir: ${insertError.message}`);
      process.exit(1);
    }

    console.log(`   ✓ ${checkIns.length} check-ins salvos`);

    console.log("\n📊 Resumo de Dados:");
    const successful = demoData.filter((d) => d.executed).length;
    const failed = demoData.filter((d) => !d.executed).length;
    const consistency = Math.round((successful / demoData.length) * 100);

    console.log(`   • Sucessos: ${successful}`);
    console.log(`   • Falhas: ${failed}`);
    console.log(`   • Consistência: ${consistency}%`);

    console.log("\n🔍 Padrões Criados (o app vai detectar):");
    console.log("   • Segundas: 30% sucesso → Briefing alertará sobre risco");
    console.log("   • Terças: 90% sucesso → Padrão mais forte da semana");
    console.log(
      "   • Sextas: 40% sucesso → Energia baixa + consistência fraca"
    );
    console.log("   • Manhãs (7h): 90% consistência → Horário ideal");
    console.log("   • Noites (21h): 30% consistência → Zona de risco");

    console.log("\n✅ Seed completo!");
    console.log(
      "─────────────────────────────────────────────────────────────"
    );
    console.log("\n🚀 Próximos passos:");
    console.log("   1. Abra http://localhost:3000");
    console.log("   2. Vá para Dashboard");
    console.log("   3. Veja o Briefing detectando padrões");
    console.log("   4. Vá para Insights e veja padrões");
    console.log("   5. Grit Ring mostrará progresso realista\n");
  } catch (err) {
    console.error("❌ Erro fatal:", err);
    process.exit(1);
  }
}

main();