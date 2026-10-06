import ActivityKit
import SwiftUI
import WidgetKit

/// Placeholder Lock Screen and Dynamic Island views for a session's Live Activity.
struct SessionLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SessionActivityAttributes.self) { context in
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(context.attributes.taskTitle)
                        .font(.headline)
                        .lineLimit(1)
                    Spacer()
                    SessionCountdown(endDate: context.state.endDate)
                }
                Text(context.state.line)
                    .font(.subheadline)
                    .lineLimit(1)
                Text("Placeholder Live Activity")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .padding()
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.attributes.taskTitle)
                        .font(.headline)
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    SessionCountdown(endDate: context.state.endDate)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.line)
                        .font(.subheadline)
                        .lineLimit(1)
                }
            } compactLeading: {
                Image(systemName: "pawprint")
            } compactTrailing: {
                SessionCountdown(endDate: context.state.endDate)
                    .frame(maxWidth: 52)
            } minimal: {
                Image(systemName: "pawprint")
            }
        }
    }
}

private struct SessionCountdown: View {
    let endDate: Date

    var body: some View {
        Text(endDate, style: .timer)
            .monospacedDigit()
            .multilineTextAlignment(.trailing)
    }
}
