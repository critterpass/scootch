import AppIntents
import SwiftUI
import WidgetKit

/// The Control Center control, also offered for the Lock Screen and the Action button: one press
/// opens Scootch and starts ten minutes on today's one thing, or shows the composer when there
/// is no task yet.
@available(iOS 18.0, *)
struct StartSessionControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "ScootchStartSession") {
            ControlWidgetButton(action: StartSessionIntent()) {
                Label {
                    Text("Scootch")
                    Text("Start 10 min")
                } icon: {
                    // A control's picture has to be a symbol; baked art cannot be drawn here.
                    Image(systemName: "play.fill")
                }
            }
        }
        .displayName("Start 10 min")
        .description("Starts ten minutes on today's one thing.")
    }
}

/// A second control for the brain dump: opens Scootch listening.
@available(iOS 18.0, *)
struct BrainDumpControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "ScootchBrainDump") {
            ControlWidgetButton(action: BrainDumpIntent()) {
                Label("Brain dump", systemImage: "waveform")
            }
        }
        .displayName("Brain dump")
        .description("Opens Scootch ready to listen.")
    }
}
