# Android Phase 0 harness

Capability-detection spike for BoxOp Phase 0
(`docs/20_PHASE0_EXECUTION_RESEARCH_PROMPT.md`). Reports camera, ARCore
support, plane detection, IMU, and depth/ToF support read live from
Android/ARCore APIs — no dimensions, no measurement UI yet (that's the
next task; see `../README.md`).

- **Source**: `app/src/main/java/com/boxop/phase0/`
- **Setup & run on a real Android phone**: see `SETUP.md`
- **Field contract**: `../shared/CAPABILITY_MATRIX.md`

## Third-party dependency introduced

`com.google.ar:core` (official Google ARCore client library) — needed to
query `ArCoreApk.checkAvailability()` and `Session.isDepthModeSupported()`.
This is Google's own official SDK for the platform capability this spike
exists to test, not a third-party alternative; there's no way to answer
"does ARCore work on this device" without it. No other new dependency was
introduced — depth-sensor hardware detection uses the built-in Android
Camera2 API instead of adding a rendering library, since Phase 0's slice
is capability detection only (see `../README.md` for what's deferred).

## What was and wasn't verified here

This container has JDK 21 and Gradle 8.14.3 but no Android SDK, so a full
`assembleDebug` could not be run in this environment. The Gradle DSL
(`settings.gradle.kts`, `build.gradle.kts`, `app/build.gradle.kts`) follows
current, standard Android Studio project conventions. Open it in Android
Studio per `SETUP.md` — Gradle sync will surface any dependency-resolution
or DSL issue immediately, before you even touch a device.
