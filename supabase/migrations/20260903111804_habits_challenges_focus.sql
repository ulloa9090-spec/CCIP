-- Phase 7: habits, habit_logs, challenges, challenge_days, focus_sessions.
-- Same discipline as every migration since ADR 0005: RLS enabled here, FK
-- ownership checked in insert/update from the start. habit_logs and
-- challenge_days have no direct user_id (child/log tables) — every policy
-- joins to the parent (habits/challenges) for ownership, per the blueprint's
-- own rule (§I.9): "join/child tables ... use a policy that joins to the
-- parent's user_id."

-- ---------------------------------------------------------------------------
-- habits
-- ---------------------------------------------------------------------------
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  name text not null,
  description text,
  category text,
  frequency text not null default 'daily' check (frequency in ('daily', 'weekdays', 'weekly', 'custom')),
  custom_days smallint[],
  target int not null default 1,
  preferred_time time,
  start_date date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index habits_user_id_is_active_idx on public.habits (user_id, is_active);
create index habits_goal_id_idx on public.habits (goal_id);
create index habits_project_id_idx on public.habits (project_id);

alter table public.habits enable row level security;

create policy "habits_select_own" on public.habits
  for select using ((select auth.uid()) = user_id);
create policy "habits_insert_own" on public.habits
  for insert with check (
    (select auth.uid()) = user_id
    and (goal_id is null or exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid())))
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
  );
create policy "habits_update_own" on public.habits
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (goal_id is null or exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid())))
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
  );
create policy "habits_delete_own" on public.habits
  for delete using ((select auth.uid()) = user_id);

create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- habit_logs — one row per (habit, day) marked. No direct user_id.
-- ---------------------------------------------------------------------------
create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  log_date date not null,
  completed boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index habit_logs_habit_id_log_date_idx on public.habit_logs (habit_id, log_date);

alter table public.habit_logs enable row level security;

create policy "habit_logs_select_own" on public.habit_logs
  for select using (
    exists (select 1 from public.habits h where h.id = habit_logs.habit_id and h.user_id = (select auth.uid()))
  );
create policy "habit_logs_insert_own" on public.habit_logs
  for insert with check (
    exists (select 1 from public.habits h where h.id = habit_logs.habit_id and h.user_id = (select auth.uid()))
  );
create policy "habit_logs_update_own" on public.habit_logs
  for update using (
    exists (select 1 from public.habits h where h.id = habit_logs.habit_id and h.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.habits h where h.id = habit_logs.habit_id and h.user_id = (select auth.uid()))
  );
create policy "habit_logs_delete_own" on public.habit_logs
  for delete using (
    exists (select 1 from public.habits h where h.id = habit_logs.habit_id and h.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- challenges — 21-day challenge tracker (blueprint §I.9). No sidebar nav
-- entry of its own; reached from /habits (see ADR 0008).
-- ---------------------------------------------------------------------------
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete set null,
  title text not null,
  daily_action text,
  start_date date not null default current_date,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  final_score numeric,
  reflections text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index challenges_user_id_status_idx on public.challenges (user_id, status);
create index challenges_goal_id_idx on public.challenges (goal_id);

alter table public.challenges enable row level security;

create policy "challenges_select_own" on public.challenges
  for select using ((select auth.uid()) = user_id);
create policy "challenges_insert_own" on public.challenges
  for insert with check (
    (select auth.uid()) = user_id
    and (goal_id is null or exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid())))
  );
create policy "challenges_update_own" on public.challenges
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (goal_id is null or exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid())))
  );
create policy "challenges_delete_own" on public.challenges
  for delete using ((select auth.uid()) = user_id);

create trigger challenges_set_updated_at
  before update on public.challenges
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- challenge_days — exactly 21 rows per challenge, seeded at creation.
-- No direct user_id.
-- ---------------------------------------------------------------------------
create table public.challenge_days (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 21),
  completed boolean not null default false,
  note text,
  unique (challenge_id, day_number)
);

create index challenge_days_challenge_id_idx on public.challenge_days (challenge_id);

alter table public.challenge_days enable row level security;

create policy "challenge_days_select_own" on public.challenge_days
  for select using (
    exists (select 1 from public.challenges c where c.id = challenge_days.challenge_id and c.user_id = (select auth.uid()))
  );
create policy "challenge_days_insert_own" on public.challenge_days
  for insert with check (
    exists (select 1 from public.challenges c where c.id = challenge_days.challenge_id and c.user_id = (select auth.uid()))
  );
create policy "challenge_days_update_own" on public.challenge_days
  for update using (
    exists (select 1 from public.challenges c where c.id = challenge_days.challenge_id and c.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.challenges c where c.id = challenge_days.challenge_id and c.user_id = (select auth.uid()))
  );
create policy "challenge_days_delete_own" on public.challenge_days
  for delete using (
    exists (select 1 from public.challenges c where c.id = challenge_days.challenge_id and c.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- focus_sessions
-- ---------------------------------------------------------------------------
create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  context text,
  planned_minutes int,
  actual_minutes int not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  note text
);

create index focus_sessions_user_id_started_at_idx on public.focus_sessions (user_id, started_at);
create index focus_sessions_task_id_idx on public.focus_sessions (task_id);
create index focus_sessions_project_id_idx on public.focus_sessions (project_id);

alter table public.focus_sessions enable row level security;

create policy "focus_sessions_select_own" on public.focus_sessions
  for select using ((select auth.uid()) = user_id);
create policy "focus_sessions_insert_own" on public.focus_sessions
  for insert with check (
    (select auth.uid()) = user_id
    and (task_id is null or exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid())))
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
  );
create policy "focus_sessions_update_own" on public.focus_sessions
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (task_id is null or exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid())))
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
  );
create policy "focus_sessions_delete_own" on public.focus_sessions
  for delete using ((select auth.uid()) = user_id);
