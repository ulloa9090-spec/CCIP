# ADR 0007: Hand-built Calendar grid, click-to-create over drag-to-create, no per-profile timezone conversion yet

**Status**: Accepted
**Date**: 2026-09-03

## Context

Phase 6 needed a Day/Week/Month calendar rendering Time Blocks, Calendar Events, and task due dates on one grid (blueprint §F/§I.5), plus a way to schedule new items onto it. The Phase 0 blueprint's §O.6 already recommended a lightweight hand-built grid over a calendar mega-library, flagging drag-and-drop precision as the main open risk to revisit if this phase proved it wrong.

## Decision

**Hand-built grid, confirmed.** `features/calendar/lib/date-range.ts` does the Day/Week/Month math with `date-fns` (no calendar library); `TimeGrid`/`MonthGrid` render it with plain CSS grid + absolutely-positioned blocks. This held up fine for Phase 6's scope — the risk flagged in §O.6 didn't materialize.

**Click-to-create, not drag-to-create.** The blueprint's Flow 8 describes dragging a task from an "unscheduled" tray onto a slot. Phase 6 implements the same outcome differently: clicking an empty hour cell on the Day/Week grid opens a **New Time Block** modal prefilled with that slot's start time, with a Task/Project dropdown to link it — same result (a task becomes a scheduled Time Block), reached through a modal instead of a drag gesture. This avoids the added engineering of drag-and-drop hit-testing and cross-component drag state for a first pass, at the cost of one extra click. `dnd-kit` (already a dependency since Phase 5's Kanban board, ADR 0006) is the natural fit if pixel-precise drag-to-schedule is wanted later — revisit then, not before it's asked for.

**Existing Time Blocks and Events are editable in place** — clicking a rendered block/event chip opens an Edit modal (same form, pre-filled, with a Delete button) — but task due-date chips are display-only for now; rescheduling a task from the Calendar view isn't wired (it's already possible from the Task edit form's Scheduled Date field, per Phase 5).

**No per-profile timezone conversion yet.** `profiles.timezone` exists (Phase 2) but isn't consulted here: times are read/written as the browser's local wall-clock time via `datetime-local` inputs and stored as UTC-equivalent `timestamptz` without an explicit offset conversion. For a single-timezone user this is invisible; for a user whose profile timezone differs from their browser's, or who travels, block/event times could display a few hours off. This matches the blueprint's explicit MVP scope note ("no multi-calendar/timezone-juggling in MVP") — flagged here as a known simplification, not silently assumed away.

## Consequences

- Scheduling a task as a Time Block from the Calendar is two clicks (empty slot → modal → pick the task) rather than one drag — acceptable, not a redesign.
- A future phase adding real timezone support needs to convert every `datetime-local` value through `profiles.timezone` at the form boundary (both directions); today's code has no such conversion layer to strip out first, since none was added.
- If within-column-like density ever becomes a problem (many overlapping blocks in one hour), the current absolute-positioning approach doesn't do side-by-side layout for overlaps — blocks will visually stack. Not observed as a real problem yet; revisit if it becomes one.
