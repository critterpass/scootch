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
        /// The table the session is at. While its clock runs the Lock Screen and the Island show
        /// the table in place of the race.
        var table: Table? = nil
    }

    /// A table as the surfaces show it: who is seated and what each is at, in one or two words
    /// that are never the task. The app writes it, and a push from the table can replace it.
    struct Table: Codable, Hashable, Sendable {
        struct Seat: Codable, Hashable, Sendable, Identifiable {
            let id: String
            /// Nil for the person's own seat, which reads "You", and for a seat with no name.
            let name: String?
            /// Nil when the label says nothing of the work: a serious or unscreened task.
            let label: String?
            let you: Bool
            /// They waved at this person a moment ago.
            let waved: Bool
            /// They said they have finished, this session.
            let done: Bool
            /// No connection and not in the session: an empty chair for now.
            let away: Bool
        }

        let id: String
        let seats: [Seat]
        /// The waves this person may still send, across the table.
        let nudgesLeft: Int
        /// The seat that waved last, which "Wave back" answers.
        let wavedBy: String?
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
