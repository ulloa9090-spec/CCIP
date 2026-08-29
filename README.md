# Childcare Financial & Building Capacity Studio

A financial modeling application for Child Care Centers: starting from licensed capacity and
enrollment by age group, it computes tuition/subsidy revenue, payroll, operating expenses,
and EBITDA — and (in later phases) uses that operating economy, not a guessed building
price, to determine how much a center can responsibly borrow and spend on a building.

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full system architecture, data
model, calculation dependency map, formula dictionary, screen map, and phased build plan.

## Status: Phases 1–5 — Financial Core through Scenarios

Live: editable licensed capacity, add/remove age groups, enrollment validation, tuition
engine (correct weekly→monthly conversion), private-pay/subsidized revenue split, operating
expenses (fixed / per-child / % of revenue), EBITDA, monthly cash flow, and an executive
Dashboard. Classroom staffing driven by child:staff ratios that render as UNKNOWN / NEEDS
VERIFICATION rather than being assumed, staffing-cliff detection, support/admin payroll, a
Break-Even engine that simulates enrollment child-by-child (not a linear formula, since
staffing cliffs make cost non-linear), margin-tier targets, and per-classroom contribution
economics. A Building Calculator computes Maximum Property Price as a consequence of the
center's own operating economy — DSCR and target-margin debt-capacity methods with the more
conservative one always binding, standard loan amortization, editable non-property project
costs, working capital (quick method), a negotiation buffer, and a LOW/MEDIUM confidence flag
that keeps the result an honest "PRELIMINARY RANGE" until real project costs are entered.
Actual multi-tranche financing structures (SBA 504, SBA 7(a), conventional, seller/owner
financing, or custom — no current market rate ever hard-coded), a Sources & Uses table that
reports a FUNDING GAP rather than hiding it, saved Properties with Property-First affordability
verdicts (AFFORDABLE / AFFORDABLE WITH CONDITIONS / RENEGOTIATE / HIGH RISK / NOT AFFORDABLE),
and a Reverse Calculation panel answering "how many children do I need to afford this specific
building?" A Scenario Manager saves independent Conservative/Base/Optimistic/Custom variants
(each with its own enrollment, tuition, staffing, expenses, project costs, and financing —
switching scenarios swaps every screen at once, and edits to an inactive scenario are never
lost), an automatic Sensitivity Analysis re-runs the full engine against 8 fixed presets
(tuition ±10%, wages +10%, enrollment ±10%, renovation +20%, interest rate ±1%), and a
freeform What-If Sandbox previews combined deltas (children, tuition, wages, interest) without
committing them. Multi-project save/duplicate/rename/delete via IndexedDB. Purchase vs. Lease
and Reports/Lender View/PWA arrive in Phase 6.

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
