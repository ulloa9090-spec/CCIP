# Database

Live schema for `atlas-os-development` (see [`ENVIRONMENT.md`](./ENVIRONMENT.md)). Full target schema for the whole app is specified conceptually in [`PHASE_0_BLUEPRINT.md`](./PHASE_0_BLUEPRINT.md) §I; this file documents what's actually **built**, updated as each phase adds its own tables (Phase 2 scope decision — see `decisions/0001-phase-2-schema-scope.md`).

## Migrations

All migrations live in `supabase/migrations/`, applied via `mcp__Supabase__apply_migration` and committed to the repo byte-identical to what was applied (verified against `list_migrations` after each apply). Never hand-edit the schema outside a migration file.

| Version | Name | Purpose |
|---|---|---|
| `20260903034816` | `profiles_and_settings` | Creates `profiles`, `settings`, RLS policies, `updated_at` triggers, and the `handle_new_user()` signup trigger. |
| `20260903034846` | `harden_trigger_functions` | Pins `search_path` on `set_updated_at`; revokes public PostgREST RPC exposure on both trigger functions. |
| `20260903034901` | `revoke_handle_new_user_rpc` | Closes the same RPC exposure via Supabase's default per-function grants to `anon`/`authenticated` (the previous migration's `revoke ... from public` didn't reach these). |
| `20260903034919` | `optimize_rls_initplan` | Rewrites all four RLS policies to `(select auth.uid())` per Supabase's performance advisor, so `auth.uid()` is evaluated once per query, not once per row. |
| `20260903054116` | `goals_life_areas_cycles` | Creates `life_areas`, `quarter_cycles`, `goals`, `goal_metrics`, full RLS, indexes, `updated_at` triggers; extends `handle_new_user()` to seed 8 default Life Areas per signup. |
| `20260903055200` | `goals_ownership_check` | Fixes a real gap the Phase 4 RLS isolation test caught: `goals_insert_own`/`goals_update_own` now also verify `area_id` and `quarter_cycle_id` belong to the same user, not just `user_id` — see ADR 0005. |
| `20260903061031` | `projects_tasks_kanban` | Creates `projects`, `milestones`, `tasks`, `tags`, `task_tags`, `weekly_priorities`, full RLS with FK ownership checks from the start (ADR 0005 applied proactively — clean on first `get_advisors` run, no follow-up fix needed), the Active Project partial unique index, and `updated_at` triggers. |
| `20260903062608` | `tasks_kanban_missing_fk_indexes` | Adds the two FK-covering indexes (`task_tags.tag_id`, `weekly_priorities.task_id`) the performance advisor flagged as missing after the previous migration. |
| `20260903080440` | `calendar_time_blocks` | Creates `calendar_events`, `time_blocks`, full RLS with FK ownership checks on `time_blocks.task_id`/`project_id` from the start (ADR 0005), indexed on `(user_id, start_at)`. `get_advisors` clean on first run — no follow-up fix needed. |
| `20260903111804` | `habits_challenges_focus` | Creates `habits`, `habit_logs`, `challenges`, `challenge_days`, `focus_sessions`, full RLS with FK ownership checks from the start (ADR 0005); `habit_logs`/`challenge_days` (no direct `user_id`) ownership-checked via join to their parent. `get_advisors` clean on first run — no follow-up fix needed. |
| `20260903161040` | `journal_ideas_decisions` | Creates `decisions`, `journal_entries`, `ideas` (in that order, since `journal_entries.decision_id` references `decisions`), full RLS with FK ownership checks from the start (ADR 0005). `get_advisors` clean on first run — no follow-up fix needed. |
| `20260903163819` | `reviews` | Creates `weekly_reviews`, `monthly_reviews`, full RLS with an FK ownership check on `weekly_reviews.next_week_mio_task_id` (ADR 0005), indexes on `(user_id, week_start_date)` / `(user_id, month)`, `updated_at` triggers. `get_advisors` clean on first run — no follow-up fix needed. |
| `20260903211921` | `ai_layer` | Creates `ai_threads`, `ai_messages`, `ai_insights`, full RLS — `ai_messages` ownership-checked via join to its parent thread (no direct `user_id`), `ai_insights` FK-ownership-checked on `thread_id` (ADR 0005). `get_advisors` clean on first run — no follow-up fix needed. |

`get_advisors` (security) reports zero findings as of the last migration. Performance advisor findings are limited to informational "unused index" notices expected on a fresh dev database with no query traffic history.

## Tables

### `profiles`
One row per user, 1:1 with `auth.users` (`user_id` is both PK and FK, `on delete cascade`). Created automatically by `handle_new_user()` — never by the client.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | PK, FK → `auth.users(id)` |
| `full_name` | text | nullable |
| `timezone` | text | default `'UTC'` |
| `week_start_day` | smallint | default `1` (Monday), check 0–6 |
| `working_hours` | jsonb | nullable |
| `theme` | text | default `'dark'`, check in (`dark`,`light`) |
| `created_at` / `updated_at` | timestamptz | `updated_at` auto-maintained by trigger |

**RLS**: `profiles_select_own`, `profiles_update_own` — both `(select auth.uid()) = user_id`. No insert/delete policy: rows are created only by the security-definer trigger and removed only via the `auth.users` cascade.

### `settings`
One row per user, 1:1 with `profiles` (`user_id` PK/FK → `profiles(user_id)`, `on delete cascade`). Also auto-created by `handle_new_user()`.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | PK, FK → `profiles(user_id)` |
| `notification_prefs` | jsonb | default `{}` |
| `ai_provider` | text | nullable — per-user override of `AI_PROVIDER` (`anthropic`\|`openai`\|`local`), set via Settings; `null` falls back to the deployment default (Phase 10) |
| `privacy` | jsonb | default `{}` |
| `created_at` / `updated_at` | timestamptz | |

**RLS**: `settings_select_own`, `settings_update_own` — same pattern as `profiles`.

## Shared function: `set_updated_at()`

Trigger function, `before update`, sets `NEW.updated_at = now()`. Reused by every future table — defined once here rather than duplicated per migration. `search_path` pinned to `public`; not exposed as a PostgREST RPC (`revoke execute ... from public`).

## Auto-provisioning: `handle_new_user()`

`security definer` trigger on `auth.users` (`after insert`) that inserts the corresponding `profiles` and `settings` rows. Runs as the function owner (not the new, still-unauthenticated user), which is why `security definer` is required — RLS would otherwise block the insert since the new user has no session yet at the moment `auth.users` gains a row. Not exposed as an RPC (`revoke execute ... from anon, authenticated`) — it must only ever run as a trigger.

### `life_areas`
One row per Life Area. 8 default rows (Personal, Family, Career, Business, Finance, Education, Health, Projects) auto-created by `handle_new_user()` on signup, per master prompt §11; users can add more.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `name` | text | unique per user among non-deleted rows |
| `color` / `icon` | text | nullable, seeded for the 8 defaults |
| `sort_order` | int | default `0` |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | soft delete |

**RLS**: full CRUD (`select`/`insert`/`update`/`delete`), all `(select auth.uid()) = user_id`.

### `quarter_cycles`
A 90-Day cycle. `key_milestones` is the embedded "3 major milestones" field — see ADR 0004 for why this isn't the relational `milestones` table.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `name`, `expected_outcome`, `primary_indicator`, `strategy`, `risks` | text | nullable except `name` |
| `start_date` / `end_date` | date | not null, `end_date > start_date` |
| `key_milestones` | jsonb | array of `{title, targetDate, done}`, default `[]`, capped at 3 by app validation |
| `created_at` / `updated_at` | timestamptz | |

**RLS**: full CRUD, `(select auth.uid()) = user_id`.

### `goals`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `area_id` | uuid | FK → `life_areas(id)`, not null, `on delete restrict` |
| `quarter_cycle_id` | uuid | FK → `quarter_cycles(id)`, nullable, `on delete set null` |
| `title`, `description`, `notes` | text | `title` not null |
| `timeframe` | text | check in (`lifetime`,`5yr`,`3yr`,`1yr`,`90day`,`monthly`), default `90day` |
| `status` | text | check in (`planned`,`active`,`paused`,`completed`,`cancelled`), default `planned` |
| `target_date` | date | nullable |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | soft delete |

**RLS**: full CRUD, `(select auth.uid()) = user_id` **plus** — since the Phase 4 RLS isolation test found this was necessary (ADR 0005) — `insert`/`update` also verify `area_id` and (when set) `quarter_cycle_id` belong to a row owned by that same user, via `exists` subqueries against `life_areas`/`quarter_cycles`.

### `goal_metrics`
At most one per goal (`unique(goal_id)`), so the app can `upsert` with `on conflict`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `goal_id` | uuid | FK → `goals(id)`, `on delete cascade` |
| `metric_name` | text | not null |
| `starting_value` / `target_value` / `current_value` | numeric | nullable |
| `unit` | text | nullable |

**RLS**: no direct `user_id` column — every policy checks `exists (select 1 from goals g where g.id = goal_metrics.goal_id and g.user_id = (select auth.uid()))`.

### `projects`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `goal_id` | uuid | FK → `goals(id)`, nullable, `on delete set null` |
| `name`, `description`, `notes` | text | `name` not null |
| `status` | text | check in (`active`,`secondary`,`waiting`,`someday`,`completed`,`archived`), default `someday` |
| `is_primary_active` | boolean | default `false` — see the Active Project rule below |
| `priority` | smallint | nullable |
| `start_date` / `deadline` | date | nullable |
| `progress_override` | numeric | nullable — manual override for `computeProjectProgress()` (blueprint §K) |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | soft delete |

**Active Project rule** (blueprint §D.2/§0.6): `projects_primary_active_key` is a partial unique index — `unique (user_id) where is_primary_active = true` — so the database itself, not just the UI, guarantees at most one primary-active project per user. The app's conflict-resolution flow (`attemptSetPrimary` → Replace/Make Secondary/Cancel in `PrimaryProjectControl`) exists because a naive `update ... set is_primary_active = true` would otherwise hit this constraint and fail; "Send to Parking Lot" isn't offered yet since Ideas don't exist until Phase 8.

**RLS**: full CRUD, `(select auth.uid()) = user_id` **plus** `insert`/`update` verify `goal_id` (when set) belongs to a goal owned by that same user (ADR 0005).

### `milestones`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `project_id` | uuid | FK → `projects(id)`, `on delete cascade` |
| `title` | text | not null |
| `target_date` | date | nullable |
| `status` | text | check in (`pending`,`in_progress`,`done`), default `pending` |
| `sort_order` | int | default `0` |

**RLS**: no direct `user_id` column — every policy checks `exists (select 1 from projects p where p.id = milestones.project_id and p.user_id = (select auth.uid()))`.

### `tasks`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `project_id` | uuid | FK → `projects(id)`, nullable, `on delete set null` |
| `goal_id` | uuid | FK → `goals(id)`, nullable, `on delete set null` |
| `milestone_id` | uuid | FK → `milestones(id)`, nullable, `on delete set null` |
| `title`, `description`, `context` | text | `title` not null |
| `status` | text | check in (`inbox`,`next`,`today`,`in_progress`,`waiting`,`done`,`cancelled`), default `inbox` — the Kanban board's columns are a subset (`inbox`,`next`,`today`,`in_progress`,`done`) |
| `priority` | text | check in (`critical`,`high`,`medium`,`low`), default `medium` |
| `due_date` / `scheduled_date` | date | nullable |
| `estimated_minutes` / `actual_minutes` | int | nullable |
| `energy_level` | text | nullable, check in (`low`,`medium`,`high`) |
| `is_mit` | boolean | default `false` — at most one true per user, enforced at the app layer (`setMostImportantTask` clears any other first) |
| `recurrence_rule` | jsonb | nullable — reserved, unused until a later phase |
| `completed_at` | timestamptz | nullable |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | soft delete |

**RLS**: full CRUD, `(select auth.uid()) = user_id` **plus** `insert`/`update` verify `project_id`, `goal_id`, and `milestone_id` (each, when set) belong to rows owned by that same user — `milestone_id` ownership is checked via a join through `projects` (ADR 0005).

### `tags`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `name` | text | unique per user |
| `created_at` | timestamptz | |

**RLS**: full CRUD, `(select auth.uid()) = user_id`.

### `task_tags`
Join table, composite PK `(task_id, tag_id)`, no `user_id` column of its own.

| Column | Type | Notes |
|---|---|---|
| `task_id` | uuid | FK → `tasks(id)`, `on delete cascade` |
| `tag_id` | uuid | FK → `tags(id)`, `on delete cascade` |

**RLS**: every policy verifies ownership of **both** sides — `exists (... from tasks where id = task_id and user_id = (select auth.uid()))` and the equivalent for `tags` — so a user can't link their own task to someone else's tag, or vice versa (ADR 0005).

### `weekly_priorities`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `task_id` | uuid | FK → `tasks(id)`, `on delete cascade` |
| `week_start_date` | date | Monday-start ISO date |
| `is_most_important_outcome` | boolean | default `false` |
| `created_at` | timestamptz | |

`unique (user_id, week_start_date, task_id)` prevents duplicate rows for the same task/week. The "at most 3 per week" cap (blueprint §D.3/§0.7) is enforced at the application layer (`addWeeklyPriority` counts existing rows before inserting), not a DB constraint — a user's own count is a business rule, not a security boundary.

**RLS**: full CRUD, `(select auth.uid()) = user_id` **plus** `insert` verifies `task_id` belongs to a task owned by that same user (ADR 0005).

### `calendar_events`
Standalone events (meetings, appointments), unrelated to task execution. Rendered on the Calendar grid as a solid block (blueprint §I.5).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `title` | text | not null |
| `start_at` / `end_at` | timestamptz | not null, check `end_at > start_at` |
| `all_day` | boolean | default `false` |
| `location`, `notes` | text | nullable |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | soft delete |

**RLS**: full CRUD, `(select auth.uid()) = user_id`.

### `time_blocks`
A committed slot of time, optionally tied to a task/project. Rendered on the Calendar grid as a filled block colored by `focus_context` (blueprint §I.5). Overlapping blocks are allowed by design — a soft UI warning, not a DB constraint (Flow 8, the user's call).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `task_id` | uuid | FK → `tasks(id)`, nullable, `on delete set null` |
| `project_id` | uuid | FK → `projects(id)`, nullable, `on delete set null` |
| `title` | text | not null |
| `start_at` / `end_at` | timestamptz | not null, check `end_at > start_at` |
| `focus_context` | text | nullable, check in (`deep_work`,`study`,`planning`,`family`,`exercise`,`admin`,`other`) |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | soft delete |

**RLS**: full CRUD, `(select auth.uid()) = user_id` **plus** `insert`/`update` verify `task_id` and `project_id` (each, when set) belong to rows owned by that same user (ADR 0005).

### `habits`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `goal_id` | uuid | FK → `goals(id)`, nullable, `on delete set null` |
| `project_id` | uuid | FK → `projects(id)`, nullable, `on delete set null` |
| `name`, `description`, `category` | text | `name` not null |
| `frequency` | text | check in (`daily`,`weekdays`,`weekly`,`custom`), default `daily` |
| `custom_days` | smallint[] | nullable — 0 (Sunday) .. 6 (Saturday), only meaningful when `frequency = 'custom'` |
| `target` | int | default `1` — times per period the habit should be marked |
| `preferred_time` | time | nullable |
| `start_date` | date | not null, default `current_date` |
| `is_active` | boolean | default `true` — pausing freezes the streak rather than resetting it (see below) |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | soft delete |

**RLS**: full CRUD, `(select auth.uid()) = user_id` **plus** `insert`/`update` verify `goal_id`/`project_id` (each, when set) belong to rows owned by that same user (ADR 0005).

**Streak/consistency engine** (`features/habits/progress.ts`, blueprint §K.2): computed server-side in TypeScript against `profiles.timezone` — not a literal Postgres function as the blueprint's wording suggests, but the invariant the blueprint actually requires ("never the client's local clock") holds regardless, since this code only ever runs on the Next.js server, matching the same computed-at-read pattern already used for Goal/Project progress. See `docs/SECURITY.md` for the correctness tests (`tests/habit-streak.ts`).

### `habit_logs`
One row per (habit, day) marked. No direct `user_id`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `habit_id` | uuid | FK → `habits(id)`, `on delete cascade` |
| `log_date` | date | not null |
| `completed` | boolean | default `true` |
| `note` | text | nullable |

`unique (habit_id, log_date)`. **RLS**: every policy checks `exists (select 1 from habits h where h.id = habit_logs.habit_id and h.user_id = (select auth.uid()))`.

### `challenges`
21-day challenge tracker (blueprint §I.9). No sidebar nav entry of its own — reached from `/habits` (ADR 0008).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `goal_id` | uuid | FK → `goals(id)`, nullable, `on delete set null` |
| `title`, `daily_action`, `reflections` | text | `title` not null |
| `start_date` | date | not null, default `current_date` |
| `status` | text | check in (`active`,`completed`,`abandoned`), default `active` |
| `final_score` | numeric | nullable |
| `created_at` / `updated_at` | timestamptz | |

**RLS**: full CRUD, `(select auth.uid()) = user_id` **plus** `insert`/`update` verify `goal_id` (when set) belongs to a goal owned by that same user (ADR 0005).

### `challenge_days`
Exactly 21 rows per challenge, seeded at creation. No direct `user_id`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `challenge_id` | uuid | FK → `challenges(id)`, `on delete cascade` |
| `day_number` | smallint | not null, check between 1 and 21 |
| `completed` | boolean | default `false` |
| `note` | text | nullable |

`unique (challenge_id, day_number)`. **RLS**: every policy checks `exists (select 1 from challenges c where c.id = challenge_days.challenge_id and c.user_id = (select auth.uid()))`.

### `focus_sessions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `task_id` | uuid | FK → `tasks(id)`, nullable, `on delete set null` |
| `project_id` | uuid | FK → `projects(id)`, nullable, `on delete set null` |
| `context`, `note` | text | nullable |
| `planned_minutes` | int | nullable |
| `actual_minutes` | int | not null — the real elapsed time, computed client-side by the timer, not just the preset |
| `started_at` | timestamptz | not null, default `now()` |
| `ended_at` | timestamptz | nullable |

**RLS**: full CRUD, `(select auth.uid()) = user_id` **plus** `insert`/`update` verify `task_id`/`project_id` (each, when set) belong to rows owned by that same user (ADR 0005).

### `decisions`
No sidebar nav entry of its own — reached from `/journal` (ADR 0010). Created before `journal_entries` since that table references it.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `goal_id` | uuid | FK → `goals(id)`, nullable, `on delete set null` |
| `project_id` | uuid | FK → `projects(id)`, nullable, `on delete set null` |
| `task_id` | uuid | FK → `tasks(id)`, nullable, `on delete set null` |
| `title`, `context`, `chosen_option`, `reasoning`, `expected_outcome`, `actual_outcome`, `lesson` | text | `title` not null; `actual_outcome`/`lesson` nullable until reviewed |
| `options` | jsonb | not null, default `[]` — array of option strings considered |
| `decided_at` | timestamptz | not null, default `now()` |
| `review_date` | date | nullable |
| `created_at` / `updated_at` | timestamptz | |

**RLS**: full CRUD, `(select auth.uid()) = user_id` **plus** `insert`/`update` verify `goal_id`/`project_id`/`task_id` (each, when set) belong to rows owned by that same user (ADR 0005).

**Due for review** (`features/decisions/queries.ts`'s `getDueForReview()`, blueprint §I.6): a pure read-time query — `review_date <= today AND actual_outcome IS NULL` — not a stored notification. Filling in `actual_outcome` is what removes a decision from this list, which is what makes "surfaced once, not repeatedly" hold without a separate dismissal mechanism.

### `journal_entries`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `category` | text | not null, default `free_note`, check in (`daily_reflection`,`learning`,`win`,`problem`,`observation`,`free_note`) |
| `body` | text | not null |
| `goal_id` | uuid | FK → `goals(id)`, nullable, `on delete set null` |
| `project_id` | uuid | FK → `projects(id)`, nullable, `on delete set null` |
| `task_id` | uuid | FK → `tasks(id)`, nullable, `on delete set null` |
| `decision_id` | uuid | FK → `decisions(id)`, nullable, `on delete set null` |
| `created_at` / `updated_at` | timestamptz | |

**RLS**: full CRUD, `(select auth.uid()) = user_id` **plus** `insert`/`update` verify `goal_id`/`project_id`/`task_id`/`decision_id` (each, when set) belong to rows owned by that same user (ADR 0005).

### `ideas`
Idea Parking Lot (blueprint §I.7). Status flow: `new → review_later → evaluating → promoted | rejected → archived` — `rejected`/`archived` are terminal but not deleted (soft state, not soft-deleted; `deleted_at` exists for an actual future delete flow, unused so far since Phase 8 doesn't need one).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `title`, `description`, `category`, `notes` | text | `title` not null |
| `status` | text | not null, default `new`, check in (`new`,`review_later`,`evaluating`,`promoted`,`rejected`,`archived`) |
| `impact` / `effort` / `urgency` | smallint | nullable, check between 1 and 5 — scoring is opt-in, never required to capture |
| `review_date` | date | nullable |
| `promoted_project_id` | uuid | FK → `projects(id)`, nullable, `on delete set null` — set when promoted |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | soft delete |

**RLS**: full CRUD, `(select auth.uid()) = user_id` **plus** `insert`/`update` verify `promoted_project_id` (when set) belongs to a project owned by that same user (ADR 0005).

### `weekly_reviews`
Weekly Review session (blueprint §I.9/Flow 12). One row per user per ISO week (`week_start_date` is the Monday the week starts on, matching `weekly_priorities.week_start_date` from Phase 5 so the two always align). `auto_summary` is a `WeeklyMetrics` JSON snapshot (`features/reviews/aggregate.ts`) recomputed on every open/save while `status='in_progress'`, then frozen at `status='completed'`. `execution_score` (blueprint §L) is computed once, at completion, and never recomputed afterward — editing past data can't retroactively change a locked week's score.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `week_start_date` | date | not null |
| `status` | text | not null, default `in_progress`, check in (`in_progress`,`completed`) |
| `auto_summary` | jsonb | not null, default `{}` — see `WeeklyMetrics` |
| `reflection_completed` / `reflection_missed` / `reflection_why` / `reflection_progress` / `reflection_time_wasted` / `reflection_stop_doing` / `reflection_learned` | text | nullable — the 7 reflection questions |
| `next_week_mio_task_id` | uuid | FK → `tasks(id)`, nullable, `on delete set null` — completing the review upserts this task as next week's Most Important Outcome in `weekly_priorities` |
| `execution_score` | numeric | nullable — locked (never recomputed) once `status='completed'`; `null` means "not enough data" (blueprint §L.2), never a misleading 0 |
| `created_at` / `updated_at` | timestamptz | |
| | | `unique (user_id, week_start_date)` |

**RLS**: full CRUD, `(select auth.uid()) = user_id` **plus** `insert`/`update` verify `next_week_mio_task_id` (when set) belongs to a task owned by that same user (ADR 0005).

### `monthly_reviews`
Monthly Review (blueprint §I.9), lighter than the weekly one — no locked score, no MIO handoff, just an auto-aggregated summary plus 4 reflection fields.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `month` | date | not null — first-of-month |
| `status` | text | not null, default `in_progress`, check in (`in_progress`,`completed`) |
| `auto_summary` | jsonb | not null, default `{}` — see `MonthlyAutoSummary` |
| `wins` / `failures` / `lessons` / `next_month_priorities` | text | nullable |
| `created_at` / `updated_at` | timestamptz | |
| | | `unique (user_id, month)` |

**RLS**: full CRUD, `(select auth.uid()) = user_id` only — no FK to verify ownership of.

### `ai_threads`
A conversation (blueprint §M) — Morning Brief, Evening Review, Weekly Coach, Planning, Decision Assistant, or freeform. One row per conversation; `context_type` records which Context Engine builder (if any) seeded it.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `title` | text | not null |
| `context_type` | text | not null, check in (`morning_brief`,`evening_review`,`weekly_coach`,`planning`,`decision_assistant`,`freeform`) |
| `archived` | boolean | not null, default `false` |
| `created_at` / `updated_at` | timestamptz | |

**RLS**: full CRUD, `(select auth.uid()) = user_id` only.

### `ai_messages`
No direct `user_id` (blueprint §I.9) — ownership is via join to the parent thread, same pattern as `habit_logs`/`challenge_days` (Phase 7).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `thread_id` | uuid | FK → `ai_threads(id)`, not null, `on delete cascade` |
| `role` | text | not null, check in (`user`,`assistant`,`system`) |
| `content` | text | not null |
| `metadata` | jsonb | not null, default `{}` |
| `created_at` | timestamptz | |

**RLS**: select/insert/delete, each checking `exists (select 1 from ai_threads t where t.id = ai_messages.thread_id and t.user_id = (select auth.uid()))` — no update policy (messages are immutable once written).

### `ai_insights`
The one place a SUGGEST-tier AI action (blueprint §M.3) parks a proposed change — `payload` is one of two discriminated shapes (`PlanBreakdownPayload`, `SuggestReschedulePayload`; `features/ai/types.ts`). Never applied on its own; `approveInsight()` is the only path that turns `payload` into a real write, and it does so through the exact same Server Actions (`createTask`, `addMilestone`, `rescheduleTask`) a human edit would use.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users(id)` |
| `thread_id` | uuid | FK → `ai_threads(id)`, nullable, `on delete set null` |
| `type` | text | not null, check in (`plan_breakdown`,`suggest_reschedule`) |
| `payload` | jsonb | not null |
| `status` | text | not null, default `pending`, check in (`pending`,`approved`,`rejected`,`expired`) |
| `resolved_at` | timestamptz | nullable |
| `created_at` / `updated_at` | timestamptz | |

**RLS**: full CRUD, `(select auth.uid()) = user_id` **plus** `insert`/`update` verify `thread_id` (when set) belongs to a thread owned by that same user (ADR 0005).

## Domain tables (not yet built)

`notifications`, `attachments` — full specs already exist in `PHASE_0_BLUEPRINT.md` §I.10-§I.11 and get created in Phase 11, following the same pattern established here: RLS enabled in the same migration that creates the table, `(select auth.uid())` in every policy from the start, ownership verified for every FK to another owned table (ADR 0005), `get_advisors` run immediately after applying.
