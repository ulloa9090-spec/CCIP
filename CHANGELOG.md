# Changelog

Notable changes per phase. See `docs/PHASE_0_BLUEPRINT.md` §T for the roadmap and `docs/decisions/` for the reasoning behind non-obvious choices.

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
