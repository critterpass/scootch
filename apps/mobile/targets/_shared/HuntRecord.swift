import Foundation

/// A session as the Lock Screen and the Island follow it. It lives in the App Group, where an
/// intent can move it with the app closed and the app adopts it when it next opens. The fields
/// and every rule here are the same as packages/domain/src/hunt/hunt-record.ts; change both
/// together. Times are milliseconds since 1970.
struct HuntRecord: Codable, Equatable, Sendable {
    enum Phase: String, Sendable {
        case starting, running, parked, stuck
        case lastMinutes = "last_minutes"
        case overtime, caught
        case caughtCollapsed = "caught_collapsed"
        case stoppedEarly = "stopped_early"
    }

    /// What the Live Activity shows for a record at one moment.
    struct View: Equatable, Sendable {
        let phase: Phase
        /// Whole seconds still to count in; 0 once the clock runs.
        let countIn: Int
        /// Time left on the clock, frozen while stuck; 0 in overtime.
        let remainingMs: Double
        /// Time past the end; 0 until then.
        let overMs: Double
        /// How far Scootch has run toward the monster, 0 to 1.
        let progress: Double
        /// The monster's size, 1 down to `smallestMonster`.
        let monsterScale: Double
    }

    static let minuteMs: Double = 60_000
    static let hourMs: Double = 60 * minuteMs
    /// The count-in before a session begun outside the app, which "Not yet" cancels.
    static let countInMs: Double = 3_000
    /// How long the parked receipt shows. The clock never stops for it.
    static let parkedReceiptMs: Double = 4_000
    static let lastMinutesMs: Double = 2 * minuteMs
    /// How long the caught card stays whole before it folds to one line.
    static let caughtCardMs: Double = 8 * minuteMs
    /// What "5 more" adds, counted from the moment it is asked for.
    static let moreMs: Double = 5 * minuteMs
    /// The monster at the end of the race is a crumb, not nothing.
    static let smallestMonster: Double = 0.25

    let taskId: String
    /// When the count-in began.
    let startedAt: Double
    /// When the clock starts.
    let beginsAt: Double
    /// When the time is up. A pause moves it on by the length of the pause when the clock resumes.
    var endsAt: Double
    /// Set while "I'm stuck" holds the clock.
    var pausedAt: Double?
    /// The last thought parked, and its words for the receipt.
    var parkedAt: Double?
    var parkedText: String?
    /// Set by the real catch, never by the clock.
    var caughtAt: Double?
    /// Set when the session was ended before its time.
    var stoppedAt: Double?

    private var isOver: Bool { caughtAt != nil || stoppedAt != nil }

    private func phase(at now: Double) -> Phase? {
        if let caughtAt {
            if now < caughtAt + Self.caughtCardMs { return .caught }
            // It leaves at the top of the hour after the card folds.
            let leaves = (((caughtAt + Self.caughtCardMs) / Self.hourMs).rounded(.down) + 1) * Self.hourMs
            return now < leaves ? .caughtCollapsed : nil
        }
        if stoppedAt != nil { return .stoppedEarly }
        if now < beginsAt { return .starting }
        if pausedAt != nil { return .stuck }
        if now >= endsAt { return .overtime }
        if let parkedAt, now - parkedAt < Self.parkedReceiptMs { return .parked }
        return endsAt - now <= Self.lastMinutesMs ? .lastMinutes : .running
    }

    /// What to show at `now`, or nil once there is nothing left to show. Time running out is
    /// overtime: only the catch itself makes a hunt caught.
    func view(at now: Double) -> View? {
        guard let phase = phase(at: now) else { return nil }
        let clock = max(beginsAt, stoppedAt ?? caughtAt ?? pausedAt ?? now)
        let total = max(1, endsAt - beginsAt)
        let done = phase == .caught || phase == .caughtCollapsed
        let progress = done ? 1 : min(1, max(0, (clock - beginsAt) / total))
        return View(
            phase: phase,
            countIn: phase == .starting ? Int(((beginsAt - now) / 1000).rounded(.up)) : 0,
            remainingMs: max(0, endsAt - clock),
            overMs: phase == .overtime ? now - endsAt : 0,
            progress: progress,
            monsterScale: 1 - (1 - Self.smallestMonster) * progress)
    }

    func view(at date: Date) -> View? {
        view(at: date.timeIntervalSince1970 * 1000)
    }

    /// A hunt begun outside the app: three seconds to change your mind, then the clock.
    static func begin(taskId: String, minutes: Double, at now: Double) -> HuntRecord {
        let beginsAt = now + countInMs
        return HuntRecord(
            taskId: taskId, startedAt: now, beginsAt: beginsAt, endsAt: beginsAt + minutes * minuteMs,
            pausedAt: nil, parkedAt: nil, parkedText: nil, caughtAt: nil, stoppedAt: nil)
    }

    /// "I'm stuck": the clock holds. Nothing to hold before it runs, after it is up or once it is over.
    func paused(at now: Double) -> HuntRecord {
        guard !isOver, pausedAt == nil, now >= beginsAt, now < endsAt else { return self }
        var next = self
        next.pausedAt = now
        return next
    }

    /// The clock runs again, with every minute it had when it was held.
    func resumed(at now: Double) -> HuntRecord {
        guard !isOver, let pausedAt else { return self }
        var next = self
        next.pausedAt = nil
        next.endsAt = endsAt + max(0, now - pausedAt)
        return next
    }

    /// A thought was parked: the receipt shows and the clock is untouched.
    func parked(_ text: String?, at now: Double) -> HuntRecord {
        guard !isOver else { return self }
        var next = self
        next.parkedAt = now
        next.parkedText = text
        return next
    }

    /// "5 more", asked for in overtime: five minutes from now.
    func more(at now: Double) -> HuntRecord {
        guard !isOver, now >= endsAt else { return self }
        var next = self
        next.endsAt = now + Self.moreMs
        return next
    }

    /// Ended before its time. During the count-in this is "Not yet" and leaves nothing to show.
    func stopped(at now: Double) -> HuntRecord? {
        guard !isOver else { return self }
        guard now >= beginsAt else { return nil }
        var next = self
        next.stoppedAt = pausedAt ?? now
        next.pausedAt = nil
        return next
    }

    /// The real catch happened.
    func caught(at now: Double) -> HuntRecord {
        guard !isOver else { return self }
        var next = self
        next.pausedAt = nil
        next.caughtAt = now
        return next
    }

    // MARK: - In the App Group

    static func load(from defaults: UserDefaults? = AppGroup.defaults) -> HuntRecord? {
        guard let json = defaults?.string(forKey: AppGroup.Key.huntRecord),
            let data = json.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(HuntRecord.self, from: data)
    }

    /// Stored as text, which is what the app's bridge reads back. Nil removes it.
    static func store(_ record: HuntRecord?, in defaults: UserDefaults? = AppGroup.defaults) {
        guard let defaults else { return }
        guard let record, let data = try? JSONEncoder().encode(record),
            let json = String(data: data, encoding: .utf8)
        else {
            defaults.removeObject(forKey: AppGroup.Key.huntRecord)
            return
        }
        defaults.set(json, forKey: AppGroup.Key.huntRecord)
    }
}
