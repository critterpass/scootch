import ExpoModulesCore
import Intents
import UIKit
import UserNotifications

struct MonsterNotification: Record {
  @Field var id: String = ""
  /// Milliseconds since 1970.
  @Field var at: Double = 0
  @Field var body: String = ""
  @Field var senderName: String?
  /// The sender's picture: a file name in the App Group container.
  @Field var senderImage: String?
  @Field var taskId: String?
  @Field var actions: Bool = false
}

struct ActionLabels: Record {
  @Field var hunt: String = ""
  @Field var tomorrow: String = ""
  @Field var turnDown: String = ""
}

/// The JavaScript side of the monsters' notifications (modules/scootch-notifications/index.ts).
public class ScootchNotificationsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ScootchNotifications")

    AsyncFunction("schedule") { (notification: MonsterNotification) async throws in
      try await MonsterNotifications.schedule(notification)
    }

    AsyncFunction("setActionLabels") { (labels: ActionLabels) async in
      await MonsterNotifications.setCategory(labels)
    }

    AsyncFunction("setMorningHunt") { () async -> Bool in
      await MorningHunt.set()
    }
  }
}

/// A local notification that arrives as a message from a monster: its name where the app's name
/// would be, its picture as the face, and Scootch's icon as the badge on it. The system draws a
/// notification that way when it is told the message has a sender.
enum MonsterNotifications {
  enum Action {
    static let hunt = "scootch.hunt.now"
    static let tomorrow = "scootch.hunt.tomorrow"
    static let turnDown = "scootch.hunt.turn-down"
  }

  /// The three actions under a monster's notification. Hunting opens Scootch on the session; the
  /// other two are done without it. The categories other code registered are kept.
  static func setCategory(_ labels: ActionLabels) async {
    let center = UNUserNotificationCenter.current()
    let category = UNNotificationCategory(
      identifier: MorningHunt.category,
      actions: [
        UNNotificationAction(identifier: Action.hunt, title: labels.hunt, options: [.foreground]),
        UNNotificationAction(identifier: Action.tomorrow, title: labels.tomorrow, options: []),
        UNNotificationAction(identifier: Action.turnDown, title: labels.turnDown, options: []),
      ],
      intentIdentifiers: [], options: [])
    let others = await center.notificationCategories().filter {
      $0.identifier != MorningHunt.category
    }
    center.setNotificationCategories(others.union([category]))
  }

  static func schedule(_ notification: MonsterNotification) async throws {
    let content = UNMutableNotificationContent()
    content.body = notification.body
    content.sound = .default
    if let taskId = notification.taskId {
      content.userInfo = ["taskId": taskId]
      content.threadIdentifier = taskId
    }
    if notification.actions { content.categoryIdentifier = MorningHunt.category }

    let seconds = max(1, notification.at / 1000 - Date().timeIntervalSince1970)
    let request = UNNotificationRequest(
      identifier: notification.id,
      content: await from(notification, content),
      trigger: UNTimeIntervalNotificationTrigger(timeInterval: seconds, repeats: false))
    try await UNUserNotificationCenter.current().add(request)
  }

  /// The content as a message from the sender. Where the system will not take it as one, the
  /// monster's name is the title and the notification is otherwise the same.
  private static func from(
    _ notification: MonsterNotification, _ content: UNMutableNotificationContent
  ) async -> UNNotificationContent {
    guard let name = notification.senderName, !name.isEmpty else { return content }
    let image = face(named: notification.senderImage)
    let sender = INPerson(
      personHandle: INPersonHandle(value: notification.taskId ?? name, type: .unknown),
      nameComponents: nil, displayName: name, image: image, contactIdentifier: nil,
      customIdentifier: notification.taskId)
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

  /// The monster's picture on a round of paper: its own drawing has no ground behind it.
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
        // The monster stands low in its picture; lifted a little, its face is in the middle.
        picture.draw(in: CGRect(x: side * 0.04, y: -side * 0.02, width: side * 0.92, height: side * 0.92))
      }
    return drawn.pngData().map { INImage(imageData: $0) }
  }
}
