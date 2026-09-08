import XCTest
import simd
@testable import BoxOpPhase0

/// Deterministic tests against the existing `PolygonGeometry` implementation
/// (Newell's method for normal/area, centroid/footpoint for
/// height/planarity, `angleDegrees`/`interiorAngles`,
/// `rectangleCheck`). Every expected value below was hand-derived from the
/// actual algorithm as written -- not from what the algorithm "should" do --
/// so a failure here means production behavior changed, not that a test
/// assumption was wrong. Nothing in `PolygonGeometry.swift` was modified to
/// make these pass.
final class PolygonGeometryTests: XCTestCase {

    private let epsilon: Float = 0.0001

    // MARK: - Orientation (clockwise / counter-clockwise)

    func testNormalPointsPositiveZForCounterClockwiseSquare() {
        let ccwSquare: [SIMD3<Float>] = [
            SIMD3(0, 0, 0), SIMD3(1, 0, 0), SIMD3(1, 1, 0), SIMD3(0, 1, 0)
        ]
        let normal = PolygonGeometry.normal(of: ccwSquare)
        XCTAssertEqual(normal.x, 0, accuracy: epsilon)
        XCTAssertEqual(normal.y, 0, accuracy: epsilon)
        XCTAssertEqual(normal.z, 2, accuracy: epsilon)
    }

    func testNormalPointsNegativeZForClockwiseSquare() {
        let cwSquare: [SIMD3<Float>] = [
            SIMD3(0, 0, 0), SIMD3(0, 1, 0), SIMD3(1, 1, 0), SIMD3(1, 0, 0)
        ]
        let normal = PolygonGeometry.normal(of: cwSquare)
        XCTAssertEqual(normal.z, -2, accuracy: epsilon)
    }

    func testAreaIsOrientationIndependent() {
        let ccwSquare: [SIMD3<Float>] = [
            SIMD3(0, 0, 0), SIMD3(1, 0, 0), SIMD3(1, 1, 0), SIMD3(0, 1, 0)
        ]
        let cwSquare: [SIMD3<Float>] = ccwSquare.reversed()
        XCTAssertEqual(PolygonGeometry.area(of: ccwSquare), 1, accuracy: epsilon)
        XCTAssertEqual(PolygonGeometry.area(of: cwSquare), 1, accuracy: epsilon)
    }

    // MARK: - Area

    func testTriangleArea() {
        let rightTriangle: [SIMD3<Float>] = [SIMD3(0, 0, 0), SIMD3(3, 0, 0), SIMD3(0, 4, 0)]
        XCTAssertEqual(PolygonGeometry.area(of: rightTriangle), 6, accuracy: epsilon)
    }

    func testRectangleArea() {
        let rectangle: [SIMD3<Float>] = [
            SIMD3(0, 0, 0), SIMD3(4, 0, 0), SIMD3(4, 3, 0), SIMD3(0, 3, 0)
        ]
        XCTAssertEqual(PolygonGeometry.area(of: rectangle), 12, accuracy: epsilon)
    }

    // MARK: - Interior angles

    func testInteriorAnglesOfOpenPolyline() {
        let polyline: [SIMD3<Float>] = [SIMD3(0, 0, 0), SIMD3(3, 0, 0), SIMD3(3, 4, 0)]
        let angles = PolygonGeometry.interiorAngles(points: polyline, closed: false)
        XCTAssertEqual(angles.count, 1)
        XCTAssertEqual(angles[0], 90, accuracy: 0.01)
    }

    func testInteriorAnglesOfClosedRectangleAreAllNinetyDegrees() {
        let rectangle: [SIMD3<Float>] = [
            SIMD3(0, 0, 0), SIMD3(4, 0, 0), SIMD3(4, 3, 0), SIMD3(0, 3, 0)
        ]
        let angles = PolygonGeometry.interiorAngles(points: rectangle, closed: true)
        XCTAssertEqual(angles.count, 4)
        for angle in angles {
            XCTAssertEqual(angle, 90, accuracy: 0.01)
        }
    }

    // MARK: - Rectangle detection

    func testRectangleCheckAcceptsTrueRectangle() throws {
        let rectangle: [SIMD3<Float>] = [
            SIMD3(0, 0, 0), SIMD3(4, 0, 0), SIMD3(4, 3, 0), SIMD3(0, 3, 0)
        ]
        let check = try XCTUnwrap(PolygonGeometry.rectangleCheck(points: rectangle))
        XCTAssertTrue(check.isRectangle)
        XCTAssertEqual(check.length, 4, accuracy: epsilon)
        XCTAssertEqual(check.width, 3, accuracy: epsilon)
        XCTAssertFalse(check.isSquare)
    }

    func testRectangleCheckDetectsSquare() throws {
        let square: [SIMD3<Float>] = [
            SIMD3(0, 0, 0), SIMD3(3, 0, 0), SIMD3(3, 3, 0), SIMD3(0, 3, 0)
        ]
        let check = try XCTUnwrap(PolygonGeometry.rectangleCheck(points: square))
        XCTAssertTrue(check.isRectangle)
        XCTAssertTrue(check.isSquare)
    }

    func testRectangleCheckRejectsParallelogramWithNonRightAngles() {
        // Equal opposite sides (4 and sqrt(10)) but ~71.6deg/108.4deg
        // angles -- proves the check verifies angles, not just side lengths.
        let parallelogram: [SIMD3<Float>] = [
            SIMD3(0, 0, 0), SIMD3(4, 0, 0), SIMD3(5, 3, 0), SIMD3(1, 3, 0)
        ]
        let check = PolygonGeometry.rectangleCheck(points: parallelogram)
        XCTAssertEqual(check?.isRectangle, false)
    }

    func testRectangleCheckRejectsIrregularQuadrilateral() {
        let irregularQuad: [SIMD3<Float>] = [
            SIMD3(0, 0, 0), SIMD3(4, 0, 0), SIMD3(3, 2, 0), SIMD3(0, 3, 0)
        ]
        let check = PolygonGeometry.rectangleCheck(points: irregularQuad)
        XCTAssertEqual(check?.isRectangle, false)
    }

    func testRectangleCheckReturnsNilForNonQuadrilateral() {
        let triangle: [SIMD3<Float>] = [SIMD3(0, 0, 0), SIMD3(1, 0, 0), SIMD3(0, 1, 0)]
        XCTAssertNil(PolygonGeometry.rectangleCheck(points: triangle))
    }

    // MARK: - Triangle classification

    func testTriangleClassificationDetectsEquilateral() throws {
        // Side length 2; apex at (1, sqrt(3), 0) -- all three sides exactly 2.
        let equilateral: [SIMD3<Float>] = [
            SIMD3(0, 0, 0), SIMD3(2, 0, 0), SIMD3(1, Float(3).squareRoot(), 0)
        ]
        let classification = try XCTUnwrap(PolygonGeometry.triangleClassification(points: equilateral))
        XCTAssertTrue(classification.isEquilateral)
        XCTAssertTrue(classification.isIsosceles) // equilateral implies isosceles
        XCTAssertFalse(classification.isRightTriangle) // 60/60/60, not 90
    }

    func testTriangleClassificationDetectsRightTriangle() throws {
        // The 3-4-5 right triangle: scalene, with a 90deg angle at the origin.
        let rightTriangle: [SIMD3<Float>] = [SIMD3(0, 0, 0), SIMD3(3, 0, 0), SIMD3(0, 4, 0)]
        let classification = try XCTUnwrap(PolygonGeometry.triangleClassification(points: rightTriangle))
        XCTAssertTrue(classification.isRightTriangle)
        XCTAssertFalse(classification.isEquilateral)
        XCTAssertFalse(classification.isIsosceles)
    }

    func testTriangleClassificationDetectsIsoscelesNonRight() throws {
        // Symmetric triangle: base (0,0,0)-(4,0,0), apex (2,3,0) --
        // the two slanted sides are both sqrt(13), the base is 4, and no
        // angle is near 90deg (hand-verified: ~56.3/56.3/67.4deg).
        let isosceles: [SIMD3<Float>] = [SIMD3(0, 0, 0), SIMD3(4, 0, 0), SIMD3(2, 3, 0)]
        let classification = try XCTUnwrap(PolygonGeometry.triangleClassification(points: isosceles))
        XCTAssertTrue(classification.isIsosceles)
        XCTAssertFalse(classification.isEquilateral)
        XCTAssertFalse(classification.isRightTriangle)
    }

    func testTriangleClassificationDetectsScaleneNonRight() throws {
        // Hand-verified scalene triangle (sides 5, sqrt(18), sqrt(13); all
        // pairwise different beyond the 8% tolerance) with no angle near
        // 90deg (hand-verified: ~56.3/45/78.7deg).
        let scalene: [SIMD3<Float>] = [SIMD3(0, 0, 0), SIMD3(5, 0, 0), SIMD3(2, 3, 0)]
        let classification = try XCTUnwrap(PolygonGeometry.triangleClassification(points: scalene))
        XCTAssertFalse(classification.isEquilateral)
        XCTAssertFalse(classification.isIsosceles)
        XCTAssertFalse(classification.isRightTriangle)
    }

    func testTriangleClassificationReturnsNilForNonTriangle() {
        let rectangle: [SIMD3<Float>] = [
            SIMD3(0, 0, 0), SIMD3(4, 0, 0), SIMD3(4, 3, 0), SIMD3(0, 3, 0)
        ]
        XCTAssertNil(PolygonGeometry.triangleClassification(points: rectangle))
    }

    // MARK: - Circle detection

    func testCircleCheckAcceptsRegularHexagonOnACircle() throws {
        // 6 points evenly spaced on a radius-2 circle in the XY plane --
        // every point is exactly radius 2 from the centroid (0,0,0).
        let sqrt3: Float = Float(3).squareRoot()
        let hexagon: [SIMD3<Float>] = [
            SIMD3(2, 0, 0), SIMD3(1, sqrt3, 0), SIMD3(-1, sqrt3, 0),
            SIMD3(-2, 0, 0), SIMD3(-1, -sqrt3, 0), SIMD3(1, -sqrt3, 0)
        ]
        let check = try XCTUnwrap(PolygonGeometry.circleCheck(points: hexagon))
        XCTAssertTrue(check.isCircle)
        XCTAssertEqual(check.radius, 2, accuracy: epsilon)
    }

    func testCircleCheckRejectsDistortedHexagon() {
        // Same hexagon as above but one vertex dragged far out to (-5,0,0)
        // -- hand-verified the resulting per-point radius deviation from
        // the shifted centroid is far beyond the 8% tolerance.
        let sqrt3: Float = Float(3).squareRoot()
        let distorted: [SIMD3<Float>] = [
            SIMD3(2, 0, 0), SIMD3(1, sqrt3, 0), SIMD3(-1, sqrt3, 0),
            SIMD3(-5, 0, 0), SIMD3(-1, -sqrt3, 0), SIMD3(1, -sqrt3, 0)
        ]
        let check = PolygonGeometry.circleCheck(points: distorted)
        XCTAssertEqual(check?.isCircle, false)
    }

    func testCircleCheckReturnsNilForFewerThanFivePoints() {
        let square: [SIMD3<Float>] = [
            SIMD3(0, 0, 0), SIMD3(1, 0, 0), SIMD3(1, 1, 0), SIMD3(0, 1, 0)
        ]
        XCTAssertNil(PolygonGeometry.circleCheck(points: square))
    }

    // MARK: - Planarity tolerance

    func testPlanarityDeviationIsExactForSymmetricSaddle() {
        // A 4-point "saddle" that is deliberately NOT coplanar (alternating
        // +d/-d in z) but whose Newell normal stays exactly (0,0,2)
        // regardless of d -- verified by hand -- so the resulting
        // planarity deviation is exactly |d|, not an approximation.
        let d: Float = 0.01
        let saddle: [SIMD3<Float>] = [
            SIMD3(0, 0, d), SIMD3(1, 0, -d), SIMD3(1, 1, d), SIMD3(0, 1, -d)
        ]
        XCTAssertEqual(PolygonGeometry.planarityDeviation(of: saddle), d, accuracy: epsilon)
    }

    func testPlanarityDeviationIsZeroForFlatPolygon() {
        let rectangle: [SIMD3<Float>] = [
            SIMD3(0, 0, 0), SIMD3(4, 0, 0), SIMD3(4, 3, 0), SIMD3(0, 3, 0)
        ]
        XCTAssertEqual(PolygonGeometry.planarityDeviation(of: rectangle), 0, accuracy: epsilon)
    }

    // MARK: - Height (perpendicular distance to base plane)

    func testPerpendicularDistanceFromHeightPointToFlatBase() {
        let rectangleBase: [SIMD3<Float>] = [
            SIMD3(0, 0, 0), SIMD3(4, 0, 0), SIMD3(4, 3, 0), SIMD3(0, 3, 0)
        ]
        let heightPoint = SIMD3<Float>(2, 1.5, 5)
        let footpoint = PolygonGeometry.footpoint(of: heightPoint, onPlaneOf: rectangleBase)
        XCTAssertEqual(footpoint.x, 2, accuracy: epsilon)
        XCTAssertEqual(footpoint.y, 1.5, accuracy: epsilon)
        XCTAssertEqual(footpoint.z, 0, accuracy: epsilon)
        XCTAssertEqual(
            PolygonGeometry.perpendicularDistance(from: heightPoint, toPlaneOf: rectangleBase),
            5,
            accuracy: epsilon
        )
    }

    // MARK: - Extruded corners (full wireframe box/prism)

    func testExtrudedCornersTranslateEveryBasePointByTheHeightOffset() {
        let rectangleBase: [SIMD3<Float>] = [
            SIMD3(0, 0, 0), SIMD3(4, 0, 0), SIMD3(4, 3, 0), SIMD3(0, 3, 0)
        ]
        let heightPoint = SIMD3<Float>(2, 1.5, 5)
        // footpoint is (2, 1.5, 0) (hand-verified above), so the offset
        // carrying the base plane to the height point is exactly (0,0,5)
        // -- every base corner should shift by exactly that.
        let topCorners = PolygonGeometry.extrudedCorners(of: rectangleBase, toward: heightPoint)
        let expected: [SIMD3<Float>] = [
            SIMD3(0, 0, 5), SIMD3(4, 0, 5), SIMD3(4, 3, 5), SIMD3(0, 3, 5)
        ]
        XCTAssertEqual(topCorners.count, expected.count)
        for (actual, expectedCorner) in zip(topCorners, expected) {
            XCTAssertEqual(actual.x, expectedCorner.x, accuracy: epsilon)
            XCTAssertEqual(actual.y, expectedCorner.y, accuracy: epsilon)
            XCTAssertEqual(actual.z, expectedCorner.z, accuracy: epsilon)
        }
    }

    // MARK: - Edge / zero cases

    func testAreaOfEmptyOrTooFewPointsIsZero() {
        XCTAssertEqual(PolygonGeometry.area(of: []), 0, accuracy: epsilon)
        XCTAssertEqual(PolygonGeometry.area(of: [SIMD3(0, 0, 0), SIMD3(1, 0, 0)]), 0, accuracy: epsilon)
    }

    func testPlanarityDeviationOfTooFewPointsIsZero() {
        XCTAssertEqual(PolygonGeometry.planarityDeviation(of: [SIMD3(0, 0, 0)]), 0, accuracy: epsilon)
    }

    func testInteriorAnglesOfTooFewPointsIsEmpty() {
        XCTAssertTrue(PolygonGeometry.interiorAngles(points: [SIMD3(0, 0, 0), SIMD3(1, 0, 0)], closed: true).isEmpty)
    }

    func testAngleDegreesAtDegenerateVertexIsZero() {
        // previous == vertex, so the "previous" vector has zero length --
        // the guard in angleDegrees returns 0 rather than dividing by zero.
        let vertex = SIMD3<Float>(1, 1, 0)
        let angle = PolygonGeometry.angleDegrees(at: vertex, previous: vertex, next: SIMD3(2, 1, 0))
        XCTAssertEqual(angle, 0, accuracy: epsilon)
    }
}
