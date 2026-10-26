import SwiftUI
import WidgetKit

/// The classroom's colours on the system surfaces.
enum SurfaceColor {
    /// The red pen: the clock, the bar and the mark of a running session.
    static let pen = Color(red: 0.827, green: 0.200, blue: 0.161)
    /// The red pen where the ground is dark: the Live Activity's glass and the Island's black.
    static let penOnDark = Color(red: 1.0, green: 0.420, blue: 0.369)
    static let paper = Color(red: 0.980, green: 0.965, blue: 0.937)
    static let paperDark = Color(red: 0.122, green: 0.106, blue: 0.094)
    static let ink = Color(red: 0.118, green: 0.106, blue: 0.090)
    /// The ground of the Live Activity on the Lock Screen.
    static let glass = Color(red: 0.180, green: 0.160, blue: 0.140)
    static let muted = Color(red: 0.435, green: 0.416, blue: 0.384)

    static func paper(_ scheme: ColorScheme) -> Color { scheme == .dark ? paperDark : paper }
    static func ink(_ scheme: ColorScheme) -> Color { scheme == .dark ? .white : ink }
    static func muted(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color.white.opacity(0.62) : muted
    }
}

/// Where a tap on a surface lands. Each is a route the app's router has.
enum SurfaceLinks {
    static var scheme: String {
        AppGroup.identifier == AppGroup.devIdentifier ? "phusclass-dev" : "phusclass"
    }

    static func url(_ path: String) -> URL {
        URL(string: "\(scheme):///\(path)") ?? URL(fileURLWithPath: "/")
    }

    static let home = url("")
    static let session = url("session")

    static func destination(for snapshot: SurfaceSnapshot, at date: Date) -> URL {
        snapshot.isRunning(at: date) ? session : home
    }
}

/// The mark a surface shows where the classroom's art will be drawn: a system symbol, so it
/// follows the widget's tint and the Lock Screen's vibrant mode by itself.
struct SurfaceMark: View {
    var symbol = "book.closed.fill"

    var body: some View {
        Image(systemName: symbol)
            .resizable()
            .scaledToFit()
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

/// The session's time as a bar that fills, drawn by the system from the two dates, so it needs
/// no update from the app.
struct SessionBar: View {
    let start: Date
    let end: Date
    var tint: Color = SurfaceColor.pen

    var body: some View {
        ProgressView(timerInterval: min(start, end)...end, countsDown: false) {
            EmptyView()
        } currentValueLabel: {
            EmptyView()
        }
        .progressViewStyle(.linear)
        .tint(tint)
    }
}

/// The session's time as a ring that fills, for the round surfaces.
struct SessionRing: View {
    let start: Date
    let end: Date
    var tint: Color = SurfaceColor.pen

    var body: some View {
        ProgressView(timerInterval: min(start, end)...end, countsDown: false) {
            EmptyView()
        } currentValueLabel: {
            EmptyView()
        }
        .progressViewStyle(.circular)
        .tint(tint)
    }
}
