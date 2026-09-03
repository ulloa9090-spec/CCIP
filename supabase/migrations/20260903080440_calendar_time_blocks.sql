-- Phase 6: calendar_events, time_blocks. Same discipline as every migration
-- since ADR 0005: RLS enabled here, FK ownership checked in insert/update
-- from the start (time_blocks.task_id / project_id).

-- ---------------------------------------------------------------------------
-- calendar_events — standalone events (meetings, appointments), unrelated to
-- task execution. Rendered on the Calendar grid as a solid block (§I.5).
-- ---------------------------------------------------------------------------
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (end_at > start_at)
);

create index calendar_events_user_id_start_at_idx on public.calendar_events (user_id, start_at);

alter table public.calendar_events enable row level security;

create policy "calendar_events_select_own" on public.calendar_events
  for select using ((select auth.uid()) = user_id);
create policy "calendar_events_insert_own" on public.calendar_events
  for insert with check ((select auth.uid()) = user_id);
create policy "calendar_events_update_own" on public.calendar_events
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "calendar_events_delete_own" on public.calendar_events
  for delete using ((select auth.uid()) = user_id);

create trigger calendar_events_set_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- time_blocks — a committed slot of time, optionally tied to a task/project.
-- Rendered on the Calendar grid as a filled block colored by focus_context
-- (§I.5); the mechanism behind Flow 8's "schedule a task as a Time Block".
-- Overlapping blocks are allowed by design (soft warning in the UI, not a
-- DB constraint) — blueprint Flow 8, the user's call.
-- ---------------------------------------------------------------------------
create table public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  focus_context text check (focus_context in ('deep_work', 'study', 'planning', 'family', 'exercise', 'admin', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (end_at > start_at)
);

create index time_blocks_user_id_start_at_idx on public.time_blocks (user_id, start_at);
create index time_blocks_task_id_idx on public.time_blocks (task_id);
create index time_blocks_project_id_idx on public.time_blocks (project_id);

alter table public.time_blocks enable row level security;

create policy "time_blocks_select_own" on public.time_blocks
  for select using ((select auth.uid()) = user_id);
create policy "time_blocks_insert_own" on public.time_blocks
  for insert with check (
    (select auth.uid()) = user_id
    and (task_id is null or exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid())))
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
  );
create policy "time_blocks_update_own" on public.time_blocks
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (task_id is null or exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid())))
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
  );
create policy "time_blocks_delete_own" on public.time_blocks
  for delete using ((select auth.uid()) = user_id);

create trigger time_blocks_set_updated_at
  before update on public.time_blocks
  for each row execute function public.set_updated_at();
