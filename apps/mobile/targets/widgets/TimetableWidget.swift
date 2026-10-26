import SwiftUI
import WidgetKit

/// Today's timetable as the Dial board draws it: seven in the morning to five in the evening
/// around the dial, busy blocks grey, free periods red, the hand at now and him in the middle.
struct DayDial: View {
    let timetable: SurfaceSnapshot.Timetable
    let now: Date
    let mood: PhuMood

    private static let firstHour = 7.0
    private static let lastHour = 17.0

    var body: some View {
        GeometryReader { proxy in
            let side = min(proxy.size.width, proxy.size.height)
            let radius = side * 0.39
            let centre = CGPoint(x: proxy.size.width / 2, y: proxy.size.height / 2)
            ZStack {
                Circle().fill(Color(red: 1.0, green: 0.957, blue: 0.894)).frame(width: side * 0.62)
                arc(from: Self.firstHour, to: Self.lastHour, radius: radius, centre: centre, inset: 0)
                    .stroke(Color(red: 0.945, green: 0.910, blue: 0.855), style: stroke(side))
                ForEach(Array(timetable.blocks.enumerated()), id: \.offset) { _, block in
                    segment(block, radius: radius, centre: centre)
                        .stroke(Color(red: 0.737, green: 0.776, blue: 0.827), style: stroke(side))
                        .opacity(isPast(block) ? 0.4 : 1)
                }
                ForEach(Array((timetable.free ?? []).enumerated()), id: \.offset) { _, block in
                    segment(block, radius: radius, centre: centre)
                        .stroke(Color(red: 0.949, green: 0.643, blue: 0.608), style: stroke(side))
                        .opacity(isPast(block) ? 0.4 : 1)
                }
                Circle()
                    .fill(.white)
                    .overlay(Circle().fill(SurfaceColor.ink).padding(side * 0.022))
                    .shadow(color: .black.opacity(0.15), radius: 2, y: 1)
                    .frame(width: side * 0.075, height: side * 0.075)
                    .position(point(hour(of: now), radius: radius, centre: centre))
                PhuFace(mood: mood, side: side * 0.44, ground: false)
                    .position(centre)
            }
        }
        .accessibilityHidden(true)
    }

    private func stroke(_ side: CGFloat) -> StrokeStyle {
        StrokeStyle(lineWidth: side * 0.085, lineCap: .round)
    }

    private func isPast(_ block: SurfaceSnapshot.Timetable.Block) -> Bool {
        block.end / 1000 <= now.timeIntervalSince1970
    }

    private func hour(of date: Date) -> Double {
        let parts = Calendar.current.dateComponents([.hour, .minute], from: date)
        let hour = Double(parts.hour ?? 0) + Double(parts.minute ?? 0) / 60
        return min(Self.lastHour, max(Self.firstHour, hour))
    }

    /// Degrees clockwise from twelve o'clock: seven is -150, five in the evening is +150.
    private func degrees(_ hour: Double) -> Double { -150 + (hour - Self.firstHour) * 30 }

    private func point(_ hour: Double, radius: CGFloat, centre: CGPoint) -> CGPoint {
        let a = degrees(hour) * .pi / 180
        return CGPoint(x: centre.x + radius * sin(a), y: centre.y - radius * cos(a))
    }

    private func arc(from: Double, to: Double, radius: CGFloat, centre: CGPoint, inset: Double) -> Path {
        let start = degrees(from) + inset
        let end = max(start + 0.5, degrees(to) - inset)
        var path = Path()
        // SwiftUI's angles run clockwise from three o'clock on screen.
        path.addArc(
            center: centre, radius: radius, startAngle: .degrees(start - 90),
            endAngle: .degrees(end - 90), clockwise: false)
        return path
    }

    private func segment(_ block: SurfaceSnapshot.Timetable.Block, radius: CGFloat, centre: CGPoint) -> Path {
        let from = hour(of: Date(timeIntervalSince1970: block.start / 1000))
        let to = hour(of: Date(timeIntervalSince1970: block.end / 1000))
        guard to > from else { return Path() }
        return arc(from: from, to: to, radius: radius, centre: centre, inset: 3.2)
    }
}

/// The next free period: when, how long, the task he would put in it, and Book it.
struct NextFreeCard: View {
    let free: SurfaceSnapshot.Timetable.Free
    let snapshot: SurfaceSnapshot

    private var start: Date { Date(timeIntervalSince1970: free.start / 1000) }
    private var minutes: Int { max(0, Int((free.end - free.start) / 60_000)) }

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(snapshot.text("NEXT FREE"))
                .font(.system(size: 11, weight: .heavy))
                .tracking(0.6)
                .foregroundStyle(SurfaceColor.freeInk)
            Text(start.formatted(date: .omitted, time: .shortened))
                .font(.system(size: 32, weight: .heavy, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(SurfaceColor.freeInk)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            Text(String(format: snapshot.text("%d minutes"), minutes))
                .font(.caption)
                .foregroundStyle(SurfaceColor.freeMuted)
            Spacer(minLength: 4)
            if let task = free.task, snapshot.state != .crisis {
                Text(task)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(SurfaceColor.ink)
                    .lineLimit(2)
            }
            Link(destination: SurfaceLinks.timetable) {
                Text(snapshot.text("Book it"))
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 34)
                    .background(Capsule().fill(SurfaceColor.ink))
            }
            .padding(.top, 6)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(SurfaceColor.freeTint))
    }
}

/// Large (tuition): the day dial and the next free period.
struct TimetableLargeView: View {
    let entry: SurfaceEntry

    private var snapshot: SurfaceSnapshot { entry.snapshot }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(snapshot.text("Today")).font(.system(.headline, design: .rounded).weight(.heavy))
                Spacer()
                Text(entry.date.formatted(date: .omitted, time: .shortened))
                    .font(.system(.headline, design: .rounded).weight(.heavy))
                    .monospacedDigit()
                    .foregroundStyle(SurfaceColor.muted)
            }
            .foregroundStyle(SurfaceColor.ink)
            if let timetable = snapshot.timetable {
                HStack(spacing: 8) {
                    DayDial(timetable: timetable, now: entry.date, mood: entry.mood)
                    if let free = timetable.nextFree, free.end / 1000 > entry.date.timeIntervalSince1970 {
                        NextFreeCard(free: free, snapshot: snapshot)
                    } else {
                        Text(snapshot.text("No free periods left today"))
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(SurfaceColor.muted)
                            .frame(maxWidth: .infinity)
                    }
                }
            } else {
                Text(snapshot.text("Open the timetable in the app"))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(SurfaceColor.muted)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .widgetURL(SurfaceLinks.timetable)
    }
}

/// The next period on the Lock Screen: "Free period · 8:30" and what fits in it.
struct NextPeriodView: View {
    let entry: SurfaceEntry

    private var snapshot: SurfaceSnapshot { entry.snapshot }

    var body: some View {
        if !snapshot.isEnrolled {
            HStack(spacing: 6) {
                Image("GlyphLock").renderingMode(.template).resizable().frame(width: 14, height: 14)
                Text(snapshot.text("Timetable")).font(.headline)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .widgetURL(SurfaceLinks.tuition)
        } else if let free = snapshot.timetable?.nextFree,
            free.end / 1000 > entry.date.timeIntervalSince1970
        {
            VStack(alignment: .leading, spacing: 1) {
                Text(
                    String(
                        format: snapshot.text("Free period · %@"),
                        Date(timeIntervalSince1970: free.start / 1000)
                            .formatted(date: .omitted, time: .shortened)))
                    .font(.caption.weight(.semibold))
                    .widgetAccentable()
                Text(snapshot.state == .crisis ? "" : (free.task ?? ""))
                    .font(.headline)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .widgetURL(SurfaceLinks.timetable)
        } else {
            Text(snapshot.text("No free periods left today"))
                .font(.headline)
                .lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)
                .widgetURL(SurfaceLinks.timetable)
        }
    }
}

struct TimetableWidgetView: View {
    let entry: SurfaceEntry

    @Environment(\.widgetFamily) private var family

    var body: some View {
        Group {
            if family == .accessoryRectangular {
                NextPeriodView(entry: entry)
            } else if entry.snapshot.isEnrolled {
                TimetableLargeView(entry: entry)
            } else {
                QuietLock(snapshot: entry.snapshot)
            }
        }
        .containerBackground(for: .widget) {
            if family.isAccessory { Color.clear } else { SurfaceColor.sheet }
        }
    }
}

struct TimetableWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PhusclassTimetable", provider: SurfaceProvider()) { entry in
            TimetableWidgetView(entry: entry)
        }
        .configurationDisplayName("The timetable")
        .description("Today as a dial, and the next free period.")
        .supportedFamilies([.systemLarge, .accessoryRectangular])
    }
}
