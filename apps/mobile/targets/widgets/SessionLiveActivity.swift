import ActivityKit
import SwiftUI
import WidgetKit

/// What the session's Live Activity shows at one drawing: the activity's own state, joined with
/// the shared snapshot for everything the activity's state does not carry.
struct SessionActivityContent {
    let title: String
    let line: String
    let start: Date
    let end: Date
    let snapshot: SurfaceSnapshot

    init(context: ActivityViewContext<SessionActivityAttributes>, now: Date = Date()) {
        let stored = SurfaceSnapshot.load()
        // The snapshot speaks for this session only while it describes the same one.
        let same = stored.sessionEnd.map { abs($0.timeIntervalSince(context.state.endDate)) < 1 } ?? false
        snapshot = same ? stored : .empty
        title = context.attributes.taskTitle
        end = context.state.endDate
        start = snapshot.sessionStart ?? min(now, end)
        // The app's last update is the line. Once that has gone stale (the app set the stale date
        // to the next line turn and has not updated since), the line planned for this moment is.
        line = (context.isStale ? snapshot.sessionLine(at: now) : nil) ?? context.state.line
    }

    /// Scootch working beside the task; the listening pose for a serious task.
    var art: SurfaceArt.Source {
        snapshot.state == .serious ? .baked("ScootchSerious") : .baked(snapshot.pose("Working"))
    }

    func text(_ key: String) -> String { snapshot.text(key) }
}

/// The two buttons that work without unlocking. They record what was asked for; Scootch acts on
/// it when it is next opened.
struct SessionActivityButtons: View {
    let content: SessionActivityContent

    var body: some View {
        if #available(iOS 17.0, *) {
            HStack(spacing: 8) {
                Button(intent: ParkThoughtIntent()) { label("Park a thought") }
                Button(intent: StuckIntent()) { label("I'm stuck") }
            }
            .buttonStyle(.plain)
        }
    }

    private func label(_ key: String) -> some View {
        Text(content.text(key))
            .font(.subheadline.weight(.bold))
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(Capsule().fill(Color.white.opacity(0.16)))
            .foregroundStyle(.white)
    }
}

/// The time as the designed disc with the countdown under it.
struct SessionActivityClock: View {
    let content: SessionActivityContent

    var body: some View {
        VStack(spacing: 4) {
            SessionDisc(start: content.start, end: content.end).frame(width: 44, height: 44)
            SessionTimeLeft(end: content.end, from: content.start)
                .font(.footnote.weight(.bold))
                .multilineTextAlignment(.center)
                .frame(width: 56)
        }
    }
}

/// The Lock Screen activity: dark glass, Scootch, the task, one line, the disc and two buttons.
struct SessionLockScreenView: View {
    let content: SessionActivityContent

    var body: some View {
        VStack(spacing: 12) {
            HStack(alignment: .center, spacing: 12) {
                SurfaceArt(source: content.art).frame(width: 56, height: 56)
                VStack(alignment: .leading, spacing: 2) {
                    Text(content.title).font(.headline).lineLimit(1)
                    Text(content.line)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.72))
                        .lineLimit(2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                SessionActivityClock(content: content)
            }
            SessionActivityButtons(content: content)
        }
        .foregroundStyle(.white)
        .padding(16)
    }
}

/// The session's Live Activity on the Lock Screen and in the Dynamic Island. A tap anywhere but
/// the buttons opens the session.
struct SessionLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SessionActivityAttributes.self) { context in
            SessionLockScreenView(content: SessionActivityContent(context: context))
                .activityBackgroundTint(SurfaceColor.glass.opacity(0.78))
                .activitySystemActionForegroundColor(.white)
                .widgetURL(SurfaceLinks.session)
        } dynamicIsland: { context in
            let content = SessionActivityContent(context: context)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    SurfaceArt(source: content.art).frame(width: 52, height: 52)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    SessionActivityClock(content: content)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(content.title).font(.headline).lineLimit(1)
                        Text(content.line)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    SessionActivityButtons(content: content)
                }
            } compactLeading: {
                SurfaceArt(source: content.art).frame(width: 24, height: 24)
            } compactTrailing: {
                SessionTimeLeft(end: content.end, from: content.start)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(SurfaceColor.accent)
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 44)
            } minimal: {
                SessionDisc(start: content.start, end: content.end).frame(width: 22, height: 22)
            }
            .keylineTint(SurfaceColor.accent)
            .widgetURL(SurfaceLinks.session)
        }
    }
}
