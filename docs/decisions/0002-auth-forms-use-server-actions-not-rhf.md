# ADR 0002: Auth forms use Server Actions + useActionState, not React Hook Form

**Status**: Accepted
**Date**: 2026-09-03

## Context

`PHASE_0_BLUEPRINT.md` §O.3 specifies React Hook Form + Zod as the general form strategy, and `react-hook-form` was installed in Phase 2 for that purpose. Building the login/signup/forgot-password/reset-password forms raised the question of whether to wire RHF's client-side validation on top of the Server Actions, or let the Server Action be the single source of validation.

## Options

1. **React Hook Form on the client**, calling the Server Action inside `onSubmit`, duplicating (or awkwardly bridging) the Zod schema between client-side and server-side validation paths.
2. **Native `<form action={serverAction}>` + React 19's `useActionState`**, with Zod validation happening once, inside the Server Action, and the action returning `{ error?, fieldErrors? }` for the component to render.

## Decision

Option 2 for these four auth forms. `useActionState` + a plain `<form action={...}>` is the pattern Next.js's own App Router and Supabase's SSR auth guides converge on: it works with zero client JS (progressive enhancement), avoids re-implementing validation twice, and keeps `lib/validation/auth.ts`'s Zod schemas as the single source of truth for both shapes RHF would otherwise need reconciled.

## Consequences

- `react-hook-form` and `@hookform/resolvers` stay installed and available for later forms where autosave, per-field dirty state, or complex multi-step wizards make RHF's client-side machinery genuinely useful (per blueprint §O.3) — e.g. Task/Project detail forms in Phase 5.
- Every future form should default to the Server Action + `useActionState` pattern first, and only reach for RHF when a concrete need (not habit) justifies it.
