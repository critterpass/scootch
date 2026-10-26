import SwiftUI
import WidgetKit

/// One moment for a widget to draw: the day as the app last wrote it, read at that moment.
struct SurfaceEntry: TimelineEntry {
    let date: Date
    let snapshot: SurfaceSnapshot

    var running: Bool { snapshot.isRunning(at: date) }

    /// The task's words, never on a crisis day.
    var task: String? {
        snapshot.state == .crisis ? nil : snapshot.task
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
/// a widget changes on its own when a session ends and at the end of the day.
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
        if stored.dayEnd > now, stored.dayEnd < Date.distantFuture { moments.insert(stored.dayEnd) }
        return moments.sorted().map { SurfaceEntry(date: $0, snapshot: stored.shown(at: $0)) }
    }
}

/// The task on the desk and, while a session runs, the time left on it.
struct TodayWidgetView: View {
    let entry: SurfaceEntry

    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        content
            .widgetURL(SurfaceLinks.destination(for: entry.snapshot, at: entry.date))
            .containerBackground(for: .widget) {
                if family.isAccessory { Color.clear } else { SurfaceColor.paper(scheme) }
            }
    }

    @ViewBuilder private var content: some View {
        switch family {
        case .accessoryInline: inline
        case .accessoryCircular: circular
        case .accessoryRectangular: rectangular
        default: home
        }
    }

    private var inline: some View {
        Text(entry.task ?? entry.label)
    }

    private var circular: some View {
        ZStack {
            AccessoryWidgetBackground()
            if entry.running, let start = entry.snapshot.sessionStart,
                let end = entry.snapshot.sessionEnd
            {
                SessionRing(start: start, end: end, tint: .white).padding(4).widgetAccentable()
            }
            SurfaceMark().padding(14)
        }
    }

    private var rectangular: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(entry.task ?? entry.label).font(.headline).lineLimit(2)
            if entry.running, let end = entry.snapshot.sessionEnd {
                SessionTimeLeft(end: end, from: entry.date).font(.caption).widgetAccentable()
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var home: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                SurfaceMark().frame(width: 22, height: 22).foregroundStyle(SurfaceColor.pen)
                Spacer(minLength: 0)
                if entry.running, let end = entry.snapshot.sessionEnd {
                    SessionTimeLeft(end: end, from: entry.date)
                        .font(.headline)
                        .multilineTextAlignment(.trailing)
                        .foregroundStyle(SurfaceColor.pen)
                        .frame(maxWidth: 72, alignment: .trailing)
                }
            }
            Spacer(minLength: 0)
            Text(entry.task ?? entry.label)
                .font(.system(.headline, design: .rounded).weight(.heavy))
                .foregroundStyle(SurfaceColor.ink(scheme))
                .lineLimit(family == .systemSmall ? 3 : 2)
            if family != .systemSmall, entry.snapshot.state != .crisis,
                let line = entry.snapshot.line
            {
                Text(line)
                    .font(.subheadline)
                    .foregroundStyle(SurfaceColor.muted(scheme))
                    .lineLimit(2)
            }
            if entry.running, let start = entry.snapshot.sessionStart,
                let end = entry.snapshot.sessionEnd
            {
                SessionBar(start: start, end: end)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

extension WidgetFamily {
    var isAccessory: Bool {
        self == .accessoryInline || self == .accessoryCircular || self == .accessoryRectangular
    }
}

/// Today's task on the Home Screen and the Lock Screen.
struct TodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PhusclassToday", provider: SurfaceProvider()) { entry in
            TodayWidgetView(entry: entry)
        }
        .configurationDisplayName("Today")
        .description("The task on your desk, and the time left on it.")
        .supportedFamilies([
            .systemSmall, .systemMedium, .accessoryInline, .accessoryCircular,
            .accessoryRectangular,
        ])
    }
}
