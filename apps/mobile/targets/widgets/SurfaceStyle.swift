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
    /// The paper behind his face and the small widget's ground.
    static let cream = Color(red: 1.0, green: 0.945, blue: 0.863)
    static let creamDark = Color(red: 0.165, green: 0.141, blue: 0.122)
    /// The chalkboard, the window's light across it, and the chalk.
    static let board = Color(red: 0.184, green: 0.420, blue: 0.337)
    static let boardLight = Color(red: 0.208, green: 0.459, blue: 0.376)
    static let chalk = Color(red: 0.933, green: 0.965, blue: 0.941)
    static let chalkYellow = Color(red: 0.969, green: 0.843, blue: 0.455)
    /// The chalkboard's wooden frame, and the desk.
    static let wood = Color(red: 0.541, green: 0.353, blue: 0.212)
    static let desk = Color(red: 0.851, green: 0.635, blue: 0.424)
    static let deskEdge = Color(red: 0.914, green: 0.706, blue: 0.486)
    /// Start: the red of the drum.
    static let start = LinearGradient(
        colors: [Color(red: 0.886, green: 0.271, blue: 0.243), Color(red: 0.788, green: 0.141, blue: 0.118)],
        startPoint: .top, endPoint: .bottom)
    /// The classroom at night, its floor and its desk's top.
    static let night = Color(red: 0.047, green: 0.090, blue: 0.078)
    static let nightBoard = Color(red: 0.118, green: 0.267, blue: 0.220)
    static let nightFrame = Color(red: 0.290, green: 0.204, blue: 0.125)
    static let nightDesk = Color(red: 0.231, green: 0.165, blue: 0.110)
    static let nightDeskTop = Color(red: 0.353, green: 0.251, blue: 0.161)
    static let lamp = Color(red: 1.0, green: 0.788, blue: 0.471)
    /// The quiet hours' ground on the small widget.
    static let quiet = Color(red: 0.110, green: 0.169, blue: 0.290)
    static let quietInk = Color(red: 0.788, green: 0.839, blue: 0.949)
    /// The timetable's paper, its next free period's tint and its ink.
    static let sheet = Color(red: 1.0, green: 0.992, blue: 0.973)
    static let freeTint = Color(red: 0.992, green: 0.925, blue: 0.918)
    static let freeInk = Color(red: 0.788, green: 0.141, blue: 0.118)
    static let freeMuted = Color(red: 0.659, green: 0.337, blue: 0.310)

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
    static let board = url("board")
    static let timetable = url("timetable")
    static let tuition = url("tuition")

    static func destination(for snapshot: SurfaceSnapshot, at date: Date) -> URL {
        snapshot.isRunning(at: date) ? session : home
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
