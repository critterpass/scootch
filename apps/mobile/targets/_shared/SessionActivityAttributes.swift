import ActivityKit
import Foundation

/// The Live Activity for a work session. The app starts it and the widget extension draws it, so
/// both compile this one definition. A push that starts or updates the activity names this type
/// (`attributes-type`) and sends `ContentState`'s fields as its `content-state`.
struct SessionActivityAttributes: ActivityAttributes, Sendable {
    struct ContentState: Codable, Hashable, Sendable {
        /// When the session ends; the views count down to it.
        let endDate: Date
        /// What Thầy Phú is saying.
        let line: String
        /// True while the phone has no connection: the session runs on, and says so.
        var offline: Bool? = nil
    }

    let taskTitle: String
    /// The task the session is for, which finds its start time in the shared snapshot.
    var taskId: String? = nil
}
