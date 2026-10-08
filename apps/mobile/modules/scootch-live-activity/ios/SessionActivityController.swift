import ActivityKit
import Foundation

/// A value from JavaScript that cannot describe a session activity.
enum SessionActivityError: Error, CustomStringConvertible {
    case invalidAttributes
    case invalidState

    var description: String {
        switch self {
        case .invalidAttributes: return "attributes need a taskTitle string"
        case .invalidState:
            return "state needs endDate (milliseconds since 1970), a line string and, when it has a hunt or a caught card, a whole one"
        }
    }
}

/// Everything the bridge does with ActivityKit. It imports nothing from Expo, so it type-checks
/// against the iOS SDK alone. Values cross from JavaScript as dictionaries, with dates as
/// milliseconds since 1970.
enum SessionActivityController {
    typealias SessionActivity = Activity<SessionActivityAttributes>

    static var areActivitiesEnabled: Bool {
        ActivityAuthorizationInfo().areActivitiesEnabled
    }

    /// Returns the new activity's id. Throws what ActivityKit throws when it refuses the request.
    static func start(
        attributes: [String: Any], state: [String: Any], options: [String: Any]?
    ) throws -> String {
        guard let taskTitle = attributes["taskTitle"] as? String else {
            throw SessionActivityError.invalidAttributes
        }
        let wantsPushUpdates = options?["pushUpdates"] as? Bool ?? false
        let activity = try SessionActivity.request(
            attributes: SessionActivityAttributes(
                taskTitle: taskTitle, taskId: attributes["taskId"] as? String),
            content: try content(from: state, options: options),
            pushType: wantsPushUpdates ? .token : nil
        )
        if wantsPushUpdates {
            SessionPushTokens.shared.observe(activity)
        }
        return activity.id
    }

    /// False when no activity has that id, for one the user or the system already removed.
    static func update(id: String, state: [String: Any], options: [String: Any]?) async throws -> Bool {
        guard let activity = find(id) else { return false }
        // An update that says nothing of the table (a line turning, the clock moving) keeps the
        // table that is there: only an update that names it, as a table or as none, changes it.
        var whole = state
        if whole["table"] == nil, let table = json(from: activity.content.state.table) {
            whole["table"] = table
        }
        await activity.update(try content(from: whole, options: options))
        return true
    }

    /// Ends the activity. With no `dismissAfterSeconds` the system decides how long the ended
    /// activity stays on the Lock Screen; zero or less removes it at once.
    static func end(
        id: String, finalState: [String: Any]?, dismissAfterSeconds: Double?
    ) async throws -> Bool {
        let finalContent = try finalState.map { try content(from: $0, options: nil) }
        guard let activity = find(id) else { return false }
        let policy: ActivityUIDismissalPolicy
        if let dismissAfterSeconds {
            policy = dismissAfterSeconds <= 0
                ? .immediate
                : .after(Date().addingTimeInterval(dismissAfterSeconds))
        } else {
            policy = .default
        }
        await activity.end(finalContent, dismissalPolicy: policy)
        return true
    }

    /// Every session activity the system still holds, including ended ones not yet dismissed.
    static func listActive() -> [[String: Any]] {
        SessionActivity.activities.map { activity in
            [
                "id": activity.id,
                "attributes": [
                    "taskTitle": activity.attributes.taskTitle,
                    "taskId": activity.attributes.taskId ?? NSNull(),
                ] as [String: Any],
                "state": [
                    "endDate": activity.content.state.endDate.timeIntervalSince1970 * 1000,
                    "line": activity.content.state.line,
                    "hunt": json(from: activity.content.state.hunt) ?? NSNull(),
                    "offline": activity.content.state.offline ?? NSNull(),
                    "caught": json(from: activity.content.state.caught) ?? NSNull(),
                    "table": json(from: activity.content.state.table) ?? NSNull(),
                ] as [String: Any],
                "status": status(of: activity),
            ]
        }
    }

    private static func find(_ id: String) -> SessionActivity? {
        SessionActivity.activities.first { $0.id == id }
    }

    private static func content(
        from state: [String: Any], options: [String: Any]?
    ) throws -> ActivityContent<SessionActivityAttributes.ContentState> {
        guard let endDate = date(state["endDate"]), let line = state["line"] as? String else {
            throw SessionActivityError.invalidState
        }
        // A hunt or a card that cannot be read is a mistake in the caller, not a session without one.
        var hunt: HuntRecord?
        if let given = state["hunt"], !(given is NSNull) {
            guard let record = value(HuntRecord.self, from: given) else {
                throw SessionActivityError.invalidState
            }
            hunt = record
        }
        var caught: SessionActivityAttributes.CaughtCard?
        if let given = state["caught"], !(given is NSNull) {
            guard let card = value(SessionActivityAttributes.CaughtCard.self, from: given) else {
                throw SessionActivityError.invalidState
            }
            caught = card
        }
        // A table that cannot be read is left out: the session still shows as a hunt.
        let table = state["table"].flatMap { given in
            given is NSNull ? nil : value(SessionActivityAttributes.Table.self, from: given)
        }
        return ActivityContent(
            state: SessionActivityAttributes.ContentState(
                endDate: endDate, line: line, hunt: hunt, offline: state["offline"] as? Bool,
                caught: caught, table: table),
            staleDate: date(options?["staleDate"])
        )
    }

    /// A value as JavaScript sends it: the type's own fields, times in milliseconds.
    private static func value<T: Decodable>(_ type: T.Type, from given: Any) -> T? {
        guard JSONSerialization.isValidJSONObject(given),
            let data = try? JSONSerialization.data(withJSONObject: given)
        else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    private static func json<T: Encodable>(from value: T?) -> [String: Any]? {
        guard let value, let data = try? JSONEncoder().encode(value) else { return nil }
        return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    }

    private static func date(_ milliseconds: Any?) -> Date? {
        guard let value = (milliseconds as? NSNumber)?.doubleValue, value.isFinite else { return nil }
        return Date(timeIntervalSince1970: value / 1000)
    }

    private static func status(of activity: SessionActivity) -> String {
        switch activity.activityState {
        case .active: return "active"
        case .ended: return "ended"
        case .dismissed: return "dismissed"
        case .stale: return "stale"
        default: return "unknown"
        }
    }
}
