import AppIntents
import SwiftUI
import WidgetKit

/// How a widget is being drawn right now: light or dark, in full colour or flattened by Clear
/// and Tinted, on its own paper or on the system's black (StandBy).
struct SurfaceLook {
    let scheme: ColorScheme
    let mode: WidgetRenderingMode
    let hasBackground: Bool

    /// Clear and Tinted keep only how opaque a thing is, so a filled chip would swallow its words.
    var flat: Bool { mode != .fullColor }
    var standBy: Bool { !hasBackground }
    private var onDark: Bool { scheme == .dark || standBy || flat }

    var page: Color { standBy ? .black : SurfaceColor.page(scheme) }
    var ink: Color { onDark ? .white : SurfaceColor.ink }
    var muted: Color { onDark ? Color.white.opacity(0.62) : SurfaceColor.muted }
    var sand: Color { onDark ? Color.white.opacity(0.14) : SurfaceColor.sand }
    var sandLine: Color { onDark ? Color.white.opacity(0.1) : SurfaceColor.sandLine }
}

/// Hands a view the look it is being drawn in.
struct SurfaceLookReader<Content: View>: View {
    @Environment(\.colorScheme) private var scheme
    @Environment(\.widgetRenderingMode) private var mode
    @Environment(\.showsWidgetContainerBackground) private var hasBackground
    @ViewBuilder let content: (SurfaceLook) -> Content

    var body: some View {
        content(SurfaceLook(scheme: scheme, mode: mode, hasBackground: hasBackground))
            // A widget is a few square centimetres: the largest text sizes would leave no words.
            .dynamicTypeSize(...DynamicTypeSize.xxLarge)
    }
}

/// How long a thing has waited, as a small label. It is the thing's days, never the person's:
/// the same number its card carries.
struct DayChip: View {
    enum Tone {
        /// The first days: small and polite.
        case calm
        /// Settling in.
        case settling
        /// Pressed against the glass, or the one being hunted in the lineup.
        case pressed

        init(day: Int) {
            self = day >= 9 ? .pressed : day >= 4 ? .settling : .calm
        }
    }

    let label: String
    let tone: Tone
    let look: SurfaceLook
    var compact = false

    var body: some View {
        Text(label)
            .font(SurfaceFont.mono(.caption2))
            .lineLimit(1)
            .fixedSize()
            .foregroundStyle(words)
            .padding(.horizontal, compact ? 5 : 6)
            .padding(.vertical, compact ? 3 : 4)
            .background(RoundedRectangle(cornerRadius: compact ? 5 : 6, style: .continuous).fill(fill))
            .widgetAccentable(tone == .pressed)
    }

    private var words: Color {
        if look.flat { return .white }
        switch tone {
        case .calm: return look.ink
        case .settling: return SurfaceColor.ink
        case .pressed: return .white
        }
    }

    private var fill: Color {
        if look.flat { return Color.white.opacity(tone == .calm ? 0.16 : 0.28) }
        switch tone {
        case .calm: return look.sand
        case .settling: return SurfaceColor.butter
        case .pressed: return SurfaceColor.accent
        }
    }
}

/// A lurker's own picture, or Scootch waiting where the phone could not draw it.
struct LurkerArt: View {
    let lurker: SurfaceSnapshot.Lurker
    let snapshot: SurfaceSnapshot

    var body: some View {
        if let picture = lurker.picture {
            SurfaceArt(source: .picture(picture))
        } else {
            SurfaceArt(source: .baked(snapshot.pose("Waiting")))
        }
    }
}

extension SurfaceSnapshot.Lurker {
    /// How far it has grown from its first day (0) to pressed against the glass (1).
    var grown: Double { max(0, min(1, (size - 0.4) / 0.6)) }
}

/// The small widget: the oldest lurker under its task, the size its day has made it. On its
/// first day it stands small at the bottom; by its ninth it fills the glass and its feet are
/// below the edge. The whole widget is the button that hunts it.
struct LurkerSmallView: View {
    let entry: SurfaceEntry
    let lurker: SurfaceSnapshot.Lurker
    let look: SurfaceLook

    private var hunted: Bool { entry.hunted == lurker.taskId }
    /// Only a monster grown tall enough to stand behind the words needs the glow.
    private var glow: Double { look.flat || lurker.grown < 0.5 ? 0 : 1 }

    var body: some View {
        if hunted {
            // The hunt is on: the tap goes to it.
            glass.widgetURL(SurfaceLinks.session)
        } else {
            Button(intent: HuntIntent(taskId: lurker.taskId)) { glass }
                .buttonStyle(.plain)
                .accessibilityLabel(
                    String(
                        format: entry.snapshot.text("%@, day %lld. Hunt it for ten minutes."),
                        lurker.task, lurker.day))
        }
    }

    private var glass: some View {
        GeometryReader { box in
            // The board draws this widget 158 points a side.
            let unit = min(box.size.width, box.size.height) / 158
            let side = (78 + 142 * lurker.grown) * unit
            let sunk = (86 * pow(lurker.grown, 1.5) - 2) * unit
            ZStack(alignment: .topLeading) {
                LurkerArt(lurker: lurker, snapshot: entry.snapshot)
                    .frame(width: side, height: side)
                    .position(x: box.size.width / 2, y: box.size.height + sunk - side / 2)
                VStack(alignment: .leading, spacing: 5 * unit) {
                    HStack(alignment: .center, spacing: 4) {
                        Text(entry.snapshot.text(hunted ? "Hunting" : "Lurking"))
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(look.muted)
                            .lineLimit(1)
                        Spacer(minLength: 0)
                        DayChip(
                            label: String(format: entry.snapshot.text("DAY %lld"), lurker.day),
                            tone: hunted ? .pressed : DayChip.Tone(day: lurker.day), look: look)
                    }
                    Text(lurker.task)
                        .font(SurfaceFont.rounded(.subheadline))
                        .foregroundStyle(look.ink)
                        .lineLimit(2)
                        .minimumScaleFactor(0.8)
                        // A grown monster stands behind the words; the paper glows through.
                        .shadow(color: look.page.opacity(glow), radius: 3)
                        .shadow(color: look.page.opacity(glow), radius: 1)
                        .widgetAccentable()
                }
                .padding(.horizontal, 14 * unit)
                .padding(.top, 13 * unit)
            }
        }
    }
}

/// What a widget says when there is no monster to draw: nothing yet, a thing that has not
/// hatched, a serious task in its plain words, a finished day, or a crisis day's one calm label.
struct PlainDay {
    let snapshot: SurfaceSnapshot
    let running: Bool
    let date: Date

    init(_ entry: SurfaceEntry) {
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
    /// day has no picture, and a serious task has Scootch sitting quietly and no monster.
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
        !running
            && (snapshot.state == .taskSet
                || (snapshot.state == .serious && snapshot.sessionEndsAt == nil))
    }

    /// Where a tap lands.
    var destination: URL { SurfaceLinks.destination(for: snapshot, at: date) }
}

/// "10 min" as a button that opens Scootch and starts the session on today's one thing.
struct StartButton: View {
    let snapshot: SurfaceSnapshot
    let look: SurfaceLook
    /// The small widget has room for the mark alone.
    var compact = false

    var body: some View {
        Button(intent: StartSessionIntent()) {
            HStack(spacing: 6) {
                Image("GlyphPlay").resizable().scaledToFit().frame(width: 12, height: 12)
                if !compact {
                    Text(snapshot.text("10 min"))
                        .font(SurfaceFont.rounded(.footnote, .bold))
                        .lineLimit(1)
                        .fixedSize()
                }
            }
            .foregroundStyle(look.flat ? Color.white : look.page)
            .padding(.horizontal, 13)
            .padding(.vertical, compact ? 13 : 9)
            .background(Capsule().fill(look.flat ? Color.white.opacity(0.22) : look.ink))
            .widgetAccentable()
        }
        .buttonStyle(.plain)
        .accessibilityLabel(snapshot.text("Start 10 min"))
    }
}

struct PlainSmallView: View {
    let entry: SurfaceEntry
    let look: SurfaceLook

    var body: some View {
        let day = PlainDay(entry)
        VStack(alignment: .leading, spacing: 4) {
            if let eyebrow = day.eyebrow {
                Text(eyebrow)
                    .font(SurfaceFont.mono(.caption2))
                    .tracking(1.2)
                    .foregroundStyle(look.muted)
            }
            if day.running, let end = day.snapshot.sessionEnd {
                SessionTimeLeft(end: end, from: entry.date)
                    .font(SurfaceFont.rounded(.title2))
                    .widgetAccentable()
            }
            Text(day.title)
                .font(SurfaceFont.rounded(day.running ? .footnote : .callout))
                .foregroundStyle(day.running ? look.muted : look.ink)
                .lineLimit(3)
                .minimumScaleFactor(0.8)
            Spacer(minLength: 0)
            HStack(alignment: .bottom) {
                if day.offersStart { StartButton(snapshot: day.snapshot, look: look, compact: true) }
                Spacer(minLength: 0)
                if let art = day.art {
                    SurfaceArt(source: art).frame(width: 62, height: 62)
                }
            }
        }
        .foregroundStyle(look.ink)
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct PlainMediumView: View {
    let entry: SurfaceEntry
    let look: SurfaceLook

    var body: some View {
        let day = PlainDay(entry)
        HStack(spacing: 14) {
            if let art = day.art {
                SurfaceArt(source: art).frame(width: 96, height: 96)
            }
            VStack(alignment: .leading, spacing: 5) {
                if let eyebrow = day.eyebrow {
                    Text(eyebrow)
                        .font(SurfaceFont.mono(.caption2))
                        .tracking(1.2)
                        .foregroundStyle(look.muted)
                }
                if day.running, let end = day.snapshot.sessionEnd {
                    SessionTimeLeft(end: end, from: entry.date)
                        .font(SurfaceFont.rounded(.title2))
                        .widgetAccentable()
                }
                Text(day.title)
                    .font(SurfaceFont.rounded(.headline))
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                if let line = day.line, !day.running {
                    Text(line).font(.caption).foregroundStyle(look.muted).lineLimit(2)
                }
                if day.offersStart { StartButton(snapshot: day.snapshot, look: look) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .foregroundStyle(look.ink)
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

/// The small widget's layouts: the lurker, Scootch at rest, the plain day, and on the nightstand
/// after ten tomorrow's one thing. StandBy is a Plus surface: without Plus it is a locked preview.
struct LurkerWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SurfaceEntry

    var body: some View {
        switch family {
        case .accessoryInline: LurkerInlineView(entry: entry).surfaceBackground(.clear)
        case .accessoryCircular: LurkerCircularView(entry: entry).surfaceBackground(.clear)
        case .accessoryRectangular: LurkerRectangularView(entry: entry).surfaceBackground(.clear)
        default:
            SurfaceLookReader { look in
                small(look).surfaceBackground(look.page)
            }
        }
    }

    @ViewBuilder private func small(_ look: SurfaceLook) -> some View {
        let snapshot = entry.snapshot
        if look.standBy, !snapshot.plus, snapshot.state != .crisis {
            LockedPreview(snapshot: snapshot).widgetURL(SurfaceLinks.home)
        } else if look.standBy, entry.night, let thing = snapshot.tomorrow {
            NightlightView(entry: entry, thing: thing)
        } else if entry.showsLurker, let lurker = entry.lurker {
            LurkerSmallView(entry: entry, lurker: lurker, look: look)
        } else if let rest = entry.rest {
            RestSmallView(entry: entry, rest: rest, look: look).widgetURL(SurfaceLinks.world)
        } else {
            PlainSmallView(entry: entry, look: look).widgetURL(PlainDay(entry).destination)
        }
    }
}

/// One waiting monster in the lineup: its days above it, and the monster the size those days
/// have made it. It is the button that hunts it.
private struct LineupMonster: View {
    let lurker: SurfaceSnapshot.Lurker
    let entry: SurfaceEntry
    let look: SurfaceLook
    let unit: CGFloat

    private var hunted: Bool { entry.hunted == lurker.taskId }

    var body: some View {
        let side = CGFloat(46 + 5 * min(max(lurker.day, 1), 9)) * unit
        Button(intent: HuntIntent(taskId: lurker.taskId)) {
            // A monster stands in the lower part of its picture: the chip sits just over its head.
            VStack(spacing: -0.14 * side) {
                DayChip(
                    label: String(format: entry.snapshot.text("%lldd"), lurker.day),
                    tone: hunted ? .pressed : .calm, look: look, compact: true
                )
                .zIndex(1)
                LurkerArt(lurker: lurker, snapshot: entry.snapshot)
                    .frame(width: side, height: side)
                    .background {
                        if hunted, !look.flat {
                            Circle().fill(
                                RadialGradient(
                                    colors: [SurfaceColor.accent.opacity(0.24), SurfaceColor.accent.opacity(0)],
                                    center: .center, startRadius: 0, endRadius: side * 0.62)
                            )
                            .scaleEffect(1.25)
                        }
                    }
            }
            .frame(maxWidth: .infinity, alignment: .bottom)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(
            String(
                format: entry.snapshot.text("%@, day %lld. Hunt it for ten minutes."),
                lurker.task, lurker.day))
    }
}

/// The medium widget: up to four lurkers standing on the floor, the one that has waited longest
/// first. With nothing lurking it is Scootch at rest, or the plain day.
struct LurkersLineupView: View {
    let entry: SurfaceEntry
    let look: SurfaceLook

    var body: some View {
        GeometryReader { box in
            // The board draws this widget 158 points tall.
            let unit = box.size.height / 158
            let snapshot = entry.snapshot
            ZStack(alignment: .bottom) {
                Rectangle()
                    .fill(look.sand)
                    .frame(height: 12 * unit)
                    .overlay(alignment: .top) {
                        Rectangle().fill(look.sandLine).frame(height: 1.5)
                    }
                VStack(spacing: 0) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(snapshot.text("Lurkers"))
                            .font(SurfaceFont.rounded(.subheadline))
                            .foregroundStyle(look.ink)
                            .widgetAccentable()
                        Spacer(minLength: 8)
                        Text(snapshot.text(entry.hunted == nil ? "tap one to hunt it · 10 min" : "hunting now"))
                            .font(.caption2.weight(.medium))
                            .foregroundStyle(look.muted)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                    .padding(.horizontal, 14 * unit)
                    .padding(.top, 13 * unit)
                    HStack(alignment: .bottom, spacing: 0) {
                        ForEach(snapshot.lurkers.prefix(4)) { lurker in
                            LineupMonster(lurker: lurker, entry: entry, look: look, unit: unit)
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
                    .padding(.horizontal, 10 * unit)
                    .padding(.bottom, 4 * unit)
                }
            }
        }
    }
}

struct LurkersWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SurfaceEntry

    var body: some View {
        switch family {
        case .accessoryCircular: HuntCircularView(entry: entry).surfaceBackground(.clear)
        default:
            SurfaceLookReader { look in
                Group {
                    if entry.snapshot.state != .crisis, entry.snapshot.state != .serious,
                        !entry.snapshot.lurkers.isEmpty
                    {
                        LurkersLineupView(entry: entry, look: look)
                    } else if let rest = entry.rest {
                        RestMediumView(entry: entry, rest: rest, look: look)
                            .widgetURL(SurfaceLinks.world)
                    } else {
                        PlainMediumView(entry: entry, look: look)
                            .widgetURL(PlainDay(entry).destination)
                    }
                }
                .surfaceBackground(look.page)
            }
        }
    }
}
