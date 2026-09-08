import XCTest
@testable import BoxOpPhase0

/// Deterministic tests against the existing `UnitFormatting` implementation.
/// Expected strings were hand-derived from the actual formatting code --
/// including its 1/8" rounding and its "inches-only below one foot" rule
/// (per explicit user direction: show only inches until the length
/// completes a foot, then switch to feet-and-inches). Uses real Unicode
/// fraction glyphs (`8½"`), not decimal tenths or `"N/8"` text.
/// `feetAndInches` is what `ARMeasureScreen.swift` actually displays;
/// there is no separate "fraction" variant -- this function *is* the 1/8"
/// rounding behavior these tests exercise.
final class UnitFormattingTests: XCTestCase {

    // MARK: - Meters -> feet/inches conversion

    func testOneFootExactlySwitchesToFeetNotation() {
        // 12" is the threshold itself -- at or above one foot, it's
        // feet-and-inches, not inches-only.
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: 0.3048), "1' 0\"")
    }

    func testOneInchExactly() {
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: 0.0254), "1\"")
    }

    func testOneMeterInFeetAndInches() {
        // 1m ~= 39.37in -> rounds to 39-3/8in -> 3' 3-3/8".
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: 1), "3' 3\u{215C}\"") // 3' 3-3/8"
    }

    func testNegativeLengthKeepsSignPrefix() {
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: -1), "-3' 3\u{215C}\"")
    }

    func testZeroLength() {
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: 0), "0\"")
    }

    func testJustBelowOneFootThresholdStaysInInches() {
        let meters = Float(11.0 / 39.3700787401575)
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: meters), "11\"")
    }

    func testAtOneFootThresholdSwitchesToFeetNotation() {
        let meters = Float(12.0 / 39.3700787401575)
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: meters), "1' 0\"")
    }

    func testWholeFootWithFractionalInchesOmitsZero() {
        // 12.5" = 1' + 1/2" -- the whole-inch remainder is 0, so only the
        // fraction glyph shows, matching how a sub-inch value alone omits
        // its leading "0".
        let meters = Float(12.5 / 39.3700787401575)
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: meters), "1' \u{00BD}\"") // 1' 1/2"
    }

    // MARK: - Area / volume conversion

    func testOneSquareMeterInSquareFeet() {
        XCTAssertEqual(UnitFormatting.squareFeet(squareMeters: 1), "10.76 ft\u{00B2}")
    }

    func testOneCubicMeterInCubicFeet() {
        XCTAssertEqual(UnitFormatting.cubicFeet(cubicMeters: 1), "35.31 ft\u{00B3}")
    }

    // MARK: - Rounding to nearest 1/8"

    func testRoundsToNearestEighthWithFeetNotation() {
        let meters = Float(51.625 / 39.3700787401575) // 4' 3-5/8"
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: meters), "4' 3\u{215D}\"") // 4' 3-5/8"
    }

    func testRoundsToQuarterInch() {
        let meters = Float(3.20 / 39.3700787401575) // rounds to 3-2/8" -> 1/4
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: meters), "3\u{00BC}\"") // 3-1/4"
    }

    func testRoundsToUnreducedEighthInch() {
        let meters = Float(3.10 / 39.3700787401575) // rounds to 3-1/8", already unreduced
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: meters), "3\u{215B}\"") // 3-1/8"
    }

    func testExactWholeInchesOmitsFraction() {
        let meters = Float(8.0 / 39.3700787401575) // exactly 8" (below the 1-foot threshold)
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: meters), "8\"")
    }

    func testSubInchFractionOmitsLeadingZero() {
        // 0.5" == 4/8" -> reduces to 1/2, and the whole-inches part (0) is
        // omitted the way a pure fraction under an inch shows alone.
        let meters = Float(0.5 / 39.3700787401575)
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: meters), "\u{00BD}\"") // 1/2"
    }

    func testSubInchThreeQuarters() {
        let meters = Float(0.75 / 39.3700787401575) // 6/8" -> 3/4
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: meters), "\u{00BE}\"") // 3/4"
    }

    func testSubInchUnreducedEighths() {
        // 3/8" and 7/8" have no simpler reduced form -- verifies the
        // glyph table covers all seven non-zero eighths, not just the
        // ones that happen to reduce.
        let threeEighths = Float(0.375 / 39.3700787401575)
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: threeEighths), "\u{215C}\"") // 3/8"

        let sevenEighths = Float(0.875 / 39.3700787401575)
        XCTAssertEqual(UnitFormatting.feetAndInches(meters: sevenEighths), "\u{215E}\"") // 7/8"
    }
}
