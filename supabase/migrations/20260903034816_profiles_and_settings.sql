-- Phase 2: identity-scoped schema (profiles, settings) + RLS + signup provisioning.
-- Domain tables (goals, projects, tasks, habits, ...) are added by their own
-- phases (Phase 0 blueprint §T) rather than all at once here.

-- ---------------------------------------------------------------------------
-- Shared helper: keep updated_at current on every UPDATE. Reused by every
-- future table in this project, defined once here.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — 1:1 with auth.users (Phase 0 blueprint §I.9)
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  timezone text not null default 'UTC',
  week_start_day smallint not null default 1 check (week_start_day between 0 and 6),
  working_hours jsonb,
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per user. Created automatically by handle_new_user() on signup.';

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No insert/delete policy for the authenticated role: rows are created only
-- by handle_new_user() (security definer) and removed only via the
-- auth.users cascade — never directly by a user.

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- settings — per-user app preferences beyond profile (Phase 0 blueprint §I.9)
-- ---------------------------------------------------------------------------
create table public.settings (
  user_id uuid primary key references public.profiles (user_id) on delete cascade,
  notification_prefs jsonb not null default '{}'::jsonb,
  ai_provider text,
  privacy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.settings is 'One row per user. Created automatically by handle_new_user() on signup.';

alter table public.settings enable row level security;

create policy "settings_select_own" on public.settings
  for select using (auth.uid() = user_id);

create policy "settings_update_own" on public.settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-provisioning: every new auth.users row gets a profiles + settings row.
-- security definer is required to insert into public.profiles/settings on
-- behalf of a user who has no session yet (signup is not authenticated at
-- the moment auth.users is inserted).
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

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
