import Foundation
import UserNotifications

/// "Hunt at 9:00", pressed on the nightstand: one notification at nine the next morning, in the
/// words the app wrote for it, and a note in the App Group so the nightstand can say it is set.
/// The app is told through the pending actions and keeps it in its own plan from then on.
struct MorningHunt: Codable, Equatable, Sendable {
    static let hour = 9
    static let notificationPrefix = "morning-hunt-"
    /// The category the notification's actions hang on (`targets/notification-content`).
    static let category = "scootch.hunt"

    let taskId: String
    /// When the notification goes off, in milliseconds since 1970.
    let at: Double

    /// The next nine o'clock after `date`.
    static func nextNine(after date: Date, calendar: Calendar = .current) -> Date? {
        calendar.nextDate(
            after: date, matching: DateComponents(hour: hour, minute: 0, second: 0),
            matchingPolicy: .nextTime)
    }

    static func load(from defaults: UserDefaults? = AppGroup.defaults) -> MorningHunt? {
        guard let json = defaults?.string(forKey: AppGroup.Key.morningHunt),
            let data = json.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(MorningHunt.self, from: data)
    }

    /// The one that is set for this thing and has not gone off yet at `date`.
    static func pending(for taskId: String, at date: Date, in defaults: UserDefaults? = AppGroup.defaults)
        -> MorningHunt?
    {
        guard let stored = load(from: defaults), stored.taskId == taskId,
            stored.at > date.timeIntervalSince1970 * 1000
        else { return nil }
        return stored
    }

    /// Sets nine o'clock for tomorrow's one thing. False when there is nothing carried on, no
    /// App Group, or the system would not take the notification.
    @discardableResult
    static func set(now: Date = Date(), in defaults: UserDefaults? = AppGroup.defaults) async -> Bool {
        let snapshot = SurfaceSnapshot.load(from: defaults).shown(at: now)
        guard let defaults, snapshot.state != .crisis, let thing = snapshot.tomorrow,
            let nine = nextNine(after: now)
        else { return false }

        let content = UNMutableNotificationContent()
        // A serious task is never named: the title stays Scootch's and the words are plain.
        content.title = thing.monsterName ?? "Scootch"
        content.body = thing.morning
        content.sound = .default
        content.categoryIdentifier = category
        content.userInfo = ["taskId": thing.taskId, "kind": "morning_hunt"]
        let trigger = UNCalendarNotificationTrigger(
            dateMatching: Calendar.current.dateComponents(
                [.year, .month, .day, .hour, .minute], from: nine),
            repeats: false)
        let request = UNNotificationRequest(
            identifier: notificationPrefix + thing.taskId, content: content, trigger: trigger)
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(
            withIdentifiers: [notificationPrefix + thing.taskId])
        guard (try? await center.add(request)) != nil else { return false }

        let record = MorningHunt(taskId: thing.taskId, at: nine.timeIntervalSince1970 * 1000)
        guard let data = try? JSONEncoder().encode(record),
            let json = String(data: data, encoding: .utf8)
        else { return false }
        defaults.set(json, forKey: AppGroup.Key.morningHunt)
        return true
    }
}
