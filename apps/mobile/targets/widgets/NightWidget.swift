import SwiftUI
import WidgetKit

/// The nightstand's timeline: the day's moments, and a drawing every minute for the next hour
/// and a half so the chalk clock keeps the time in StandBy.
struct NightProvider: TimelineProvider {
    func placeholder(in context: Context) -> SurfaceEntry {
        SurfaceEntry(date: Date(), snapshot: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (SurfaceEntry) -> Void) {
        completion(SurfaceEntry(date: Date(), snapshot: SurfaceSnapshot.load().shown(at: Date())))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SurfaceEntry>) -> Void) {
        completion(Timeline(entries: Self.entries(from: SurfaceSnapshot.load(), now: Date()), policy: .atEnd))
    }

    static func entries(from stored: SurfaceSnapshot, now: Date) -> [SurfaceEntry] {
        var moments = Set(SurfaceProvider.entries(from: stored, now: now).map(\.date))
        let calendar = Calendar.current
        let minute = calendar.dateInterval(of: .minute, for: now)?.start ?? now
        for step in 1...90 {
            if let at = calendar.date(byAdding: .minute, value: step, to: minute) { moments.insert(at) }
        }
        return moments.sorted().map { SurfaceEntry(date: $0, snapshot: stored.shown(at: $0)) }
    }
}

/// At night he has gone home. His glasses and his thermos stay on the desk under the lamp, and
/// the chalkboard has the time and his only line: "Go to sleep."
struct NightDeskView: View {
    let entry: SurfaceEntry

    var body: some View {
        GeometryReader { proxy in
            let w = proxy.size.width
            let h = proxy.size.height
            ZStack(alignment: .topLeading) {
                SurfaceColor.night
                RadialGradient(
                    colors: [SurfaceColor.lamp.opacity(0.3), SurfaceColor.lamp.opacity(0)],
                    center: .center, startRadius: 0, endRadius: w * 0.5
                )
                .frame(width: w, height: w)
                .position(x: w * 0.78, y: h * 0.25)
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.date.formatted(date: .omitted, time: .shortened))
                        .font(.system(size: w * 0.2, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(SurfaceColor.chalk.opacity(0.92))
                        .minimumScaleFactor(0.5)
                        .lineLimit(1)
                    if let line = entry.snapshot.lines?.standBy {
                        Text(line)
                            .font(.system(.subheadline, design: .rounded).weight(.bold))
                            .foregroundStyle(SurfaceColor.chalkYellow)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .frame(width: w * 0.86, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(SurfaceColor.nightBoard)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(SurfaceColor.nightFrame, lineWidth: 5)))
                .padding(.leading, w * 0.07)
                .padding(.top, h * 0.09)
                VStack(spacing: 0) {
                    Spacer(minLength: 0)
                    Rectangle().fill(SurfaceColor.nightDeskTop).frame(height: 6)
                    Rectangle().fill(SurfaceColor.nightDesk).frame(height: h * 0.2)
                }
                Image("PropThermos")
                    .resizable()
                    .scaledToFit()
                    .frame(height: h * 0.3)
                    .position(x: w * 0.58, y: h * 0.8 - h * 0.15 + 3)
                Glasses()
                    .stroke(Color(red: 0.604, green: 0.573, blue: 0.545), lineWidth: 2.5)
                    .frame(width: w * 0.24, height: w * 0.1)
                    .position(x: w * 0.8, y: h * 0.8 - w * 0.05)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

/// His round glasses, folded on the desk.
struct Glasses: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let r = rect.height / 2
        path.addEllipse(in: CGRect(x: rect.minX, y: rect.minY, width: r * 2, height: r * 2))
        path.addEllipse(in: CGRect(x: rect.maxX - r * 2, y: rect.minY, width: r * 2, height: r * 2))
        path.move(to: CGPoint(x: rect.minX + r * 2, y: rect.midY - r * 0.1))
        path.addQuadCurve(
            to: CGPoint(x: rect.maxX - r * 2, y: rect.midY - r * 0.1),
            control: CGPoint(x: rect.midX, y: rect.midY - r * 0.6))
        return path
    }
}

struct NightWidgetView: View {
    let entry: SurfaceEntry

    @Environment(\.colorScheme) private var scheme

    var body: some View {
        Group {
            if !entry.snapshot.isEnrolled {
                QuietLock(snapshot: entry.snapshot, tint: SurfaceColor.chalk.opacity(0.7))
            } else if entry.night && !entry.running {
                NightDeskView(entry: entry)
            } else {
                TodaySmallView(entry: entry)
            }
        }
        .widgetURL(SurfaceLinks.destination(for: entry.snapshot, at: entry.date))
        .containerBackground(for: .widget) {
            if !entry.snapshot.isEnrolled || (entry.night && !entry.running) {
                SurfaceColor.night
            } else {
                scheme == .dark ? SurfaceColor.creamDark : SurfaceColor.cream
            }
        }
    }
}

/// StandBy (tuition): the desk by day, and at night his lamp and "Go to sleep."
struct NightWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PhusclassNight", provider: NightProvider()) { entry in
            NightWidgetView(entry: entry)
        }
        .configurationDisplayName("The desk at night")
        .description("For StandBy: the desk by day, his lamp at night.")
        .supportedFamilies([.systemSmall])
        .contentMarginsDisabled()
    }
}
