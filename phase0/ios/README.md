# iOS Phase 0 harness

Two screens, built up one Phase 0 slice at a time
(`docs/20_PHASE0_EXECUTION_RESEARCH_PROMPT.md`):

1. **Capabilities** — camera, AR/world tracking, plane detection, IMU and
   depth/LiDAR support read live from Apple's APIs. **Validated on real
   hardware** — see `../evidence/ios/RESULT.md` (PASS, `iPhone18,2`,
   iOS 26.6.1, Tier C/LiDAR).
2. **Measure** — the AR point-to-point spike: tap two points, see the
   real 3D distance between them (`ARMeasureView.swift`,
   `ARMeasureScreen.swift`, `PointToPointMeasurement.swift`). This is the
   *only* measurement capability in this build — no rectangle, cuboid,
   cylinder, sessions, or CV assistance yet (see `docs/25_MEASUREMENT_TOOLS_CATALOG.md`
   and `phase0/TOOL_REGISTRY_STATUS.md` for what's still `SPECIFIED`).
   **Not yet run on real hardware** — that's the immediate next step.

- **Source**: `BoxOpPhase0/*.swift`
- **Setup & run on a real iPhone**: see `SETUP.md`
- **Required Info.plist keys**: see `Info-Additions.md` (unchanged — AR
  reuses the camera permission already granted)
- **Field contract**: `../shared/CAPABILITY_MATRIX.md`
- **Benchmark protocol for Measure, once validated**: `../shared/BENCHMARK_PROTOCOL.md`

Not built or run in this environment — there is no macOS/Xcode toolchain
available here. The source follows standard, stable AVFoundation, ARKit,
SceneKit and CoreMotion APIs; Xcode's compiler will surface any issue
immediately when you build it. **The Measure tab requires a real device
— ARKit does not run in the iOS Simulator.**
