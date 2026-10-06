import ActivityKit
import Foundation

/// Watches the push tokens ActivityKit hands out and passes them to whoever is listening.
///
/// Process-wide: the Expo module is recreated on every JavaScript reload while the activities and
/// their token streams live on, so a module instance only brings its own sink.
final class SessionPushTokens: @unchecked Sendable {
    /// `id` is the activity the token updates, or nil for the token that starts a new activity.
    typealias Sink = @Sendable (_ activityId: String?, _ token: String) -> Void

    static let shared = SessionPushTokens()

    private let lock = NSLock()
    private var sink: Sink?
    private var activityTasks: [String: Task<Void, Never>] = [:]
    private var newActivitiesTask: Task<Void, Never>?
    private var startTokenTask: Task<Void, Never>?

    func setSink(_ newSink: Sink?) {
        lock.withLock { sink = newSink }
    }

    /// Watches every activity the system already holds, each one that appears later (one started
    /// by a push has no other way to report its token) and the token that starts a new one.
    func observeAll() {
        for activity in Activity<SessionActivityAttributes>.activities {
            observe(activity)
        }
        lock.withLock {
            if newActivitiesTask == nil {
                newActivitiesTask = Task { [weak self] in
                    for await activity in Activity<SessionActivityAttributes>.activityUpdates {
                        self?.observe(activity)
                    }
                }
            }
            if startTokenTask == nil, #available(iOS 17.2, *) {
                startTokenTask = Task { [weak self] in
                    for await token in Activity<SessionActivityAttributes>.pushToStartTokenUpdates {
                        self?.emit(activityId: nil, token: token)
                    }
                }
            }
        }
    }

    /// The stream yields nothing for an activity started without push updates, and finishes when
    /// the activity is gone.
    func observe(_ activity: Activity<SessionActivityAttributes>) {
        let id = activity.id
        lock.withLock {
            guard activityTasks[id] == nil else { return }
            activityTasks[id] = Task { [weak self] in
                for await token in activity.pushTokenUpdates {
                    self?.emit(activityId: id, token: token)
                }
                self?.forget(id)
            }
        }
    }

    private func forget(_ id: String) {
        lock.withLock { activityTasks[id] = nil }
    }

    private func emit(activityId: String?, token: Data) {
        let hex = token.map { String(format: "%02x", $0) }.joined()
        let current = lock.withLock { sink }
        current?(activityId, hex)
    }
}
