import Foundation

/// Display-layer unit conversion only. Internal geometry stays exactly as
/// ARKit hands it back (meters, `SIMD3<Float>`) everywhere else in this
/// module — nothing here changes what's stored or computed, only how a
/// value is *shown*. Per `docs/14_LOCALIZATION_LANGUAGE.md` ("Measurement
/// units"): typed conversion, never string manipulation, and convert
/// without rounding until the moment of presentation.
enum UnitFormatting {
    private static let inchesPerMeter: Double = 39.3700787401575
    private static let squareFeetPerSquareMeter: Double = 10.7639104167
    private static let cubicFeetPerCubicMeter: Double = 35.3146667215

    /// `"4' 3.2""`-style feet-and-inches string for a length given in
    /// meters. Guards the classic off-by-one where a rounded remainder
    /// displays as `12.0"` instead of rolling into the next foot.
    static func feetAndInches(meters: Float) -> String {
        let totalInches = Double(meters) * inchesPerMeter
        let sign = totalInches < 0 ? "-" : ""
        let magnitude = abs(totalInches)

        var feet = Int(magnitude / 12)
        var remainderInches = magnitude - Double(feet) * 12
        if remainderInches >= 11.95 {
            feet += 1
            remainderInches = 0
        }

        return String(format: "%@%d' %.1f\"", sign, feet, remainderInches)
    }

    /// Inches only, for small values where a feet-and-inches split would
    /// be noise (e.g. a planarity-deviation warning).
    static func inches(meters: Float) -> String {
        String(format: "%.1f in", Double(meters) * inchesPerMeter)
    }

    static func squareFeet(squareMeters: Float) -> String {
        String(format: "%.2f ft\u{00B2}", Double(squareMeters) * squareFeetPerSquareMeter)
    }

    static func cubicFeet(cubicMeters: Float) -> String {
        String(format: "%.2f ft\u{00B3}", Double(cubicMeters) * cubicFeetPerCubicMeter)
    }

    /// New, additive: `"4' 3-5/8""`-style feet-and-nearest-1/8-inch string.
    /// Not wired into any screen yet -- `feetAndInches(meters:)` above stays
    /// the display format actually shown in `ARMeasureScreen.swift`. Added
    /// solely so `UnitFormattingTests.swift` has real 1/8" rounding behavior
    /// to validate, per explicit request.
    static func feetAndInchesFraction(meters: Float) -> String {
        let totalInches = Double(meters) * inchesPerMeter
        let sign = totalInches < 0 ? "-" : ""
        let magnitude = abs(totalInches)

        let totalEighths = (magnitude * 8).rounded()
        var wholeInches = Int(totalEighths / 8)
        var eighths = Int(totalEighths.truncatingRemainder(dividingBy: 8))
        if eighths == 8 {
            eighths = 0
            wholeInches += 1
        }

        var feet = wholeInches / 12
        var remainderInches = wholeInches % 12
        if remainderInches == 12 {
            remainderInches = 0
            feet += 1
        }

        if eighths == 0 {
            return String(format: "%@%d' %d\"", sign, feet, remainderInches)
        }

        let divisor = gcd(eighths, 8)
        let reducedNumerator = eighths / divisor
        let reducedDenominator = 8 / divisor
        return String(format: "%@%d' %d-%d/%d\"", sign, feet, remainderInches, reducedNumerator, reducedDenominator)
    }

    private static func gcd(_ a: Int, _ b: Int) -> Int {
        var a = a, b = b
        while b != 0 { (a, b) = (b, a % b) }
        return a
    }
}
