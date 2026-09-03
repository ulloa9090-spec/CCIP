# Atlas OS — Personal Operating System

A personal execution operating system that connects Vision → Goals → 90-Day Plan → Projects → Milestones → Weekly Priorities → Tasks → Calendar/Habits → Reviews → Analytics → Replanning.

Full product and architecture context lives in [`docs/`](./docs):

- [`docs/PRODUCT_UNDERSTANDING_REPORT.md`](./docs/PRODUCT_UNDERSTANDING_REPORT.md) — pre-implementation product analysis.
- [`docs/PHASE_0_BLUEPRINT.md`](./docs/PHASE_0_BLUEPRINT.md) — the full design blueprint (UX, data model, architecture) that governs every phase.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — living system architecture summary.
- [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) — design tokens and component inventory.
- [`docs/DATABASE.md`](./docs/DATABASE.md) — live schema, migrations, RLS policies.
- [`docs/SECURITY.md`](./docs/SECURITY.md) — auth, RLS isolation testing, secrets handling.
- [`docs/ENVIRONMENT.md`](./docs/ENVIRONMENT.md) — Development/Preview/Production Supabase projects.

This repository is built in phases; do not add functionality outside the phase currently in progress. See `PHASE_0_BLUEPRINT.md` §T for the roadmap.

## Status

**Phase 9 — Reviews + Analytics.** Real `/reviews` (Weekly/Monthly tabs, past reviews list, an auto-aggregated session screen with a 7-question reflection form and next-week MIO handoff) and `/analytics` (7 fixed metric cards with Recharts trend charts across 7/30/90/365-day ranges). The Weekly Execution Score (blueprint §L) is computed and locked at review completion. The Dashboard's Weekly Score and Weekly Review widgets now run real queries — every Dashboard module is real as of this phase.

Phases 1-8 (product foundation, auth + database, Dashboard architecture, Goals + 90-Day Plan, Projects + Tasks + Kanban, Today + Calendar + Time Blocking, Habits + Challenges + Focus Timer, Journal + Ideas + Decision Log) are complete. Phase 2's live end-to-end auth test is a **pending** follow-up (see below) — unrelated to and unaffected by any phase's work since.

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
   See `.env.example` for the full variable list. `AI_*` variables are unused until Phase 10.
3. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).
4. **Verify the shell**
   - Visiting any `(app)` route while signed out redirects to `/login`; sign up, and you land on `/dashboard` with 8 default Life Areas already seeded — visit `/goals` to create your first goal, `/plan-90-days` to start a cycle, `/projects` to create a project, `/tasks` for the Kanban board, `/today` for your daily view, `/calendar` to schedule a Time Block or Event, `/habits` to build a habit or start a 21-day challenge, `/focus` to run a focus session, `/journal` to write an entry or log a decision, `/ideas` for the Idea Parking Lot, `/reviews` to start this week's or month's review, or `/analytics` for trend charts once you have some activity.
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
features/       Domain logic (goals, projects, tasks, habits, auth, dashboard, ai, ...)
components/ui/  Design-system primitives
components/layout/  Sidebar, Header, Quick Add, theme toggle, user menu
lib/            Cross-domain infrastructure (Supabase clients, validation, time, utils)
supabase/       Migrations (profiles/settings, life_areas/goals/quarter_cycles, projects/tasks/kanban, calendar/time_blocks, habits/challenges/focus, journal/ideas/decisions, weekly/monthly reviews — see docs/DATABASE.md)
tests/          E2E smoke tests (Playwright) + tests/habit-streak.ts, tests/execution-score.ts (pure-logic correctness tests, run via tsx)
docs/           Product, architecture, database, security, and decision records
```

Full rationale for this structure: `docs/PHASE_0_BLUEPRINT.md` §P.

## Deployment

Vercel, with separate Development / Preview / Production Supabase projects. See `docs/PHASE_0_BLUEPRINT.md` §Q.
