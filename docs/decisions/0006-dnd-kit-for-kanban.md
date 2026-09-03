# ADR 0006: `dnd-kit` for the Task Kanban board; drag-drop scope kept to a single status update

**Status**: Accepted
**Date**: 2026-09-03

## Context

Phase 5's Kanban board (`app/(app)/tasks/page.tsx`, blueprint §O.4) needs drag-and-drop between status columns. The Phase 0 blueprint named `dnd-kit` as the intended library without installing it; Phase 5 is the first phase that actually needs drag-drop, so this is where the choice gets made.

## Decision

Use `@dnd-kit/core` + `@dnd-kit/utilities` (sortable within a column isn't needed yet — cards aren't manually orderable within a status, only movable between statuses, so `@dnd-kit/sortable` wasn't added). `KanbanBoard` holds the task list in local state seeded from the server-fetched list; `onDragEnd` optimistically updates that state and calls `updateTaskStatus(taskId, status)` — a plain async Server Action (not form-bound) called directly, the same "call a Server Action from a client event handler" pattern `PrimaryProjectControl` already established in Phase 5's Projects UI. No `revalidatePath`-driven refetch on drop; the optimistic local state is the source of truth until the next full page load, keeping the interaction latency-free.

The board only renders the five columns in `KANBAN_COLUMNS` (`inbox`→Backlog, `next`→This Week, `today`→Today, `in_progress`, `done`) — `waiting` and `cancelled` tasks exist in the data model but aren't columns; they're filtered out of the board view entirely rather than given a column, since the blueprint's board is explicitly the five-stage execution flow, not every possible task status.

## Consequences

- `dnd-kit` is now a direct dependency (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — the last two installed together for when within-column ordering is needed later; only `core` and `utilities` are imported so far).
- A task moved to `waiting` or `cancelled` from outside the board (e.g. the task detail view, once one exists) will disappear from the Kanban board — expected, not a bug, given the column scope above.
- No drag-and-drop reordering within a column yet (no `sort_order` on `tasks`); if manual within-column ordering is wanted later, it needs both a schema change and `@dnd-kit/sortable`'s `SortableContext`.
