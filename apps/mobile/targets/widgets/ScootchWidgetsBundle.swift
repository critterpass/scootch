import SwiftUI
import WidgetKit

/// Scootch outside the app: the widgets, the session's Live Activity and the controls.
@main
struct ScootchWidgetsBundle: WidgetBundle {
    var body: some Widget {
        LurkerWidget()
        LurkersWidget()
        ShelfWidget()
        TerrariumWidget()
        SessionLiveActivity()
        if #available(iOS 18.0, *) {
            StartSessionControl()
            BrainDumpControl()
        }
        if #available(iOS 26.0, *) {
            HuntControl()
        }
    }
}
