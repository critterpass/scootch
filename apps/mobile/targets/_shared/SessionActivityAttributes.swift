import ActivityKit
import Foundation

/// The Live Activity for the desk and its periods. The app starts it and the widget extension
/// draws it, so both compile this one definition. A push that starts or updates the activity
/// names this type (`attributes-type`) and sends `ContentState`'s fields as its `content-state`.
///
/// It has two modes. On the desk: a tiny chalkboard with the task, his face at the current
/// pressure and the fuse burning. During a period: the time left and his pacing.
struct SessionActivityAttributes: ActivityAttributes, Sendable {
    struct ContentState: Codable, Hashable, Sendable {
        /// When the period ends; the views count down to it. On the desk, when the day ends.
        let endDate: Date
        /// What Thầy Phú is saying. Empty on the desk.
        let line: String
        /// True while the phone has no connection: the session runs on, and says so.
        var offline: Bool? = nil
        /// `desk` or `session`. Nil is a session, as every activity was before the desk had one.
        var mode: String? = nil
        /// The pressure step when this state was sent, 0 to 5.
        var pressure: Int? = nil
        /// When the pressure rises next, one step at each, soonest first. The app makes the
        /// activity stale at the first, so the system draws it again with his new face.
        var pressureAt: [Date]? = nil
        /// When the fuse was lit and when it burns out. Nil when there is none.
        var fuseStart: Date? = nil
        var fuseEnd: Date? = nil
        /// When the period began, for the bar.
        var startDate: Date? = nil
        /// A serious task: quiet company, no fuse, no pressure, no pacing.
        var heavy: Bool? = nil
    }

    let taskTitle: String
    /// The task the session is for, which finds its start time in the shared snapshot.
    var taskId: String? = nil
}

extension SessionActivityAttributes.ContentState {
    var isDesk: Bool { mode == "desk" }
    var isHeavy: Bool { heavy ?? false }

    /// The pressure step at `date`: the step sent, plus one for every rise since.
    func pressure(at date: Date) -> Int {
        guard !isHeavy else { return 0 }
        let risen = (pressureAt ?? []).filter { $0 <= date }.count
        return min(5, max(0, (pressure ?? 0) + risen))
    }

    /// True while the fuse still burns at `date`.
    func fuseBurns(at date: Date) -> Bool {
        guard !isHeavy, let fuseEnd else { return false }
        return date < fuseEnd
    }
}
