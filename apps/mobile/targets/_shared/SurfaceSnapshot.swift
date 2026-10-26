import Foundation

/// Today as the widgets and the Live Activity draw it. The app writes it to the App Group as one
/// JSON string under `AppGroup.Key.surfaceSnapshot`; the fields here mirror what the app writes,
/// and any other field it writes is ignored. Times are milliseconds since 1970.
struct SurfaceSnapshot: Codable, Equatable, Sendable {
    static let currentVersion = 1

    enum DayState: String, Codable, Sendable {
        case nothingYet = "nothing_yet"
        case taskSet = "task_set"
        case inSession = "in_session"
        case done
        case serious
        case crisis
    }

    struct TimedLine: Codable, Equatable, Sendable {
        let at: Double
        let text: String
    }

    let version: Int
    let state: DayState
    /// The task on the desk. Both nil on a crisis day and when there is none.
    let taskId: String?
    let task: String?
    let sessionStartedAt: Double?
    let sessionEndsAt: Double?
    /// What Thầy Phú says about today, as the app last wrote it. Nil on a crisis day.
    let line: String?
    /// The lines the Live Activity turns to during the running session, soonest first.
    let sessionLines: [TimedLine]
    /// The language the person chose in the app: "en" or "vi".
    let language: String
    /// When the day this snapshot describes rolls over into the next one.
    let dayEndsAt: Double

    /// What every surface shows before the app has written anything, or after a version it
    /// cannot read: nothing yet, in plain words.
    static let empty = SurfaceSnapshot(
        version: currentVersion, state: .nothingYet, taskId: nil, task: nil,
        sessionStartedAt: nil, sessionEndsAt: nil, line: nil, sessionLines: [],
        language: Locale.preferredLanguages.first?.hasPrefix("vi") == true ? "vi" : "en",
        dayEndsAt: .greatestFiniteMagnitude)

    /// Nil when the text is not a snapshot of the version this code reads.
    static func decode(_ json: String) -> SurfaceSnapshot? {
        guard let data = json.data(using: .utf8),
            let snapshot = try? JSONDecoder().decode(SurfaceSnapshot.self, from: data),
            snapshot.version == currentVersion
        else { return nil }
        return snapshot
    }

    static func load(from defaults: UserDefaults? = AppGroup.defaults) -> SurfaceSnapshot {
        guard let json = defaults?.string(forKey: AppGroup.Key.surfaceSnapshot) else { return .empty }
        return decode(json) ?? .empty
    }

    var dayEnd: Date {
        Date(timeIntervalSince1970: min(dayEndsAt / 1000, Date.distantFuture.timeIntervalSince1970))
    }

    /// The snapshot as it reads at `date`. Once its day is over, and the app has not been opened
    /// to write the new one, nothing of yesterday is shown: it is a day with nothing yet.
    func shown(at date: Date) -> SurfaceSnapshot {
        guard date >= dayEnd else { return self }
        return SurfaceSnapshot(
            version: version, state: .nothingYet, taskId: nil, task: nil,
            sessionStartedAt: nil, sessionEndsAt: nil, line: nil, sessionLines: [],
            language: language, dayEndsAt: .greatestFiniteMagnitude)
    }

    var sessionEnd: Date? {
        sessionEndsAt.map { Date(timeIntervalSince1970: $0 / 1000) }
    }

    var sessionStart: Date? {
        sessionStartedAt.map { Date(timeIntervalSince1970: $0 / 1000) }
    }

    /// True while a session's timer is still running at `date`.
    func isRunning(at date: Date) -> Bool {
        guard let end = sessionEnd else { return false }
        return (state == .inSession || state == .serious) && date < end
    }

    /// The line the session has turned to by `date`, or nil before the first turn.
    func sessionLine(at date: Date) -> String? {
        let now = date.timeIntervalSince1970 * 1000
        return sessionLines.last { $0.at <= now }?.text
    }
}
