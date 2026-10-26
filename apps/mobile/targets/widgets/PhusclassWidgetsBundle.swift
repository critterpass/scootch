import SwiftUI
import WidgetKit

/// Phu's Class outside the app: the desk (free), the chalkboard, the timetable and the desk at
/// night (tuition), and the desk's Live Activity.
@main
struct PhusclassWidgetsBundle: WidgetBundle {
    var body: some Widget {
        TodayWidget()
        ChalkboardWidget()
        TimetableWidget()
        NightWidget()
        SessionLiveActivity()
    }
}
