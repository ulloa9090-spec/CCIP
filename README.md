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

**Phase 10 — AI Intelligence Layer.** Real AI Coach (`/ai-coach`): Morning Brief, Evening Review, and Weekly Coach generate-on-demand cards, freeform chat, and a Context Engine (blueprint §M.2) that reuses the same data Dashboard and Weekly Review already assemble. Weekly Coach and Planning Assistant (from Goal/Project Detail) may propose a suggestion — a card the user must Approve, edit-then-Approve, or Ignore before anything actually changes; Approve always goes through the exact same Server Action a human edit would use. Decision Assistant (from an unresolved Decision) offers advisory perspective only. See [`AI_ARCHITECTURE.md`](./docs/AI_ARCHITECTURE.md).

Phases 1-9 (product foundation, auth + database, Dashboard architecture, Goals + 90-Day Plan, Projects + Tasks + Kanban, Today + Calendar + Time Blocking, Habits + Challenges + Focus Timer, Journal + Ideas + Decision Log, Reviews + Analytics) are complete. Phase 2's live end-to-end auth test, and Phase 10's live AI provider test, are both **pending** follow-ups (see below) — this sandbox has no real Supabase network access or AI provider key configured; unrelated to and unaffected by any other phase's work.

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
   - Visiting any `(app)` route while signed out redirects to `/login`; sign up, and you land on `/dashboard` with 8 default Life Areas already seeded — visit `/goals` to create your first goal, `/plan-90-days` to start a cycle, `/projects` to create a project, `/tasks` for the Kanban board, `/today` for your daily view, `/calendar` to schedule a Time Block or Event, `/habits` to build a habit or start a 21-day challenge, `/focus` to run a focus session, `/journal` to write an entry or log a decision, `/ideas` for the Idea Parking Lot, `/reviews` to start this week's or month's review, `/analytics` for trend charts once you have some activity, or `/ai-coach` for Morning Brief/Evening Review/Weekly Coach/freeform chat (with a real `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` configured — otherwise it still creates the conversation and shows "AI Coach is unavailable right now").
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
lib/            Cross-domain infrastructure (Supabase clients, validation, time, utils, AI provider abstraction)
supabase/       Migrations (profiles/settings, life_areas/goals/quarter_cycles, projects/tasks/kanban, calendar/time_blocks, habits/challenges/focus, journal/ideas/decisions, weekly/monthly reviews, ai_threads/ai_messages/ai_insights — see docs/DATABASE.md)
tests/          E2E smoke tests (Playwright) + tests/habit-streak.ts, tests/execution-score.ts, tests/ai-context-format.ts, tests/ai-insight-write-path.ts (pure-logic correctness tests, run via tsx)
docs/           Product, architecture, database, security, and decision records
```

Full rationale for this structure: `docs/PHASE_0_BLUEPRINT.md` §P.

## Deployment

Vercel, with separate Development / Preview / Production Supabase projects. See `docs/PHASE_0_BLUEPRINT.md` §Q.
