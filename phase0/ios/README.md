# iOS Phase 0 harness

Two screens, built up one Phase 0 slice at a time
(`docs/20_PHASE0_EXECUTION_RESEARCH_PROMPT.md`):

1. **Capabilities** — camera, AR/world tracking, plane detection, IMU and
   depth/LiDAR support read live from Apple's APIs. **Validated on real
   hardware** — see `../evidence/ios/RESULT.md` (PASS, `iPhone18,2`,
   iOS 26.6.1, Tier C/LiDAR).
2. **Measure** — a segmented control on the idle screen picks the tool
   before you start: **Length** (the default, described below),
   **Angle**, or **Height**.

   **Angle** is a dedicated 3-tap flow (ray endpoint, vertex, ray
   endpoint) that auto-finishes on the third point and shows the angle
   at the vertex plus both ray lengths, reusing the same
   `PolygonGeometry.angleDegrees`/`interiorAngles` math as the
   interior-angle display below rather than any new geometry. The
   angle also floats in-scene right at the vertex — live while aiming
   the second ray, then fixed once confirmed — the same in-scene-label
   treatment every segment's length already gets, per user request.

   **Height** is a dedicated 2-tap flow (base point, top point) that
   auto-finishes on the second point — the catalog's standalone Height
   tool (`docs/25_MEASUREMENT_TOOLS_CATALOG.md` section 5), distinct
   from the polygon-to-height-point perpendicular described below (that
   one needs a closed 3+ point base first and derives a volume; this one
   is a simple two-tap vertical measurement on its own). The catalog
   calls for "gravity/world-up constraints when valid" — ARKit's default
   `.gravity` world alignment already makes the world Y axis vertical,
   so the reported height is the Y-difference between the two taps, not
   the raw 3D distance (which would also fold in any horizontal drift
   between them). That drift is instead drawn and labeled separately, in
   orange, as an "off vertical" warning once it's over about 2cm, both
   in-scene (live while aiming, and in the finished "L"-shaped
   breakdown) and in the bottom result card — there's no drag-to-correct
   in this AR prototype, so the catalog's "allow manual correction"
   becomes: see the warning, Undo, and re-tap more carefully.

   **Length** mode is the continuous multi-point AR measurement
   (`MultiPointMeasurement.swift`, `PolygonGeometry.swift`,
   `ARMeasureView.swift`, `ARMeasureScreen.swift`): start, place an
   unlimited number of points one at a time via a continuous
   screen-center reticle raycast, see each segment and the running total
   distance live, undo/finish/clear. Every confirmed segment (and the
   closing segment, and the height segment once set) carries an
   in-scene, always-camera-facing text label showing its length directly
   over the geometry, not just in the bottom result cards; the live/active
   segment gets the same treatment, updated in place every AR frame.
   Optionally **Close Shape** to turn
   the polyline into a polygon (perimeter, planar area, interior angles,
   automatic shape recognition: Square/Rectangle at 4 points, an
   equilateral/right/isosceles/generic Triangle at 3 points, or a Circle
   at 5+ points if they fit one within tolerance — all still manual, the
   app only labels the shape you already traced), then optionally
   place one **height point** to derive a volume (base area × height —
   the same pattern Apple's Measure app uses for room volume). Once the
   height point is set, the AR scene draws the **full wireframe
   box/prism** — every top-face edge and every vertical edge, each with
   its own in-scene label — not just the single height line, matching
   the "Cube" tool look in dedicated AR measuring apps (per user
   reference).

   **New**: before placing any points in **Length** mode, a **Scan for
   Rectangle** button appears. Tapping it runs `Vision`'s
   `VNDetectRectanglesRequest` once against the current camera frame
   looking for a real rectangular object/surface (an earlier version ran
   this continuously in the background every ~0.3s, but with no
   frame-to-frame persistence that looked flickery and unstable — an
   explicit, on-demand scan is stable instead, per user feedback). When
   it finds one and all four corners raycast onto real geometry, it
   draws a yellow suggested outline with a "Double-tap to measure"
   label; double-tapping the screen accepts it, adding all four points
   and closing the shape in one step, per explicit user request. This is
   a separate, 2D-image rectangle detector from the 3D point-based
   `PolygonGeometry.rectangleCheck` used after manual placement — the
   two aren't related and can disagree (Vision might suggest a shape our
   own tolerance check later doesn't confirm as a rectangle, or vice
   versa).
   This generalizes the earlier fixed two-point spike, which **did** run on
   real hardware and produced a first accuracy baseline — see
   `../evidence/ios/POINT_TO_POINT_BENCHMARK.md` (+5 to +7mm bias,
   preliminary, **not calibrated** — see
   `../shared/BENCHMARK_PROTOCOL.md` section 8 for why not yet). The
   multi-point polyline, its feet/inches display, and the per-segment
   in-scene labels **have now run on real hardware** (iPhone18,2,
   2026-09-08) — multiple segments measured with live labels updating
   correctly and the finished total showing in feet/inches as designed.
   **Not yet confirmed on real hardware**: Close Shape/area/rectangle
   detection/interior angles/height/volume — none of those were
   exercised in the run so far, only the open polyline. Still not
   implemented: dedicated Cuboid/Cylinder tools,
   Circle, Wall, curved/smooth geometry, sessions, or CV assistance —
   see `docs/25_MEASUREMENT_TOOLS_CATALOG.md` and
   `phase0/TOOL_REGISTRY_STATUS.md` for exactly what's real vs. `SPECIFIED`.

**New**: the bottom control row, while Measuring, now mirrors a
camera-app shutter row per user reference — a circular **Undo** button on
the left, the primary action (add point / set height point) as a large
centered circle, and a white **shutter-style camera button** on the
right (the same button, smaller, sits below the buttons once Finished).
Tapping it captures the AR scene together with the current SwiftUI
overlay (readout cards, labels) as one image and opens the system share
sheet, per explicit user request — replacing an earlier, much smaller
top-corner icon the user flagged as too small to use comfortably.
`ARSCNView`
renders via Metal, and the classic `CALayer.render(in:)`/
`UIView.drawHierarchy` screenshot techniques don't reliably capture
Metal-backed content on their own (it can come back black); this instead
uses ARKit's own `ARSCNView.snapshot()` to capture the 3D scene correctly,
temporarily swaps that snapshot in as a plain image view in the same spot,
then screenshots the whole window (now Metal-free) to also pick up the
SwiftUI overlay, and restores the live AR view immediately after. The
share sheet (not a direct Photos-library write) is used deliberately so no
new Info.plist permission is needed — saving goes through the system's own
flow if the user picks "Save Image". Not yet run on real hardware.

All Measure-tab results display in **feet and inches** (`UnitFormatting.swift`)
per user request — a display-layer conversion only; every internal
computation still happens in meters, ARKit's native unit
(`docs/14_LOCALIZATION_LANGUAGE.md` "Measurement units": typed
conversion, never string manipulation, convert only at presentation
time). The display format is rounded to the nearest 1/8" with real
Unicode fraction glyphs (`8½"`, not `8-1/2"` or `8.5"`), shown as
inches-only below one foot and switching to feet-and-inches at 12
inches or more (`11"` but `1' 0"`) — per explicit user direction, after
an earlier version used a 3-foot threshold inferred from a reference
screenshot that turned out not to be what was wanted. Note: `docs/21_AR_MEASUREMENT_SYSTEM.md`
"Units" names millimeters as the eventual canonical persisted unit once
records are saved — nothing is persisted yet in this Phase 0 spike, so
that's a real but not-yet-relevant gap, tracked here rather than
silently ignored.

Deterministic unit tests now cover the pure math layer —
`BoxOpPhase0Tests/{PolygonGeometryTests,MultiPointMeasurementTests,UnitFormattingTests}.swift`
— for distance/segment sums, perimeter, triangle/rectangle area,
CW/CCW orientation, interior angles, rectangle detection (accept and
reject cases), planarity tolerance, height, volume, meters→feet/inches
conversion, and edge/zero cases. These validate the implementation as it
exists today; no production code changed to accommodate them, with one
explicitly-flagged exception: `UnitFormatting.feetAndInchesFraction(meters:)`
is a new, additive function (rounds to the nearest 1/8") added only so the
"rounding to 1/8\"" test case has real behavior to check — it is not wired
into `ARMeasureScreen.swift`, which keeps displaying `feetAndInches(meters:)`
unchanged. None of this runs against ARKit/SceneKit or real-device data;
that stays the job of the benchmark protocol. See `SETUP.md` section 7 for
exact Xcode steps to create the Unit Testing Bundle target and add these
files (they don't come with a generated `.xcodeproj` either, for the same
corruption-risk reason as the app source).

- **Source**: `BoxOpPhase0/*.swift`
- **Tests**: `BoxOpPhase0Tests/*.swift` — see `SETUP.md` section 7
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
