-- Phase 11: notifications, automations. Same discipline as every migration
-- since ADR 0005: RLS enabled here. Neither table has a FK to another
-- owned table beyond `user_id` itself, so there's no additional
-- ownership check to add (see ADR 0014 for why `automations` doesn't
-- reference tasks/reviews directly — its trigger/condition live in jsonb,
-- evaluated in application code, not enforced by a FK).

-- ---------------------------------------------------------------------------
-- notifications (blueprint §I.9)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('critical', 'actionable', 'informational', 'silent_insight')),
  title text not null,
  body text,
  link text,
  source text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_read_at_idx on public.notifications (user_id, read_at);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using ((select auth.uid()) = user_id);
create policy "notifications_insert_own" on public.notifications
  for insert with check ((select auth.uid()) = user_id);
create policy "notifications_update_own" on public.notifications
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "notifications_delete_own" on public.notifications
  for delete using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- automations (blueprint §M.4 — Trigger -> Condition -> Action, declarative)
-- ---------------------------------------------------------------------------
create table public.automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  trigger_type text not null check (trigger_type in ('task_overdue', 'weekly_schedule')),
  trigger_config jsonb not null default '{}',
  condition jsonb,
  action_type text not null default 'create_notification' check (action_type in ('create_notification')),
  action_config jsonb not null default '{}',
  enabled boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index automations_user_id_enabled_idx on public.automations (user_id, enabled);

alter table public.automations enable row level security;

create policy "automations_select_own" on public.automations
  for select using ((select auth.uid()) = user_id);
create policy "automations_insert_own" on public.automations
  for insert with check ((select auth.uid()) = user_id);
create policy "automations_update_own" on public.automations
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "automations_delete_own" on public.automations
  for delete using ((select auth.uid()) = user_id);

create trigger automations_set_updated_at
  before update on public.automations
  for each row execute function public.set_updated_at();
