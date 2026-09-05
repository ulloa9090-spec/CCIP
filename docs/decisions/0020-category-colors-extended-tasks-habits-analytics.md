# ADR 0020: Category colors extended to Tasks, Habits, and Analytics

**Status**: Accepted
**Date**: 2026-09-05

## Context

ADR 0019 introduced per-widget category colors on the Dashboard only, scoped deliberately to one screen. The project owner then asked to apply the same visual language to three more screens: Tasks (Kanban), Habits (week grid + heatmap), and Analytics (metric cards + charts).

Each screen's "category" concept is different in shape, so a single mechanical rule doesn't fit all three — this ADR records the per-screen decision made for each.

## Decision

### Shared infrastructure: `lib/design/category-colors.ts`

The 11 `--category-*` tokens and their Tailwind class maps (previously local to `features/dashboard/components/widget-accent.ts`) moved to a shared `lib/design/category-colors.ts` — `CategoryColor` type, `CATEGORY_CHIP_CLASSES` (icon chips), `CATEGORY_DOT_CLASSES` (small solid dots), `CATEGORY_BORDER_CLASSES` (border-only), `CATEGORY_SURFACE_CLASSES` (border + soft bg tint, e.g. a drag-over highlight), `CATEGORY_CSS_VAR` (raw `var(--category-x)` string for non-Tailwind consumers like Recharts), and `pickCategoryColor(seed)` (a stable hash-based color for entities with no fixed category). `features/dashboard/components/widget-accent.ts` was deleted; `WidgetCard` and `RecentActivityCard` now import from the shared module — no behavior change, just deduplication ahead of reuse.

### Tasks — fixed color per Kanban column (workflow stage)

`features/tasks/components/status-accent.ts`: `TASK_STATUS_ACCENT` maps each of the 7 `TaskStatus` values to a color (Backlog=slate, This Week=cyan, Today=blue, In Progress=amber, Waiting=orange, Done=teal, Cancelled=rose) — the column a task is in is a fixed, enumerable category, exactly like a Dashboard widget's identity. `KanbanColumn` shows a small colored dot next to its label and uses the column's color for the drag-over highlight (previously a flat `border-accent`); `KanbanCard` gets a thin colored left border matching its own status, so a card's stage reads at a glance even out of column context.

**Priority is left untouched.** `TaskPriorityBadge` keeps its existing `danger`/`warning`/`accent`/`neutral` variants — priority is a severity signal, not a category, and overloading it with an arbitrary category color would blur that meaning (the same reasoning ADR 0019 applied to Weekly Score's ring).

### Habits — a stable color per habit, not per fixed category

Habits are user-created with a free-text `category` field that's often empty — there's no fixed enum to key off like Tasks' status. Instead, `pickCategoryColor(habit.id)` derives a stable color per habit (a simple string hash, so it never changes as habits are added/reordered) and a small dot appears next to the habit's name in both `WeekGrid` and `Heatmap` — the same habit gets the same color in both views since both key off the same `habit.id`. The done/missed cell coloring (`success`/`danger`) is untouched — that's real execution status, not decoration, and changing it to per-habit colors would break the "green=done, red=missed" legend across the whole grid.

### Analytics — icon + color per metric, reusing Dashboard's domain colors

`features/analytics/metric-accent.ts`: each of the 7 metrics gets an icon and a color, reusing the *same* color already assigned to the analogous Dashboard widget so a concept reads as one color everywhere in the app (Habit Consistency=orange like the Habits widget, Focus Minutes=teal like Focus, Weekly Score Trend=rose like Weekly Score, Weekly Priority Completion=cyan like Weekly Priorities). `overdueTasks` uses the real `danger` token instead of a category color — being overdue is a severity signal, matching the Tasks-priority reasoning above. `MetricCard` gained an icon chip (previously: none, just a title and a number); `MetricChart`'s primary line now uses the metric's own color instead of a flat `var(--accent)` for every chart — a second series (only `createdVsCompleted` has one) stays a neutral `var(--text-secondary)` so the two lines don't compete for the same meaning.

### Verification without a live session

Tasks, Habits, and Analytics have no dev-only fixture preview route the way the Dashboard does (`/dev/dashboard-preview`). A temporary route was created locally, fed fixture data through the real components (`KanbanColumn`, `WeekGrid`, `Heatmap`, `MetricCard`) to confirm rendering and zero console errors, then deleted before committing — it was a one-time verification aid, not a shipped artifact. Live authenticated verification of these three real routes remains blocked by this project's standing sandbox limitation (no `*.supabase.co` egress — see `docs/SECURITY.md`).

## Consequences

- `pickCategoryColor()`'s hash can put two habits next to each other in similar colors by chance (11 buckets, no collision avoidance across a short list) — acceptable for a decorative identifier at personal-app scale; not worth a more complex assignment algorithm.
- Reusing Dashboard's domain colors on Analytics means adding an 8th metric later should extend `METRIC_ACCENT` with a color that doesn't already carry a specific Dashboard-widget meaning, to keep the cross-screen consistency this ADR relies on.
- No new dev-only preview route was added for Tasks/Habits/Analytics — a future request for permanent visual QA infrastructure on these screens (matching `/dev/dashboard-preview`) would be a separate, explicit decision, not implied by this one.
