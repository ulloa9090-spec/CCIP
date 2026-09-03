-- Phase 10: ai_threads, ai_messages, ai_insights. Same discipline as every
-- migration since ADR 0005: RLS enabled here, every FK to another owned
-- table ownership-checked from the start. ai_messages has no direct
-- user_id (blueprint §I.9) — ownership checked via join to its parent
-- thread, same pattern as habit_logs/challenge_days (Phase 7).

-- ---------------------------------------------------------------------------
-- ai_threads
-- ---------------------------------------------------------------------------
create table public.ai_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  context_type text not null check (
    context_type in ('morning_brief', 'evening_review', 'weekly_coach', 'planning', 'decision_assistant', 'freeform')
  ),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_threads_user_id_context_type_created_at_idx on public.ai_threads (user_id, context_type, created_at);

alter table public.ai_threads enable row level security;

create policy "ai_threads_select_own" on public.ai_threads
  for select using ((select auth.uid()) = user_id);
create policy "ai_threads_insert_own" on public.ai_threads
  for insert with check ((select auth.uid()) = user_id);
create policy "ai_threads_update_own" on public.ai_threads
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "ai_threads_delete_own" on public.ai_threads
  for delete using ((select auth.uid()) = user_id);

create trigger ai_threads_set_updated_at
  before update on public.ai_threads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ai_messages (no direct user_id — ownership via join to ai_threads)
-- ---------------------------------------------------------------------------
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_threads (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index ai_messages_thread_id_created_at_idx on public.ai_messages (thread_id, created_at);

alter table public.ai_messages enable row level security;

create policy "ai_messages_select_own" on public.ai_messages
  for select using (
    exists (select 1 from public.ai_threads t where t.id = ai_messages.thread_id and t.user_id = (select auth.uid()))
  );
create policy "ai_messages_insert_own" on public.ai_messages
  for insert with check (
    exists (select 1 from public.ai_threads t where t.id = ai_messages.thread_id and t.user_id = (select auth.uid()))
  );
create policy "ai_messages_delete_own" on public.ai_messages
  for delete using (
    exists (select 1 from public.ai_threads t where t.id = ai_messages.thread_id and t.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- ai_insights
-- ---------------------------------------------------------------------------
create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  thread_id uuid references public.ai_threads (id) on delete set null,
  type text not null check (type in ('plan_breakdown', 'suggest_reschedule')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_insights_user_id_status_idx on public.ai_insights (user_id, status);

alter table public.ai_insights enable row level security;

create policy "ai_insights_select_own" on public.ai_insights
  for select using ((select auth.uid()) = user_id);
create policy "ai_insights_insert_own" on public.ai_insights
  for insert with check (
    (select auth.uid()) = user_id
    and (thread_id is null or exists (select 1 from public.ai_threads t where t.id = thread_id and t.user_id = (select auth.uid())))
  );
create policy "ai_insights_update_own" on public.ai_insights
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (thread_id is null or exists (select 1 from public.ai_threads t where t.id = thread_id and t.user_id = (select auth.uid())))
  );
create policy "ai_insights_delete_own" on public.ai_insights
  for delete using ((select auth.uid()) = user_id);

create trigger ai_insights_set_updated_at
  before update on public.ai_insights
  for each row execute function public.set_updated_at();
