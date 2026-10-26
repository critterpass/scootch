import SwiftUI
import WidgetKit

/// One moment for a widget to draw: the day as the app last wrote it, read at that moment.
struct SurfaceEntry: TimelineEntry {
    let date: Date
    let snapshot: SurfaceSnapshot

    var running: Bool { snapshot.isRunning(at: date) }
    var night: Bool { snapshot.isNight(at: date) }

    /// The task's words, never on a crisis day.
    var task: String? {
        snapshot.state == .crisis ? nil : snapshot.task
    }

    /// His mood at this moment: quiet company for a serious task, his pacing in a period, the
    /// pressure on a waiting desk, calm otherwise.
    var mood: PhuMood {
        switch snapshot.state {
        case .serious, .crisis: return .serious
        case .inSession: return running ? PhuMood.pacing(at: date) : .calm
        case .done: return .approve
        case .taskSet: return .pressure(snapshot.pressure(at: date))
        case .nothingYet: return .calm
        }
    }

    /// The fixed label for a day with no task to show.
    var label: String {
        switch snapshot.state {
        case .done: return snapshot.text("Done for today")
        case .crisis: return snapshot.text("Phu's Class")
        case .nothingYet, .taskSet, .inSession, .serious: return snapshot.text("Nothing on the desk")
        }
    }
}

/// Reads the shared snapshot. The app reloads the timelines whenever today changes; in between,
/// a widget changes on its own when the fuse burns out, the pressure rises, a session ends, the
/// night begins or ends, and at the end of the day.
struct SurfaceProvider: TimelineProvider {
    func placeholder(in context: Context) -> SurfaceEntry {
        SurfaceEntry(date: Date(), snapshot: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (SurfaceEntry) -> Void) {
        completion(Self.entries(from: SurfaceSnapshot.load(), now: Date())[0])
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SurfaceEntry>) -> Void) {
        completion(
            Timeline(entries: Self.entries(from: SurfaceSnapshot.load(), now: Date()), policy: .atEnd))
    }

    static func entries(from stored: SurfaceSnapshot, now: Date) -> [SurfaceEntry] {
        var moments: Set<Date> = [now]
        let today = stored.shown(at: now)
        if let end = today.sessionEnd, today.isRunning(at: now) { moments.insert(end) }
        if let fuse = today.fuseEnd, fuse > now { moments.insert(fuse) }
        for rise in today.pressureRises where rise > now { moments.insert(rise) }
        for turn in stored.nightTurns(after: now) { moments.insert(turn) }
        if let timetable = today.timetable {
            // The dial's hand and the next free period move on at every block's edge.
            let edges = (timetable.blocks + (timetable.free ?? [])).flatMap { [$0.start, $0.end] }
            for edge in edges {
                let at = Date(timeIntervalSince1970: edge / 1000)
                if at > now, at < now.addingTimeInterval(86_400) { moments.insert(at) }
            }
        }
        if stored.dayEnd > now, stored.dayEnd < Date.distantFuture { moments.insert(stored.dayEnd) }
        return moments.sorted().map { SurfaceEntry(date: $0, snapshot: stored.shown(at: $0)) }
    }
}

extension WidgetFamily {
    var isAccessory: Bool {
        self == .accessoryInline || self == .accessoryCircular || self == .accessoryRectangular
    }
}

// MARK: - Today (free): the small widget, the ring fuse and the inline line

/// Small: his figure behind the desk and the desk's task above him. At night, the quiet hours:
/// he sleeps, and the widget says until when.
struct TodaySmallView: View {
    let entry: SurfaceEntry

    @Environment(\.colorScheme) private var scheme

    var body: some View {
        if entry.night && !entry.running {
            quiet
        } else {
            desk
        }
    }

    private var ink: Color { SurfaceColor.ink(scheme) }

    private var desk: some View {
        GeometryReader { proxy in
            ZStack(alignment: .topLeading) {
                VStack(spacing: 0) {
                    Spacer(minLength: 0)
                    Rectangle().fill(SurfaceColor.deskEdge).frame(height: 6)
                    Rectangle().fill(SurfaceColor.desk).frame(height: proxy.size.height * 0.2)
                }
                entry.mood.figure
                    .resizable()
                    .scaledToFit()
                    .frame(width: proxy.size.width * 0.78)
                    .position(x: proxy.size.width / 2, y: proxy.size.height * 0.78)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 1) {
                    if let caption {
                        Text(caption)
                            .font(.system(size: 11, weight: .heavy))
                            .tracking(0.6)
                            .foregroundStyle(SurfaceColor.pen)
                    }
                    Text(entry.task ?? entry.label)
                        .font(.system(.subheadline, design: .rounded).weight(.bold))
                        .foregroundStyle(ink)
                        .lineLimit(2)
                        .minimumScaleFactor(0.8)
                        .frame(maxWidth: proxy.size.width * 0.72, alignment: .leading)
                }
                .padding(14)
            }
        }
    }

    /// "9 DAYS" while it waits; the time left while it runs.
    private var caption: String? {
        if entry.running, let end = entry.snapshot.sessionEnd {
            let minutes = max(1, Int(ceil(end.timeIntervalSince(entry.date) / 60)))
            return String(format: entry.snapshot.text("%d MIN LEFT"), minutes)
        }
        guard entry.snapshot.state == .taskSet else { return nil }
        let days = entry.snapshot.daysWaiting(at: entry.date)
        guard days >= 1 else { return nil }
        return String(format: entry.snapshot.text(days == 1 ? "%d DAY" : "%d DAYS"), days)
    }

    private var quiet: some View {
        GeometryReader { proxy in
            ZStack(alignment: .topLeading) {
                PhuMood.sleep.figure
                    .resizable()
                    .scaledToFit()
                    .frame(width: proxy.size.width * 0.7)
                    .position(x: proxy.size.width / 2, y: proxy.size.height * 0.92)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 1) {
                    Text(entry.snapshot.text("Quiet hours"))
                        .font(.system(.headline, design: .rounded).weight(.bold))
                    Text(
                        String(
                            format: entry.snapshot.text("Quiet until %@"),
                            quietEnd.formatted(date: .omitted, time: .shortened)))
                        .font(.caption)
                        .opacity(0.7)
                }
                .foregroundStyle(SurfaceColor.quietInk)
                .padding(14)
            }
        }
    }

    private var quietEnd: Date {
        let calendar = Calendar.current
        let end = entry.snapshot.quiet.end
        let day = calendar.startOfDay(for: entry.date)
        let today = calendar.date(byAdding: .minute, value: end, to: day) ?? entry.date
        return today > entry.date ? today : today.addingTimeInterval(86_400)
    }
}

/// The ring fuse around his face, for the Lock Screen. While a period runs, the ring is its time.
struct TodayCircularView: View {
    let entry: SurfaceEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            ring.padding(2).widgetAccentable()
            PhuFace(mood: entry.mood, side: 38, ground: false)
                .padding(7)
        }
    }

    @ViewBuilder private var ring: some View {
        if entry.running, let start = entry.snapshot.sessionStart, let end = entry.snapshot.sessionEnd {
            SessionRing(start: start, end: end, tint: .white)
        } else {
            FuseRing(
                start: entry.snapshot.fuseStart, end: entry.snapshot.fuseEnd, now: entry.date,
                tint: .white)
        }
    }
}

struct TodayWidgetView: View {
    let entry: SurfaceEntry

    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        content
            .widgetURL(SurfaceLinks.destination(for: entry.snapshot, at: entry.date))
            .containerBackground(for: .widget) {
                if family.isAccessory {
                    Color.clear
                } else if entry.night && !entry.running {
                    SurfaceColor.quiet
                } else {
                    scheme == .dark ? SurfaceColor.creamDark : SurfaceColor.cream
                }
            }
    }

    @ViewBuilder private var content: some View {
        switch family {
        case .accessoryInline: Text(entry.task ?? entry.label)
        case .accessoryCircular: TodayCircularView(entry: entry)
        default: TodaySmallView(entry: entry)
        }
    }
}

/// Free: the desk's task and his face, on the Home Screen and the Lock Screen.
struct TodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PhusclassToday", provider: SurfaceProvider()) { entry in
            TodayWidgetView(entry: entry)
        }
        .configurationDisplayName("The desk")
        .description("The task on your desk, and his face as it waits.")
        .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryInline])
    }
}
