# Security

Living record of the security model as actually implemented. See `PHASE_0_BLUEPRINT.md` §N for the full target design.

## Authentication

Supabase Auth, email/password. Session stored as httpOnly cookies via `@supabase/ssr` (never `localStorage`). `proxy.ts` refreshes the session and revalidates the user (`getUser()`, not just a cached `getSession()`) on every request to a protected route.

## Authorization: Row Level Security

Every user-owned table has RLS enabled **in the same migration that creates it** — never added later. `profiles`/`settings` (Phase 2): `select`/`update` only, scoped to `(select auth.uid()) = user_id` — no `insert`/`delete` policy (rows are managed only by the signup trigger and the `auth.users` cascade). `life_areas`/`goals`/`quarter_cycles`/`goal_metrics` (Phase 4): full CRUD, same `user_id` scoping — plus, per ADR 0005, `goals`' `insert`/`update` policies also verify `area_id` and `quarter_cycle_id` reference rows owned by the same user (see the finding below). `projects`/`milestones`/`tasks`/`tags`/`task_tags`/`weekly_priorities` (Phase 5), `calendar_events`/`time_blocks` (Phase 6), `habits`/`habit_logs`/`challenges`/`challenge_days`/`focus_sessions` (Phase 7), `decisions`/`journal_entries`/`ideas` (Phase 8), `weekly_reviews`/`monthly_reviews` (Phase 9), and `ai_threads`/`ai_messages`/`ai_insights` (Phase 10): full CRUD, same `user_id` scoping (`milestones`/`task_tags`/`habit_logs`/`challenge_days`/`ai_messages` have no direct `user_id` column, so ownership is checked via a join through their parent table instead) — every FK to an owned table (`projects.goal_id`, `tasks.project_id`/`goal_id`/`milestone_id`, `task_tags.task_id`+`tag_id`, `weekly_priorities.task_id`, `time_blocks.task_id`/`project_id`, `habits.goal_id`/`project_id`, `challenges.goal_id`, `focus_sessions.task_id`/`project_id`, `decisions.goal_id`/`project_id`/`task_id`, `journal_entries.goal_id`/`project_id`/`task_id`/`decision_id`, `ideas.promoted_project_id`, `weekly_reviews.next_week_mio_task_id`, `ai_insights.thread_id`) was ownership-checked in `insert`/`update` policies from each migration's first draft, applying ADR 0005 proactively rather than after a test caught a gap.

**RLS is the only authorization boundary.** No Server Action or Route Handler trusts a client-supplied user id — every query re-derives the user from the authenticated session server-side, and the database enforces isolation independent of whatever the application layer does or forgets to do.

### Isolation verified

Tested directly against Postgres's RLS engine (not just reasoned about) using two real `auth.users` rows and Postgres's own JWT-claim simulation (`set local role authenticated; set local request.jwt.claim.sub = '<user-id>'`) via `mcp__Supabase__execute_sql`, run as a single transaction that cleaned up after itself:

- User A sees exactly their own `profiles`/`settings` row, never User B's.
- User A's `update` against User B's `profiles` row affects 0 rows.
- User A's `delete` against User B's `profiles` row affects 0 rows (no delete policy exists at all).
- User A's `insert` of an arbitrary `profiles` row is rejected (`violates row-level security policy`).
- User B, symmetrically, sees only their own row and can update it.

This exercises the same policy engine PostgREST uses in production — it is not a mock.

### Phase 4: a real finding, and the fix

The same test methodology, extended to `life_areas`/`goals`/`quarter_cycles`/`goal_metrics`, initially **failed**: User A could `insert` a `goals` row with `user_id = A` but `area_id` pointing at one of User B's `life_areas` rows — the `goals_insert_own` policy checked `user_id` but never verified the referenced `area_id` (or nullable `quarter_cycle_id`) actually belonged to the same user. RLS on `life_areas` itself still prevented User A from *reading* User B's area data through the relation (PostgREST embedding respects the joined table's RLS), so this wasn't a read leak — but it was a real cross-tenant integrity hole: a foreign row a user doesn't own, referenced from a row they do, able to interfere with the other user's own data management via the `on delete restrict`/`on delete set null` FK behavior.

Fixed in migration `goals_ownership_check`: `insert`/`update` on `goals` now also require `exists (select 1 from life_areas la where la.id = area_id and la.user_id = (select auth.uid()))` (and the equivalent for `quarter_cycle_id` when set). Re-ran the isolation test after the fix — the cross-user insert is now correctly rejected. ADR 0005 generalizes this as a checklist item for every future table with a FK to another owned table.

This is the isolation testing process working as intended: the point of testing directly against Postgres's real RLS engine, rather than reasoning about policies on paper, is to catch exactly this kind of gap before it ships.

### Phase 5: comprehensive isolation test across all six new tables, no findings

Same methodology (two real `auth.users` rows, `set local role authenticated` + `set_config('request.jwt.claim.sub', ...)` via `mcp__Supabase__execute_sql`), extended to cover `projects`, `milestones`, `tasks`, `tags`, `task_tags`, and `weekly_priorities` — every table this phase added. For each: User A sees only their own rows; a cross-user `update`/`delete` affects 0 rows; an `insert` referencing another user's parent row (or spoofing another user's `user_id`) is rejected. Specifically verified:

- **`projects`**: insert with `goal_id` pointing at User B's goal rejected; insert with own `goal_id` succeeds; update re-pointing an owned project's `goal_id` at User B's goal rejected; cross-user update/delete affect 0 rows.
- **Active Project uniqueness**: setting a second project `is_primary_active = true` for the same user while one is already primary raises `unique_violation` against the `projects_primary_active_key` partial index — the database constraint holds independent of the application's conflict-resolution UI.
- **`milestones`**: insert under User B's project rejected (ownership via join through `projects`); insert under own project succeeds; cross-user update/delete affect 0 rows.
- **`tasks`**: insert with `project_id`, `goal_id`, or `milestone_id` each independently pointing at a User B-owned row rejected; insert with all three pointing at own rows succeeds; update re-pointing `project_id` at User B's project rejected; cross-user update/delete affect 0 rows.
- **`tags`**: insert with a spoofed `user_id` (User B's) rejected; cross-user update/delete affect 0 rows.
- **`task_tags`**: insert linking an owned task to User B's tag rejected; insert linking User B's task to an owned tag rejected (both FK sides independently ownership-checked); insert linking an owned task to an owned tag succeeds; User A sees only their own link rows; cross-user delete affects 0 rows.
- **`weekly_priorities`**: insert referencing User B's `task_id` rejected; insert with a spoofed `user_id` rejected; insert with an owned `task_id` succeeds; cross-user delete affects 0 rows.

Every case passed on the first run — no fix required, unlike Phase 4's `goals` finding. All fixture rows and both test users were deleted at the end of the test run (`delete from auth.users where id in (...)`, cascading through every owned row); the development database was confirmed empty of test data afterward.

### Phase 6: isolation test for calendar_events and time_blocks, no findings

Same methodology again, extended to `calendar_events` and `time_blocks`:

- **`calendar_events`**: insert with a spoofed `user_id` (User B's) rejected; own insert succeeds; User A sees only their own row; cross-user update/delete affect 0 rows.
- **`time_blocks`**: insert referencing User B's `task_id` rejected; insert referencing User B's `project_id` rejected; insert with a spoofed `user_id` rejected; insert with an owned `task_id`+`project_id` succeeds; update re-pointing an owned row's `task_id` at User B's task rejected; User A sees only their own row; cross-user update/delete affect 0 rows.

Every case passed on the first run. Fixtures and both test users deleted afterward; development database confirmed empty of test data.

### Phase 7: isolation test for habits, habit_logs, challenges, challenge_days, and focus_sessions, no findings

Same methodology again, extended to all five tables this phase added:

- **`habits`**: insert with `goal_id` pointing at User B's goal rejected; insert with `project_id` pointing at User B's project rejected; insert with own `goal_id`+`project_id` succeeds; update re-pointing an owned habit's `goal_id` at User B's goal rejected; User A sees only their own habit; cross-user update/delete affect 0 rows.
- **`habit_logs`**: insert under User B's habit rejected (ownership via join through `habits`); insert under own habit succeeds; User A sees only their own habit's logs; cross-user update/delete affect 0 rows.
- **`challenges`**: insert with `goal_id` pointing at User B's goal rejected; insert with own `goal_id` succeeds; User A sees only their own challenge; cross-user update/delete affect 0 rows.
- **`challenge_days`**: insert under User B's challenge rejected (ownership via join through `challenges`); insert under own challenge succeeds; User A sees only their own challenge's days; cross-user update/delete affect 0 rows.
- **`focus_sessions`**: insert referencing User B's `task_id` rejected; insert referencing User B's `project_id` rejected; insert with an owned `task_id`+`project_id` succeeds; User A sees only their own session; cross-user update/delete affect 0 rows.

Every case passed on the first run. Fixtures and both test users deleted afterward; development database confirmed empty of test data.

### Phase 7: streak/consistency engine correctness (blueprint §K.2)

No unit-test framework is otherwise installed in this project (Playwright E2E only), and `features/habits/progress.ts` is pure server-side TypeScript with no database dependency, so `tests/habit-streak.ts` (run via `npx tsx tests/habit-streak.ts`) exercises the real module directly rather than driving the UI through a real login (which this sandbox still can't do — see Known Limitation below). Ten cases, all passing: a 5-day unbroken daily streak; a streak broken by a gap, counting only the trailing run; today unmarked not breaking yesterday's streak; a weekdays habit correctly ignoring weekends; a weekly habit's streak counted in weeks, including the current week not yet marked not breaking it and a past unmarked week breaking it; a paused habit's streak frozen at its pause date, ignoring later activity; 7-day consistency computed correctly; and consistency returning `null` (not a misleading `0%`) for a habit that hasn't started yet.

### Phase 8: isolation test for decisions, journal_entries, and ideas, no findings

Same methodology again, extended to all three tables this phase added:

- **`decisions`**: insert with `goal_id`/`project_id`/`task_id` each independently pointing at User B's row rejected; insert with all three pointing at own rows succeeds; User A sees only their own decision; cross-user update/delete affect 0 rows.
- **`journal_entries`**: insert with `goal_id` pointing at User B's goal rejected; insert with `decision_id` pointing at User B's decision rejected; insert with all four optional links (`goal_id`/`project_id`/`task_id`/`decision_id`) pointing at own rows succeeds; User A sees only their own entry; cross-user update/delete affect 0 rows.
- **`ideas`**: insert with `promoted_project_id` pointing at User B's project rejected; own insert (no promotion yet) succeeds; User A sees only their own idea; cross-user update/delete affect 0 rows.

Every case passed on the first run. Fixtures and both test users deleted afterward; development database confirmed empty of test data.

### Phase 9: isolation test for weekly_reviews and monthly_reviews, no findings

Same methodology again, extended to both tables this phase added:

- **`weekly_reviews`**: User A sees 0 of User B's rows via `select`; cross-user `update` (e.g. flipping `status` to `completed`) affects 0 rows; cross-user `delete` affects 0 rows; insert with `next_week_mio_task_id` pointing at User B's task rejected (`violates row-level security policy`); insert with an owned `next_week_mio_task_id` succeeds; update re-pointing an owned row's `next_week_mio_task_id` at User B's task also rejected (the FK-ownership check applies to `update`, not just `insert`).
- **`monthly_reviews`**: User A sees 0 of User B's rows via `select`; cross-user `delete` affects 0 rows (no FK to verify — `user_id` scoping alone).

Every case passed on the first run. Fixtures (two `auth.users` rows, one `tasks` row per user, one `weekly_reviews`/`monthly_reviews` row per user) and both test users deleted afterward; development database confirmed empty of test data via a follow-up count query across all four fixture tables.

### Phase 9: Weekly Execution Score correctness (blueprint §L.1–L.2)

`features/reviews/execution-score.ts`'s `computeExecutionScore()` is pure logic with no database dependency, so `tests/execution-score.ts` (run via `npx tsx tests/execution-score.ts`) exercises the real module directly. Eleven cases, all passing: a full-data week's score matches a hand-computed weighted average; WeeklyTop3Completion and FocusTimeRatio are counted as 0 (not excluded) when their inputs are genuinely zero; ImportantTaskCompletion, HabitConsistency, and WeeklyReviewCompleted are each correctly excluded (with weights rescaled to 100% among the rest) when their denominator doesn't exist (no P1/P2 tasks due, no habits configured, no prior review to check); FocusTimeRatio caps at 100% when minutes exceed the target; a week with zero signal across every component returns `score: null`, never a misleading 0; and a partial-activity week rescales correctly.

### Phase 10: isolation test for ai_threads, ai_messages, and ai_insights, no findings

Same methodology again, extended to all three tables this phase added:

- **`ai_threads`**: User A sees 0 of User B's rows via `select`; cross-user `update` (title) affects 0 rows; cross-user `delete` affects 0 rows.
- **`ai_messages`**: User A sees 0 of User B's thread's messages via `select`; cross-user `delete` affects 0 rows; insert into User B's thread rejected (`violates row-level security policy`, via the join-to-parent-thread check); insert into an owned thread succeeds.
- **`ai_insights`**: User A sees 0 of User B's rows via `select`; cross-user `update` (status) affects 0 rows; insert with `thread_id` pointing at User B's thread rejected; insert with an owned `thread_id` succeeds.

Every case passed on the first run. Fixtures (two `auth.users` rows, one thread + one message + one insight per user) and both test users deleted afterward; development database confirmed empty of test data via a follow-up count query across all three fixture tables.

### Phase 10: Context Engine + insight write-path correctness

`features/ai/context/format.ts`'s five prompt formatters are pure logic with no database dependency — `tests/ai-context-format.ts` (run via `npx tsx`) exercises them directly, 24 cases covering every builder's populated and empty-data paths. Separately, `tests/ai-insight-write-path.ts` de-risks the one genuinely new piece of `approveInsight()` — whether the `FormData` it programmatically builds from an AI-proposed `plan_breakdown`/`suggest_reschedule` payload actually passes the same Zod validation (`taskSchema`, `milestoneSchema`) a human's real form submission would — without needing the pre-existing `createTask`/`addMilestone` Server Actions themselves to run outside a Next.js request (they call `cookies()`, so they can't run under plain `tsx`). 9 cases, all passing.

### Phase 10: AI provider secret handling and graceful degradation

Every adapter (`features/ai/providers/{anthropic,openai,local}.ts`) reads its own API key only inside its constructor, throws `AIUnavailableError` immediately if missing, and is only ever instantiated server-side (`lib/ai/provider.ts` and every adapter file carry `import "server-only"`). Every AI Server Action (`features/ai/actions.ts`) wraps its provider call in a `try/catch` that swallows `AIUnavailableError` (and any other provider failure) without ever letting it propagate to a crash — verified by code review of every `generate*`/`start*`/`sendChatMessage` action, each of which still creates/updates its thread and redirects (or returns a `{error}` ActionResult for the in-thread chat case) regardless of whether the provider call succeeded.

**Live provider testing is PENDING** — this development sandbox has no `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` configured (both blank in `.env.local`), so an actual successful chat/structured completion has not been exercised here, and neither has the "AI Coach is unavailable right now" UI in a live authenticated browser session (this sandbox cannot complete a real login at all — the same `*.supabase.co` egress block documented in `docs/ARCHITECTURE.md` for Phase 2's auth E2E test). What *is* verified live in this sandbox: every new/updated route (`/ai-coach`, `/ai-coach/[threadId]`, `/settings`) correctly redirects an unauthenticated request to `/login`. See ADR 0013.

## Secrets

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: safe to ship to the browser by Supabase's own design (RLS is the real boundary, not key secrecy), but still supplied only via env vars, never hardcoded.
- `SUPABASE_SERVICE_ROLE_KEY`: present in `.env.example` as a name only, left **blank** in this project's `.env.local` — nothing server-side needs elevated access yet. Never referenced in a Client Component; if a future phase needs it, it stays in a Route Handler/Server Action only.
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`: read only inside `features/ai/providers/{anthropic,openai}.ts`'s adapter constructors, server-side only, never logged, never included in any `ai_messages`/`ai_insights` payload (blueprint §N). Both left **blank** in this project's `.env.local` — see the Phase 10 PENDING note above.
- `.env.local` is gitignored (verified with `git check-ignore`); only `.env.example`, which holds no real values, is committed.

## Database hardening (via `get_advisors`)

`security` advisor reports zero findings as of the last migration. Fixed during Phase 2:
- `set_updated_at()` had a mutable `search_path` — pinned to `public`.
- `handle_new_user()` (a `security definer` function) was callable directly via PostgREST RPC by `anon`/`authenticated` — `EXECUTE` revoked from both, and from the trigger-only `set_updated_at()` too. Neither function should ever be called directly; both still work as triggers, since trigger invocation bypasses `EXECUTE` grants.
- All four RLS policies re-evaluated `auth.uid()` per row — rewritten to `(select auth.uid())` so Postgres evaluates it once per query.

`performance` advisor flagged two missing FK-covering indexes after the Phase 5 migration (`task_tags.tag_id`, `weekly_priorities.task_id` — the composite PK/unique index each table already had doesn't lead with that column, so a lookup by it alone still scans); fixed immediately in a follow-up migration (`tasks_kanban_missing_fk_indexes`). The Phase 6 migration (`calendar_time_blocks`) had no such gap — every FK got its own index from the start. Remaining `performance` findings are informational "unused index" notices, expected on a fresh dev database with no query traffic history — not a real problem.

## Known limitation of this development session

This session's outbound network access is restricted to a small host allowlist; `*.supabase.co` is not on it (confirmed via the egress proxy's own diagnostics — a `403` policy denial logged against the project's host). This means the running Next.js app, inside this sandbox, cannot itself complete a live signup/login round trip here — only the privileged `mcp__Supabase__*` tool channel could reach the database, which is what all schema and RLS testing above used. This is specific to this remote session's egress policy, not a defect in the app or an issue that exists when running `npm run dev` on a normal machine or in a Preview/Production deployment (see `docs/ENVIRONMENT.md`).

## Live auth E2E validation: PENDING

`tests/auth-smoke.mjs` (Playwright, drives the real UI through signup → profile check → logout → protected-route redirect → login → session persistence → wrong-password handling) has **not yet been run against real network access**. Two Claude Code Remote cloud environments on this account were tried as alternates to this sandbox and both were unable to complete a live run — one confirmed the identical `*.supabase.co` block, the other never got a live result. Phase 2 is **provisionally approved** by the project owner on the strength of the schema/RLS verification above alone; the live E2E result is an explicit open item, to be completed from the owner's local machine and then recorded here (pass/fail, date, environment). Until that entry exists, do not treat live authentication as confirmed working end-to-end — only the database-level guarantees (RLS isolation, schema correctness) and static code review are verified.
