-- Phase 9: weekly_reviews, monthly_reviews. Same discipline as every
-- migration since ADR 0005: RLS enabled here, the one FK to another owned
-- table (weekly_reviews.next_week_mio_task_id) ownership-checked from the
-- start.

-- ---------------------------------------------------------------------------
-- weekly_reviews
-- ---------------------------------------------------------------------------
create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start_date date not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  auto_summary jsonb not null default '{}',
  reflection_completed text,
  reflection_missed text,
  reflection_why text,
  reflection_progress text,
  reflection_time_wasted text,
  reflection_stop_doing text,
  reflection_learned text,
  next_week_mio_task_id uuid references public.tasks (id) on delete set null,
  execution_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

create index weekly_reviews_user_id_week_start_date_idx on public.weekly_reviews (user_id, week_start_date);

alter table public.weekly_reviews enable row level security;

create policy "weekly_reviews_select_own" on public.weekly_reviews
  for select using ((select auth.uid()) = user_id);
create policy "weekly_reviews_insert_own" on public.weekly_reviews
  for insert with check (
    (select auth.uid()) = user_id
    and (next_week_mio_task_id is null or exists (select 1 from public.tasks t where t.id = next_week_mio_task_id and t.user_id = (select auth.uid())))
  );
create policy "weekly_reviews_update_own" on public.weekly_reviews
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (next_week_mio_task_id is null or exists (select 1 from public.tasks t where t.id = next_week_mio_task_id and t.user_id = (select auth.uid())))
  );
create policy "weekly_reviews_delete_own" on public.weekly_reviews
  for delete using ((select auth.uid()) = user_id);

create trigger weekly_reviews_set_updated_at
  before update on public.weekly_reviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- monthly_reviews
-- ---------------------------------------------------------------------------
create table public.monthly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  auto_summary jsonb not null default '{}',
  wins text,
  failures text,
  lessons text,
  next_month_priorities text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

create index monthly_reviews_user_id_month_idx on public.monthly_reviews (user_id, month);

alter table public.monthly_reviews enable row level security;

create policy "monthly_reviews_select_own" on public.monthly_reviews
  for select using ((select auth.uid()) = user_id);
create policy "monthly_reviews_insert_own" on public.monthly_reviews
  for insert with check ((select auth.uid()) = user_id);
create policy "monthly_reviews_update_own" on public.monthly_reviews
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "monthly_reviews_delete_own" on public.monthly_reviews
  for delete using ((select auth.uid()) = user_id);

create trigger monthly_reviews_set_updated_at
  before update on public.monthly_reviews
  for each row execute function public.set_updated_at();
