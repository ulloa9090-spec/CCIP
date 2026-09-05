# iOS Phase 0 harness

Capability-detection spike for BoxOp Phase 0
(`docs/20_PHASE0_EXECUTION_RESEARCH_PROMPT.md`). Reports camera, AR/world
tracking, plane detection, IMU and depth/LiDAR support read live from
Apple's APIs — no dimensions, no measurement UI yet (that's the next
task; see `../README.md`).

- **Source**: `BoxOpPhase0/*.swift`
- **Setup & run on a real iPhone**: see `SETUP.md`
- **Required Info.plist keys**: see `Info-Additions.md`
- **Field contract**: `../shared/CAPABILITY_MATRIX.md`

Not built or run in this environment — there is no macOS/Xcode toolchain
available here. The source follows standard, stable AVFoundation, ARKit
and CoreMotion APIs; Xcode's compiler will surface any issue immediately
when you build it.
