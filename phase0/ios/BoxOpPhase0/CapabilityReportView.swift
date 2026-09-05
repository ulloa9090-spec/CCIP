import AVFoundation
import SwiftUI

struct CapabilityReportView: View {
    @State private var matrix = CapabilityDetector.detect()
    @State private var knownLimitations: String = ""
    @State private var rawNotes: String = ""
    @State private var showShareSheet = false
    @State private var exportURL: URL?

    var body: some View {
        Form {
            Section("Device") {
                row("Platform", matrix.platform)
                row("OS version", matrix.osVersion)
                row("Device model", matrix.deviceModel)
                row("Harness version", matrix.harnessVersion)
            }

            Section("Camera") {
                row("Available", bool: matrix.cameraAvailable)
                row("Authorization", matrix.cameraAuthorizationStatus)
                if matrix.cameraAuthorizationStatus == "notDetermined" {
                    Button("Request Camera Permission") {
                        requestCameraPermissionAndRefresh()
                    }
                }
            }

            Section("AR / Spatial") {
                row("World tracking supported", bool: matrix.arSupported)
                row("Detail", matrix.arSupportDetail)
                row("Plane detection", bool: matrix.planeDetectionSupported)
            }

            Section("Motion") {
                row("Accelerometer", bool: matrix.accelerometerAvailable)
                row("Gyroscope", bool: matrix.gyroscopeAvailable)
                row("Device motion (fused)", bool: matrix.deviceMotionAvailable)
            }

            Section("Depth") {
                row("Scene depth supported", bool: matrix.depthSupported)
                row("LiDAR mesh available", bool: matrix.lidarAvailable)
                row("Discrete ToF", bool: matrix.tofAvailable)
            }

            Section("Recommended strategy") {
                Text(matrix.selectedMeasurementStrategy)
                    .font(.subheadline)
                Text("Fallback: \(matrix.fallbackStrategy)")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Section("Tester notes") {
                TextField("Known limitations observed", text: $knownLimitations, axis: .vertical)
                TextField("Raw notes", text: $rawNotes, axis: .vertical)
            }

            Section {
                Button("Refresh") {
                    matrix = CapabilityDetector.detect()
                }
                Button("Export Capability Matrix (JSON)") {
                    exportURL = writeMatrixToTempFile()
                    showShareSheet = exportURL != nil
                }
            }
        }
        .sheet(isPresented: $showShareSheet) {
            if let exportURL {
                ActivityView(activityItems: [exportURL])
            }
        }
    }

    private func requestCameraPermissionAndRefresh() {
        AVCaptureDevice.requestAccess(for: .video) { _ in
            DispatchQueue.main.async {
                matrix = CapabilityDetector.detect()
            }
        }
    }

    private func currentMatrix() -> CapabilityMatrix {
        CapabilityMatrix(
            platform: matrix.platform,
            osVersion: matrix.osVersion,
            deviceModel: matrix.deviceModel,
            harnessVersion: matrix.harnessVersion,
            timestamp: matrix.timestamp,
            cameraAvailable: matrix.cameraAvailable,
            cameraAuthorizationStatus: matrix.cameraAuthorizationStatus,
            arSupported: matrix.arSupported,
            arSupportDetail: matrix.arSupportDetail,
            planeDetectionSupported: matrix.planeDetectionSupported,
            accelerometerAvailable: matrix.accelerometerAvailable,
            gyroscopeAvailable: matrix.gyroscopeAvailable,
            deviceMotionAvailable: matrix.deviceMotionAvailable,
            depthSupported: matrix.depthSupported,
            lidarAvailable: matrix.lidarAvailable,
            tofAvailable: matrix.tofAvailable,
            selectedMeasurementStrategy: matrix.selectedMeasurementStrategy,
            fallbackStrategy: matrix.fallbackStrategy,
            knownLimitations: knownLimitations,
            rawNotes: rawNotes
        )
    }

    private func writeMatrixToTempFile() -> URL? {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        guard let data = try? encoder.encode(currentMatrix()) else { return nil }

        let filename = "boxop-capability-matrix-\(Int(Date().timeIntervalSince1970)).json"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        do {
            try data.write(to: url)
            return url
        } catch {
            return nil
        }
    }

    @ViewBuilder
    private func row(_ label: String, _ value: String) -> some View {
        LabeledContent(label, value: value)
    }

    @ViewBuilder
    private func row(_ label: String, bool value: Bool) -> some View {
        LabeledContent(label, value: value ? "Yes" : "No")
    }
}

/// Thin UIKit share-sheet bridge. SwiftUI has no native share-sheet API as
/// of this writing, so wrapping UIActivityViewController is the standard
/// approach.
struct ActivityView: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    NavigationStack {
        CapabilityReportView()
    }
}
