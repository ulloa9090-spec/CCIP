# BoxOp Smart Measure — Tool Registry Status

Live implementation/validation status for every tool defined in
`docs/25_MEASUREMENT_TOOLS_CATALOG.md`. That document defines what each
tool is; this document tracks what actually exists. Update this table,
not the catalog, whenever a tool's status changes
(`docs/25_MEASUREMENT_TOOLS_CATALOG.md` section 41, step 13).

Status values (`docs/25_MEASUREMENT_TOOLS_CATALOG.md` section 30):
`SPECIFIED` → `PROTOTYPE` → `IMPLEMENTED` → `VALIDATING` →
`PRODUCTION_READY`, or `DISABLED` at any point.

**Unit test coverage (distinct from device validation)**: the pure math
behind Line/Polyline, Angle, Polygon, Rectangle, Area, Perimeter, and
Standard Geometric Volume (all iOS) now has deterministic XCTest coverage —
`phase0/ios/BoxOpPhase0Tests/{PolygonGeometryTests,MultiPointMeasurementTests,UnitFormattingTests}.swift`.
**Confirmed passing via `Cmd+U` in Xcode on the user's Mac (2026-09-08)** —
all three suites green, after fixing two Swift compiler
type-inference bugs found only by actually running them (`Float?`
values passed unwrapped into `XCTAssertEqual(_:_:accuracy:)`, in
`testRectangleCheckAcceptsTrueRectangle`, `testAreaOfClosedRectangle`,
`testHeightAndVolumeOfClosedRectangleWithHeightPoint`, and
`testPerimeterOfClosedRectangle`; fixed with `XCTUnwrap`, no production
code touched). This confirms the geometry/unit-conversion code is
internally correct against hand-verified values; it does **not**
substitute for real-hardware validation (AR tracking noise, raycast
source, device drift) — a tool's `VALIDATING`/`PRODUCTION_READY` status
below still depends only on real-device evidence, per the gate in
section 39 of the catalog.

## Prerequisite (not a tool, but gates everything below)

| Item | Status | Notes |
|---|---|---|
| Capability detection — iOS | `VALIDATING` | **PASS on real hardware**: `iPhone18,2`, iOS 26.6.1, Tier C/LiDAR. Evidence: `phase0/evidence/ios/RESULT.md`. Held at `VALIDATING` rather than `PRODUCTION_READY` until it's also been run on a non-LiDAR ("unsupported/lesser device") iPhone to confirm the fallback path actually works, not just the best case. |
| Capability detection — Android | `IMPLEMENTED`, not yet `VALIDATING` | Built in `phase0/android`; not yet run on real hardware. See `phase0/README.md`. |

## Level A — Core AR geometry

| Tool | Status | Notes |
|---|---|---|
| Line / Polyline | `VALIDATING` (iOS only) | Point-to-point ran on real hardware with a tape-measure baseline: `phase0/evidence/ios/POINT_TO_POINT_BENCHMARK.md` (+5 to +7mm bias, 3mm repeatability at 20in, preliminary). Generalized to an unlimited-point polyline (`MultiPointMeasurement.swift`), **confirmed on real hardware 2026-09-08**: multi-segment polylines with live per-segment in-scene labels and feet/inches display all worked correctly on `iPhone18,2`. Held at `VALIDATING`, not `PRODUCTION_READY`, until calibration/error-source work in `phase0/shared/BENCHMARK_PROTOCOL.md` section 8 is done and it's run on more than one device. Android not started. |
| Height | `SPECIFIED` | Distinct catalog tool (base + top point with gravity/world-up constraint); not implemented — the "height" in this build is the polygon-to-height-point perpendicular below, a different measurement. |
| Distance Meter | `SPECIFIED` | Camera-to-target distance, distinct from Line — not implemented. |
| Angle | `PROTOTYPE` (iOS only) | Interior angle at every vertex of the current polyline/polygon (`PolygonGeometry.angleDegrees`/`interiorAngles`), plus a live preview at the last confirmed point while still placing points. Not run on real hardware; not yet the dedicated 3-point A-B-C tool from the catalog (this is angle-as-a-property-of-the-polyline, which subsumes it for a closed shape but not for two arbitrary rays). |
| Polygon/Poly | `PROTOTYPE` (iOS only) | "Close Shape" turns the open polyline into a closed polygon: perimeter, planar area via Newell's method (`PolygonGeometry.area`), and a planarity-deviation warning when points aren't well-fit by a single plane. Not run on real hardware. |
| Rectangle | `PROTOTYPE` (iOS only) | Automatic detection layered on the closed-polygon path when exactly 4 points are closed and pass a side/angle tolerance check (`PolygonGeometry.rectangleCheck`, defaults: 8% side tolerance, 6° angle tolerance) — not a separate dedicated 4-point tool/interaction. Reports length × width when detected. Not run on real hardware. **Tolerance flagged, not yet validated**: these two numbers were chosen without external reference; a Firecrawl check found Apple's own `Vision` framework (`DetectRectanglesRequest.quadratureToleranceDegrees`, a 2D image-rectangle heuristic, different domain) defaults to 30° (range 0-45), far looser than our 6°. Not a direct substitute (image perspective vs. hand-tapped 3D AR points), but a real signal that 6° may be too strict for the tap imprecision already measured in `evidence/ios/POINT_TO_POINT_BENCHMARK.md` — a genuinely rectangular real-world object could get mislabeled "Polygon". Left unchanged pending a real-device test (tap a known-rectangular object several times, see how often it's correctly detected) rather than guessing a new constant. |
| Circle | `SPECIFIED` | |
| Cube/Cuboid/Box | `SPECIFIED` (see Standard Geometric Volume below for the related but different path that does exist) | Primary logistics tool — a dedicated 3-axis box interaction is still not implemented. |
| Cylinder | `SPECIFIED` | Detailed in `docs/24_AR_CAPABILITIES_ADDENDUM.md` section 1. |
| Area (derived) | `PROTOTYPE` (iOS only) | Via the Polygon/Rectangle path above. |
| Perimeter (derived) | `PROTOTYPE` (iOS only) | Via the Polygon/Rectangle path above. |
| Surface Area (derived) | `SPECIFIED` | Depends on Cuboid/Cylinder, neither implemented. |
| Standard Geometric Volume (derived) | `PROTOTYPE` (iOS only) — partial | Implemented as **closed-polygon-base × one height point**, not the catalog's dedicated Cuboid (L×W×H) or Cylinder (πr²h) tools. When the base is detected as a Rectangle this is numerically equivalent to cuboid volume; for any other closed base it's a more general prism volume the catalog doesn't name yet. Not run on real hardware; not validated against a known volume. |

## Level B — Advanced geometry

| Tool | Status | Notes |
|---|---|---|
| Polyline Smooth | `SPECIFIED` | |
| Poly/Polygon Smooth | `SPECIFIED` | |
| Wall | `SPECIFIED` | |
| Curved Wall | `SPECIFIED` | |
| Multi-Measurement Session | `SPECIFIED` | Detailed in `docs/24_AR_CAPABILITIES_ADDENDUM.md` sections 2–13. |
| Measurement Calculator | `SPECIFIED` | Detailed in `docs/24_AR_CAPABILITIES_ADDENDUM.md` section 3. |
| Geometry editing/recalculation | `SPECIFIED` | |

## Level C — 3D/Depth professional

| Tool | Status | Notes |
|---|---|---|
| 3D Surface Scanner | `SPECIFIED` | Requires Tier B/C device; no device evidence yet. |
| Irregular Volume | `SPECIFIED` | |
| Volume Smooth | `SPECIFIED` | |
| Heap | `SPECIFIED` | |
| Pit | `SPECIFIED` | Safety constraint noted in catalog section 27. |

## How to update this file

When a tool's status changes, edit its row and add a one-line reason
(commit, PR, or benchmark result it changed on). Do not mark anything
`PRODUCTION_READY` without satisfying every item in
`docs/25_MEASUREMENT_TOOLS_CATALOG.md` section 39 ("Production
activation gate").
