# ADR 0005: RLS policies on a table with an optional/nullable FK to another owned table must verify the referenced row's ownership too

**Status**: Accepted
**Date**: 2026-09-03

## Context

Phase 4's RLS isolation test (`docs/SECURITY.md`) caught a real gap: `goals_insert_own`/`goals_update_own` checked `user_id = auth.uid()` but not that `area_id` (and nullable `quarter_cycle_id`) actually pointed at a `life_areas`/`quarter_cycles` row owned by that same user. A user could insert a `goals` row referencing another user's `life_areas.id`. RLS on the joined table still prevented reading the other user's row through that relation (PostgREST embedding respects RLS on the embedded table), so this wasn't a read leak — but it was a real integrity/isolation hole: a foreign row a user doesn't own, referenced from a row they do, and (via `on delete restrict`/`on delete set null`) able to interfere with the *other* user's ability to manage their own data.

## Decision

Every table with a foreign key to another user-owned table must verify, in its `insert`/`update` RLS policies (not just app-level Zod validation), that the referenced row belongs to the same `auth.uid()`:

```sql
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.<parent_table> p where p.id = <fk_column> and p.user_id = (select auth.uid()))
  -- repeat per FK column, wrapping nullable FKs in `<fk> is null or exists (...)`
)
```

This applies to every future table with an owned-table FK: `projects.goal_id`, `tasks.project_id`/`goal_id`/`milestone_id`, `time_blocks.task_id`, `habits.goal_id`, and so on through Phases 5–9.

## Consequences

- Slightly more complex `insert`/`update` policies (an `exists` subquery per FK), but this is the only place the guarantee can actually be enforced — app-level validation is bypassable by any direct API call, matching the project's standing rule that RLS is the sole authorization boundary (`docs/SECURITY.md`).
- New tables' migrations must include this check from creation, not bolted on after a similar test catches it again — this ADR is the checklist item to apply before considering a table's RLS "done."
- Verified going forward the same way this one was found: the RLS isolation test pattern (two real users, `execute_sql` JWT-claim simulation) should include an explicit "insert referencing another user's parent row" case for every FK to an owned table, not just the same-table cross-user checks.
