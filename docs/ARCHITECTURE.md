# Childcare Financial & Building Capacity Studio — Architecture & Delivery Plan

Status: **Pre-build deliverable.** Per the spec, no application code is written until the
build is explicitly authorized. This document is deliverable #1: architecture, data model,
calculation dependency map, formula dictionary, screen map, MVP scope, technology
recommendation, persistence strategy, testing strategy, and known risks — followed by the
recommended build order.

---

## 1. System Architecture

Layered, unidirectional-flow SPA. The core rule the architecture exists to enforce: **the
deterministic engine computes, the AI layer only explains** (spec §57). No calculation
result may ever originate from a language model.

```
┌─────────────────────────────────────────────────────────────────┐
│  UI Layer (React + TypeScript)                                  │
│  Screens read derived state only; inputs dispatch actions.      │
│  Never computes a financial result itself.                      │
└───────────────▲───────────────────────────────┬─────────────────┘
                │ derived state                 │ input changes
┌───────────────┴───────────────────────────────▼─────────────────┐
│  Project Store (single source of truth per project/scenario)    │
│  Holds raw inputs + provenance metadata. Emits change events.   │
└───────────────▲───────────────────────────────┬─────────────────┘
                │ recompute()                   │ subscribe
┌───────────────┴───────────────────────────────▼─────────────────┐
│  Deterministic Calculation Engine (pure TS, no I/O, no AI)      │
│  Enrollment → Revenue → Staffing → Payroll → OPEX → EBITDA →    │
│  DSCR/Debt Capacity → Loan → Project Cost → Property Price      │
│  Implemented as a topologically-ordered dependency graph, like  │
│  a spreadsheet recalculation engine: each node is a pure        │
│  function of its declared upstream nodes.                       │
└───────────────▲───────────────────────────────┬─────────────────┘
                │ read                          │ read (for narration only)
┌───────────────┴───────────────┐   ┌───────────▼─────────────────┐
│  Persistence Layer             │   │  AI Explanation Layer       │
│  Repository interface;         │   │  Consumes engine OUTPUT +   │
│  IndexedDB now, swappable to   │   │  formula/assumption         │
│  a server DB later without     │   │  metadata to produce        │
│  touching engine/UI code.      │   │  "Explain This Number" text │
└─────────────────────────────────┘   │  and Alert Engine messages. │
                                       │  Cannot alter numbers.      │
                                       └──────────────────────────────┘
```

**Why a dependency graph, not ad-hoc functions:** spec §67–68 require that changing any
upstream input (e.g., toddler enrollment 8→9) automatically recomputes every downstream
result (staffing → payroll → EBITDA → debt capacity → max property price), and that each
fact is entered once and reused everywhere. A declared graph of pure nodes (id, inputs,
compute fn) gives us: (a) automatic recompute via topological sort, (b) a single source of
truth per node (no duplicate storage of "tuition" in two screens), (c) a natural place to
hang provenance/confidence metadata and "Explain This Number" (each node already knows its
formula and inputs), (d) testability — every node is a pure function testable in isolation.

**Scenario model:** a Project owns N Scenarios (Base/Conservative/Optimistic/Custom). Each
Scenario is a full input snapshot; the engine graph is instantiated per active scenario.
Scenarios never share mutable state — duplication is explicit (spec §38, §46–47).

**Two calculation modes share the same engine:**
- *Forward (Business → Building)*: normal dependency chain, ends in Max Property Price.
- *Reverse (Property → Business)*: same nodes, solved backward from a given Property Price
  to required Revenue/Enrollment/Occupancy via root-finding (bisection) over the enrollment
  input space, since staffing cliffs make the forward function non-linear/non-invertible in
  closed form (spec §36).

---

## 2. Data Model

All monetary fields stored as **integer cents**. All entities carry an implicit
`provenance: ProvenanceMeta` sub-record where the spec requires it (§43–45).

```
ProvenanceMeta {
  status: 'USER_PROVIDED' | 'VERIFIED' | 'RESEARCHED' | 'ESTIMATED' | 'UNKNOWN'
  systemEstimate?: Money          // preserved even after override
  userOverride?: Money
  source?: string; sourceUrl?: string; verifiedDate?: ISODate
  confidence?: 'LOW'|'MEDIUM'|'HIGH'
  notes?: string
}

Project {
  id, name, ownerEmail, createdAt, updatedAt
  scenarios: Scenario[]
  activeScenarioId
  properties: PropertyRecord[]      // saved properties for property-first mode
}

Scenario {
  id, projectId, name ('Base'|'Conservative'|'Optimistic'|'Custom'), basedOn?: ScenarioId
  licensedCapacity: int
  ageGroups: AgeGroup[]
  classrooms: Classroom[]
  staffPositions: StaffPosition[]
  staffAssignments: StaffAssignment[]   // classroom x position x count
  ratioRules: RatioRule[]
  payrollConfig: PayrollConfig
  expenseItems: ExpenseItem[]
  financing: FinancingScenario
  projectCost: ProjectCostLineItem[]
  workingCapital: WorkingCapitalConfig
  targets: { dscrTarget: number, profitMarginTarget: number, negotiationBufferPct: number }
  sourcesUses: SourcesUsesConfig
}

AgeGroup {
  id, name, minAgeMonths, maxAgeMonths, capacity: int, order: int
  enrolled: int, privatePay: int, subsidized: int, mixedFunding: int, otherFunding: int
  weeklyTuition: Money(provenance), dailyTuition?: Money(provenance)
  subsidyReimbursementWeekly?: Money(provenance)
  registrationFee?, supplyFee?, annualFee?: Money
  siblingDiscountPct?, employeeDiscountPct?, otherAdjustment?: Money
  // validation: privatePay + subsidized + mixedFunding + otherFunding <= enrolled <= capacity
}

Classroom { id, ageGroupId, name, capacity, plannedChildren }

RatioRule {
  id, jurisdiction, ageGroupId, maxChildrenPerStaff: int | 'UNKNOWN'
  source?: string, sourceUrl?: string, verifiedDate?: ISODate, version: int
  // never defaulted silently — UI must render UNKNOWN / NEEDS VERIFICATION when absent
}

StaffPosition { id, title, category, isRegulatory: boolean }

StaffAssignment {
  id, classroomId, positionId
  regulatoryMinCount: int            // derived from RatioRule, read-only
  operationalRecommendedCount: int   // regulatory + coverage/PTO/floater buffer
  plannedCount: int                  // what payroll actually uses
}

PayrollConfig {
  perPosition: {
    positionId, headcount, wageType: 'hourly'|'salary', hourlyWage?|annualSalary?,
    hoursPerWeek, overtimeHoursPerWeek?, weeksPerYear,
    payrollTaxPct, workersCompPct, benefitsMonthly?, healthInsuranceMonthly?,
    retirementPct?, ptoBurdenPct?, bonusAnnual?, otherBurdenPct?
  }[]
}

ExpenseItem {
  id, category, label, classification: 'FIXED'|'PER_CHILD'|'PCT_REVENUE'|'SEASONAL',
  frequency: 'MONTHLY'|'ANNUAL', amount: Money(provenance), perChildAmount?, pctOfRevenue?
}

FinancingScenario {
  type: 'SBA_504'|'SBA_7A'|'CONVENTIONAL'|'SELLER_FINANCING'|'OWNER_FINANCING'|'CUSTOM'
  tranches: FinancingTranche[]     // SBA 504 = 2-3 tranches; others = 1
  ownerEquity: { cashAvailable, requiredEquityPct, actualContribution }
}
FinancingTranche { id, label, amount, ratePct, termYears, amortYears, feesPct, balloonYears? }

PropertyRecord {
  id, projectId, address?, askingPrice, proposedOffer?, renovationEstimate(provenance),
  closingCosts(provenance), notes
}

ProjectCostLineItem { id, category, amount(provenance) }  // purchase, closing, renovation,
  // fire/life-safety, ADA, HVAC, electrical, plumbing, bathrooms, kitchen, playground,
  // FF&E, technology, professional fees, licensing, startup, working capital, contingency

WorkingCapitalConfig {
  method: 'QUICK'|'RAMP'
  quickMonthsOfExpenses?: int
  enrollmentRampMonthly?: { month: int, occupancyPct: number }[]   // up to 24 months
}

SourcesUsesConfig {
  sources: { ownerEquity, bankLoan, sbaCdc, sellerFinancing, grant, other }
  // uses derived from ProjectCostLineItem sum; sources vs uses gap computed, not stored
}

AuditLog { id, projectId, timestamp, userEmail, entityType, entityId, field, oldValue, newValue }
```

Architecture leaves room for **Individual Child Records** (spec §6) later: `AgeGroup`
aggregates (enrolled/privatePay/subsidized as counts) are designed so a future
`children: ChildRecord[]` array can roll up into the same aggregate fields without changing
any downstream engine node — the engine only ever consumes the aggregate shape.

---

## 3. Calculation Dependency Map

Nodes (each a pure function of the nodes below it); arrows = "feeds":

```
licensedCapacity, ageGroups[] (capacity/enrolled/privatePay/subsidized/tuition)
        │
        ▼
occupancy = enrolled / capacity            revenuePerAgeGroup (weekly→monthly→annual)
        │                                          │
        └──────────────────┬───────────────────────┘
                            ▼
                     TOTAL REVENUE (private tuition + subsidy + fees + other)
                            │
        ┌───────────────────┼─────────────────────────┐
        ▼                                              ▼
regulatoryMinStaff (enrolled × RatioRule per classroom)   revenue feeds break-even target
        │
        ▼
operationalRecommendedStaff (+ coverage/PTO/floater config)
        │
        ▼
plannedStaff  ──► STAFFING CLIFF DETECTION (Δstaff per +1 child, by classroom)
        │
        ▼
PAYROLL ENGINE (wages × hours × burden × headcount, per position) → Total Employment Cost
        │
        ▼
OPEX ENGINE (fixed + per-child×enrolled + %revenue×revenue, by category)
        │
        ▼
EBITDA = Total Revenue − Payroll − Payroll Burden − OPEX
        │
        ├─────────────► BREAK-EVEN ENGINE (incremental child-by-child simulation,
        │                 re-running Revenue→Staffing→Payroll→OPEX→EBITDA for
        │                 enrolled = 0..capacity to find crossing points, because
        │                 staffing cliffs make this non-linear)
        ▼
NOI (= EBITDA, pre-financing) ──► CASH FLOW AFTER DEBT/RENT = EBITDA − DebtService|Rent
        │
        ▼
DEBT CAPACITY:
  Method A (DSCR):    MaxAnnualDebtService = NOI / targetDSCR
  Method B (Margin):  MaxAnnualDebtService = Revenue − OPEX − Payroll − (Revenue × targetMargin)
        │
        ▼
BINDING CONSTRAINT = min(MethodA, MethodB)  → drives everything below
        │
        ▼
MAX SUSTAINABLE LOAN = amortize(MaxMonthlyDebtService, rate, term)  [per tranche, SBA 504 blended]
        │
        ▼
MAX TOTAL PROJECT COST = MaxLoan + OwnerEquityContribution
        │  (also gated by OWNER EQUITY constraint — may itself be binding, spec §29)
        ▼
MAX PROPERTY PRICE = MaxTotalProjectCost − Σ(non-property costs: renovation, FF&E,
                      startup, working capital, closing, contingency, professional fees)
        │
        ▼
RECOMMENDED SEARCH PRICE = MaxPropertyPrice × (1 − negotiationBufferPct)
```

**Reverse chain** (Property-First Mode, spec §35–36): given `askingPrice/offer +
renovation + closing + financing terms` → `RequiredMonthlyDebtService` (amortization,
forward math) → `RequiredNOI` (× targetDSCR, reverse of Method A) → `RequiredEBITDA` →
solve for `RequiredEnrollment/Occupancy` by bisecting the forward Enrollment→EBITDA
function (monotonic increasing in enrollment except at staffing-cliff steps, so bisection
with cliff-aware step correction converges reliably) → classify
AFFORDABLE / AFFORDABLE WITH CONDITIONS / RENEGOTIATE / HIGH RISK / NOT AFFORDABLE by
comparing required occupancy to capacity and required equity to available cash.

**Recalculation strategy:** on any input mutation, mark the node dirty and all transitive
dependents dirty; recompute only the dirty subgraph (memoized pure functions) — this keeps
the What-If Engine (spec §56) and Enrollment Simulator (spec §9) instant even as the graph
grows.

---

## 4. Financial Formula Dictionary (authoritative — engine implements exactly these)

| # | Metric | Formula |
|---|--------|---------|
| 1 | Monthly Equivalent Revenue | `weeklyTuition × 52 / 12` (never `× 4`) |
| 2 | Annual Revenue (per group) | `weeklyTuition × 52` |
| 3 | Revenue per Child | `groupRevenue / enrolled` |
| 4 | Occupancy | `enrolled / licensedCapacity` |
| 5 | Available Spaces | `capacity − enrolled` |
| 6 | Lost Revenue (empty seats) | `availableSpaces × weightedAvgMonthlyTuition` |
| 7 | Total Employment Cost | `Σ(basePay + payrollTax + workersComp + benefits + PTOburden + other)` per position |
| 8 | Payroll % of Revenue | `totalPayroll / totalRevenue` |
| 9 | EBITDA | `TotalRevenue − Payroll − PayrollBurden − OPEX` |
| 10 | EBITDA Margin | `EBITDA / TotalRevenue` |
| 11 | NOI | `EBITDA` (pre-financing, pre-owner-comp adjustments as configured) |
| 12 | DSCR | `NOI / AnnualDebtService` |
| 13 | Max Annual Debt Service (Method A) | `NOI / targetDSCR` |
| 14 | Required Profit | `Revenue × targetProfitMarginPct` |
| 15 | Max Annual Debt Service (Method B) | `Revenue − OPEX − Payroll − RequiredProfit` |
| 16 | Binding Constraint | `min(MethodA, MethodB)`, tag which one governs |
| 17 | Max Monthly Debt Service | `MaxAnnualDebtService / 12` |
| 18 | Loan Amortization (standard) | `PMT = P × [r(1+r)^n] / [(1+r)^n − 1]`, solved for `P` given `PMT` (monthly rate `r`, `n` months): `P = PMT × [(1+r)^n − 1] / [r(1+r)^n]` |
| 19 | SBA 504 Combined Payment | `Σ tranche PMT` (bank first lien + CDC/SBA second lien), each amortized independently at its own rate/term |
| 20 | Max Total Project Cost | `MaxLoan + OwnerEquityContribution` (or equity-constrained value if lower — see Owner Equity Gap) |
| 21 | Owner Equity Gap | `RequiredEquity(= ProjectCost × requiredEquityPct) − actualContribution`; if `>0`, equity is binding regardless of debt capacity |
| 22 | Max Property Price | `MaxTotalProjectCost − Σ NonPropertyProjectCosts` |
| 23 | Recommended Search Price | `MaxPropertyPrice × (1 − negotiationBufferPct)` |
| 24 | Break-Even Children | smallest `enrolled` (simulated incrementally per age-group mix) where `EBITDA ≥ 0` |
| 25 | Children for X% Margin | smallest `enrolled` where `EBITDA/Revenue ≥ X%` |
| 26 | Break-Even Occupancy | `BreakEvenChildren / licensedCapacity` |
| 27 | Staffing Cliff Detection | for `c = 1..capacity`, compute `requiredStaff(c)`; a cliff exists at `c` where `requiredStaff(c) > requiredStaff(c−1)`; report `Δpayroll` vs `Δrevenue` for that step |
| 28 | Classroom Contribution Margin | `classroomRevenue − classroomDirectPayroll − classroomDirectExpenses` |
| 29 | Sources vs Uses Gap | `Σ Sources − Σ Uses`; 0 = balanced, else `FUNDING GAP` |
| 30 | Working Capital (ramp method) | `PeakCashDeficit` across the monthly ramp cash-flow simulation |
| 31 | Sensitivity Delta | re-run full chain with one input shifted by the specified %, diff every downstream metric |
| 32 | Reverse: Required NOI | `AnnualDebtService(givenPropertyPrice terms) × targetDSCR` |
| 33 | Reverse: Required Enrollment | bisection on `enrolled ∈ [0, capacity]` such that `EBITDA(enrolled) = RequiredNOI` |

All money formulas operate on integer cents internally; formatting to `$1,250.00` is a
presentation-layer concern only (spec §59).

---

## 5. Screen Map

1. **Dashboard** — Executive summary (spec §40): capacity, enrollment, occupancy, revenue,
   payroll, OPEX, EBITDA, cash flow, break-even, DSCR, max loan, max property price, owner
   cash required, margin, overall status badge, Alert Engine feed.
2. **Enrollment** — Age group config (add/remove group), capacity/enrolled/private/
   subsidized table with validation, Enrollment Simulator (occupancy slider 50–100%).
3. **Tuition** — per-group weekly/daily tuition, subsidy rate, fees, discounts; weighted
   average tuition; revenue at current vs. full capacity.
4. **Staffing** — positions (add/remove), classroom × ratio × min/operational/planned staff
   table, Staffing Cliff report, ratio-rule source/jurisdiction/verification display
   (UNKNOWN badge when unverified).
5. **Payroll** — per-position wage/burden inputs, Total Employment Cost, payroll metrics
   (per child, per classroom, revenue per employee).
6. **Expenses** — category table with classification (fixed/per-child/%revenue/seasonal),
   monthly/annual toggle.
7. **Financial Model** — full Revenue→EBITDA→Cash Flow statement, monthly Year 1 + annual
   Years 1–5 projection.
8. **Break-Even** — headline break-even children/occupancy, margin-tier table (5/10/15/20%),
   simulation chart.
9. **Building Calculator** — the forward chain from Stabilized NOI down to Max Property
   Price, with Binding Constraint always shown (spec §34).
10. **Properties** — saved PropertyRecords; Property-First Mode input (asking price, offer,
    renovation, closing, financing) → affordability verdict (spec §35) + Reverse
    Calculation panel (required enrollment/occupancy/equity, spec §36).
11. **Financing** — financing type selector (SBA 504/7a/Conventional/Seller/Owner/Custom),
    tranche editor, Sources & Uses table with gap indicator, Purchase vs Lease comparison.
12. **Scenarios** — Conservative/Base/Optimistic/Custom manager, duplicate/rename/restore,
    Sensitivity Analysis grid, What-If controls.
13. **Reports** — Executive Summary, Feasibility, Lender/SBA Report, Sources & Uses,
    5-Year Projection, Break-Even, Staffing, Property Analysis, Purchase vs Lease
    (export scaffolding; PDF/print in a later phase).
14. **Lender View** — read-only filtered subset per spec §53.
15. **Settings** — target DSCR, target margin, negotiation buffer, ratio rules library,
    provenance defaults, currency/locale, project management (new/save/duplicate/rename/
    delete/restore version).

Every numeric result surface carries an **"Explain"** affordance (spec §42) rendering
formula id (from §4), inputs used, assumptions, provenance, confidence, last-updated.

---

## 6. MVP Scope (= Phase 1, spec §72)

In scope: licensed capacity (editable, not hardcoded to 60), add/remove age groups,
enrollment table with validation, tuition engine (correct monthly-equivalent formula),
private/subsidized revenue split, total revenue, a first-pass flat OPEX category list,
manually-entered payroll totals (full Staffing Engine deferred to Phase 2), EBITDA, monthly
cash flow, Dashboard showing all of the above. Explicitly deferred: staffing
cliffs/ratios, DSCR/debt capacity, building affordability, financing, scenarios/sensitivity,
reports, lender view — each arrives in its named phase per spec §72, on the same data model
and engine graph defined here so nothing gets rebuilt.

---

## 7. Technology Recommendation

- **Frontend:** React + TypeScript + Vite. TypeScript is not optional here — the formula
  dictionary and dependency graph are exactly the kind of surface where a typo (e.g. passing
  annual where monthly is expected) becomes a silent financial error; static types catch
  the class of bug the spec is most worried about (§57, §65).
- **State/engine:** Zustand for UI state (small, no boilerplate) wrapping a hand-rolled
  dependency-graph module (`/engine`) of pure functions — no heavy state-management
  framework needed since the graph itself *is* the derived-state mechanism.
  Money as integer cents via a small `Money` value type (avoid float error, spec §59);
  `decimal.js` only if a future need for fractional-cent precision (e.g. per-diem proration)
  arises.
- **Styling:** Tailwind CSS — fast to build a dense, data-focused financial UI, easy
  responsive utility classes for the mobile requirement (spec §50).
- **Charts:** a lightweight library (e.g. Recharts) for sensitivity/break-even/ramp charts.
- **Backend (Phase 6+):** Node/Express or FastAPI + PostgreSQL, REST API mirroring the data
  model in §2, JWT-based auth. Chosen for mainstream hosting cost/maintainability, not
  because the domain needs anything exotic — explicitly ruling out C++ (spec §62).
- **PWA:** Vite's PWA plugin once the shell stabilizes (installable, offline shell,
  spec §51) — architected for, not built, until Phase 6.

## 8. Persistence Strategy

- **Now (Phases 1–5):** Repository interface (`ProjectRepository`) with an IndexedDB
  (Dexie.js) implementation. Every mutation also appends an `AuditLog` entry. This satisfies
  §46 (save/duplicate/rename/delete/restore version) without a backend, while keeping the
  UI/engine layers backend-agnostic (they only ever call the repository interface).
- **Later (Phase 6):** a second `ProjectRepository` implementation backed by the
  Postgres/REST API, swapped in via config — no changes needed above the repository
  boundary. This directly satisfies §60's requirement that the architecture not assume data
  disappears on browser clear.
- Versioning: each save writes an immutable snapshot keyed by `(projectId, scenarioId,
  version)`; "Restore Previous Version" is a read, not a destructive rewrite.

## 9. Testing Strategy

Vitest for the engine (pure functions — ideal unit-test surface) covering every row of the
§4 formula dictionary plus the §64 list explicitly: monthly-equivalent conversion (assert
`≠ ×4`), subsidy split revenue, occupancy, staffing-cliff detection (assert a cliff fires at
the correct child count for a scripted ratio), OPEX classification math, EBITDA, DSCR,
amortization (assert against a known bank amortization table), max loan, max property price,
break-even (assert against brute-force simulation as an oracle), Sources & Uses balance,
sensitivity deltas. Edge cases: capacity 0, single age group, enrollment = capacity,
negative-margin scenario, 0-year amortization → validation error (not divide-by-zero),
UNKNOWN ratio rule → UI shows UNKNOWN not 0. React Testing Library for
input-validation/recalculation-propagation integration tests (change a field, assert every
downstream displayed number updates). No phase is marked done without this suite green,
per spec §73–74.

## 10. Risks / Missing Information

- **No verified child:staff ratios are supplied in the prompt.** The `RatioRule` entity is
  built to require jurisdiction + source + date; until real data is entered, Staffing will
  correctly render `UNKNOWN / NEEDS VERIFICATION` rather than a guessed ratio (spec §11).
  **Action needed from you:** which state/jurisdiction's ratios to seed as VERIFIED data.
- **No current SBA 504/7(a)/conventional rate, fee, or term data supplied.** All financing
  terms are user-editable inputs with no built-in defaults asserted as "current" (spec §27).
- **Break-even/staffing-cliff simulation cost:** for capacity 100+ with many age groups,
  simulating child-by-child is cheap (O(capacity) engine re-runs, each O(positions)) — no
  performance risk expected, but flagged for confirmation once Phase 2 is built.
- **Child-fill order for break-even/what-if simulation is undefined by the spec** (which age
  group absorbs the next enrolled child?). Default assumption: proportional to each group's
  configured capacity mix, overridable per scenario. Flagging for your confirmation rather
  than silently deciding.
- **Persistence is browser-local (IndexedDB) until Phase 6** — acceptable per spec's own
  phase plan (§46 "standalone" vs. §62 "web app"), but multi-device access won't exist until
  then; noting so it's not mistaken for an oversight.

---

## Recommended Build Order

Exactly the six phases as specified (spec §72), each phase fully tested (navigation,
calculations, editing, save/reload/reset, scenario switching, mobile layout — spec §73)
before moving to the next:

1. **Phase 1 — Financial Core**: capacity, age groups, enrollment, tuition, subsidy,
   revenue, payroll (flat entry), OPEX, EBITDA, cash flow, Dashboard v1.
2. **Phase 2 — Break-Even & Staffing**: staffing engine, ratio rules (with UNKNOWN
   handling), staffing cliffs, break-even engine, margin-tier targets, classroom economics.
3. **Phase 3 — Building Affordability**: DSCR, Method A/B debt capacity, binding
   constraint, amortization, project cost, max property price, Building Calculator screen.
4. **Phase 4 — Financing**: SBA 504/7(a)/conventional/seller/owner financing types, owner
   equity gap, Sources & Uses, Property-First mode + reverse calculation, Purchase vs Lease.
5. **Phase 5 — Scenario Engine**: Conservative/Base/Optimistic/Custom, sensitivity
   analysis, What-If controls, enrollment simulator wired to full chain.
6. **Phase 6 — Reports & Persistence**: multi-project management, database-ready
   persistence swap, report templates, Lender View, PWA packaging.

Not starting implementation. Waiting for the exact instruction **BEGIN BUILD** to start
Phase 1, per your process requirement.
