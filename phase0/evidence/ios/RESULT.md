# Phase 0 — iOS Hardware Capability Spike: PASS

Real-device capability matrix exported from BoxOp Phase 0 running on a
physical iPhone (not the Simulator).

- **Evidence file**: [`boxop-capability-matrix-1788806343.json`](./boxop-capability-matrix-1788806343.json),
  matching `phase0/shared/capability-matrix.schema.json` field-for-field.
- **Device**: `iPhone18,2`, iOS `26.6.1`.
- **Harness version**: `0.1.0-phase0`.
- **Captured**: 2026-09-07T18:39:03Z (decoded from the export filename's
  Unix timestamp, `1788806343`, per the naming pattern in
  `CapabilityReportView.swift`'s `writeMatrixToTempFile()`).

## Result

| Capability | Result |
|---|---|
| Camera available | Yes |
| Camera authorization | authorized |
| AR world tracking supported | Yes |
| Plane detection supported | Yes |
| Accelerometer | Yes |
| Gyroscope | Yes |
| Device motion (fused) | Yes |
| Scene depth supported | Yes |
| LiDAR mesh available | Yes |
| Discrete ToF | No |

Device tier (`docs/21_AR_MEASUREMENT_SYSTEM.md` "Device tiers"): **Tier C
— LiDAR / Advanced Spatial**.

Selected strategy: *Reference-Assisted / Station Mode using LiDAR scene
mesh for higher-precision geometry.*
Fallback: *AR point-to-point (world tracking, no mesh) if mesh
reconstruction quality is poor.*

## Conclusion

**PHASE 0 iOS HARDWARE CAPABILITY SPIKE = PASS.**

This confirms the capability-detection harness (`phase0/ios/`) runs
correctly on real iOS hardware and reports accurate, runtime-detected
values — not simulator placeholders. Do not overwrite this JSON; it is
the reference evidence for this device/OS combination. A different
device or OS version gets its own dated export alongside this one.

## What this does and does not prove

- **Proves**: the Phase 0 capability-detection slice works end-to-end on
  real hardware, on a Tier C (LiDAR) device.
- **Does not yet prove**: BoxOp can actually measure anything. No
  distance, dimension, or volume has been computed on this device yet.
  That is the next milestone — the AR point-to-point measurement spike
  in `phase0/ios/BoxOpPhase0/ARMeasureView.swift` and
  `ARMeasureScreen.swift` — which still needs its own real-device run
  and, once point-to-point works, a benchmark against
  `phase0/shared/BENCHMARK_PROTOCOL.md`.
- **Does not close Phase 0 overall**: `docs/20_PHASE0_EXECUTION_RESEARCH_PROMPT.md`
  section 15 requires evidence from **both** a representative iPhone
  *and* a representative Android device. The Android leg has not run on
  real hardware yet (see `phase0/android/`) — it stays open until it
  does.
