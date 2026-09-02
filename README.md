# Atlas OS — Personal Operating System

A personal execution operating system that connects Vision → Goals → 90-Day Plan → Projects → Milestones → Weekly Priorities → Tasks → Calendar/Habits → Reviews → Analytics → Replanning.

Full product and architecture context lives in [`docs/`](./docs):

- [`docs/PRODUCT_UNDERSTANDING_REPORT.md`](./docs/PRODUCT_UNDERSTANDING_REPORT.md) — pre-implementation product analysis.
- [`docs/PHASE_0_BLUEPRINT.md`](./docs/PHASE_0_BLUEPRINT.md) — the full design blueprint (UX, data model, architecture) that governs every phase.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — living system architecture summary.
- [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) — design tokens and component inventory.

This repository is built in phases; do not add functionality outside the phase currently in progress. See `PHASE_0_BLUEPRINT.md` §T for the roadmap and §U for Phase 1 acceptance criteria.

## Status

**Phase 1 — Product Foundation.** App shell, design system, navigation, and theming exist. No authentication, no database tables, no AI — those arrive in later phases.

## Stack

Next.js (App Router) · React · TypeScript (strict) · Tailwind CSS v4 · Supabase (Postgres/Auth/Storage) · a decoupled AI provider layer (inert until Phase 10).

## Local development

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd CCIP
   npm install
   ```
2. **Environment variables** — copy the example file and fill in your own **Development** Supabase project's credentials (never share these, never use your Production project for local work):
   ```bash
   cp .env.example .env.local
   ```
   See `.env.example` for the full variable list. In Phase 1, Supabase vars are optional — the app runs and `/api/health` reports `not_configured` until you add them. `AI_*` variables are unused until Phase 10.
3. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).
4. **Verify the shell**
   - `/dashboard` and the rest of the sidebar routes render with empty states.
   - `/dev/components` renders every design-system primitive for visual QA (internal-only, not linked from navigation).
   - `/api/health` reports Supabase connectivity status.

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
features/       Domain logic (goals, projects, tasks, habits, ai, ...)
components/ui/  Design-system primitives
components/layout/  Sidebar, Header, Quick Add, theme toggle
lib/            Cross-domain infrastructure (Supabase clients, validation, time, utils)
supabase/       Migrations (empty until Phase 2)
docs/           Product, architecture, and decision records
```

Full rationale for this structure: `docs/PHASE_0_BLUEPRINT.md` §P.

## Deployment

Vercel, with separate Development / Preview / Production Supabase projects. See `docs/PHASE_0_BLUEPRINT.md` §Q.
