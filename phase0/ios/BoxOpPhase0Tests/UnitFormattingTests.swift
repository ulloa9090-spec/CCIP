import XCTest
@testable import BoxOpPhase0

/// Deterministic tests against the existing `UnitFormatting` implementation.
/// Expected strings were hand-derived from the actual formatting code
/// (including its off-by-one rollover guard in `feetAndInches`), not from
/// what the conversion "should" produce. `feetAndInchesFraction(meters:)`
/// is a NEW, additive function added alongside this test file specifically
/// so "rounding to 1/8 inch" has real behavior to validate -- it does not
/// replace or change `feetAndInches`, which remains the format actually
/// displayed in `ARMeasureScreen.swift`.
final class UnitFormattingTests: XCTestCase {

    // MARK: - Meters -> feet/inches conversion

    func testOneFootExactly() {
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: 0.3048), "1' 0.0\"")
    }

    func testOneInchExactly() {
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: 0.0254), "0' 1.0\"")
    }

    func testOneMeterInFeetAndInches() {
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: 1), "3' 3.4\"")
    }

    func testNegativeLengthKeepsSignPrefix() {
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: -1), "-3' 3.4\"")
    }

    func testZeroLength() {
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: 0), "0' 0.0\"")
    }

    func testRemainderRollsOverIntoNextFootNearTwelveInches() {
        let meters = Float(23.96 / 39.3700787401575)
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: meters), "2' 0.0\"")
    }

    func testRemainderJustBelowRolloverThresholdDoesNotRollOver() {
        let meters = Float(23.9 / 39.3700787401575)
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: meters), "1' 11.9\"")
    }

    // MARK: - Area / volume conversion

    func testOneSquareMeterInSquareFeet() {
        XCTAssertEqual(UnitFormatting.squareFeet(squareMeters: 1), "10.76 ft\u{00B2}")
    }

    func testOneCubicMeterInCubicFeet() {
        XCTAssertEqual(UnitFormatting.cubicFeet(cubicMeters: 1), "35.31 ft\u{00B3}")
    }

    // MARK: - Rounding to 1/8"

    func testFeetAndInchesFractionRoundsToNearestEighth() {
        let meters = Float(51.625 / 39.3700787401575) // 4' 3-5/8"
        XCTAssertEqual(UnitFormatting.feetAndInchesFraction(meters: meters), "4' 3-5/8\"")
    }

    func testFeetAndInchesFractionReducesQuarter() {
        let meters = Float(3.20 / 39.3700787401575) // rounds to 3-2/8" -> reduces to 3-1/4"
        XCTAssertEqual(UnitFormatting.feetAndInchesFraction(meters: meters), "0' 3-1/4\"")
    }

    func testFeetAndInchesFractionKeepsUnreducedEighth() {
        let meters = Float(3.10 / 39.3700787401575) // rounds to 3-1/8", already reduced
        XCTAssertEqual(UnitFormatting.feetAndInchesFraction(meters: meters), "0' 3-1/8\"")
    }

    func testFeetAndInchesFractionOmitsFractionWhenExact() {
        let meters = Float(24.0 / 39.3700787401575) // exactly 2'
        XCTAssertEqual(UnitFormatting.feetAndInchesFraction(meters: meters), "2' 0\"")
    }

    func testFeetAndInchesFractionZero() {
        XCTAssertEqual(UnitFormatting.feetAndInchesFraction(meters: 0), "0' 0\"")
    }

    func testFeetAndInchesFractionReducesFourEighthsToHalf() {
        // 0.5in == 4/8in -> reduces to 1/2
        let meters = Float(0.5 / 39.3700787401575)
        XCTAssertEqual(UnitFormatting.feetAndInchesFraction(meters: meters), "0' 0-1/2\"")
    }

    func testFeetAndInchesFractionReducesSixEighthsToThreeQuarters() {
        // 0.75in == 6/8in -> reduces to 3/4
        let meters = Float(0.75 / 39.3700787401575)
        XCTAssertEqual(UnitFormatting.feetAndInchesFraction(meters: meters), "0' 0-3/4\"")
    }

    func testFeetAndInchesFractionLeavesOddEighthsUnreduced() {
        // 3/8" and 7/8" have gcd(numerator, 8) == 1, so they stay as-is.
        let threeEighths = Float(0.375 / 39.3700787401575)
        XCTAssertEqual(UnitFormatting.feetAndInchesFraction(meters: threeEighths), "0' 0-3/8\"")

        let sevenEighths = Float(0.875 / 39.3700787401575)
        XCTAssertEqual(UnitFormatting.feetAndInchesFraction(meters: sevenEighths), "0' 0-7/8\"")
    }
}
