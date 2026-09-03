# ADR 0014: Automations are evaluated at read-time, not by a background scheduler

**Status**: Accepted
**Date**: 2026-09-03

## Context

Blueprint §M.4 specifies the Automation engine as declarative `Trigger → Condition → Action` rows, and §O ("Background operations (future): Supabase Edge Functions or a queue... for automation engine execution, Phase 11 — not needed before then") explicitly flags that real background execution infrastructure becomes relevant once this phase arrives. At the same time, §M.4 itself cautions "MVP builds zero automation execution" when first introducing the data model in earlier phases' context — the intent there was to avoid designing the schema blind, not to forbid execution once Phase 11 actually owns it.

Phase 8 already solved a structurally identical problem for Decision "due for review": rather than a stored notification or a scheduled job, `getDueForReview()` is a pure read-time query (`review_date <= today AND actual_outcome IS NULL`), evaluated whenever `/journal` loads. That ADR's reasoning (§0010, generalizing from ADR 0008's pattern) was that "surfaced once, not repeatedly" doesn't need a scheduler if the underlying data already carries enough state to answer "is this due right now" on demand.

## Decision

`evaluateAutomations()` (`features/automations/evaluate.ts`) runs on every authenticated page load — called from `Header`, which every `(app)` route renders — rather than via a Supabase Edge Function on a cron schedule. Each automation's own `last_run_at` makes this idempotent: `task_overdue` re-checks at most once per UTC calendar day, `weekly_schedule` re-checks only once its scheduled slot has actually passed since the last run. Both checks are cheap (`isTaskOverdueCheckDue`/`isWeeklyScheduleDue` in `features/automations/match.ts`, pure functions) and skip all real query work when nothing is due, so evaluating on every navigation adds negligible overhead for a single-user personal app.

## Consequences

- No new infrastructure this phase — no Edge Function deployment, no `pg_cron` schedule, nothing to monitor for failed background runs.
- An automation only fires the next time the user actually opens the app — a `weekly_schedule` automation set for Sunday 18:00 doesn't notify the user in real time at 18:00 if they're not using the app; it notifies the next time they load a page after that. Acceptable for MVP (notifications are in-app only, not push, so there was no way to reach an absent user anyway), but worth knowing before promising "you'll be notified at exactly 6pm."
- A real scheduled executor (Edge Function + `pg_cron`, per blueprint §O) remains the natural upgrade if push notifications or precise-timing automations are wanted later — that's an additive change to *how* `evaluateAutomations()`'s logic gets invoked, not a rewrite of the matching logic itself (`match.ts` stays the same either way).
- This generalizes Phase 8's Decision-due-for-review pattern into a named, reusable architecture rather than a one-off — a future feature needing "check X whenever the user shows up" can follow the same shape without inventing its own.
