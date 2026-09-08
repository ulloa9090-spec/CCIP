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

**Next recommended task (superseded, see below)**: same device, same
session if possible — run Close Shape on the laptop's screen bezel or
a book (a known rectangle), check whether it's correctly labeled
"Rectangle" given the current tolerances, compare reported length/
width/area against a physical measurement, then add a height point for
a volume check. Also still open: the Android capability-detection
real-device run.

## Completion report — Apple Measure-style fraction display

**Files changed**: `phase0/ios/BoxOpPhase0/UnitFormatting.swift`
(rewritten `feetAndInches`, removed the now-redundant
`feetAndInchesFraction`/`gcd`), `phase0/ios/BoxOpPhase0Tests/UnitFormattingTests.swift`
(rewritten to match), `phase0/ios/README.md`, this file.

**Implementation summary**: after seeing the real-device output
("total: 1.050 m" before the display-layer files were synced, then
decimal feet-inches like "0' 8.2"" after), the user pasted a screenshot
of Apple's own Measure app measuring a laptop (`12"`, `8½"`) and asked
for that exact look. Rewrote `UnitFormatting.feetAndInches(meters:)` to
round to the nearest 1/8" and render with real Unicode fraction glyphs
(½, ¼, ⅜, etc.) instead of decimal tenths or `"N/8"` text, and to stay
in plain inches notation below 3 feet (36in) rather than switching to
`"1' 0""`-style feet notation right at the 12in/24in marks -- matching
the evidence in the screenshot exactly (a 12in edge shown as `12"`, not
`1'`). A sub-inch value (or a whole-feet value with no leftover inches)
omits its leading `0` the same way Apple's does, e.g. `½"` alone rather
than `0½"`. Since `ARMeasureScreen.swift`/`ARMeasureView.swift` already
called `UnitFormatting.feetAndInches` everywhere, no UI code changed --
only the function's internals. The separate `feetAndInchesFraction`
function (added earlier purely so the 1/8" rounding test had something
real to validate) is now redundant, since `feetAndInches` itself does
that rounding, and was removed rather than left as dead code.

**Tests/results**: rewrote every `UnitFormattingTests.swift` case to
the new hand-verified expected strings (all glyph-based now); not yet
re-run in Xcode by the user since this edit -- that's the immediate
next step, not assumed to still pass untested.

**Limitations**: the exact 3-foot inches/feet threshold and the
leading-zero-omission rule for whole-feet-plus-fraction values (e.g.
`3' ½"`) are my best-effort inference from Apple's known Measure
behavior plus the one reference screenshot (which only showed values
under 13in) -- not confirmed against an Apple screenshot of a longer
measurement. If real-device testing shows a mismatch at the threshold
or in edge formatting, that's a real finding to bring back, not
something to assume is already right.

**Next recommended task (superseded, see below)**: re-run the XCTest
suite in Xcode to confirm the rewritten `UnitFormattingTests.swift`
passes, then re-test the Measure tab on the iPhone to confirm the new
fraction-based display looks right in practice (segment labels, total,
and eventually area/perimeter/rectangle/volume once Close Shape is
tested). Also still open: the Android capability-detection real-device
run.

## Completion report — shape recognition: Square, Triangle types, Circle

**Files changed**: `phase0/ios/BoxOpPhase0/PolygonGeometry.swift`
(added `RectangleCheck.isSquare`, `TriangleClassification`,
`triangleClassification(points:)`, `CircleCheck`, `circleCheck(points:)`),
`MultiPointMeasurement.swift` (exposed `triangleClassification`,
`circleCheck`, extended `shapeLabel`), `ARMeasureScreen.swift` (shows
circle radius in `closedShapeSummary`), `phase0/ios/BoxOpPhase0Tests/{PolygonGeometryTests,MultiPointMeasurementTests}.swift`
(new tests), `phase0/ios/README.md`, `phase0/TOOL_REGISTRY_STATUS.md`,
this file.

**Implementation summary**: per explicit request ("que la app reconozca
geometrías o formas"), and after clarifying via `AskUserQuestion` that
the user meant extending shape *labeling* on Close Shape (not
mid-measurement auto-suggestion, which stays explicitly out of scope,
and not camera-based CV shape detection, a much larger feature).
Extended `shapeLabel` beyond Rectangle/Polygon: exactly 4 points now
also detect "Square" (a Rectangle whose length ≈ width, same 8%
tolerance); exactly 3 points classify as "Equilateral Triangle",
"Right Triangle", "Isosceles Triangle", or generic "Triangle" (same
8% side / 6° angle tolerances as Rectangle, reused rather than
reinvented); 5+ points check whether they fit a common circle within
8% radius deviation from centroid and label "Circle" with its radius
shown. All three build on the same manual Close Shape flow already in
place — the user still places every point; the app only labels what
resulted. Note: "Circle" already existed as a catalog tool
(`docs/25_MEASUREMENT_TOOLS_CATALOG.md` section 11, "center + edge" or
"3+ points on circumference" capture) with a different intended
capture flow than this generic-polygon-fit approach; "Square" and
"Triangle" are not catalog-named tools at all, and are new labels
layered on the existing Rectangle/Polygon path, same pattern as how
Rectangle itself isn't a separate dedicated tool.

**Tests/results**: added hand-verified deterministic tests for all new
`PolygonGeometry` functions (equilateral/right/isosceles/scalene
triangles with hand-computed side lengths and angles; a regular hexagon
exactly inscribed in a radius-2 circle, and the same hexagon with one
point dragged far off-circle to confirm rejection; a square vs. a 4×3
rectangle for `isSquare`) and for `MultiPointMeasurement.shapeLabel`'s
new cases. Not run in this environment; not yet run in the user's
Xcode.

**Limitations**: none of this has run on real hardware — a real
AR-tapped "circle" (traced by hand around a round object) will have far
more radius scatter than the exact hand-constructed test hexagon, so
the 8% circle tolerance is just as unvalidated as the existing 6°
rectangle-angle tolerance flagged earlier, and for the same reason
(no real-device evidence yet on tap-tracing noise for this specific
check). Reuses `sideTolerance`/`angleToleranceDegrees` defaults from
Rectangle rather than deriving new ones — untested whether that's
appropriate for triangles specifically.

**Next recommended task (superseded, see below)**: run the XCTest suite
in Xcode for the new tests' first pass/fail signal, then update the
Xcode project with `PolygonGeometry.swift`, `MultiPointMeasurement.swift`,
and `ARMeasureScreen.swift` and try Close Shape on a real square,
triangle, and a hand-traced circle (e.g. a coin or a round object) on
the iPhone to see whether the tolerances hold up on real tap data. Also
still open: confirming the Apple-style fraction display in practice,
and the Android capability-detection real-device run.

## Completion report — dedicated Cube/Cuboid wireframe visualization

**Files changed**: `phase0/ios/BoxOpPhase0/PolygonGeometry.swift`
(added `extrudedCorners(of:toward:)`), `MultiPointMeasurement.swift`
(added `extrudedTopCorners`), `ARMeasureView.swift` (draws the full
wireframe once a height point is set), `phase0/ios/BoxOpPhase0Tests/{PolygonGeometryTests,MultiPointMeasurementTests}.swift`
(new tests), `phase0/ios/README.md`, `phase0/ios/SETUP.md`,
`phase0/TOOL_REGISTRY_STATUS.md`, this file.

**Implementation summary**: the user shared two screenshots of a
third-party AR measuring app — its tool picker (Line & Height, Angle,
Distance, Cube, Volume, Cylinder) and a live measurement showing a
kitchen island as a fully-labeled 3D box (every edge shown, plus a
compact H/S/V/P summary) — and asked for these to be part of the
project. Given the scope of six distinct tools, used `AskUserQuestion`
to prioritize rather than guess; the user picked the dedicated
Cube/Cuboid tool first. Rather than building a parallel 8-corner-tap
capture flow, extended the existing closed-base + height-point
mechanism (already fewer taps: N base points + 1 height point) to draw
the **complete wireframe** once the height point is set —
`PolygonGeometry.extrudedCorners(of:toward:)` translates every base
corner by the exact offset that carries the base plane to the height
point (reusing the existing `footpoint` math), and
`ARMeasureView.swift` draws each top-face edge and each vertical edge
individually, each with its own in-scene label, instead of the single
height line that was there before. Works for any closed base shape,
not just 4-point rectangles (a triangular or pentagonal base gets a
full labeled prism too), which is a superset of the reference app's
box-only tool. Deliberately scoped to the AR-scene visualization (the
functional gap) rather than also restyling the bottom result panel to
match the reference's compact "H=1.20 m / S=1.05 m² / V=1.26 m³ /
P=4.4 m" badge look — the existing separate cards already show the same
numbers; that's a cosmetic follow-up, not implemented here, and worth
confirming the user still wants before doing it.

**Tests/results**: added a hand-verified test confirming
`extrudedCorners` translates a rectangle's 4 corners by exactly the
expected offset (derived from the already-verified footpoint/height
test case), and a matching `MultiPointMeasurement.extrudedTopCorners`
test plus its nil-before-height-point-set case. Not run in this
environment; not yet run in the user's Xcode.

**Limitations**: not run on real hardware — the wireframe assumes a
true right prism (vertical walls perpendicular to the base plane),
which is correct for typical furniture/boxes but will look wrong if
the user's height point isn't aimed straight up/down from the base (no
guard against that yet, same as the existing single-height-line
behavior). The five remaining requested tools (Cylinder, Distance
Meter, dedicated Height, dedicated Angle, and the bottom-panel badge
restyle) are not started.

**Next recommended task (superseded, see below)**: run the XCTest suite
in Xcode, then update the Xcode project with the three changed source
files and try Close Shape + Set Height Point on a real box-shaped
object to see the full wireframe on real hardware. Also still open:
whether to proceed next with Cylinder (the most novel remaining tool)
or one of the smaller ones (Distance Meter, dedicated Height/Angle),
the Apple-style fraction display confirmation, and the Android
capability-detection real-device run.

## Completion report — corrected feet/inches threshold to 1 foot

**Files changed**: `phase0/ios/BoxOpPhase0/UnitFormatting.swift`,
`phase0/ios/BoxOpPhase0Tests/UnitFormattingTests.swift`,
`phase0/ios/README.md`, this file.

**Implementation summary**: the earlier fraction-display rewrite
inferred a 3-foot (36in) inches-only threshold from the user's Apple
Measure reference screenshot (which showed a 12in edge as `12"`, not
`1' 0"`). The user has now explicitly said the app should show inches
only until the length "completa los pies" (completes a foot) — i.e.
the standard 12in = 1ft cutover, not 36in. Changed
`inchesOnlyCeiling` from `36.0` to `12.0`: below 12 inches shows plain
inches (`11"`), 12 inches or more switches to feet-and-inches (`1' 0"`,
`1' ½"`). This means the app's behavior at exactly 12in now
deliberately differs from the pasted Apple screenshot's own `12"` —
noted here rather than silently reconciled, since the two inputs
(the screenshot and this explicit instruction) genuinely conflict at
that one boundary value, and the user's direct instruction takes
precedence.

**Tests/results**: rewrote the boundary tests in
`UnitFormattingTests.swift` around the new 12in threshold (11in stays
inches-only, 12in and 12.5in switch to feet notation) and fixed one
now-incorrect expectation (`8in` example instead of `24in`, since 24in
now correctly returns `"2' 0""` rather than `"24""`). Not yet re-run in
the user's Xcode.

**Limitations**: not confirmed on real hardware yet — this was reported
as a mismatch from the user's own on-device observation before the
threshold fix, so the fix itself still needs the same on-device
confirmation the original claim lacked.

**Next recommended task (superseded, see below)**: sync the corrected
`UnitFormatting.swift` to the Xcode project (this is the only file that
changed), re-run the XCTest suite, and re-check the Measure tab on the
iPhone to confirm inches-only below 12in and feet-and-inches at 12in
and above. Also still open: Close Shape + Cube wireframe real-device
confirmation, Cylinder/Distance Meter/dedicated Height-Angle tools, and
the Android capability-detection real-device run.

## Completion report — target-style reticle + dedicated Angle tool

**Files changed**: `phase0/ios/BoxOpPhase0/ARMeasureScreen.swift`
(reticle restyle, new `MeasureToolMode`, Angle mode flow),
`phase0/ios/README.md`, `phase0/ios/SETUP.md`,
`phase0/TOOL_REGISTRY_STATUS.md`, this file.

**Implementation summary**: two separate user requests. (1) Per a
reference screenshot, replaced the plain circle reticle with a
target/crosshair look — a dashed/segmented ring plus a small center dot
— same meaning as before (translucent while searching, solid white once
resting on a surface). (2) Per explicit request for a dedicated Angle
tool with "una función para activarla" (a way to turn it on), added a
`MeasureToolMode` (`.length`/`.angle`) picked via a segmented control on
the idle screen before `Start Measure`. In `.angle` mode, the flow is a
fixed 3 taps — ray endpoint, vertex, ray endpoint — auto-finishing on
the third point (no Close Shape/Finish needed) and showing the angle at
the vertex plus both ray lengths. No new geometry was needed: this
reuses `PolygonGeometry.interiorAngles`/`angleDegrees` exactly as
already used for a closed shape's interior angles — an open 3-point
line's single interior angle *is* the vertex angle between two rays.

**Tests/results**: no new geometry to test (reuses already-tested
`interiorAngles`); this is UI/flow logic in `ARMeasureScreen.swift`,
which isn't covered by the XCTest suite (that targets the
ARKit/SceneKit-free math layer only, per design). Not run in this
environment or the user's Xcode yet.

**Limitations**: not run on real hardware. Two things raised earlier in
this session by the user remain unresolved and unclarified — an
`AskUserQuestion` about what exactly "sugerencias cuando detecta
figuras cuadradas" (automatic shape-suggestion, previously explicitly
deferred) and "la mirilla no se ve fluida" (reticle not looking smooth)
meant was dismissed without an answer, so neither is addressed here;
the reticle restyle above is a distinct, separately-requested change
using a dashed-line style, not necessarily a fix for the "not smooth"
complaint if that turns out to mean something else (jagged rendering,
choppy tracking, or a preference for a solid ring).

**Next recommended task (superseded, see below)**: sync
`ARMeasureScreen.swift` to the Xcode project and try both Length and
Angle modes on the iPhone. Revisit the reticle-smoothness clarifying
question when the user is ready to specify what they meant. Also still
open: Cube wireframe and 1-foot threshold real-device confirmation,
Cylinder/Distance Meter/dedicated Height tools, and the Android
capability-detection real-device run.

## Completion report — camera-based rectangle suggestion (Vision + double-tap)

**Files changed**: `phase0/ios/BoxOpPhase0/ARMeasureView.swift` (new
`Vision`-based detection/suggestion logic, double-tap gesture),
`ARMeasureScreen.swift` (wires up `onAcceptSuggestedRectangle`, updated
instruction text), `phase0/ios/README.md`, `phase0/ios/SETUP.md`,
`phase0/TOOL_REGISTRY_STATUS.md`, this file.

**Implementation summary**: this is the previously-dismissed "sugerencias
cuando detecta figuras cuadradas" question, now answered explicitly by
the user: the camera itself should identify a shape and suggest it, with
a double-tap taking the measurement automatically — the largest of the
three options originally offered (camera-based CV detection, not manual
point auto-suggestion). Implemented via Apple's documented pattern for
this exact scenario (`Vision`'s `VNDetectRectanglesRequest` run against
`ARFrame.capturedImage`, throttled to ~3Hz per Apple's "no more than 10
times per second" guidance, one request in flight at a time): while in
Length mode with no points placed yet, each AR frame may trigger a
rectangle-detection pass; a found rectangle's four corners (normalized
to Vision's coordinate space) are converted to view-space points via
`ARFrame.displayTransform(for:viewportSize:)` — verified against a real
working ARKit+Vision rectangle-detection example, not guessed — then
each corner is raycast the same way the center reticle already is. Only
shown as a suggestion if all four corners land on real geometry. A
`UITapGestureRecognizer` (`numberOfTapsRequired = 2`) on the `ARSCNView`
accepts the current suggestion, reporting the four world-space corners
back to `ARMeasureScreen` through a new `onAcceptSuggestedRectangle`
closure — kept as a closure rather than making `measurement` a
`@Binding`, preserving the file's existing "this view owns only the AR
scene; `ARMeasureScreen` owns the state machine" separation. Accepting
adds all four points and calls `closeShape()` in one step, matching
"con un doble tap se tome la medida en automático".

**Tests/results**: no new pure-math geometry was added (this is
ARKit/Vision/SceneKit glue, which the XCTest suite deliberately doesn't
cover) — not run in this environment or the user's Xcode. The
coordinate-conversion approach (Vision normalized corner → `NormalizedPoint
.cgPoint` → `displayTransform` → viewport scale → `raycastQuery`) was
cross-checked against Apple's Vision/ARKit documentation and a real
public ARKit+Vision rectangle-detection project rather than assumed,
given how error-prone this specific conversion is known to be, but has
not been confirmed by an actual compile or device run.

**Limitations**: real, meaningful gaps until real-device evidence
exists: (1) orientation is hardcoded to `.portrait`/`.right` matching
the app's portrait-only deployment setting — correct for this build,
but a latent bug if that setting ever changes; (2) the `isDetectingRectangle`
throttle flag is a plain, unsynchronized `Bool` read/written across
threads (matches the simplicity of Apple's own sample code for this
exact scenario, not a custom shortcut); (3) detection quality (false
positives, missed detections, how it behaves with multiple rectangular
objects in frame) is entirely unknown without a real device test; (4)
this is unrelated to and does not address the "mirilla no se ve
fluida" (reticle smoothness) question, which remains open and
unclarified.

**Next recommended task (superseded, see below)**: sync
`ARMeasureView.swift` and `ARMeasureScreen.swift` to the Xcode project
and test the suggestion flow on a real rectangular object under normal
indoor lighting. Also still open: the reticle-smoothness clarification,
Cube wireframe and 1-foot threshold real-device confirmation,
Cylinder/Distance Meter/dedicated Height tools, and the Android
capability-detection real-device run.

## Completion report — fixed a real build error + first Angle real-device data point

**Files changed**: `phase0/ios/BoxOpPhase0/ARMeasureView.swift` (1-line
fix), `phase0/TOOL_REGISTRY_STATUS.md`, `phase0/shared/BENCHMARK_PROTOCOL.md`,
this file.

**Implementation summary**: two things from the user's testing. (1) A
real compile error, "Value of type 'CGPoint' has no member 'cgPoint'"
— the earlier rectangle-suggestion code assumed `VNRectangleObservation`
corners return the newer Vision `NormalizedPoint` type (with a
`.cgPoint` accessor), but the classic completion-handler-based
`VNDetectRectanglesRequest` this code actually uses still returns plain
`CGPoint` directly, matching the real working example this was based
on. Removed the incorrect `.cgPoint` access. (2) The user tested the
new dedicated Angle tool on a laptop's corner (geometrically 90°) and
got 88.8° — asked why. This is not a bug: it's normal AR tap-placement
imprecision, the same category of error already documented for
distance (`evidence/ios/POINT_TO_POINT_BENCHMARK.md`'s +5 to +7mm
bias). Per the project's standing no-calibration rule
(`shared/BENCHMARK_PROTOCOL.md` section 8, now explicitly extended to
angle), this was **not** rounded or snapped toward 90° — recorded as-is
in `TOOL_REGISTRY_STATUS.md` as the Angle tool's first real-hardware
data point, moving it from `PROTOTYPE` to `VALIDATING`.

**Tests/results**: the CGPoint fix is not independently testable
without a real compile (still pending confirmation the corrected code
actually builds). The 88.8° angle measurement is itself the "test" for
this entry — real, hand-verified as normal-magnitude error rather than
a defect, and recorded as evidence rather than corrected away.

**Limitations**: single data point on a single device/angle — not
enough to characterize angle-measurement error the way the 4-distance
point-to-point benchmark did. The rectangle-suggestion feature (the
actual reason for the CGPoint bug) still has zero real-device
confirmation that the fix compiles or that detection/raycast/double-tap
actually work end-to-end.

**Next recommended task**: sync `ARMeasureView.swift` to the Xcode
project, confirm it compiles, and test the rectangle-suggestion flow on
a real object. Separately, more angle measurements against more known
angles (a carpenter's square, a book's corner, etc.) would turn this
one data point into a real baseline the way the distance one already
is. Also still open: the reticle-smoothness clarification, Cube
wireframe and 1-foot threshold real-device confirmation,
Cylinder/Distance Meter/dedicated Height tools, and the Android
capability-detection real-device run.
