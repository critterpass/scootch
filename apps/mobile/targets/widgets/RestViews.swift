import SwiftUI
import WidgetKit

/// Scootch asleep beside the world's newest piece, on a small island of their own that stands at
/// the foot of a widget with its sand running off the edge. Where nothing lives in the world
/// yet, or the phone could not draw the picture, it is Scootch asleep on the sand alone. The sleep
/// marks are drawn here, in the widget's own ink, so they read on a dark page as on a light one.
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
    /// On an island of one piece the app draws Scootch's own 200-unit drawing at 0.51 (a resident's
    /// 0.34, half as big again), its feet line (172 down) on the island's 160: so its corner
    /// stands here.
    private static let scootchScale: CGFloat = 0.51
    private static let scootchCorner = CGPoint(x: 100 - 100 * 0.51, y: 160 - 172 * 0.51)

    var body: some View {
        let unit = side / Self.space
        ZStack {
            if let picture = rest.picture {
                // The app paints the picture without the marks; it always draws him cheeky.
                SurfaceArt(source: .picture(picture))
                SleepMarks(count: SleepMarks.count(.cheeky), ink: look.ink, scale: Self.scootchScale * unit,
                    corner: Self.scaled(Self.scootchCorner, unit))
            } else {
                alone(unit)
            }
        }
        .frame(width: side, height: side)
        .position(x: middle, y: height - Self.cut * unit + side / 2)
        .accessibilityHidden(true)
    }

    private static func scaled(_ point: CGPoint, _ unit: CGFloat) -> CGPoint {
        CGPoint(x: point.x * unit, y: point.y * unit)
    }

    /// The same island with nobody else on it: the sand, and the baked drawing of Scootch asleep
    /// at the size and place the app would have drawn him. The baked drawing carries its marks in
    /// dark ink; the widget's own are drawn over them, exactly where they lie.
    private func alone(_ unit: CGFloat) -> some View {
        let drawn = Self.space * Self.scootchScale
        let corner = Self.scootchCorner
        return ZStack {
            Ellipse()
                .fill(look.sand)
                .frame(width: 162 * unit, height: 58 * unit)
                .position(x: 100 * unit, y: 158 * unit)
            SurfaceArt(source: .baked(snapshot.pose("Asleep")))
                .frame(width: drawn * unit, height: drawn * unit)
                .position(x: (corner.x + drawn / 2) * unit, y: (corner.y + drawn / 2) * unit)
            SleepMarks(count: SleepMarks.count(snapshot.attitude), ink: look.ink,
                scale: Self.scootchScale * unit, corner: Self.scaled(corner, unit))
        }
    }
}

/// The Z's that drift up from Scootch asleep, as the app's art draws them in their still frame
/// (packages/art, the `zzz` effect): in his own 200-unit drawing, each Z larger, further up and to
/// the right and, the last of three, fainter than the one before.
private struct SleepMarks: View {
    let count: Int
    let ink: Color
    /// From Scootch's 200 units to the points of the view, and where his drawing's corner stands.
    let scale: CGFloat
    let corner: CGPoint

    /// Soft acts smaller and sleeps with two; the others with three.
    static func count(_ attitude: SurfaceSnapshot.Attitude) -> Int { attitude == .soft ? 2 : 3 }

    var body: some View {
        ZStack {
            ForEach(0..<count, id: \.self) { index in
                let along = CGFloat(index) / CGFloat(count)
                Mark(along: along, scale: scale, corner: corner)
                    .stroke(ink, style: StrokeStyle(lineWidth: 2.4 * scale, lineCap: .round, lineJoin: .round))
                    .opacity(min(1, (1 - along) * 2))
            }
        }
    }

    /// One Z: three strokes whose two corners are rounded through the middle of the diagonal.
    private struct Mark: Shape {
        let along: CGFloat
        let scale: CGFloat
        let corner: CGPoint

        func path(in _: CGRect) -> Path {
            let half = 3 + along * 5
            let x = 146 + along * 22
            let y = 76 - along * 34
            let at = { (dx: CGFloat, dy: CGFloat) in
                CGPoint(x: corner.x + (x + dx) * scale, y: corner.y + (y + dy) * scale)
            }
            let start = at(-half, -half), topRight = at(half, -half)
            let bottomLeft = at(-half, half), end = at(half, half)
            let middle = { (a: CGPoint, b: CGPoint) in CGPoint(x: (a.x + b.x) / 2, y: (a.y + b.y) / 2) }
            var path = Path()
            path.move(to: start)
            path.addQuadCurve(to: middle(topRight, bottomLeft), control: topRight)
            path.addQuadCurve(to: middle(bottomLeft, end), control: bottomLeft)
            path.addLine(to: end)
            return path
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
