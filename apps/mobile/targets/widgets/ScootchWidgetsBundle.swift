import SwiftUI
import WidgetKit

/// Placeholder system surfaces. Each one is labelled as a placeholder until its real view exists.
@main
struct ScootchWidgetsBundle: WidgetBundle {
    var body: some Widget {
        PlaceholderSmallWidget()
        PlaceholderMediumWidget()
        SessionLiveActivity()
        if #available(iOS 18.0, *) {
            OpenScootchControl()
        }
    }
}
