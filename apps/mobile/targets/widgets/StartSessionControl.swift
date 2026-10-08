import AppIntents
import SwiftUI
import WidgetKit

/// The Control Center control, also offered for the Lock Screen and the Action button: one press
/// starts ten minutes on the thing that has waited longest, with no app in front. While hunting
/// it opens Scootch to park a thought, and with nothing waiting it opens Scootch to say one.
@available(iOS 26.0, *)
struct HuntControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "ScootchHunt") {
            ControlWidgetButton(action: StartOrParkIntent()) {
                Label {
                    Text("Scootch")
                    Text("Hunt 10 min")
                } icon: {
                    // A control's picture has to be a symbol; baked art cannot be drawn here.
                    Image(systemName: "timer")
                }
            }
        }
        .displayName("Hunt 10 min")
        .description("Starts ten minutes on the thing that has waited longest.")
    }
}

/// The control that always opens Scootch: it starts ten minutes on today's one thing, or shows
/// the composer when there is no task yet. Before iOS 26 it is the only one, since a press that
/// only sometimes needs the app cannot open it there.
@available(iOS 18.0, *)
struct StartSessionControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "ScootchStartSession") {
            ControlWidgetButton(action: StartSessionIntent()) {
                Label {
                    Text("Scootch")
                    Text("Start 10 min")
                } icon: {
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
