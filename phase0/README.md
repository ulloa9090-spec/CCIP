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

Neither app had been run on real hardware from inside this environment —
that was always the next thing *you* do, not something this pass could
simulate. **Update**: iOS capability detection has since been run on a
real iPhone (see "Current status" below) — that step is done. Android
still has not.

## Structure

```
phase0/
├── shared/                      # platform-agnostic contracts, English-language technical docs
│   ├── CAPABILITY_MATRIX.md
│   ├── capability-matrix.schema.json
│   ├── BENCHMARK_PROTOCOL.md
│   └── benchmark-results-template.csv
├── evidence/                    # real-device evidence artifacts — never overwrite, add dated/tagged files
│   └── ios/
│       ├── RESULT.md            # iOS capability spike: PASS (iPhone18,2, iOS 26.6.1, Tier C/LiDAR)
│       └── boxop-capability-matrix-1788806343.json
├── ios/                         # Swift sources + setup guide (no .xcodeproj — see ios/SETUP.md for why)
│   ├── SETUP.md
│   ├── Info-Additions.md
│   └── BoxOpPhase0/*.swift
└── android/                     # real Gradle/Kotlin/Compose project, opens directly in Android Studio
    ├── SETUP.md
    ├── settings.gradle.kts, build.gradle.kts, gradlew, ...
    └── app/src/main/java/com/boxop/phase0/*.kt
```

## Current status

| Platform | Capability detection | AR point-to-point measurement |
|---|---|---|
| iOS | **PASS on real hardware** — `evidence/ios/RESULT.md` (`iPhone18,2`, iOS 26.6.1, Tier C/LiDAR) | **Ran on real hardware** — `evidence/ios/POINT_TO_POINT_BENCHMARK.md` (+5 to +7mm bias, preliminary, not calibrated — see `shared/BENCHMARK_PROTOCOL.md` section 8). Now being generalized from fixed two points to an unlimited-point polyline. |
| Android | Implemented, **not yet run on real hardware** | Not started |

iOS ships two tabs now: **Capabilities** (validated) and **Measure**
(point-to-point validated with a real accuracy baseline, currently being
upgraded to continuous multi-point measurement). Android still ships
capability detection only.

This was built up one slice at a time rather than all at once, per
`docs/03_CLAUDE_CODE_RULES.md` rule 2 ("one roadmap phase/task at a time")
— capability detection landed and was confirmed working on real iOS
hardware before the higher-risk AR point-to-point code was added on top
of it, so any regression is easy to isolate.

## Next task

**Run the iOS Measure tab's new multi-point mode on the real iPhone.**
It replaced the fixed two-point version that already passed its own
benchmark (`evidence/ios/POINT_TO_POINT_BENCHMARK.md`) — confirm the
generalized polyline version still measures a single segment correctly
(it should, structurally), then measure a real multi-segment path (e.g.
along the edges of a table) and sanity-check the total against a tape
measure. Do **not** treat the existing +5 to +7mm bias as something to
fix yet — `shared/BENCHMARK_PROTOCOL.md` section 8 governs that.

In parallel or after: **run `android/` on a real Android phone** for its
own capability-detection evidence (same bar as `evidence/ios/RESULT.md`),
then bring AR measurement to Android (`ArSceneView`/ARCore raycast — see
`docs/23_AR_PLATFORM_INTEGRATION_ADDENDUM.md` for the adapter boundary
that still applies regardless of the eventual framework choice).

Deliberately still not started (per the exact restriction lists given
for both the original spike and this multi-point increment, which apply
equally to Android and to any further iOS work until calibration work
begins): Close Shape, perimeter, polygon area, rectangle detection,
automatic box/cuboid measurement, L/W/H/volume, edge detection, object
recognition, the Bin/Spot system, an external station, Bluetooth, full
report export, backend, sync, AI.

## How to run Phase 0 end to end

1. ~~Build and run `ios/`'s Capabilities tab on your iPhone~~ — **done**,
   see `evidence/ios/RESULT.md`.
2. Build and run `ios/`'s Measure tab on the same iPhone — `ios/SETUP.md`
   section 6. Compare its output against a tape measure.
3. Build and run `android/` on your Android phone — `android/SETUP.md`.
   Export its capability matrix into `evidence/android/` (create that
   folder; follow the `evidence/ios/` naming pattern).
4. Follow `shared/BENCHMARK_PROTOCOL.md` on both devices once both have a
   working point-to-point measurement, and fill in
   `shared/benchmark-results-template.csv`.
5. Bring both capability matrices and the benchmark CSV back — the
   architecture decision in `docs/20_PHASE0_EXECUTION_RESEARCH_PROMPT.md`
   section 6 (native vs. shared cross-platform layer) is made from that
   evidence, not before.

## Tool registry status

`TOOL_REGISTRY_STATUS.md` in this folder tracks the live
implementation/validation status of every tool defined in
`docs/25_MEASUREMENT_TOOLS_CATALOG.md`. Update it whenever a tool moves
between `SPECIFIED` / `PROTOTYPE` / `IMPLEMENTED` / `VALIDATING` /
`PRODUCTION_READY` / `DISABLED`.

## Open architecture decisions (tracked here, not pre-decided)

- **Cross-platform framework**: native iOS/Android vs. a shared-UI layer
  with native AR adapters. `docs/23_AR_PLATFORM_INTEGRATION_ADDENDUM.md`
  documents Flutter as one candidate for the shared-UI branch, evaluated
  the same way any other candidate would be (see that document's "Bridge
  decision") — it is not selected. Decide from Phase 0 evidence only.

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

**Next recommended task (superseded, see below)**: build the AR
point-to-point measurement screen for both platforms, after you've
confirmed both capability-detection harnesses build and run on your own
hardware.

## Completion report — iOS capability PASS + AR point-to-point spike

**Files changed**: `phase0/evidence/ios/RESULT.md`,
`phase0/evidence/ios/boxop-capability-matrix-1788806343.json`,
`phase0/ios/BoxOpPhase0/ARMeasureView.swift`,
`phase0/ios/BoxOpPhase0/ARMeasureScreen.swift`,
`phase0/ios/BoxOpPhase0/PointToPointMeasurement.swift`,
`phase0/ios/BoxOpPhase0/ContentView.swift` (now a two-tab `TabView`),
`phase0/ios/README.md`, `phase0/ios/SETUP.md`, this file,
`phase0/TOOL_REGISTRY_STATUS.md`.

**Implementation summary**: recorded the user's real-device capability
evidence (iPhone18,2, iOS 26.6.1 — camera, ARKit world tracking, plane
detection, IMU, scene depth and LiDAR mesh all confirmed present) as the
canonical Phase 0 iOS PASS artifact. Built the AR point-to-point
measurement spike on top of the now-validated capability harness: tap a
point (raycast against existing plane geometry, falling back to an
estimated plane), tap a second point, see a line and the 3D Euclidean
distance between them, per the exact 11-step minimal flow and the "do
not build yet" restriction list the user specified. Distance math lives
in a small ARKit/SceneKit-free `PointToPointMeasurement.distance(from:to:)`
function so it's unit-testable once a test target exists, without adding
one now (the user's own project deliberately has `Testing System: None`).

**Tests/results**: no automated tests (see above — no test target in
the project by deliberate choice). Not compiled in this environment
(still no macOS/Xcode here); the code follows standard, stable
ARKit/SceneKit/simd APIs (`ARWorldTrackingConfiguration`, `raycastQuery`,
`session.raycast`, `SCNCylinder`/`SCNSphere`, `simd_quatf` for
gimbal-lock-free line orientation).

**Limitations**: the Measure tab has not run on real hardware yet —
that's the immediate next step, on the same iPhone that already passed
capability detection. Android has neither leg run on real hardware.
Phase 0 as defined in `docs/20_PHASE0_EXECUTION_RESEARCH_PROMPT.md`
section 15 is not complete until both platforms have real-device
evidence for both capability detection and point-to-point measurement.

**Next recommended task (superseded, see below)**: run the iOS Measure
tab on the iPhone, sanity-check it against a tape measure, then start
the Android capability-detection real-device run.

## Completion report — accuracy baseline + continuous multi-point measurement

**Files changed**: `phase0/evidence/ios/POINT_TO_POINT_BENCHMARK.md`,
`phase0/evidence/ios/point-to-point-benchmark-2026-09-07.csv`,
`phase0/shared/BENCHMARK_PROTOCOL.md` (new section 8),
`phase0/ios/BoxOpPhase0/MultiPointMeasurement.swift` (new, replaces
`PointToPointMeasurement.swift`), `phase0/ios/BoxOpPhase0/ARMeasureView.swift`
and `ARMeasureScreen.swift` (rewritten), this file,
`phase0/TOOL_REGISTRY_STATUS.md`, `phase0/ios/README.md`,
`phase0/ios/SETUP.md`.

**Implementation summary**: recorded the user's real tape-measure
benchmark of the two-point spike (10/20/30/40 in; +5 to +7mm bias,
3mm repeatability at 20in) as evidence, and — per explicit
instruction — encoded "no ad-hoc calibration yet" as a binding
constraint in the shared benchmark protocol rather than leaving it as
one-off conversation guidance. Generalized the measurement model from a
fixed two-point pair to an unlimited ordered polyline
(`MultiPointMeasurement.confirmedPoints: [SIMD3<Float>]`, no
`pointA`/`pointB`/`pointC` fields), with a continuous screen-center
reticle raycast (`ARSessionDelegate.session(_:didUpdate:)`, gated to the
`.measuring` state) driving a live tentative point/segment that's
mutated in place each frame for performance, while confirmed
points/segments are rebuilt from the point array whenever it changes.
Three explicit states (`idle` / `measuring` / `finished`) per the given
UI spec, with Add Point / Undo Last Point / Finish / Clear All /
New Measurement wired to `MultiPointMeasurement`'s mutating methods.
Close Shape, perimeter, polygon area, rectangle detection, height/depth
chains and volume are deliberately not implemented, per instruction.

**Tests/results**: no automated tests (no test target, by the project's
own deliberate `Testing System: None` choice). Not compiled in this
environment (still no macOS/Xcode here); the code follows standard,
stable ARKit/SceneKit/simd APIs, structurally similar to the two-point
version that already compiled and ran correctly on the real device.

**Limitations**: the multi-point version has not itself run on real
hardware yet — only its structural predecessor (the fixed two-point
spike) has. The accuracy baseline is preliminary and device/condition-
specific; it does not distinguish the error sources listed in
`shared/BENCHMARK_PROTOCOL.md` section 8 from one another. Android has
neither capability detection nor any AR measurement run on real
hardware. Phase 0 is not complete until both platforms have real-device
evidence for both.

**Next recommended task**: run the new multi-point Measure tab on the
iPhone (`ios/SETUP.md` section 6) and confirm a single-segment
measurement still matches the existing baseline, then measure a real
multi-segment path and sanity-check the total. Start the Android
capability-detection real-device run so that leg isn't the last one
standing.
