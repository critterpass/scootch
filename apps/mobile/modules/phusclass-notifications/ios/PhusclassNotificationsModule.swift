import ExpoModulesCore
import Intents
import UIKit
import UserNotifications

struct LocalNotification: Record {
  @Field var id: String = ""
  /// Milliseconds since 1970.
  @Field var at: Double = 0
  /// Shown above the body when the notification has no sender.
  @Field var title: String?
  @Field var body: String = ""
  @Field var senderName: String?
  /// The sender's picture: a file name in the App Group container.
  @Field var senderImage: String?
  @Field var taskId: String?
  /// A picture that arrives with it, as a file address.
  @Field var attachment: String?
}

/// The JavaScript side of the local notifications (modules/phusclass-notifications/index.ts).
public class PhusclassNotificationsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PhusclassNotifications")

    AsyncFunction("schedule") { (notification: LocalNotification) async throws in
      try await LocalNotifications.schedule(notification)
    }
  }
}

/// A local notification, which arrives as a message when it has a sender: the sender's name
/// where the app's name would be, their picture as the face, and the app's icon as the badge on
/// it. The system draws a notification that way when it is told the message has a sender.
enum LocalNotifications {
  static func schedule(_ notification: LocalNotification) async throws {
    let content = UNMutableNotificationContent()
    if let title = notification.title, !title.isEmpty { content.title = title }
    content.body = notification.body
    content.sound = .default
    if let taskId = notification.taskId {
      content.userInfo = ["taskId": taskId]
      content.threadIdentifier = taskId
    }
    // The system moves the file into its own store, so it is given a copy to keep.
    if let address = notification.attachment, let url = URL(string: address), url.isFileURL {
      let copy = FileManager.default.temporaryDirectory
        .appendingPathComponent(UUID().uuidString + "-" + url.lastPathComponent)
      if (try? FileManager.default.copyItem(at: url, to: copy)) != nil,
        let picture = try? UNNotificationAttachment(identifier: "picture", url: copy)
      {
        content.attachments = [picture]
      }
    }

    let seconds = max(1, notification.at / 1000 - Date().timeIntervalSince1970)
    let request = UNNotificationRequest(
      identifier: notification.id,
      content: await from(notification, content),
      trigger: UNTimeIntervalNotificationTrigger(timeInterval: seconds, repeats: false))
    try await UNUserNotificationCenter.current().add(request)
  }

  /// The content as a message from the sender. Where the system will not take it as one, the
  /// sender's name is the title and the notification is otherwise the same.
  private static func from(
    _ notification: LocalNotification, _ content: UNMutableNotificationContent
  ) async -> UNNotificationContent {
    guard let name = notification.senderName, !name.isEmpty else { return content }
    let image = face(named: notification.senderImage)
    let sender = INPerson(
      personHandle: INPersonHandle(value: name, type: .unknown),
      nameComponents: nil, displayName: name, image: image, contactIdentifier: nil,
      customIdentifier: name)
    let intent = INSendMessageIntent(
      recipients: nil, outgoingMessageType: .outgoingMessageText, content: notification.body,
      speakableGroupName: nil, conversationIdentifier: notification.taskId ?? name,
      serviceName: nil, sender: sender, attachments: nil)
    if let image { intent.setImage(image, forParameterNamed: \.sender) }
    let interaction = INInteraction(intent: intent, response: nil)
    interaction.direction = .incoming
    try? await interaction.donate()
    if let updated = try? content.updating(from: intent) { return updated }
    content.title = name
    return content
  }

  /// The sender's picture on a round of paper, for a drawing with no ground behind it.
  private static func face(named name: String?) -> INImage? {
    guard let name, let folder = AppGroup.containerURL,
      let picture = UIImage(contentsOfFile: folder.appendingPathComponent(name).path)
    else { return nil }
    let side: CGFloat = 192
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    let drawn = UIGraphicsImageRenderer(size: CGSize(width: side, height: side), format: format)
      .image { context in
        UIColor(red: 0.980, green: 0.965, blue: 0.937, alpha: 1).setFill()
        context.fill(CGRect(x: 0, y: 0, width: side, height: side))
        picture.draw(in: CGRect(x: side * 0.04, y: side * 0.04, width: side * 0.92, height: side * 0.92))
      }
    return drawn.pngData().map { INImage(imageData: $0) }
  }
}
