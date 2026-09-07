import ARKit
import SceneKit
import SwiftUI
import simd

/// Continuous multi-point AR measurement surface. While `state == .measuring`
/// this raycasts from the screen-center reticle on every AR frame, shows a
/// live tentative point/segment, and lets the host screen append it to
/// `measurement.confirmedPoints` (an unlimited, ordered polyline — see
/// `MultiPointMeasurement.swift`). This view owns only the AR scene and the
/// continuous raycast; `ARMeasureScreen` owns the state machine and buttons.
struct ARMeasureView: UIViewRepresentable {
    let state: ARMeasureState
    let measurement: MultiPointMeasurement
    @Binding var livePoint: SIMD3<Float>?
    @Binding var raycastSource: RaycastSource?

    func makeUIView(context: Context) -> ARSCNView {
        let arView = ARSCNView(frame: .zero)
        arView.autoenablesDefaultLighting = true
        arView.session.delegate = context.coordinator

        let configuration = ARWorldTrackingConfiguration()
        configuration.planeDetection = [.horizontal, .vertical]
        arView.session.run(configuration)

        context.coordinator.arView = arView
        return arView
    }

    func updateUIView(_ uiView: ARSCNView, context: Context) {
        context.coordinator.parent = self
        context.coordinator.syncConfirmedNodes()
        if state != .measuring {
            context.coordinator.hideLiveVisuals()
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    final class Coordinator: NSObject, ARSessionDelegate {
        var parent: ARMeasureView
        weak var arView: ARSCNView?

        private var confirmedMarkerNodes: [SCNNode] = []
        private var confirmedSegmentNodes: [SCNNode] = []
        private var renderedPoints: [SIMD3<Float>] = []

        private var liveMarkerNode: SCNNode?
        private var liveSegmentNode: SCNNode?

        init(parent: ARMeasureView) {
            self.parent = parent
        }

        // MARK: - Continuous raycast

        func session(_ session: ARSession, didUpdate frame: ARFrame) {
            guard parent.state == .measuring, let arView = arView else {
                hideLiveVisuals()
                return
            }

            guard let hit = reticleRaycast(in: arView) else {
                parent.livePoint = nil
                parent.raycastSource = nil
                hideLiveVisuals()
                return
            }

            parent.livePoint = hit.position
            parent.raycastSource = hit.source
            showLiveVisuals(at: hit.position, in: arView)
        }

        private func reticleRaycast(in arView: ARSCNView) -> (position: SIMD3<Float>, source: RaycastSource)? {
            let center = CGPoint(x: arView.bounds.midX, y: arView.bounds.midY)

            if let query = arView.raycastQuery(from: center, allowing: .existingPlaneGeometry, alignment: .any),
               let result = arView.session.raycast(query).first {
                return (position(from: result), .existingPlaneGeometry)
            }
            if let query = arView.raycastQuery(from: center, allowing: .estimatedPlane, alignment: .any),
               let result = arView.session.raycast(query).first {
                return (position(from: result), .estimatedPlane)
            }
            return nil
        }

        private func position(from result: ARRaycastResult) -> SIMD3<Float> {
            let t = result.worldTransform
            return SIMD3<Float>(t.columns.3.x, t.columns.3.y, t.columns.3.z)
        }

        // MARK: - Confirmed geometry (rebuilt whenever the point list changes)

        func syncConfirmedNodes() {
            guard let arView = arView else { return }
            let currentPoints = parent.measurement.confirmedPoints
            guard currentPoints != renderedPoints else { return }

            confirmedMarkerNodes.forEach { $0.removeFromParentNode() }
            confirmedSegmentNodes.forEach { $0.removeFromParentNode() }
            confirmedMarkerNodes.removeAll()
            confirmedSegmentNodes.removeAll()

            for point in currentPoints {
                confirmedMarkerNodes.append(addMarker(at: point, in: arView, color: .systemTeal, opacity: 1.0))
            }
            for i in 0 ..< max(0, currentPoints.count - 1) {
                confirmedSegmentNodes.append(
                    addLine(from: currentPoints[i], to: currentPoints[i + 1], in: arView, color: .systemTeal, opacity: 1.0)
                )
            }

            renderedPoints = currentPoints
        }

        // MARK: - Live (tentative) geometry, updated in place every frame

        func showLiveVisuals(at position: SIMD3<Float>, in arView: ARSCNView) {
            if let liveMarkerNode {
                liveMarkerNode.simdPosition = position
            } else {
                liveMarkerNode = addMarker(at: position, in: arView, color: .white, opacity: 0.85)
            }

            guard let lastConfirmed = parent.measurement.lastPoint else {
                liveSegmentNode?.removeFromParentNode()
                liveSegmentNode = nil
                return
            }

            if let liveSegmentNode {
                updateLine(liveSegmentNode, from: lastConfirmed, to: position)
            } else {
                liveSegmentNode = addLine(from: lastConfirmed, to: position, in: arView, color: .white, opacity: 0.6)
            }
        }

        func hideLiveVisuals() {
            liveMarkerNode?.removeFromParentNode()
            liveSegmentNode?.removeFromParentNode()
            liveMarkerNode = nil
            liveSegmentNode = nil
        }

        // MARK: - Node builders

        private func addMarker(at position: SIMD3<Float>, in arView: ARSCNView, color: UIColor, opacity: CGFloat) -> SCNNode {
            let sphere = SCNSphere(radius: 0.006)
            sphere.firstMaterial?.diffuse.contents = color
            sphere.firstMaterial?.lightingModel = .constant

            let node = SCNNode(geometry: sphere)
            node.simdPosition = position
            node.opacity = opacity
            arView.scene.rootNode.addChildNode(node)
            return node
        }

        private func addLine(from a: SIMD3<Float>, to b: SIMD3<Float>, in arView: ARSCNView, color: UIColor, opacity: CGFloat) -> SCNNode {
            let cylinder = SCNCylinder(radius: 0.002, height: 0.001)
            cylinder.firstMaterial?.diffuse.contents = color
            cylinder.firstMaterial?.lightingModel = .constant

            let node = SCNNode(geometry: cylinder)
            node.opacity = opacity
            arView.scene.rootNode.addChildNode(node)
            updateLine(node, from: a, to: b)
            return node
        }

        /// Mutates an existing cylinder node's height/position/orientation
        /// in place, rather than recreating it — this is called every AR
        /// frame for the live segment, so it needs to be cheap.
        private func updateLine(_ node: SCNNode, from a: SIMD3<Float>, to b: SIMD3<Float>) {
            let length = simd_distance(a, b)
            (node.geometry as? SCNCylinder)?.height = CGFloat(max(length, 0.0001))
            node.simdPosition = (a + b) / 2
            node.simdOrientation = rotation(fromDefaultAxisTo: b - a)
        }

        /// `SCNCylinder` is authored along its local +Y axis. Rotate that
        /// axis onto the target vector using a shortest-arc quaternion
        /// rather than Euler angles, which avoids gimbal-lock artifacts
        /// when a segment is near-vertical.
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
