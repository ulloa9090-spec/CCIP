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
`CapabilityMatrix.swift`, `CapabilityReportView.swift`.

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

- The single screen shows the full capability matrix read live from your
  device: camera, AR/world tracking, plane detection, accelerometer,
  gyroscope, fused device motion, scene depth, and LiDAR mesh support.
- Fill in **Known limitations** / **Raw notes** with anything you notice
  (e.g. "tracking took a few seconds to stabilize", "AR unsupported on
  this model").
- Tap **Export Capability Matrix (JSON)** and share it to yourself (Files,
  AirDrop, Messages, email — whatever's convenient) so the result can be
  collected and compared against the Android run. Field meanings are in
  `phase0/shared/CAPABILITY_MATRIX.md`.

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
