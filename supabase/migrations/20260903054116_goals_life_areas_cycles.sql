-- Phase 4: life_areas, quarter_cycles, goals, goal_metrics + RLS.
-- Milestones stay Project-scoped (Phase 5) — a 90-day cycle's "3 major
-- milestones" (master prompt §13) are a lightweight embedded jsonb field
-- on quarter_cycles instead of the relational milestones table. See
-- docs/decisions/0004-ninety-day-milestones-embedded.md.

-- ---------------------------------------------------------------------------
-- life_areas
-- ---------------------------------------------------------------------------
create table public.life_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text,
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index life_areas_user_name_key
  on public.life_areas (user_id, name)
  where deleted_at is null;

create index life_areas_user_id_idx on public.life_areas (user_id);

alter table public.life_areas enable row level security;

create policy "life_areas_select_own" on public.life_areas
  for select using ((select auth.uid()) = user_id);
create policy "life_areas_insert_own" on public.life_areas
  for insert with check ((select auth.uid()) = user_id);
create policy "life_areas_update_own" on public.life_areas
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "life_areas_delete_own" on public.life_areas
  for delete using ((select auth.uid()) = user_id);

create trigger life_areas_set_updated_at
  before update on public.life_areas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- quarter_cycles
-- ---------------------------------------------------------------------------
create table public.quarter_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  expected_outcome text,
  primary_indicator text,
  strategy text,
  risks text,
  -- Array of {title, target_date, done} objects, max 3 enforced in app validation.
  key_milestones jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quarter_cycles_dates_check check (end_date > start_date)
);

create index quarter_cycles_user_id_start_date_idx on public.quarter_cycles (user_id, start_date);

alter table public.quarter_cycles enable row level security;

create policy "quarter_cycles_select_own" on public.quarter_cycles
  for select using ((select auth.uid()) = user_id);
create policy "quarter_cycles_insert_own" on public.quarter_cycles
  for insert with check ((select auth.uid()) = user_id);
create policy "quarter_cycles_update_own" on public.quarter_cycles
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "quarter_cycles_delete_own" on public.quarter_cycles
  for delete using ((select auth.uid()) = user_id);

create trigger quarter_cycles_set_updated_at
  before update on public.quarter_cycles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area_id uuid not null references public.life_areas (id) on delete restrict,
  quarter_cycle_id uuid references public.quarter_cycles (id) on delete set null,
  title text not null,
  description text,
  timeframe text not null default '90day'
    check (timeframe in ('lifetime', '5yr', '3yr', '1yr', '90day', 'monthly')),
  target_date date,
  status text not null default 'planned'
    check (status in ('planned', 'active', 'paused', 'completed', 'cancelled')),
  priority smallint,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index goals_user_id_status_idx on public.goals (user_id, status);
create index goals_area_id_idx on public.goals (area_id);
create index goals_quarter_cycle_id_idx on public.goals (quarter_cycle_id);

alter table public.goals enable row level security;

create policy "goals_select_own" on public.goals
  for select using ((select auth.uid()) = user_id);
create policy "goals_insert_own" on public.goals
  for insert with check ((select auth.uid()) = user_id);
create policy "goals_update_own" on public.goals
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goals_delete_own" on public.goals
  for delete using ((select auth.uid()) = user_id);

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- goal_metrics — at most one per goal in the Phase 4 UI (enforced by the
-- unique index below, so a "set metric" action can upsert with ON CONFLICT).
-- ---------------------------------------------------------------------------
create table public.goal_metrics (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  metric_name text not null,
  starting_value numeric,
  target_value numeric,
  current_value numeric,
  unit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index goal_metrics_goal_id_key on public.goal_metrics (goal_id);

alter table public.goal_metrics enable row level security;

create policy "goal_metrics_select_own" on public.goal_metrics
  for select using (
    exists (select 1 from public.goals g where g.id = goal_metrics.goal_id and g.user_id = (select auth.uid()))
  );
create policy "goal_metrics_insert_own" on public.goal_metrics
  for insert with check (
    exists (select 1 from public.goals g where g.id = goal_metrics.goal_id and g.user_id = (select auth.uid()))
  );
create policy "goal_metrics_update_own" on public.goal_metrics
  for update using (
    exists (select 1 from public.goals g where g.id = goal_metrics.goal_id and g.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.goals g where g.id = goal_metrics.goal_id and g.user_id = (select auth.uid()))
  );
create policy "goal_metrics_delete_own" on public.goal_metrics
  for delete using (
    exists (select 1 from public.goals g where g.id = goal_metrics.goal_id and g.user_id = (select auth.uid()))
  );

create trigger goal_metrics_set_updated_at
  before update on public.goal_metrics
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed 8 default Life Areas on signup (master prompt §11). Extends the
-- existing handle_new_user() trigger from Phase 2 rather than adding a
-- second trigger, so provisioning stays one atomic step.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, timezone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC'));

  insert into public.settings (user_id)
  values (new.id);

  insert into public.life_areas (user_id, name, color, icon, sort_order)
  values
    (new.id, 'Personal', '#8b5cf6', 'user', 0),
    (new.id, 'Family', '#f43f5e', 'heart', 1),
    (new.id, 'Career', '#3b82f6', 'briefcase', 2),
    (new.id, 'Business', '#f59e0b', 'trending-up', 3),
    (new.id, 'Finance', '#10b981', 'dollar-sign', 4),
    (new.id, 'Education', '#6366f1', 'graduation-cap', 5),
    (new.id, 'Health', '#ef4444', 'activity', 6),
    (new.id, 'Projects', '#06b6d4', 'folder-kanban', 7);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
