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
| iOS | **PASS on real hardware** — `evidence/ios/RESULT.md` (`iPhone18,2`, iOS 26.6.1, Tier C/LiDAR) | Fixed two-point length **ran on real hardware** — `evidence/ios/POINT_TO_POINT_BENCHMARK.md` (+5 to +7mm bias, preliminary, not calibrated — see `shared/BENCHMARK_PROTOCOL.md` section 8). Generalized to unlimited-point polyline + Close Shape (area/perimeter/angles/rectangle) + one-height-point volume — **none of that generalization has run on real hardware yet.** |
| Android | Implemented, **not yet run on real hardware** | Not started |

iOS ships two tabs now: **Capabilities** (validated) and **Measure**
(length validated with a real accuracy baseline; area, rectangle
detection, interior angles and volume added on top, not yet validated;
all results now display in feet/inches, internal units unchanged).
Android still ships capability detection only. The geometry/unit-
conversion math (`PolygonGeometry`, `MultiPointMeasurement`,
`UnitFormatting`) now has deterministic XCTest coverage
(`ios/BoxOpPhase0Tests/`) — see `ios/SETUP.md` section 7 to run it. See
`phase0/TOOL_REGISTRY_STATUS.md` for the exact per-tool status.

This was built up one slice at a time rather than all at once, per
`docs/03_CLAUDE_CODE_RULES.md` rule 2 ("one roadmap phase/task at a time")
— capability detection landed and was confirmed working on real iOS
hardware before the higher-risk AR point-to-point code was added on top
of it, so any regression is easy to isolate.

## Next task

**In-scene per-segment measurement labels in the AR view**, including the
live/active segment updating in real time (not just the bottom result
cards) — the next UX increment, explicitly excluding automatic
rectangle-suggestion for now (stays out of scope per direct instruction).

In parallel: run the new XCTest suites in Xcode (`ios/SETUP.md` section
7) for their first real pass/fail signal, then run the full iOS Measure
flow (length, Close Shape/area/rectangle, height/volume, feet/inches
display) on the real iPhone — none of it beyond the original two-point
spike has real-hardware evidence yet. Also still open: **run `android/`
on a real Android phone** for its own capability-detection evidence
(same bar as `evidence/ios/RESULT.md`), then bring AR measurement to
Android (`ArSceneView`/ARCore raycast — see
`docs/23_AR_PLATFORM_INTEGRATION_ADDENDUM.md` for the adapter boundary
that still applies regardless of the eventual framework choice).

Deliberately still not started: automatic rectangle-suggestion (next
increment explicitly excludes it), dedicated Cuboid/Cylinder tools,
Circle, Wall, curved/smooth geometry, multi-measurement sessions, edge
detection, object recognition, the Bin/Spot system, an external station,
Bluetooth, full report export, backend, sync, AI.

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

**Next recommended task (superseded, see below)**: run the new
multi-point Measure tab on the iPhone and confirm a single-segment
measurement still matches the existing baseline, then measure a real
multi-segment path.

## Completion report — Close Shape, area, rectangle, angle, volume

**Files changed**: `phase0/ios/BoxOpPhase0/PolygonGeometry.swift` (new),
`MultiPointMeasurement.swift`, `ARMeasureView.swift`, `ARMeasureScreen.swift`
(all extended), `phase0/TOOL_REGISTRY_STATUS.md`, `phase0/ios/README.md`,
`phase0/ios/SETUP.md`, this file.

**Implementation summary**: per explicit request, extended the polyline
tool with a "Close Shape" action (connects the last point back to the
first) and, once closed, one extra height-point capture — the design the
user picked over a full 8-vertex box tool, matching Apple Measure's room
-volume pattern. `PolygonGeometry.swift` computes area/normal via
Newell's method (robust to near-planar rather than exactly-planar
points), a planarity-deviation confidence signal surfaced as a warning
rather than hidden, per-vertex interior angles (also live-previewed at
the last point while still placing base points), and a 4-point rectangle
check (side/angle tolerances) that relabels the shape and reports
length×width when it passes. Volume is `area × height`, with a live
preview before the height point is confirmed. `MultiPointMeasurement`'s
`undoLast()` now unwinds height → un-close → last point, in that order.

**Tests/results**: no automated tests (no test target, by deliberate
project choice); the new geometry lives in an ARKit/SceneKit-free file
for when one exists. Not compiled in this environment.

**Limitations**: none of this — Close Shape, area, rectangle detection,
angles, or volume — has run on real hardware. There is no accuracy
baseline for any of it, unlike the validated length measurement. Volume
via a single height point assumes the base shape is a reasonable
prism/cuboid cross-section; a genuinely irregular base times one height
point will produce a number, not a validated volume. This does not
implement the catalog's dedicated Cuboid/Cylinder tools (see
`phase0/TOOL_REGISTRY_STATUS.md` for the precise distinction) — it's a
different, more general path the user chose instead, for now.

**Next recommended task (superseded, see below)**: run the full flow on
the iPhone — multi-point length (reconfirm against the existing
baseline), Close Shape on a known rectangle (e.g. a book or table) and
compare its reported area/length/width against physical measurements,
then a height point against a known volume (e.g. a box). Record results
the same way as `evidence/ios/POINT_TO_POINT_BENCHMARK.md`, and only then
consider whether `shared/BENCHMARK_PROTOCOL.md` needs extending to cover
area/volume metrics explicitly. Also still open: the Android capability-
detection real-device run, which hasn't moved.

## Completion report — feet/inches display

**Files changed**: `phase0/ios/BoxOpPhase0/UnitFormatting.swift` (new),
`ARMeasureScreen.swift` (all primary numeric readouts routed through it),
`phase0/ios/README.md`, this file.

**Implementation summary**: per explicit request, all Measure-tab result
cards (segment/total/perimeter distances, rectangle length×width, height,
the planarity-deviation warning, area, volume) now display in feet and
inches (or ft²/ft³) instead of raw meters, via a new display-only
`UnitFormatting` enum. Internal storage and every computation
(`PolygonGeometry`, `MultiPointMeasurement`) are untouched — still meters,
still `SIMD3<Float>` — per the explicit instruction not to change internal
units, and per `docs/14_LOCALIZATION_LANGUAGE.md`'s existing rule to
convert only at presentation time via typed conversion, never string
manipulation.

**Tests/results**: none yet at the time (no test target existed). Not
compiled in this environment.

**Limitations**: not run on real hardware yet in this display form (the
underlying measurements were already validated in meters; only the
formatting layer is new and unverified against a live device). Also
evaluated, per explicit request, what tooling/dependencies would
materially help the project going forward: recommended adding an
XCTest/Swift Testing target as the only clearly-justified addition (no
existing coverage on the geometry/unit-conversion math);
declined RealityKit-over-SceneKit, third-party AR libraries, and
backend/sync/AI work as unjustified scope expansion; flagged Context7 and
Firecrawl (already configured in `.mcp.json` but unauthenticated in this
session) as tools that would help verify current ARKit/ARCore API
documentation. User granted permission to use both going forward.

**Next recommended task (superseded, see below)**: write the XCTest
suite this evaluation identified as the clear next infrastructure step.

## Completion report — deterministic XCTest suites for geometry/unit math

**Files changed**: `phase0/ios/BoxOpPhase0/UnitFormatting.swift` (added
new, additive `feetAndInchesFraction(meters:)` + private `gcd` helper —
see note below), `phase0/ios/BoxOpPhase0Tests/PolygonGeometryTests.swift`
(new), `MultiPointMeasurementTests.swift` (new), `UnitFormattingTests.swift`
(new), `phase0/ios/SETUP.md` (new section 7: creating the Unit Testing
Bundle target and adding these files in Xcode), `phase0/ios/README.md`,
`phase0/TOOL_REGISTRY_STATUS.md`, this file.

**Implementation summary**: added three deterministic XCTest suites
covering exactly the 15 requested topics — distance between points, sum
of segments, perimeter, triangle area, rectangle area, CW/CCW
orientation, interior angles, correct rectangle detection, rejection of
non-rectangle quadrilaterals (both a false-side-equality irregular quad
and a true-equal-sides-wrong-angles parallelogram, to prove the angle
check matters, not just side lengths), planarity tolerance (an exact,
hand-derived 4-point "saddle" configuration whose Newell normal stays
exactly axis-aligned regardless of its z-offset `d`, giving an exact, not
approximate, expected deviation of `|d|`), height, volume, meters→feet/
inches conversion (including the existing rollover-guard boundary),
rounding to the nearest 1/8", and edge/zero cases (empty/too-few points,
single-point measurements, no-op guards on `addPoint`/`closeShape`/
`setHeightPoint` when preconditions aren't met, `undoLast`'s
height→close→point unwind order, `clear()`). Every expected value was
hand-derived from the actual existing algorithms (Newell's method, the
`angleDegrees`/`rectangleCheck` tolerances, the `feetAndInches` rollover
guard) rather than assumed — no production behavior changed to
accommodate a test. **One explicitly-flagged exception**: 1/8" rounding
did not exist anywhere in production code, so nothing real existed for
that requested test topic to validate; added
`UnitFormatting.feetAndInchesFraction(meters:)` as a new, additive
function (not wired into `ARMeasureScreen.swift`, which keeps using the
unchanged `feetAndInches(meters:)`) specifically so that test case has
real behavior behind it. XCTest was chosen over the newer Swift Testing
framework for maximum Xcode-version compatibility, per the same
compatibility reasoning used elsewhere in this project.

**Tests/results**: the three suites themselves are the deliverable; not
run in this environment (no macOS/Xcode here) — every expected value was
manually re-derived and cross-checked against the source algorithm by
hand rather than assumed, but Xcode's compiler and test runner on your
Mac (`Cmd+U`, per `SETUP.md` section 7) is the first place these actually
execute.

**Limitations**: Context7 and Firecrawl were granted permission for this
task but remained unauthenticated in this session (OAuth needs an
interactive `claude mcp`/`/mcp` flow this remote session can't run), so
this suite was written from existing XCTest/ARKit/simd knowledge rather
than freshly-fetched docs. These tests cover only the pure math layer —
`ARMeasureView.swift`/`ARMeasureScreen.swift` (SwiftUI/ARKit glue) and
real-device behavior are still untested by anything but the manual
benchmark protocol.

**Next recommended task (superseded, see below)**: in-scene per-segment
measurement labels in the AR view, including the live/active segment
updating in real time — explicitly excluding automatic
rectangle-suggestion, per direct instruction. Also still open: running
these tests in Xcode for the first real pass/fail signal, and the
Android capability-detection real-device run, which hasn't moved.

## Completion report — in-scene per-segment measurement labels

**Files changed**: `phase0/ios/BoxOpPhase0/ARMeasureView.swift` (extended),
`phase0/ios/README.md`, `phase0/ios/SETUP.md`, this file.

**Implementation summary**: per explicit request, every segment now
carries its own always-camera-facing text label directly in the AR scene
(via `SCNText` + `SCNBillboardConstraint`), showing that segment's length
in feet/inches (`UnitFormatting.feetAndInches`) — not just in the bottom
result cards. This covers every confirmed base segment, the closing
segment once the shape is closed, the height segment once a height point
is set, and the live/active segment, which updates its label in place
every AR frame as the reticle moves (mirroring the existing
mutate-in-place pattern used for the live line/marker, rather than
recreating the label node each frame). Labels are rebuilt alongside the
rest of the confirmed geometry in `syncConfirmedNodes()` and anchored to
each segment's midpoint via a re-centered pivot (so the text doesn't
trail off to one side of the point it's labeling). Per explicit
instruction, automatic rectangle-suggestion was **not** implemented as
part of this — that stays a distinct, not-yet-started increment.

**Tests/results**: not covered by the new XCTest suites (they exercise
only the ARKit/SceneKit-free math layer, per design); not compiled or run
in this environment. Follows standard, documented `SCNText`/
`SCNBillboardConstraint` APIs.

**Limitations**: not run on real hardware yet. Label legibility/placement
(font size, the fixed vertical offset, overlap when segments are short or
close together) has not been checked against a live device and may need
tuning once it is. Labels are plain, unlit, camera-facing text — no
background plate/contrast treatment yet, which could hurt legibility
against a busy real-world background; a good candidate for the first
real-device pass to flag.

**Next recommended task**: run this on the iPhone and check label
legibility/placement at a few distances and angles; if needed, revisit
before adding automatic rectangle-suggestion (still explicitly deferred)
or any other new Measure-tab feature. Also still open: running the
XCTest suites in Xcode for their first pass/fail signal, and the Android
capability-detection real-device run, which hasn't moved.

**Addendum (Context7 + Firecrawl verification pass)**: with the user's
permission, checked the implementation above against current Apple
docs and community reports. Confirmed correct and unchanged:
`ARSCNView.raycastQuery(from:allowing:alignment:)` takes view-space
(pixel) coordinates, not normalized 0-1, matching existing code;
`SCNText`/`SCNBillboardConstraint`/`SCNNode.pivot` usage matches current
API signatures. Two real, documented risks surfaced and written into
`ios/SETUP.md`'s troubleshooting section rather than silently
"fixed": (1) a known SceneKit gotcha where a billboard-constrained
`SCNText` node can render invisible from certain angles due to
single-sided materials -- this code already sets `isDoubleSided = true`,
which addresses the documented cause, but it hasn't been confirmed
against real hardware, so it's flagged as mitigated-not-verified; (2) a
documented real-world report that `SCNText` is expensive to render at
scale (many labels/long text) -- not yet stress-tested here, and not
pre-optimized without device evidence it's actually a problem. No code
changed as a result of this pass; `TOOL_REGISTRY_STATUS.md` unaffected.

## Completion report — first successful test run (Cmd+U) + 4 real bugs fixed

**Files changed**: `phase0/ios/BoxOpPhase0Tests/MultiPointMeasurementTests.swift`
(3 fixes), `phase0/ios/BoxOpPhase0Tests/PolygonGeometryTests.swift`
(1 fix), `phase0/TOOL_REGISTRY_STATUS.md`, this file.

**Implementation summary**: the user built the `BoxOpPhase0Tests` Unit
Testing Bundle target in Xcode per `SETUP.md` section 7 and ran `Cmd+U`
for the first time. This surfaced 4 real Swift compiler errors that
were invisible without an actual build: `Float?` values
(`measurement.area`, `.height`, `.volume`, `.perimeter`, and
`PolygonGeometry.RectangleCheck?.length`/`.width` via optional
chaining) passed directly, or via `?? default`, into
`XCTAssertEqual(_:_:accuracy:)` -- Swift's type checker cannot reliably
resolve this pattern across XCTest's many `XCTAssertEqual` overloads.
Fixed all 4 by unwrapping with `try XCTUnwrap(...)` before the
assertion instead. These were bugs in the test code only --
`PolygonGeometry.swift` and `MultiPointMeasurement.swift` were never
touched. A separate, unrelated setup issue also surfaced and was
resolved along the way: `UnitFormatting.swift` had never been added to
the user's Xcode project (only existed in the repo), which is why
`UnitFormattingTests.swift` initially reported "Cannot find
'UnitFormatting' in scope" for every single test -- adding the file to
the `BoxOpPhase0` target (not the test target) resolved it.

**Tests/results**: **all three suites now pass on real Xcode (`Cmd+U`),
confirmed by the user** -- `PolygonGeometryTests`,
`MultiPointMeasurementTests`, `UnitFormattingTests` all green. This is
the first real compiler/runtime confirmation that
`PolygonGeometry`/`MultiPointMeasurement`/`UnitFormatting` behave
exactly as hand-derived, not just "should" per manual review.

**Limitations**: this validates the pure math layer only, on the
Simulator (no AR/camera involved) -- it says nothing new about
real-device AR tracking accuracy, which is still governed by
`evidence/ios/POINT_TO_POINT_BENCHMARK.md` and the open rectangle-
tolerance question in `TOOL_REGISTRY_STATUS.md`.

**Next recommended task (superseded, see below)**: run the full
Measure-tab flow on the real iPhone (in-scene labels, Close Shape on a
known rectangle, height/volume, and whether a genuinely rectangular
object gets correctly detected given the 6° angle tolerance flagged
earlier). Also still open: the Android capability-detection real-device
run.

## Completion report — real-hardware confirmation: multi-point polyline, feet/inches, in-scene labels

**Files changed**: `phase0/ios/README.md`, `phase0/TOOL_REGISTRY_STATUS.md`,
this file. No source changed — this is a real-device evidence entry.

**Implementation summary**: the user ran the Measure tab on their
iPhone (`iPhone18,2`) and placed a 6-point open polyline around a real
object (a laptop, per the screenshots). Along the way, two stale files
in the user's local Xcode project (`ARMeasureView.swift`,
`ARMeasureScreen.swift` — predating this session's feet/inches and
in-scene-label work) had to be identified and updated (via `git pull`
+ manual file copy/replace) before the new behavior actually appeared;
this mirrors the earlier `UnitFormatting.swift`-missing issue and is
now a known recurring friction point worth calling out explicitly:
**this repo does not maintain the user's Xcode project file list
automatically** — every session that touches `BoxOpPhase0/*.swift`
needs the user to re-sync changed/new files into their own project, and
"it builds" is not proof every file is current, only that whatever
Xcode already has compiles.

**Tests/results**: **first real-hardware confirmation** that (1) the
generalized multi-point polyline (beyond the original fixed two-point
spike) measures correctly across multiple segments and a live/active
segment; (2) `UnitFormatting.feetAndInches` displays correctly in both
per-segment in-scene labels and the bottom result cards on a real
device, not just in unit tests; (3) the in-scene `SCNText` +
`SCNBillboardConstraint` labels render correctly, positioned and
legible, on real hardware — the two risks flagged in the earlier
Context7/Firecrawl verification pass (invisible-from-some-angles,
render cost) did not manifest in this run, though it was a short,
single-session test, not a stress test.

**Limitations**: only an open polyline was tested — Close Shape, area,
perimeter, interior angles, rectangle detection (including the
flagged-as-possibly-too-strict 6° tolerance), and height/volume are
still **unconfirmed on real hardware**. Label legibility over a busy
background (the laptop keyboard) looked fine in the screenshots, but
that's one lighting condition, not a systematic check.

**Next recommended task**: same device, same session if possible — run
Close Shape on the laptop's screen bezel or a book (a known rectangle),
check whether it's correctly labeled "Rectangle" given the current
tolerances, compare reported length/width/area against a physical
measurement, then add a height point for a volume check. Also still
open: the Android capability-detection real-device run.
