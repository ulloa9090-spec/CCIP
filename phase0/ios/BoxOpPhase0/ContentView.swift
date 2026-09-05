import SwiftUI

/// Phase 0 shell. Currently ships the capability report only; the AR
/// point-to-point measurement screen is the next queued task (see
/// phase0/README.md) and will be added as a second tab here.
struct ContentView: View {
    var body: some View {
        NavigationStack {
            CapabilityReportView()
                .navigationTitle("BoxOp Phase 0")
        }
    }
}

#Preview {
    ContentView()
}
