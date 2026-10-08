import ActivityKit
import Foundation

/// Moves the hunt from outside the app: the record in the App Group and the Live Activity that
/// shows it, together. The intents call this, and they run in the app's process, so the app's
/// own activity is the one found here. Nothing in it touches the day's tables: the app adopts the
/// record when it is next opened.
enum HuntActivity {
    typealias SessionActivity = Activity<SessionActivityAttributes>

    static func nowMs() -> Double { Date().timeIntervalSince1970 * 1000 }

    private static func date(_ ms: Double) -> Date { Date(timeIntervalSince1970: ms / 1000) }

    /// The activity that shows this task's hunt, if the system still holds one.
    static func activity(for taskId: String) -> SessionActivity? {
        SessionActivity.activities.first {
            $0.activityState != .dismissed && $0.activityState != .ended
                && ($0.attributes.taskId == taskId || $0.content.state.hunt?.taskId == taskId)
        }
    }

    /// Any activity still on the Lock Screen: a hunt on one thing is the only hunt.
    static var current: SessionActivity? {
        SessionActivity.activities.first {
            $0.activityState != .dismissed && $0.activityState != .ended
        }
    }

    private static func content(
        _ record: HuntRecord, line: String, offline: Bool?,
        caught: SessionActivityAttributes.CaughtCard? = nil, at now: Double
    ) -> ActivityContent<SessionActivityAttributes.ContentState> {
        ActivityContent(
            state: SessionActivityAttributes.ContentState(
                endDate: date(record.endsAt), line: line, hunt: record, offline: offline,
                caught: caught),
            staleDate: record.nextChange(after: now).map(date))
    }

    /// Begins ten minutes (or `minutes`) on a task: writes the record, shows the count-in and,
    /// when it is over and nobody said "Not yet", sets the clock running. False when another hunt
    /// is already on, when the task has no words to hunt with, or when Live Activities are off.
    @discardableResult
    static func begin(taskId: String, minutes: Double = 10, waitsForCountIn: Bool = true) async -> Bool {
        let snapshot = SurfaceSnapshot.load()
        let shown = snapshot.shown(at: Date())
        guard shown.state != .crisis, current == nil, !isLive(HuntStore.load()),
            let lines = shown.huntLines(for: taskId)
        else { return false }
        let title = shown.lurker(for: taskId)?.task ?? shown.task ?? ""
        let started = nowMs()
        let record = HuntRecord.begin(taskId: taskId, minutes: minutes, at: started)
        let opening = lines.start ?? lines.working.first ?? ""
        guard ActivityAuthorizationInfo().areActivitiesEnabled,
            (try? SessionActivity.request(
                attributes: SessionActivityAttributes(taskTitle: title, taskId: taskId),
                content: content(record, line: opening, offline: nil, at: started),
                pushType: nil)) != nil
        else { return false }
        HuntStore.store(record)

        // The count-in is drawn from the record; this only moves the words on when it ends. An
        // answer that should not wait three seconds (Siri's) leaves that to happen behind it.
        let afterCountIn = {
            try? await Task.sleep(nanoseconds: UInt64(HuntRecord.countInMs * 1_000_000))
            guard let still = HuntStore.load(), still == record else { return }
            await show(still, line: lines.working.first ?? opening)
        }
        if waitsForCountIn { await afterCountIn() } else { Task { await afterCountIn() } }
        return true
    }

    /// Whether a stored record still stands for a hunt that is on. One that is over, or whose
    /// time ran out with nothing on the Lock Screen to show for it, was left behind and is
    /// written over.
    static func isLive(_ record: HuntRecord?) -> Bool {
        guard let record, record.caughtAt == nil, record.stoppedAt == nil else { return false }
        return record.pausedAt != nil || nowMs() < record.endsAt
    }

    /// Draws the record as it now stands. `line` replaces what Scootch says; nil keeps it.
    static func show(_ record: HuntRecord, line: String? = nil) async {
        guard let activity = activity(for: record.taskId) ?? current else { return }
        let state = activity.content.state
        await activity.update(
            content(
                record, line: line ?? state.line, offline: state.offline, caught: state.caught,
                at: nowMs()))
    }

    /// Changes the stored record and draws the result. Does nothing when no hunt is on.
    @discardableResult
    static func move(
        line: (SurfaceSnapshot.HuntLines?) -> String? = { _ in nil },
        _ change: (HuntRecord, Double) -> HuntRecord
    ) async -> HuntRecord? {
        guard let record = HuntStore.load() else { return nil }
        let next = change(record, nowMs())
        HuntStore.store(next)
        let lines = SurfaceSnapshot.load().huntLines(for: record.taskId)
        await show(next, line: line(lines))
        return next
    }

    /// "Not yet" in the count-in, or a stop the person chose: the record goes, and the activity
    /// with it at once. A hunt stopped after its clock started stays to offer its two choices.
    static func stop() async {
        guard let record = HuntStore.load() else { return }
        guard let stopped = record.stopped(at: nowMs()) else {
            HuntStore.store(nil)
            await (activity(for: record.taskId) ?? current)?.end(nil, dismissalPolicy: .immediate)
            return
        }
        HuntStore.store(stopped)
        let lines = SurfaceSnapshot.load().huntLines(for: record.taskId)
        await show(stopped, line: lines?.stoppedEarly)
    }

    /// One of the two calm choices after stopping early was taken: nothing is left to show.
    static func clear() async {
        let record = HuntStore.load()
        HuntStore.store(nil)
        let shown = record.flatMap { activity(for: $0.taskId) } ?? current
        await shown?.end(nil, dismissalPolicy: .immediate)
    }
}
