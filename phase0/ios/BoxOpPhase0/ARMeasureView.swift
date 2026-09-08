import ARKit
import SceneKit
import SwiftUI
import Vision
import simd

/// Continuous multi-point AR measurement surface. While `state == .measuring`
/// this raycasts from the screen-center reticle on every AR frame, shows a
/// live tentative point/segment, and lets the host screen append it to
/// `measurement.confirmedPoints` (an unlimited, ordered polyline — see
/// `MultiPointMeasurement.swift`). This view owns only the AR scene and the
/// continuous raycast; `ARMeasureScreen` owns the state machine and buttons.
///
/// In `.length` mode, before any point has been placed, this also runs
/// `Vision`'s `VNDetectRectanglesRequest` against the camera feed and, when
/// a rectangle is found and all four corners raycast onto real geometry,
/// shows it as a yellow suggested outline; a double-tap accepts it via
/// `onAcceptSuggestedRectangle`, which the host screen uses to add all four
/// points and close the shape in one step — per explicit user request
/// ("si el sensor o la cámara identifican una figura debería sugerirla y
/// con un doble tap se tome la medida en automático").
struct ARMeasureView: UIViewRepresentable {
    let state: ARMeasureState
    let measurement: MultiPointMeasurement
    let toolMode: MeasureToolMode
    @Binding var livePoint: SIMD3<Float>?
    @Binding var raycastSource: RaycastSource?
    var onAcceptSuggestedRectangle: (([SIMD3<Float>]) -> Void)?

    func makeUIView(context: Context) -> ARSCNView {
        let arView = ARSCNView(frame: .zero)
        arView.autoenablesDefaultLighting = true
        arView.session.delegate = context.coordinator

        let configuration = ARWorldTrackingConfiguration()
        configuration.planeDetection = [.horizontal, .vertical]
        arView.session.run(configuration)

        let doubleTap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleDoubleTap))
        doubleTap.numberOfTapsRequired = 2
        arView.addGestureRecognizer(doubleTap)

        context.coordinator.arView = arView
        return arView
    }

    func updateUIView(_ uiView: ARSCNView, context: Context) {
        context.coordinator.parent = self
        context.coordinator.syncConfirmedNodes()
        if state != .measuring {
            context.coordinator.hideLiveVisuals()
        }
        if toolMode != .length || !measurement.isEmpty || state != .measuring {
            context.coordinator.clearSuggestion()
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
        private var confirmedLabelNodes: [SCNNode] = []
        private var renderedPoints: [SIMD3<Float>] = []
        private var renderedIsClosed = false
        private var renderedHeightPoint: SIMD3<Float>?

        private var liveMarkerNode: SCNNode?
        private var liveSegmentNode: SCNNode?
        private var liveLabelNode: SCNNode?
        private var liveAngleLabelNode: SCNNode?

        private var suggestionMarkerNodes: [SCNNode] = []
        private var suggestionSegmentNodes: [SCNNode] = []
        private var suggestionLabelNode: SCNNode?
        private var suggestedCorners: [SIMD3<Float>]?
        private var isDetectingRectangle = false
        private var lastDetectionTime: CFTimeInterval = 0

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

            if parent.toolMode == .length, parent.measurement.isEmpty {
                detectRectangleIfNeeded(in: frame, arView: arView)
            }
        }

        // MARK: - Camera-based rectangle suggestion (Vision)

        /// Runs `VNDetectRectanglesRequest` on the current camera frame, at
        /// most a few times per second (Apple's own guidance for Vision
        /// requests during an AR session is "no more than 10 times per
        /// second" to avoid hurting frame rate), and only one request in
        /// flight at a time.
        private func detectRectangleIfNeeded(in frame: ARFrame, arView: ARSCNView) {
            guard !isDetectingRectangle else { return }
            let now = CACurrentMediaTime()
            guard now - lastDetectionTime > 0.3 else { return }
            lastDetectionTime = now
            isDetectingRectangle = true

            let pixelBuffer = frame.capturedImage
            let request = VNDetectRectanglesRequest { [weak self] request, _ in
                defer { self?.isDetectingRectangle = false }
                guard let self else { return }
                guard let observation = (request.results as? [VNRectangleObservation])?.first else {
                    DispatchQueue.main.async { self.clearSuggestion() }
                    return
                }
                self.raycastDetectedRectangle(observation, arView: arView)
            }
            request.maximumObservations = 1
            request.minimumConfidence = 0.8
            request.minimumAspectRatio = 0.2

            // The app is portrait-only (see the target's deployment info),
            // so the back camera's landscape sensor buffer is always
            // rotated the same way -- .right is the standard orientation
            // for a portrait UI with the back camera.
            let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .right, options: [:])
            DispatchQueue.global(qos: .userInitiated).async {
                try? handler.perform([request])
            }
        }

        /// Converts the detected rectangle's four corners (normalized to
        /// the *captured image*, not the screen) into view-space points via
        /// `ARFrame.displayTransform`, then raycasts each one the same way
        /// the center reticle does. Only shows a suggestion if all four
        /// corners land on real geometry -- a partial rectangle would be a
        /// confusing, unmeasurable suggestion.
        private func raycastDetectedRectangle(_ observation: VNRectangleObservation, arView: ARSCNView) {
            guard let frame = arView.session.currentFrame else { return }
            let viewportSize = arView.bounds.size
            guard viewportSize.width > 0, viewportSize.height > 0 else { return }

            let displayTransform = frame.displayTransform(for: .portrait, viewportSize: viewportSize)
            let scaleTransform = CGAffineTransform(scaleX: viewportSize.width, y: viewportSize.height)
            let normalizedCorners = [
                observation.topLeft, observation.topRight, observation.bottomRight, observation.bottomLeft
            ]

            var worldCorners: [SIMD3<Float>] = []
            for corner in normalizedCorners {
                let screenPoint = corner.applying(displayTransform).applying(scaleTransform)
                guard let query = arView.raycastQuery(from: screenPoint, allowing: .existingPlaneGeometry, alignment: .any),
                      let result = arView.session.raycast(query).first else {
                    DispatchQueue.main.async { self.clearSuggestion() }
                    return
                }
                worldCorners.append(position(from: result))
            }

            DispatchQueue.main.async {
                self.showSuggestion(corners: worldCorners, in: arView)
            }
        }

        private func showSuggestion(corners: [SIMD3<Float>], in arView: ARSCNView) {
            clearSuggestion()
            suggestedCorners = corners

            for corner in corners {
                suggestionMarkerNodes.append(addMarker(at: corner, in: arView, color: .systemYellow, opacity: 0.9))
            }
            for i in 0 ..< corners.count {
                let a = corners[i]
                let b = corners[(i + 1) % corners.count]
                suggestionSegmentNodes.append(addLine(from: a, to: b, in: arView, color: .systemYellow, opacity: 0.9))
            }
            suggestionLabelNode = addLabel(
                text: "Double-tap to measure",
                at: PolygonGeometry.centroid(of: corners) + SIMD3<Float>(0, 0.02, 0),
                in: arView,
                color: .systemYellow
            )
        }

        func clearSuggestion() {
            suggestionMarkerNodes.forEach { $0.removeFromParentNode() }
            suggestionSegmentNodes.forEach { $0.removeFromParentNode() }
            suggestionLabelNode?.removeFromParentNode()
            suggestionMarkerNodes.removeAll()
            suggestionSegmentNodes.removeAll()
            suggestionLabelNode = nil
            suggestedCorners = nil
        }

        @objc func handleDoubleTap() {
            guard let corners = suggestedCorners else { return }
            parent.onAcceptSuggestedRectangle?(corners)
            clearSuggestion()
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

        // MARK: - Confirmed geometry (rebuilt whenever points/closed/height change)

        func syncConfirmedNodes() {
            guard let arView = arView else { return }
            let measurement = parent.measurement
            let currentPoints = measurement.confirmedPoints

            let needsRebuild = currentPoints != renderedPoints
                || measurement.isClosed != renderedIsClosed
                || measurement.heightPoint != renderedHeightPoint
            guard needsRebuild else { return }

            confirmedMarkerNodes.forEach { $0.removeFromParentNode() }
            confirmedSegmentNodes.forEach { $0.removeFromParentNode() }
            confirmedLabelNodes.forEach { $0.removeFromParentNode() }
            confirmedMarkerNodes.removeAll()
            confirmedSegmentNodes.removeAll()
            confirmedLabelNodes.removeAll()

            for point in currentPoints {
                confirmedMarkerNodes.append(addMarker(at: point, in: arView, color: .systemTeal, opacity: 1.0))
            }
            for i in 0 ..< max(0, currentPoints.count - 1) {
                let a = currentPoints[i]
                let b = currentPoints[i + 1]
                confirmedSegmentNodes.append(addLine(from: a, to: b, in: arView, color: .systemTeal, opacity: 1.0))
                confirmedLabelNodes.append(addLabel(
                    text: UnitFormatting.feetAndInches(meters: simd_distance(a, b)),
                    at: labelPosition(from: a, to: b),
                    in: arView,
                    color: .white
                ))
            }
            if parent.toolMode == .angle, currentPoints.count == 3, let angle = measurement.interiorAngles.first {
                // The dedicated Angle tool's vertex is the middle point
                // (ray-endpoint, vertex, ray-endpoint) -- same convention
                // `PolygonGeometry.interiorAngles` already uses for an open
                // 3-point line. Floats the angle in-scene at the vertex,
                // matching how every segment already gets its own label.
                confirmedLabelNodes.append(addLabel(
                    text: String(format: "%.1f\u{00B0}", angle),
                    at: currentPoints[1] + SIMD3<Float>(0, 0.03, 0),
                    in: arView,
                    color: .systemYellow
                ))
            }
            if measurement.isClosed, currentPoints.count >= 3,
               let first = currentPoints.first, let last = currentPoints.last {
                confirmedSegmentNodes.append(addLine(from: last, to: first, in: arView, color: .systemTeal, opacity: 1.0))
                confirmedLabelNodes.append(addLabel(
                    text: UnitFormatting.feetAndInches(meters: simd_distance(last, first)),
                    at: labelPosition(from: last, to: first),
                    in: arView,
                    color: .white
                ))
            }
            if let heightPoint = measurement.heightPoint, currentPoints.count >= 3 {
                confirmedMarkerNodes.append(addMarker(at: heightPoint, in: arView, color: .systemOrange, opacity: 1.0))
                let footpoint = PolygonGeometry.footpoint(of: heightPoint, onPlaneOf: currentPoints)
                confirmedSegmentNodes.append(addLine(from: footpoint, to: heightPoint, in: arView, color: .systemOrange, opacity: 1.0))
                confirmedLabelNodes.append(addLabel(
                    text: UnitFormatting.feetAndInches(meters: simd_distance(footpoint, heightPoint)),
                    at: labelPosition(from: footpoint, to: heightPoint),
                    in: arView,
                    color: .systemOrange
                ))

                // Full wireframe box/prism: extrude every base corner by
                // the same offset that carries the base plane to the
                // height point, then draw the resulting top face and
                // vertical edges -- turns the single height line above
                // into a complete labeled "Cube" (works for any closed
                // base, not just a 4-point rectangle).
                let topCorners = PolygonGeometry.extrudedCorners(of: currentPoints, toward: heightPoint)
                for corner in topCorners {
                    confirmedMarkerNodes.append(addMarker(at: corner, in: arView, color: .systemOrange, opacity: 1.0))
                }
                for i in 0 ..< topCorners.count {
                    let a = topCorners[i]
                    let b = topCorners[(i + 1) % topCorners.count]
                    confirmedSegmentNodes.append(addLine(from: a, to: b, in: arView, color: .systemOrange, opacity: 1.0))
                    confirmedLabelNodes.append(addLabel(
                        text: UnitFormatting.feetAndInches(meters: simd_distance(a, b)),
                        at: labelPosition(from: a, to: b),
                        in: arView,
                        color: .systemOrange
                    ))
                }
                for i in 0 ..< currentPoints.count {
                    let base = currentPoints[i]
                    let top = topCorners[i]
                    confirmedSegmentNodes.append(addLine(from: base, to: top, in: arView, color: .systemOrange, opacity: 1.0))
                    confirmedLabelNodes.append(addLabel(
                        text: UnitFormatting.feetAndInches(meters: simd_distance(base, top)),
                        at: labelPosition(from: base, to: top),
                        in: arView,
                        color: .systemOrange
                    ))
                }
            }

            renderedPoints = currentPoints
            renderedIsClosed = measurement.isClosed
            renderedHeightPoint = measurement.heightPoint
        }

        // MARK: - Live (tentative) geometry, updated in place every frame

        func showLiveVisuals(at position: SIMD3<Float>, in arView: ARSCNView) {
            if let liveMarkerNode {
                liveMarkerNode.simdPosition = position
            } else {
                liveMarkerNode = addMarker(at: position, in: arView, color: .white, opacity: 0.85)
            }

            let measurement = parent.measurement
            let liveSegmentEndpoints: (from: SIMD3<Float>, to: SIMD3<Float>)?
            if measurement.isClosed {
                // Waiting for the height point: preview the perpendicular
                // segment from the reticle down/up to the base plane.
                if measurement.heightPoint == nil, measurement.confirmedPoints.count >= 3 {
                    let footpoint = PolygonGeometry.footpoint(of: position, onPlaneOf: measurement.confirmedPoints)
                    liveSegmentEndpoints = (footpoint, position)
                } else {
                    liveSegmentEndpoints = nil
                }
            } else if let lastConfirmed = measurement.lastPoint {
                liveSegmentEndpoints = (lastConfirmed, position)
            } else {
                liveSegmentEndpoints = nil
            }

            guard let (from, to) = liveSegmentEndpoints else {
                liveSegmentNode?.removeFromParentNode()
                liveLabelNode?.removeFromParentNode()
                liveSegmentNode = nil
                liveLabelNode = nil
                return
            }

            if let liveSegmentNode {
                updateLine(liveSegmentNode, from: from, to: to)
            } else {
                liveSegmentNode = addLine(from: from, to: to, in: arView, color: .white, opacity: 0.6)
            }

            let liveText = UnitFormatting.feetAndInches(meters: simd_distance(from, to))
            if let liveLabelNode {
                updateLabel(liveLabelNode, text: liveText, at: labelPosition(from: from, to: to))
            } else {
                liveLabelNode = addLabel(text: liveText, at: labelPosition(from: from, to: to), in: arView, color: .yellow)
            }

            // Angle tool: while aiming the second ray (vertex already
            // confirmed), float the live angle at the vertex itself --
            // same idea as the live segment label above, just for the
            // angle instead of a length.
            if parent.toolMode == .angle, let liveAngle = measurement.liveAngleAtLastPoint(with: position),
               let vertex = measurement.lastPoint {
                let angleText = String(format: "%.1f\u{00B0}", liveAngle)
                let vertexLabelPosition = vertex + SIMD3<Float>(0, 0.03, 0)
                if let liveAngleLabelNode {
                    updateLabel(liveAngleLabelNode, text: angleText, at: vertexLabelPosition)
                } else {
                    liveAngleLabelNode = addLabel(text: angleText, at: vertexLabelPosition, in: arView, color: .systemYellow)
                }
            } else {
                liveAngleLabelNode?.removeFromParentNode()
                liveAngleLabelNode = nil
            }
        }

        func hideLiveVisuals() {
            liveMarkerNode?.removeFromParentNode()
            liveSegmentNode?.removeFromParentNode()
            liveLabelNode?.removeFromParentNode()
            liveAngleLabelNode?.removeFromParentNode()
            liveMarkerNode = nil
            liveSegmentNode = nil
            liveLabelNode = nil
            liveAngleLabelNode = nil
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

        /// World-space point a text label for a segment should sit at: the
        /// midpoint, nudged up slightly so it doesn't overlap the line
        /// itself.
        private func labelPosition(from a: SIMD3<Float>, to b: SIMD3<Float>) -> SIMD3<Float> {
            (a + b) / 2 + SIMD3<Float>(0, 0.015, 0)
        }

        /// A small always-camera-facing text label showing a segment's
        /// length, per-segment in-scene (not just the bottom result cards).
        /// `SCNText` is authored in point-sized local units, so the node is
        /// scaled down to a real-world size; a `SCNBillboardConstraint`
        /// keeps it legible regardless of viewing angle.
        private func addLabel(text: String, at position: SIMD3<Float>, in arView: ARSCNView, color: UIColor) -> SCNNode {
            let textGeometry = SCNText(string: text, extrusionDepth: 0)
            textGeometry.font = UIFont.systemFont(ofSize: 10, weight: .semibold)
            textGeometry.flatness = 0.2
            textGeometry.firstMaterial?.diffuse.contents = color
            textGeometry.firstMaterial?.lightingModel = .constant
            textGeometry.firstMaterial?.isDoubleSided = true

            let node = SCNNode(geometry: textGeometry)
            node.scale = SCNVector3(0.0012, 0.0012, 0.0012)
            node.simdPosition = position
            node.constraints = [SCNBillboardConstraint()]
            centerTextPivot(node)
            arView.scene.rootNode.addChildNode(node)
            return node
        }

        /// Updates an existing label's text/position in place rather than
        /// recreating the node -- called every AR frame for the live
        /// segment's label, so it skips re-centering the pivot unless the
        /// displayed string actually changed.
        private func updateLabel(_ node: SCNNode, text: String, at position: SIMD3<Float>) {
            node.simdPosition = position
            guard let textGeometry = node.geometry as? SCNText,
                  (textGeometry.string as? String) != text else { return }
            textGeometry.string = text
            centerTextPivot(node)
        }

        /// `SCNText` draws starting at its local origin, so a fresh node's
        /// text trails off to one side of `position`. Re-centering the
        /// pivot on the text's own bounding box anchors it on `position`
        /// instead.
        private func centerTextPivot(_ node: SCNNode) {
            let (min, max) = node.boundingBox
            let dx = (max.x - min.x) / 2 + min.x
            let dy = (max.y - min.y) / 2 + min.y
            node.pivot = SCNMatrix4MakeTranslation(dx, dy, 0)
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
