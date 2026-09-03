# Changelog

Notable changes per phase. See `docs/PHASE_0_BLUEPRINT.md` §T for the roadmap and `docs/decisions/` for the reasoning behind non-obvious choices.

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
