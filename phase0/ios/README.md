# iOS Phase 0 harness

Two screens, built up one Phase 0 slice at a time
(`docs/20_PHASE0_EXECUTION_RESEARCH_PROMPT.md`):

1. **Capabilities** — camera, AR/world tracking, plane detection, IMU and
   depth/LiDAR support read live from Apple's APIs. **Validated on real
   hardware** — see `../evidence/ios/RESULT.md` (PASS, `iPhone18,2`,
   iOS 26.6.1, Tier C/LiDAR).
2. **Measure** — continuous multi-point AR measurement
   (`MultiPointMeasurement.swift`, `PolygonGeometry.swift`,
   `ARMeasureView.swift`, `ARMeasureScreen.swift`): start, place an
   unlimited number of points one at a time via a continuous
   screen-center reticle raycast, see each segment and the running total
   distance live, undo/finish/clear. Optionally **Close Shape** to turn
   the polyline into a polygon (perimeter, planar area, interior angles,
   automatic rectangle detection with length×width), then optionally
   place one **height point** to derive a volume (base area × height —
   the same pattern Apple's Measure app uses for room volume). This
   generalizes the earlier fixed two-point spike, which **did** run on
   real hardware and produced a first accuracy baseline — see
   `../evidence/ios/POINT_TO_POINT_BENCHMARK.md` (+5 to +7mm bias,
   preliminary, **not calibrated** — see
   `../shared/BENCHMARK_PROTOCOL.md` section 8 for why not yet). None of
   the multi-point/closed-shape/volume additions have run on real
   hardware yet. Still not implemented: dedicated Cuboid/Cylinder tools,
   Circle, Wall, curved/smooth geometry, sessions, or CV assistance —
   see `docs/25_MEASUREMENT_TOOLS_CATALOG.md` and
   `phase0/TOOL_REGISTRY_STATUS.md` for exactly what's real vs. `SPECIFIED`.

- **Source**: `BoxOpPhase0/*.swift`
- **Setup & run on a real iPhone**: see `SETUP.md`
- **Required Info.plist keys**: see `Info-Additions.md` (unchanged — AR
  reuses the camera permission already granted)
- **Field contract**: `../shared/CAPABILITY_MATRIX.md`
- **Benchmark protocol & constraints on calibration**: `../shared/BENCHMARK_PROTOCOL.md`

Not built or run in this environment — there is no macOS/Xcode toolchain
available here. The source follows standard, stable ARKit, SceneKit and
simd APIs (continuous raycast via `ARSessionDelegate.session(_:didUpdate:)`,
shortest-arc quaternion segment orientation to avoid gimbal lock); Xcode's
compiler will surface any issue immediately when you build it. **The
Measure tab requires a real device — ARKit does not run in the iOS
Simulator.**
