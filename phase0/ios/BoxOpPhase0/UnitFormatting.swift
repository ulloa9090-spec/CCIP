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
}
