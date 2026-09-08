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
| Angle | `VALIDATING` (iOS only) | Two paths: (1) interior angle at every vertex of the current polyline/polygon (`PolygonGeometry.angleDegrees`/`interiorAngles`), plus a live preview while still placing points; (2) a dedicated 3-tap Angle tool mode (`MeasureToolMode.angle` in `ARMeasureScreen.swift`), matching the catalog's A-B-C tool: tap a ray endpoint, the vertex, then the second ray endpoint, and it auto-finishes showing the angle plus both ray lengths. No new geometry — reuses the same `interiorAngles` call on an open 3-point line. **First real-hardware run (2026-09-08, `iPhone18,2`)**: measured a laptop's corner (geometrically 90°) as 88.8°, rays 1'0" and 8½" — a 1.2° deviation, consistent with the same order of tap-placement imprecision already documented for distance (`evidence/ios/POINT_TO_POINT_BENCHMARK.md`, +5 to +7mm). Per the same no-calibration rule as distance (`shared/BENCHMARK_PROTOCOL.md` section 8), this is **not** rounded/snapped toward 90° — the raw computed angle is shown as-is. Held at `VALIDATING`, not `PRODUCTION_READY`, pending more repeat measurements against more known angles. |
| Polygon/Poly | `PROTOTYPE` (iOS only) | "Close Shape" turns the open polyline into a closed polygon: perimeter, planar area via Newell's method (`PolygonGeometry.area`), and a planarity-deviation warning when points aren't well-fit by a single plane. Not run on real hardware. |
| Rectangle | `PROTOTYPE` (iOS only) | Automatic detection layered on the closed-polygon path when exactly 4 points are closed and pass a side/angle tolerance check (`PolygonGeometry.rectangleCheck`, defaults: 8% side tolerance, 6° angle tolerance) — not a separate dedicated 4-point tool/interaction. Reports length × width when detected, plus an `isSquare` flag (same tolerance) that relabels the shape "Square" instead of "Rectangle" when length ≈ width. **New**: before any point is placed (Length mode only), `Vision`'s `VNDetectRectanglesRequest` watches the camera feed for a real rectangular object; if found and all 4 corners raycast onto real geometry, it's shown as a yellow suggested outline, and a double-tap accepts it (adds all 4 points + closes the shape in one step) — per explicit user request. This is a separate 2D-image detector from the 3D tolerance check above and can disagree with it. **First real-hardware run (2026-09-08) found the outline landing in the wrong place** — root-caused (by downloading and reading Apple's own "Tracking and Altering Images" sample, `RectangleDetector.swift`) to a coordinate-space mismatch: `VNImageRequestHandler` was given `orientation: .right`, but ARKit's `capturedImage` orientation never changes with device rotation, and `ARFrame.displayTransform` (used to place the corners) expects points in that same uncorrected space; `.right` made Vision report corners in a different, rotated coordinate space. Fixed to `orientation: .up`, matching the verified-correct value from Apple's own sample; also adopted that sample's tuned detection parameters (`minimumSize` 0.25, `minimumConfidence` 0.9, `minimumAspectRatio` 0.3, `quadratureTolerance` 20) in place of the original guessed values. Not yet re-confirmed on real hardware after the fix. **Tolerance flagged, not yet validated**: the 8%/6° numbers were chosen without external reference; a Firecrawl check found Apple's own `Vision` framework (`DetectRectanglesRequest.quadratureToleranceDegrees`, a related but different 2D image-rectangle heuristic) defaults to 30° (range 0-45), far looser than our 6°. Not a direct substitute (image perspective vs. hand-tapped 3D AR points), but a real signal that 6° may be too strict for the tap imprecision already measured in `evidence/ios/POINT_TO_POINT_BENCHMARK.md` — a genuinely rectangular real-world object could get mislabeled "Polygon". Left unchanged pending a real-device test (tap a known-rectangular object several times, see how often it's correctly detected) rather than guessing a new constant. |
| Triangle (new, not in catalog) | `PROTOTYPE` (iOS only) | Not a catalog-named tool — a new classification layered on the closed-3-point path (`PolygonGeometry.triangleClassification`): labels the shape "Equilateral Triangle", "Right Triangle", "Isosceles Triangle", or generic "Triangle", using the same side/angle tolerances as Rectangle (8%/6°). Per user request to have the app "reconozca geometrías o formas" on Close Shape — still manual (user places the 3 points; no camera-based suggestion for triangles, only for rectangles so far). Not run on real hardware. |
| Circle | `PROTOTYPE` (iOS only) — different capture strategy than specified | Catalog section 11 specifies "center + edge" or "3+ points on circumference" capture; this build instead detects a circle as a byproduct of the general closed-polyline path (`PolygonGeometry.circleCheck`): if 5+ closed points all sit within 8% of a common radius from their centroid, the shape is labeled "Circle" and its radius shown. Not the dedicated capture flow the catalog describes, and not run on real hardware. |
| Cube/Cuboid/Box | `PROTOTYPE` (iOS only) — different capture strategy than specified (see Standard Geometric Volume below) | Primary logistics tool. Per user request (reference screenshot of a third-party app's dedicated Cube tool), the existing closed-base + height-point path now draws the **full wireframe box** — every top-face and vertical edge individually labeled (`PolygonGeometry.extrudedCorners`, `MultiPointMeasurement.extrudedTopCorners`) — instead of one height line, visually matching a dedicated Cube tool. Still not the catalog's dedicated 3-axis tap-and-drag box interaction (this is base-polygon + 1 height point, 5 taps for a rectangular box vs. 8 corner taps or a drag-based flow); works for any closed base shape, not only 4-point rectangles. Not run on real hardware. |
| Cylinder | `SPECIFIED` | Detailed in `docs/24_AR_CAPABILITIES_ADDENDUM.md` section 1. |
| Area (derived) | `PROTOTYPE` (iOS only) | Via the Polygon/Rectangle path above. |
| Perimeter (derived) | `PROTOTYPE` (iOS only) | Via the Polygon/Rectangle path above. |
| Surface Area (derived) | `SPECIFIED` | Depends on Cuboid/Cylinder, neither implemented. |
| Standard Geometric Volume (derived) | `PROTOTYPE` (iOS only) — partial | Implemented as **closed-polygon-base × one height point**, not the catalog's dedicated Cuboid (L×W×H) or Cylinder (πr²h) tools. When the base is detected as a Rectangle this is numerically equivalent to cuboid volume; for any other closed base it's a more general prism volume the catalog doesn't name yet. Now visualized as a full wireframe box/prism (see Cube/Cuboid/Box above), not just a height line. Not run on real hardware; not validated against a known volume. |

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
