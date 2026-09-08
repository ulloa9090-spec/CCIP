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

    /// Below one foot (12 inches), a length displays as inches-only;
    /// at 12 inches or more it switches to feet-and-inches notation --
    /// per explicit user direction (show only inches until the length
    /// completes a foot).
    private static let inchesOnlyCeiling = 12.0

    /// Rounds to the nearest 1/8" and formats it as inches-only below
    /// one foot (`8½"`, `11"`) and feet-and-inches at 12 inches or more
    /// (`1' 0"`, `4' 6½"`) -- using real Unicode fraction glyphs, not
    /// `"N/8"` text. A whole-number-only remainder (or the zero-inches
    /// side of a whole-feet value) omits the leading `0` the same way a
    /// pure fraction under an inch does (e.g. `½"`, not `0½"`).
    static func feetAndInches(meters: Float) -> String {
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
        let glyph = fractionGlyph(for: eighths)

        if Double(wholeInches) < inchesOnlyCeiling {
            let numberPart = wholeInches == 0 ? (glyph.isEmpty ? "0" : glyph) : "\(wholeInches)\(glyph)"
            return "\(sign)\(numberPart)\""
        }

        let feet = wholeInches / 12
        let remainderInches = wholeInches % 12
        let inchesPart = remainderInches == 0 ? (glyph.isEmpty ? "0" : glyph) : "\(remainderInches)\(glyph)"
        return "\(sign)\(feet)' \(inchesPart)\""
    }

    private static func fractionGlyph(for eighths: Int) -> String {
        switch eighths {
        case 1: return "\u{215B}" // 1/8
        case 2: return "\u{00BC}" // 1/4
        case 3: return "\u{215C}" // 3/8
        case 4: return "\u{00BD}" // 1/2
        case 5: return "\u{215D}" // 5/8
        case 6: return "\u{00BE}" // 3/4
        case 7: return "\u{215E}" // 7/8
        default: return ""
        }
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
