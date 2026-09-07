import SwiftUI

/// Continuous multi-point AR measurement: start, add as many base points as
/// you want, optionally close them into a shape (perimeter, area, interior
/// angles, rectangle detection), optionally add one height point to derive
/// a volume, undo, finish. See `MultiPointMeasurement.swift` for why there's
/// no `pointA`/`pointB` here and how the closed-shape/height extension
/// works. Deliberately still out of scope: multiple independent shapes in
/// one session, non-planar/curved shapes, CV assistance (see
/// `phase0/README.md`).
struct ARMeasureScreen: View {
    @State private var state: ARMeasureState = .idle
    @State private var measurement = MultiPointMeasurement()
    @State private var livePoint: SIMD3<Float>?
    @State private var raycastSource: RaycastSource?

    var body: some View {
        ZStack {
            ARMeasureView(
                state: state,
                measurement: measurement,
                livePoint: $livePoint,
                raycastSource: $raycastSource
            )
            .ignoresSafeArea()

            if state != .finished {
                reticle
            }

            VStack {
                topReadout
                Spacer()
                controls
            }
            .padding(.bottom, 24)
        }
        .navigationTitle("AR Measure")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Reticle

    private var reticle: some View {
        Circle()
            .strokeBorder(livePoint == nil ? .white.opacity(0.5) : .white, lineWidth: 2)
            .frame(width: 18, height: 18)
    }

    // MARK: - Top readout

    @ViewBuilder
    private var topReadout: some View {
        switch state {
        case .idle:
            readoutCapsule("Point the camera at a surface, then tap Start Measure")

        case .measuring:
            VStack(spacing: 6) {
                readoutCapsule(instructionText)
                measuringResultCards
            }

        case .finished:
            VStack(spacing: 6) {
                readoutCapsule("Measurement finished \u{00B7} \(measurement.shapeLabel)")
                finishedResultCards
            }
        }
    }

    private var instructionText: String {
        if measurement.isClosed {
            return measurement.heightPoint == nil
                ? "Aim above or below the shape, then tap Set Height Point"
                : "Height captured \u{00B7} tap Finish"
        }
        if measurement.isEmpty {
            return "Tap Add Point to place the first point"
        }
        return "Point \(measurement.pointCount) placed \u{00B7} move to the next point"
    }

    @ViewBuilder
    private var measuringResultCards: some View {
        if !measurement.isClosed {
            if let livePoint, let liveSegment = measurement.liveSegmentDistance(to: livePoint) {
                resultCard(
                    primary: UnitFormatting.feetAndInches(meters: liveSegment),
                    secondary: "current segment" + sourceSuffix
                )
            }
            if let livePoint, let liveAngle = measurement.liveAngleAtLastPoint(with: livePoint) {
                resultCard(primary: String(format: "%.1f\u{00B0}", liveAngle), secondary: "angle at last point")
            }
            if measurement.pointCount > 1 {
                resultCard(
                    primary: "total: " + UnitFormatting.feetAndInches(meters: measurement.liveTotalDistance(includingLivePoint: livePoint)),
                    secondary: "\(measurement.pointCount) points \u{00B7} \(measurement.segmentDistances.count) segments"
                )
            }
        } else if measurement.heightPoint == nil {
            closedShapeSummary
            if let livePoint, let liveHeight = measurement.liveHeight(with: livePoint) {
                resultCard(primary: UnitFormatting.feetAndInches(meters: liveHeight), secondary: "live height preview")
            }
        } else {
            if let volume = measurement.volume {
                resultCard(primary: UnitFormatting.cubicFeet(cubicMeters: volume), secondary: "volume")
            }
            if let height = measurement.height {
                resultCard(primary: UnitFormatting.feetAndInches(meters: height), secondary: "height")
            }
        }
    }

    @ViewBuilder
    private var finishedResultCards: some View {
        if measurement.isClosed {
            closedShapeSummary
            if measurement.heightPoint != nil {
                if let volume = measurement.volume {
                    resultCard(primary: UnitFormatting.cubicFeet(cubicMeters: volume), secondary: "volume")
                }
                if let height = measurement.height {
                    resultCard(primary: UnitFormatting.feetAndInches(meters: height), secondary: "height")
                }
            }
        } else {
            resultCard(
                primary: "total: " + UnitFormatting.feetAndInches(meters: measurement.totalDistance),
                secondary: "\(measurement.pointCount) points \u{00B7} \(measurement.segmentDistances.count) segments"
            )
        }
    }

    /// Area/perimeter/rectangle/angles/planarity — shared between the
    /// "closed, capturing height" measuring view and the finished summary.
    @ViewBuilder
    private var closedShapeSummary: some View {
        if let area = measurement.area {
            resultCard(primary: UnitFormatting.squareFeet(squareMeters: area), secondary: measurement.shapeLabel)
        }
        if let perimeter = measurement.perimeter {
            resultCard(primary: UnitFormatting.feetAndInches(meters: perimeter), secondary: "perimeter")
        }
        if let rectangleCheck = measurement.rectangleCheck, rectangleCheck.isRectangle {
            resultCard(
                primary: "\(UnitFormatting.feetAndInches(meters: rectangleCheck.length)) \u{00D7} \(UnitFormatting.feetAndInches(meters: rectangleCheck.width))",
                secondary: "length \u{00D7} width"
            )
        }
        if !measurement.interiorAngles.isEmpty {
            let anglesText = measurement.interiorAngles.map { String(format: "%.0f\u{00B0}", $0) }.joined(separator: ", ")
            resultCard(primary: anglesText, secondary: "interior angles")
        }
        if let planarity = measurement.planarityDeviation, planarity > 0.02 {
            readoutCapsule("\u{26A0} points aren't perfectly coplanar (\u{00B1}" + UnitFormatting.inches(meters: planarity) + ") \u{00B7} area is approximate")
        }
    }

    private var sourceSuffix: String {
        raycastSource.map { " \u{00B7} \($0.rawValue)" } ?? ""
    }

    private func readoutCapsule(_ text: String) -> some View {
        Text(text)
            .font(.subheadline)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial, in: Capsule())
    }

    private func resultCard(primary: String, secondary: String) -> some View {
        VStack(spacing: 2) {
            Text(primary).font(.title3.bold())
            Text(secondary).font(.caption).foregroundStyle(.secondary)
        }
        .padding(10)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Controls

    @ViewBuilder
    private var controls: some View {
        switch state {
        case .idle:
            Button("Start Measure") {
                state = .measuring
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)

        case .measuring:
            VStack(spacing: 10) {
                Button(primaryButtonTitle) {
                    primaryButtonAction()
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(primaryButtonDisabled)

                HStack(spacing: 10) {
                    Button("Undo Last Point") {
                        measurement.undoLast()
                    }
                    .disabled(measurement.isEmpty)

                    if measurement.canClose {
                        Button("Close Shape") {
                            measurement.closeShape()
                        }
                    }

                    Button("Finish") {
                        state = .finished
                    }
                    .disabled(measurement.pointCount < 2)

                    Button("Clear All", role: .destructive) {
                        measurement.clear()
                    }
                    .disabled(measurement.isEmpty)
                }
                .buttonStyle(.bordered)
                .controlSize(.regular)
            }

        case .finished:
            HStack(spacing: 12) {
                Button("New Measurement") {
                    measurement.clear()
                    state = .measuring
                }
                .buttonStyle(.borderedProminent)

                Button("Clear", role: .destructive) {
                    measurement.clear()
                    state = .idle
                }
                .buttonStyle(.bordered)
            }
        }
    }

    private var primaryButtonTitle: String {
        if measurement.isClosed {
            return measurement.heightPoint == nil ? "Set Height Point" : "Height Set"
        }
        return "Add Point"
    }

    private var primaryButtonDisabled: Bool {
        livePoint == nil || (measurement.isClosed && measurement.heightPoint != nil)
    }

    private func primaryButtonAction() {
        guard let livePoint else { return }
        if measurement.isClosed {
            measurement.setHeightPoint(livePoint)
        } else {
            measurement.addPoint(livePoint)
        }
    }
}

#Preview {
    NavigationStack {
        ARMeasureScreen()
    }
}
