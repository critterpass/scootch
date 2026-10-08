import SwiftUI
import UIKit
import WidgetKit

/// Scootch's colours on the system surfaces, from the design board.
enum SurfaceColor {
    static let tomato = Color(red: 0.941, green: 0.337, blue: 0.180)
    /// The ink the person wears in the app, read from what the app last wrote; tomato until it
    /// has written one. The drawings of Scootch are baked in tomato and stay so.
    static var accent: Color {
        SurfaceSnapshot.load().accent.flatMap(Color.init(hex:)) ?? tomato
    }
    /// The worn ink where the ground is dark: the Live Activity's glass and the Island's black. An
    /// ink made for paper (plum, midnight, moss) all but disappears there, so it is lifted toward
    /// white until it is as light as tomato is. Tomato and the lighter inks are left as they are.
    static var accentOnDark: Color {
        guard let hex = SurfaceSnapshot.load().accent, let ink = Color.parts(hex: hex) else {
            return tomato
        }
        let light = 0.2126 * ink.red + 0.7152 * ink.green + 0.0722 * ink.blue
        let wanted = 0.5
        guard light < 0.45 else { return Color(red: ink.red, green: ink.green, blue: ink.blue) }
        let lift = (wanted - light) / (1 - light)
        return Color(
            red: ink.red + (1 - ink.red) * lift, green: ink.green + (1 - ink.green) * lift,
            blue: ink.blue + (1 - ink.blue) * lift)
    }
    static let page = Color(red: 0.980, green: 0.965, blue: 0.937)
    static let pageDark = Color(red: 0.122, green: 0.106, blue: 0.094)
    static let ink = Color(red: 0.118, green: 0.106, blue: 0.090)
    static let glass = Color(red: 0.180, green: 0.160, blue: 0.140)

    /// The quiet second voice of a widget: "Lurking", a hint, a count's label.
    static let muted = Color(red: 0.435, green: 0.416, blue: 0.384)
    /// The floor the lurkers stand on and a calm day chip, with the line along the floor's edge.
    static let sand = Color(red: 0.929, green: 0.894, blue: 0.839)
    static let sandLine = Color(red: 0.878, green: 0.827, blue: 0.753)
    /// A day chip once a lurker has settled in.
    static let butter = Color(red: 1.0, green: 0.839, blue: 0.420)
    /// Tomato dark enough to read as small words on paper.
    static let tomatoDeep = Color(red: 0.776, green: 0.247, blue: 0.133)
    /// The nightstand's dim red, and the brighter red of the words on it.
    static let ember = Color(red: 0.910, green: 0.220, blue: 0.165)
    static let emberBright = Color(red: 1.0, green: 0.353, blue: 0.290)

    static func page(_ scheme: ColorScheme) -> Color { scheme == .dark ? pageDark : page }
    static func ink(_ scheme: ColorScheme) -> Color { scheme == .dark ? .white : ink }
    static func muted(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color.white.opacity(0.62) : muted
    }
    static func sand(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color.white.opacity(0.12) : sand
    }
    static func sandLine(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color.white.opacity(0.08) : sandLine
    }
}

/// The type of the surfaces, from the design board: rounded for what is said, the system's own
/// face for the quiet words, and a monospaced face for a count or a day. Each follows the text
/// size the person chose.
enum SurfaceFont {
    static func rounded(_ style: Font.TextStyle, _ weight: Font.Weight = .heavy) -> Font {
        .system(style, design: .rounded).weight(weight)
    }

    static func mono(_ style: Font.TextStyle) -> Font {
        .system(style, design: .monospaced).weight(.bold)
    }
}

extension Color {
    /// Red, green and blue, 0 to 1, from six hex digits, with or without the leading hash. Nil
    /// for anything else.
    static func parts(hex: String) -> (red: Double, green: Double, blue: Double)? {
        let digits = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        guard digits.count == 6, let value = UInt32(digits, radix: 16) else { return nil }
        return (
            Double((value >> 16) & 0xFF) / 255, Double((value >> 8) & 0xFF) / 255,
            Double(value & 0xFF) / 255
        )
    }

    /// A colour from six hex digits, with or without the leading hash. Nil for anything else.
    init?(hex: String) {
        guard let parts = Color.parts(hex: hex) else { return nil }
        self.init(red: parts.red, green: parts.green, blue: parts.blue)
    }
}

extension SurfaceSnapshot {
    /// A baked pose of Scootch at this attitude (ScootchArt.xcassets).
    func pose(_ pose: String) -> String { "Scootch\(pose)\(attitude.rawValue.capitalized)" }

    /// A picture the app drew into the App Group container.
    static func picture(named name: String?) -> UIImage? {
        guard let name, let folder = AppGroup.containerURL else { return nil }
        return UIImage(contentsOfFile: folder.appendingPathComponent(name).path)
    }

    /// The task's monster from the App Group container, when there is one to show.
    var monsterPicture: UIImage? {
        guard state == .taskSet || state == .inSession else { return nil }
        return Self.picture(named: monsterImage)
    }

    /// The world by day, or asleep. Never on a crisis day.
    func worldPicture(asleep: Bool) -> UIImage? {
        guard state != .crisis else { return nil }
        return Self.picture(named: asleep ? worldNightImage ?? worldImage : worldImage)
    }
}

extension SurfaceSnapshot.Lurker {
    var picture: UIImage? { SurfaceSnapshot.picture(named: image) }
}

extension SurfaceSnapshot.AtRest {
    var picture: UIImage? { SurfaceSnapshot.picture(named: image) }
}

/// Where a tap on a surface lands. Each is a route the app's router already has.
enum SurfaceLinks {
    static var scheme: String {
        AppGroup.identifier == AppGroup.devIdentifier ? "scootch-dev" : "scootch"
    }

    static func url(_ path: String) -> URL {
        URL(string: "\(scheme):///\(path)") ?? URL(fileURLWithPath: "/")
    }

    static let home = url("")
    static let session = url("session")
    static let world = url("world")
    /// The caught cards.
    static let cards = url("zoo")

    /// One caught card out of its pocket, where it is shared from. The surfaces know the thing
    /// a monster came from, not the card, so the card is asked for by its thing.
    static func card(ofTask taskId: String) -> URL {
        guard !taskId.isEmpty,
            let task = taskId.addingPercentEncoding(
                withAllowedCharacters: .alphanumerics.union(CharacterSet(charactersIn: "-_")))
        else { return cards }
        return url("binder/card?task=\(task)")
    }

    static func destination(for snapshot: SurfaceSnapshot, at date: Date) -> URL {
        if snapshot.isRunning(at: date) { return session }
        return snapshot.state == .done ? world : home
    }
}

/// One of the baked or drawn pictures, sized to fit, that follows the widget's appearance: full
/// colour by default and in Dark, desaturated in Clear and Tinted.
struct SurfaceArt: View {
    enum Source {
        case baked(String)
        case picture(UIImage)
    }

    let source: Source

    var body: some View {
        if #available(iOS 18.0, *) {
            image.widgetAccentedRenderingMode(.desaturated).scaledToFit()
        } else {
            image.scaledToFit()
        }
    }

    private var image: Image {
        switch source {
        case .baked(let name): return Image(name).resizable()
        case .picture(let picture): return Image(uiImage: picture).resizable()
        }
    }
}

/// The session's time as a ring that empties, drawn by the system from the two dates, so it
/// needs no update from the app. The dot in the middle is the designed disc at rest.
struct SessionDisc: View {
    let start: Date
    let end: Date
    var tint: Color = SurfaceColor.accent

    var body: some View {
        ZStack {
            ProgressView(timerInterval: min(start, end)...end, countsDown: true) {
                EmptyView()
            } currentValueLabel: {
                EmptyView()
            }
            .progressViewStyle(.circular)
            .tint(tint)
            Circle().fill(tint).padding(9)
        }
    }
}

/// The time left, counted down by the system.
struct SessionTimeLeft: View {
    let end: Date
    var from: Date = Date()

    var body: some View {
        Text(timerInterval: min(from, end)...end, countsDown: true)
            .monospacedDigit()
    }
}

extension View {
    /// From iOS 17 a widget declares its container background; earlier systems take a plain one.
    @ViewBuilder func surfaceBackground(_ color: Color) -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(color, for: .widget)
        } else {
            padding().background(color)
        }
    }
}
