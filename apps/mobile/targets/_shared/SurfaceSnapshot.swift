import Foundation

/// Today as the widgets, the Live Activity and the control draw it. The app writes it to the App
/// Group as one JSON string (apps/mobile/src/features/surfaces/surface-snapshot.ts); the fields
/// here mirror that file one for one. Times are milliseconds since 1970.
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

    enum Attitude: String, Codable, Sendable {
        case soft, cheeky, unhinged
    }

    struct TimedLine: Codable, Equatable, Sendable {
        let at: Double
        let text: String
    }

    let version: Int
    let state: DayState
    /// Always nil on a crisis day.
    let task: String?
    let sessionStartedAt: Double?
    let sessionEndsAt: Double?
    /// Both nil for a serious task and on a crisis day.
    let monsterName: String?
    let monsterImage: String?
    let line: String?
    /// The lines the Live Activity turns to during the running session, soonest first.
    let sessionLines: [TimedLine]
    let attitude: Attitude
    let language: String
    let weekBars: Int
    let worldThings: Int
    let plus: Bool
    /// When the day this snapshot describes rolls over into the next one.
    let dayEndsAt: Double
    /// The ink the person wears, as a six-digit hex colour. Nil is tomato, and so is a snapshot
    /// written before there were inks.
    let accent: String?

    /// What every surface shows before the app has written anything, or after a version it
    /// cannot read: nothing yet, in plain words.
    static let empty = SurfaceSnapshot(
        version: currentVersion, state: .nothingYet, task: nil, sessionStartedAt: nil,
        sessionEndsAt: nil, monsterName: nil, monsterImage: nil, line: nil, sessionLines: [],
        attitude: .cheeky, language: Locale.preferredLanguages.first?.hasPrefix("vi") == true ? "vi" : "en",
        weekBars: 0, worldThings: 0, plus: false, dayEndsAt: .greatestFiniteMagnitude,
        accent: nil)

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
            version: version, state: .nothingYet, task: nil, sessionStartedAt: nil,
            sessionEndsAt: nil, monsterName: nil, monsterImage: nil, line: nil, sessionLines: [],
            attitude: attitude, language: language, weekBars: weekBars, worldThings: worldThings,
            plus: plus, dayEndsAt: .greatestFiniteMagnitude, accent: accent)
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
