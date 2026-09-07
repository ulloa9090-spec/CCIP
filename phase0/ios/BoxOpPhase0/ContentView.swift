import SwiftUI

/// Phase 0 shell: capability report (validated on real hardware, see
/// phase0/evidence/ios/) plus the AR point-to-point measurement spike
/// (this build's only measurement capability so far).
struct ContentView: View {
    var body: some View {
        TabView {
            NavigationStack {
                CapabilityReportView()
                    .navigationTitle("BoxOp Phase 0")
            }
            .tabItem {
                Label("Capabilities", systemImage: "checkmark.shield")
            }

            NavigationStack {
                ARMeasureScreen()
            }
            .tabItem {
                Label("Measure", systemImage: "ruler")
            }
        }
    }
}

#Preview {
    ContentView()
}
