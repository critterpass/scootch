import ActivityKit
import Foundation

/// The Live Activity for a work session. The app starts it and the widget extension draws it, so
/// both compile this one definition.
struct SessionActivityAttributes: ActivityAttributes, Sendable {
    struct ContentState: Codable, Hashable, Sendable {
        /// When the session ends; the views count down to it.
        let endDate: Date
        /// One line of text shown under the title.
        let line: String
    }

    let taskTitle: String
}
