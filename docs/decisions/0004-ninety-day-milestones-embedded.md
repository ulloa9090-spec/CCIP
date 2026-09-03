# ADR 0004: 90-Day Cycle milestones are an embedded field, not the relational `milestones` table

**Status**: Accepted
**Date**: 2026-09-03

## Context

The master prompt's Phase 4 description lists "Milestones" alongside Goals, Life Areas, 90-Day cycles, and metrics. The Phase 0 blueprint's `milestones` table, however, is Project-scoped (`project_id not null`) and belongs to Phase 5, where it needs task rollups, Kanban, and progress computation tied to Projects — none of which exist in Phase 4. Building the full relational `milestones` table now would mean either leaving `project_id` nullable (weakening a Phase 5 constraint before Phase 5 exists) or standing up Project-adjacent machinery early, both of which cross the Phase 4/5 boundary the project has otherwise held firmly.

## Options

1. Build the relational `milestones` table now, `project_id` nullable, tighten it in Phase 5.
2. Represent a 90-Day Cycle's "3 major milestones" as a lightweight embedded field on `quarter_cycles` (a `jsonb` array of `{title, targetDate, done}`), and let the real Project-scoped `milestones` table arrive in Phase 5 as originally designed.

## Decision

Option 2. `quarter_cycles.key_milestones jsonb not null default '[]'`, capped at 3 entries by app-level validation (`lib/validation/goals.ts`), toggled done/not-done via `toggleCycleMilestone()` (`features/plan-90-days/actions.ts`).

## Consequences

- Satisfies the master prompt's literal ask ("define 3 major milestones for this quarter") without opening the Project/Milestone system early.
- No migration needed when Phase 5 adds the real `milestones` table — the two concepts (a cycle's headline milestones vs. a project's tracked milestones) are independent; nothing needs to migrate from one to the other.
- A cycle's milestones don't roll up into Weekly Score or any cross-entity progress calculation — they're a checklist, not a tracked entity with their own analytics. If a future phase wants that, it's a new, explicit decision, not an automatic consequence of this one.
