# ADR 0011: Weekly Execution Score uses a fixed focus-time target, not a per-user setting

**Status**: Accepted
**Date**: 2026-09-03

## Context

The Weekly Execution Score's FocusTimeRatio component (blueprint §L.1) is defined as `min(actual focus minutes / target focus minutes, 1)`. The blueprint doesn't specify where "target focus minutes" comes from, and `settings` (Phase 2) has no field for it — Settings only covers profile, timezone, week start, and theme (blueprint §S), with no mention of a focus-time goal anywhere in its spec.

Recharts was also confirmed at the start of this phase as the charting library for `/analytics`'s trend charts, matching what the blueprint names in §O — no alternative was seriously considered, so this ADR records the confirmation rather than a real choice.

## Decision

`DEFAULT_WEEKLY_FOCUS_TARGET_MINUTES = 300` (`features/reviews/execution-score.ts`) is a fixed constant, applied identically to every user, standing in for a per-user configurable target. `computeExecutionScore()` takes only a `WeeklyMetrics` object — the target isn't threaded through as a parameter — so this is a single well-known spot to change if/when the target becomes configurable.

Recharts (already a `package.json` dependency, confirmed unchanged) renders every Analytics trend chart (`features/analytics/components/metric-chart.tsx`), one `<LineChart>` per metric card, styled entirely off the app's existing CSS custom properties (`var(--accent)`, `var(--border)`, etc.) so charts stay theme-aware without a second color system.

## Consequences

- Every user is held to the same 300-minute (5-hour) weekly focus target regardless of their actual capacity or goals — a known simplification, not a modeling error.
- Adding a configurable target later is a Settings field (`settings.weekly_focus_target_minutes` or similar) plus one call-site change in `computeExecutionScore()`'s caller (`features/reviews/aggregate.ts`'s `computeWeeklyMetrics()` would need to read and pass it through) — no change to the scoring formula itself, the redistribution rule, or `tests/execution-score.ts`'s existing cases (they'd need the new parameter threaded in, but the assertions stay the same at the default value).
- A user who habitually focuses for, say, 90 minutes/week by design (a different work style, not a lapse) will show a permanently low FocusTimeRatio and thus a capped Weekly Execution Score — acceptable for MVP, flagged here as the first thing to revisit if configurability is requested.
