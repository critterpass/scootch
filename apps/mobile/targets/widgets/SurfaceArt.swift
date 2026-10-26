import SwiftUI
import WidgetKit

/// The moods his baked pictures come in (SurfaceArt.xcassets, made by packages/art's
/// `bake-surfaces.ts`). The first six are the pressure ladder, step 0 to 5.
enum PhuMood: String, CaseIterable, Sendable {
    case calm, over, crossed, ruler, name, stare
    case grading, watch, sleep, serious, approve

    /// The ladder, as `pressureMood` in packages/art orders it.
    static let ladder: [PhuMood] = [.calm, .over, .crossed, .ruler, .name, .stare]

    static func pressure(_ step: Int) -> PhuMood {
        ladder[min(ladder.count - 1, max(0, step))]
    }

    /// His two frames while he paces in a period, turned by the activity's line turns.
    static func pacing(at date: Date) -> PhuMood {
        Int(date.timeIntervalSince1970 / 180).isMultiple(of: 2) ? .grading : .watch
    }

    private var assetName: String { rawValue.prefix(1).uppercased() + rawValue.dropFirst() }

    /// His head and shoulders, on a clear ground.
    var face: Image { Image("PhuFace" + assetName) }
    /// All of him, feet at the bottom edge, on a clear ground.
    var figure: Image { Image("PhuFigure" + assetName) }

    /// The ground behind his face, warmer as the pressure rises (the Poses board's tiles).
    var ground: Color {
        switch self {
        case .calm, .grading, .watch, .approve: return SurfaceColor.cream
        case .over: return Color(red: 1.0, green: 0.922, blue: 0.824)
        case .crossed: return Color(red: 1.0, green: 0.886, blue: 0.776)
        case .ruler: return Color(red: 1.0, green: 0.843, blue: 0.745)
        case .name: return Color(red: 1.0, green: 0.788, blue: 0.714)
        case .stare: return Color(red: 0.910, green: 0.902, blue: 0.933)
        case .sleep: return Color(red: 0.902, green: 0.914, blue: 0.949)
        case .serious: return Color(red: 0.933, green: 0.925, blue: 0.910)
        }
    }
}

/// His face in a round of its ground, as the Lock Screen and the Island draw him.
struct PhuFace: View {
    let mood: PhuMood
    var side: CGFloat = 38
    var ground: Bool = true

    var body: some View {
        ZStack {
            if ground { Circle().fill(mood.ground) }
            mood.face
                .resizable()
                .scaledToFill()
                .frame(width: side * 1.18, height: side * 1.18)
                .offset(y: side * 0.06)
        }
        .frame(width: side, height: side)
        .clipShape(Circle())
        .accessibilityHidden(true)
    }
}

/// The fuse as a ring the system burns down from the two dates, needing no update from the app.
/// Once burnt, or with no fuse, the ring is a faint track.
struct FuseRing: View {
    let start: Date?
    let end: Date?
    let now: Date
    var tint: Color = SurfaceColor.chalkYellow
    var lineWidth: CGFloat = 3

    var body: some View {
        if let start, let end, now < end {
            ProgressView(timerInterval: min(start, end)...end, countsDown: true) {
                EmptyView()
            } currentValueLabel: {
                EmptyView()
            }
            .progressViewStyle(.circular)
            .tint(tint)
        } else {
            Circle().stroke(tint.opacity(0.25), lineWidth: lineWidth)
        }
    }
}

/// The fuse as a line along the chalkboard's ledge, burning down from the two dates.
struct FuseLine: View {
    let start: Date?
    let end: Date?
    let now: Date
    var tint: Color = SurfaceColor.chalkYellow

    var body: some View {
        if let start, let end, now < end {
            ProgressView(timerInterval: min(start, end)...end, countsDown: true) {
                EmptyView()
            } currentValueLabel: {
                EmptyView()
            }
            .progressViewStyle(.linear)
            .tint(tint)
        } else {
            Capsule().fill(tint.opacity(0.18)).frame(height: 4)
        }
    }
}

/// The classroom's chalkboard: green, with the lighter slant of the window's light across it.
struct ChalkboardGround: View {
    var corner: CGFloat = 16

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .topLeading) {
                SurfaceColor.board
                Rectangle()
                    .fill(SurfaceColor.boardLight)
                    .frame(width: proxy.size.width * 0.3)
                    .transformEffect(CGAffineTransform(a: 1, b: 0, c: -0.25, d: 1, tx: 0, ty: 0))
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
    }
}

/// A tuition widget's quiet lock: the glyph and one plain label, never a sales line.
struct QuietLock: View {
    let snapshot: SurfaceSnapshot
    var tint: Color = SurfaceColor.muted

    var body: some View {
        VStack(spacing: 8) {
            Image("GlyphLock")
                .renderingMode(.template)
                .resizable()
                .scaledToFit()
                .frame(width: 20, height: 20)
            Text(snapshot.text("With tuition"))
                .font(.system(.footnote, design: .rounded).weight(.semibold))
                .multilineTextAlignment(.center)
        }
        .foregroundStyle(tint)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .widgetURL(SurfaceLinks.tuition)
    }
}
