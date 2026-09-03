# ADR 0003: Route protection lives in `proxy.ts`, not `middleware.ts`

**Status**: Accepted
**Date**: 2026-09-03

## Context

Next.js 16 (the version this project scaffolded on — see `AGENTS.md`'s warning about training-data mismatches) deprecated and renamed the `middleware.ts` file convention to `proxy.ts` (exported function renamed `middleware` → `proxy`). Building it as `middleware.ts` produced a build-time deprecation warning and an official codemod pointing at the rename.

## Options

1. Keep `middleware.ts` — it still works (deprecated, not removed) and matches most existing Supabase/Next.js tutorials.
2. Adopt `proxy.ts` now, since this project has no legacy consumers of the old convention and the framework docs are explicit that new code should not use `middleware.ts`.

## Decision

Option 2 — `proxy.ts` at the repo root, exporting `proxy()`, importing `updateSession()` from `lib/supabase/middleware.ts`.

## Consequences

- The Supabase-facing helper module stays named `lib/supabase/middleware.ts` (matching Supabase's own SSR auth guide naming for `updateSession()`), even though the Next.js entry point that calls it is `proxy.ts` — this split is intentional and documented inline in that file to avoid confusing future readers.
- No deprecation warning on `next build`.
- Any future Next.js docs/tutorials referencing `middleware.ts` for new features should be translated to `proxy.ts` conventions in this repo.
