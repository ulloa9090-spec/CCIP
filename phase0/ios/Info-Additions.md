# Required Info.plist entries

This folder ships Swift source files only, not a full `.xcodeproj` — see
`SETUP.md` for why and how to create the project shell in Xcode. Once you
create the project, add these two keys in the target's **Info** tab (or
directly in `Info.plist`):

| Key | Value |
|---|---|
| `Privacy - Camera Usage Description` (`NSCameraUsageDescription`) | `BoxOp Phase 0 uses the camera to test AR world tracking and measurement capability.` |
| `Privacy - Motion Usage Description` (`NSMotionUsageDescription`) | `BoxOp Phase 0 reads motion sensors to report device capability.` |

Without the camera key, the app will crash immediately when it calls
`AVCaptureDevice.requestAccess` or touches the camera — this is enforced
by iOS, not optional.
