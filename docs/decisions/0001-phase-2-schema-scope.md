# ADR 0001: Phase 2 creates only the identity-scoped schema, not the full 28-table blueprint

**Status**: Accepted
**Date**: 2026-09-03

## Context

`PHASE_0_BLUEPRINT.md` §I.9 specifies a complete 28-table schema for the whole app. The master prompt's Phase 2 description ("Crear: schema; migrations; RLS; authentication; profile; login; signup; logout; protected routes") could be read either as "create the entire schema now" or "create the schema Phase 2 itself needs." Every other phase in the master prompt (4 through 9) bundles "its" schema with "its" UI feature (e.g. Phase 5: "Projects; Milestones; Tasks; Kanban").

## Options

1. **Build all 28 tables now**, RLS included, with zero UI referencing most of them until Phases 4–9 arrive.
2. **Build only what authentication itself needs** (`profiles`, `settings`), and let each later phase add its own tables in its own migration when the corresponding feature is built.

## Decision

Option 2. Phase 2 creates `profiles` and `settings` only, auto-provisioned on signup.

## Consequences

- Matches how every other phase is scoped (schema + UI together), keeping migrations tightly coupled to the feature that needs them.
- Avoids 26 tables sitting empty and untestable for up to 7 more phases.
- Each future phase's "Database Changes" section in its phase-start declaration will name a real migration, not "none (already created)."
- `DATABASE.md`'s domain-tables list stays the single source of truth for what's still pending, cross-referenced against `PHASE_0_BLUEPRINT.md` §I.9 for full column-level specs when each table is actually built.
