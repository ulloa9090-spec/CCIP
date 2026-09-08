import XCTest
import simd
@testable import BoxOpPhase0

/// Deterministic tests against the existing `MultiPointMeasurement`
/// implementation. Expected values are hand-derived from the actual code
/// (`segmentDistances`/`totalDistance` via `simd_distance`,
/// `perimeter`/`area`/`height`/`volume` via `PolygonGeometry`), not from
/// what the feature "should" do. Nothing in `MultiPointMeasurement.swift`
/// was modified to make these pass.
final class MultiPointMeasurementTests: XCTestCase {

    private let epsilon: Float = 0.0001

    // MARK: - Distance between points / sum of segments

    func testSegmentDistancesBetweenConsecutivePoints() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(3, 0, 0))
        measurement.addPoint(SIMD3(3, 4, 0))

        let distances = measurement.segmentDistances
        XCTAssertEqual(distances.count, 2)
        XCTAssertEqual(distances[0], 3, accuracy: epsilon)
        XCTAssertEqual(distances[1], 4, accuracy: epsilon)
    }

    func testTotalDistanceIsSumOfSegments() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(3, 0, 0))
        measurement.addPoint(SIMD3(3, 4, 0))

        XCTAssertEqual(measurement.totalDistance, 7, accuracy: epsilon)
    }

    // MARK: - Perimeter

    func testPerimeterOfClosedRectangle() throws {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(4, 0, 0))
        measurement.addPoint(SIMD3(4, 3, 0))
        measurement.addPoint(SIMD3(0, 3, 0))
        measurement.closeShape()

        let perimeter = try XCTUnwrap(measurement.perimeter)
        XCTAssertEqual(perimeter, 14, accuracy: epsilon)
    }

    func testPerimeterIsNilWhenNotClosed() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(4, 0, 0))
        measurement.addPoint(SIMD3(4, 3, 0))

        XCTAssertNil(measurement.perimeter)
    }

    // MARK: - Area (delegated to PolygonGeometry, exercised through the shape)

    func testAreaOfClosedRectangle() throws {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(4, 0, 0))
        measurement.addPoint(SIMD3(4, 3, 0))
        measurement.addPoint(SIMD3(0, 3, 0))
        measurement.closeShape()

        let area = try XCTUnwrap(measurement.area)
        XCTAssertEqual(area, 12, accuracy: epsilon)
    }

    func testShapeLabelDistinguishesPolylinePolygonAndRectangle() {
        var open = MultiPointMeasurement()
        open.addPoint(SIMD3(0, 0, 0))
        open.addPoint(SIMD3(1, 0, 0))
        XCTAssertEqual(open.shapeLabel, "Polyline")

        var rectangle = MultiPointMeasurement()
        rectangle.addPoint(SIMD3(0, 0, 0))
        rectangle.addPoint(SIMD3(4, 0, 0))
        rectangle.addPoint(SIMD3(4, 3, 0))
        rectangle.addPoint(SIMD3(0, 3, 0))
        rectangle.closeShape()
        XCTAssertEqual(rectangle.shapeLabel, "Rectangle")

        var irregular = MultiPointMeasurement()
        irregular.addPoint(SIMD3(0, 0, 0))
        irregular.addPoint(SIMD3(4, 0, 0))
        irregular.addPoint(SIMD3(3, 2, 0))
        irregular.addPoint(SIMD3(0, 3, 0))
        irregular.closeShape()
        XCTAssertEqual(irregular.shapeLabel, "Polygon")
    }

    func testShapeLabelDetectsSquare() {
        var square = MultiPointMeasurement()
        square.addPoint(SIMD3(0, 0, 0))
        square.addPoint(SIMD3(3, 0, 0))
        square.addPoint(SIMD3(3, 3, 0))
        square.addPoint(SIMD3(0, 3, 0))
        square.closeShape()
        XCTAssertEqual(square.shapeLabel, "Square")
    }

    func testShapeLabelDistinguishesTriangleTypes() {
        var equilateral = MultiPointMeasurement()
        equilateral.addPoint(SIMD3(0, 0, 0))
        equilateral.addPoint(SIMD3(2, 0, 0))
        equilateral.addPoint(SIMD3(1, Float(3).squareRoot(), 0))
        equilateral.closeShape()
        XCTAssertEqual(equilateral.shapeLabel, "Equilateral Triangle")

        var right = MultiPointMeasurement()
        right.addPoint(SIMD3(0, 0, 0))
        right.addPoint(SIMD3(3, 0, 0))
        right.addPoint(SIMD3(0, 4, 0))
        right.closeShape()
        XCTAssertEqual(right.shapeLabel, "Right Triangle")

        var isosceles = MultiPointMeasurement()
        isosceles.addPoint(SIMD3(0, 0, 0))
        isosceles.addPoint(SIMD3(4, 0, 0))
        isosceles.addPoint(SIMD3(2, 3, 0))
        isosceles.closeShape()
        XCTAssertEqual(isosceles.shapeLabel, "Isosceles Triangle")

        var scalene = MultiPointMeasurement()
        scalene.addPoint(SIMD3(0, 0, 0))
        scalene.addPoint(SIMD3(5, 0, 0))
        scalene.addPoint(SIMD3(2, 3, 0))
        scalene.closeShape()
        XCTAssertEqual(scalene.shapeLabel, "Triangle")
    }

    func testShapeLabelDetectsCircle() throws {
        let sqrt3: Float = Float(3).squareRoot()
        var hexagon = MultiPointMeasurement()
        hexagon.addPoint(SIMD3(2, 0, 0))
        hexagon.addPoint(SIMD3(1, sqrt3, 0))
        hexagon.addPoint(SIMD3(-1, sqrt3, 0))
        hexagon.addPoint(SIMD3(-2, 0, 0))
        hexagon.addPoint(SIMD3(-1, -sqrt3, 0))
        hexagon.addPoint(SIMD3(1, -sqrt3, 0))
        hexagon.closeShape()

        XCTAssertEqual(hexagon.shapeLabel, "Circle")
        let circleCheck = try XCTUnwrap(hexagon.circleCheck)
        XCTAssertEqual(circleCheck.radius, 2, accuracy: epsilon)
    }

    // MARK: - Height and volume

    func testHeightAndVolumeOfClosedRectangleWithHeightPoint() throws {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(4, 0, 0))
        measurement.addPoint(SIMD3(4, 3, 0))
        measurement.addPoint(SIMD3(0, 3, 0))
        measurement.closeShape()
        measurement.setHeightPoint(SIMD3(2, 1.5, 5))

        let height = try XCTUnwrap(measurement.height)
        let volume = try XCTUnwrap(measurement.volume)
        XCTAssertEqual(height, 5, accuracy: epsilon)
        XCTAssertEqual(volume, 60, accuracy: epsilon)

        let topCorners = try XCTUnwrap(measurement.extrudedTopCorners)
        XCTAssertEqual(topCorners.count, 4)
        let expected: [SIMD3<Float>] = [
            SIMD3(0, 0, 5), SIMD3(4, 0, 5), SIMD3(4, 3, 5), SIMD3(0, 3, 5)
        ]
        for (actual, expectedCorner) in zip(topCorners, expected) {
            XCTAssertEqual(actual.x, expectedCorner.x, accuracy: epsilon)
            XCTAssertEqual(actual.y, expectedCorner.y, accuracy: epsilon)
            XCTAssertEqual(actual.z, expectedCorner.z, accuracy: epsilon)
        }
    }

    func testExtrudedTopCornersIsNilBeforeHeightPointIsSet() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(4, 0, 0))
        measurement.addPoint(SIMD3(4, 3, 0))
        measurement.addPoint(SIMD3(0, 3, 0))
        measurement.closeShape()
        XCTAssertNil(measurement.extrudedTopCorners)
    }

    func testHeightAndVolumeAreNilBeforeHeightPointIsSet() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(4, 0, 0))
        measurement.addPoint(SIMD3(4, 3, 0))
        measurement.addPoint(SIMD3(0, 3, 0))
        measurement.closeShape()

        XCTAssertNil(measurement.height)
        XCTAssertNil(measurement.volume)
    }

    // MARK: - State machine / undo ordering

    func testCanCloseRequiresAtLeastThreePointsAndNotAlreadyClosed() {
        var measurement = MultiPointMeasurement()
        XCTAssertFalse(measurement.canClose)
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(1, 0, 0))
        XCTAssertFalse(measurement.canClose)
        measurement.addPoint(SIMD3(1, 1, 0))
        XCTAssertTrue(measurement.canClose)
        measurement.closeShape()
        XCTAssertFalse(measurement.canClose)
    }

    func testCloseShapeIsNoOpWithFewerThanThreePoints() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(1, 0, 0))
        measurement.closeShape()
        XCTAssertFalse(measurement.isClosed)
    }

    func testAddPointIsNoOpAfterClosing() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(1, 0, 0))
        measurement.addPoint(SIMD3(1, 1, 0))
        measurement.closeShape()
        measurement.addPoint(SIMD3(9, 9, 9))
        XCTAssertEqual(measurement.pointCount, 3)
    }

    func testSetHeightPointIsNoOpWhenNotClosedOrAlreadySet() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(1, 0, 0))
        measurement.addPoint(SIMD3(1, 1, 0))
        measurement.setHeightPoint(SIMD3(0, 0, 5))
        XCTAssertNil(measurement.heightPoint) // not closed yet

        measurement.closeShape()
        measurement.setHeightPoint(SIMD3(0, 0, 5))
        measurement.setHeightPoint(SIMD3(9, 9, 9)) // already set, ignored
        XCTAssertEqual(measurement.heightPoint, SIMD3(0, 0, 5))
    }

    func testUndoLastReversesHeightThenCloseThenPointsInOrder() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(1, 0, 0))
        measurement.addPoint(SIMD3(1, 1, 0))
        measurement.closeShape()
        measurement.setHeightPoint(SIMD3(0, 0, 5))

        measurement.undoLast()
        XCTAssertNil(measurement.heightPoint)
        XCTAssertTrue(measurement.isClosed)

        measurement.undoLast()
        XCTAssertFalse(measurement.isClosed)
        XCTAssertEqual(measurement.pointCount, 3)

        measurement.undoLast()
        XCTAssertEqual(measurement.pointCount, 2)
    }

    // MARK: - Edge / zero cases

    func testEmptyMeasurementHasZeroDistanceAndNoLastPoint() {
        let measurement = MultiPointMeasurement()
        XCTAssertTrue(measurement.isEmpty)
        XCTAssertEqual(measurement.pointCount, 0)
        XCTAssertNil(measurement.lastPoint)
        XCTAssertTrue(measurement.segmentDistances.isEmpty)
        XCTAssertEqual(measurement.totalDistance, 0, accuracy: epsilon)
    }

    func testSinglePointHasNoSegments() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(1, 2, 3))
        XCTAssertTrue(measurement.segmentDistances.isEmpty)
        XCTAssertEqual(measurement.totalDistance, 0, accuracy: epsilon)
    }

    func testUndoLastOnEmptyMeasurementIsNoOp() {
        var measurement = MultiPointMeasurement()
        measurement.undoLast()
        XCTAssertTrue(measurement.isEmpty)
    }

    func testClearResetsEverything() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(1, 0, 0))
        measurement.addPoint(SIMD3(1, 1, 0))
        measurement.closeShape()
        measurement.setHeightPoint(SIMD3(0, 0, 5))

        measurement.clear()

        XCTAssertTrue(measurement.isEmpty)
        XCTAssertFalse(measurement.isClosed)
        XCTAssertNil(measurement.heightPoint)
        XCTAssertNil(measurement.area)
        XCTAssertNil(measurement.perimeter)
    }

    // MARK: - Dedicated Height tool (2-point, gravity/world-up constrained)

    func testVerticalHeightIsYDifferenceNotRawDistance() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(0.3, 2, 0.4))

        // Raw 3D distance would be sqrt(0.3^2 + 2^2 + 0.4^2) ~= 2.0616 --
        // verticalHeight must ignore the sideways drift and report just
        // the Y difference.
        XCTAssertEqual(measurement.verticalHeight ?? -1, 2, accuracy: epsilon)
        XCTAssertEqual(measurement.horizontalOffset ?? -1, 0.5, accuracy: epsilon)
    }

    func testVerticalHeightUsesAbsoluteValueWhenTopIsBelowBase() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 5, 0))
        measurement.addPoint(SIMD3(0, 2, 0))

        XCTAssertEqual(measurement.verticalHeight ?? -1, 3, accuracy: epsilon)
        XCTAssertEqual(measurement.horizontalOffset ?? -1, 0, accuracy: epsilon)
    }

    func testVerticalHeightAndHorizontalOffsetAreNilBeforeTwoPoints() {
        var measurement = MultiPointMeasurement()
        XCTAssertNil(measurement.verticalHeight)
        XCTAssertNil(measurement.horizontalOffset)

        measurement.addPoint(SIMD3(0, 0, 0))
        XCTAssertNil(measurement.verticalHeight)
        XCTAssertNil(measurement.horizontalOffset)
    }

    func testLiveVerticalHeightPreviewsFromTheSingleBasePoint() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(1, 1, 1))

        XCTAssertEqual(measurement.liveVerticalHeight(with: SIMD3(1, 4, 1)) ?? -1, 3, accuracy: epsilon)
    }

    func testLiveVerticalHeightIsNilWithoutExactlyOneConfirmedPoint() {
        var measurement = MultiPointMeasurement()
        XCTAssertNil(measurement.liveVerticalHeight(with: SIMD3(0, 1, 0)))

        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(0, 1, 0))
        XCTAssertNil(measurement.liveVerticalHeight(with: SIMD3(0, 2, 0)))
    }
}
