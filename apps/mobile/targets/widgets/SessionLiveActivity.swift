import ActivityKit
import SwiftUI
import WidgetKit

/// What the session's Live Activity shows at one drawing: the state the activity carries, joined
/// with the shared snapshot for when the session began and the line planned for this moment.
///
/// The system draws an activity again only when it is updated or when its content goes stale, so
/// the clock and the bar are views the system animates from two dates.
struct SessionContent {
    let taskTitle: String
    let snapshot: SurfaceSnapshot
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
        self.now = now
        taskTitle = attributes.taskTitle
        endDate = state.endDate
        // An activity the snapshot does not describe runs its bar from this drawing.
        beginDate = min((isToday ? stored.sessionStart : nil) ?? now, state.endDate)
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

    /// True until the end date; past it the clock has nothing left to count.
    var clockRuns: Bool { now < endDate }

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

/// The mark at the left, where the classroom's art will be drawn.
struct SessionTile: View {
    var side: CGFloat = 44

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: side * 0.3, style: .continuous)
                .fill(Color.white.opacity(0.1))
            SurfaceMark().foregroundStyle(SurfaceColor.penOnDark).padding(side * 0.24)
        }
        .frame(width: side, height: side)
    }
}

/// The task, and the "OFFLINE" tag while the phone has no connection.
struct SessionTitle: View {
    let content: SessionContent
    var font: Font = .headline

    var body: some View {
        HStack(spacing: 6) {
            Text(content.taskTitle).font(font).lineLimit(1)
            if content.offline && content.clockRuns {
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

/// The Lock Screen activity. A Live Activity is cut off past 160 points, so it is kept well
/// inside that at the default text size.
struct SessionLockScreenView: View {
    let content: SessionContent

    var body: some View {
        VStack(spacing: 10) {
            HStack(alignment: .center, spacing: 12) {
                SessionTile()
                VStack(alignment: .leading, spacing: 1) {
                    SessionTitle(content: content)
                    Text(content.line)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.72))
                        .lineLimit(2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                SessionClock(content: content)
            }
            SessionBar(start: content.beginDate, end: content.endDate, tint: SurfaceColor.penOnDark)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .dynamicTypeSize(...DynamicTypeSize.large)
    }
}

/// The session's Live Activity on the Lock Screen and in the Dynamic Island. A tap opens the
/// session. On an Apple Watch the system shows the compact views in the Smart Stack by itself.
struct SessionLiveActivity: Widget {
    /// How wide the Island's clock is drawn. The system's own timer text is cut short in a region
    /// that sizes itself to it, so it is given its room.
    private let islandClockWidth: CGFloat = 68

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SessionActivityAttributes.self) { context in
            SessionLockScreenView(content: SessionContent(context: context))
                .activityBackgroundTint(SurfaceColor.glass.opacity(0.78))
                .activitySystemActionForegroundColor(.white)
                .widgetURL(SurfaceLinks.session)
        } dynamicIsland: { context in
            let content = SessionContent(context: context)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    SessionTile(side: 48)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    SessionClock(content: content, font: .title3.weight(.heavy))
                        .frame(width: islandClockWidth, alignment: .trailing)
                        .dynamicTypeSize(...DynamicTypeSize.large)
                }
                // Under the camera: the task and one line of what is said.
                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .leading, spacing: 1) {
                        SessionTitle(content: content, font: .subheadline.weight(.semibold))
                        Text(content.line)
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.72))
                            .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .dynamicTypeSize(...DynamicTypeSize.large)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    SessionBar(
                        start: content.beginDate, end: content.endDate,
                        tint: SurfaceColor.penOnDark
                    )
                    .padding(.top, 4)
                }
            } compactLeading: {
                SurfaceMark().foregroundStyle(SurfaceColor.penOnDark).frame(width: 18, height: 18)
            } compactTrailing: {
                SessionClock(content: content, font: .caption.weight(.bold)).frame(maxWidth: 44)
            } minimal: {
                SessionRing(
                    start: content.beginDate, end: content.endDate, tint: SurfaceColor.penOnDark
                )
                .frame(width: 22, height: 22)
            }
            .keylineTint(SurfaceColor.penOnDark)
            .widgetURL(SurfaceLinks.session)
        }
    }
}
