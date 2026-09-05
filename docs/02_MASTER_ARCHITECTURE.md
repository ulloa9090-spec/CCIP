# 02 — Master Architecture

## Pipeline
`Native Sensors → Adapters → Observations → Spatial Engine → Measurement Solver → Domain Services → Local Persistence/Sync → UI`

## Native inputs
- RGB camera
- IMU/device motion
- AR pose/tracking
- depth/LiDAR/ToF when exposed
- passive fiducials/calibrated references
- optional BLE sensors/scales

## Adapter boundary
All platform-specific sensor access stays behind adapters. Domain logic must not depend on a specific phone model.

## Spatial Engine
Owns:
- coordinate frames
- pose and planes
- calibration
- depth/observation fusion
- anchors
- bounded-space relocalization
- quality metrics

## Measurement Solver
Canonical output:
`length, width, height, volume, unit, method, uncertainty, confidenceClass, provenance`

## Domain modules
- Smart Measure
- Selective Space Mapper
- Spot/Bin Manager
- Smart Placement
- Digital Records
- Export/Share
- Sync/Desktop

## Cross-platform decision
iOS and Android are first-class. Share domain contracts/models where beneficial, but preserve native camera/AR access. Final framework choice is gated by Phase 0 real-device validation.

## Offline-first
Local data is authoritative while offline. Cloud/local-network sync is additive.

## Privacy
Raw camera/depth media remains local by default. Network transmission must be explicit and purposeful.
