import AppIntents

/// Opens the app. Compiled into the app and the widget extension: the system runs an intent that
/// opens its app in the app's own process.
struct OpenScootchIntent: AppIntent {
    static let title: LocalizedStringResource = "Open Scootch"
    static let description = IntentDescription("Opens Scootch.")
    static let openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        .result()
    }
}
