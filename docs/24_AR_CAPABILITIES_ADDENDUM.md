# 24 — AR Capabilities Addendum
Version: 1.1
Status: Canonical addendum
Applies to: `21_AR_MEASUREMENT_SYSTEM.md`

## Purpose

This addendum makes two capabilities explicit requirements of the AR
measurement system:

1. Cylinder Measurement
2. Multi-Measurement Session / Measurement Calculator

This document extends `21_AR_MEASUREMENT_SYSTEM.md`. It does not replace
BoxOp's architecture, `04_SMART_MEASURE.md`'s Smart Measure concepts, the
`06_SPOT_BIN_MODEL.md` Object/Bin/Spot model, `10_DATA_MODEL.md`'s
entities, or previously valid measurement requirements. Where this
document uses generic examples (bins, pallets, locations), BoxOp's
existing terminology and domain model govern — see
`00_DOCUMENT_MAP.md` ("Canonical vocabulary").

Both capabilities described here are **Phase 2/5 scope**
(`17_IMPLEMENTATION_ROADMAP.md`), layered on top of the Box/Cuboid mode
and the point-to-point measurement screen that is the current next task
per `phase0/README.md`. Nothing here is required for Phase 0.

---

# 1. Cylinder Measurement

`CYLINDER` is an official measurement geometry, alongside the modes
already listed in `21_AR_MEASUREMENT_SYSTEM.md` ("Core modes").

The system should support measuring cylindrical objects using AR points,
assisted geometry, depth/LiDAR when available, or user correction.

## Required outputs

Where sufficient geometry exists:

- diameter
- radius
- height
- circumference
- base area
- lateral surface area
- total surface area
- volume
- unit
- measurement method
- confidence
- verification state

## Mathematical model

Given radius `r` and height `h`:

- Diameter: `d = 2r`
- Circumference: `C = 2πr`
- Base area: `A_base = πr²`
- Lateral area: `A_lateral = 2πrh`
- Total surface area: `A_total = 2πr(r + h)`
- Volume: `V = πr²h`

Do not calculate physical values unless radius/diameter and height are
supported by valid physical geometry — the same non-negotiable rule as
`03_CLAUDE_CODE_RULES.md` rule 5.

## Interaction

Possible workflow:

1. Select `Cylinder`.
2. Identify or place points defining the circular base.
3. Determine/confirm diameter or radius.
4. Define cylinder height.
5. Preview cylinder overlay.
6. Review dimensions.
7. Edit points/axis if necessary.
8. Confirm.
9. Save to current Measurement Session.

The cylinder axis must be editable when automatic orientation is
uncertain.

## Future assistance

Computer vision may propose circular/elliptical boundaries. Depth/LiDAR
may assist surface fitting. Automatic fitting must remain reviewable,
per `21_AR_MEASUREMENT_SYSTEM.md` ("Computer vision cooperation").

---

# 2. Multi-Measurement Session

A single `MeasurementSession` may contain multiple independent and
related measurements.

Example:

```
Measurement Session: BIN-A104

- Line: 3.10 m
- Height: 1.15 m
- Angle: 90°
- Rectangle: 1.50 m × 0.70 m
- Box: 1.50 × 0.70 × 1.20 m
- Cylinder: Ø0.40 × 1.10 m
- Polygon Area: 2.40 m²
```

The user must not be forced to create a new session for every
measurement.

---

# 3. Measurement Calculator

The session acts as a spatial measurement calculator. Depending on
geometry, automatically derive supported quantities.

| Geometry | Derived quantities |
|---|---|
| Line | length |
| Height | height |
| Angle | angle |
| Rectangle | length, width, perimeter, area |
| Polygon | perimeter, area |
| Cuboid / Box | length, width, height, surface area, volume |
| Cylinder | diameter, radius, height, circumference, base area, lateral area, total surface area, volume |

Never display a derived value when required dimensions are unknown or
invalid.

---

# 4. Session data model

A `MeasurementSession` should be able to own a collection such as:

`List<MeasurementGeometry> geometries`

Conceptual geometry types: `LINE`, `HEIGHT`, `ANGLE`, `RECTANGLE`,
`POLYLINE`, `POLYGON`, `CUBOID`, `CYLINDER`. Future types may be added
without redesigning the session. (`25_MEASUREMENT_TOOLS_CATALOG.md`
section 31 has since superseded this with the full authoritative list,
including Wall, Curved Wall, Heap, Pit and others — treat that one as
current.)

Each geometry should preserve:

- `geometryId`
- type
- AR/world points
- semantic points/edges
- calculated properties
- canonical units
- display units
- measurement method
- confidence
- verification
- automatic geometry when applicable
- user-edited geometry when applicable
- source image references
- calibration/reference information
- timestamps
- engine version

**Relationship to `10_DATA_MODEL.md`**: `MeasurementSession` and
`MeasurementGeometry` are new entities this addendum introduces above
the existing atomic `Measurement` entity — a `MeasurementGeometry`'s
calculated properties are what a single `Measurement` record already
captures (`10_DATA_MODEL.md` "Measurement minimum"); the session simply
groups several of them under one operational unit. `10_DATA_MODEL.md`
should be updated with these two entities and their relationships once
this capability is implemented (`03_CLAUDE_CODE_RULES.md` rule 21) —
tracked as an open item in `phase0/README.md`.

---

# 5. Session metadata

A saved session may include:

- `sessionId`
- title/name
- description/notes
- item/Object id
- barcode/SKU
- Bin/Spot id (per `06_SPOT_BIN_MODEL.md`)
- warehouse/zone
- `createdAt`, `updatedAt`
- device, platform
- AR capability tier (per `21_AR_MEASUREMENT_SYSTEM.md` "Device tiers")
- source images
- geometries
- session-level confidence/quality summary
- report references

This allows sessions such as: Package 45821, Pallet 027, Bin A-104,
Rack B / Shelf 3, Receiving Measurement, Room/Storage Area.

---

# 6. Session UI

During one AR session the user should be able to: add a measurement,
switch geometry mode, select an existing measurement, edit it, delete
it, hide/show overlays, undo, reset selected geometry, inspect
calculated values, continue adding measurements, save the entire
session.

Do not clutter the camera with every control simultaneously. Use
BoxOp's design system (`12_UI_UX_DESIGN_SYSTEM.md`) and contextual
controls/bottom sheets.

---

# 7. Camera overlay

Multiple saved geometries may coexist in the same spatial session. The
overlay system should: clearly distinguish selected vs. unselected
geometry, keep labels readable, avoid excessive label overlap, preserve
spatial anchoring, allow temporary hiding of measurements, prioritize
the currently edited geometry. The camera remains the dominant visual
surface, per `12_UI_UX_DESIGN_SYSTEM.md`.

---

# 8. Session summary

A session summary should provide a compact list of captured
measurements. Example:

```
PACKAGE 45821

Box
600 × 400 × 300 mm
Volume: 72,000,000 mm³

Line
840 mm

Angle
89.7°
```

The user can tap a measurement to inspect/edit it.

---

# 9. Persistence

Saving the session must preserve individual geometry records rather
than flattening everything into one result:

```
MeasurementSession
→ many MeasurementGeometry
→ many points/anchors
→ derived properties
→ images/calibration/provenance
```

The existing `Measurement` entity (`10_DATA_MODEL.md`) remains useful
for normalized individual measurements. Do not break historical
Measurement records — use a migration/extension strategy once
implementation exists (`03_CLAUDE_CODE_RULES.md` rule 13).

---

# 10. Inventory / BoxOp integration

A `MeasurementSession` may be associated with: Object, Spot, Bin,
pallet, location, barcode/SKU, `Report` (`15_EXPORTS_INTEGRATIONS.md`).

Preserve BoxOp's existing terminology/model when integrating this
addendum — do not rename the product or replace existing domain
concepts merely because this specification uses generic examples.

---

# 11. Reporting

Reports may include: session title, annotated image, all measurements,
dimensions, area/perimeter, volume, geometry type, confidence,
verification, item/barcode/bin/location, date/time, measurement method.
A PDF may contain multiple geometries from the same session, per
`15_EXPORTS_INTEGRATIONS.md`.

---

# 12. Confidence

Confidence belongs to each measurement geometry. A session-level
quality summary may be derived, but it must not erase individual
confidence values. Example:

```
Session Quality: REVIEW RECOMMENDED

Box: HIGH
Line 1: HIGH
Cylinder: MEDIUM
```

---

# 13. Editing and history

When geometry is edited: preserve the original automatic proposal where
applicable, preserve the final user-confirmed geometry, recalculate
dependent values, update confidence where appropriate, preserve
audit/history rules (`08_DIGITAL_RECORDS.md` "Audit").

Editing a cylinder diameter, for example, must automatically recalculate
circumference, areas and volume.

---

# 14. Offline

Cylinder measurement, multi-measurement sessions, calculator functions,
editing and local persistence must work offline, per
`11_OFFLINE_SYNC_DESKTOP.md`. No cloud dependency is required.

---

# 15. Testing

Add deterministic unit tests for: cylinder formulas, rectangle formulas,
polygon area/perimeter, cuboid surface/volume, unit conversions,
recalculation after edits.

Add real-device AR tests for: multiple anchors/geometries, session
stability, reopening/editing a saved session where supported, overlay
readability, performance with multiple geometries.

Physical accuracy claims still require ground-truth testing, per
`16_TESTING_VALIDATION.md` and `phase0/shared/BENCHMARK_PROTOCOL.md`.

---

# 16. Implementation order

- **AR-CAP-1** Add geometry type abstraction without breaking the
  current `Measurement`/`MeasurementResult` model.
- **AR-CAP-2** Allow `MeasurementSession` to contain multiple geometries.
- **AR-CAP-3** Implement the Measurement Calculator service for derived
  values.
- **AR-CAP-4** Implement Cylinder geometry/math and tests.
- **AR-CAP-5** Add multi-measurement session UI.
- **AR-CAP-6** Add overlay selection/hide/show behavior.
- **AR-CAP-7** Add session summary and persistence.
- **AR-CAP-8** Extend PDF/reporting.
- **AR-CAP-9** Validate performance and real-device AR behavior.

This slots into `22_AR_MEASUREMENT_ROADMAP_DETAIL.md`'s M2 (Advanced AR
Tools) and M3 (Storage Integration) milestones — it does not introduce a
parallel roadmap.

---

# 17. Claude instruction

Treat this file as a canonical addendum to `21_AR_MEASUREMENT_SYSTEM.md`.
Do not restart or rewrite the project.

Before implementation:

1. Inspect the current BoxOp repository, including `phase0/`.
2. Preserve existing Spot/Bin/Object concepts (`06_SPOT_BIN_MODEL.md`).
3. Locate current `MeasurementSession`/`Measurement` implementations —
   as of this writing, none exist yet beyond the Phase 0
   capability-detection slice; the point-to-point measurement screen
   (`phase0/README.md` "Next task") comes first.
4. Read `21_AR_MEASUREMENT_SYSTEM.md` and `04_SMART_MEASURE.md`.
5. Integrate these capabilities through existing abstractions.
6. If schema changes are required, use safe migrations
   (`03_CLAUDE_CODE_RULES.md` rule 13).
7. Add deterministic geometry tests (`03_CLAUDE_CODE_RULES.md` rule 14).
8. Implement only the active roadmap step (`03_CLAUDE_CODE_RULES.md`
   rule 2) — as of this writing, that is still Phase 0.
9. Preserve existing behavior.
10. Record material architectural decisions in `phase0/README.md`
    ("Open architecture decisions") until a dedicated decision log
    exists.

---

# Final rule

A measurement session is a spatial workspace, not merely a single
numeric result. BoxOp should allow the user to measure several aspects
of the same physical object or space, calculate the quantities
supported by each geometry, review them together, preserve their
provenance, and save them as one coherent operational record.
