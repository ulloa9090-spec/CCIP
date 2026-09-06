# 21 — AR Measurement System (Deep Dive)
Version: 1.0
Status: Canonical detail, subordinate to `01_PRODUCT_VISION.md` and `02_MASTER_ARCHITECTURE.md`
Platforms: iOS + Android

## Relationship to the rest of the canon

This document is a **deep technical dive on the Automatic / Adaptive Guided
AR measurement path** described at a high level in `04_SMART_MEASURE.md`.
It does not redefine BoxOp's product identity, vocabulary or scope:

- The product is **BoxOp** (not "Warehouse App") — see `01_PRODUCT_VISION.md`.
- **Object / Bin / Spot / Space** remain the canonical entities — see
  `06_SPOT_BIN_MODEL.md`. Nothing below introduces a competing model; a
  measurement produced by this engine is simply attached to whichever of
  those three target types was selected before capture, per
  `04_SMART_MEASURE.md` ("Target type").
- The cross-platform framework mentioned in this document (Flutter, with
  native ARKit/ARCore adapters) is a **candidate to evaluate during
  Phase 0**, not a decided architecture. `02_MASTER_ARCHITECTURE.md`
  ("Cross-platform decision") and `20_PHASE0_EXECUTION_RESEARCH_PROMPT.md`
  section 6 govern that decision; nothing here overrides the gate.
  Wherever this document says "Flutter" or "the Flutter bridge," read it
  as "the shared-UI layer, if Phase 0 selects one" — if Phase 0 instead
  favors independent native iOS/Android implementations, the adapter
  boundary and normalized models below still apply directly, just without
  a cross-platform shell above them.

Core flow (a detailed version of `01_PRODUCT_VISION.md`'s
`Measure → Validate → Save → Match → Assign → Export/Sync`):

```
SCAN / SELECT ITEM
→ OPEN AR MEASUREMENT
→ PLACE OR DETECT POINTS
→ REVIEW GEOMETRY
→ CONFIRM DIMENSIONS
→ SAVE
→ INVENTORY / BIN / REPORT
```

## Platform architecture

Candidate layering, pending the Phase 0 decision:

```
Shared UI layer (framework TBD at Phase 0; Flutter is one candidate)
→ MeasurementEngine
→ ARMeasurementProvider
→ ARPlatformAdapter
   ├── iOS → ARKit
   └── Android → ARCore
```

Do not force identical internal implementations on both platforms. Both
normalize into the common application models defined below. This
adapter boundary is required regardless of the Phase 0 outcome — it is
the same "Adapter boundary" rule already stated in
`02_MASTER_ARCHITECTURE.md`.

## Runtime capability detection

Possible capabilities:
- `AR_TRACKING`
- `HORIZONTAL_PLANE`
- `VERTICAL_PLANE`
- `WORLD_RAYCAST`
- `DEPTH`
- `LIDAR`
- `SCENE_MESH`
- `SCENE_RECONSTRUCTION`
- `WORLD_ANCHORS`
- `CAMERA_INTRINSICS`
- `MOTION_TRACKING`

Expose only modes supported by the current device. This is the same
principle as `09_CAMERA_SENSOR_HARDWARE.md` ("Capability detection") and
is already implemented at the Phase 0 slice level by
`phase0/shared/CAPABILITY_MATRIX.md` — this list is the fuller capability
vocabulary the production measurement engine will need beyond Phase 0's
capability-detection-only scope.

## Core modes

`04_SMART_MEASURE.md` describes Automatic, Adaptive Guided, Point-to-Point,
Reference-Assisted and Station Mode at the product level. Within the AR
engine, Point-to-Point (and its Phase 0 slice implementation, the next
queued task per `phase0/README.md`) decomposes into these interaction
primitives, roughly in build order:

### Point-to-Point
User places A and B in world space. Calculate Euclidean distance and show
a live line/label. Endpoints remain editable before confirmation.

### Height
User selects base and top. Prefer gravity/world-up constraints when
available.

### Rectangle
Four coplanar points. Calculate sides, perimeter and area. Validate
planarity.

### Polyline
P1 → P2 → P3 ... Calculate each segment and cumulative distance.

### Angle
Three points A-B-C. Calculate the angle at B.

### Polygon Area
Multiple coplanar points. Validate before area calculation.

### Box / Cuboid
Primary logistics mode — this is what ultimately populates the
Object/Bin/Spot `length, width, height, volume` fields defined in
`10_DATA_MODEL.md`. Output D1/D2/D3, semantic L/W/H and volume. Support
manual AR, assisted CV, support-plane, and future depth/LiDAR workflows.

## Computer vision cooperation

Recommended pipeline:

```
Camera Frame
→ PackageDetector
→ Corner / Edge Proposals
→ AR Raycast / Depth Projection
→ Candidate 3D Points
→ Geometry Validation
→ Cuboid Proposal
→ User Review
→ MeasurementResult
```

Computer vision may assist geometry but must never fabricate physical
scale — this is the same non-negotiable rule as
`03_CLAUDE_CODE_RULES.md` rule 5 and `01_PRODUCT_VISION.md` ("Trust").

Preserve:
- original automatic points;
- user-edited points;
- final confirmed geometry.

This is the same audit requirement as `08_DIGITAL_RECORDS.md` ("Audit").

## AR provider responsibilities

`ARMeasurementProvider` / `ARPlatformAdapter` should support:
- initialize / pause / stop session;
- capability detection;
- tracking state;
- plane observations;
- raycast / hit test;
- anchors;
- world-space 3D points;
- camera pose;
- optional depth;
- optional mesh / scene geometry;
- normalized platform errors.

No ARKit- or ARCore-specific types should leak into domain logic — the
same adapter-boundary discipline as `02_MASTER_ARCHITECTURE.md`.

## Tracking quality

Normalize to:
`INITIALIZING / GOOD / LIMITED / RELOCALIZING / UNAVAILABLE`

Possible causes:
`INSUFFICIENT_FEATURES / EXCESSIVE_MOTION / POOR_LIGHT / CAMERA_OBSTRUCTED / TRACKING_LOST / DEPTH_UNAVAILABLE`

When tracking is poor, guide the user instead of silently producing
uncertain geometry — the same principle as `04_SMART_MEASURE.md`'s
corrective-guidance UX states and `03_CLAUDE_CODE_RULES.md` rule 8.

## Plane detection

Support horizontal and vertical planes when available. Useful for
floors, pallets, shelves, walls, rack faces (Spots) and package faces
(Objects/Bins). Plane detection is helpful but must not be mandatory for
every measurement.

## Raycast / hit test

Map screen touches into 3D world positions. Prefer the most reliable
source available:
1. existing plane geometry;
2. supported depth;
3. estimated feature point.

Store the source type as part of measurement provenance
(`10_DATA_MODEL.md` "Measurement minimum").

## Depth and LiDAR

Depth is an enhancement, not a universal requirement — consistent with
`03_CLAUDE_CODE_RULES.md` rule 10 (MVP cannot require LiDAR or
proprietary hardware).

Use it when available to improve point placement, package surface
estimation, cuboid fitting and confidence. Never assume all Android or
iPhone devices support depth.

## iOS / ARKit

Implement behind a native adapter. At implementation time verify current
Apple documentation for: world tracking, plane detection, raycasting,
anchors, camera transform, scene depth, LiDAR, scene reconstruction, mesh
anchors, camera intrinsics, relocalization. (`03_CLAUDE_CODE_RULES.md`
rule 12.)

## Android / ARCore

Implement behind a native adapter. At implementation time verify current
Google documentation for: session lifecycle, plane detection, hit
testing, anchors, camera pose, Depth API, supported-device checks,
camera intrinsics, motion tracking. (`03_CLAUDE_CODE_RULES.md` rule 12.)

## Shared-UI bridge (only if Phase 0 selects a shared-UI layer)

If Phase 0 concludes a shared cross-platform UI layer is the right
architecture, evaluate current maintained options before committing:
- a maintained Flutter AR plugin;
- Pigeon;
- platform channels;
- a custom plugin;
- platform views.

Do not choose one only because setup is easy. Evaluate maintenance,
iOS/Android parity, advanced AR access, depth support, performance,
extensibility and licensing — the same bar
`03_CLAUDE_CODE_RULES.md` rule 15 sets for any major dependency. Record
the decision and its rationale in `phase0/README.md` or the
Phase 0 architecture-decision record once Phase 0 concludes.

If Phase 0 instead selects independent native implementations, this
section does not apply — the `ARPlatformAdapter` boundary above still
holds, just consumed directly by native iOS/Android UI rather than
through a bridge.

## Common AR models

Suggested normalized models:
`ARCapabilitySet`, `ARSessionState`, `ARTrackingState`, `ARWorldPoint`,
`ARAnchor`, `ARPlane`, `ARRaycastResult`, `ARDepthObservation`,
`ARCameraPose`, `ARFrameMetadata`, `ARMeasurementSession`.

Document all coordinate systems.

## Coordinate spaces

`SCREEN / IMAGE / CAMERA / AR_WORLD / OBJECT / MEASUREMENT_LOCAL`

Never mix spaces implicitly.

## Units

Platform AR APIs typically report meters. BoxOp persists:
- length = millimeters;
- volume = cubic millimeters.

This is the concrete canonical base unit referred to abstractly in
`10_DATA_MODEL.md` ("canonical base unit internally"). Convert without
rounding until presentation, and never by string manipulation, per
`14_LOCALIZATION_LANGUAGE.md` ("Measurement units").

## Measurement session

```
CREATED
→ INITIALIZING_AR
→ TRACKING
→ CAPTURING_POINTS
→ GEOMETRY_READY
→ NEEDS_REVIEW
→ CONFIRMED
→ SAVED
```

Failures:
`AR_UNSUPPORTED / AR_INITIALIZATION_FAILED / TRACKING_LOST / INSUFFICIENT_GEOMETRY / DEPTH_REQUIRED / INVALID_PLANE / USER_CANCELLED / DEVICE_ERROR`

## UI

Camera-first interface, consistent with `12_UI_UX_DESIGN_SYSTEM.md`.

Top: close, mode, tracking state.
Center: camera, reticle, spatial overlays.
Bottom: add/confirm point, undo, reset, mode/unit actions.

After geometry is sufficient: Review / Edit Points / Confirm.

## Point editing

Support select, drag/reposition, add, delete, reset, zoom/pan and
precision assist where appropriate.

## Confidence

Potential factors: tracking state, point stability, plane quality, depth
availability, viewing angle, camera distance/motion, lighting, temporal
consistency, geometry consistency, CV agreement and user correction.

Confidence remains separate from verification — this maps directly onto
`10_DATA_MODEL.md`'s `confidenceClass` field and the presentation states
in `12_UI_UX_DESIGN_SYSTEM.md` ("Trust").

## Temporal stability

Avoid single-frame jitter. Where useful, use a short temporal window,
robust median/filtering, anchor stability checks and discontinuity
rejection, without introducing excessive delay.

## Accuracy validation

AR world scale must be physically validated. This is the same discipline
as `16_TESTING_VALIDATION.md` and the concrete protocol already written
in `phase0/shared/BENCHMARK_PROTOCOL.md`.

Use trusted references such as a steel rule, tape, calibration box or
rigid fixture. Test multiple distances and known boxes across: devices,
distances, angles, lighting, textures, dark/reflective surfaces, handheld
motion.

Record: absolute error, percentage error, mean/median error, 95th
percentile, maximum error, repeatability, failure rate, capture time.

Never publish accuracy claims without evidence.

## Device tiers

- Tier A — Standard AR
- Tier B — AR + Depth
- Tier C — LiDAR / Advanced Spatial

Degrade gracefully.

## Fallbacks

- AR unsupported → Manual Measurement (Point-to-Point without AR, or
  Reference-Assisted per `04_SMART_MEASURE.md`).
- Poor tracking → guidance / retry.
- Unstable placement → Marker-Assisted (Reference-Assisted mode).
- Unreliable full XYZ → correction / another mode.

Advanced AR must never disable basic measurement.

## Offline

AR tracking, point placement, geometry, calculations and local save must
work without internet — the same requirement as
`11_OFFLINE_SYNC_DESKTOP.md`.

## Privacy

Prefer on-device spatial processing. Do not upload camera frames, meshes,
room scans or warehouse imagery unless explicitly required — the same
rule as `02_MASTER_ARCHITECTURE.md` ("Privacy").

## Performance

Keep camera/overlay smooth. Separate AR frame handling, CV analysis,
geometry, persistence and reporting. Pause AR when backgrounded or the
screen is closed.

## MVP AR feature set

1. capability detection — **shipped in Phase 0**, see `phase0/README.md`.
2. session lifecycle
3. tracking state
4. raycast / point placement
5. point-to-point — **next queued task**, see `phase0/README.md`.
6. height
7. undo/reset
8. units
9. save `MeasurementResult`
10. history
11. Android real-device validation
12. iOS real-device validation

Next: rectangle, angle, polyline, polygon area, cuboid, volume, point
editor, package detection assistance.

Advanced: ARCore Depth, iOS LiDAR/depth, mesh/reconstruction, automatic
cuboid fitting.

## Implementation order

- AR-0 current ARKit/ARCore (and, if selected, shared-UI bridge) research
- AR-1 normalized interfaces/models
- AR-2 capability detection — **done, Phase 0**
- AR-3 session lifecycle
- AR-4 reticle/raycast
- AR-5 point-to-point — **next queued task**
- AR-6 height
- AR-7 persistence
- AR-8 edit/undo/reset
- AR-9 rectangle/polyline/angle/area
- AR-10 cuboid
- AR-11 CV-assisted corner proposal
- AR-12 confidence/stability
- AR-13 Android depth prototype
- AR-14 iOS LiDAR/depth prototype
- AR-15 physical accuracy benchmark and supported-device matrix

## Claude rule

Before AR implementation beyond the Phase 0 capability-detection slice:
1. Read `00_DOCUMENT_MAP.md` through `03_CLAUDE_CODE_RULES.md`.
2. Read this document (`21_AR_MEASUREMENT_SYSTEM.md`) and
   `04_SMART_MEASURE.md`.
3. Read `02_MASTER_ARCHITECTURE.md`.
4. Read `12_UI_UX_DESIGN_SYSTEM.md` and `13_SCREEN_SPECIFICATIONS.md`.
5. Inspect the actual repository, including `phase0/`.
6. Verify current ARKit/ARCore (and shared-UI bridge, if applicable)
   integration docs.
7. Record unresolved architecture selections in `phase0/README.md`
   ("architecture decisions that must remain open").
8. Implement only the smallest active AR phase (per Implementation order
   above), one at a time, per `03_CLAUDE_CODE_RULES.md` rule 2.
9. Test native spatial behavior on real devices.
10. Never claim accuracy without physical evidence
    (`phase0/shared/BENCHMARK_PROTOCOL.md`).

## Final rule

BoxOp must maintain a trustworthy chain:

```
USER INTENT
→ NATIVE SPATIAL OBSERVATION
→ WORLD GEOMETRY
→ VALIDATION
→ CONFIDENCE
→ HUMAN REVIEW
→ NORMALIZED MEASUREMENT
→ HISTORY / INVENTORY / REPORT
```
