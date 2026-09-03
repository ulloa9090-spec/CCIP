-- Phase 8: decisions, journal_entries, ideas. Same discipline as every
-- migration since ADR 0005: RLS enabled here, FK ownership checked in
-- insert/update from the start. decisions is created first since
-- journal_entries.decision_id references it.

-- ---------------------------------------------------------------------------
-- decisions — no sidebar nav entry of its own; reached from /journal
-- (ADR 0010, mirroring ADR 0008's placement of Challenges under /habits).
-- ---------------------------------------------------------------------------
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,
  title text not null,
  context text,
  options jsonb not null default '[]',
  chosen_option text,
  reasoning text,
  decided_at timestamptz not null default now(),
  expected_outcome text,
  review_date date,
  actual_outcome text,
  lesson text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index decisions_user_id_review_date_idx on public.decisions (user_id, review_date);
create index decisions_goal_id_idx on public.decisions (goal_id);
create index decisions_project_id_idx on public.decisions (project_id);
create index decisions_task_id_idx on public.decisions (task_id);

alter table public.decisions enable row level security;

create policy "decisions_select_own" on public.decisions
  for select using ((select auth.uid()) = user_id);
create policy "decisions_insert_own" on public.decisions
  for insert with check (
    (select auth.uid()) = user_id
    and (goal_id is null or exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid())))
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
    and (task_id is null or exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid())))
  );
create policy "decisions_update_own" on public.decisions
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (goal_id is null or exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid())))
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
    and (task_id is null or exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid())))
  );
create policy "decisions_delete_own" on public.decisions
  for delete using ((select auth.uid()) = user_id);

create trigger decisions_set_updated_at
  before update on public.decisions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- journal_entries
-- ---------------------------------------------------------------------------
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null default 'free_note'
    check (category in ('daily_reflection', 'learning', 'win', 'problem', 'observation', 'free_note')),
  body text not null,
  goal_id uuid references public.goals (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,
  decision_id uuid references public.decisions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index journal_entries_user_id_created_at_idx on public.journal_entries (user_id, created_at);
create index journal_entries_goal_id_idx on public.journal_entries (goal_id);
create index journal_entries_project_id_idx on public.journal_entries (project_id);
create index journal_entries_task_id_idx on public.journal_entries (task_id);
create index journal_entries_decision_id_idx on public.journal_entries (decision_id);

alter table public.journal_entries enable row level security;

create policy "journal_entries_select_own" on public.journal_entries
  for select using ((select auth.uid()) = user_id);
create policy "journal_entries_insert_own" on public.journal_entries
  for insert with check (
    (select auth.uid()) = user_id
    and (goal_id is null or exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid())))
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
    and (task_id is null or exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid())))
    and (decision_id is null or exists (select 1 from public.decisions d where d.id = decision_id and d.user_id = (select auth.uid())))
  );
create policy "journal_entries_update_own" on public.journal_entries
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (goal_id is null or exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid())))
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
    and (task_id is null or exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid())))
    and (decision_id is null or exists (select 1 from public.decisions d where d.id = decision_id and d.user_id = (select auth.uid())))
  );
create policy "journal_entries_delete_own" on public.journal_entries
  for delete using ((select auth.uid()) = user_id);

create trigger journal_entries_set_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ideas — Idea Parking Lot (blueprint §I.7). Status flow:
-- new -> review_later -> evaluating -> promoted | rejected -> archived.
-- ---------------------------------------------------------------------------
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  category text,
  status text not null default 'new'
    check (status in ('new', 'review_later', 'evaluating', 'promoted', 'rejected', 'archived')),
  impact smallint check (impact between 1 and 5),
  effort smallint check (effort between 1 and 5),
  urgency smallint check (urgency between 1 and 5),
  notes text,
  review_date date,
  promoted_project_id uuid references public.projects (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index ideas_user_id_status_idx on public.ideas (user_id, status);
create index ideas_promoted_project_id_idx on public.ideas (promoted_project_id);

alter table public.ideas enable row level security;

create policy "ideas_select_own" on public.ideas
  for select using ((select auth.uid()) = user_id);
create policy "ideas_insert_own" on public.ideas
  for insert with check (
    (select auth.uid()) = user_id
    and (promoted_project_id is null or exists (select 1 from public.projects p where p.id = promoted_project_id and p.user_id = (select auth.uid())))
  );
create policy "ideas_update_own" on public.ideas
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (promoted_project_id is null or exists (select 1 from public.projects p where p.id = promoted_project_id and p.user_id = (select auth.uid())))
  );
create policy "ideas_delete_own" on public.ideas
  for delete using ((select auth.uid()) = user_id);

create trigger ideas_set_updated_at
  before update on public.ideas
  for each row execute function public.set_updated_at();
