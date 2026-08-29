# Childcare Financial & Building Capacity Studio

A financial modeling application for Child Care Centers: starting from licensed capacity and
enrollment by age group, it computes tuition/subsidy revenue, payroll, operating expenses, and
EBITDA — then uses that operating economy, not a guessed building price, to determine how much
a center can responsibly borrow and spend on a building.

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full system architecture, data
model, calculation dependency map, formula dictionary, screen map, and phased build plan.

## Status: Phases 1–6 complete

All six planned phases are live:

- **Financial Core** — editable licensed capacity and age groups, enrollment validation, a
  tuition engine (correct weekly→monthly conversion, never ×4), private-pay/subsidized revenue
  split, OPEX (fixed / per-child / % of revenue), EBITDA, and an executive Dashboard.
- **Staffing & Break-Even** — child:staff ratios that render as UNKNOWN / NEEDS VERIFICATION
  rather than being assumed, staffing-cliff detection, and a Break-Even engine that simulates
  enrollment child-by-child (not a linear formula, since cliffs make cost non-linear).
- **Building Affordability** — DSCR and target-margin debt-capacity methods with the more
  conservative always binding, standard loan amortization, working capital, a negotiation
  buffer, and a LOW/MEDIUM confidence flag that keeps results an honest "PRELIMINARY RANGE"
  until real project costs are entered.
- **Financing** — actual multi-tranche deals (SBA 504, SBA 7(a), conventional, seller/owner, or
  custom — no market rate ever hard-coded), a Sources & Uses table that reports a FUNDING GAP
  rather than hiding it, Property-First affordability verdicts (AFFORDABLE / AFFORDABLE WITH
  CONDITIONS / RENEGOTIATE / HIGH RISK / NOT AFFORDABLE), and Reverse Calculation ("how many
  children do I need to afford this building?").
- **Scenarios** — independent Conservative/Base/Optimistic/Custom variants (switching swaps
  every screen; edits to an inactive scenario are never lost), an automatic Sensitivity
  Analysis across 8 fixed presets, and a freeform What-If Sandbox that previews combined
  deltas without committing them.
- **Reports** — an Executive Summary, a deterministic Feasibility Decision (STRONG / VIABLE /
  CONDITIONAL / HIGH RISK / NOT VIABLE with binding constraint, risks, missing information, and
  suggested actions), a 5-Year Annual Projection, a Purchase vs. Lease comparison, a
  Sources & Uses report, a read-only Lender View ("Bank Mode"), and installable-PWA groundwork
  (manifest + offline app-shell caching; all project data already lives in IndexedDB).

Multi-project and multi-scenario save/duplicate/rename/delete, all via IndexedDB.

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
persistence behind a swappable repository interface, vite-plugin-pwa for the installable app
shell, Vitest + Testing Library for tests.
