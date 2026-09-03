# Architecture

Living summary of the system as actually built, updated at the close of each phase. The authoritative design decisions live in [`PHASE_0_BLUEPRINT.md`](./PHASE_0_BLUEPRINT.md) §O–§S; this file tracks what's true *right now*, not the full rationale.

## Current state (Phase 2)

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4.
- **Routing:** `app/(auth)/*` (login/signup/forgot-password/reset-password — real forms, Server Action-backed) and `app/(app)/*` (the 14 primary product routes, wrapped in `AppShell`, protected by `proxy.ts`). `/dev/components` is an internal-only design-system verification route. `app/auth/confirm/route.ts` handles the Supabase PKCE email-link callback (both signup confirmation and password recovery).
- **Layout:** `components/layout/app-shell.tsx` composes `Sidebar` + `Header`. `Header` is now an async Server Component reading the session and rendering `UserMenu` (email + logout) when signed in.
- **Theming:** `next-themes`, class-based, dark is the default. All color/spacing/radius values are CSS custom properties defined once in `app/globals.css` and mapped into Tailwind via `@theme inline`.
- **Design system:** `components/ui/*` — Button, Input, Textarea, Select, Card, Modal, Badge, Dropdown Menu, Progress Bar, Progress Ring, Skeleton, Empty State, Tooltip. Built on Radix UI primitives plus `class-variance-authority` for variants.
- **Data layer:** `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (Server Components/Actions, cookie-bound), `lib/supabase/middleware.ts` (`updateSession()` — session refresh + route protection, called from `proxy.ts`). Schema: `profiles` + `settings`, RLS on both — see [`DATABASE.md`](./DATABASE.md).
- **Auth:** Supabase Auth, email/password. `features/auth/actions.ts` — Server Actions (`signUp`, `logIn`, `logOut`, `requestPasswordReset`, `updatePassword`) validated with Zod (`lib/validation/auth.ts`), mapping Supabase error messages to plain-language text. Forms use React 19's `useActionState` directly against these Server Actions (no client-side form library) — see ADR 0002.
- **Route protection:** `proxy.ts` (Next.js 16's renamed `middleware.ts` convention — see ADR 0003) calls `updateSession()` on every request. Unauthenticated users hitting a protected route are redirected to `/login`; authenticated users hitting `/login` or `/signup` are redirected to `/dashboard`. Uses `getUser()` (revalidates the token against Supabase Auth), never `getSession()` alone.
- **AI layer:** Not implemented. `features/ai/providers/` exists as an empty placeholder directory; the `AIProvider` interface and adapters are built in Phase 10.
- **State management:** No global client store yet.

## Not yet decided / deferred

- `PWA`/offline (Phase 12).
- Domain tables (goals, projects, tasks, ...) — see `DATABASE.md` and ADR 0001.

## Environments

A Development Supabase project (`atlas-os-development`) is provisioned and connected — see [`ENVIRONMENT.md`](./ENVIRONMENT.md). Preview and Production are not yet provisioned.

**Known constraint of this remote session**: outbound network access to `*.supabase.co` (and most hosts other than a small allowlist) is denied by this session's egress policy — confirmed via the proxy's own diagnostics (`recentRelayFailures` showing a `403` gateway denial for the project's host). This means the Next.js app's *own* runtime, running inside this sandbox, cannot complete a live signup/login round trip here, even though the `mcp__Supabase__*` tools (a separate, privileged channel) work fine and were used for all schema/RLS verification. This is a constraint of this particular remote session, not of the code or of a normal local/Vercel environment — see `docs/ENVIRONMENT.md` and the Phase 2 completion report for what was and wasn't verifiable here.

## Decisions

ADRs live in [`decisions/`](./decisions):
- [0001](./decisions/0001-phase-2-schema-scope.md) — Phase 2 builds only the identity-scoped schema, not the full 28-table blueprint at once.
