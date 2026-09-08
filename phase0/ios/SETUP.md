# iOS Phase 0 — Setup & Run Guide

You need a Mac with **Xcode** installed (free, from the Mac App Store) and
your own iPhone with a USB or Wi-Fi connection to that Mac. A free Apple ID
is enough to run this on your own device for testing (no paid developer
account required).

Why you're creating the Xcode project yourself instead of receiving a
ready-made `.xcodeproj`: that project file format is easy to corrupt when
hand-written outside Xcode, and a broken project file is much harder to
diagnose remotely than five minutes of guided setup. The Swift source
files in this folder are complete and ready to drop in.

## 1. Create the project shell

1. Open Xcode → **File → New → Project…**
2. Choose **iOS → App**, click Next.
3. Product Name: `BoxOpPhase0`. Interface: **SwiftUI**. Language: **Swift**.
4. Save it anywhere convenient (e.g. Desktop). Do **not** check "Use Core Data" or "Include Tests" — not needed for this spike.

## 2. Replace the generated files with the Phase 0 source

Xcode created `BoxOpPhase0App.swift` and `ContentView.swift` for you with
placeholder content.

1. In Finder, open this folder: `phase0/ios/BoxOpPhase0/`.
2. Drag all `.swift` files from that folder into the `BoxOpPhase0` group in
   Xcode's file navigator (the one with the app icon, not the project
   root). When prompted, choose **"Copy items if needed"** and make sure
   the `BoxOpPhase0` target checkbox is checked.
3. When Xcode asks about the two files that already exist
   (`BoxOpPhase0App.swift`, `ContentView.swift`), choose **Replace**.

You should end up with these files in the target:
`BoxOpPhase0App.swift`, `ContentView.swift`, `CapabilityDetector.swift`,
`CapabilityMatrix.swift`, `CapabilityReportView.swift`,
`ARMeasureView.swift`, `ARMeasureScreen.swift`,
`MultiPointMeasurement.swift`.

**Already have a working Phase 0 project from before?** You don't need to
redo the whole setup — just bring your project up to date:

1. If you still have `PointToPointMeasurement.swift` in the project,
   **delete** it (select it → Delete → "Move to Trash") — it's been
   replaced by `MultiPointMeasurement.swift` and no longer exists in the
   repo.
2. Drag in any files you don't have yet from `phase0/ios/BoxOpPhase0/` —
   as of this writing that's `MultiPointMeasurement.swift` and
   `PolygonGeometry.swift` (Copy items if needed, target checked).
3. Re-drag `ARMeasureView.swift` and `ARMeasureScreen.swift` on top of
   the existing ones, choosing **Replace** — both keep changing as this
   spike grows (unlimited points, then Close Shape/area/rectangle/angle,
   then height/volume).
4. `ContentView.swift` and `CapabilityDetector.swift`/`CapabilityMatrix.swift`/
   `CapabilityReportView.swift` are untouched; leave them as-is.

## 3. Add the required permission strings

Open `Info-Additions.md` in this folder and add the two keys it lists to
your target's Info settings (click the project in the navigator → the
`BoxOpPhase0` target → **Info** tab → hover any row → `+`).

## 4. Connect your iPhone and set your team

1. Plug your iPhone into the Mac (or pair over Wi-Fi: Xcode → Window →
   Devices and Simulators).
2. On the iPhone, if this is the first time: **Settings → Privacy &
   Security → Developer Mode → On**, then restart when prompted.
3. In Xcode, click the project name at the top of the navigator → select
   the `BoxOpPhase0` target → **Signing & Capabilities** tab.
4. Under **Team**, choose your Apple ID (add it via **Xcode → Settings →
   Accounts** if it's not listed — a free personal account is fine).
5. Xcode will assign a temporary bundle identifier automatically; leave it
   as-is unless it reports a conflict, in which case change
   `com.example.BoxOpPhase0` to something like
   `com.yourname.BoxOpPhase0`.

## 5. Run on your device

1. At the top of the Xcode window, choose your iPhone from the device
   dropdown (instead of a Simulator).
2. Press **Run** (▶) or `Cmd+R`.
3. First launch: on the iPhone, go to **Settings → General → VPN & Device
   Management**, tap your Apple ID under "Developer App", and tap
   **Trust**. Then relaunch the app from the home screen.
4. The app will ask for camera and motion permission — allow both so the
   capability report is accurate. (If you tap "Request Camera Permission"
   inside the app instead, that's fine too — the status will refresh.)

## 6. Using the app

The app now has two tabs:

**Capabilities** (already validated — `phase0/evidence/ios/RESULT.md`):
- Shows the full capability matrix read live from your device: camera,
  AR/world tracking, plane detection, accelerometer, gyroscope, fused
  device motion, scene depth, and LiDAR mesh support.
- Fill in **Known limitations** / **Raw notes** with anything you notice
  (e.g. "tracking took a few seconds to stabilize", "AR unsupported on
  this model").
- Tap **Export Capability Matrix (JSON)** and share it to yourself (Files,
  AirDrop, Messages, email — whatever's convenient) so the result can be
  collected and compared against the Android run. Field meanings are in
  `phase0/shared/CAPABILITY_MATRIX.md`. **Name each export with the
  device/date and keep it under `phase0/evidence/` — don't overwrite an
  existing evidence file.**

**Measure** (multi-point — the two-point version already passed its own
benchmark, see `phase0/evidence/ios/POINT_TO_POINT_BENCHMARK.md`; this
generalized version needs its first real-device run):

0. Before tapping **Start Measure**, use the **Length / Angle** switch
   to pick the tool. **Length** is the flow below. **Angle** is a
   dedicated 3-tap tool: tap **Add Point** to place the first ray's
   endpoint, again for the vertex, again for the second ray's endpoint
   — it finishes automatically on that third point and shows the angle
   at the vertex plus both ray lengths. Use **Undo Last Point**/**Clear
   All** the same way; **New Angle** starts another one right away.
1. A small circle **reticle** sits in the center of the screen at all
   times — this is where the next point will land, not something you
   tap. Point the phone at a real surface and move it slowly for a
   second or two so ARKit can find a plane.
2. Tap **Start Measure**. The reticle turns solid white once it's
   resting on a valid surface.
2b. In **Length** mode, before you place any point, the app is also
   watching the camera feed for a real rectangular object or surface
   (a book, a door, a screen). When it finds one it can confirm with a
   raycast, you'll see a **yellow outline** appear around it with a
   "Double-tap to measure" label. **Double-tap anywhere on screen** to
   accept it — this places all four corner points and closes the shape
   in one step, skipping steps 3-5 below entirely. If no yellow outline
   appears, just keep placing points manually as usual; this is a
   best-effort suggestion, not a requirement.
3. Tap **Add Point** to confirm the first point (a teal sphere appears).
   Move the phone toward the next point you want to measure — you'll see
   a white tentative line follow the reticle live, with a yellow text
   label floating just above it showing its length, updating
   continuously in feet/inches as you move.
4. Tap **Add Point** again to confirm the second point — the segment
   turns solid teal and locks in with a white label over it, and a new
   live segment (with its own live yellow label) starts from there.
   Repeat for as many points as you want; there's no limit. Every
   confirmed segment keeps its own label, always turned to face you.
5. Once you have 3+ points, a **Close Shape** button appears. Tap it to
   connect the last point back to the first — you'll see area, perimeter,
   the interior angle at each vertex, and (if the 4 points form one) a
   "Rectangle" label with length × width instead of a generic "Polygon".
   If your points aren't well aligned to a single plane, a warning banner
   says so and calls the area approximate rather than hiding it.
6. After closing, the primary button becomes **Set Height Point**: aim
   the reticle above or below the shape (e.g. up a wall from a floor
   shape) — you'll see a live height preview with its own label — then
   confirm. This gives you a volume (base area × height). Once
   confirmed, the scene draws the **full box/prism wireframe** — the
   top face's edges and every vertical edge, each labeled with its own
   length — not just a single height line, so it looks like a proper
   3D box outline (matching the "Cube" tool in other AR measuring apps).
7. **Undo Last Point** undoes whatever you did most recently — the
   height point, then un-closing the shape, then the last base point, in
   that order. **Clear All** wipes everything and lets you keep measuring
   from scratch. **Finish** freezes the geometry and shows the final
   summary (distance, or area/perimeter/volume if closed).
8. From **Finished**, **New Measurement** clears and starts right back
   up in Measuring; **Clear** wipes everything and returns to the start
   screen.
9. Compare the on-screen distances against a real tape measure at a few
   distances and angles — that's `phase0/shared/BENCHMARK_PROTOCOL.md`.
   **Do not treat any small discrepancy as something to "fix" in the
   app** — see that document's section 8 before touching the measurement
   code over accuracy concerns. Area/volume have no benchmark yet — that's
   a good next real-device task once basic length is reconfirmed.

## Troubleshooting

- **"Untrusted Developer" alert on launch** → step 5.3 above; you have to
  trust the developer certificate once per Mac/Apple ID.
- **App crashes immediately on launch** → almost always a missing
  `NSCameraUsageDescription` (step 3).
- **"Failed to register bundle identifier"** → your bundle ID collides
  with someone else's; append your name/initials to it as in step 4.5.
- **AR fields all show "No"/unsupported on a real iPhone** → some older
  or budget models genuinely don't support ARKit world tracking; that's a
  real result, not a bug — write it down as-is.
- **Signing keeps failing / "no signing certificate found"** → open
  **Xcode → Settings → Accounts**, select your Apple ID, click **Manage
  Certificates…**, and add an "Apple Development" certificate with the +
  button, then retry.
- **Measure tab is black or frozen** → this screen needs a real device;
  it cannot run in the Simulator (no camera, no ARKit). Make sure the
  run destination is your iPhone, not a simulator.
- **No yellow rectangle suggestion ever appears** → this is a
  best-effort detector, not guaranteed: it needs decent lighting, a
  genuinely rectangular object with visible edges/contrast, all four
  corners on a surface ARKit has already mapped (move the phone around
  a bit first), and only runs while you're in Length mode with zero
  points placed. Nothing is broken if it just doesn't trigger — keep
  placing points manually.
- **"Add Point" stays greyed out** → the reticle isn't resting on any
  detected/estimated surface yet. Move the phone slowly over the area
  you want to measure first (this is what "world tracking" is doing)
  until the reticle turns solid white, then try again.
- **The line/points look slightly off after moving around a lot** → this
  is normal drift for a phone with no depth sensor; on a device with
  LiDAR (like the one already validated), accuracy should hold up much
  better over distance and time. This is exactly what
  `phase0/shared/BENCHMARK_PROTOCOL.md` exists to measure precisely.
- **"Close Shape" never appears** → it only shows once you have 3 or
  more confirmed points and haven't already closed the shape.
- **Area/rectangle result looks wrong, or the coplanarity warning shows
  up every time** → your tapped points aren't landing on a single flat
  plane (easy to do by hand). Try placing points more carefully along
  one real flat surface, or treat the number as approximate — that's
  exactly what the warning is for, not a bug to "fix" by hiding it.
- **"Set Height Point" is disabled** → same cause as "Add Point" being
  disabled: the reticle needs to be resting on a valid surface first.
- **A segment's text label is missing, flickers, or looks wrong from some
  angles** → the labels use `SCNText` with a billboard constraint so they
  always face the camera; a documented SceneKit gotcha is `SCNText`
  rendering invisible from the back face of a single-sided material,
  which this code already guards against (`isDoubleSided = true`). If you
  still see this, it's a real, not-yet-explained device issue worth
  writing down — don't assume it's already handled just because the code
  guards the known cause.
- **Labels feel sluggish or the app's frame rate drops with many
  segments/long shapes** → `SCNText` is a real, documented SceneKit
  performance cost (each label is its own polygon-heavy geometry); this
  hasn't been stress-tested with many segments on a real device yet. If
  it becomes a real problem, the fix is switching labels to a
  `SpriteKit`/texture-based billboard instead of `SCNText` — not
  something to pre-optimize without device evidence that it's actually
  slow.

## 7. Running the unit tests (geometry & unit-conversion math)

`phase0/ios/BoxOpPhase0Tests/` contains deterministic XCTest suites for the
pure math layer — `PolygonGeometry.swift`, `MultiPointMeasurement.swift`,
and `UnitFormatting.swift` — none of which touch ARKit/SceneKit, so they
run instantly on the Simulator or even without a device connected. Your
project doesn't have a test target yet unless you checked "Include Tests"
back in step 1, so you need to add one once.

### 7.1 Create the Unit Testing Bundle target

1. In Xcode, click the **project name** (blue icon) at the very top of the
   file navigator — this opens the project editor, not a file.
2. In the left column of the project editor (under "PROJECT"/"TARGETS"),
   click the **+** button at the bottom of the **TARGETS** list.
3. In the template picker, select the **iOS** tab, then scroll to the
   **Test** section and choose **Unit Testing Bundle**. Click **Next**.
4. Fill in the options:
   - **Product Name**: `BoxOpPhase0Tests` (must match exactly — this is
     the folder name the test files already live in, and matching it
     keeps everything easy to find).
   - **Team**: same team you set for the app target.
   - **Organization Identifier**: same as your app's.
   - **Project**: `BoxOpPhase0`.
   - **Target to be Tested**: `BoxOpPhase0` (this is what makes
     `@testable import BoxOpPhase0` work).
5. Click **Finish**. Xcode creates a new `BoxOpPhase0Tests` group with one
   placeholder file (something like `BoxOpPhase0Tests.swift`) and adds a
   new **scheme** for running tests.

### 7.2 Add the three test files

1. **Delete** the placeholder file Xcode generated (select it in the
   `BoxOpPhase0Tests` group → Delete → "Move to Trash") — it's empty
   boilerplate, not needed.
2. In Finder, open `phase0/ios/BoxOpPhase0Tests/` (this repo folder, a
   sibling of `phase0/ios/BoxOpPhase0/` you used in step 2).
3. Drag `PolygonGeometryTests.swift`, `MultiPointMeasurementTests.swift`,
   and `UnitFormattingTests.swift` into the **`BoxOpPhase0Tests`** group
   in Xcode's navigator (the one the new target created — **not** the
   `BoxOpPhase0` app group).
4. In the "Choose options" sheet: check **"Copy items if needed"**, and
   under **"Add to targets"** make sure **only `BoxOpPhase0Tests` is
   checked** (not the `BoxOpPhase0` app target — test files don't belong
   in the shipped app).
5. Click **Finish**.

You should now have a `BoxOpPhase0Tests` group containing exactly the
three files above, with a `BoxOpPhase0Tests` target next to your
`BoxOpPhase0` app target in the project editor's TARGETS list.

### 7.3 Run the tests

1. Press **Cmd+U**, or click **Product → Test** in the menu bar. Any
   destination works (Simulator or your real iPhone) since these tests
   don't use the camera or AR.
2. Xcode runs all three suites and shows results in the **Test navigator**
   (the diamond-shaped icon in the left sidebar): a green checkmark per
   test on success, a red one with the failing assertion's file/line if
   something doesn't match.
3. If it doesn't compile: the most common cause is the test files having
   been added to the wrong target — reselect each test file in the
   navigator, open the **File Inspector** (right sidebar), and confirm
   under **Target Membership** that only `BoxOpPhase0Tests` is checked.

**What these tests do and don't cover:** they validate the pure math in
`PolygonGeometry`, `MultiPointMeasurement`, and `UnitFormatting` exactly as
those files exist today (distance, perimeter, area, orientation, angles,
rectangle detection, planarity, height, volume, meters→feet/inches
conversion, and rounding to the nearest 1/8") — including edge cases like
empty/too-few points and zero-length values. They do **not** exercise
`ARMeasureView.swift`/`ARMeasureScreen.swift` (SwiftUI/ARKit glue) or run
against real device data — that stays covered by the real-hardware
benchmark protocol instead (`../shared/BENCHMARK_PROTOCOL.md`).

One function under test, `UnitFormatting.feetAndInchesFraction(meters:)`,
is new: it didn't exist before this test suite and isn't called from any
screen yet — it was added specifically so "rounding to 1/8\"" had real,
existing behavior to test, without changing what `ARMeasureScreen.swift`
currently displays (`feetAndInches(meters:)`, unchanged). If a future
increment adopts eighth-inch display, this is the function it would use.
