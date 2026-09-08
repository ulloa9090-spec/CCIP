import simd

/// Where the current live point's 3D position came from. Per
/// `docs/21_AR_MEASUREMENT_SYSTEM.md` ("Raycast / hit test": "Store the
/// source type").
enum RaycastSource: String {
    case existingPlaneGeometry
    case estimatedPlane
}

/// Screen-level state machine for the AR measurement flow. `idle` shows
/// only a reticle and a Start button; `measuring` runs the continuous
/// raycast and exposes the full point/segment toolbar; `finished` freezes
/// the geometry in place.
enum ARMeasureState: Equatable {
    case idle
    case measuring
    case finished
}

/// An ordered polyline of confirmed 3D points: `P0 -> P1 -> P2 -> ...`,
/// with no fixed count and no `pointA`/`pointB`/`pointC` fields — see
/// `docs/21_AR_MEASUREMENT_SYSTEM.md` "Core modes" > Polyline.
///
/// Beyond the open polyline (segment/total distance), this also supports
/// closing the polyline into a polygon (perimeter, area, rectangle
/// detection, interior angles) and, once closed, capturing one extra
/// height point to derive a volume (`area × height`) — the same pattern
/// Apple's Measure app uses for room volume, per user decision. Rectangle
/// detection, area and volume math live in `PolygonGeometry.swift`, kept
/// separate so this type stays focused on point/state bookkeeping.
struct MultiPointMeasurement {
    private(set) var confirmedPoints: [SIMD3<Float>] = []
    private(set) var isClosed = false
    private(set) var heightPoint: SIMD3<Float>?

    var pointCount: Int { confirmedPoints.count }
    var isEmpty: Bool { confirmedPoints.isEmpty }
    var lastPoint: SIMD3<Float>? { confirmedPoints.last }

    /// Available once there are enough points to form a shape and it
    /// isn't already closed.
    var canClose: Bool { confirmedPoints.count >= 3 && !isClosed }

    mutating func addPoint(_ point: SIMD3<Float>) {
        guard !isClosed else { return }
        confirmedPoints.append(point)
    }

    mutating func closeShape() {
        guard canClose else { return }
        isClosed = true
    }

    mutating func setHeightPoint(_ point: SIMD3<Float>) {
        guard isClosed, heightPoint == nil else { return }
        heightPoint = point
    }

    /// Undo the most recent action, whichever stage it was in: the height
    /// point if one was set, otherwise un-closing the shape, otherwise the
    /// last confirmed base point.
    mutating func undoLast() {
        if heightPoint != nil {
            heightPoint = nil
            return
        }
        if isClosed {
            isClosed = false
            return
        }
        guard !confirmedPoints.isEmpty else { return }
        confirmedPoints.removeLast()
    }

    mutating func clear() {
        confirmedPoints.removeAll()
        isClosed = false
        heightPoint = nil
    }

    // MARK: - Open polyline (base) measurements

    /// Distance of each confirmed base segment, `P[i] -> P[i+1]`, in order.
    var segmentDistances: [Float] {
        guard confirmedPoints.count > 1 else { return [] }
        return (0 ..< confirmedPoints.count - 1).map {
            simd_distance(confirmedPoints[$0], confirmedPoints[$0 + 1])
        }
    }

    var totalDistance: Float {
        segmentDistances.reduce(0, +)
    }

    func liveSegmentDistance(to livePoint: SIMD3<Float>) -> Float? {
        guard !isClosed, let last = lastPoint else { return nil }
        return simd_distance(last, livePoint)
    }

    /// Total distance including the not-yet-confirmed live segment, for a
    /// running "if I confirmed right now" readout.
    func liveTotalDistance(includingLivePoint livePoint: SIMD3<Float>?) -> Float {
        guard let livePoint, let liveSegment = liveSegmentDistance(to: livePoint) else {
            return totalDistance
        }
        return totalDistance + liveSegment
    }

    /// Interior angle (degrees) at the last confirmed point, previewing
    /// what it would become if `livePoint` were confirmed next. Only
    /// meaningful while still building the open base (need a point before
    /// the last one to form an angle).
    func liveAngleAtLastPoint(with livePoint: SIMD3<Float>) -> Float? {
        guard !isClosed, confirmedPoints.count >= 2, let last = lastPoint else { return nil }
        let previous = confirmedPoints[confirmedPoints.count - 2]
        return PolygonGeometry.angleDegrees(at: last, previous: previous, next: livePoint)
    }

    // MARK: - Closed shape measurements

    var closingSegmentDistance: Float? {
        guard isClosed, let first = confirmedPoints.first, let last = confirmedPoints.last else { return nil }
        return simd_distance(last, first)
    }

    var perimeter: Float? {
        guard isClosed, let closing = closingSegmentDistance else { return nil }
        return totalDistance + closing
    }

    var area: Float? {
        guard isClosed, confirmedPoints.count >= 3 else { return nil }
        return PolygonGeometry.area(of: confirmedPoints)
    }

    /// RMS distance of the base points from their own best-fit plane, in
    /// meters — surface this to the user rather than hiding it; a large
    /// value means the area/rectangle result below is approximate.
    var planarityDeviation: Float? {
        guard isClosed, confirmedPoints.count >= 3 else { return nil }
        return PolygonGeometry.planarityDeviation(of: confirmedPoints)
    }

    var interiorAngles: [Float] {
        PolygonGeometry.interiorAngles(points: confirmedPoints, closed: isClosed)
    }

    var rectangleCheck: PolygonGeometry.RectangleCheck? {
        guard isClosed else { return nil }
        return PolygonGeometry.rectangleCheck(points: confirmedPoints)
    }

    /// Only meaningful for a closed 3-point shape (see `PolygonGeometry
    /// .triangleClassification`) -- `nil` for any other point count.
    var triangleClassification: PolygonGeometry.TriangleClassification? {
        guard isClosed else { return nil }
        return PolygonGeometry.triangleClassification(points: confirmedPoints)
    }

    /// Only meaningful for a closed shape with 5+ points -- `nil`
    /// otherwise, since fewer points can't be distinguished from a
    /// Triangle/Rectangle/generic Polygon (see `PolygonGeometry
    /// .circleCheck`).
    var circleCheck: PolygonGeometry.CircleCheck? {
        guard isClosed else { return nil }
        return PolygonGeometry.circleCheck(points: confirmedPoints)
    }

    /// `"Polyline"` while open; once closed, the most specific shape the
    /// points fit: `"Square"`/`"Rectangle"` (4 points), an equilateral/
    /// right/isosceles/generic `"Triangle"` (3 points), `"Circle"` (5+
    /// points, if they fit one), or `"Polygon"` as the fallback.
    var shapeLabel: String {
        guard isClosed else { return "Polyline" }
        if let rectangleCheck, rectangleCheck.isRectangle {
            return rectangleCheck.isSquare ? "Square" : "Rectangle"
        }
        if let triangleClassification {
            if triangleClassification.isEquilateral { return "Equilateral Triangle" }
            if triangleClassification.isRightTriangle { return "Right Triangle" }
            if triangleClassification.isIsosceles { return "Isosceles Triangle" }
            return "Triangle"
        }
        if let circleCheck, circleCheck.isCircle { return "Circle" }
        return "Polygon"
    }

    // MARK: - Height / volume

    var height: Float? {
        guard isClosed, confirmedPoints.count >= 3, let heightPoint else { return nil }
        return PolygonGeometry.perpendicularDistance(from: heightPoint, toPlaneOf: confirmedPoints)
    }

    var volume: Float? {
        guard let area, let height else { return nil }
        return area * height
    }

    /// Top-face corners of the box/prism formed by extruding the closed
    /// base straight along its own normal by the height point -- the
    /// full "Cube" wireframe (`ARMeasureView.swift` draws every edge
    /// between these and the base points), not just a single height line.
    var extrudedTopCorners: [SIMD3<Float>]? {
        guard isClosed, confirmedPoints.count >= 3, let heightPoint else { return nil }
        return PolygonGeometry.extrudedCorners(of: confirmedPoints, toward: heightPoint)
    }

    /// Live preview of `height`/would-be volume using a not-yet-confirmed
    /// point, shown while closed and waiting for the height point.
    func liveHeight(with livePoint: SIMD3<Float>) -> Float? {
        guard isClosed, heightPoint == nil, confirmedPoints.count >= 3 else { return nil }
        return PolygonGeometry.perpendicularDistance(from: livePoint, toPlaneOf: confirmedPoints)
    }

    func liveVolume(with livePoint: SIMD3<Float>) -> Float? {
        guard let area, let liveHeight = liveHeight(with: livePoint) else { return nil }
        return area * liveHeight
    }

    // MARK: - Dedicated Height tool (2-point: base, then top)

    /// Vertical height between the base point (`confirmedPoints[0]`) and
    /// the top point (`confirmedPoints[1]`) for the dedicated Height
    /// tool -- `docs/25_MEASUREMENT_TOOLS_CATALOG.md` section 5: "use
    /// gravity/world-up constraints when valid". ARKit's default
    /// `.gravity` world alignment already makes the world Y axis
    /// vertical, so the vertical component is just the Y difference, not
    /// the raw 3D distance between the two taps (which would also
    /// include any horizontal drift between them).
    var verticalHeight: Float? {
        guard confirmedPoints.count == 2 else { return nil }
        return abs(confirmedPoints[1].y - confirmedPoints[0].y)
    }

    /// How far the top point drifted sideways from directly above/below
    /// the base point. There's no drag-to-correct in this AR prototype,
    /// so the catalog's "allow manual correction when automatic vertical
    /// alignment is uncertain" becomes: surface this number so the user
    /// can judge it and Undo/re-tap if it's too large, rather than
    /// silently folding it into a single diagonal distance.
    var horizontalOffset: Float? {
        guard confirmedPoints.count == 2 else { return nil }
        let dx = confirmedPoints[1].x - confirmedPoints[0].x
        let dz = confirmedPoints[1].z - confirmedPoints[0].z
        return sqrt(dx * dx + dz * dz)
    }

    /// Live vertical height while aiming the top point, previewing what
    /// `verticalHeight` would become if `livePoint` were confirmed next.
    func liveVerticalHeight(with livePoint: SIMD3<Float>) -> Float? {
        guard confirmedPoints.count == 1, let base = confirmedPoints.first else { return nil }
        return abs(livePoint.y - base.y)
    }
}
