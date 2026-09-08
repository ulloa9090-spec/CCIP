import SwiftUI

/// Which tool the Measure tab is currently in. Chosen once, from the idle
/// screen, before `Start Measure`.
enum MeasureToolMode: Hashable {
    /// The default, open-ended flow: continuous multi-point polyline,
    /// optionally closed into a shape, optionally given a height.
    case length
    /// A dedicated 3-tap angle tool: ray endpoint, vertex, ray endpoint --
    /// auto-finishes on the third point and shows the angle at the
    /// vertex. Reuses the same `MultiPointMeasurement`/`PolygonGeometry`
    /// math as the interior-angle display on a closed shape; this mode
    /// only changes how few points it takes and how the result reads.
    case angle
    /// A dedicated 2-tap height tool: base point, then top point --
    /// auto-finishes on the second point. Distinct from the existing
    /// base-polygon + height-point flow (a perpendicular to a *fitted
    /// plane*, only reachable after closing a 3+ point shape): this is
    /// the catalog's standalone Height tool (`docs/25_MEASUREMENT_TOOLS_CATALOG.md`
    /// section 5), constrained to true vertical (gravity/world-up) rather
    /// than the raw distance between the two taps.
    case height
}

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
    @State private var toolMode: MeasureToolMode = .length
    @State private var scanRequestID = 0
    @State private var screenshotRequestID = 0
    @State private var capturedScreenshot: UIImage?

    var body: some View {
        ZStack {
            ARMeasureView(
                state: state,
                measurement: measurement,
                toolMode: toolMode,
                livePoint: $livePoint,
                raycastSource: $raycastSource,
                scanRequestID: scanRequestID,
                screenshotRequestID: screenshotRequestID,
                onAcceptSuggestedRectangle: { corners in
                    guard measurement.isEmpty else { return }
                    for corner in corners {
                        measurement.addPoint(corner)
                    }
                    measurement.closeShape()
                },
                onScreenshotCaptured: { image in
                    capturedScreenshot = image
                }
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
        .sheet(isPresented: Binding(
            get: { capturedScreenshot != nil },
            set: { isPresented in if !isPresented { capturedScreenshot = nil } }
        )) {
            if let capturedScreenshot {
                ShareSheet(activityItems: [capturedScreenshot])
            }
        }
    }

    // MARK: - Reticle

    /// A target/crosshair-style reticle (segmented ring + center dot),
    /// per user reference, instead of a plain circle outline -- same
    /// meaning as before (translucent while searching for a surface,
    /// solid white once the reticle is resting on one).
    private var reticle: some View {
        let color: Color = livePoint == nil ? .white.opacity(0.5) : .white
        return ZStack {
            Circle()
                .stroke(color, style: StrokeStyle(lineWidth: 2, dash: [6, 5]))
                .frame(width: 28, height: 28)
            Circle()
                .fill(color)
                .frame(width: 4, height: 4)
        }
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
                readoutCapsule(finishedHeadline)
                finishedResultCards
            }
        }
    }

    private var finishedHeadline: String {
        switch toolMode {
        case .angle: return "Angle measured"
        case .height: return "Height measured"
        case .length: return "Measurement finished \u{00B7} \(measurement.shapeLabel)"
        }
    }

    private var instructionText: String {
        if toolMode == .angle {
            switch measurement.pointCount {
            case 0: return "Tap Add Point to place the first ray"
            case 1: return "First ray placed \u{00B7} aim the vertex, then tap Add Point"
            default: return "Vertex placed \u{00B7} aim the second ray, then tap Add Point"
            }
        }
        if toolMode == .height {
            return measurement.isEmpty
                ? "Tap Add Point to place the base point"
                : "Base placed \u{00B7} aim straight up or down, then tap Add Point"
        }
        if measurement.isClosed {
            return measurement.heightPoint == nil
                ? "Aim above or below the shape, then tap Set Height Point"
                : "Height captured \u{00B7} tap Finish"
        }
        if measurement.isEmpty {
            return "Tap Add Point to place the first point \u{2014} or tap Scan for Rectangle to try automatic detection"
        }
        return "Point \(measurement.pointCount) placed \u{00B7} move to the next point"
    }

    @ViewBuilder
    private var measuringResultCards: some View {
        if toolMode == .angle {
            if let livePoint, let liveAngle = measurement.liveAngleAtLastPoint(with: livePoint) {
                resultCard(primary: String(format: "%.1f\u{00B0}", liveAngle), secondary: "live angle")
            }
        } else if toolMode == .height {
            if let livePoint, let liveHeight = measurement.liveVerticalHeight(with: livePoint) {
                resultCard(primary: UnitFormatting.feetAndInches(meters: liveHeight), secondary: "live height")
            }
        } else if !measurement.isClosed {
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
        if toolMode == .angle {
            angleResultCards
        } else if toolMode == .height {
            heightResultCards
        } else if measurement.isClosed {
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
        if let circleCheck = measurement.circleCheck, circleCheck.isCircle {
            resultCard(primary: UnitFormatting.feetAndInches(meters: circleCheck.radius), secondary: "radius")
        }
        if !measurement.interiorAngles.isEmpty {
            let anglesText = measurement.interiorAngles.map { String(format: "%.0f\u{00B0}", $0) }.joined(separator: ", ")
            resultCard(primary: anglesText, secondary: "interior angles")
        }
        if let planarity = measurement.planarityDeviation, planarity > 0.02 {
            readoutCapsule("\u{26A0} points aren't perfectly coplanar (\u{00B1}" + UnitFormatting.inches(meters: planarity) + ") \u{00B7} area is approximate")
        }
    }

    /// The dedicated Angle tool's result: the single angle at the vertex
    /// (`interiorAngles` on an open 3-point line gives exactly this,
    /// same math as the interior-angle display on a closed shape --
    /// nothing new to compute), plus the two ray lengths for context.
    @ViewBuilder
    private var angleResultCards: some View {
        if let angle = measurement.interiorAngles.first {
            resultCard(primary: String(format: "%.1f\u{00B0}", angle), secondary: "angle")
        }
        let rayLengths = measurement.segmentDistances
        if rayLengths.count == 2 {
            resultCard(primary: UnitFormatting.feetAndInches(meters: rayLengths[0]), secondary: "ray 1")
            resultCard(primary: UnitFormatting.feetAndInches(meters: rayLengths[1]), secondary: "ray 2")
        }
    }

    /// The dedicated Height tool's result: the vertical (gravity/
    /// world-up constrained) height between base and top point, per
    /// `docs/25_MEASUREMENT_TOOLS_CATALOG.md` section 5 -- not the raw
    /// 3D distance between the two taps, which would also fold in any
    /// horizontal drift. That drift is surfaced as its own warning
    /// instead, mirroring the planarity warning already used for area.
    @ViewBuilder
    private var heightResultCards: some View {
        if let height = measurement.verticalHeight {
            resultCard(primary: UnitFormatting.feetAndInches(meters: height), secondary: "height")
        }
        if let offset = measurement.horizontalOffset, offset > 0.02 {
            readoutCapsule("\u{26A0} " + UnitFormatting.feetAndInches(meters: offset) + " off vertical \u{00B7} height may be approximate")
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
            VStack(spacing: 14) {
                Picker("Tool", selection: $toolMode) {
                    Text("Length").tag(MeasureToolMode.length)
                    Text("Angle").tag(MeasureToolMode.angle)
                    Text("Height").tag(MeasureToolMode.height)
                }
                .pickerStyle(.segmented)
                .frame(maxWidth: 260)

                Button("Start Measure") {
                    state = .measuring
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }

        case .measuring:
            VStack(spacing: 14) {
                if toolMode == .length, measurement.isEmpty {
                    Button("Scan for Rectangle") {
                        scanRequestID += 1
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.regular)
                    .tint(.yellow)
                }

                HStack(spacing: 10) {
                    if toolMode == .length {
                        if measurement.canClose {
                            Button("Close Shape") {
                                measurement.closeShape()
                            }
                        }

                        Button("Finish") {
                            state = .finished
                        }
                        .disabled(measurement.pointCount < 2)
                    }

                    Button("Clear All", role: .destructive) {
                        measurement.clear()
                    }
                    .disabled(measurement.isEmpty)
                }
                .buttonStyle(.bordered)
                .controlSize(.regular)

                shutterRow
            }

        case .finished:
            VStack(spacing: 14) {
                HStack(spacing: 12) {
                    Button(newMeasurementButtonTitle) {
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

                circleIconButton(systemName: "camera.fill", diameter: 56, filled: true) {
                    screenshotRequestID += 1
                }
            }
        }
    }

    /// The three big always-reachable actions, styled after a
    /// camera-app shutter row (per user reference: an undo circle on the
    /// left, the primary action centered and large, a white shutter-style
    /// circle on the right) instead of small text buttons -- the user
    /// flagged the previous text-button layout as not matching this and
    /// the camera/screenshot button specifically as too small to use
    /// comfortably.
    private var shutterRow: some View {
        HStack {
            circleIconButton(systemName: "arrow.uturn.backward", diameter: 52) {
                measurement.undoLast()
            }
            .disabled(measurement.isEmpty)
            .opacity(measurement.isEmpty ? 0.35 : 1)

            Spacer()

            Button(action: primaryButtonAction) {
                Image(systemName: primaryIcon)
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 72, height: 72)
                    .background(Circle().fill(Color.accentColor))
            }
            .disabled(primaryButtonDisabled)
            .opacity(primaryButtonDisabled ? 0.35 : 1)

            Spacer()

            circleIconButton(systemName: "camera.fill", diameter: 64, filled: true) {
                screenshotRequestID += 1
            }
        }
        .padding(.horizontal, 36)
    }

    /// A large circular icon button -- `filled` gives the white
    /// "shutter button" look from the reference; otherwise it's a dark
    /// translucent circle matching the undo control next to it.
    private func circleIconButton(systemName: String, diameter: CGFloat, filled: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: diameter * 0.38, weight: .semibold))
                .foregroundStyle(filled ? Color.black : Color.white)
                .frame(width: diameter, height: diameter)
                .background(Circle().fill(filled ? Color.white : Color.black.opacity(0.55)))
        }
    }

    /// Icon shown on the primary (center) shutter-row button -- mirrors
    /// what `primaryButtonAction` below will actually do, since that
    /// button no longer carries a text label.
    private var primaryIcon: String {
        if toolMode == .height, measurement.pointCount == 1 {
            return "arrow.up"
        }
        if measurement.isClosed {
            return measurement.heightPoint == nil ? "arrow.up" : "checkmark"
        }
        return "plus"
    }

    private var newMeasurementButtonTitle: String {
        switch toolMode {
        case .angle: return "New Angle"
        case .height: return "New Height"
        case .length: return "New Measurement"
        }
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
            // Angle and Height modes are fixed short flows (3 taps, 2
            // taps respectively) -- no Close Shape/Finish needed, each
            // finishes automatically as soon as its last point lands.
            if toolMode == .angle, measurement.pointCount == 3 {
                state = .finished
            }
            if toolMode == .height, measurement.pointCount == 2 {
                state = .finished
            }
        }
    }
}

/// Thin wrapper around `UIActivityViewController` so the captured screenshot
/// can go through the system share sheet -- lets the user pick "Save Image"
/// themselves via the system's own Photos flow, which needs no
/// `NSPhotoLibraryAddUsageDescription` entry from this app (unlike calling
/// `UIImageWriteToSavedPhotosAlbum` directly would).
private struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    NavigationStack {
        ARMeasureScreen()
    }
}
