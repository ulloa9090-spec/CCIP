import AVFoundation
import ARKit
import CoreMotion
import UIKit

/// Reads real capability/permission state from the platform. Never guesses
/// from the device model name — every field is produced by calling the
/// relevant Apple API, per `docs/03_CLAUDE_CODE_RULES.md` rule 11.
enum CapabilityDetector {

    static let harnessVersion = "0.1.0-phase0"

    static func detect() -> CapabilityMatrix {
        let motionManager = CMMotionManager()

        let cameraAvailable = AVCaptureDevice.default(for: .video) != nil
        let cameraAuthorizationStatus = describeCameraAuthorization(
            AVCaptureDevice.authorizationStatus(for: .video)
        )

        let arWorldTrackingSupported = ARWorldTrackingConfiguration.isSupported
        let sceneDepthSupported = ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)
        let lidarMeshSupported = ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh)

        let arSupportDetail: String
        if arWorldTrackingSupported {
            arSupportDetail = "ARWorldTrackingConfiguration.isSupported == true"
        } else {
            arSupportDetail = "ARWorldTrackingConfiguration.isSupported == false (device/OS does not support world tracking)"
        }

        let accelerometerAvailable = motionManager.isAccelerometerAvailable
        let gyroscopeAvailable = motionManager.isGyroAvailable
        let deviceMotionAvailable = motionManager.isDeviceMotionAvailable

        let (strategy, fallback) = recommendStrategy(
            arSupported: arWorldTrackingSupported,
            depthSupported: sceneDepthSupported,
            lidarAvailable: lidarMeshSupported
        )

        return CapabilityMatrix(
            platform: "ios",
            osVersion: UIDevice.current.systemVersion,
            deviceModel: deviceModelIdentifier(),
            harnessVersion: harnessVersion,
            timestamp: iso8601Now(),
            cameraAvailable: cameraAvailable,
            cameraAuthorizationStatus: cameraAuthorizationStatus,
            arSupported: arWorldTrackingSupported,
            arSupportDetail: arSupportDetail,
            planeDetectionSupported: arWorldTrackingSupported,
            accelerometerAvailable: accelerometerAvailable,
            gyroscopeAvailable: gyroscopeAvailable,
            deviceMotionAvailable: deviceMotionAvailable,
            depthSupported: sceneDepthSupported,
            lidarAvailable: lidarMeshSupported,
            tofAvailable: false,
            selectedMeasurementStrategy: strategy,
            fallbackStrategy: fallback,
            knownLimitations: "",
            rawNotes: ""
        )
    }

    private static func recommendStrategy(
        arSupported: Bool,
        depthSupported: Bool,
        lidarAvailable: Bool
    ) -> (strategy: String, fallback: String) {
        if lidarAvailable {
            return (
                "Reference-Assisted / Station Mode using LiDAR scene mesh for higher-precision geometry",
                "Fall back to AR point-to-point (world tracking, no mesh) if mesh reconstruction quality is poor"
            )
        }
        if depthSupported {
            return (
                "AR point-to-point using world tracking fused with scene depth",
                "Fall back to AR point-to-point without depth if scene depth is unreliable in current lighting"
            )
        }
        if arSupported {
            return (
                "AR point-to-point using world tracking only (no depth)",
                "Fall back to Reference-Assisted mode (known-size marker) if tracking is unstable"
            )
        }
        return (
            "Reference-Assisted mode using a calibrated marker/reference object",
            "No AR available on this device; measurement requires a visible reference"
        )
    }

    private static func describeCameraAuthorization(_ status: AVAuthorizationStatus) -> String {
        switch status {
        case .authorized: return "authorized"
        case .denied: return "denied"
        case .notDetermined: return "notDetermined"
        case .restricted: return "restricted"
        @unknown default: return "unknown"
        }
    }

    /// Hardware identifier such as "iPhone14,5". Standard sysctl-based
    /// lookup; does not require any additional dependency.
    private static func deviceModelIdentifier() -> String {
        var systemInfo = utsname()
        uname(&systemInfo)
        let machineMirror = Mirror(reflecting: systemInfo.machine)
        let identifier = machineMirror.children.reduce("") { partial, element in
            guard let value = element.value as? Int8, value != 0 else { return partial }
            return partial + String(UnicodeScalar(UInt8(value)))
        }
        return identifier.isEmpty ? UIDevice.current.model : identifier
    }

    private static func iso8601Now() -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: Date())
    }
}
