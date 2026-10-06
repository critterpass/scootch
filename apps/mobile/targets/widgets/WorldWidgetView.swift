import SwiftUI
import WidgetKit

/// A Plus surface without Plus: the picture blurred behind a small lock. It says nothing and
/// sells nothing; the tap opens the app.
struct LockedPreview: View {
    @Environment(\.colorScheme) private var scheme
    let snapshot: SurfaceSnapshot

    var body: some View {
        ZStack {
            SurfaceArt(source: .baked(snapshot.pose("Waiting")))
                .padding(24)
                .blur(radius: 10)
                .opacity(0.55)
            VStack(spacing: 8) {
                Image("GlyphLock").resizable().scaledToFit().frame(width: 26, height: 26)
                Text(snapshot.text("Scootch Plus")).font(.footnote.weight(.semibold))
            }
            .foregroundStyle(SurfaceColor.ink(scheme))
            .widgetAccentable()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// The small widget on the Home Screen, or its StandBy presentation where the system removes
/// the container background. StandBy is a Plus surface.
struct SmallOrStandByView: View {
    let entry: TodayEntry

    var body: some View {
        if #available(iOS 17.0, *) {
            StandByAware(entry: entry)
        } else {
            SmallTodayView(entry: entry)
        }
    }
}

@available(iOS 17.0, *)
private struct StandByAware: View {
    @Environment(\.showsWidgetContainerBackground) private var hasBackground
    let entry: TodayEntry

    var body: some View {
        if hasBackground || entry.snapshot.plus || entry.snapshot.state == .crisis {
            SmallTodayView(entry: entry)
        } else {
            LockedPreview(snapshot: entry.snapshot)
        }
    }
}

/// Extra large: the world, this week's song and today's one thing.
struct WorldWidgetView: View {
    @Environment(\.colorScheme) private var scheme
    let entry: TodayEntry

    var body: some View {
        Group {
            if entry.snapshot.plus || entry.snapshot.state == .crisis {
                unlocked
            } else {
                LockedPreview(snapshot: entry.snapshot)
            }
        }
        .widgetURL(entry.snapshot.plus ? SurfaceLinks.world : SurfaceLinks.home)
        .surfaceBackground(SurfaceColor.page(scheme))
    }

    private var unlocked: some View {
        let content = TodayContent(entry)
        let snapshot = entry.snapshot
        return VStack(alignment: .leading, spacing: 12) {
            if snapshot.state == .crisis {
                Text(content.title).font(.title2.weight(.bold))
                Spacer(minLength: 0)
            } else {
                HStack(alignment: .firstTextBaseline) {
                    Text(snapshot.text("Your world")).font(.title.weight(.bold))
                    Spacer()
                    Text(String(format: snapshot.text("%lld things"), snapshot.worldThings))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                if let art = content.art {
                    SurfaceArt(source: art).frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    Spacer(minLength: 0)
                }
                Text(snapshot.text("THIS WEEK'S SONG"))
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.secondary)
                WeekBars(filled: snapshot.weekBars).frame(height: 28)
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        if let eyebrow = content.eyebrow {
                            Text(eyebrow).font(.caption2.weight(.bold)).foregroundStyle(.secondary)
                        }
                        Text(content.title).font(.headline).lineLimit(2)
                    }
                    Spacer(minLength: 0)
                    if content.offersStart { StartMark(label: "10") }
                }
                .padding(14)
                .background(RoundedRectangle(cornerRadius: 22).fill(Color.secondary.opacity(0.12)))
            }
        }
        .foregroundStyle(SurfaceColor.ink(scheme))
    }
}
