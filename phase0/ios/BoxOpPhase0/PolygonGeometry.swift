import simd

/// Pure 3D polygon math for the closed-shape extensions to
/// `MultiPointMeasurement` (Close Shape, Area, Rectangle detection,
/// Angle, Volume). No ARKit/SceneKit types, so it's unit-testable on its
/// own once a test target exists, same rationale as
/// `MultiPointMeasurement`'s distance functions.
///
/// Real-world tapped/raycast points are never perfectly coplanar, so every
/// function here works from a best-fit plane (via Newell's method) rather
/// than assuming exact planarity — see `planarityDeviation` for a
/// confidence signal callers should surface rather than hide, per
/// `docs/25_MEASUREMENT_TOOLS_CATALOG.md` ("Validate planarity").
enum PolygonGeometry {
    /// Newell's method: a robust polygon normal even when points are only
    /// approximately coplanar. Its length encodes twice the planar area
    /// (the 3D generalization of the 2D shoelace formula).
    static func normal(of points: [SIMD3<Float>]) -> SIMD3<Float> {
        guard points.count >= 3 else { return SIMD3<Float>(repeating: 0) }
        var n = SIMD3<Float>(repeating: 0)
        for i in 0 ..< points.count {
            let current = points[i]
            let next = points[(i + 1) % points.count]
            n.x += (current.y - next.y) * (current.z + next.z)
            n.y += (current.z - next.z) * (current.x + next.x)
            n.z += (current.x - next.x) * (current.y + next.y)
        }
        return n
    }

    /// Planar area of a closed polygon, in square meters.
    static func area(of points: [SIMD3<Float>]) -> Float {
        simd_length(normal(of: points)) / 2
    }

    static func centroid(of points: [SIMD3<Float>]) -> SIMD3<Float> {
        guard !points.isEmpty else { return SIMD3<Float>(repeating: 0) }
        return points.reduce(SIMD3<Float>(repeating: 0), +) / Float(points.count)
    }

    /// Root-mean-square perpendicular distance of the points from their
    /// own best-fit plane, in meters — a planarity/confidence signal.
    /// Callers should surface this (e.g. "area is approximate") rather
    /// than silently trust the area on a poorly-planar shape.
    static func planarityDeviation(of points: [SIMD3<Float>]) -> Float {
        guard points.count >= 3 else { return 0 }
        let n = normal(of: points)
        let length = simd_length(n)
        guard length > 0 else { return 0 }
        let unitNormal = n / length
        let center = centroid(of: points)
        let squaredDistances = points.map { point -> Float in
            let d = simd_dot(point - center, unitNormal)
            return d * d
        }
        let meanSquared = squaredDistances.reduce(0, +) / Float(points.count)
        return meanSquared.squareRoot()
    }

    /// Where `point` lands if dropped perpendicularly onto the best-fit
    /// plane of `basePoints`.
    static func footpoint(of point: SIMD3<Float>, onPlaneOf basePoints: [SIMD3<Float>]) -> SIMD3<Float> {
        let n = normal(of: basePoints)
        let length = simd_length(n)
        guard length > 0 else { return point }
        let unitNormal = n / length
        let center = centroid(of: basePoints)
        let signedDistance = simd_dot(point - center, unitNormal)
        return point - unitNormal * signedDistance
    }

    /// Perpendicular distance from `point` to the best-fit plane of
    /// `basePoints` — the "height" for a base-shape + height-point volume.
    static func perpendicularDistance(from point: SIMD3<Float>, toPlaneOf basePoints: [SIMD3<Float>]) -> Float {
        simd_distance(point, footpoint(of: point, onPlaneOf: basePoints))
    }

    /// Interior angle in degrees at `vertex`, formed by its two neighbors.
    static func angleDegrees(at vertex: SIMD3<Float>, previous: SIMD3<Float>, next: SIMD3<Float>) -> Float {
        let u = previous - vertex
        let v = next - vertex
        let lu = simd_length(u)
        let lv = simd_length(v)
        guard lu > 0, lv > 0 else { return 0 }
        let cosine = min(max(simd_dot(u, v) / (lu * lv), -1), 1)
        return acos(cosine) * 180 / .pi
    }

    /// Interior angles (degrees), one per vertex. For a closed polygon
    /// every vertex has one (wrapping around); for an open polyline the
    /// first and last points have no defined interior angle and are
    /// omitted.
    static func interiorAngles(points: [SIMD3<Float>], closed: Bool) -> [Float] {
        guard points.count >= 3 else { return [] }
        if closed {
            return (0 ..< points.count).map { i in
                let previous = points[(i - 1 + points.count) % points.count]
                let next = points[(i + 1) % points.count]
                return angleDegrees(at: points[i], previous: previous, next: next)
            }
        }
        return (1 ..< points.count - 1).map { i in
            angleDegrees(at: points[i], previous: points[i - 1], next: points[i + 1])
        }
    }

    /// Result of checking whether a closed 4-point shape is (approximately)
    /// a rectangle: opposite sides similar in length and interior angles
    /// close to 90°. Per `docs/25_MEASUREMENT_TOOLS_CATALOG.md` section 10
    /// ("Validate coplanarity and rectangular consistency").
    struct RectangleCheck {
        let isRectangle: Bool
        let length: Float
        let width: Float
        /// A rectangle whose length and width are also approximately
        /// equal, within the same `sideTolerance` used for the opposite
        /// sides above.
        let isSquare: Bool
    }

    static func rectangleCheck(
        points: [SIMD3<Float>],
        sideTolerance: Float = 0.08,
        angleToleranceDegrees: Float = 6
    ) -> RectangleCheck? {
        guard points.count == 4 else { return nil }

        let sides = (0 ..< 4).map { simd_distance(points[$0], points[($0 + 1) % 4]) }
        let angles = interiorAngles(points: points, closed: true)
        let anglesOK = angles.allSatisfy { abs($0 - 90) <= angleToleranceDegrees }

        func approxEqual(_ a: Float, _ b: Float) -> Bool {
            guard max(a, b) > 0 else { return true }
            return abs(a - b) / max(a, b) <= sideTolerance
        }
        let sidesOK = approxEqual(sides[0], sides[2]) && approxEqual(sides[1], sides[3])
        let isRectangle = anglesOK && sidesOK
        let length = max(sides[0], sides[1])
        let width = min(sides[0], sides[1])

        return RectangleCheck(
            isRectangle: isRectangle,
            length: length,
            width: width,
            isSquare: isRectangle && approxEqual(length, width)
        )
    }

    /// Classification of a closed 3-point shape by side/angle shape,
    /// independent of the Rectangle path above (which only applies to
    /// exactly 4 points). A triangle can be more than one of these at
    /// once (an equilateral triangle is also isosceles); callers pick
    /// whichever is most specific for display.
    struct TriangleClassification {
        let isEquilateral: Bool
        let isIsosceles: Bool
        let isRightTriangle: Bool
    }

    static func triangleClassification(
        points: [SIMD3<Float>],
        sideTolerance: Float = 0.08,
        angleToleranceDegrees: Float = 6
    ) -> TriangleClassification? {
        guard points.count == 3 else { return nil }

        let sides = (0 ..< 3).map { simd_distance(points[$0], points[($0 + 1) % 3]) }
        let angles = interiorAngles(points: points, closed: true)

        func approxEqual(_ a: Float, _ b: Float) -> Bool {
            guard max(a, b) > 0 else { return true }
            return abs(a - b) / max(a, b) <= sideTolerance
        }
        let equalSidePairs = [
            approxEqual(sides[0], sides[1]),
            approxEqual(sides[1], sides[2]),
            approxEqual(sides[0], sides[2])
        ]
        let equalSideCount = equalSidePairs.filter { $0 }.count

        return TriangleClassification(
            isEquilateral: equalSideCount == 3,
            isIsosceles: equalSideCount >= 1,
            isRightTriangle: angles.contains { abs($0 - 90) <= angleToleranceDegrees }
        )
    }

    /// Result of checking whether a closed shape's points lie
    /// approximately on a common circle around their centroid: every
    /// point's distance from the centroid ("radius") stays within
    /// `radiusTolerance` of the mean. Requires at least 5 points --
    /// fewer than that overlaps with Triangle/Rectangle detection above
    /// and isn't enough to distinguish a circle from an arbitrary
    /// polygon.
    struct CircleCheck {
        let isCircle: Bool
        let radius: Float
    }

    static func circleCheck(points: [SIMD3<Float>], radiusTolerance: Float = 0.08) -> CircleCheck? {
        guard points.count >= 5 else { return nil }

        let center = centroid(of: points)
        let radii = points.map { simd_distance($0, center) }
        let meanRadius = radii.reduce(0, +) / Float(radii.count)
        guard meanRadius > 0 else { return CircleCheck(isCircle: false, radius: 0) }

        let maxDeviation = radii.map { abs($0 - meanRadius) / meanRadius }.max() ?? 0
        return CircleCheck(isCircle: maxDeviation <= radiusTolerance, radius: meanRadius)
    }
}
