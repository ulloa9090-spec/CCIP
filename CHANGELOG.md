# Changelog

Notable changes per phase. See `docs/PHASE_0_BLUEPRINT.md` §T for the roadmap and `docs/decisions/` for the reasoning behind non-obvious choices.

## Phase 10 — AI Intelligence Layer

- Database: `ai_threads`, `ai_messages`, `ai_insights` — full RLS, `ai_messages` ownership-checked via join to its parent thread (no direct `user_id`, same pattern as `habit_logs`/`challenge_days`), `ai_insights` FK-ownership check on `thread_id` (ADR 0005). `get_advisors` clean on the first run.
- **RLS isolation test across all 3 new tables** — cross-user read/update/delete isolation and FK-ownership rejection on insert, verified directly against Postgres. Every case passed on the first run; see `docs/SECURITY.md`.
- Provider abstraction (`lib/ai/provider.ts`, `features/ai/providers/`, blueprint §M.1): real `AnthropicAdapter` (`@anthropic-ai/sdk`) and `OpenAIAdapter` (`openai`), a stub `LocalModelAdapter` (blueprint §C: not in scope yet). Every adapter fails fast with `AIUnavailableError` when its key is missing, caught everywhere so AI Coach degrades to "unavailable right now" instead of crashing (blueprint §O.7).
- Context Engine (`features/ai/context/`, blueprint §M.2): 5 builders (Morning Brief, Evening Review, Weekly Coach, Planning Assistant, Decision Assistant), split into a Supabase-fetching half and a pure, `tsx`-testable prompt formatter — Weekly Coach reuses Phase 9's `computeWeeklyMetrics()` rather than recomputing. Verified by a dedicated correctness test (`tests/ai-context-format.ts`, 24 cases).
- Action Model (`features/ai/actions.ts`, blueprint §M.3): READ (Morning Brief, Evening Review, Decision Assistant, freeform chat) vs. SUGGEST (Weekly Coach, Planning Assistant — may write a `pending` `ai_insights` row) vs. WRITE (`approveInsight()` only, calling `createTask()`/`addMilestone()` (pre-existing) or a new `rescheduleTask()` — the exact same Server Action path a human edit uses, never an AI-privileged write). `tests/ai-insight-write-path.ts` verifies the FormData `approveInsight()` builds passes the same Zod validation a human's form would.
- Real `/ai-coach` (generate-on-demand Morning Brief/Evening Review/Weekly Coach cards, freeform chat, recent threads) and `/ai-coach/[threadId]` (messages, pending suggestion cards with Approve/Modify/Ignore, follow-up chat input). "Ask AI to Break This Down" on Goal/Project Detail; "Ask AI for Perspective" on an unresolved Decision Detail.
- Settings' AI Provider field went live — `features/settings/` (new), writing `settings.ai_provider` as a per-user override of the deployment's `AI_PROVIDER`.
- ADR 0012 (AI uses Server Actions, not `app/api/ai/` Route Handlers — a documented deviation from the blueprint's illustrative tree) and ADR 0013 (Phase 10 scope: real Anthropic/OpenAI adapters, `ai_insights.type` limited to `plan_breakdown`/`suggest_reschedule`, Anti-Distraction Guard deferred).
- New `docs/AI_ARCHITECTURE.md` (blueprint P.1: "activated in Phase 10").
- `tests/dashboard-smoke.mjs` re-run with no regressions from this phase's changes.
- **Live AI provider testing is PENDING** — no `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` configured in this development sandbox, so an actual successful completion (and the degraded-mode UI in a live logged-in session) hasn't been exercised here — same honest status as Phase 2's auth E2E test. See `docs/SECURITY.md` and ADR 0013.

## Phase 9 — Reviews + Analytics

- Database: `weekly_reviews`, `monthly_reviews` — full RLS, FK ownership check on `weekly_reviews.next_week_mio_task_id` applied from the first migration draft (ADR 0005); `unique(user_id, week_start_date)` / `unique(user_id, month)`. `get_advisors` clean on the first run.
- **RLS isolation test across both new tables** — cross-user read/update/delete isolation and FK-ownership rejection on insert/update (including on `update`, not just `insert`), verified directly against Postgres. Every case passed on the first run; see `docs/SECURITY.md`.
- Shared aggregation engine (`features/reviews/aggregate.ts`, blueprint §L): `computeWeeklyMetrics()`/`computeMonthlySummary()` are the one place every weekly/monthly rollup is computed — Reviews' `auto_summary` and Analytics' weekly metrics read from the same shape, so they can't diverge.
- Weekly Execution Score (`features/reviews/execution-score.ts`, blueprint §L.1–L.2): 5 weighted components with an exclusion + weight-redistribution rule for components with no denominator, and a `null` ("not enough data") guard instead of a misleading 0. Computed once and locked at review completion. Verified by a dedicated correctness test (`tests/execution-score.ts`, 11 cases, run via `npx tsx`).
- Real `/reviews` (Weekly/Monthly tabs, past reviews list, Start/Continue This Week's/Month's Review) with session screens at `/reviews/weekly/[weekStartDate]` and `/reviews/monthly/[month]` — a read-only auto-summary, a 7-question (weekly) or 4-question (monthly) reflection form built on two `useActionState` hooks sharing one `<form>` via per-button `formAction` (Save Draft vs. Complete Review), and a next-week Most Important Outcome handoff that pre-populates `weekly_priorities` for the following week.
- Real `/analytics` — 7 fixed metric cards (Task Completion Rate, Weekly Priority Completion, Habit Consistency, Focus Minutes, Overdue Tasks, Created vs Completed, Weekly Score Trend) with Recharts trend charts across 7/30/90/365-day ranges (ADR 0011 confirms Recharts, matching blueprint §O). Overdue Tasks is reconstructed per historical day from tasks' current `due_date`/`completed_at` fields rather than a stored snapshot.
- Dashboard's `getWeeklyScoreData()` and `getWeeklyReviewData()` now run real queries — the last two Dashboard modules to graduate from Phase 3's empty stand-ins. `WeeklyReviewCardBody`'s branch order was corrected so a review due now always shows the Start CTA, even for a user who has never completed one.
- `DEFAULT_WEEKLY_FOCUS_TARGET_MINUTES = 300` is a fixed constant standing in for a per-user configurable focus-time target Settings doesn't have a field for yet (ADR 0011).
- `tests/dashboard-smoke.mjs` re-run with no regressions from this phase's data-layer changes.

## Phase 8 — Journal + Ideas + Decision Log

- Database: `decisions`, `journal_entries`, `ideas` — full RLS, FK ownership checks applied from the first migration draft (ADR 0005); `decisions` created before `journal_entries` since the latter references it. `get_advisors` clean on the first run.
- **RLS isolation test across all 3 new tables** — cross-user read/update/delete isolation and FK-ownership rejection on insert/update, verified directly against Postgres. Every case passed on the first run; see `docs/SECURITY.md`.
- Real `/journal` (reverse-chronological entries, category filters, "+ New Entry") with an embedded Decision Log section (due-for-review list, full log, "+ New Decision") — Decisions have no separate nav entry, matching the blueprint's own primary-nav list (ADR 0010, generalizing ADR 0008's pattern for Challenges). Decision Detail lives at `/journal/decisions/[id]`.
- Real `/ideas` — a 6-column `dnd-kit` Kanban board (New/Review Later/Evaluating/Promoted/Rejected/Archived), optional 1-5 impact/effort/urgency scoring, and a promote-to-project flow that creates a real project from an idea's title/description.
- Dashboard's `getIdeaData()` now runs a real query — the widget needed no changes, since it already rendered against its Phase 3 contract.
- Quick Add's Idea and Note types went live — Idea maps to `createIdea`; Note (no table of its own in the blueprint's data model) maps to `createJournalEntry` with `category: 'free_note'`.
- `tests/dashboard-smoke.mjs` re-run with no regressions from this phase's data-layer changes.

## Phase 7 — Habits + Challenges + Focus Timer

- Database: `habits`, `habit_logs`, `challenges`, `challenge_days`, `focus_sessions` — full RLS, FK ownership checks applied from the first migration draft (ADR 0005), child tables (`habit_logs`/`challenge_days`) ownership-checked via join to their parent. `get_advisors` clean on the first run.
- **RLS isolation test across all 5 new tables** — cross-user read/update/delete isolation and FK-ownership rejection on insert/update, verified directly against Postgres. Every case passed on the first run; see `docs/SECURITY.md`.
- Streak/consistency engine (`features/habits/progress.ts`, blueprint §K.2): computed server-side in TypeScript against `profiles.timezone` — daily/weekdays/custom streaks walk day-by-day, weekly streaks walk week-by-week, a paused habit freezes its streak rather than resetting it. Verified by a dedicated correctness test (`tests/habit-streak.ts`, 10 cases, run via `npx tsx` — a new devDependency, since no unit-test framework was otherwise installed).
- Real `/habits` (weekly tap-to-toggle grid, 30-day heatmap toggle, streak + consistency % per habit) and a 21-day Challenges sub-flow (`/habits/challenges/[id]`) — no separate nav entry, matching the blueprint's own primary-nav list (ADR 0008).
- Real `/focus` (duration presets, task/project linking, start/pause/resume/finish, Save/Discard review step, today's session history) — the timer runs client-side only for this pass, no cross-route/refresh persistence (ADR 0009).
- Dashboard's `getHabitData()` and `getFocusData()` now run real queries — the widgets needed no changes, since they already rendered against their Phase 3 contracts.
- Quick Add's Habit type went live (Server Action-backed, no longer disabled).
- `tests/dashboard-smoke.mjs` re-run with no regressions from this phase's data-layer changes.

## Phase 6 — Today + Calendar + Time Blocking

- Database: `calendar_events`, `time_blocks` — full RLS, FK ownership checks (`time_blocks.task_id`/`project_id`) applied from the first migration draft (ADR 0005), indexed on `(user_id, start_at)`. `get_advisors` clean on the first run — no follow-up index fix needed this time.
- **RLS isolation test across both new tables** — cross-user read/update/delete isolation and FK-ownership rejection on insert/update, verified directly against Postgres. Every case passed on the first run; see `docs/SECURITY.md`.
- Hand-built Day/Week/Month Calendar grid (`date-fns`, no calendar library — blueprint §O.6, confirmed by ADR 0007), merging Time Blocks, Calendar Events, and task due/scheduled dates into one rendering-layer view without merging them in the data model. Click-to-create (empty hour cell → modal) and click-to-edit for Time Blocks/Events, replacing the blueprint's drag-from-a-tray description for this first pass (ADR 0007).
- Real `/today` (Most Important Task card, Top 3, today's agenda strip, collapsed Overdue & Critical section, always-visible Quick Capture) composed entirely from Phase 5/6 data — no new table of its own. Habits deliberately left out until Phase 7.
- Dashboard's `getCalendarData()` now runs a real query — the widget needed no changes, since it already rendered against its Phase 3 contract.
- Quick Add's Event type went live (Server Action-backed, no longer disabled).
- `tests/dashboard-smoke.mjs` re-run with no regressions from this phase's data-layer changes.
- Known simplification, documented in ADR 0007: Calendar/Time Block times aren't converted through `profiles.timezone` yet — wall-clock browser time is treated as UTC.

## Phase 5 — Projects + Tasks + Kanban

- Database: `projects`, `milestones`, `tasks`, `tags`, `task_tags`, `weekly_priorities` — full RLS, ownership checks on every FK to an owned table applied proactively from the first migration draft (ADR 0005), Active Project partial unique index, indexes, `updated_at` triggers. `get_advisors` clean on the security pass immediately; two missing FK-covering indexes flagged by the performance advisor fixed in a same-day follow-up migration.
- **Comprehensive RLS isolation test across all 6 new tables** — cross-user read/update/delete isolation, FK-ownership rejection on insert/update, and the Active Project uniqueness constraint, all verified directly against Postgres. Every case passed on the first run; see `docs/SECURITY.md`.
- Progress engine (`features/projects/progress.ts`, blueprint §K): 50% milestone completion + 50% task completion, with a manual override taking precedence.
- Active Project rule: DB-enforced via partial unique index, with a UI conflict-resolution flow (Replace / Make Secondary / Cancel) when a second project is set primary.
- Real `/projects` (list grouped by status, Primary Active Project hero, create/edit, detail page with milestones and linked tasks) and `/tasks` (drag-and-drop Kanban board, `dnd-kit` — ADR 0006) replacing the Phase 1 placeholders.
- Dashboard's `getTodayData()`, `getActiveProjectData()`, and `getWeeklyPrioritiesData()` now run real queries — graduating from Phase 3's empty stand-ins the same way `getNinetyDayGoalData()`/`getProgressData()` did in Phase 4.
- Quick Add's Task and Project types went live (Server Action-backed, no longer disabled).
- `tests/dashboard-smoke.mjs` re-run against the fixture preview route with no regressions from this phase's data-layer changes.

## Phase 4 — Goals + Life Map + 90-Day Plan

- Database: `life_areas` (8 defaults seeded per signup), `quarter_cycles`, `goals`, `goal_metrics` — full RLS, indexes, `updated_at` triggers. `get_advisors` clean after two migrations.
- **RLS isolation test caught a real gap**: `goals`' insert/update policies didn't verify `area_id`/`quarter_cycle_id` ownership, only `user_id`. Fixed in a follow-up migration; ADR 0005 generalizes the fix as a requirement for every future FK to an owned table.
- Progress engine (`features/goals/progress.ts`, blueprint §K): metric-based goal progress, cycle progress as the average of linked goals' progress (excluding goals with no computable progress, not counting them as 0).
- Real `/goals` (list grouped by Life Area, create/edit, life area quick-add) and `/plan-90-days` (current cycle hero, 3 embedded milestones — ADR 0004 — linked goals, past cycles archive) replacing the Phase 1 placeholders.
- Dashboard's `getNinetyDayGoalData()` and `getProgressData()` now run real queries — the first modules to graduate from Phase 3's empty stand-ins, proving that seam works without touching any widget.
- Quick Add's Goal type went live (Server Action-backed, no longer disabled) — first Quick Add type to graduate from Phase 3's phase-badged placeholder.
- `lib/types/action-result.ts`: the `ActionResult` shape moved out of `features/auth/actions.ts` into a shared location, now used by both `features/auth` and `features/goals`.

## Phase 3 — Dashboard Foundation

- Data contracts (`features/dashboard/types.ts`): a `DashboardXData` shape + `ModuleResult<T>` per widget — the UI depends on these, never a raw table.
- Data access layer (`features/dashboard/get-dashboard-data.ts`): one fetcher per module, each wrapped by `safeModule()` so a single module's failure can't crash the page. `profiles` is the only real query; every other module documents which future phase replaces its empty stand-in.
- 12 widgets (`features/dashboard/components/`), each split into a pure `<X>CardBody` (render) and an async `<X>Card` (fetch + delegate) — the split is what lets the dev preview route reuse production markup exactly, with no risk of drift.
- Responsive `DashboardGrid`: real mobile-priority reordering (Today/Active Project/Habits/Focus first on mobile, desktop four-level hierarchy at `md:`+), not just a column shrink — verified by `tests/dashboard-smoke.mjs`.
- Quick Add: every capture type now shows which phase makes it live and submit is disabled until then, instead of accepting input it can't persist.
- Dev-only fixture data + `/dev/dashboard-preview` for visual/responsive/accessibility QA without a live session — isolated from the production query path, documented as safe to delete.
- Design-system fixes surfaced by the new accessibility test: `Button` gained `asChild` (Radix Slot) so it can render as a styled `<Link>`; `ProgressBar` gained an `ariaLabel` so every progressbar has an accessible name.
- `tests/dashboard-smoke.mjs`: protected-route check, empty/populated/error rendering, module-isolation check, responsive reordering check, keyboard focus check, axe-core accessibility scan, no-console-error check — all passing.

## Phase 2 — Authentication + Database

- Provisioned the `atlas-os-development` Supabase project (Development environment only).
- Database: `profiles` + `settings` tables, RLS on both, auto-provisioning trigger on signup. Four migrations, `get_advisors` clean (security + performance).
- Auth: real signup/login/logout/forgot-password/reset-password via Server Actions, Supabase PKCE email-link callback, session-aware route protection (`proxy.ts`).
- RLS isolation verified directly against Postgres's policy engine with two real users.
- **Live auth E2E validation (`tests/auth-smoke.mjs`) is PENDING** — not yet run against real network access; see `docs/SECURITY.md` and `docs/ARCHITECTURE.md`. Phase 2 was provisionally approved on schema/RLS verification alone.

## Phase 1 — Product Foundation

- Next.js 16 (App Router) + TypeScript strict + Tailwind CSS v4 scaffold.
- Design-system primitives (`components/ui/*`) and app shell (Sidebar, Header, Quick Add, theme toggle).
- Placeholder pages with empty states for all 14 primary routes plus Dashboard/Settings.
- Supabase client/server helpers wired to env vars, connectivity-only `/api/health`.

## Phase 0 — Product Definition, UX Blueprint & Architecture Lock

- `docs/PRODUCT_UNDERSTANDING_REPORT.md` and `docs/PHASE_0_BLUEPRINT.md`: product interpretation, MVP scope, information architecture, user flows, screen inventory, design system, full conceptual data model, progress/scoring engines, AI architecture, security model, technical architecture, repository structure, deployment/testing strategy, risks, and the 12-phase roadmap.
