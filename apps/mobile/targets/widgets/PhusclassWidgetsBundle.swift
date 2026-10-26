import SwiftUI
import WidgetKit

/// Phu's Class outside the app: today's widget and the session's Live Activity.
@main
struct PhusclassWidgetsBundle: WidgetBundle {
    var body: some Widget {
        TodayWidget()
        SessionLiveActivity()
    }
}
