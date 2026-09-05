# ADR 0018: Design System Premium Polish — adopt principles, not the source spec

**Status**: Accepted
**Date**: 2026-09-05

## Context

The project owner supplied an external design-system document ("Warehouse App — Design System & Premium Experience") as an aesthetic reference. That document specifies a Flutter warehouse/inventory application with barcode scanning, camera-based package measurement, 3D geometry overlays, marker detection, point editing, and haptics for gloved warehouse workers — none of which exist in, or apply to, Atlas OS (a Next.js/React personal productivity web app with no camera, no hardware sensors, and no physical-object domain).

Applying that document literally would mean importing an entire vocabulary (`WarehouseButton`, `WarehouseScannerOverlay`, `measurementValue`/`measurementUnit` type roles, camera-first navigation rules) that has no referent in this codebase.

However, a large fraction of the document is domain-agnostic UI craft: design tokens over magic values, semantic typography roles, a bounded motion system with three intentional durations, complete component states (not just the happy path), empty/error states with a recovery action, restraint ("premium ≠ more gradients/shadows/animation"), and respecting `prefers-reduced-motion`. Several of its own primary references (Linear, Notion, Apple Wallet) are a better fit for a personal life-management dashboard than for a warehouse scanner anyway.

## Decision

- **Adopt the domain-agnostic principles; discard everything warehouse/camera/Flutter-specific.** No `Warehouse*`-prefixed components, no measurement/scanner/marker concepts, no camera-first navigation rules were introduced.
- **Extend the existing token system rather than replace it.** `app/globals.css` already had color, radius, and (implicitly) spacing tokens from Phase 1 (see `docs/DESIGN_SYSTEM.md`). This pass adds two new token families on top: a 4-role motion system (`--duration-fast/standard/emphasized`, one `--ease-standard` curve) and a 7-role typography scale (`display/headline/title/body/label/caption/metric`), registered as ordinary Tailwind v4 `@theme` entries — not a parallel styling system.
- **No new dependency for motion.** Modal enter/exit and Tooltip fade use hand-written `@keyframes` + `--animate-*` theme entries rather than adding `tailwindcss-animate` (or similar) for what amounts to two small transitions — consistent with this project's existing minimal-dependency discipline.
- **Global, not per-component, `prefers-reduced-motion` handling.** One media query in `globals.css` collapses all animation/transition durations near-zero, rather than gating every new motion utility individually.
- **Scope this pass to tokens + `components/ui/*` primitives, not a screen-by-screen redesign.** The source document's own §61 and §59 explicitly warn against redesigning every screen simultaneously and against restarting a project mid-flight to adopt a design system; this pass follows that: `Button`, `Card`, `Modal`, `Skeleton`, `Tooltip`, `ProgressBar`, `ProgressRing`, and `EmptyState` were touched (added motion, adopted the new typography roles where already centralizing text styling). No `features/*` screen was redesigned. `text-metric` is defined and documented but not yet applied anywhere outside `/dev/components`'s showcase — the natural next candidate (Analytics stat tiles, `features/analytics/`) is deferred to a possible future iteration rather than bundled into this one.
- **No business logic, data layer, navigation, or Server Action was touched.** Every change in this pass is `className`/CSS only.

## Consequences

- `text-sm font-semibold` and similar ad hoc combinations remain scattered across `features/*` call sites that predate this pass — they were not force-migrated to the new type roles. A future iteration could do so incrementally, screen by screen, per the source document's own recommended order (tokens → typography → colors → spacing → shape → core components → navigation → screens, one at a time).
- The new typography scale is additive: Tailwind's default `text-sm`/`text-xs`/etc. utilities still work unchanged, so this is a zero-risk extension, not a breaking change.
- Verified via `npm run typecheck`, `npm run lint`, `npm run build`, the full `tests/dashboard-smoke.mjs` suite (including its axe-core accessibility scan, which still passes with the new typography/motion), and all six pure-logic test suites — no regressions.
