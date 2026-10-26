import SwiftUI
import WidgetKit

/// Medium (tuition): the chalkboard in its wooden frame. Today's date, the desk's task
/// underlined, what comes after it, Start with its fuse, and him at the corner.
struct ChalkboardView: View {
    let entry: SurfaceEntry

    private var snapshot: SurfaceSnapshot { entry.snapshot }

    var body: some View {
        ZStack {
            if snapshot.isEnrolled {
                board
            } else {
                QuietLock(snapshot: snapshot, tint: SurfaceColor.chalk.opacity(0.8))
            }
        }
        .padding(8)
        .containerBackground(for: .widget) { SurfaceColor.wood }
    }

    private var board: some View {
        GeometryReader { proxy in
            ZStack(alignment: .topLeading) {
                ChalkboardGround(corner: 18)
                entry.mood.figure
                    .resizable()
                    .scaledToFit()
                    .frame(width: proxy.size.height * 0.95)
                    .position(x: proxy.size.width - proxy.size.height * 0.36, y: proxy.size.height * 0.78)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.date.formatted(.dateTime.weekday(.wide).day().locale(locale)))
                        .font(.system(.caption, design: .rounded).weight(.semibold))
                        .opacity(0.7)
                    Text(entry.task ?? entry.label)
                        .font(.system(.title3, design: .rounded).weight(.bold))
                        .underline(entry.task != nil, color: SurfaceColor.chalk.opacity(0.8))
                        .lineLimit(2)
                        .minimumScaleFactor(0.75)
                    if let after { Text(after).font(.system(.footnote, design: .rounded)).opacity(0.55).lineLimit(1) }
                    Spacer(minLength: 0)
                    if entry.task != nil, snapshot.state == .taskSet || snapshot.state == .serious {
                        start
                    }
                }
                .foregroundStyle(SurfaceColor.chalk)
                .frame(maxWidth: proxy.size.width * 0.68, alignment: .leading)
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
            }
        }
        .widgetURL(SurfaceLinks.destination(for: snapshot, at: entry.date))
    }

    private var locale: Locale { Locale(identifier: snapshot.language == "vi" ? "vi_VN" : "en_US") }

    /// "then: landlord · +7 more".
    private var after: String? {
        guard snapshot.state != .crisis, let first = snapshot.next?.first else { return nil }
        let more = snapshot.next.map { max(0, $0.count - 1) } ?? 0
        let rest = more + (snapshot.more ?? 0)
        let head = String(format: snapshot.text("then: %@"), first)
        return rest > 0 ? head + " · " + String(format: snapshot.text("+%d more"), rest) : head
    }

    private var start: some View {
        Button(intent: StartDeskTaskIntent()) {
            HStack(spacing: 6) {
                if snapshot.state == .taskSet {
                    FuseRing(
                        start: snapshot.fuseStart, end: snapshot.fuseEnd, now: entry.date, tint: .white
                    )
                    .frame(width: 16, height: 16)
                }
                Text(snapshot.text("Start"))
                    .font(.system(.subheadline, design: .rounded).weight(.bold))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .frame(height: 34)
            .background(Capsule().fill(SurfaceColor.start))
        }
        .buttonStyle(.plain)
    }
}

struct ChalkboardWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PhusclassChalkboard", provider: SurfaceProvider()) { entry in
            ChalkboardView(entry: entry)
        }
        .configurationDisplayName("The chalkboard")
        .description("Today's task on the chalkboard, and Start.")
        .supportedFamilies([.systemMedium])
        .contentMarginsDisabled()
    }
}
