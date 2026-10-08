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

    /// A task's words for each state of its hunt, so a session begun with the app closed has
    /// them. A serious task's are its plain words; nil means nothing is said in that state.
    struct HuntLines: Codable, Equatable, Sendable {
        let start: String?
        /// Turned through while the clock runs.
        let working: [String]
        /// The one concrete nudge shown while stuck, and the smaller one "Give me a first line" shows.
        let stuck: String?
        let firstLine: String?
        let lastMinutes: String?
        let overtime: String?
        let caught: String?
        let stoppedEarly: String?
    }

    /// A hatched thing that is waiting. Never a serious task, and none on a crisis day: the app
    /// decides that before it writes.
    struct Lurker: Codable, Equatable, Sendable, Identifiable {
        let taskId: String
        let name: String
        let task: String
        /// Which day of waiting the thing is on, from 1.
        let day: Int
        /// How big it is drawn for that day, up to 1 when it is pressed against the glass.
        let size: Double
        let image: String?
        let lines: HuntLines

        var id: String { taskId }
    }

    /// One of a monster's three bites.
    struct Bite: Codable, Equatable, Sendable, Identifiable {
        let id: String
        let taskId: String
        let text: String
        let minutes: Int
        let caught: Bool
    }

    struct Catch: Codable, Equatable, Sendable {
        let name: String
        let caughtAt: Double
    }

    /// The thing carried on to tomorrow, as the nightstand shows it. A serious task has no
    /// monster's name and no line: its plain words alone.
    struct Tomorrow: Codable, Equatable, Sendable {
        let taskId: String
        let task: String
        let monsterName: String?
        let line: String?
        /// What the notification says at nine, when "Hunt at 9:00" was pressed.
        let morning: String
    }

    let version: Int
    let state: DayState
    /// The one thing's id and its words for a hunt. Both nil whenever `task` is.
    let taskId: String?
    let taskLines: HuntLines?
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
    /// The waiting monsters, the one that has waited longest first, four at most.
    let lurkers: [Lurker]
    /// The bites of the lurkers' monsters.
    let bites: [Bite]
    /// The finish the person wears, which the shelf and the caught card are made of.
    let finish: String
    /// How many monsters have been caught, and the last of them.
    let shelf: Int
    let latestCatch: Catch?
    /// How many of them were caught in this week. Nil in a snapshot written before it was counted.
    let caughtThisWeek: Int?
    /// The world as two pictures in the App Group container, by day and asleep.
    let worldImage: String?
    let worldNightImage: String?
    /// Scootch alone, and which wallpaper the Shortcuts action draws: world, perched or night.
    let scootchImage: String?
    let wallpaper: String?
    /// The thing carried on to tomorrow. Nil when none is, and on a crisis day.
    let tomorrow: Tomorrow?
    /// When the day this snapshot describes rolls over into the next one.
    let dayEndsAt: Double
    /// The ink the person wears, as a six-digit hex colour. Nil is tomato, and so is a snapshot
    /// written before there were inks.
    let accent: String?

    /// What every surface shows before the app has written anything, or after a version it
    /// cannot read: nothing yet, in plain words.
    static let empty = SurfaceSnapshot(
        version: currentVersion, state: .nothingYet, taskId: nil, taskLines: nil, task: nil,
        sessionStartedAt: nil, sessionEndsAt: nil, monsterName: nil, monsterImage: nil, line: nil,
        sessionLines: [], attitude: .cheeky,
        language: Locale.preferredLanguages.first?.hasPrefix("vi") == true ? "vi" : "en",
        weekBars: 0, worldThings: 0, plus: false, lurkers: [], bites: [], finish: "paper",
        shelf: 0, latestCatch: nil, caughtThisWeek: nil, worldImage: nil, worldNightImage: nil,
        scootchImage: nil, wallpaper: nil, tomorrow: nil, dayEndsAt: .greatestFiniteMagnitude, accent: nil)

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
    /// to write the new one, nothing of yesterday is shown: it is a day with nothing yet. The
    /// lurkers go too, because whether each may still be shown is the app's to decide for the
    /// new day, and what waited for tomorrow is no longer tomorrow's; what was caught stays caught.
    func shown(at date: Date) -> SurfaceSnapshot {
        guard date >= dayEnd else { return self }
        return SurfaceSnapshot(
            version: version, state: .nothingYet, taskId: nil, taskLines: nil, task: nil,
            sessionStartedAt: nil, sessionEndsAt: nil, monsterName: nil, monsterImage: nil,
            line: nil, sessionLines: [], attitude: attitude, language: language,
            weekBars: weekBars, worldThings: worldThings, plus: plus, lurkers: [], bites: [],
            finish: finish, shelf: shelf, latestCatch: latestCatch,
            caughtThisWeek: caughtThisWeek, worldImage: worldImage,
            worldNightImage: worldNightImage, scootchImage: scootchImage, wallpaper: wallpaper,
            tomorrow: nil,
            dayEndsAt: .greatestFiniteMagnitude, accent: accent)
    }

    /// The lurker that has waited longest, which a control or the Action button hunts.
    var oldestLurker: Lurker? { lurkers.first }

    func lurker(for taskId: String) -> Lurker? {
        lurkers.first { $0.taskId == taskId }
    }

    /// The words for a hunt on this task: the lurker's, or today's one thing's.
    func huntLines(for taskId: String) -> HuntLines? {
        lurker(for: taskId)?.lines ?? (self.taskId == taskId ? taskLines : nil)
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
