import AppIntents

// The intents behind the widgets, the controls, the Action button and the Live Activity's
// buttons. They are compiled into the app and the widget extension, and the system runs them in
// the app's process. None of them changes the day's own tables: each moves the hunt record and
// its Live Activity where it can, and records what was asked for in the App Group, which the app
// acts on when it next comes to the front (features/surfaces/pending-actions.ts).

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

/// A monster in a widget was tapped: ten minutes on that thing, with no app launch. The count-in
/// shows on the Lock Screen and the Island, and "Not yet" takes it back.
struct HuntIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Hunt it"
    static let description = IntentDescription("Starts ten minutes on one waiting thing.")
    static let openAppWhenRun = false
    static let isDiscoverable = false

    @Parameter(title: "Thing") var taskId: String

    init() {}

    init(taskId: String) {
        self.taskId = taskId
    }

    func perform() async throws -> some IntentResult {
        if await HuntActivity.begin(taskId: taskId) {
            PendingSurfaceActions.record(.hunt, taskId: taskId)
        }
        return .result()
    }
}

/// "Not yet", during the count-in: nothing was started.
struct NotYetIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Not yet"
    static let openAppWhenRun = false
    static let isDiscoverable = false

    func perform() async throws -> some IntentResult {
        let taskId = HuntStore.load()?.taskId
        await HuntActivity.stop()
        PendingSurfaceActions.record(.notYet, taskId: taskId)
        return .result()
    }
}

/// "Park a thought". The thought's words have to be said or typed, so this opens Scootch on the
/// park field; the clock never stops for it.
struct ParkThoughtIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Park a thought"
    static let description = IntentDescription("Asks Scootch to hold a thought for after the session.")
    static let openAppWhenRun = true
    static let isDiscoverable = false

    func perform() async throws -> some IntentResult {
        PendingSurfaceActions.record(.parkThought, taskId: HuntStore.load()?.taskId)
        return .result()
    }
}

/// "I'm stuck". It runs without unlocking: the clock holds and the task's one concrete nudge is
/// shown at once, from the words written with the task.
struct StuckIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "I'm stuck"
    static let description = IntentDescription("Asks Scootch for a tiny next step.")
    static let openAppWhenRun = false
    static let isDiscoverable = false

    func perform() async throws -> some IntentResult {
        let moved = await HuntActivity.move(line: { $0?.stuck }) { record, now in
            record.paused(at: now)
        }
        PendingSurfaceActions.record(.stuck, taskId: moved?.taskId)
        return .result()
    }
}

/// "Give me a first line", while stuck: the smaller step is shown and the clock runs again.
struct FirstLineIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Give me a first line"
    static let openAppWhenRun = false
    static let isDiscoverable = false

    func perform() async throws -> some IntentResult {
        let moved = await HuntActivity.move(line: { $0?.firstLine ?? $0?.stuck }) { record, now in
            record.resumed(at: now)
        }
        PendingSurfaceActions.record(.firstLine, taskId: moved?.taskId)
        return .result()
    }
}

/// "Make it smaller", while stuck: shrinking a task is the app's to do, so this opens it there.
struct MakeSmallerIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Make it smaller"
    static let openAppWhenRun = true
    static let isDiscoverable = false

    func perform() async throws -> some IntentResult {
        PendingSurfaceActions.record(.makeSmaller, taskId: HuntStore.load()?.taskId)
        return .result()
    }
}

/// "Finish", in overtime. The catch happens in the app, where Scootch asks whether the thing was
/// really done.
struct FinishIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Finish"
    static let openAppWhenRun = true
    static let isDiscoverable = false

    func perform() async throws -> some IntentResult {
        PendingSurfaceActions.record(.finish, taskId: HuntStore.load()?.taskId)
        return .result()
    }
}

/// "5 more", in overtime: five minutes from now.
struct FiveMoreIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "5 more"
    static let openAppWhenRun = false
    static let isDiscoverable = false

    func perform() async throws -> some IntentResult {
        let moved = await HuntActivity.move(line: { $0?.working.first }) { record, now in
            record.more(at: now)
        }
        PendingSurfaceActions.record(.fiveMore, taskId: moved?.taskId)
        return .result()
    }
}

/// "Tomorrow 9:00", after stopping early.
struct TomorrowIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Tomorrow 9:00"
    static let openAppWhenRun = false
    static let isDiscoverable = false

    func perform() async throws -> some IntentResult {
        PendingSurfaceActions.record(.tomorrow, taskId: HuntStore.load()?.taskId)
        await HuntActivity.clear()
        return .result()
    }
}

/// "Keep it here", after stopping early: the thing stays today's.
struct KeepHereIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Keep it here"
    static let openAppWhenRun = false
    static let isDiscoverable = false

    func perform() async throws -> some IntentResult {
        PendingSurfaceActions.record(.keepHere, taskId: HuntStore.load()?.taskId)
        await HuntActivity.clear()
        return .result()
    }
}
