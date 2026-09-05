import Foundation

/// Canonical Phase 0 capability record.
///
/// Field names and meaning are defined in
/// `phase0/shared/CAPABILITY_MATRIX.md` and
/// `phase0/shared/capability-matrix.schema.json`. Keep this struct in sync
/// with that document and with the Android equivalent
/// (`CapabilityMatrix.kt`) field-for-field.
struct CapabilityMatrix: Codable {
    let platform: String
    let osVersion: String
    let deviceModel: String
    let harnessVersion: String
    let timestamp: String

    let cameraAvailable: Bool
    let cameraAuthorizationStatus: String

    let arSupported: Bool
    let arSupportDetail: String
    let planeDetectionSupported: Bool

    let accelerometerAvailable: Bool
    let gyroscopeAvailable: Bool
    let deviceMotionAvailable: Bool

    let depthSupported: Bool
    let lidarAvailable: Bool
    let tofAvailable: Bool

    let selectedMeasurementStrategy: String
    let fallbackStrategy: String
    let knownLimitations: String
    let rawNotes: String
}
