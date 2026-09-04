# ADR 0016: Kanban columns are render-capped, not paginated — Journal gets real pagination

**Status**: Accepted
**Date**: 2026-09-04

## Context

Blueprint §O.10's performance budget calls out "Pagination on any list that can exceed ~50 rows (Tasks table, Journal, Ideas archive)." Journal (`/journal`) is a genuine flat, chronologically-growing list — page-number pagination applies cleanly. Tasks (`/tasks`) and Ideas (`/ideas`) are both Kanban boards (blueprint §D.2/§0.29, built in Phases 5 and 8 respectively) — a fixed set of columns, each independently droppable via `dnd-kit`. The blueprint's own screen inventory lists "Tasks (Kanban/List)" as a toggle, but no List view was ever built in any phase (Kanban shipped, List didn't) — this ADR doesn't revisit that; it only decides how to keep an unbounded Kanban *column* from becoming a performance problem.

Page-number pagination doesn't map onto a Kanban column the way it does a flat list: a column is a drag-and-drop target, not a paged view, and dnd-kit's `useDroppable` needs every card that could be a drop target actually mounted (or at least the ones visible) — introducing "page 2 of the Done column" would fight the drag-and-drop interaction model for no real benefit at personal-app scale.

## Decision

Each `KanbanColumn` (`features/tasks/components/kanban-column.tsx`) and `IdeaColumn` (`features/ideas/components/idea-column.tsx`) renders at most 50 cards by default, with a "Show N more" button (local `useState`) revealing the rest on demand. `getTasks()`/`getIdeas()` still fetch every row (RLS-scoped to the user already bounds this to personal-app scale) — the cap is render-only, so drag-and-drop still works correctly once expanded, and the column's header count always shows the true total.

`getJournalEntries()` (`features/journal/queries.ts`) gets real `?page=` pagination instead — `JOURNAL_PAGE_SIZE = 30`, a `.range()` query fetching one extra row to detect `hasMore` without a separate `count` query, and Newer/Older controls on `/journal`.

## Consequences

- A user with a genuinely huge single Kanban column (500+ tasks in "Inbox," say) still pays the cost of fetching all of them from Postgres on every `/tasks` load — the render cap only bounds DOM node count, not query cost. Acceptable at personal-app scale (blueprint's explicit design target — see PHASE_0_BLUEPRINT.md §C "Primary user"); a future phase could add a server-side per-column limit if this ever becomes real.
- If a real Tasks List view is ever built (completing the blueprint's originally-scoped Kanban/List toggle), it should get real `?page=` pagination like Journal, not the Kanban board's render-cap pattern — the two aren't interchangeable, and this ADR's decision is specific to the Kanban shape, not a statement that pagination itself was rejected.
