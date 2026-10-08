import AppIntents
import UIKit
import UniformTypeIdentifiers

/// The wallpaper, drawn from the pictures the app left in the App Group. It is the same three
/// drawings the app's wallpaper page saves (src/features/look/wallpaper-scene.tsx): change both
/// together. An app cannot set the wallpaper; this hands the picture to Shortcuts, which can.
enum Wallpaper {
    /// A Lock Screen's pixels on the largest phone; iOS crops it for the others.
    static let size = CGSize(width: 1290, height: 2796)

    private static func picture(named name: String?) -> UIImage? {
        guard let name, let folder = AppGroup.containerURL else { return nil }
        return UIImage(contentsOfFile: folder.appendingPathComponent(name).path)
    }

    private static func colour(_ hex: UInt32, alpha: CGFloat = 1) -> CGColor {
        UIColor(
            red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255, alpha: alpha
        ).cgColor
    }

    private static func gradient(_ top: UInt32, _ bottom: UInt32) -> CGGradient? {
        CGGradient(
            colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: [colour(top), colour(bottom)] as CFArray,
            locations: [0, 1])
    }

    /// The wallpaper the snapshot asks for. On a crisis day it is the plain ground alone.
    static func image(for snapshot: SurfaceSnapshot) -> UIImage {
        let kind = snapshot.wallpaper ?? "world"
        let calm = snapshot.state == .crisis
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let (width, height) = (size.width, size.height)
        return UIGraphicsImageRenderer(size: size, format: format).image { renderer in
            let context = renderer.cgContext
            let down = { (top: UInt32, bottom: UInt32) in
                guard let fill = gradient(top, bottom) else { return }
                context.drawLinearGradient(
                    fill, start: .zero, end: CGPoint(x: 0, y: height), options: [])
            }
            // The island is a little wider than the screen and its near edge runs off the bottom.
            let island = {
                guard !calm, let world = picture(named: snapshot.worldNightImage ?? snapshot.worldImage)
                else { return }
                let side = width * 1.12
                world.draw(
                    in: CGRect(x: (width - side) / 2, y: height - side * 0.93, width: side, height: side))
            }
            switch kind {
            case "perched":
                down(0xF6C9B4, 0xF0A98A)
                if !calm, let scootch = picture(named: snapshot.scootchImage) {
                    let box = width * 1.22
                    scootch.draw(
                        in: CGRect(x: (width - box) / 2, y: height * 0.146, width: box, height: box))
                }
            case "night":
                if let glow = gradient(0x2B2420, 0x0E0C0A) {
                    context.setFillColor(colour(0x0E0C0A))
                    context.fill(CGRect(origin: .zero, size: size))
                    context.drawRadialGradient(
                        glow, startCenter: CGPoint(x: width / 2, y: height), startRadius: 0,
                        endCenter: CGPoint(x: width / 2, y: height), endRadius: height * 0.7,
                        options: [])
                }
                // A sparse grid of faint stars over the top of the sky.
                context.setFillColor(colour(0xFFFFFF, alpha: 0.28))
                let (stepX, stepY, dot) = (width * 0.117, width * 0.148, width * 0.005)
                var y = stepY / 2
                while y < height * 0.72 {
                    var x = stepX / 2
                    while x < width {
                        context.fillEllipse(in: CGRect(x: x - dot, y: y - dot, width: dot * 2, height: dot * 2))
                        x += stepX
                    }
                    y += stepY
                }
                island()
                context.setFillColor(colour(0x080605, alpha: 0.22))
                context.fill(CGRect(origin: .zero, size: size))
            default:
                down(0xF0E7D8, 0xDFCFB6)
                island()
            }
        }
    }
}

/// "Today's Scootch wallpaper", for a Shortcuts automation: the picture, to hand to "Set
/// Wallpaper Photo". It opens nothing and changes nothing.
struct TodaysWallpaperIntent: AppIntent {
    static let title: LocalizedStringResource = "Today's Scootch wallpaper"
    static let description = IntentDescription(
        "Draws your world as a Lock Screen wallpaper, as it is today.")
    static let openAppWhenRun = false

    func perform() async throws -> some IntentResult & ReturnsValue<IntentFile> {
        let snapshot = SurfaceSnapshot.load().shown(at: Date())
        let data = Wallpaper.image(for: snapshot).pngData() ?? Data()
        return .result(value: IntentFile(data: data, filename: "scootch-wallpaper.png", type: .png))
    }
}
