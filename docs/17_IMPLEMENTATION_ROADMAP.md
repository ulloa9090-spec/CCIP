# 17 — Implementation Roadmap

## Phase 0 — Real-device technical validation
iPhone + Android camera/AR/depth/IMU capability spike and measurement benchmark.

## Phase 1 — Foundation
Project structure, localization (`en`, `es-419`), design tokens, local DB, permissions, capability detection, camera preview.

## Phase 2 — Smart Measure MVP
Point-to-point + first automatic/guided rectangular-object measurement, uncertainty and provenance.

## Phase 3 — Digital Records
Save measurements, photos, weight, notes/voice, history and exports.

## Phase 4 — Spot & Bin
Distinct entities, manual/camera creation, `Spots | Bins` storage UI.

## Phase 5 — Compatibility & Placement
Object→Spot, Object→Bin, Bin→Spot; rotations, clearances, assignment/history.

## Phase 6 — Reference-Assisted Precision
Fiducials/calibration references and repeatability improvements.

## Phase 7 — Selective Space Mapper
Bounded user-selected zones only; save/reopen/validate.

## Phase 8 — Sync/Desktop
Offline queue, optional cloud/local-network sync and desktop manager.

## Phase 9 — Optional Hardware
Bluetooth scale, BLE ToF/IMU and portable station experiments.

## Phase 10 — Advanced
Irregular objects, multi-object packing, pallets/containers, occupancy and enterprise integrations.

## Gate
Do not expand precision-dependent features without benchmark/regression evidence.
