# BoxOp — Phase 0: Real-Device Technical Validation

Implements `docs/17_IMPLEMENTATION_ROADMAP.md` Phase 0 and the kickoff
instruction in `docs/20_PHASE0_EXECUTION_RESEARCH_PROMPT.md`. Read those
two documents (plus `docs/00_DOCUMENT_MAP.md` through
`03_CLAUDE_CODE_RULES.md`) before changing anything in this folder.

## What this environment could and could not do

This scaffolding was produced in an ephemeral Linux container with no
physical iPhone/Android device, no Xcode/macOS, no Android SDK, and an
organization network policy that blocks `dl.google.com` (confirmed via
`curl`/Gradle — see `android/README.md`). Concretely:

- **iOS**: could not be compiled or run at all (Swift/ARKit require
  Xcode on macOS). Source files are written to standard, stable
  AVFoundation/ARKit/CoreMotion APIs and organized so they drop into a
  fresh Xcode project in minutes — see `ios/SETUP.md`.
- **Android**: `gradle`/JDK 21 are available here, so the Gradle DSL
  files were sanity-checked by actually invoking Gradle — but a real
  sync needs Google's Maven repo (`dl.google.com`) for the Android
  Gradle Plugin, which this environment's egress policy blocks (403).
  The Gradle wrapper itself (`gradlew`) was still generated and
  verified in isolation. First real sync happens in Android Studio on
  your machine — see `android/SETUP.md`.

Neither app has been run on real hardware yet. That is the next thing
*you* do, not something this pass could simulate — Phase 0's whole
point is real-device evidence (`docs/20_PHASE0_EXECUTION_RESEARCH_PROMPT.md`
section 15).

## Structure

```
phase0/
├── shared/                      # platform-agnostic contracts, English-language technical docs
│   ├── CAPABILITY_MATRIX.md
│   ├── capability-matrix.schema.json
│   ├── BENCHMARK_PROTOCOL.md
│   └── benchmark-results-template.csv
├── ios/                         # Swift sources + setup guide (no .xcodeproj — see ios/SETUP.md for why)
│   ├── SETUP.md
│   ├── Info-Additions.md
│   └── BoxOpPhase0/*.swift
└── android/                     # real Gradle/Kotlin/Compose project, opens directly in Android Studio
    ├── SETUP.md
    ├── settings.gradle.kts, build.gradle.kts, gradlew, ...
    └── app/src/main/java/com/boxop/phase0/*.kt
```

## Current slice: capability detection only

Both harnesses currently ship **one screen**: a live capability matrix
(camera, AR/world tracking, plane detection, accelerometer, gyroscope,
fused device motion, depth API, LiDAR mesh / discrete ToF), matching the
contract in `shared/CAPABILITY_MATRIX.md`, with tester notes and a
JSON export via the OS share sheet.

This was scoped deliberately narrow rather than also including the AR
point-to-point measurement screen in the same pass, for two reasons:

1. `docs/03_CLAUDE_CODE_RULES.md` rule 2 ("one roadmap phase/task at a
   time") applies recursively inside Phase 0 too — capability detection
   and AR measurement are separable, independently useful slices.
2. AR node placement/hit-testing code is the highest-risk part of this
   spike and could not be compiled or run here at all (see above). It is
   safer to land it in a follow-up pass once you've confirmed the
   capability-detection slice actually builds and runs on your Mac and
   Android Studio — that first real build will surface any small API
   drift immediately, which is much cheaper to fix than debugging a
   larger uncompiled AR screen blind.

## Next task (queued, not started)

**AR point-to-point measurement screen** for both platforms: tap two
points, raycast onto the AR world mesh/plane, report the 3D distance
between them as one edge length (per `docs/04_SMART_MEASURE.md`
"Point-to-Point" mode). `shared/BENCHMARK_PROTOCOL.md` is already written
against this exact method so benchmarking can start the moment it lands.

## How to run Phase 0 end to end

1. Build and run `ios/` on your iPhone — `ios/SETUP.md`.
2. Build and run `android/` on your Android phone — `android/SETUP.md`.
3. Export and collect both capability-matrix JSON files.
4. Once the measurement screen lands (next task), follow
   `shared/BENCHMARK_PROTOCOL.md` on both devices and fill in
   `shared/benchmark-results-template.csv`.
5. Bring both capability matrices and the benchmark CSV back — the
   architecture decision in `docs/20_PHASE0_EXECUTION_RESEARCH_PROMPT.md`
   section 6 (native vs. shared cross-platform layer) is made from that
   evidence, not before.

## Completion report (per `docs/03_CLAUDE_CODE_RULES.md`)

**Files changed**: see the commit this file ships in.

**Implementation summary**: copied the canonical `/docs` package into the
repo (added as doc 20, referenced from `00_DOCUMENT_MAP.md`); designed the
shared capability-matrix/benchmark contracts; built the iOS and Android
capability-detection harnesses described above.

**Tests/results**: no automated tests (nothing here is domain/measurement
logic yet, so `docs/03_CLAUDE_CODE_RULES.md` rule 14 doesn't apply).
Android Gradle DSL exercised directly with local Gradle 8.14.3/JDK 21;
failed only at the plugin-resolution network hop (`dl.google.com`
blocked by this environment's egress policy, confirmed via the proxy
status endpoint — not a DSL error). iOS not compiled anywhere in this
environment (no macOS/Xcode available).

**Limitations**: neither harness has run on real hardware; the AGP/
Kotlin/Compose/ARCore dependency versions are pinned to versions
believed current and stable as of this writing but were not resolved
against Google's Maven repo here — Android Studio's first sync on your
machine is the real check, and its Upgrade Assistant is safe to accept
if it suggests newer versions.

**Next recommended task**: build the AR point-to-point measurement
screen for both platforms (see above), after you've confirmed both
capability-detection harnesses build and run on your own hardware.
