# Architecture

Living summary of the system as actually built, updated at the close of each phase. The authoritative design decisions live in [`PHASE_0_BLUEPRINT.md`](./PHASE_0_BLUEPRINT.md) §O–§S; this file tracks what's true *right now*, not the full rationale.

## Current state (Phase 3)

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4.
- **Routing:** `app/(auth)/*` (login/signup/forgot-password/reset-password — real forms, Server Action-backed) and `app/(app)/*` (the 14 primary product routes, wrapped in `AppShell`, protected by `proxy.ts`). `/dev/components` and `/dev/dashboard-preview` are internal-only, unauthenticated verification routes. `app/auth/confirm/route.ts` handles the Supabase PKCE email-link callback (both signup confirmation and password recovery).
- **Layout:** `components/layout/app-shell.tsx` composes `Sidebar` + `Header`. `Header` is an async Server Component reading the session and rendering `UserMenu` (email + logout) when signed in.
- **Dashboard:** `features/dashboard/` — see the dedicated section below. Widgets stream independently via per-widget Suspense boundaries; every widget renders against a typed contract (`features/dashboard/types.ts`), not a raw table.
- **Theming:** `next-themes`, class-based, dark is the default. All color/spacing/radius values are CSS custom properties defined once in `app/globals.css` and mapped into Tailwind via `@theme inline`.
- **Design system:** `components/ui/*` — Button (now supports `asChild` via `@radix-ui/react-slot`, for rendering as a styled `<Link>`), Input, Textarea, Select, Card, Modal, Badge, Dropdown Menu, Progress Bar (now takes an optional `ariaLabel` distinct from its visible `label`, so a bar never ships without an accessible name), Progress Ring, Skeleton, Empty State, Tooltip. Built on Radix UI primitives plus `class-variance-authority` for variants.
- **Data layer:** `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (Server Components/Actions, cookie-bound), `lib/supabase/middleware.ts` (`updateSession()` — session refresh + route protection, called from `proxy.ts`). Schema: `profiles` + `settings`, RLS on both — see [`DATABASE.md`](./DATABASE.md).
- **Auth:** Supabase Auth, email/password. `features/auth/actions.ts` — Server Actions (`signUp`, `logIn`, `logOut`, `requestPasswordReset`, `updatePassword`) validated with Zod (`lib/validation/auth.ts`), mapping Supabase error messages to plain-language text. Forms use React 19's `useActionState` directly against these Server Actions (no client-side form library) — see ADR 0002.
- **Route protection:** `proxy.ts` (Next.js 16's renamed `middleware.ts` convention — see ADR 0003) calls `updateSession()` on every request. Unauthenticated users hitting a protected route are redirected to `/login`; authenticated users hitting `/login` or `/signup` are redirected to `/dashboard`. Uses `getUser()` (revalidates the token against Supabase Auth), never `getSession()` alone.
- **AI layer:** Not implemented. `features/ai/providers/` exists as an empty placeholder directory; the `AIProvider` interface and adapters are built in Phase 10.
- **State management:** No global client store yet.

## Dashboard architecture (Phase 3)

**Data contracts** (`features/dashboard/types.ts`): every widget renders a `DashboardXData` shape, never a raw table row, wrapped in `ModuleResult<T> = { status: 'ready', data: T } | { status: 'error' }`. This is the seam Phases 4–9 build against — when a phase adds its table, only the matching fetcher's body in `get-dashboard-data.ts` changes from a static empty value to a real query; no widget needs to change.

**Data access** (`features/dashboard/get-dashboard-data.ts`): one exported fetcher per module (`getTodayData`, `getActiveProjectData`, ...), each wrapped by `safeModule()` so one module's failure can never crash the page — it resolves to `{status: 'error'}` and the widget renders an inline `WidgetError` instead. `getDashboardData()` composes all of them via `Promise.all` for a single-shot bundle (documented convenience, not what the live page uses); the live Dashboard instead has **each widget fetch independently inside its own Server Component**, wrapped in its own `<Suspense fallback={<WidgetSkeleton/>}>` in `app/(app)/dashboard/page.tsx`, so modules stream in independently rather than the page waiting on the slowest one. `profiles` is the only real query today (everything else is a documented empty stand-in — see the comment on each fetcher for which phase adds its table).

**Widget composition**: each widget file (`features/dashboard/components/*.tsx`) exports a pure `<X>CardBody({ result })` (the actual render, given a resolved `ModuleResult`) plus an async `<X>Card()` that fetches then delegates to it. This split is what lets `/dev/dashboard-preview` render the *exact same* production markup with fixture data instead of a live query — the two paths cannot drift apart because they share the render function, not just similar-looking JSX.

**Layout** (`features/dashboard/components/dashboard-grid.tsx`): one CSS grid, each widget wrapped in a cell carrying both an unprefixed `order-N` (mobile) and an `md:order-N` (tablet/desktop) class. Mobile shows Today → Active Project → Habits → Focus first (Phase 3 §11); at `md:` the order resets to the desktop four-level hierarchy (blueprint §G). This is a real reorder — verified by `tests/dashboard-smoke.mjs`, which asserts Habits renders above 90-Day Goal at mobile width and below it at desktop width — not just a `grid-cols` shrink.

**Dev-only demo fixtures** (`features/dashboard/demo/fixtures.ts` + `app/dev/dashboard-preview/page.tsx`): fixture `ModuleResult` data for empty/populated/error states, rendered through the real `*CardBody` components. Not imported by any production route, not linked from navigation, not protected by `proxy.ts` (nothing on the route touches auth or Supabase). Safe to delete both the `demo/` directory and the preview route without touching production behavior.

## Not yet decided / deferred

- `PWA`/offline (Phase 12).
- Domain tables (goals, projects, tasks, ...) — see `DATABASE.md` and ADR 0001. Each Dashboard module fetcher documents which phase will replace its empty stand-in.

## Environments

A Development Supabase project (`atlas-os-development`) is provisioned and connected — see [`ENVIRONMENT.md`](./ENVIRONMENT.md). Preview and Production are not yet provisioned.

**Known constraint of this remote session**: outbound network access to `*.supabase.co` (and most hosts other than a small allowlist) is denied by this session's egress policy — confirmed via the proxy's own diagnostics (`recentRelayFailures` showing a `403` gateway denial for the project's host). This means the Next.js app's *own* runtime, running inside this sandbox, cannot complete a live signup/login round trip here, even though the `mcp__Supabase__*` tools (a separate, privileged channel) work fine and were used for all schema/RLS verification. This is a constraint of this particular remote session, not of the code or of a normal local/Vercel environment.

### Live auth E2E status: PENDING

Two other Claude Code Remote cloud environments on this account (`Calculadora CCIP`, `StudyOS`) were tried as alternates. `Calculadora CCIP` actually ran and confirmed the identical `*.supabase.co` egress block — same account-level restriction, not specific to this one session. `StudyOS` never got past its own confirmation gate. Neither produced a live result. **`tests/auth-smoke.mjs` has not been run against real network access as of the close of Phase 2 — its pass/fail is PENDING, not assumed, until run from the project owner's local machine.** Phase 2 is provisionally approved on schema/RLS verification alone (see `docs/SECURITY.md`); the code itself was not changed to work around this constraint. Update this section once the local run's result is in.

## Decisions

ADRs live in [`decisions/`](./decisions):
- [0001](./decisions/0001-phase-2-schema-scope.md) — Phase 2 builds only the identity-scoped schema, not the full 28-table blueprint at once.
