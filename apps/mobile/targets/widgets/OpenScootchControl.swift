import AppIntents
import SwiftUI
import WidgetKit

/// Placeholder Control Center control: one button that opens the app.
@available(iOS 18.0, *)
struct OpenScootchControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "ScootchOpenControl") {
            ControlWidgetButton(action: OpenScootchIntent()) {
                Label("Scootch placeholder", systemImage: "pawprint")
            }
        }
        .displayName("Open Scootch")
        .description("Placeholder control that opens Scootch.")
    }
}
