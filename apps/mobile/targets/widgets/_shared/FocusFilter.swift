import AppIntents
import UserNotifications

/// Scootch's Focus filter, set in iOS Settings under a Focus. With its switch on, the moment that
/// Focus starts the monster that has waited longest sends one message offering a hunt, in the
/// words written with its task. The system also runs this when the Focus ends, with the switch
/// reading off, and then nothing is sent.
struct HuntFocusFilter: SetFocusFilterIntent {
    static let title: LocalizedStringResource = "Offer a hunt"
    static let description: IntentDescription? = IntentDescription(
        "When this Focus starts, the monster that has waited longest offers ten minutes.")

    @Parameter(title: "Offer a hunt when this Focus starts", default: false)
    var offersHunt: Bool

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(
            title: "Scootch",
            subtitle: offersHunt ? "Offers a hunt when this Focus starts" : "Stays as it is")
    }

    func perform() async throws -> some IntentResult {
        guard offersHunt else { return .result() }
        let snapshot = SurfaceSnapshot.load().shown(at: Date())
        // Nothing on a crisis day, nothing while a hunt is on, and nothing with nobody waiting.
        guard snapshot.state != .crisis, !snapshot.isRunning(at: Date()),
            !HuntActivity.isLive(HuntStore.load()), let oldest = snapshot.oldestLurker,
            let words = oldest.lines.start ?? oldest.lines.working.first
        else { return .result() }

        let content = UNMutableNotificationContent()
        content.title = oldest.name
        content.body = words
        content.categoryIdentifier = MorningHunt.category
        content.threadIdentifier = oldest.taskId
        content.userInfo = ["taskId": oldest.taskId]
        try? await UNUserNotificationCenter.current().add(
            UNNotificationRequest(
                identifier: "focus-offer-" + oldest.taskId, content: content, trigger: nil))
        return .result()
    }
}
