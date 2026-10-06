import SwiftUI
import WidgetKit

/// One moment of today for a widget to draw.
struct TodayEntry: TimelineEntry {
    let date: Date
    let snapshot: SurfaceSnapshot

    var running: Bool { snapshot.isRunning(at: date) }
}

/// Reads the shared snapshot. The app reloads the timelines whenever today changes; in between,
/// the only moments a widget changes on its own are the end of a session and the end of the day.
struct TodayProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayEntry {
        TodayEntry(date: Date(), snapshot: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        completion(Self.entries(from: SurfaceSnapshot.load(), now: Date())[0])
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        completion(Timeline(entries: Self.entries(from: SurfaceSnapshot.load(), now: Date()), policy: .never))
    }

    static func entries(from stored: SurfaceSnapshot, now: Date) -> [TodayEntry] {
        var moments = [now]
        let today = stored.shown(at: now)
        if let end = today.sessionEnd, today.isRunning(at: now) { moments.append(end) }
        if stored.dayEnd > now, stored.dayEnd < Date.distantFuture { moments.append(stored.dayEnd) }
        return moments.sorted().map { TodayEntry(date: $0, snapshot: stored.shown(at: $0)) }
    }
}

/// Picks the layout for the family. Every family is one tap target.
struct TodayWidgetView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var scheme
    let entry: TodayEntry

    var body: some View {
        content
            .widgetURL(SurfaceLinks.destination(for: entry.snapshot, at: entry.date))
    }

    @ViewBuilder private var content: some View {
        switch family {
        case .accessoryInline: InlineAccessoryView(entry: entry)
        case .accessoryCircular: CircularAccessoryView(entry: entry)
        case .accessoryRectangular: RectangularAccessoryView(entry: entry)
        case .systemMedium:
            MediumTodayView(entry: entry).surfaceBackground(SurfaceColor.page(scheme))
        case .systemLarge:
            LargeTodayView(entry: entry).surfaceBackground(SurfaceColor.page(scheme))
        default:
            SmallOrStandByView(entry: entry).surfaceBackground(SurfaceColor.page(scheme))
        }
    }
}

/// Today's one thing: Home Screen small, medium and large, and the Lock Screen accessories.
struct TodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ScootchToday", provider: TodayProvider()) { entry in
            TodayWidgetView(entry: entry)
        }
        .configurationDisplayName("Today")
        .description("Today's one thing.")
        .supportedFamilies([
            .systemSmall, .systemMedium, .systemLarge,
            .accessoryInline, .accessoryCircular, .accessoryRectangular,
        ])
    }
}

/// The world, the week and today in one place. A Plus surface: without Plus it is a locked preview.
struct WorldWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ScootchWorld", provider: TodayProvider()) { entry in
            WorldWidgetView(entry: entry)
        }
        .configurationDisplayName("Your world")
        .description("Your world, your week and today's one thing.")
        .supportedFamilies([.systemExtraLarge])
    }
}
