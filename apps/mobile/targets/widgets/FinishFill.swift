import SwiftUI

/// The material of the card the person wears, drawn from light as the app draws it, without the
/// tilt: a surface outside the app cannot read motion, so the shine stays where it is.
struct FinishFill: View {
    /// One of the seven finishes; anything else reads as paper.
    let finish: String
    var paper: Color = SurfaceColor.page

    var body: some View {
        switch finish {
        case "holo":
            ZStack {
                paper
                LinearGradient(
                    colors: [
                        Color(red: 1.0, green: 0.78, blue: 0.86), Color(red: 0.76, green: 0.86, blue: 1.0),
                        Color(red: 0.78, green: 0.97, blue: 0.88), Color(red: 1.0, green: 0.95, blue: 0.72),
                        Color(red: 0.86, green: 0.78, blue: 1.0),
                    ],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
                .opacity(0.9)
            }
        case "chrome":
            LinearGradient(
                stops: [
                    .init(color: Color(white: 0.93), location: 0),
                    .init(color: Color(white: 0.62), location: 0.32),
                    .init(color: Color(white: 0.97), location: 0.5),
                    .init(color: Color(white: 0.52), location: 0.72),
                    .init(color: Color(white: 0.88), location: 1),
                ],
                startPoint: .topLeading, endPoint: .bottomTrailing)
        case "jelly":
            LinearGradient(
                colors: [
                    Color(red: 1.0, green: 0.62, blue: 0.48), Color(red: 0.94, green: 0.34, blue: 0.18),
                ],
                startPoint: .top, endPoint: .bottom)
        case "glass":
            LinearGradient(
                colors: [
                    Color(red: 1.0, green: 0.80, blue: 0.70), Color(red: 0.96, green: 0.93, blue: 0.90),
                    Color(red: 0.72, green: 0.84, blue: 1.0),
                ],
                startPoint: .topLeading, endPoint: .bottomTrailing)
        case "flock":
            LinearGradient(
                colors: [
                    Color(red: 0.24, green: 0.42, blue: 0.34), Color(red: 0.12, green: 0.25, blue: 0.20),
                ],
                startPoint: .top, endPoint: .bottom)
        case "riso":
            ZStack {
                paper
                RisoDots().fill(SurfaceColor.accent.opacity(0.55))
            }
        default:
            paper
        }
    }
}

/// The riso finish's dot screen.
private struct RisoDots: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let step: CGFloat = 7
        var row = 0
        var y = rect.minY + step / 2
        while y < rect.maxY {
            var x = rect.minX + (row.isMultiple(of: 2) ? step / 2 : step)
            while x < rect.maxX {
                path.addEllipse(in: CGRect(x: x - 1.2, y: y - 1.2, width: 2.4, height: 2.4))
                x += step
            }
            y += step
            row += 1
        }
        return path
    }
}

extension FinishFill {
    /// Whether ink printed on this finish should be light.
    static func isDark(_ finish: String) -> Bool { finish == "flock" }
}
