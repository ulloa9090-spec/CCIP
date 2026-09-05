# Changelog

Notable changes per phase. See `docs/PHASE_0_BLUEPRINT.md` §T for the roadmap and `docs/decisions/` for the reasoning behind non-obvious choices.

## Post-MVP — Design System Premium Polish

- **Iteration 1 (tokens + components):** adopted the domain-agnostic UI principles from an externally supplied design-system document (written for an unrelated warehouse/camera app) — a 3-duration motion system with one shared easing curve, a 7-role typography scale, and complete component states — while discarding everything specific to that app's actual domain. Applied to `components/ui/*` (Button press feedback, Modal/Tooltip enter-exit transitions previously absent, Skeleton/ProgressBar/ProgressRing timing, Card/EmptyState typography). No new dependency, no screen-by-screen redesign. ADR 0018.
- **Iteration 2 (Dashboard recolor + Recent Activity):** per the project owner's own screenshot reference, gave each of the 12 Dashboard widgets a distinct category color (`--category-*` tokens) for at-a-glance visual categorization, while keeping `--accent` as the single color for every interactive element app-wide. `WeeklyScoreCard`'s ring is now value-toned (success/warning/danger) with a paired text label, never color alone. Added a new `RecentActivityCard` widget aggregating real cross-domain events (completed tasks, habit check-ins, focus sessions, journal entries, ideas, completed weekly reviews) from six already-existing feature queries — no new table, no gamification/XP invented. `tests/dashboard-smoke.mjs` extended to cover the new widget; full regression pass (typecheck, lint, build, axe accessibility scan, all pure-logic suites) clean. ADR 0019.
- **Iteration 3 (Tasks, Habits, Analytics recolor):** extended the same category-color system to three more screens. Shared the color-class maps out of the Dashboard into `lib/design/category-colors.ts` (including a new `pickCategoryColor()` for entities with no fixed enum). Tasks' Kanban columns each get a fixed color (workflow stage); Habits get a stable per-habit color (consistent between the week grid and the heatmap) since habit categories are free text, not a fixed enum; Analytics' 7 metric cards get an icon + color each, reusing the same color already assigned to the analogous Dashboard widget, plus a matching chart line color. Priority badges and habit done/missed coloring were left untouched — those are severity/status signals, not categories. Verified with a temporary local preview route (fixture data through the real components, deleted before committing, since these three screens have no permanent dev-preview route like the Dashboard's), plus the full regression pass. ADR 0020.

## Phase 12 — Production Hardening (MVP complete)

- Database: one index-only migration (`production_hardening_indexes`) — no new user-owned tables this phase. A project-wide `get_advisors` re-audit (security + performance, scoped to the whole project rather than just the latest migration, unlike every prior phase's check) caught two missing FK-covering indexes earlier phases had missed — `ai_insights.thread_id` (Phase 10), `weekly_reviews.next_week_mio_task_id` (Phase 9) — fixed immediately, re-run confirmed clean. Zero security findings.
- Error boundaries (blueprint §O.7): `app/(app)/error.tsx`, `app/(auth)/error.tsx`, `app/global-error.tsx` (bare `<html>/<body>` fallback for root-layout crashes), `app/(app)/not-found.tsx` + `app/not-found.tsx`. All render a fixed, generic message — never a caught error's own `message`/`stack`.
- Pagination / list capping (blueprint §O.10, ADR 0016): Journal (`features/journal/queries.ts`) gets real `?page=` pagination (`JOURNAL_PAGE_SIZE = 30`). Tasks and Ideas Kanban columns (`KanbanColumn`, `IdeaColumn`) get a 50-card render cap with a "Show N more" control instead — a page-number scheme doesn't map cleanly onto a `dnd-kit` drop target.
- Rate limiting (blueprint §N, ADR 0017): login/signup/password-reset brute-force protection stays Supabase Auth's own native mechanism, not reimplemented. AI generation gets a real per-user daily cap (`DAILY_AI_GENERATION_LIMIT = 50`, `features/ai/actions.ts`), counted from successful completions only, degrading through the existing `AIUnavailableError` path.
- Data Export (blueprint §I.8, ADR 0017): `features/export/` — a full JSON export across all 28 user-owned tables (doubling as "full backup"), plus Tasks and Journal CSV exports via a pure `toCsv()` formatter (`lib/utils/csv.ts`, RFC-4180-ish quoting, CRLF). PDF explicitly deferred. New Data Export card in Settings, replacing the Phase 3 placeholder.
- PWA installable shell (blueprint §O.9, ADR 0017): `app/manifest.ts` (Next.js native manifest route), a hand-authored `public/icon.svg`, `public/sw.js` (cache-first static assets, network-first-then-cache-then-`/offline` for navigations), a `ServiceWorkerRegistration` client component mounted in the root layout, and a static `/offline` fallback page. Read-only, partial offline — no write queue, no background sync (explicitly out of scope).
- `proxy.ts` matcher extended to exclude `sw.js`/`manifest.webmanifest` from session-refresh/protected-route handling.
- ADR 0016 (Kanban columns capped, not paginated — Journal gets real pagination) and ADR 0017 (Phase 12 scope: no PDF export, rate-limiting approach, offline scope).
- `tests/csv-format.ts` (6 cases) added; every prior pure-logic test suite re-run with no regressions from this phase's changes.
- **MVP complete**: all 12 roadmap phases (blueprint §T) are now built. Phase 2's live auth E2E test and Phase 10's live AI provider test remain the project's only PENDING items, both blocked purely on this sandbox's lack of real Supabase network access / AI provider key — see `docs/SECURITY.md`.

## Phase 11 — Integrations + Automation

- Database: `notifications`, `automations` — full RLS, `user_id`-only scoping (neither has a FK to another owned table). `get_advisors` clean on the first run.
- **RLS isolation test across both new tables** — cross-user read/update/delete isolation and spoofed-`user_id` insert rejection, verified directly against Postgres. Every case passed on the first run; see `docs/SECURITY.md`.
- Automation engine (`features/automations/`, blueprint §M.4): two trigger types matching the blueprint's own worked examples — `task_overdue` and `weekly_schedule` — one action type (`create_notification`). **Evaluated at read-time on every page load** (`evaluateAutomations()`, called from `Header`) rather than by a background scheduler — generalizes Phase 8's Decision-due-for-review pattern (ADR 0014). Idempotent via each automation's own `last_run_at`. Verified by a dedicated correctness test (`tests/automation-match.ts`, 14 cases).
- Notification Center (`features/notifications/`): a real `NotificationBell` dropdown in Header — unread badge, mark-one-read on open, mark-all-read. No dedicated nav entry, matching the blueprint's own primary-nav list (same reasoning as ADR 0008/0010).
- Automations management UI: a new "Automations" card in Settings — list/toggle/delete existing automations, two creation modals for the two supported trigger kinds.
- Magic Link sign-in (`features/auth/actions.ts`'s `signInWithMagicLink`): Supabase Auth's native passwordless flow, `shouldCreateUser: false` so it's an alternate sign-in for an existing account only; reuses `/auth/confirm`'s existing PKCE handler unchanged. Login page gets a password/magic-link mode toggle.
- ADR 0014 (automations evaluated at read-time, not a background scheduler) and ADR 0015 (Calendar sync and Social login deferred entirely — no OAuth credentials to build against in this sandbox; Data Export stays Phase 12 per the codebase's own existing placeholder text).
- `tests/dashboard-smoke.mjs` and every prior pure-logic test suite re-run with no regressions from this phase's changes.

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
