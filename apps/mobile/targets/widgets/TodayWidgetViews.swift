import SwiftUI
import WidgetKit

/// What a Home Screen widget says and shows for the day's state, worked out once for every size.
struct TodayContent {
    let snapshot: SurfaceSnapshot
    let running: Bool
    let date: Date

    init(_ entry: TodayEntry) {
        snapshot = entry.snapshot
        running = entry.running
        date = entry.date
    }

    /// The small label above the words, or nil.
    var eyebrow: String? {
        switch snapshot.state {
        case .taskSet, .inSession, .serious: return snapshot.text("TODAY")
        case .nothingYet, .done, .crisis: return nil
        }
    }

    /// The main words. A crisis day has only its calm label.
    var title: String {
        switch snapshot.state {
        case .crisis: return snapshot.text("Here when you want.")
        case .nothingYet: return snapshot.text("Nothing yet. What's the one thing?")
        case .done: return snapshot.text("Done for today")
        case .taskSet, .inSession, .serious: return snapshot.task ?? snapshot.text("TODAY")
        }
    }

    /// Scootch's line. Never on a crisis day; a serious task's line is already plain words.
    var line: String? { snapshot.state == .crisis ? nil : snapshot.line }

    /// The picture: the task's monster when it has one, else the pose for the state. A crisis
    /// day has no picture.
    var art: SurfaceArt.Source? {
        switch snapshot.state {
        case .crisis: return nil
        case .serious: return .baked("ScootchSerious")
        case .nothingYet: return .baked(snapshot.pose("Waiting"))
        case .done: return .baked(snapshot.pose("Asleep"))
        case .inSession where running: return .baked(snapshot.pose("Working"))
        case .taskSet, .inSession:
            return snapshot.monsterPicture.map { .picture($0) } ?? .baked(snapshot.pose("Waiting"))
        }
    }

    /// True when the widget offers the start: a task is set and no session is running.
    var offersStart: Bool {
        !running && (snapshot.state == .taskSet || (snapshot.state == .serious && snapshot.sessionEndsAt == nil))
    }
}

/// The start mark: a play glyph in a dark disc, or in a pill with the session's length.
struct StartMark: View {
    @Environment(\.colorScheme) private var scheme
    let label: String?

    var body: some View {
        HStack(spacing: 6) {
            Image("GlyphPlay").resizable().scaledToFit().frame(width: 14, height: 14)
            if let label { Text(label).font(.subheadline.weight(.bold)) }
        }
        .foregroundStyle(SurfaceColor.page(scheme))
        .padding(.horizontal, label == nil ? 13 : 14)
        .padding(.vertical, 11)
        .background(Capsule().fill(SurfaceColor.ink(scheme)))
        .widgetAccentable()
    }
}

struct SmallTodayView: View {
    @Environment(\.colorScheme) private var scheme
    let entry: TodayEntry

    var body: some View {
        let content = TodayContent(entry)
        VStack(alignment: .leading, spacing: 2) {
            if let eyebrow = content.eyebrow {
                Text(eyebrow).font(.caption2.weight(.bold)).foregroundStyle(.secondary)
            }
            if content.running, let end = content.snapshot.sessionEnd {
                SessionTimeLeft(end: end, from: entry.date)
                    .font(.title.weight(.bold))
                    .widgetAccentable()
            }
            Text(content.title)
                .font(content.running ? .footnote : .headline)
                .foregroundStyle(content.running ? .secondary : .primary)
                .lineLimit(3)
                .minimumScaleFactor(0.8)
            Spacer(minLength: 0)
            HStack(alignment: .bottom) {
                if content.offersStart { StartMark(label: nil) }
                Spacer(minLength: 0)
                if let art = content.art {
                    SurfaceArt(source: art).frame(width: 64, height: 64)
                }
            }
        }
        .foregroundStyle(SurfaceColor.ink(scheme))
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct MediumTodayView: View {
    @Environment(\.colorScheme) private var scheme
    let entry: TodayEntry

    var body: some View {
        let content = TodayContent(entry)
        HStack(spacing: 14) {
            if content.running, let end = content.snapshot.sessionEnd {
                SessionDisc(start: content.snapshot.sessionStart ?? entry.date, end: end)
                    .frame(width: 84, height: 84)
            } else if let art = content.art {
                SurfaceArt(source: art).frame(width: 96, height: 96)
            }
            VStack(alignment: .leading, spacing: 4) {
                if content.running, let end = content.snapshot.sessionEnd {
                    SessionTimeLeft(end: end, from: entry.date)
                        .font(.title.weight(.bold))
                        .widgetAccentable()
                    Text(content.title).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
                } else {
                    if let eyebrow = content.eyebrow {
                        Text(eyebrow).font(.caption2.weight(.bold)).foregroundStyle(.secondary)
                    }
                    Text(content.line ?? content.title)
                        .font(.headline)
                        .lineLimit(3)
                        .minimumScaleFactor(0.8)
                    if content.line != nil, content.eyebrow != nil {
                        Text(content.title).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    }
                    if content.offersStart { StartMark(label: content.snapshot.text("10 min")) }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .foregroundStyle(SurfaceColor.ink(scheme))
    }
}

/// The week's record as seven bars: one filled for each finished day.
struct WeekBars: View {
    let filled: Int

    var body: some View {
        HStack(alignment: .bottom, spacing: 6) {
            ForEach(0..<7, id: \.self) { index in
                RoundedRectangle(cornerRadius: 5)
                    .fill(index < filled ? SurfaceColor.accent : Color.secondary.opacity(0.25))
                    .frame(height: index < filled ? 28 : 6)
                    .widgetAccentable(index < filled)
            }
        }
    }
}

struct LargeTodayView: View {
    @Environment(\.colorScheme) private var scheme
    let entry: TodayEntry

    var body: some View {
        let content = TodayContent(entry)
        VStack(alignment: .leading, spacing: 10) {
            if let eyebrow = content.eyebrow {
                Text(eyebrow).font(.caption.weight(.bold)).foregroundStyle(.secondary)
            }
            Text(content.title).font(.title2.weight(.bold)).lineLimit(2)
            if let line = content.line {
                Text(line).font(.body).foregroundStyle(.secondary).lineLimit(3)
            }
            Spacer(minLength: 0)
            HStack(alignment: .bottom) {
                if content.running, let end = content.snapshot.sessionEnd {
                    VStack(alignment: .leading) {
                        SessionDisc(start: content.snapshot.sessionStart ?? entry.date, end: end)
                            .frame(width: 72, height: 72)
                        SessionTimeLeft(end: end, from: entry.date).font(.title3.weight(.bold))
                    }
                } else if content.offersStart {
                    StartMark(label: content.snapshot.text("10 min"))
                }
                Spacer(minLength: 0)
                if let art = content.art {
                    SurfaceArt(source: art).frame(width: 130, height: 130)
                }
            }
            if content.snapshot.state != .crisis {
                WeekBars(filled: content.snapshot.weekBars).frame(height: 28)
            }
        }
        .foregroundStyle(SurfaceColor.ink(scheme))
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}
