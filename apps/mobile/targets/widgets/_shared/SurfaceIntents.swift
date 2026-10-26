import AppIntents
import Foundation

// The intents behind Siri, Shortcuts, the widgets' Start and the Live Activity's buttons. This
// folder is compiled into the app and the widget extension; the system runs an intent that opens
// its app in the app's own process. None of them touches the board's database: each records what
// was asked for in the App Group, and the app acts on it when it next comes to the front
// (features/surfaces/pending-actions.ts). Titles and phrases are in Localizable.xcstrings and
// AppShortcuts.xcstrings beside this file, in English and Vietnamese.

/// "Add to the board": the words go on the board as if they were said at the desk, heard and
/// screened there. Nothing opens; the answer is his plain line, since nothing is screened yet.
struct AddToBoardIntent: AppIntent {
    static let title: LocalizedStringResource = "Add to the board"
    static let description = IntentDescription("Writes a task on the board.")
    static let openAppWhenRun = false

    @Parameter(title: "Task", requestValueDialog: IntentDialog("What goes on the board?"))
    var text: String

    init() {}

    init(text: String) {
        self.text = text
    }

    static var parameterSummary: some ParameterSummary {
        Summary("Add \(\.$text) to the board")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let words = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !words.isEmpty else { throw $text.needsValueError() }
        let snapshot = SurfaceSnapshot.load()
        PendingSurfaceActions.record(.add, text: words)
        let reply = snapshot.lines?.writtenDown ?? snapshot.text("On the board.")
        return .result(dialog: IntentDialog(stringLiteral: reply))
    }
}

/// "Start the desk's task": opens the app on the desk, which starts a period on its task. With
/// nothing on the desk the app simply opens there.
struct StartDeskTaskIntent: AppIntent {
    static let title: LocalizedStringResource = "Start the desk's task"
    static let description = IntentDescription("Starts a period on the task on your desk.")
    static let openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        let snapshot = SurfaceSnapshot.load().shown(at: Date())
        PendingSurfaceActions.record(.start, taskId: snapshot.taskId)
        return .result()
    }
}

/// "Done", on the Live Activity: the app opens on the finish, where he grades it.
struct DoneIntent: AppIntent {
    static let title: LocalizedStringResource = "Done"
    static let openAppWhenRun = true
    static let isDiscoverable = false

    @Parameter(title: "Task") var taskId: String?

    init() {}

    init(taskId: String?) {
        self.taskId = taskId
    }

    func perform() async throws -> some IntentResult {
        PendingSurfaceActions.record(.done, taskId: taskId)
        return .result()
    }
}

// App Shortcuts are read from the app itself. The widget extension compiles this folder too, and
// has no Expo in it, so the provider is left out there.
#if canImport(Expo)
    /// What Siri, Spotlight and Shortcuts offer without any setting up.
    struct PhusclassShortcuts: AppShortcutsProvider {
        static var appShortcuts: [AppShortcut] {
            AppShortcut(
                intent: AddToBoardIntent(),
                phrases: [
                    "Add to the board in \(.applicationName)",
                    "Put something on the board in \(.applicationName)",
                    "Tell \(.applicationName) a task",
                ],
                shortTitle: "Add to the board",
                systemImageName: "square.and.pencil")
            AppShortcut(
                intent: StartDeskTaskIntent(),
                phrases: [
                    "Start the desk's task in \(.applicationName)",
                    "Start my task in \(.applicationName)",
                    "Sit down in \(.applicationName)",
                ],
                shortTitle: "Start the desk's task",
                systemImageName: "play.fill")
        }
    }
#endif
