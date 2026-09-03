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

`get_advisors` (security and performance) reports zero findings as of the last migration.

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
| `ai_provider` | text | nullable — unused until Phase 10 |
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

## Domain tables (not yet built)

`projects`, `milestones`, `weekly_priorities`, `tasks`, `tags`/`task_tags`, `calendar_events`, `time_blocks`, `habits`, `habit_logs`, `challenges`, `challenge_days`, `focus_sessions`, `journal_entries`, `ideas`, `decisions`, `weekly_reviews`, `monthly_reviews`, `notifications`, `attachments`, `ai_threads`, `ai_messages`, `ai_insights` — full specs already exist in `PHASE_0_BLUEPRINT.md` §I.9 and get created by their respective phases (5–9), each following the same pattern established here: RLS enabled in the same migration that creates the table, `(select auth.uid())` in every policy from the start, ownership verified for every FK to another owned table (ADR 0005), `get_advisors` run immediately after applying.
