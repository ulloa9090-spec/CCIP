# BoxOp Smart Measure — Tool Registry Status

Live implementation/validation status for every tool defined in
`docs/25_MEASUREMENT_TOOLS_CATALOG.md`. That document defines what each
tool is; this document tracks what actually exists. Update this table,
not the catalog, whenever a tool's status changes
(`docs/25_MEASUREMENT_TOOLS_CATALOG.md` section 41, step 13).

Status values (`docs/25_MEASUREMENT_TOOLS_CATALOG.md` section 30):
`SPECIFIED` → `PROTOTYPE` → `IMPLEMENTED` → `VALIDATING` →
`PRODUCTION_READY`, or `DISABLED` at any point.

## Prerequisite (not a tool, but gates everything below)

| Item | Status | Notes |
|---|---|---|
| Capability detection (camera/AR/IMU/depth/LiDAR) | `IMPLEMENTED`, not yet `VALIDATING` | Built for both iOS and Android in `phase0/ios` and `phase0/android`; not yet run on real hardware, so not promoted to `VALIDATING`. See `phase0/README.md`. |

## Level A — Core AR geometry

| Tool | Status | Notes |
|---|---|---|
| Line | `SPECIFIED` | Next queued task (`phase0/README.md` "Next task") — point-to-point AR measurement. First tool expected to reach `PROTOTYPE`. |
| Height | `SPECIFIED` | |
| Distance Meter | `SPECIFIED` | |
| Angle | `SPECIFIED` | |
| Polyline | `SPECIFIED` | |
| Rectangle | `SPECIFIED` | |
| Circle | `SPECIFIED` | |
| Polygon/Poly | `SPECIFIED` | |
| Cube/Cuboid/Box | `SPECIFIED` | Primary logistics tool — highest product priority once Line/Height land. |
| Cylinder | `SPECIFIED` | Detailed in `docs/24_AR_CAPABILITIES_ADDENDUM.md` section 1. |
| Area (derived) | `SPECIFIED` | Depends on Rectangle/Circle/Polygon. |
| Perimeter (derived) | `SPECIFIED` | Depends on Rectangle/Circle/Polygon. |
| Surface Area (derived) | `SPECIFIED` | Depends on Cuboid/Cylinder. |
| Standard Geometric Volume (derived) | `SPECIFIED` | Depends on Cuboid/Cylinder. |

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
