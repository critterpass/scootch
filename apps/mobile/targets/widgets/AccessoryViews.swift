import SwiftUI
import WidgetKit

// The Lock Screen accessories. They are drawn in the system's vibrant mode, so they use no
// colour and no picture: words, and the session's ring.

/// Inline, above the clock: the one thing, or the plain label for the day.
struct InlineAccessoryView: View {
    let entry: TodayEntry

    var body: some View {
        let snapshot = entry.snapshot
        switch snapshot.state {
        case .taskSet, .inSession, .serious:
            Text("\(snapshot.text("1 thing")) · \(snapshot.task ?? "")")
        case .done:
            Text(snapshot.text("Done for today"))
        case .nothingYet, .crisis:
            Text("Scootch")
        }
    }
}

/// Circular: the session's ring with the time left, or Scootch's mark when nothing is running.
struct CircularAccessoryView: View {
    let entry: TodayEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            if entry.running, let end = entry.snapshot.sessionEnd {
                ProgressView(
                    timerInterval: min(entry.snapshot.sessionStart ?? entry.date, end)...end,
                    countsDown: true
                ) {
                    EmptyView()
                } currentValueLabel: {
                    SessionTimeLeft(end: end, from: entry.date).font(.caption2)
                }
                .progressViewStyle(.circular)
            } else {
                Image(entry.snapshot.state == .taskSet ? "GlyphPlay" : "GlyphWorld")
                    .resizable()
                    .scaledToFit()
                    .padding(13)
            }
        }
    }
}

/// Rectangular: the one thing, with the time left or Scootch's line under it.
struct RectangularAccessoryView: View {
    let entry: TodayEntry

    var body: some View {
        let content = TodayContent(entry)
        VStack(alignment: .leading, spacing: 1) {
            Text(content.title).font(.headline).lineLimit(1).widgetAccentable()
            if entry.running, let end = entry.snapshot.sessionEnd {
                SessionTimeLeft(end: end, from: entry.date).font(.subheadline)
            }
            if let line = content.line {
                Text(line).font(.caption).lineLimit(entry.running ? 1 : 2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
