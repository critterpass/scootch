import SwiftUI
import WidgetKit

struct PlaceholderEntry: TimelineEntry {
    let date: Date
}

struct PlaceholderProvider: TimelineProvider {
    func placeholder(in context: Context) -> PlaceholderEntry {
        PlaceholderEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (PlaceholderEntry) -> Void) {
        completion(PlaceholderEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PlaceholderEntry>) -> Void) {
        completion(Timeline(entries: [PlaceholderEntry(date: Date())], policy: .never))
    }
}

struct PlaceholderWidgetView: View {
    @Environment(\.widgetFamily) private var family

    var body: some View {
        content.placeholderWidgetBackground()
    }

    @ViewBuilder private var content: some View {
        switch family {
        case .accessoryInline:
            Text("Scootch placeholder")
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "pawprint")
            }
        case .accessoryRectangular:
            VStack(alignment: .leading) {
                Text("Scootch").font(.headline)
                Text("Placeholder widget")
            }
        case .systemMedium:
            HStack(spacing: 12) {
                Image(systemName: "pawprint").font(.largeTitle)
                VStack(alignment: .leading) {
                    Text("Scootch").font(.headline)
                    Text("Placeholder medium widget").font(.caption)
                }
            }
        default:
            VStack(spacing: 6) {
                Image(systemName: "pawprint").font(.title)
                Text("Scootch").font(.headline)
                Text("Placeholder small widget")
                    .font(.caption2)
                    .multilineTextAlignment(.center)
            }
        }
    }
}

private extension View {
    /// From iOS 17 a widget must declare its container background; earlier systems draw their own.
    @ViewBuilder func placeholderWidgetBackground() -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(.fill.tertiary, for: .widget)
        } else {
            padding()
        }
    }
}

/// Home Screen small, plus the Lock Screen accessory families.
struct PlaceholderSmallWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ScootchPlaceholderSmall", provider: PlaceholderProvider()) { _ in
            PlaceholderWidgetView()
        }
        .configurationDisplayName("Scootch placeholder")
        .description("Placeholder small and Lock Screen widget.")
        .supportedFamilies([
            .systemSmall, .accessoryCircular, .accessoryRectangular, .accessoryInline,
        ])
    }
}

struct PlaceholderMediumWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ScootchPlaceholderMedium", provider: PlaceholderProvider()) { _ in
            PlaceholderWidgetView()
        }
        .configurationDisplayName("Scootch placeholder, medium")
        .description("Placeholder medium widget.")
        .supportedFamilies([.systemMedium])
    }
}
