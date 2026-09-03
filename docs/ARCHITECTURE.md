# Architecture

Living summary of the system as actually built, updated at the close of each phase. The authoritative design decisions live in [`PHASE_0_BLUEPRINT.md`](./PHASE_0_BLUEPRINT.md) §O–§S; this file tracks what's true *right now*, not the full rationale.

## Current state (Phase 1)

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4.
- **Routing:** `app/(auth)/*` (login/signup/forgot-password — structural placeholders, no logic) and `app/(app)/*` (the 14 primary product routes, wrapped in `AppShell`). `/dev/components` is an internal-only design-system verification route.
- **Layout:** `components/layout/app-shell.tsx` composes `Sidebar` + `Header`. `Sidebar` is desktop-only (`md:` breakpoint); `MobileNav` provides the same navigation as a slide-over panel below that breakpoint.
- **Theming:** `next-themes`, class-based, dark is the default. All color/spacing/radius values are CSS custom properties defined once in `app/globals.css` and mapped into Tailwind via `@theme inline` — no hardcoded colors in components.
- **Design system:** `components/ui/*` — Button, Input, Textarea, Select, Card, Modal, Badge, Progress Bar, Progress Ring, Skeleton, Empty State, Tooltip. Built on Radix UI primitives for accessibility (focus management, keyboard nav) plus `class-variance-authority` for variants.
- **Data layer:** `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (Server Components/Actions) exist and are wired to env vars. **No tables, no RLS, no auth flows** — `/api/health` only confirms connectivity. Schema arrives in Phase 2.
- **AI layer:** Not implemented. `features/ai/providers/` exists as an empty placeholder directory per the Phase 0 blueprint's repo structure; the `AIProvider` interface and adapters are built in Phase 10.
- **State management:** No global client store yet — nothing in Phase 1 needs one (Quick Add's local state is component-level `useState`). TanStack Query and/or Zustand are added only when a real feature (Kanban, Calendar, Focus Timer) needs them, per blueprint §O.2.

## Not yet decided / deferred

- `lib/supabase/middleware.ts` (session-refresh helper) and a root `middleware.ts` for protected routes: built in Phase 2 alongside authentication.

## Environments

A Development Supabase project (`atlas-os-development`) is provisioned and connected — see [`ENVIRONMENT.md`](./ENVIRONMENT.md) for details and local setup. Preview and Production are not yet provisioned.

## Decisions

Significant architecture decisions get a dedicated file in [`decisions/`](./decisions) using the ADR format (Number, Title, Status, Context, Options, Decision, Consequences, Date) per blueprint §P.1. None recorded yet beyond what's already fixed in the Phase 0 blueprint itself.
