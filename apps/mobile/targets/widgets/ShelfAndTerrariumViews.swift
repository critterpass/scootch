import SwiftUI
import WidgetKit

/// The ink that reads on each finish: the label's and the count's. Paper and riso are printed on
/// the widget's own page, which is dark in Dark; Clear, Tinted and StandBy have no finish at all.
private struct FinishInk {
    let count: Color
    let label: Color

    init(_ finish: String, look: SurfaceLook) {
        if look.flat || look.standBy {
            count = look.ink
            label = look.muted
            return
        }
        switch finish {
        case "jelly":
            count = Color(red: 1.0, green: 0.973, blue: 0.953)
            label = count.opacity(0.88)
        case "flock":
            count = Color(red: 0.965, green: 0.945, blue: 0.910)
            label = count.opacity(0.8)
        case "holo", "chrome", "glass":
            count = SurfaceColor.ink
            label = SurfaceColor.ink.opacity(0.68)
        default:
            count = look.ink
            label = look.muted
        }
    }
}

/// The holo finish's sparkle: a fine grid of white points.
private struct Sparkle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let step: CGFloat = 11
        var y = rect.minY + step / 2
        while y < rect.maxY {
            var x = rect.minX + step / 2
            while x < rect.maxX {
                path.addEllipse(in: CGRect(x: x - 1, y: y - 1, width: 2, height: 2))
                x += step
            }
            y += step
        }
        return path
    }
}

/// The world as the app drew it, standing where the widget wants it. The island fills the lower
/// half of its square picture.
struct WorldArt: View {
    let picture: UIImage
    var asleep = false

    var body: some View {
        if asleep {
            // The nightstand: everything in dim red.
            Image(uiImage: picture).resizable().scaledToFit()
                .grayscale(1)
                .colorMultiply(Color(red: 1.0, green: 0.26, blue: 0.2))
                .brightness(-0.04)
        } else {
            SurfaceArt(source: .picture(picture))
        }
    }
}

/// The small Shelf: the count of everything caught, printed on the finish the person wears,
/// with the world peeking in at the corner. It never counts down.
struct ShelfSmallView: View {
    let entry: SurfaceEntry
    let look: SurfaceLook

    var body: some View {
        let snapshot = entry.snapshot
        let ink = FinishInk(snapshot.finish, look: look)
        GeometryReader { box in
            let unit = min(box.size.width, box.size.height) / 158
            ZStack(alignment: .topLeading) {
                if let world = snapshot.worldPicture(asleep: false) {
                    WorldArt(picture: world)
                        .frame(width: 140 * unit, height: 140 * unit)
                        .position(
                            x: box.size.width + 18 * unit - 70 * unit,
                            y: box.size.height + 22 * unit - 70 * unit)
                }
                VStack(alignment: .leading, spacing: 2 * unit) {
                    Text(snapshot.text("SHELF"))
                        .font(SurfaceFont.mono(.caption2))
                        .tracking(1.4)
                        .foregroundStyle(ink.label)
                    Text("\(snapshot.shelf)")
                        .font(.system(size: 42 * unit, weight: .black, design: .rounded))
                        .tracking(-1.6)
                        .monospacedDigit()
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                        .foregroundStyle(ink.count)
                        .widgetAccentable()
                }
                .padding(.leading, 14 * unit)
                .padding(.top, 13 * unit)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(String(format: snapshot.text("%lld caught"), snapshot.shelf))
    }
}

/// The Shelf on the nightstand after ten: the world asleep, in dim red.
struct ShelfNightView: View {
    let entry: SurfaceEntry

    var body: some View {
        let snapshot = entry.snapshot
        GeometryReader { box in
            let unit = min(box.size.width, box.size.height) / 158
            ZStack(alignment: .topLeading) {
                if let world = snapshot.worldPicture(asleep: true) {
                    WorldArt(picture: world, asleep: true)
                        .frame(width: 176 * unit, height: 176 * unit)
                        .position(x: box.size.width / 2, y: box.size.height - 58 * unit)
                }
                VStack(alignment: .leading, spacing: 2 * unit) {
                    Text(snapshot.text("SHELF"))
                        .font(SurfaceFont.mono(.caption2))
                        .tracking(1.4)
                        .foregroundStyle(SurfaceColor.emberBright.opacity(0.7))
                    Text("\(snapshot.shelf)")
                        .font(.system(size: 36 * unit, weight: .black, design: .rounded))
                        .tracking(-1.4)
                        .foregroundStyle(SurfaceColor.ember)
                }
                .padding(.leading, 14 * unit)
                .padding(.top, 13 * unit)
            }
        }
    }
}

/// What the Shelf is made of: the finish the person wears. A crisis day is plain paper.
struct ShelfBackground: View {
    let snapshot: SurfaceSnapshot
    let look: SurfaceLook

    var body: some View {
        if snapshot.state == .crisis {
            look.page
        } else {
            ZStack {
                FinishFill(finish: snapshot.finish, paper: look.page)
                if snapshot.finish == "holo" {
                    Sparkle().fill(Color.white.opacity(0.85)).blendMode(.screen)
                }
            }
        }
    }
}

struct ShelfWidgetView: View {
    let entry: SurfaceEntry

    var body: some View {
        let snapshot = entry.snapshot
        SurfaceLookReader { look in
            Group {
                if snapshot.state == .crisis {
                    // Nothing of the day, and nothing counted, on a crisis day.
                    CalmLabel(snapshot: snapshot, look: look)
                } else if look.standBy, !snapshot.plus {
                    LockedPreview(snapshot: snapshot)
                } else if look.standBy, entry.night {
                    ShelfNightView(entry: entry)
                } else {
                    ShelfSmallView(entry: entry, look: look)
                }
            }
            .widgetURL(snapshot.state == .crisis ? SurfaceLinks.home : SurfaceLinks.cards)
            .containerBackground(for: .widget) { ShelfBackground(snapshot: snapshot, look: look) }
        }
    }
}

/// The one calm label a crisis day has on any surface.
struct CalmLabel: View {
    let snapshot: SurfaceSnapshot
    let look: SurfaceLook

    var body: some View {
        Text(snapshot.text("Here when you want."))
            .font(SurfaceFont.rounded(.callout))
            .foregroundStyle(look.ink)
            .padding(14)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

/// The dots of the terrarium's back wall.
private struct WallDots: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let step: CGFloat = 12
        var y = rect.minY + step / 2
        while y < rect.maxY {
            var x = rect.minX + step / 2
            while x < rect.maxX {
                path.addEllipse(in: CGRect(x: x - 1.3, y: y - 1.3, width: 2.6, height: 2.6))
                x += step
            }
            y += step
        }
        return path
    }
}

/// How long ago, in the person's language: "2 hr. ago".
private func ago(_ then: Date, from now: Date, language: String) -> String {
    let formatter = RelativeDateTimeFormatter()
    formatter.locale = Locale(identifier: language == "vi" ? "vi" : "en")
    formatter.unitsStyle = .abbreviated
    // A catch in this very minute reads as a minute ago rather than "in 0 sec.".
    return formatter.localizedString(for: min(then, now.addingTimeInterval(-60)), relativeTo: now)
}

/// The large Terrarium: everything caught, living under glass, with the latest catch on a
/// plate along the bottom. Quietly proud, and it never counts down.
struct TerrariumView: View {
    let entry: SurfaceEntry
    let look: SurfaceLook

    var body: some View {
        let snapshot = entry.snapshot
        GeometryReader { box in
            // The board draws this widget 338 points wide.
            let unit = min(box.size.width / 338, box.size.height / 354)
            let side = min(box.size.width, box.size.height - 40 * unit)
            ZStack(alignment: .top) {
                if let world = snapshot.worldPicture(asleep: false) {
                    WorldArt(picture: world)
                        .frame(width: side, height: side)
                        .position(x: box.size.width / 2, y: box.size.height - 30 * unit - side / 2)
                }
                if !look.flat {
                    // Light across the glass.
                    LinearGradient(
                        stops: [
                            .init(color: .white.opacity(0), location: 0.30),
                            .init(color: .white.opacity(look.scheme == .dark ? 0.12 : 0.45), location: 0.42),
                            .init(color: .white.opacity(0), location: 0.52),
                        ],
                        startPoint: UnitPoint(x: 0, y: 0.2), endPoint: UnitPoint(x: 1, y: 0.8)
                    )
                    .allowsHitTesting(false)
                }
                HStack(alignment: .firstTextBaseline) {
                    Text(snapshot.text("Your world"))
                        .font(SurfaceFont.rounded(.headline))
                        .foregroundStyle(look.ink)
                        .widgetAccentable()
                    Spacer(minLength: 8)
                    Text(String(format: snapshot.text("%lld CAUGHT"), snapshot.shelf))
                        .font(SurfaceFont.mono(.caption2))
                        .tracking(1.2)
                        .foregroundStyle(look.muted)
                }
                .padding(.horizontal, 16 * unit)
                .padding(.top, 15 * unit)
                plate(snapshot)
                    .padding(12 * unit)
                    .frame(maxHeight: .infinity, alignment: .bottom)
            }
        }
    }

    private func plate(_ snapshot: SurfaceSnapshot) -> some View {
        HStack(spacing: 8) {
            if let latest = snapshot.latestCatch {
                Text(
                    String(
                        format: snapshot.text("Latest: %@, %@"), latest.name,
                        ago(
                            Date(timeIntervalSince1970: latest.caughtAt / 1000), from: entry.date,
                            language: snapshot.language))
                )
                .font(.caption.weight(.medium))
                .foregroundStyle(look.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            } else {
                Text(snapshot.text("Nothing caught yet."))
                    .font(.caption.weight(.medium))
                    .foregroundStyle(look.muted)
            }
            Spacer(minLength: 0)
            if let week = snapshot.caughtThisWeek, week > 0 {
                Text(String(format: snapshot.text("+%lld this week"), week))
                    .font(SurfaceFont.rounded(.caption, .bold))
                    .foregroundStyle(
                        look.flat || look.scheme == .dark ? look.ink : SurfaceColor.tomatoDeep
                    )
                    .lineLimit(1)
                    .widgetAccentable()
            }
        }
        .padding(.horizontal, 14)
        .frame(minHeight: 34)
        .background(
            Capsule().fill(
                look.flat || look.scheme == .dark
                    ? Color.white.opacity(0.14) : Color.white.opacity(0.72)))
    }
}

/// The terrarium's back wall: warm paper with a fine grid of dots. A crisis day is plain paper.
struct TerrariumBackground: View {
    let crisis: Bool
    let look: SurfaceLook

    var body: some View {
        if crisis {
            look.page
        } else {
            ZStack {
                LinearGradient(
                    colors: look.scheme == .dark
                        ? [
                            Color(red: 0.165, green: 0.145, blue: 0.129),
                            Color(red: 0.118, green: 0.102, blue: 0.090),
                        ]
                        : [
                            Color(red: 0.976, green: 0.957, blue: 0.922),
                            Color(red: 0.937, green: 0.898, blue: 0.835),
                        ],
                    startPoint: .top, endPoint: .bottom)
                WallDots().fill(
                    look.scheme == .dark ? Color.white.opacity(0.07) : SurfaceColor.ink.opacity(0.09))
            }
        }
    }
}

struct TerrariumWidgetView: View {
    let entry: SurfaceEntry

    var body: some View {
        let snapshot = entry.snapshot
        SurfaceLookReader { look in
            Group {
                if snapshot.state == .crisis {
                    CalmLabel(snapshot: snapshot, look: look)
                } else {
                    TerrariumView(entry: entry, look: look)
                }
            }
            .widgetURL(snapshot.state == .crisis ? SurfaceLinks.home : SurfaceLinks.world)
            .containerBackground(for: .widget) {
                TerrariumBackground(crisis: snapshot.state == .crisis, look: look)
            }
        }
    }
}
