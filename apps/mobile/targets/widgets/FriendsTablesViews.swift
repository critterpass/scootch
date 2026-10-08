import AppIntents
import SwiftUI
import WidgetKit

/// The small "Friends at tables" widget. It shows the first open table a friend is at, named by
/// that friend, and the open seat is the button. What it knows is what the app last asked the
/// server, so after a while it says to open Scootch instead of showing something stale.
struct FriendsTablesWidgetView: View {
    let entry: SurfaceEntry

    var body: some View {
        let snapshot = entry.snapshot
        SurfaceLookReader { look in
            Group {
                if snapshot.state == .crisis {
                    CalmLabel(snapshot: snapshot, look: look).widgetURL(SurfaceLinks.home)
                } else if let friends = snapshot.friendsTables, friends.isFresh(at: entry.date) {
                    if let table = friends.tables.first {
                        FriendTableView(table: table, more: friends.tables.count - 1, snapshot: snapshot, look: look)
                    } else {
                        words(snapshot.text("No friend is at a table."), snapshot, look)
                    }
                } else {
                    words(snapshot.text("Open Scootch to see who is at a table."), snapshot, look)
                }
            }
            .surfaceBackground(look.page)
        }
    }

    private func words(_ text: String, _ snapshot: SurfaceSnapshot, _ look: SurfaceLook) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(snapshot.text("AT A TABLE"))
                .font(SurfaceFont.mono(.caption2))
                .tracking(1.2)
                .foregroundStyle(look.muted)
            Text(text)
                .font(SurfaceFont.rounded(.subheadline))
                .foregroundStyle(look.ink)
                .lineLimit(4)
                .minimumScaleFactor(0.8)
            Spacer(minLength: 0)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(SurfaceLinks.url("table"))
    }
}

private struct FriendTableView: View {
    let table: SurfaceSnapshot.FriendsTable
    /// How many other tables have a friend at them.
    let more: Int
    let snapshot: SurfaceSnapshot
    let look: SurfaceLook

    private var who: String {
        let name = table.friend ?? snapshot.text("A friend")
        return table.others > 0 ? String(format: snapshot.text("%@ +%lld"), name, table.others) : name
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .top) {
                Text(snapshot.text("AT A TABLE"))
                    .font(SurfaceFont.mono(.caption2))
                    .tracking(1.2)
                    .foregroundStyle(look.muted)
                Spacer(minLength: 0)
                SurfaceArt(source: .baked(snapshot.pose("Working"))).frame(width: 36, height: 36)
            }
            Text(who)
                .font(SurfaceFont.rounded(.headline))
                .foregroundStyle(look.ink)
                .lineLimit(2)
                .minimumScaleFactor(0.75)
                .widgetAccentable()
            Text(
                table.openSeats == 1
                    ? snapshot.text("1 open seat")
                    : String(format: snapshot.text("%lld open seats"), table.openSeats)
            )
            .font(.caption.weight(.medium))
            .foregroundStyle(look.muted)
            .lineLimit(1)
            Spacer(minLength: 0)
            if table.openSeats > 0 {
                Button(intent: SitAtTableIntent(tableId: table.tableId)) {
                    Text(snapshot.text("Sit here"))
                        .font(SurfaceFont.rounded(.footnote, .bold))
                        .foregroundStyle(look.flat ? Color.white : look.page)
                        .frame(maxWidth: .infinity, minHeight: 32)
                        .background(Capsule().fill(look.flat ? Color.white.opacity(0.22) : look.ink))
                        .widgetAccentable()
                }
                .buttonStyle(.plain)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(SurfaceLinks.home)
    }
}
