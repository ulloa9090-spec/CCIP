# ADR 0010: Decisions have no sidebar nav entry — reached from /journal

**Status**: Accepted
**Date**: 2026-09-03

## Context

Same situation as ADR 0008 (Challenges), one phase later. The blueprint's data model (§I.6/§I.9) fully specifies a `decisions` table — options considered, chosen option, reasoning, expected outcome, a review date with a once-only "due for review" surfacing rule — and §D's screen inventory lists "Decision Detail" as a secondary (drill-down, no nav entry) screen. But the blueprint's own primary-nav list (§D) never names a "Decisions" screen at all, and neither does the primary screen inventory (§F) — Dashboard, Today, Goals, 90-Day Plan, Projects, Kanban, Calendar, Habits, Focus, Journal, Ideas, Reviews, Analytics, AI Coach, Settings. `journal_entries.decision_id` is the one place the blueprint explicitly links Journal and decisions together.

## Decision

Decisions live as a "Decision Log" section on `/journal` — a due-for-review list, the full decision list, and a "New Decision" modal — with Decision Detail at `/journal/decisions/[id]` (secondary route, no nav entry, same pattern ADR 0008 established for `/habits/challenges/[id]`). Every field and flow from §I.6 is implemented in full; only the navigation placement follows the blueprint's own nav list literally.

The "surfaced once, not repeatedly" rule (§I.6) is implemented as a pure read-time query rather than a stored notification: `getDueForReview()` selects decisions where `review_date <= today AND actual_outcome IS NULL`. Filling in `actual_outcome` (via `resolveDecision()`) is what removes a decision from that list — there is no separate "dismissed" flag or notifications-table dependency, since none of that exists yet (notifications is a later-phase table) and the outcome field itself already carries the exact information needed to know whether a decision has been reviewed.

## Consequences

- No `app/(app)/decisions/` route — `app/(app)/journal/decisions/[id]/page.tsx` is the only Decisions route, and `features/decisions/` is a sibling feature module to `features/journal/`, not nested inside it (same reasoning as ADR 0008's `features/challenges/` vs `features/habits/`).
- A decision only ever surfaces as "due" while it has a `review_date` in the past or today and no `actual_outcome` — a decision with no `review_date` at all never appears in the due list, matching the blueprint's description of `review_date` as what triggers the one-time surfacing.
- If a real notification/reminder mechanism is added in a later phase, "due for review" decisions are a natural additional source for it — the query already exists; the later work is delivery (push/email/Dashboard toast), not detection.
