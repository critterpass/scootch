import Foundation

/// Today as the widgets and the Live Activity draw it. The app writes it to the App Group as one
/// JSON string under `AppGroup.Key.surfaceSnapshot` (features/surfaces/surface-snapshot.ts); the
/// fields here mirror what the app writes, and any other field it writes is ignored. Times are
/// milliseconds since 1970.
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

    /// His lines for the surfaces, from the app's offline pack in the person's language.
    struct Lines: Codable, Equatable, Sendable {
        /// At night, in StandBy: "Go to sleep."
        var standBy: String? = nil
        /// What he says when Siri puts something on the board: "Written down."
        var writtenDown: String? = nil
    }

    /// The quiet of the night, in minutes after midnight on the phone's clock. It may run past
    /// midnight: 22:00 to 7:00 is `start` 1320, `end` 420.
    struct Night: Codable, Equatable, Sendable {
        let start: Int
        let end: Int
    }

    /// The timetable (tuition): the day's busy blocks and the next free period.
    struct Timetable: Codable, Equatable, Sendable {
        struct Block: Codable, Equatable, Sendable {
            let start: Double
            let end: Double
        }

        struct Free: Codable, Equatable, Sendable {
            let start: Double
            let end: Double
            /// The task he would put in it; nil when none fits.
            var task: String? = nil
        }

        /// The calendar's busy blocks and the free periods between them, today.
        let blocks: [Block]
        var free: [Block]? = nil
        var nextFree: Free? = nil
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

    /// The pressure on the desk's task when the app wrote this, and when it rises next.
    var pressure: Int? = nil
    var pressureAt: [Double]? = nil
    /// The fuse around Start: when it was lit and when it burns out.
    var fuseStartsAt: Double? = nil
    var fuseEndsAt: Double? = nil
    /// When the desk's task was first written down, for how long it has waited.
    var taskSince: Double? = nil
    /// The next two on the board after the desk's task, and how many more.
    var next: [String]? = nil
    var more: Int? = nil
    /// Tuition is paid: the big widgets, the timetable and StandBy open.
    var enrolled: Bool? = nil
    var night: Night? = nil
    var lines: Lines? = nil
    var timetable: Timetable? = nil

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
    /// to write the new one, nothing of yesterday's desk is shown: it is a day with nothing yet.
    /// What is not about the day (tuition, the night, his lines, the language) stays.
    func shown(at date: Date) -> SurfaceSnapshot {
        guard date >= dayEnd else { return self }
        var next = SurfaceSnapshot(
            version: version, state: .nothingYet, taskId: nil, task: nil,
            sessionStartedAt: nil, sessionEndsAt: nil, line: nil, sessionLines: [],
            language: language, dayEndsAt: .greatestFiniteMagnitude)
        next.enrolled = enrolled
        next.night = night
        next.lines = lines
        return next
    }

    var sessionEnd: Date? {
        sessionEndsAt.map { Date(timeIntervalSince1970: $0 / 1000) }
    }

    var sessionStart: Date? {
        sessionStartedAt.map { Date(timeIntervalSince1970: $0 / 1000) }
    }

    var fuseStart: Date? { fuseStartsAt.map { Date(timeIntervalSince1970: $0 / 1000) } }
    var fuseEnd: Date? { fuseEndsAt.map { Date(timeIntervalSince1970: $0 / 1000) } }

    /// The moments the pressure rises, as dates.
    var pressureRises: [Date] {
        (pressureAt ?? []).map { Date(timeIntervalSince1970: $0 / 1000) }
    }

    var isEnrolled: Bool { enrolled ?? false }

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

    /// The pressure step at `date`. A serious or crisis day, a running period and an empty desk
    /// are always 0: pressure stops for care.
    func pressure(at date: Date) -> Int {
        guard state == .taskSet else { return 0 }
        let risen = pressureRises.filter { $0 <= date }.count
        return min(5, max(0, (pressure ?? 0) + risen))
    }

    /// True while the fuse still burns at `date`.
    func fuseBurns(at date: Date) -> Bool {
        guard state == .taskSet, let end = fuseEnd else { return false }
        return date < end
    }

    /// Whole days the desk's task has waited since it was written down.
    func daysWaiting(at date: Date) -> Int {
        guard let since = taskSince else { return 0 }
        return max(0, Int((date.timeIntervalSince1970 * 1000 - since) / 86_400_000))
    }

    /// The night's quiet: 22:00 to 7:00 unless the app says otherwise.
    var quiet: Night { night ?? Night(start: 22 * 60, end: 7 * 60) }

    /// True during the night's quiet at `date`, on the phone's own clock.
    func isNight(at date: Date, calendar: Calendar = .current) -> Bool {
        let parts = calendar.dateComponents([.hour, .minute], from: date)
        let minute = (parts.hour ?? 0) * 60 + (parts.minute ?? 0)
        let night = quiet
        if night.start == night.end { return false }
        return night.start < night.end
            ? minute >= night.start && minute < night.end
            : minute >= night.start || minute < night.end
    }

    /// The next moments the night begins and ends after `date`, within a day.
    func nightTurns(after date: Date, calendar: Calendar = .current) -> [Date] {
        let day = calendar.startOfDay(for: date)
        let night = quiet
        return [night.start, night.end, night.start + 24 * 60, night.end + 24 * 60]
            .compactMap { calendar.date(byAdding: .minute, value: $0, to: day) }
            .filter { $0 > date && $0 < date.addingTimeInterval(86_400) }
    }
}
