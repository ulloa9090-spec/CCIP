import Foundation
import SceneKit

/// Where the tapped point's 3D position came from. Persisted alongside the
/// measurement per `docs/21_AR_MEASUREMENT_SYSTEM.md` ("Raycast / hit test":
/// "Store the source type").
enum RaycastSource: String {
    case existingPlaneGeometry
    case estimatedPlane
}

/// Pure geometry: the actual "does this app measure anything" question.
/// Kept free of ARKit/SceneKit view types so it can be unit tested on its
/// own once a test target exists, per `docs/03_CLAUDE_CODE_RULES.md` rule 14.
enum PointToPointMeasurement {
    static func distance(from a: SCNVector3, to b: SCNVector3) -> Float {
        let dx = b.x - a.x
        let dy = b.y - a.y
        let dz = b.z - a.z
        return (dx * dx + dy * dy + dz * dz).squareRoot()
    }
}
