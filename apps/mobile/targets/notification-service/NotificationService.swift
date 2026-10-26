import UIKit
import UserNotifications

/// A note home from the server arrives with his figure at the pressure it names. The push sends
/// `"mutable-content": 1` and the step under `phu-pressure` (0 to 5); a push for a serious or
/// crisis task leaves it out, since pressure stops for care. Everything else is delivered exactly
/// as it arrived.
final class NotificationService: UNNotificationServiceExtension {
    static let pressureKey = "phu-pressure"
    private static let ladder = ["Calm", "Over", "Crossed", "Ruler", "Name", "Stare"]

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        guard let step = Self.pressure(in: request.content.userInfo),
            request.content.attachments.isEmpty,
            let content = request.content.mutableCopy() as? UNMutableNotificationContent,
            let picture = Self.picture(pressure: step)
        else {
            contentHandler(request.content)
            return
        }
        content.attachments = [picture]
        contentHandler(content)
    }

    /// The step as JSON sends it: a number, or a number in a string.
    static func pressure(in userInfo: [AnyHashable: Any]) -> Int? {
        if let number = userInfo[pressureKey] as? NSNumber { return number.intValue }
        if let text = userInfo[pressureKey] as? String { return Int(text) }
        return nil
    }

    /// His figure from this extension's own pictures (NoteArt.xcassets, baked by packages/art),
    /// written to a file the notification can carry.
    static func picture(pressure: Int) -> UNNotificationAttachment? {
        let name = "PhuFigure" + ladder[min(ladder.count - 1, max(0, pressure))]
        guard let image = UIImage(named: name), let data = image.pngData() else { return nil }
        let file = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString + "-" + name + ".png")
        guard (try? data.write(to: file)) != nil else { return nil }
        return try? UNNotificationAttachment(identifier: "phu", url: file)
    }
}
