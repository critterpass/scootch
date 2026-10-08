import SwiftUI
import WidgetKit

/// Scootch asleep beside the world's newest piece, on a small island of their own that stands at
/// the foot of a widget with its sand running off the edge. Where nothing lives in the world
/// yet, or the phone could not draw the picture, it is Scootch asleep on the sand alone.
private struct RestScene: View {
    let rest: SurfaceSnapshot.AtRest
    let snapshot: SurfaceSnapshot
    let look: SurfaceLook
    /// The side of the square the island is drawn in, and where its middle stands in the widget.
    let side: CGFloat
    let middle: CGFloat
    let height: CGFloat

    /// The app draws the island in a square 200 units a side, Scootch in the middle of it with
    /// his feet 160 units down (island-layout.ts). The widget's edge cuts the sand just below.
    private static let space: CGFloat = 200
    private static let cut: CGFloat = 163

    var body: some View {
        let unit = side / Self.space
        Group {
            if let picture = rest.picture {
                SurfaceArt(source: .picture(picture))
            } else {
                alone(unit)
            }
        }
        .frame(width: side, height: side)
        .position(x: middle, y: height - Self.cut * unit + side / 2)
        .accessibilityHidden(true)
    }

    /// The same island with nobody else on it: the sand, and the baked drawing of Scootch asleep
    /// at the size and place the app would have drawn him.
    private func alone(_ unit: CGFloat) -> some View {
        ZStack {
            Ellipse()
                .fill(look.sand)
                .frame(width: 162 * unit, height: 58 * unit)
                .position(x: 100 * unit, y: 158 * unit)
            SurfaceArt(source: .baked(snapshot.pose("Asleep")))
                .frame(width: 102 * unit, height: 102 * unit)
                .position(x: 100 * unit, y: 123 * unit)
        }
    }
}

/// The small widget on a day with nothing waiting: the one line, and Scootch asleep at the foot.
/// The whole widget opens the world.
struct RestSmallView: View {
    let entry: SurfaceEntry
    let rest: SurfaceSnapshot.AtRest
    let look: SurfaceLook

    var body: some View {
        GeometryReader { box in
            // The board draws this widget 158 points a side.
            let unit = min(box.size.width, box.size.height) / 158
            ZStack(alignment: .topLeading) {
                RestScene(
                    rest: rest, snapshot: entry.snapshot, look: look, side: 168 * unit,
                    middle: box.size.width / 2, height: box.size.height)
                Text(rest.line)
                    .font(SurfaceFont.rounded(.subheadline))
                    .foregroundStyle(look.ink)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                    // The line is one line on the board: it may run closer to the far edge.
                    .padding(.leading, 14 * unit)
                    .padding(.trailing, 8 * unit)
                    .padding(.top, 13 * unit)
            }
        }
    }
}

/// The medium widget on a day with nothing waiting: the line, what joined the world last under
/// it, and Scootch asleep at the foot of the far side. The whole widget opens the world.
struct RestMediumView: View {
    let entry: SurfaceEntry
    let rest: SurfaceSnapshot.AtRest
    let look: SurfaceLook

    var body: some View {
        GeometryReader { box in
            // The board draws this widget 158 points tall.
            let unit = box.size.height / 158
            ZStack(alignment: .topLeading) {
                RestScene(
                    rest: rest, snapshot: entry.snapshot, look: look, side: 215 * unit,
                    middle: box.size.width - 99 * unit, height: box.size.height)
                VStack(alignment: .leading, spacing: 1) {
                    Text(rest.line)
                    if let joined = rest.joined {
                        Text(joined)
                    }
                }
                .font(SurfaceFont.rounded(.callout))
                .foregroundStyle(look.ink)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
                .padding(.horizontal, 16 * unit)
                .padding(.top, 15 * unit)
                .accessibilityElement(children: .combine)
            }
        }
    }
}
