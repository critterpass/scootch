import SwiftUI
import WidgetKit

/// One moment for a widget to draw: the day as the app last wrote it, and what has moved since
/// with the app closed.
struct SurfaceEntry: TimelineEntry {
    let date: Date
    let snapshot: SurfaceSnapshot
    /// The thing a hunt is on, whether it was begun in the app or from a surface.
    let hunted: String?
    /// True once "Hunt at 9:00" was pressed for tomorrow's one thing.
    let setForNine: Bool

    var running: Bool { snapshot.isRunning(at: date) }

    /// The nightstand's hours: from ten in the evening until the day rolls over.
    var night: Bool { Self.isNight(date) }

    static let nightHour = 22
    /// The hour the app's day rolls over (DAY_ROLLOVER_HOUR in packages/domain).
    static let rolloverHour = 3

    static func isNight(_ date: Date, calendar: Calendar = .current) -> Bool {
        let hour = calendar.component(.hour, from: date)
        return hour >= nightHour || hour < rolloverHour
    }

    /// The lurker the small surfaces are about: the one that has waited longest.
    var lurker: SurfaceSnapshot.Lurker? { snapshot.oldestLurker }

    /// What the plain layouts show when there is no monster to draw.
    var showsLurker: Bool {
        snapshot.state != .crisis && snapshot.state != .serious && lurker != nil
    }
}

/// Reads the shared snapshot. The app reloads the timelines whenever today changes; in between,
/// a widget changes on its own when a session or a hunt ends, at ten in the evening, on the hour
/// (for "2h ago") and at the end of the day.
struct SurfaceProvider: TimelineProvider {
    func placeholder(in context: Context) -> SurfaceEntry {
        SurfaceEntry(date: Date(), snapshot: .empty, hunted: nil, setForNine: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (SurfaceEntry) -> Void) {
        completion(Self.entries(from: SurfaceSnapshot.load(), now: Date())[0])
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SurfaceEntry>) -> Void) {
        completion(
            Timeline(entries: Self.entries(from: SurfaceSnapshot.load(), now: Date()), policy: .atEnd))
    }

    /// How many hours ahead are drawn, so the words about the latest catch stay true.
    static let hoursAhead = 12

    static func entries(
        from stored: SurfaceSnapshot, now: Date, hunt: HuntRecord? = HuntStore.load(),
        calendar: Calendar = .current
    ) -> [SurfaceEntry] {
        var moments: Set<Date> = [now]
        let today = stored.shown(at: now)
        if let end = today.sessionEnd, today.isRunning(at: now) { moments.insert(end) }
        if let hunt, isOn(hunt, at: now) {
            moments.insert(Date(timeIntervalSince1970: hunt.endsAt / 1000))
        }
        if stored.dayEnd > now, stored.dayEnd < Date.distantFuture { moments.insert(stored.dayEnd) }
        if let ten = calendar.nextDate(
            after: now, matching: DateComponents(hour: SurfaceEntry.nightHour, minute: 0),
            matchingPolicy: .nextTime)
        {
            moments.insert(ten)
        }
        // What is known of friends' tables stops being shown once it is no longer recent.
        if let friends = stored.friendsTables, friends.isFresh(at: now) {
            moments.insert(
                Date(timeIntervalSince1970: (friends.asOf + SurfaceSnapshot.FriendsTables.freshMs) / 1000))
        }
        var hour = now
        for _ in 0..<hoursAhead {
            guard let next = calendar.nextDate(
                after: hour, matching: DateComponents(minute: 0), matchingPolicy: .nextTime)
            else { break }
            moments.insert(next)
            hour = next
        }
        return moments.filter { $0 >= now }.sorted().map { moment in
            let shown = stored.shown(at: moment)
            return SurfaceEntry(
                date: moment, snapshot: shown, hunted: hunted(shown, hunt: hunt, at: moment),
                setForNine: shown.tomorrow.map {
                    MorningHunt.pending(for: $0.taskId, at: moment) != nil
                } ?? false)
        }
    }

    /// A hunt record that still stands for a hunt at `date`: not caught, not stopped, and either
    /// held by "I'm stuck" or with time left.
    static func isOn(_ hunt: HuntRecord, at date: Date) -> Bool {
        guard hunt.caughtAt == nil, hunt.stoppedAt == nil else { return false }
        return hunt.pausedAt != nil || date.timeIntervalSince1970 * 1000 < hunt.endsAt
    }

    static func hunted(_ snapshot: SurfaceSnapshot, hunt: HuntRecord?, at date: Date) -> String? {
        if let hunt, isOn(hunt, at: date) { return hunt.taskId }
        return snapshot.isRunning(at: date) ? snapshot.taskId : nil
    }
}

/// The oldest lurker, pressed against the glass by its day: the small Home Screen widget, its
/// StandBy nightlight, and the three Lock Screen accessories.
struct LurkerWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ScootchLurker", provider: SurfaceProvider()) { entry in
            LurkerWidgetView(entry: entry)
        }
        .configurationDisplayName("Lurker")
        .description("The thing that has waited longest. Tap it to hunt it for ten minutes.")
        .supportedFamilies([
            .systemSmall, .accessoryInline, .accessoryCircular, .accessoryRectangular,
        ])
        .contentMarginsDisabled()
    }
}

/// Up to four lurkers in a line, each one a button; on the Lock Screen, one round button that
/// hunts the oldest.
struct LurkersWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ScootchLurkers", provider: SurfaceProvider()) { entry in
            LurkersWidgetView(entry: entry)
        }
        .configurationDisplayName("Lurkers")
        .description("Everything that is waiting. Tap one to hunt it for ten minutes.")
        .supportedFamilies([.systemMedium, .accessoryCircular])
        .contentMarginsDisabled()
    }
}

/// How many have been caught, printed on the finish the person wears.
struct ShelfWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ScootchShelf", provider: SurfaceProvider()) { entry in
            ShelfWidgetView(entry: entry)
        }
        .configurationDisplayName("Shelf")
        .description("Everything you have caught, in the finish you wear.")
        .supportedFamilies([.systemSmall])
        .contentMarginsDisabled()
    }
}

/// The world under glass, with the latest catch. It never counts down.
struct TerrariumWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ScootchTerrarium", provider: SurfaceProvider()) { entry in
            TerrariumWidgetView(entry: entry)
        }
        .configurationDisplayName("Terrarium")
        .description("Your world, living under glass.")
        .supportedFamilies([.systemLarge, .systemExtraLarge])
        .contentMarginsDisabled()
    }
}

/// A friend's open table, with its open seat as a button. Friends only: nobody else is shown.
struct FriendsTablesWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ScootchFriendsTables", provider: SurfaceProvider()) { entry in
            FriendsTablesWidgetView(entry: entry)
        }
        .configurationDisplayName("Friends at tables")
        .description("A friend who is at a table, and the open seat beside them.")
        .supportedFamilies([.systemSmall])
        .contentMarginsDisabled()
    }
}
