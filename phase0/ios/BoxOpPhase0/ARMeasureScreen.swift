import SwiftUI

/// Continuous multi-point AR measurement: start, add as many points as you
/// want, see each segment and the running total, undo, finish. This is the
/// generalized successor to the earlier fixed two-point spike — see
/// `MultiPointMeasurement.swift` for why there's no `pointA`/`pointB` here.
/// Deliberately out of scope for now: Close Shape, perimeter, polygon area,
/// rectangle detection, height/depth chains, volume (see `phase0/README.md`).
struct ARMeasureScreen: View {
    @State private var state: ARMeasureState = .idle
    @State private var measurement = MultiPointMeasurement()
    @State private var livePoint: SIMD3<Float>?
    @State private var raycastSource: RaycastSource?

    private var liveSegmentDistance: Float? {
        guard let livePoint else { return nil }
        return measurement.liveSegmentDistance(to: livePoint)
    }

    private var liveTotalDistance: Float {
        measurement.liveTotalDistance(includingLivePoint: state == .measuring ? livePoint : nil)
    }

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
                readoutCapsule(measurement.isEmpty
                    ? "Tap Add Point to place the first point"
                    : "Point \(measurement.pointCount) placed \u{00B7} move to the next point")

                if let liveSegmentDistance {
                    resultCard(
                        primary: String(format: "%.3f m", liveSegmentDistance),
                        secondary: "current segment" + (raycastSource.map { " \u{00B7} \($0.rawValue)" } ?? "")
                    )
                }

                if measurement.pointCount > 1 {
                    resultCard(
                        primary: String(format: "total: %.3f m", liveTotalDistance),
                        secondary: "\(measurement.pointCount) points \u{00B7} \(measurement.segmentDistances.count) segments"
                    )
                }
            }

        case .finished:
            VStack(spacing: 6) {
                readoutCapsule("Measurement finished")
                resultCard(
                    primary: String(format: "total: %.3f m", measurement.totalDistance),
                    secondary: "\(measurement.pointCount) points \u{00B7} \(measurement.segmentDistances.count) segments"
                )
            }
        }
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
                Button("Add Point") {
                    guard let livePoint else { return }
                    measurement.addPoint(livePoint)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(livePoint == nil)

                HStack(spacing: 10) {
                    Button("Undo Last Point") {
                        measurement.undoLast()
                    }
                    .disabled(measurement.isEmpty)

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
}

#Preview {
    NavigationStack {
        ARMeasureScreen()
    }
}
