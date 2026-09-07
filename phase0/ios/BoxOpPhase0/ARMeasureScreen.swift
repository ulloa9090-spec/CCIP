import SceneKit
import SwiftUI

/// AR point-to-point measurement spike: tap a surface twice, see the real
/// 3D distance between the two points. Deliberately the only measurement
/// capability in this build — see `phase0/README.md` for what comes next
/// and what is explicitly out of scope for now (box/cuboid, cylinder,
/// sessions, CV assistance, bins, reports, sync, ...).
struct ARMeasureScreen: View {
    @State private var pointA: SCNVector3?
    @State private var pointB: SCNVector3?
    @State private var raycastSource: RaycastSource?
    @State private var sessionToken = UUID()

    private var distanceMeters: Float? {
        guard let a = pointA, let b = pointB else { return nil }
        return PointToPointMeasurement.distance(from: a, to: b)
    }

    private var instructionText: String {
        if pointA == nil {
            return "Tap a surface to place the first point"
        }
        if pointB == nil {
            return "Now tap the second point"
        }
        return "Tap anywhere to start a new measurement"
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            ARMeasureView(pointA: $pointA, pointB: $pointB, raycastSource: $raycastSource)
                .id(sessionToken)
                .ignoresSafeArea()

            VStack(spacing: 12) {
                Text(instructionText)
                    .font(.subheadline)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(.ultraThinMaterial, in: Capsule())

                if let distanceMeters, let raycastSource {
                    VStack(spacing: 2) {
                        Text(String(format: "%.3f m", distanceMeters))
                            .font(.title2.bold())
                        Text("point-to-point \u{00B7} source: \(raycastSource.rawValue)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(12)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14))
                }

                Button("Reset", role: .destructive) {
                    pointA = nil
                    pointB = nil
                    raycastSource = nil
                    sessionToken = UUID()
                }
                .buttonStyle(.borderedProminent)
            }
            .padding(.bottom, 24)
        }
        .navigationTitle("AR Point-to-Point")
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationStack {
        ARMeasureScreen()
    }
}
