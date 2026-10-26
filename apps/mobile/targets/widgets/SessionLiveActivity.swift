import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

/// What the Live Activity shows at one drawing: the state the activity carries, joined with the
/// shared snapshot for the line planned for this moment.
///
/// The system draws an activity again only when it is updated or when its content goes stale.
/// The app makes it stale at the next pressure rise (on the desk) and at the next line turn (in a
/// period), so his face and his pacing change on those drawings; the clock, the fuse and the bar
/// are views the system animates from two dates.
struct SessionContent {
    let taskTitle: String
    let taskId: String?
    let snapshot: SurfaceSnapshot
    let state: SessionActivityAttributes.ContentState
    let now: Date
    let beginDate: Date
    let endDate: Date
    let offline: Bool
    let line: String

    /// `isStale` is whether the system is drawing the activity again past its stale date.
    init(
        attributes: SessionActivityAttributes, state: SessionActivityAttributes.ContentState,
        isStale: Bool, now: Date = Date()
    ) {
        let stored = SurfaceSnapshot.load()
        let isToday = attributes.taskId != nil && stored.taskId == attributes.taskId
        snapshot = stored
        self.state = state
        self.now = now
        taskTitle = attributes.taskTitle
        taskId = attributes.taskId
        endDate = state.endDate
        // An activity the snapshot does not describe runs its bar from this drawing.
        beginDate = min(state.startDate ?? (isToday ? stored.sessionStart : nil) ?? now, state.endDate)
        offline = state.offline ?? false
        // The app's last update is the line. Once that has gone stale, the line planned for this
        // moment is, when the snapshot still describes this session.
        let planned = isStale && isToday ? stored.sessionLine(at: now) : nil
        line = planned ?? state.line
    }

    init(context: ActivityViewContext<SessionActivityAttributes>, now: Date = Date()) {
        self.init(
            attributes: context.attributes, state: context.state, isStale: context.isStale, now: now)
    }

    var isDesk: Bool { state.isDesk }
    var heavy: Bool { state.isHeavy }

    /// True until the end date; past it the clock has nothing left to count.
    var clockRuns: Bool { now < endDate }

    /// His face now: quiet for a serious task; on the desk, the pressure; in a period, one of
    /// his two pacing frames until the drum, then calm.
    var mood: PhuMood {
        if heavy { return .serious }
        if isDesk { return .pressure(state.pressure(at: now)) }
        return clockRuns ? PhuMood.pacing(at: now) : .calm
    }

    /// He steps left and right between frames as he paces.
    var paceOffset: CGFloat {
        guard !isDesk, !heavy, clockRuns else { return 0 }
        return mood == .grading ? -2 : 2
    }

    var fuseBurns: Bool { isDesk && state.fuseBurns(at: now) }

    func text(_ key: String) -> String { snapshot.text(key) }
}

/// The time left, counted down by the system; a plain zero once the session is over.
struct SessionClock: View {
    let content: SessionContent
    var font: Font = .title2.weight(.heavy)

    var body: some View {
        Group {
            if content.clockRuns {
                SessionTimeLeft(end: content.endDate, from: content.now)
                    .multilineTextAlignment(.trailing)
            } else {
                Text("0:00").monospacedDigit()
            }
        }
        .font(font)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .foregroundStyle(SurfaceColor.penOnDark)
    }
}

/// The fuse's time left, counted down by the system, in a burning ring.
struct FuseClock: View {
    let content: SessionContent
    var side: CGFloat = 46

    var body: some View {
        ZStack {
            Circle().fill(Color.white.opacity(0.1))
            FuseRing(start: content.state.fuseStart, end: content.state.fuseEnd, now: content.now)
                .padding(3)
            if content.fuseBurns, let end = content.state.fuseEnd {
                Text(timerInterval: content.now...end, countsDown: true)
                    .font(.system(size: side * 0.24, weight: .heavy, design: .rounded))
                    .monospacedDigit()
                    .multilineTextAlignment(.center)
                    .foregroundStyle(SurfaceColor.chalkYellow)
                    .frame(width: side * 0.7)
            }
        }
        .frame(width: side, height: side)
    }
}

/// His face in a rounded tile, as the Lock Screen activity draws it.
struct PhuTile: View {
    let content: SessionContent
    var side: CGFloat = 52

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: side * 0.3, style: .continuous).fill(content.mood.ground)
            content.mood.face
                .resizable()
                .scaledToFill()
                .frame(width: side * 1.15, height: side * 1.15)
                .offset(x: content.paceOffset, y: side * 0.08)
        }
        .frame(width: side, height: side)
        .clipShape(RoundedRectangle(cornerRadius: side * 0.3, style: .continuous))
        .accessibilityHidden(true)
    }
}

/// The task, and the "OFFLINE" tag while the phone has no connection.
struct SessionTitle: View {
    let content: SessionContent
    var font: Font = .headline

    var body: some View {
        HStack(spacing: 6) {
            Text(content.taskTitle).font(font).lineLimit(1)
            if content.offline && content.clockRuns && !content.isDesk {
                Text(content.text("OFFLINE"))
                    .font(.caption2.weight(.bold).monospaced())
                    .lineLimit(1)
                    .fixedSize()
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(Capsule().fill(Color.white.opacity(0.16)))
            }
        }
    }
}

/// A button of the activity: Start on the desk, Done in a period.
struct ActivityButton<Intent: AppIntent>: View {
    let intent: Intent
    let title: String
    var filled = true

    var body: some View {
        Button(intent: intent) {
            Text(title)
                .font(.subheadline.weight(.bold))
                .lineLimit(1)
                .frame(maxWidth: .infinity)
                .frame(height: 38)
                .foregroundStyle(filled ? Color.white : SurfaceColor.ink)
                .background(
                    Capsule().fill(filled ? AnyShapeStyle(SurfaceColor.start) : AnyShapeStyle(Color.white)))
        }
        .buttonStyle(.plain)
    }
}

/// On the desk: a tiny chalkboard with the task, his face at the pressure, and the fuse burning
/// along its ledge, with Start under it. A serious task has no fuse and no pressure.
struct DeskLockScreenView: View {
    let content: SessionContent

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                PhuTile(content: content)
                VStack(alignment: .leading, spacing: 4) {
                    Text(content.taskTitle)
                        .font(.system(.headline, design: .rounded).weight(.bold))
                        .foregroundStyle(SurfaceColor.chalk)
                        .lineLimit(2)
                    if !content.heavy {
                        FuseLine(
                            start: content.state.fuseStart, end: content.state.fuseEnd,
                            now: content.now)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(ChalkboardGround(corner: 12))
                if !content.heavy { FuseClock(content: content) }
            }
            ActivityButton(intent: StartDeskTaskIntent(), title: content.text("Start"))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .dynamicTypeSize(...DynamicTypeSize.large)
    }
}

/// In a period: his face pacing, the task, the time left, the bar and Done. A Live Activity is
/// cut off past 160 points, so it is kept well inside that at the default text size.
struct SessionLockScreenView: View {
    let content: SessionContent

    var body: some View {
        VStack(spacing: 10) {
            HStack(alignment: .center, spacing: 12) {
                PhuTile(content: content, side: 48)
                VStack(alignment: .leading, spacing: 1) {
                    SessionTitle(content: content)
                    if !content.line.isEmpty {
                        Text(content.line)
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.72))
                            .lineLimit(2)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                SessionClock(content: content)
            }
            SessionBar(start: content.beginDate, end: content.endDate, tint: SurfaceColor.penOnDark)
            ActivityButton(intent: DoneIntent(taskId: content.taskId), title: content.text("Done"), filled: false)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .dynamicTypeSize(...DynamicTypeSize.large)
    }
}

/// The desk and its periods on the Lock Screen and in the Dynamic Island. Compact: his face
/// and the time left. Expanded: the task, the timer and Done (Start on the desk). Minimal: his
/// face. On an Apple Watch the system shows the compact views in the Smart Stack by itself.
struct SessionLiveActivity: Widget {
    /// How wide the Island's clock is drawn. The system's own timer text is cut short in a region
    /// that sizes itself to it, so it is given its room.
    private let islandClockWidth: CGFloat = 68

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SessionActivityAttributes.self) { context in
            let content = SessionContent(context: context)
            Group {
                if content.isDesk {
                    DeskLockScreenView(content: content)
                } else {
                    SessionLockScreenView(content: content)
                }
            }
            .activityBackgroundTint(SurfaceColor.glass.opacity(0.78))
            .activitySystemActionForegroundColor(.white)
            .widgetURL(content.isDesk ? SurfaceLinks.home : SurfaceLinks.session)
        } dynamicIsland: { context in
            let content = SessionContent(context: context)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    PhuTile(content: content, side: 52)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if content.isDesk {
                        if !content.heavy { FuseClock(content: content, side: 44) }
                    } else {
                        SessionClock(content: content, font: .title3.weight(.heavy))
                            .frame(width: islandClockWidth, alignment: .trailing)
                            .dynamicTypeSize(...DynamicTypeSize.large)
                    }
                }
                // Under the camera: the task, and one line of what is said.
                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .leading, spacing: 1) {
                        SessionTitle(content: content, font: .subheadline.weight(.semibold))
                        if !content.line.isEmpty {
                            Text(content.line)
                                .font(.caption)
                                .foregroundStyle(.white.opacity(0.72))
                                .lineLimit(1)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .dynamicTypeSize(...DynamicTypeSize.large)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 8) {
                        if content.isDesk {
                            ActivityButton(intent: StartDeskTaskIntent(), title: content.text("Start"))
                        } else {
                            SessionBar(
                                start: content.beginDate, end: content.endDate,
                                tint: SurfaceColor.penOnDark)
                            ActivityButton(
                                intent: DoneIntent(taskId: content.taskId),
                                title: content.text("Done"), filled: false)
                        }
                    }
                    .padding(.top, 4)
                }
            } compactLeading: {
                PhuFace(mood: content.mood, side: 24)
                    .offset(x: content.paceOffset / 2)
            } compactTrailing: {
                if content.isDesk {
                    if !content.heavy {
                        FuseRing(start: content.state.fuseStart, end: content.state.fuseEnd, now: content.now)
                            .frame(width: 20, height: 20)
                    }
                } else if content.clockRuns {
                    SessionClock(content: content, font: .caption.weight(.bold)).frame(maxWidth: 44)
                } else {
                    Image("PropDrum").resizable().scaledToFit().frame(width: 22, height: 22)
                }
            } minimal: {
                PhuFace(mood: content.mood, side: 22)
            }
            .keylineTint(SurfaceColor.penOnDark)
            .widgetURL(content.isDesk ? SurfaceLinks.home : SurfaceLinks.session)
        }
    }
}
