# Atlas OS — Personal Operating System

A personal execution operating system that connects Vision → Goals → 90-Day Plan → Projects → Milestones → Weekly Priorities → Tasks → Calendar/Habits → Reviews → Analytics → Replanning, with an AI Coach advising (never deciding) throughout.

Full product and architecture context lives in [`docs/`](./docs):

- [`docs/PRODUCT_UNDERSTANDING_REPORT.md`](./docs/PRODUCT_UNDERSTANDING_REPORT.md) — pre-implementation product analysis.
- [`docs/PHASE_0_BLUEPRINT.md`](./docs/PHASE_0_BLUEPRINT.md) — the full design blueprint (UX, data model, architecture) that governs every phase.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — living system architecture summary.
- [`docs/AI_ARCHITECTURE.md`](./docs/AI_ARCHITECTURE.md) — AI provider abstraction, Context Engine, Action Model.
- [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) — design tokens and component inventory.
- [`docs/DATABASE.md`](./docs/DATABASE.md) — live schema, migrations, RLS policies.
- [`docs/SECURITY.md`](./docs/SECURITY.md) — auth, RLS isolation testing, secrets handling.
- [`docs/ENVIRONMENT.md`](./docs/ENVIRONMENT.md) — Development/Preview/Production Supabase projects.

This repository is built in phases; do not add functionality outside the phase currently in progress. See `PHASE_0_BLUEPRINT.md` §T for the roadmap.

## Status

**Phase 12 — Production Hardening. MVP complete: all 12 roadmap phases are built.** Error boundaries at every route-group level (blueprint §O.7), real pagination for Journal / render-capping for the Tasks and Ideas Kanban boards (ADR 0016), a per-user daily AI generation cap layered onto Supabase Auth's native brute-force protection (blueprint §N), a real Data Export (JSON full backup + Tasks/CSV + Journal/CSV, PDF explicitly deferred — ADR 0017), and an installable PWA shell (manifest, SVG icon, service worker with cache-first assets / network-first-then-offline-fallback navigations). A project-wide `get_advisors` re-audit (not just the latest migration) closed the phase with two more missing FK-covering indexes fixed and zero security findings.

Phases 1-11 (product foundation, auth + database, Dashboard architecture, Goals + 90-Day Plan, Projects + Tasks + Kanban, Today + Calendar + Time Blocking, Habits + Challenges + Focus Timer, Journal + Ideas + Decision Log, Reviews + Analytics, AI Intelligence Layer, Integrations + Automation) are complete. Phase 2's live end-to-end auth test and Phase 10's live AI provider test remain **pending** follow-ups (see below) — this sandbox has no real Supabase network access or AI provider key configured; unrelated to and unaffected by any other phase's work. Calendar sync and Social login (Phase 11, ADR 0015) stay deferred — they need real OAuth credentials this environment can't self-provision.

## Stack

Next.js (App Router) · React · TypeScript (strict) · Tailwind CSS v4 · Supabase (Postgres/Auth/Storage) · a decoupled AI provider layer (inert until Phase 10).

## Local development

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd CCIP
   npm install
   ```
2. **Environment variables** — copy the example file and fill in your own **Development** Supabase project's credentials (never share these, never use your Production project for local work). See `docs/ENVIRONMENT.md` for the current Development project's ref/URL:
   ```bash
   cp .env.example .env.local
   ```
   See `.env.example` for the full variable list. `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` are optional — AI Coach degrades to "unavailable right now" without one, rather than failing to build or start.
3. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).
4. **Verify the shell**
   - Visiting any `(app)` route while signed out redirects to `/login`; sign up, and you land on `/dashboard` with 8 default Life Areas already seeded — visit `/goals` to create your first goal, `/plan-90-days` to start a cycle, `/projects` to create a project, `/tasks` for the Kanban board, `/today` for your daily view, `/calendar` to schedule a Time Block or Event, `/habits` to build a habit or start a 21-day challenge, `/focus` to run a focus session, `/journal` to write an entry or log a decision, `/ideas` for the Idea Parking Lot, `/reviews` to start this week's or month's review, `/analytics` for trend charts once you have some activity, `/ai-coach` for Morning Brief/Evening Review/Weekly Coach/freeform chat (with a real `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` configured — otherwise it still creates the conversation and shows "AI Coach is unavailable right now"), or `/settings` to create an Automation and watch a real notification appear in the Header's bell icon on your next page load.
   - `/login` also offers "Email me a sign-in link instead" for passwordless Magic Link sign-in (same underlying Supabase Auth mechanism as password reset).
   - `/dev/components` renders every design-system primitive for visual QA (internal-only, not linked from navigation).
   - `/dev/dashboard-preview?state=empty|populated|error` renders the real Dashboard widgets against fixture data (internal-only) — useful for visual/responsive QA without needing a logged-in session.
   - `/api/health` reports Supabase connectivity status (note: only proves env vars/client construction, not a live network round trip — see caveat below).
5. **Auth smoke test** — **PENDING, not yet run against real network access** (optional to run yourself; requires real network access to your Supabase project):
   ```bash
   npm run dev &
   node tests/auth-smoke.mjs
   ```
   Drives signup → profile check → logout → protected-route redirect → login → session persistence → wrong-password handling through the real UI with Playwright. Could not be run inside the remote session that built Phase 2 (its egress policy blocks `*.supabase.co`), nor in two alternate Claude Code Remote cloud environments tried afterward — see `docs/ARCHITECTURE.md` and `docs/SECURITY.md`. **Please run this locally and report the result** so Phase 2's live-auth validation can move from PENDING to confirmed.
6. **Dashboard smoke test** (no real network access needed — uses the fixture preview route):
   ```bash
   npm run dev &
   node tests/dashboard-smoke.mjs
   ```
   Protected-route check, empty/populated/error widget rendering, responsive mobile-priority reordering, keyboard focus, an axe-core accessibility scan, and a no-console-error check.
7. **Habit streak/consistency test** (pure logic, no server or network needed):
   ```bash
   npx tsx tests/habit-streak.ts
   ```
   Verifies the blueprint §K.2 streak/consistency engine directly — gap handling, weekday/weekly units, the paused-habit freeze, and the trailing-window consistency percentage.
8. **Weekly Execution Score test** (pure logic, no server or network needed):
   ```bash
   npx tsx tests/execution-score.ts
   ```
   Verifies the blueprint §L.1–L.2 scoring formula directly — component exclusion vs. counted-as-0, weight redistribution, the FocusTimeRatio cap, and the "not enough data" `null` guard.
9. **AI Context Engine test** (pure logic, no server or network needed):
   ```bash
   npx tsx tests/ai-context-format.ts
   ```
   Verifies the blueprint §M.2 Context Engine's five prompt formatters directly.
10. **AI insight write-path test** (pure logic, no server or network needed):
    ```bash
    npx tsx tests/ai-insight-write-path.ts
    ```
    Verifies the FormData `approveInsight()` builds from an AI-proposed suggestion passes the same Zod validation a human's real form submission would.
11. **Live AI provider test — PENDING, not yet run against a real key**: this repo's sandbox has no `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` configured, so an actual successful chat/structured completion (and the "AI Coach is unavailable right now" degraded UI in a real logged-in session) hasn't been exercised live — see `docs/AI_ARCHITECTURE.md` and ADR 0013. **If you run this locally with a real key configured, try `/ai-coach` → Generate on a Morning Brief and report the result.**
12. **Automation matching test** (pure logic, no server or network needed):
    ```bash
    npx tsx tests/automation-match.ts
    ```
    Verifies the blueprint §M.4 Automation engine's trigger-matching and idempotency logic directly — overdue-day/priority matching, and the "has this week's/today's scheduled slot already fired" checks.
13. **CSV export format test** (pure logic, no server or network needed):
    ```bash
    npx tsx tests/csv-format.ts
    ```
    Verifies `toCsv()` (`lib/utils/csv.ts`) directly — RFC-4180-ish quoting on commas/quotes/newlines, CRLF line endings, header row, empty-input handling.
14. **Data Export / PWA smoke check**: signed in, `/settings` → Data Export card → download JSON/CSV; a service worker registers at `/sw.js` (DevTools → Application → Service Workers), and the app is installable (browser's install icon / "Add to Home Screen"). Not exercised live in this sandbox — same auth-dependent limitation as the auth smoke test above.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build (must succeed before any phase is closed) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Repository structure

```
app/            Next.js App Router — routing + composition
proxy.ts        Session refresh + protected-route redirects (Next.js 16's middleware convention)
features/       Domain logic (goals, projects, tasks, habits, auth, dashboard, ai, automations, notifications, export, ...)
components/ui/  Design-system primitives
components/layout/  Sidebar, Header (NotificationBell + evaluateAutomations()), Quick Add, theme toggle, user menu, ServiceWorkerRegistration
lib/            Cross-domain infrastructure (Supabase clients, validation, time, utils incl. csv.ts, AI provider abstraction)
supabase/       Migrations (profiles/settings, life_areas/goals/quarter_cycles, projects/tasks/kanban, calendar/time_blocks, habits/challenges/focus, journal/ideas/decisions, weekly/monthly reviews, ai_threads/ai_messages/ai_insights, notifications/automations, production_hardening_indexes — see docs/DATABASE.md)
tests/          E2E smoke tests (Playwright) + tests/habit-streak.ts, tests/execution-score.ts, tests/ai-context-format.ts, tests/ai-insight-write-path.ts, tests/automation-match.ts, tests/csv-format.ts (pure-logic correctness tests, run via tsx)
docs/           Product, architecture, database, security, and decision records
public/         Static assets — manifest icon (icon.svg), service worker (sw.js)
```

Full rationale for this structure: `docs/PHASE_0_BLUEPRINT.md` §P.

## Deployment

Vercel, with separate Development / Preview / Production Supabase projects. See `docs/PHASE_0_BLUEPRINT.md` §Q.
