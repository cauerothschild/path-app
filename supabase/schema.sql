-- PATH — Schema do banco de dados
-- Cole no SQL Editor do Supabase e execute.

create extension if not exists "uuid-ossp";

-- ============================================
-- users (estende auth.users)
-- ============================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now(),
  display_name text,                     -- Pergunta 1: como te chamar
  target_habit text,                     -- Pergunta 2: hábito alvo
  daily_anchor text,                     -- Pergunta 3: âncora diária
  main_obstacles text[],                 -- Pergunta 4: obstáculos (array)
  onboarding_done boolean default false
);

-- ============================================
-- habits
-- ============================================
create table if not exists public.habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  name text not null,
  preferred_time text default 'morning',
  target_duration_min integer default 30,
  current_time text default '08:00',
  current_anchor text,
  created_at timestamptz default now(),
  active boolean default true
);

-- ============================================
-- check_ins (núcleo do dado)
-- ============================================
create table if not exists public.check_ins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  habit_id uuid references public.habits(id) on delete cascade,
  date date not null default current_date,
  executed boolean not null,
  difficulty smallint default 2,
  failure_reason text,
  check_in_time timestamptz default now(),
  app_open_time timestamptz,
  response_speed_ms integer,
  grit_score numeric(5,2),
  unique (user_id, habit_id, date)
);

-- ============================================
-- daily_context (Camada 1 passiva)
-- ============================================
create table if not exists public.daily_context (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  date date not null default current_date,
  first_open_time timestamptz,
  open_count integer default 1,
  unique (user_id, date)
);

create index if not exists idx_checkins_user_date on public.check_ins(user_id, date desc);
create index if not exists idx_checkins_user_habit on public.check_ins(user_id, habit_id);
create index if not exists idx_context_user_date on public.daily_context(user_id, date desc);

alter table public.users enable row level security;
alter table public.habits enable row level security;
alter table public.check_ins enable row level security;
alter table public.daily_context enable row level security;

create policy "users_self_read" on public.users for select using (auth.uid() = id);
create policy "users_self_update" on public.users for update using (auth.uid() = id);
create policy "users_self_insert" on public.users for insert with check (auth.uid() = id);

create policy "habits_self_all" on public.habits for all using (auth.uid() = user_id);
create policy "checkins_self_all" on public.check_ins for all using (auth.uid() = user_id);
create policy "context_self_all" on public.daily_context for all using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
