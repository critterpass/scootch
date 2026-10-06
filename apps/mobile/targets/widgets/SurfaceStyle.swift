import SwiftUI
import UIKit
import WidgetKit

/// Scootch's colours on the system surfaces, from the design board.
enum SurfaceColor {
    static let accent = Color(red: 0.941, green: 0.337, blue: 0.180)
    static let page = Color(red: 0.980, green: 0.965, blue: 0.937)
    static let pageDark = Color(red: 0.122, green: 0.106, blue: 0.094)
    static let ink = Color(red: 0.118, green: 0.106, blue: 0.090)
    static let glass = Color(red: 0.180, green: 0.160, blue: 0.140)

    static func page(_ scheme: ColorScheme) -> Color { scheme == .dark ? pageDark : page }
    static func ink(_ scheme: ColorScheme) -> Color { scheme == .dark ? .white : ink }
}

/// Fixed labels, in the language the person chose in the app (the snapshot's), not the phone's.
/// The key is the English text, so a missing table still reads as English.
enum SurfaceText {
    static func string(_ key: String, language: String) -> String {
        let code = language == "vi" ? "vi" : "en"
        guard let path = Bundle.main.path(forResource: code, ofType: "lproj"),
            let bundle = Bundle(path: path)
        else { return key }
        return bundle.localizedString(forKey: key, value: key, table: nil)
    }
}

extension SurfaceSnapshot {
    func text(_ key: String) -> String { SurfaceText.string(key, language: language) }

    /// A baked pose of Scootch at this attitude (ScootchArt.xcassets).
    func pose(_ pose: String) -> String { "Scootch\(pose)\(attitude.rawValue.capitalized)" }

    /// The task's monster from the App Group container, when there is one to show.
    var monsterPicture: UIImage? {
        guard state == .taskSet || state == .inSession, let monsterImage,
            let folder = AppGroup.containerURL
        else { return nil }
        return UIImage(contentsOfFile: folder.appendingPathComponent(monsterImage).path)
    }
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
