import ActivityKit
import Foundation

/// The Live Activity for a work session. The app starts it and the widget extension draws it, so
/// both compile this one definition (and `HuntRecord`, which it carries).
struct SessionActivityAttributes: ActivityAttributes, Sendable {
    struct ContentState: Codable, Hashable, Sendable {
        /// When the session ends; the views count down to it.
        let endDate: Date
        /// What Scootch is saying. A state of the hunt that has words of its own shows those.
        let line: String
        /// The session as the Lock Screen follows it. Without one the activity shows a plain
        /// running session that ends at `endDate`.
        var hunt: HuntRecord? = nil
        /// True while the phone has no connection: the session runs on, and says so.
        var offline: Bool? = nil
        /// The card of a hunt that was caught. It is carried here because the shared snapshot
        /// has moved on to the rest of the day by the time the card is looked at.
        var caught: CaughtCard? = nil
    }

    struct CaughtCard: Codable, Hashable, Sendable {
        let name: String
        /// The monster's picture in the App Group container.
        let image: String?
        /// Its place on the shelf.
        let number: Int
    }

    let taskTitle: String
    /// The task the session is for, which finds its monster and its words in the shared snapshot.
    var taskId: String? = nil
}
