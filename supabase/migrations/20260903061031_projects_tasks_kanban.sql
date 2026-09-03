-- Phase 5: projects, milestones, tasks, tags, task_tags, weekly_priorities.
-- Every FK to an owned table is ownership-checked in insert/update policies
-- from the start (ADR 0005 — the Phase 4 RLS test caught this gap once,
-- it should not need catching again).

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete set null,
  name text not null,
  description text,
  status text not null default 'someday'
    check (status in ('active', 'secondary', 'waiting', 'someday', 'completed', 'archived')),
  is_primary_active boolean not null default false,
  priority smallint,
  start_date date,
  deadline date,
  progress_override numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- The Active Project rule (blueprint §D.2): at most one primary active
-- project per user, enforced at the database, not just the UI.
create unique index projects_primary_active_key
  on public.projects (user_id)
  where is_primary_active = true;

create index projects_user_id_status_idx on public.projects (user_id, status);
create index projects_goal_id_idx on public.projects (goal_id);

alter table public.projects enable row level security;

create policy "projects_select_own" on public.projects
  for select using ((select auth.uid()) = user_id);
create policy "projects_insert_own" on public.projects
  for insert with check (
    (select auth.uid()) = user_id
    and (
      goal_id is null
      or exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid()))
    )
  );
create policy "projects_update_own" on public.projects
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      goal_id is null
      or exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid()))
    )
  );
create policy "projects_delete_own" on public.projects
  for delete using ((select auth.uid()) = user_id);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- milestones — Project-scoped (ADR 0004: 90-Day Cycle milestones are a
-- separate, embedded concept, not this table).
-- ---------------------------------------------------------------------------
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  target_date date,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index milestones_project_id_idx on public.milestones (project_id, sort_order);

alter table public.milestones enable row level security;

create policy "milestones_select_own" on public.milestones
  for select using (
    exists (select 1 from public.projects p where p.id = milestones.project_id and p.user_id = (select auth.uid()))
  );
create policy "milestones_insert_own" on public.milestones
  for insert with check (
    exists (select 1 from public.projects p where p.id = milestones.project_id and p.user_id = (select auth.uid()))
  );
create policy "milestones_update_own" on public.milestones
  for update using (
    exists (select 1 from public.projects p where p.id = milestones.project_id and p.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.projects p where p.id = milestones.project_id and p.user_id = (select auth.uid()))
  );
create policy "milestones_delete_own" on public.milestones
  for delete using (
    exists (select 1 from public.projects p where p.id = milestones.project_id and p.user_id = (select auth.uid()))
  );

create trigger milestones_set_updated_at
  before update on public.milestones
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  goal_id uuid references public.goals (id) on delete set null,
  milestone_id uuid references public.milestones (id) on delete set null,
  title text not null,
  description text,
  status text not null default 'inbox'
    check (status in ('inbox', 'next', 'today', 'in_progress', 'waiting', 'done', 'cancelled')),
  priority text not null default 'medium' check (priority in ('critical', 'high', 'medium', 'low')),
  due_date date,
  scheduled_date date,
  estimated_minutes int,
  actual_minutes int,
  energy_level text check (energy_level in ('low', 'medium', 'high')),
  context text,
  is_mit boolean not null default false,
  recurrence_rule jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index tasks_user_id_status_idx on public.tasks (user_id, status);
create index tasks_user_id_scheduled_date_idx on public.tasks (user_id, scheduled_date);
create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_goal_id_idx on public.tasks (goal_id);
create index tasks_milestone_id_idx on public.tasks (milestone_id);

alter table public.tasks enable row level security;

create policy "tasks_select_own" on public.tasks
  for select using ((select auth.uid()) = user_id);
create policy "tasks_insert_own" on public.tasks
  for insert with check (
    (select auth.uid()) = user_id
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
    and (goal_id is null or exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid())))
    and (milestone_id is null or exists (
      select 1 from public.milestones m join public.projects p on p.id = m.project_id
      where m.id = milestone_id and p.user_id = (select auth.uid())
    ))
  );
create policy "tasks_update_own" on public.tasks
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
    and (goal_id is null or exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid())))
    and (milestone_id is null or exists (
      select 1 from public.milestones m join public.projects p on p.id = m.project_id
      where m.id = milestone_id and p.user_id = (select auth.uid())
    ))
  );
create policy "tasks_delete_own" on public.tasks
  for delete using ((select auth.uid()) = user_id);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tags / task_tags
-- ---------------------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index tags_user_id_name_key on public.tags (user_id, name);

alter table public.tags enable row level security;

create policy "tags_select_own" on public.tags
  for select using ((select auth.uid()) = user_id);
create policy "tags_insert_own" on public.tags
  for insert with check ((select auth.uid()) = user_id);
create policy "tags_update_own" on public.tags
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tags_delete_own" on public.tags
  for delete using ((select auth.uid()) = user_id);

create table public.task_tags (
  task_id uuid not null references public.tasks (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (task_id, tag_id)
);

alter table public.task_tags enable row level security;

create policy "task_tags_select_own" on public.task_tags
  for select using (
    exists (select 1 from public.tasks t where t.id = task_tags.task_id and t.user_id = (select auth.uid()))
  );
create policy "task_tags_insert_own" on public.task_tags
  for insert with check (
    exists (select 1 from public.tasks t where t.id = task_tags.task_id and t.user_id = (select auth.uid()))
    and exists (select 1 from public.tags g where g.id = task_tags.tag_id and g.user_id = (select auth.uid()))
  );
create policy "task_tags_delete_own" on public.task_tags
  for delete using (
    exists (select 1 from public.tasks t where t.id = task_tags.task_id and t.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- weekly_priorities — a flag row on a task for a given week, capped at 3
-- per (user, week) by the application layer (features/tasks/actions.ts).
-- ---------------------------------------------------------------------------
create table public.weekly_priorities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  week_start_date date not null,
  is_most_important_outcome boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index weekly_priorities_user_week_task_key
  on public.weekly_priorities (user_id, week_start_date, task_id);
create index weekly_priorities_user_week_idx on public.weekly_priorities (user_id, week_start_date);

alter table public.weekly_priorities enable row level security;

create policy "weekly_priorities_select_own" on public.weekly_priorities
  for select using ((select auth.uid()) = user_id);
create policy "weekly_priorities_insert_own" on public.weekly_priorities
  for insert with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()))
  );
create policy "weekly_priorities_update_own" on public.weekly_priorities
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "weekly_priorities_delete_own" on public.weekly_priorities
  for delete using ((select auth.uid()) = user_id);
