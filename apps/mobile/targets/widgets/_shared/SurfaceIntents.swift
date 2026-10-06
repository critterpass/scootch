import AppIntents

// The intents behind the control, the Action button and the Live Activity's buttons. They are
// compiled into the app and the widget extension. None of them changes the day itself: each one
// records what was asked for in the App Group, and the app acts on it when it next comes to the
// front (features/surfaces/pending-actions.ts).

/// Starts a ten-minute session on today's one thing. Opens the app, which starts the session, or
/// shows the composer when there is no task yet.
struct StartSessionIntent: AppIntent {
    static let title: LocalizedStringResource = "Start 10 min"
    static let description = IntentDescription("Starts ten minutes on today's one thing.")
    static let openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        PendingSurfaceActions.record(.startSession)
        return .result()
    }
}

/// Opens the app on the composer, listening.
struct BrainDumpIntent: AppIntent {
    static let title: LocalizedStringResource = "Brain dump"
    static let description = IntentDescription("Opens Scootch ready to listen.")
    static let openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        PendingSurfaceActions.record(.brainDump)
        return .result()
    }
}

/// "Park a thought" on the Live Activity. It runs without unlocking and does not open the app:
/// the request waits until Scootch is next opened, where the thought's words are typed.
@available(iOS 17.0, *)
struct ParkThoughtIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Park a thought"
    static let description = IntentDescription("Asks Scootch to hold a thought for after the session.")
    static let openAppWhenRun = false
    static let isDiscoverable = false

    func perform() async throws -> some IntentResult {
        PendingSurfaceActions.record(.parkThought)
        return .result()
    }
}

/// "I'm stuck" on the Live Activity. It runs without unlocking and does not open the app: the
/// tiny next step is offered when Scootch is next opened.
@available(iOS 17.0, *)
struct StuckIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "I'm stuck"
    static let description = IntentDescription("Asks Scootch for a tiny next step.")
    static let openAppWhenRun = false
    static let isDiscoverable = false

    func perform() async throws -> some IntentResult {
        PendingSurfaceActions.record(.stuck)
        return .result()
    }
}
