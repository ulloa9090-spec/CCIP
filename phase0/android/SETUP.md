# Android Phase 0 — Setup & Run Guide

You need **Android Studio** (free, from developer.android.com) on Windows,
macOS or Linux, and your own Android phone with a USB cable (or Wi-Fi
debugging). No Google Play Developer account is needed to run this on your
own device.

Unlike the iOS folder, this is a complete, real Gradle project — you can
open it directly, you don't need to recreate it by hand.

## 1. Open the project

1. Install Android Studio and open it.
2. **File → Open…** and select the `phase0/android` folder (the one
   containing `settings.gradle.kts`).
3. Let it "Gradle Sync" — the first sync downloads the Android Gradle
   Plugin, Kotlin, Compose and ARCore, so it needs internet access and can
   take several minutes the first time.
4. If Android Studio's **Upgrade Assistant** offers a newer Android
   Gradle Plugin/Kotlin version than the ones pinned here, it's fine to
   accept — do it as its own step, then re-sync, so any migration issue is
   easy to isolate from real app code changes.

## 2. Install the Android SDK platform this project targets

Android Studio should offer to install any missing SDK platform
automatically during sync (it targets API 35 / compiles against API 35).
If it doesn't prompt automatically: **Tools → SDK Manager → SDK
Platforms**, check **Android 15.0 ("VanillaIceCream", API 35)**, click
**Apply**.

## 3. Prepare your phone

1. On the phone: **Settings → About phone**, tap **Build number** 7 times
   to unlock Developer Options.
2. **Settings → System → Developer options → USB debugging → On**.
3. Plug the phone into your computer with USB. On the phone, accept the
   "Allow USB debugging?" prompt (check "always allow from this
   computer").
4. In Android Studio, your device should appear in the device dropdown at
   the top of the window within a few seconds. If it doesn't, try a
   different USB cable/port — this is the most common snag.

## 4. Run it

1. Choose your phone in the device dropdown (not an emulator).
2. Press the green **Run ▶** button, or `Shift+F10`.
3. The app installs and launches automatically. First launch, tap
   **Request Camera Permission** if the "Permission" row shows
   `notGranted`, then grant it in the system dialog.

## 5. Using the app

- The single screen shows the full capability matrix read live from your
  device: camera, ARCore support, plane detection, accelerometer,
  gyroscope, fused rotation-vector motion, ARCore Depth API support, and
  raw Camera2 ToF hardware detection.
- Fill in **Known limitations** / **Raw notes** with anything you notice.
- Tap **Export Capability Matrix (JSON)** — Android's share sheet opens so
  you can send it to yourself the same way as the iOS export (email,
  Drive, Messages, etc.). Field meanings are in
  `phase0/shared/CAPABILITY_MATRIX.md`.

## Troubleshooting

- **"SDK location not found"** on sync → Android Studio should create
  `local.properties` automatically pointing at its bundled SDK; if it
  doesn't, **File → Project Structure → SDK Location** and point it at
  your installed Android SDK.
- **Device not listed** → check USB debugging is on (step 3.2), try
  `File → Invalidate Caches / Restart` if it was working before and
  stopped.
- **"ARCore supported: No" on a phone you know supports AR** → make sure
  "Google Play Services for AR" is installed/updated from the Play Store;
  `optional` AR apps like this one don't force-install it.
- **Gradle sync fails resolving `com.google.ar:core`** → check your
  internet connection; this dependency comes from Google's Maven
  repository, already declared in `settings.gradle.kts`.
- **Build error mentioning Kotlin/Compose compiler version mismatch** →
  the Compose compiler is tied 1:1 to the Kotlin version as of Kotlin 2.0+;
  if you bump Kotlin via the Upgrade Assistant, make sure
  `org.jetbrains.kotlin.plugin.compose` in `build.gradle.kts` (root) is
  bumped to the same version.
