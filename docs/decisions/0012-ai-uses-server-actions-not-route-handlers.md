# ADR 0012: AI Coach uses Server Actions, not `app/api/ai/` Route Handlers

**Status**: Accepted
**Date**: 2026-09-03

## Context

The blueprint's illustrative repository tree (§P) shows `app/api/ai/` as "server-only AI route handlers" — the one place in the whole tree that names a Route Handler for a domain feature rather than a Server Action. Every other domain built in Phases 2–9 (auth, goals, projects, tasks, calendar, habits, journal, ideas, reviews) uses Server Actions exclusively — `app/api/` has never held anything beyond `/api/health` (a connectivity check) and `/auth/confirm` (the Supabase PKCE callback, which necessarily is a Route Handler since it's a redirect target Supabase itself calls, not a form submission from this app).

A chat send, a brief generation, and an insight Approve are all just "take some input, call a provider, write some rows, tell the UI what happened" — the same shape as every other mutation already built. Server Actions in this codebase already handle that shape directly (`sendChatMessage`, `approveInsight`, etc.), including ones called as plain functions from Client Components rather than via a `<form>` (`features/tasks/actions.ts`'s `updateTaskStatus` on Kanban drop is the established precedent for this).

## Decision

Every AI mutation (`generateMorningBrief`, `startPlanningAssistant`, `sendChatMessage`, `approveInsight`, etc.) is a Server Action in `features/ai/actions.ts`, called either directly from a `<form action={...}>` (the generate-on-demand cards, mirroring `startOrGetWeeklyReview`'s Phase 9 pattern) or as a plain async function from a Client Component (`InsightCard`'s Approve/Ignore buttons, mirroring Kanban's drag-drop pattern). No `app/api/ai/` directory exists.

## Consequences

- One request/mutation pattern across the entire app, not two — a contributor never has to ask "is this domain's write path a Server Action or a Route Handler" before touching AI code.
- No streaming responses for chat in this pass — `chatCompletion`/`structuredCompletion` resolve fully before the Server Action returns, so a reply appears all at once rather than token-by-token. Acceptable for MVP (the blueprint doesn't require streaming); if genuine token-streaming is wanted later, that's the one case that would justify introducing `app/api/ai/chat/route.ts` as a real Route Handler returning a streamed `Response` — Server Actions can technically stream too (an async generator + `useActionState`), but a Route Handler is the more idiomatic fit for that specific need, so this ADR's "no Route Handlers" stance would need revisiting at that point, not silently worked around.
- This is a deliberate, documented deviation from the blueprint's own illustrative tree (§P) — recorded here per that section's own rule that central architecture decisions "never [change] silently."
