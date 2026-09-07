import ARKit
import SceneKit
import SwiftUI
import simd

/// Minimal AR point-to-point measurement surface: tap a point, tap a second
/// point, see the 3D distance between them. This is the entire scope of the
/// current spike — see `docs/21_AR_MEASUREMENT_SYSTEM.md` "Core modes" >
/// Point-to-Point, and `phase0/README.md` for what is deliberately not
/// built yet (rectangle, cuboid, cylinder, sessions, CV assistance, ...).
struct ARMeasureView: UIViewRepresentable {
    @Binding var pointA: SCNVector3?
    @Binding var pointB: SCNVector3?
    @Binding var raycastSource: RaycastSource?

    func makeUIView(context: Context) -> ARSCNView {
        let arView = ARSCNView(frame: .zero)
        arView.autoenablesDefaultLighting = true

        let configuration = ARWorldTrackingConfiguration()
        configuration.planeDetection = [.horizontal, .vertical]
        arView.session.run(configuration)

        let tapRecognizer = UITapGestureRecognizer(
            target: context.coordinator,
            action: #selector(Coordinator.handleTap(_:))
        )
        arView.addGestureRecognizer(tapRecognizer)

        context.coordinator.arView = arView
        return arView
    }

    func updateUIView(_ uiView: ARSCNView, context: Context) {
        context.coordinator.parent = self
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    final class Coordinator: NSObject {
        var parent: ARMeasureView
        weak var arView: ARSCNView?

        private var markerNodeA: SCNNode?
        private var markerNodeB: SCNNode?
        private var lineNode: SCNNode?

        init(parent: ARMeasureView) {
            self.parent = parent
        }

        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            guard let arView = arView else { return }
            let location = gesture.location(in: arView)

            // Prefer a hit against tracked plane geometry; fall back to the
            // estimated plane under the tap when no plane has been found yet.
            // Per docs/21_AR_MEASUREMENT_SYSTEM.md "Raycast / hit test".
            var source = RaycastSource.existingPlaneGeometry
            var result = existingPlaneHit(at: location, in: arView)
            if result == nil {
                source = .estimatedPlane
                result = estimatedPlaneHit(at: location, in: arView)
            }
            guard let hit = result else { return }

            let transform = hit.worldTransform
            let position = SCNVector3(
                transform.columns.3.x,
                transform.columns.3.y,
                transform.columns.3.z
            )

            if parent.pointA == nil {
                startNewMeasurement(at: position, source: source, in: arView)
            } else if parent.pointB == nil {
                completeMeasurement(at: position, in: arView)
            } else {
                startNewMeasurement(at: position, source: source, in: arView)
            }
        }

        private func existingPlaneHit(at point: CGPoint, in arView: ARSCNView) -> ARRaycastResult? {
            guard let query = arView.raycastQuery(from: point, allowing: .existingPlaneGeometry, alignment: .any) else {
                return nil
            }
            return arView.session.raycast(query).first
        }

        private func estimatedPlaneHit(at point: CGPoint, in arView: ARSCNView) -> ARRaycastResult? {
            guard let query = arView.raycastQuery(from: point, allowing: .estimatedPlane, alignment: .any) else {
                return nil
            }
            return arView.session.raycast(query).first
        }

        private func startNewMeasurement(at position: SCNVector3, source: RaycastSource, in arView: ARSCNView) {
            clearNodes()
            parent.pointA = position
            parent.pointB = nil
            parent.raycastSource = source
            markerNodeA = addMarker(at: position, in: arView)
        }

        private func completeMeasurement(at position: SCNVector3, in arView: ARSCNView) {
            parent.pointB = position
            markerNodeB = addMarker(at: position, in: arView)
            if let a = parent.pointA {
                lineNode = addLine(from: a, to: position, in: arView)
            }
        }

        private func clearNodes() {
            markerNodeA?.removeFromParentNode()
            markerNodeB?.removeFromParentNode()
            lineNode?.removeFromParentNode()
            markerNodeA = nil
            markerNodeB = nil
            lineNode = nil
        }

        private func addMarker(at position: SCNVector3, in arView: ARSCNView) -> SCNNode {
            let sphere = SCNSphere(radius: 0.006)
            sphere.firstMaterial?.diffuse.contents = UIColor.systemTeal
            sphere.firstMaterial?.lightingModel = .constant

            let node = SCNNode(geometry: sphere)
            node.position = position
            arView.scene.rootNode.addChildNode(node)
            return node
        }

        private func addLine(from a: SCNVector3, to b: SCNVector3, in arView: ARSCNView) -> SCNNode {
            let length = PointToPointMeasurement.distance(from: a, to: b)

            let cylinder = SCNCylinder(radius: 0.002, height: CGFloat(length))
            cylinder.firstMaterial?.diffuse.contents = UIColor.systemTeal
            cylinder.firstMaterial?.lightingModel = .constant

            let node = SCNNode(geometry: cylinder)
            node.position = SCNVector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
            node.simdOrientation = rotation(fromDefaultAxisTo: SIMD3<Float>(b.x - a.x, b.y - a.y, b.z - a.z))

            arView.scene.rootNode.addChildNode(node)
            return node
        }

        /// `SCNCylinder` is authored along its local +Y axis. Rotate that
        /// axis onto the vector between the two tapped points using a
        /// shortest-arc quaternion rather than Euler angles, which avoids
        /// gimbal-lock artifacts when the line is near-vertical.
        private func rotation(fromDefaultAxisTo target: SIMD3<Float>) -> simd_quatf {
            let length = simd_length(target)
            guard length > 0 else { return simd_quatf(angle: 0, axis: SIMD3<Float>(1, 0, 0)) }

            let up = SIMD3<Float>(0, 1, 0)
            let direction = target / length
            let dot = simd_dot(up, direction)

            if dot > 0.9999 {
                return simd_quatf(angle: 0, axis: SIMD3<Float>(1, 0, 0))
            }
            if dot < -0.9999 {
                return simd_quatf(angle: .pi, axis: SIMD3<Float>(1, 0, 0))
            }

            let axis = simd_normalize(simd_cross(up, direction))
            let angle = acos(min(max(dot, -1), 1))
            return simd_quatf(angle: angle, axis: axis)
        }
    }
}
