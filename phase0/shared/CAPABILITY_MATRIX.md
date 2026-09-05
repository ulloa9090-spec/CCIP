# Phase 0 — Capability Matrix Contract

This is the canonical, platform-agnostic definition of the per-device
capability record produced by the Phase 0 test harness (see
`../../docs/20_PHASE0_EXECUTION_RESEARCH_PROMPT.md`, section 3).

Both the iOS harness (`CapabilityMatrix.swift`) and the Android harness
(`CapabilityMatrix.kt`) implement this contract field-for-field so results
from both platforms can be compared and archived side by side. The
authoritative machine-readable version is `capability-matrix.schema.json`
in this directory.

## Fields

| Field | Type | Meaning |
|---|---|---|
| `platform` | `"ios" \| "android"` | Which harness produced the record. |
| `osVersion` | string | e.g. `"17.4"`, `"14"`. |
| `deviceModel` | string | Hardware identifier, e.g. `"iPhone14,5"`, `"Pixel 7"`. |
| `harnessVersion` | string | Version tag of this Phase 0 app, for traceability. |
| `timestamp` | string (ISO 8601) | When the capability check ran. |
| `cameraAvailable` | boolean | A video capture device is present. |
| `cameraAuthorizationStatus` | string | Current OS permission state. iOS reports one of `authorized`, `denied`, `notDetermined`, `restricted`; Android's permission API only distinguishes `granted` / `notGranted` (it cannot tell "never asked" apart from "denied" without an Activity reference), so it reports one of `granted`, `notGranted`. |
| `arSupported` | boolean | World tracking / core AR session can be created on this device. |
| `arSupportDetail` | string | Which API reported this and how (e.g. `"ARWorldTrackingConfiguration.isSupported"`, `"ArCoreApk.Availability.SUPPORTED_INSTALLED"`). |
| `planeDetectionSupported` | boolean | Horizontal/vertical plane detection is available. |
| `accelerometerAvailable` | boolean | Raw accelerometer sensor present. |
| `gyroscopeAvailable` | boolean | Raw gyroscope sensor present. |
| `deviceMotionAvailable` | boolean | Fused orientation/motion (CMDeviceMotion / rotation-vector sensor) present. |
| `depthSupported` | boolean | Any per-pixel depth API is usable (scene depth / ARCore Depth API). |
| `lidarAvailable` | boolean | Dedicated LiDAR scanner + scene reconstruction mesh (iOS Pro devices; typically `false` on Android). |
| `tofAvailable` | boolean | Discrete time-of-flight depth sensor exposed by the platform (mostly relevant on some Android devices). |
| `selectedMeasurementStrategy` | string | Free text: which Smart Measure mode (per `04_SMART_MEASURE.md`) this device should default to, given the above. |
| `fallbackStrategy` | string | Free text: what happens if the primary strategy fails at runtime. |
| `knownLimitations` | string | Free text: anything the tester noticed (tracking loss, permission issues, slow init, etc.). |
| `rawNotes` | string | Free text scratch space for the tester. |

## Rules

- This record never contains a physical dimension. It only describes
  hardware/software capability, per `03_CLAUDE_CODE_RULES.md` rule 11
  ("Detect capabilities at runtime").
- Booleans are always determined by calling the platform API — never
  guessed from the device model name.
- Both harnesses export this record as JSON (matching
  `capability-matrix.schema.json`) via the OS share sheet so results can be
  collected without typing them by hand.
