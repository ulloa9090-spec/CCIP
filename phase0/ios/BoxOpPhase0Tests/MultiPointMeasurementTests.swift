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

    func testPerimeterOfClosedRectangle() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(4, 0, 0))
        measurement.addPoint(SIMD3(4, 3, 0))
        measurement.addPoint(SIMD3(0, 3, 0))
        measurement.closeShape()

        XCTAssertEqual(measurement.perimeter, 14, accuracy: epsilon)
    }

    func testPerimeterIsNilWhenNotClosed() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(4, 0, 0))
        measurement.addPoint(SIMD3(4, 3, 0))

        XCTAssertNil(measurement.perimeter)
    }

    // MARK: - Area (delegated to PolygonGeometry, exercised through the shape)

    func testAreaOfClosedRectangle() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(4, 0, 0))
        measurement.addPoint(SIMD3(4, 3, 0))
        measurement.addPoint(SIMD3(0, 3, 0))
        measurement.closeShape()

        XCTAssertEqual(measurement.area ?? -1, 12, accuracy: epsilon)
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

    // MARK: - Height and volume

    func testHeightAndVolumeOfClosedRectangleWithHeightPoint() {
        var measurement = MultiPointMeasurement()
        measurement.addPoint(SIMD3(0, 0, 0))
        measurement.addPoint(SIMD3(4, 0, 0))
        measurement.addPoint(SIMD3(4, 3, 0))
        measurement.addPoint(SIMD3(0, 3, 0))
        measurement.closeShape()
        measurement.setHeightPoint(SIMD3(2, 1.5, 5))

        XCTAssertEqual(measurement.height ?? -1, 5, accuracy: epsilon)
        XCTAssertEqual(measurement.volume ?? -1, 60, accuracy: epsilon)
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
}
