# ADR 0019: Dashboard category colors + Recent Activity widget

**Status**: Accepted
**Date**: 2026-09-05

## Context

The project owner shared a screenshot of a different product (a study-app dashboard) as a visual reference and asked to bring elements of its aesthetic into Atlas OS's Dashboard specifically. Three scoping questions were asked and answered:

1. **Layout literalism** — reproduce the exact card layout (top KPI strip, specific card shapes) vs. keep Atlas OS's existing bento-grid (`DashboardGrid`, built Phase 3, mobile-priority reordering per ADR-less Phase 3 §11) and only adopt the visual style. **Answer: keep the existing grid.** No new top stat strip, no restructured columns — only recoloring/restyling within the grid already built.
2. **Palette** — the reference uses a distinct saturated color per category (blue, purple, orange, green, red, pink) rather than Atlas OS's single `--accent` token. **Answer: adopt multi-color categorization.**
3. **New content** — the reference has streak/level/XP gamification and a "Recent Activity" feed, neither of which exist in Atlas OS. **Answer: add Recent Activity with real data; do not invent an XP/leveling system** (no such mechanic exists in `PHASE_0_BLUEPRINT.md`, and inventing one is out of scope for a restyle request).

## Decision

### Category colors are additive, not a replacement for `--accent`

`--accent` remains the single color for every interactive element app-wide (buttons, links, focus rings) — this is unchanged and deliberate: a "which color is clickable" signal should never vary by widget. Eleven new `--category-*` tokens (`blue`, `indigo`, `violet`, `cyan`, `teal`, `orange`, `amber`, `rose`, `pink`, `sky`, `slate`) were added to `app/globals.css` (light + dark values, same pattern as every existing token pair) purely for **decorative categorization** — each Dashboard widget's icon now sits in a small colored chip (`WidgetCard`'s new optional `accent` prop, `features/dashboard/components/widget-accent.ts` holding the literal Tailwind class map, since dynamic `bg-category-${x}` string interpolation isn't visible to Tailwind's compiler). Each of the 11 pre-existing widgets got a distinct assigned color (Today=blue, Active Project=indigo, 90-Day Goal=violet, Weekly Priorities=cyan, Habits=orange, Calendar=sky, Focus=teal, Progress=pink, Weekly Score=rose, Idea Parking Lot=amber, Weekly Review=slate).

### Weekly Score's ring is now value-toned, never color-alone

`ProgressRing` gained an optional `tone` prop (`accent | success | warning | danger`). `WeeklyScoreCardBody` picks a tone from the score (≥75 success, ≥50 warning, else danger) — mirroring the reference's red/amber/green "Exam Readiness" gauge — and always pairs it with a same-meaning text label ("On track" / "Needs attention" / "Behind") directly under the ring, per this project's own existing design-system rule (`docs/DESIGN_SYSTEM.md` / ADR 0018 lineage: never communicate status through color alone).

### Recent Activity is a new, real-data widget — no gamification added

A 12th Dashboard widget, `RecentActivityCard` (`features/dashboard/components/recent-activity-card.tsx`), surfaces up to 8 recent real events merged from six already-existing feature queries — no new table, no new RLS surface: completed tasks (`getTasks()`, filtered on `completedAt`), completed habit check-ins (`getHabits()` + `getHabitLogs()`), today's focus sessions (`getTodaySessions()`), recent journal entries (`getJournalEntries()`), newly captured ideas (`getIdeas()`), and completed weekly reviews (`getWeeklyReviews()`). `getRecentActivityData()` (`features/dashboard/get-dashboard-data.ts`) merges and sorts these client-side by `occurredAt` and slices to the limit — every underlying query already runs through the calling user's authenticated, RLS-scoped Supabase client exactly as every other Dashboard module does, so this widget carries zero new security surface. Each item's icon reuses the same category color as its source domain (task=blue, habit=orange, focus=teal, journal=cyan, idea=amber, review=violet).

No streak/level/XP system was built. Habits' existing streak count (Phase 7) is the only "gamification-adjacent" number in the app and was left as-is, just recolored.

## Consequences

- `WIDGET_ACCENT_CLASSES` is a closed, hand-maintained map — adding a 12th (13th, ...) widget that wants its own unique color requires either reusing an existing token or adding a new one to both `globals.css` and the map. This is an accepted small amount of upkeep for keeping Tailwind's compiler able to see every class name statically.
- `getRecentActivityData()` makes 6 sequential-ish queries (parallelized via `Promise.all` plus one dependent `getHabitLogs` call) on every Dashboard load — acceptable at personal-app scale (the same scale argument every prior Dashboard module and ADR 0016 already made), not optimized further in this pass.
- Focus sessions in the feed are today-only (`getTodaySessions()` is the only exported query for that domain) — a genuine, minor limitation, not a 6-day lookback like the other sources. Acceptable for a "recent activity" glance; a future phase could add a real `getRecentFocusSessions()` if this matters more.
- This pass touched exactly one screen (Dashboard) and its shared `components/ui/progress-ring.tsx` primitive — consistent with ADR 0018's own scope discipline (no simultaneous multi-screen redesign).
