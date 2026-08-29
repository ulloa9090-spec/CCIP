# Childcare Financial & Building Capacity Studio

A financial modeling application for Child Care Centers: starting from licensed capacity and
enrollment by age group, it computes tuition/subsidy revenue, payroll, operating expenses,
and EBITDA — and (in later phases) uses that operating economy, not a guessed building
price, to determine how much a center can responsibly borrow and spend on a building.

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full system architecture, data
model, calculation dependency map, formula dictionary, screen map, and phased build plan.

## Status: Phase 1 — Financial Core

Live: editable licensed capacity, add/remove age groups, enrollment validation, tuition
engine (correct weekly→monthly conversion), private-pay/subsidized revenue split, payroll
(flat entry per position), operating expenses (fixed / per-child / % of revenue), EBITDA,
monthly cash flow, and an executive Dashboard. Multi-project save/duplicate/rename/delete via
IndexedDB. Staffing ratios & cliffs, break-even, building affordability, financing, scenarios,
and reports arrive in Phases 2–6.

## Development

```bash
npm install
npm run dev        # start the dev server
npm test           # run the engine test suite (Vitest)
npm run lint        # oxlint
npm run build        # typecheck + production build
```

The financial engine (`src/engine/`) is a set of pure, deterministic functions — no
calculation result is ever produced by an AI model (see `docs/ARCHITECTURE.md` §57). Every
formula in `src/engine/` has a corresponding unit test in `src/engine/__tests__/`.

## Tech stack

React + TypeScript + Vite, Zustand for state, Tailwind CSS, Dexie (IndexedDB) for local
persistence behind a swappable repository interface, Vitest + Testing Library for tests.
