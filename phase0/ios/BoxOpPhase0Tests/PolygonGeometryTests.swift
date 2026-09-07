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
