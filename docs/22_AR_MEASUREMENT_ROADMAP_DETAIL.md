# 22 — AR Measurement Roadmap Detail
Version: 1.0
Status: Detail addendum to `17_IMPLEMENTATION_ROADMAP.md`, not a replacement

## Scope of this document

`17_IMPLEMENTATION_ROADMAP.md` defines BoxOp's 11 phases (Phase 0 through
Phase 10). This document zooms into the AR measurement work that spans
mainly **Phase 2 (Smart Measure MVP)**, **Phase 6 (Reference-Assisted
Precision)** and parts of **Phase 10 (Advanced)**, giving it the same
milestone granularity `21_AR_MEASUREMENT_SYSTEM.md` uses. It does not
change phase ordering, does not move the Phase 0 gate, and does not
decide the cross-platform framework — see
`21_AR_MEASUREMENT_SYSTEM.md` ("Relationship to the rest of the canon").

## M1 — AR Measurement Core (maps to Phase 2)

Cross-platform shell (framework decided at Phase 0 — a shared-UI layer is
one candidate, independent native apps are the other), Android/iOS AR
adapters, capability detection, point-to-point, height, unit conversion,
local save/history.

## M2 — Advanced AR Tools (maps to Phase 2/5)

Rectangle, angle, polyline, polygon area, cuboid L/W/H, volume and point
editing.

## M3 — Warehouse/Storage Integration (maps to Phase 4/5)

Barcode/QR, Object/Bin identity, quantity, Bin/Spot assignment (per
`06_SPOT_BIN_MODEL.md` and `07_SMART_PLACEMENT.md`), photos, attaching
measurements to `Record`s (`08_DIGITAL_RECORDS.md`), PDF/share
(`15_EXPORTS_INTEGRATIONS.md`).

## M4 — Assisted Automatic Package Measurement (maps to Phase 2 stretch / Phase 10)

Package detection, corner/edge proposals, AR projection to 3D, manual
correction and confidence — the CV-cooperation pipeline described in
`21_AR_MEASUREMENT_SYSTEM.md`.

## M5 — Depth / LiDAR (maps to Phase 6)

ARCore Depth where available; ARKit depth/LiDAR where available;
mesh/scene geometry only when useful; empirical accuracy matrix per
`phase0/shared/BENCHMARK_PROTOCOL.md` and `16_TESTING_VALIDATION.md`.

## M6 — Connected / Professional Platform (maps to Phase 8/9)

Optional cloud/auth/sync (`11_OFFLINE_SYNC_DESKTOP.md`), fixed-phone
station, external measurement station, scale/printer/RFID only when
justified (`09_CAMERA_SENSOR_HARDWARE.md` Tier 2/3).

## Rule

AR is a first-class measurement mode alongside Manual (Point-to-Point
without AR) and Reference-Assisted, as already stated in
`04_SMART_MEASURE.md` — this document does not introduce a new
`MeasurementProvider` concept outside that.
