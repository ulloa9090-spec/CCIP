# 25 — Measurement Tools Catalog
Version: 1.0
Status: Canonical product capability specification (target, not implementation status)
Platforms: iOS + Android
Applies to: `04_SMART_MEASURE.md` / `21_AR_MEASUREMENT_SYSTEM.md`

## 1. Purpose

This document defines the official measurement-tool catalog for BoxOp.

These are intended product capabilities, not merely visual references to
another application.

**IMPORTANT**:
- A capability being listed here means it belongs to the product
  roadmap. It does **not** mean the capability is already implemented.
  It does **not** mean its accuracy has already been validated.
- A tool becomes production-ready only after implementation, testing,
  real-device validation, and physical ground-truth validation where
  applicable.
- **Live implementation status for every tool below lives in
  `phase0/TOOL_REGISTRY_STATUS.md`, not in this document.** As of this
  writing every tool here is `SPECIFIED` — none are `PROTOTYPE` or
  further, since even the Phase 0 point-to-point AR screen (the closest
  thing to "Line" below) has not been built yet
  (`phase0/README.md` "Next task").

Preserve existing BoxOp terminology and the Spot/Bin/Object model
(`06_SPOT_BIN_MODEL.md`).

---

## 2. Product principle

BoxOp Smart Measure should evolve into a professional spatial
measurement toolbox for iOS and Android.

Measurement tools must integrate with the existing operational workflow
(`01_PRODUCT_VISION.md`):

```
MEASURE
→ REVIEW
→ CONFIRM
→ SAVE
→ ASSOCIATE WITH OBJECT / SPOT / BIN / LOCATION / BARCODE
→ HISTORY
→ REPORT
```

The camera/AR experience should remain original and follow the BoxOp
Design System (`12_UI_UX_DESIGN_SYSTEM.md`). Do not copy another
application's proprietary interface, branding, assets, or visual
identity.

---

## 3. Capability levels

### Level A — Core AR geometry
Designed to work on the broadest supported AR-capable devices (Device
Tier A, see `21_AR_MEASUREMENT_SYSTEM.md` "Device tiers"):

Line, Height, Distance Meter, Angle, Polyline, Rectangle, Circle,
Polygon/Poly, Cube/Cuboid/Box, Cylinder, Area, Perimeter, Surface Area,
Standard Geometric Volume.

### Level B — Advanced geometry
Requires more advanced geometry processing and/or smoothing (Device
Tier A/B):

Polyline Smooth, Poly/Polygon Smooth, Walls, Curved Wall,
Multi-Measurement Session, Measurement Calculator, geometry editing and
recalculation.

### Level C — 3D/Depth professional
Requires validated 3D reconstruction, depth, mesh, point-cloud,
multi-view, or equivalent spatial evidence (Device Tier B/C):

3D Surface Scanner, Irregular Volume, Volume Smooth, Heap, Pit, 3D
structure/pile measurement, mesh-based surface measurement,
depth/LiDAR-assisted object reconstruction.

These levels describe technical complexity and dependency, not
marketing tiers.

---

## 4. Line

**Goal**: measure the physical distance between two world-space points.

**Input**: Point A, Point B. **Output**: Length.

**Requirements**: valid AR/world points, editable endpoints, live
provisional preview, confirmed result, unit conversion,
confidence/tracking quality.

This is the geometry behind Phase 0's queued point-to-point task
(`phase0/README.md`).

---

## 5. Height

**Goal**: measure vertical height. **Input**: base point, top point.
**Output**: Height.

Use gravity/world-up constraints when valid. Allow manual correction
when automatic vertical alignment is uncertain.

---

## 6. Distance meter

**Goal**: measure distance from the device/camera position to a
selected point on a real 3D surface. This is distinct from Line.

**Input**: current camera/world pose, target world point. **Output**:
camera-to-target distance.

Prefer reliable raycast/depth/surface geometry. Show tracking/depth
quality. Never treat an image pixel as a physical target without valid
spatial reconstruction.

---

## 7. Angle

**Goal**: measure an angle on a physical surface or in 3D space.
**Input**: A, vertex B, C. **Output**: angle ABC in degrees/radians per
display settings.

Preserve the 3D points used.

---

## 8. Polyline

**Goal**: measure a connected path. **Input**: P1 → P2 → P3 → ... → Pn.
**Output**: individual segment lengths, total path length.

Useful for irregular routes, edges, rack spans, perimeters, and spatial
paths.

---

## 9. Polyline Smooth

**Goal**: estimate the length of a curved or freeform path rather than
only straight connected segments.

**Approach**: capture a sufficiently dense sequence of spatial points.
Potential processing: point filtering, outlier rejection, resampling,
spline/curve fitting, arc-length estimation.

**Output**: smoothed path length.

**Validation**: the smoothing algorithm must not silently shorten or
exaggerate the physical path. Preserve raw points and processed curve.

---

## 10. Rectangle

**Goal**: measure a rectangular planar surface. **Output**: length,
width, perimeter, area, optional diagonal.

Validate coplanarity and rectangular consistency. Allow user correction.

---

## 11. Circle

**Goal**: measure a circular planar object/surface. **Output**: radius,
diameter, circumference/perimeter, area.

**Capture strategies**: center + edge, 3+ points on circumference,
CV-assisted circle/ellipse proposal, depth-assisted fitting.

Perspective projection may appear elliptical in image space; fitting
must occur using valid spatial geometry.

---

## 12. Polygon/Poly

**Goal**: measure an irregular planar polygon. **Input**: ordered
coplanar vertices. **Output**: perimeter, area, edge lengths.

Validate planarity and polygon consistency.

---

## 13. Poly/Polygon Smooth

**Goal**: measure a planar shape with curved/freeform boundaries.

**Approach**: capture boundary samples, transform into the relevant
plane, reject outliers, fit/smooth boundary, then calculate perimeter
and area. Preserve raw and processed geometry.

---

## 14. Cube/Cuboid/Box

**Goal**: primary logistics measurement tool — populates the
Object/Bin/Spot `length, width, height, volume` fields in
`10_DATA_MODEL.md`. **Output**: D1, D2, D3, semantic Length/Width/Height,
surface area, volume, optional edge/diagonal data.

**Modes**: manual AR points, plane-assisted, CV-assisted corner/edge
proposal, marker-assisted, depth/LiDAR-assisted, future
fixed-station measurement.

User must be able to correct axis assignment and geometry.

---

## 15. Cylinder

**Goal**: measure cylindrical objects. **Output**: radius, diameter,
height, circumference, base area, lateral surface area, total surface
area, volume.

Formulas: `C = 2πr`, `A_base = πr²`, `A_lateral = 2πrh`,
`A_total = 2πr(r+h)`, `V = πr²h`.

Allow cylinder-axis correction. **See `24_AR_CAPABILITIES_ADDENDUM.md`
section 1 for the fuller interaction workflow and future-assistance
notes on this tool.**

---

## 16. Area

Area is a derived quantity supported by appropriate geometry: rectangle,
circle, polygon, smooth polygon, wall, curved wall where a valid surface
model exists.

Never calculate area from unsupported/incomplete geometry.

---

## 17. Perimeter

Derived from: rectangle, circle, polygon, smooth polygon, other
validated closed planar boundaries.

---

## 18. Standard volume

Supported exact/standard geometric volume:

- Cuboid: `V = L × W × H`
- Cylinder: `V = πr²h`

Additional primitive shapes may be introduced later through the geometry
abstraction (section 31).

---

## 19. Wall

**Goal**: measure planar wall geometry. **Output may include**: width,
height, area, perimeter, optional openings later.

**Approach**: use detected vertical plane or user-defined planar points.
Do not subtract doors/windows unless explicitly captured and validated.

---

## 20. Curved wall

**Goal**: measure a non-planar wall or curved vertical surface.
**Potential output**: path length, height, surface area.

Not equivalent to a rectangle. Requires a sampled curve/surface, multiple
spatial points, depth/mesh, or another validated representation.
Preserve raw samples and fitted geometry.

---

## 21. Multi-Measurement Session

One `MeasurementSession` may contain multiple geometries simultaneously
(Box, Line, Height, Angle, Circle, Cylinder, Wall, ...). The user can
add, select, edit, hide/show, delete, undo, recalculate, and save the
whole spatial workspace. Each geometry preserves its own confidence and
verification.

**See `24_AR_CAPABILITIES_ADDENDUM.md` sections 2–13 for the fuller data
model, UI, overlay, summary, persistence, reporting and editing/history
rules for this tool — this catalog entry is the summary; that document
is the mechanics.**

---

## 22. Measurement Calculator

Derived quantities update automatically when source geometry changes:
Line → length; Rectangle → L/W/perimeter/area; Circle →
radius/diameter/circumference/area; Cuboid → L/W/H/surface area/volume;
Cylinder → radius/diameter/height/circumference/areas/volume; Polygon →
edge lengths/perimeter/area.

If required dimensions are unknown, the dependent result remains
unavailable rather than guessed. **See `24_AR_CAPABILITIES_ADDENDUM.md`
section 3 for the fuller per-geometry derivation table.**

---

## 23. 3D Surface Scanner

**Goal**: create a spatial representation of a physical
surface/object/scene.

**Potential inputs**: ARKit scene/depth capabilities, ARCore Depth,
LiDAR, depth map, mesh, point cloud, calibrated multi-view
reconstruction.

**Potential outputs**: mesh, point cloud, surface samples, bounding
geometry, measurements.

A 3D scanner is not merely a camera overlay — it requires actual
spatial evidence and reconstruction.

---

## 24. Irregular Volume

**Goal**: estimate volume of non-primitive 3D objects/structures.

```
Spatial Capture
→ Point Cloud / Mesh
→ Segmentation
→ Surface Cleanup
→ Hole Handling / Closure
→ Reference Plane
→ Volume Integration
→ Confidence
```

Do not use cuboid volume and label it "true irregular volume." Clearly
distinguish: bounding-box volume, geometric primitive volume,
reconstructed object volume.

---

## 25. Volume Smooth

**Goal**: calculate volume after applying a controlled
surface-smoothing/reconstruction process to noisy spatial data.

Preserve: raw geometry, processed geometry, smoothing
parameters/version, resulting volume, quality/confidence. Smoothing must
be validated against physical reference objects.

---

## 26. Heap

**Goal**: measure the volume of a pile/material heap above a
reference/support surface (aggregate, soil, mulch, loose material,
warehouse material pile).

```
Capture support/reference surface
→ capture heap surface
→ spatial reconstruction
→ isolate heap
→ integrate height above reference plane/surface
→ calculate volume
```

Depth/LiDAR/mesh or equivalent validated 3D evidence is normally
required.

---

## 27. Pit

**Goal**: measure the volume of a depression/excavation below a
reference surface.

```
Establish reference plane/surface
→ reconstruct pit
→ isolate boundary
→ integrate depth below reference
→ calculate volume
```

The UI must clearly distinguish HEAP (above reference) from PIT (below
reference).

**Safety**: the application must never encourage a user to enter an
unsafe excavation or hazardous area to obtain measurements.

---

## 28. Device capability matrix

At runtime, classify device capabilities into tiers (same tiers as
`21_AR_MEASUREMENT_SYSTEM.md` "Device tiers" and
`09_CAMERA_SENSOR_HARDWARE.md`):

- **Tier A — Standard AR** (tracking, planes, raycast, anchors): Line,
  Height, Distance, Angle, Polyline, Rectangle, Circle, Polygon, Box
  with supported workflow, standard calculator.
- **Tier B — AR + Depth**: may improve surface point placement, box
  fitting, curved geometry, wall geometry, confidence.
- **Tier C — Advanced Spatial / LiDAR / Dense Depth**: may enable 3D
  scanning, mesh-based measurement, irregular volume, Volume Smooth,
  Heap, Pit, advanced curved surfaces.

Actual availability must be determined by runtime capability detection
(`phase0/shared/CAPABILITY_MATRIX.md`) and validated implementation, not
platform name alone.

---

## 29. Fallback strategy

If a requested tool lacks required spatial capability: explain what is
unavailable, then offer a compatible alternative — manual measurement,
marker-assisted, known dimension, additional views, standard primitive
geometry, a supported device with depth/LiDAR, or an external station
later (`04_SMART_MEASURE.md` modes; `21_AR_MEASUREMENT_SYSTEM.md`
"Fallbacks"). Never fabricate advanced results.

---

## 30. Tool registry

Implement measurement modes through a registry/configuration rather than
hard-coded UI branches.

Conceptual `MeasurementToolDefinition`: `id`, `name`, `geometryType`,
`iconKey`, `requiredCapabilities`, `optionalCapabilities`, `calculator`,
`editor`, `validationRules`, `availability`, `implementationStatus`.

Possible status: `SPECIFIED`, `PROTOTYPE`, `IMPLEMENTED`, `VALIDATING`,
`PRODUCTION_READY`, `DISABLED`. This distinction is critical —
documentation must never imply `SPECIFIED` means `IMPLEMENTED`.

**The actual per-tool status table (not just the concept) is tracked in
`phase0/TOOL_REGISTRY_STATUS.md`.** A runtime `MeasurementToolDefinition`
registry is future code, not yet built — there is no measurement engine
implementation at all as of this writing, only the Phase 0
capability-detection harness.

---

## 31. Geometry abstraction

Conceptual geometry types: `LINE`, `HEIGHT`, `CAMERA_DISTANCE`, `ANGLE`,
`POLYLINE`, `SMOOTH_POLYLINE`, `RECTANGLE`, `CIRCLE`, `POLYGON`,
`SMOOTH_POLYGON`, `CUBOID`, `CYLINDER`, `WALL`, `CURVED_WALL`,
`IRREGULAR_SURFACE`, `HEAP`, `PIT`.

This supersedes the shorter geometry-type list in
`24_AR_CAPABILITIES_ADDENDUM.md` section 4 — treat this list as
authoritative; that document's list was a subset written before this
catalog existed. Future types should be addable without redesigning
`MeasurementSession`.

---

## 32. Storage

Each saved geometry should preserve: `geometryId`, type, `sessionId`,
raw spatial points, processed points/curve/mesh references where
applicable, calculated properties, canonical units, display units,
measurement method, confidence, verification, platform/device
capability, source images, calibration/reference data, algorithm
version, timestamps.

Heavy mesh/point-cloud assets should use controlled external file
storage rather than large relational DB blobs.

---

## 33. BoxOp integration

Every supported measurement may be associated with existing BoxOp domain
concepts where appropriate: Object, Spot, Bin, Location, Barcode/SKU,
Pallet, Report. Do not replace the BoxOp model with generic AR-ruler
terminology.

---

## 34. Reporting

Reports may contain multiple measurement types from one session:
annotated image, tool/geometry type, dimensions, distance, angle,
perimeter, area, surface area, volume, confidence, verification, method,
associated Object/Spot/Bin, timestamp.

For advanced 3D tools, state whether volume is `BOUNDING`, `PRIMITIVE`,
`RECONSTRUCTED`, `HEAP`, or `PIT`.

---

## 35. Offline

Core AR geometry/calculator functions must operate offline
(`11_OFFLINE_SYNC_DESKTOP.md`). Advanced depth/mesh tools should also
prefer on-device processing where practical. Cloud processing may be
optional but must not silently become a requirement for basic
measurement.

---

## 36. Privacy

Spatial scans, room geometry, warehouse surfaces, meshes and point
clouds may reveal sensitive operational information. Prefer local
processing. Do not upload spatial assets without an explicit product
requirement and clear data policy (`02_MASTER_ARCHITECTURE.md`
"Privacy").

---

## 37. Testing

**Deterministic geometry tests**: line, angle, rectangle, circle,
polygon, cuboid, cylinder, surface/volume calculations.

**Real-device tests**: AR tracking, point placement, depth, mesh,
overlays, editing, multiple geometries, performance.

**Physical ground truth**: use trusted physical references
(`phase0/shared/BENCHMARK_PROTOCOL.md`). Advanced tools require
dedicated validation datasets/fixtures. Heap/Pit/irregular volume
require known-volume or independently surveyed references before
production claims.

---

## 38. Implementation roadmap

This is Smart Measure's internal staging, nested inside
`17_IMPLEMENTATION_ROADMAP.md`'s phases and roughly aligned with
`22_AR_MEASUREMENT_ROADMAP_DETAIL.md`'s milestones:

| Stage here | Tools | Roughly maps to |
|---|---|---|
| Stage 1 — Core AR | Line, Height, Distance Meter, Angle, Polyline, Rectangle, Circle, Polygon, Cube/Cuboid, Cylinder, Area/Perimeter, standard volume, Calculator, Multi-Measurement Session | Phase 2 (Smart Measure MVP) + doc 22 M1/M2 |
| Stage 2 — Advanced Geometry | Polyline Smooth, Polygon Smooth, Wall, Curved Wall, improved editing, smoothing/versioning, advanced confidence | Phase 5 + doc 22 M2 |
| Stage 3 — 3D/Depth | depth capture, scene mesh/point cloud, 3D Surface Scanner, Irregular Volume, Volume Smooth | Phase 6 + doc 22 M5 |
| Stage 4 — Professional Terrain/Material Volume | Heap, Pit, reference-surface workflows, advanced volume validation | Phase 10 (new scope beyond doc 22) |
| Stage 5 — Hardware Extension | fixed phone, external RGB-D/3D station, larger measurement zones, optional industrial sensors | Phase 9 + doc 22 M6 |

Do not skip validation gates simply to expose every tool quickly.

---

## 39. Production activation gate

A tool may be shown as production-ready only when: implementation is
complete; required device capability detection works; failure states
work; editing/review works where applicable; unit/math tests pass;
real-device tests pass; physical accuracy/repeatability is
characterized; known limitations are documented; unsupported devices
receive a safe fallback.

Advanced 3D tools additionally require reconstruction-quality
validation.

---

## 40. Design requirements

Follow the canonical BoxOp Design System (`12_UI_UX_DESIGN_SYSTEM.md`).
The measurement-tool picker should feel premium, fast and
understandable. The camera remains primary.

Do not copy another AR measurement application's color palette, button
design, layout, icon artwork, marketing screens, or proprietary visual
identity. Study interaction principles and create an original BoxOp
experience.

---

## 41. Claude implementation instruction

Treat this catalog as the official target capability set for BoxOp
Smart Measure. Do **not** interpret it as an instruction to implement
every tool in one pass.

Before working on a tool:

1. Read `00_DOCUMENT_MAP.md` through `03_CLAUDE_CODE_RULES.md`.
2. Read `21_AR_MEASUREMENT_SYSTEM.md`.
3. Read `04_SMART_MEASURE.md`.
4. Read `02_MASTER_ARCHITECTURE.md`.
5. Read `12_UI_UX_DESIGN_SYSTEM.md` for UI work.
6. Inspect actual repository state, including `phase0/`.
7. Check `phase0/TOOL_REGISTRY_STATUS.md`.
8. Verify current ARKit/ARCore/platform APIs when relevant
   (`03_CLAUDE_CODE_RULES.md` rule 12).
9. Implement the earliest incomplete prerequisite — as of this writing,
   that is the Phase 0 AR point-to-point screen (`phase0/README.md`
   "Next task"), which underlies "Line" above.
10. Add deterministic math tests.
11. Add real-device validation when spatial behavior is involved.
12. Add physical validation before accuracy claims.
13. Update `phase0/TOOL_REGISTRY_STATUS.md`.
14. Preserve existing BoxOp Spot/Bin/Object architecture.
15. Record material decisions in `phase0/README.md` ("Open architecture
    decisions") until a dedicated decision log exists.

---

## 42. Final product rule

BoxOp Smart Measure is intended to support the full measurement-tool
family defined in this catalog. However:

`FEATURE TARGET ≠ IMPLEMENTED`
`IMPLEMENTED ≠ VALIDATED`
`VALIDATED ≠ UNIVERSALLY SUPPORTED`

The application must expose only capabilities that the current
implementation and device can perform reliably. Measurement truth takes
precedence over feature count.
