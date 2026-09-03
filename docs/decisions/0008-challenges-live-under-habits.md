# ADR 0008: Challenges have no sidebar nav entry — reached from /habits

**Status**: Accepted
**Date**: 2026-09-03

## Context

The blueprint's data model (§I.9) includes a `challenges`/`challenge_days` pair for 21-day challenge tracking, and §D.92's screen inventory even lists "Challenge Detail" as a secondary (drill-down, no nav entry) screen. But the blueprint's own primary navigation list (§D, "Primary (sidebar, always visible)") enumerates Dashboard, Today, Goals, 90-Day Plan, Projects, Tasks, Calendar, **Habits**, Focus, Journal, Ideas, Reviews, Analytics, AI Coach — there is no separate "Challenges" entry anywhere in it.

## Decision

Challenges are built as a sub-section of `/habits` rather than their own primary route: a "21-Day Challenges" card on the Habits page (list + "New Challenge"), with Challenge Detail living at the secondary route `/habits/challenges/[id]` — the same pattern Project Detail (`/projects/[id]`) already established for a drill-down screen with no nav entry of its own. This isn't a scope cut; every field and flow from §I.9 (title, daily action, start date, optional goal link, 21 numbered days, status, final score, reflections) is implemented — only the navigation placement follows the blueprint's own nav list literally instead of inferring a nav entry the list doesn't contain.

## Consequences

- No `app/(app)/challenges/` route — `app/(app)/habits/challenges/[id]/page.tsx` is the only Challenges route, consistent with `features/challenges/` being a sibling feature module to `features/habits/`, not nested inside it (matching the blueprint's own `features/` tree, which lists `habits/` and `challenges/` as siblings).
- If a future phase's design work decides Challenges deserves its own primary nav entry after all, that's a nav/IA change, not a data model or Server Action change — everything in `features/challenges/` already stands on its own.
