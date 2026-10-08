import AppIntents
import SwiftUI
import UIKit
import WidgetKit

// Every way to start with no app in front: say it, type it in Spotlight, press the control or the
// Action button. Each begins the same hunt a widget's monster does (`HuntActivity.begin`), and
// the app adopts it when it is next opened.

/// A waiting monster, as Siri, Spotlight and Shortcuts name it. Only the app decides who lurks:
/// a serious task is never one, and a crisis day has none.
struct LurkerEntity: AppEntity {
    static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Monster")
    static let defaultQuery = LurkerQuery()

    let id: String
    let name: String
    let task: String

    init(_ lurker: SurfaceSnapshot.Lurker) {
        id = lurker.taskId
        name = lurker.name
        task = lurker.task
    }

    /// Found by the monster's name or by the thing itself: "ten minutes on the dentist".
    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)", subtitle: "\(task)", synonyms: ["\(task)"])
    }
}

struct LurkerQuery: EntityStringQuery {
    private var lurkers: [SurfaceSnapshot.Lurker] {
        SurfaceSnapshot.load().shown(at: Date()).lurkers
    }

    func entities(for identifiers: [String]) async throws -> [LurkerEntity] {
        lurkers.filter { identifiers.contains($0.taskId) }.map(LurkerEntity.init)
    }

    func entities(matching string: String) async throws -> [LurkerEntity] {
        let wanted = string.lowercased()
        return lurkers
            .filter { $0.name.lowercased().contains(wanted) || $0.task.lowercased().contains(wanted) }
            .map(LurkerEntity.init)
    }

    func suggestedEntities() async throws -> [LurkerEntity] {
        lurkers.map(LurkerEntity.init)
    }
}

/// What Siri shows under its answer: the monster, the task's own opening words, the clock, and
/// the two ways out. With nothing waiting it is one plain line.
struct HuntSnippet: View {
    struct Hunt {
        let name: String
        let line: String
        let image: String?
        let begins: Date
        let ends: Date
    }

    let hunt: Hunt?
    let language: String

    private func text(_ key: String) -> String { SurfaceText.string(key, language: language) }

    var body: some View {
        if let hunt {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 12) {
                    if let name = hunt.image, let folder = AppGroup.containerURL,
                        let picture = UIImage(contentsOfFile: folder.appendingPathComponent(name).path)
                    {
                        Image(uiImage: picture).resizable().scaledToFit().frame(width: 56, height: 56)
                    }
                    VStack(alignment: .leading, spacing: 3) {
                        Text(String(format: text("Hunting %@"), hunt.name))
                            .font(.system(.headline, design: .rounded).weight(.heavy))
                        if !hunt.line.isEmpty {
                            Text(hunt.line).font(.subheadline).foregroundStyle(.secondary)
                        }
                    }
                    Spacer(minLength: 8)
                    Text(timerInterval: hunt.begins...hunt.ends, countsDown: true)
                        .font(.system(.title3, design: .rounded).weight(.heavy))
                        .monospacedDigit()
                        .multilineTextAlignment(.trailing)
                }
                HStack(spacing: 8) {
                    Button(intent: MakeItFiveIntent()) {
                        Text(text("Make it 5")).frame(maxWidth: .infinity)
                    }
                    Button(intent: StopHuntIntent()) {
                        Text(text("Stop")).frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.bordered)
                .buttonBorderShape(.capsule)
            }
            .padding(16)
        } else {
            Text(text("Nothing is waiting.")).font(.headline).padding(16)
        }
    }
}

/// "Scootch, ten minutes on the dentist": ten minutes on the monster that was named, or on the
/// one that has waited longest. Nothing opens; the answer is a small card and the hunt is on.
struct HuntLurkerIntent: AppIntent {
    static let title: LocalizedStringResource = "Hunt for ten minutes"
    static let description = IntentDescription(
        "Starts ten minutes on a waiting thing, without opening Scootch.")
    static let openAppWhenRun = false

    @Parameter(title: "Monster") var lurker: LurkerEntity?

    static var parameterSummary: some ParameterSummary {
        Summary("Ten minutes on \(\.$lurker)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView {
        let snapshot = SurfaceSnapshot.load().shown(at: Date())
        let plain = { (key: String) in SurfaceText.string(key, language: snapshot.language) }
        let named = lurker.flatMap { snapshot.lurker(for: $0.id) }
        guard snapshot.state != .crisis, let target = named ?? snapshot.oldestLurker else {
            return .result(
                dialog: IntentDialog(stringLiteral: plain("Nothing is waiting.")),
                view: HuntSnippet(hunt: nil, language: snapshot.language))
        }
        // A hunt already on this monster is answered with its own clock rather than begun twice.
        if !HuntActivity.isLive(HuntStore.load()) {
            guard await HuntActivity.begin(taskId: target.taskId, waitsForCountIn: false) else {
                return .result(
                    dialog: IntentDialog(stringLiteral: plain("That could not start here. Open Scootch.")),
                    view: HuntSnippet(hunt: nil, language: snapshot.language))
            }
            PendingSurfaceActions.record(.hunt, taskId: target.taskId)
            Surfaces.reload()
        }
        guard let record = HuntStore.load() else {
            return .result(
                dialog: IntentDialog(stringLiteral: plain("Nothing is waiting.")),
                view: HuntSnippet(hunt: nil, language: snapshot.language))
        }
        let on = snapshot.lurker(for: record.taskId) ?? target
        // The answer is the task's own opening words, written with the task.
        let line = on.lines.start ?? on.lines.working.first ?? ""
        let title = String(format: plain("Hunting %@"), on.name)
        return .result(
            dialog: IntentDialog(stringLiteral: line.isEmpty ? title : line),
            view: HuntSnippet(
                hunt: HuntSnippet.Hunt(
                    name: on.name, line: line, image: on.image,
                    begins: Date(timeIntervalSince1970: record.beginsAt / 1000),
                    ends: Date(timeIntervalSince1970: record.endsAt / 1000)),
                language: snapshot.language))
    }
}

/// "Make it 5", under Siri's answer: the hunt is five minutes long instead of ten.
struct MakeItFiveIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Make it 5"
    static let openAppWhenRun = false
    static let isDiscoverable = false

    func perform() async throws -> some IntentResult {
        await HuntActivity.move { record, now in record.shortened(toMinutes: 5, at: now) }
        return .result()
    }
}

/// "Stop": during the count-in nothing was started; after it, the hunt stops early and the Lock
/// Screen offers its two calm choices.
struct StopHuntIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Stop the hunt"
    static let description = IntentDescription("Stops the hunt that is on.")
    static let openAppWhenRun = false

    func perform() async throws -> some IntentResult {
        let record = HuntStore.load()
        await HuntActivity.stop()
        // Taken back before the clock started, the app is told nothing began.
        if let record, HuntStore.load() == nil {
            PendingSurfaceActions.record(.notYet, taskId: record.taskId)
        }
        Surfaces.reload()
        return .result()
    }
}

/// The control and the Action button. One press starts ten minutes on the thing that has waited
/// longest. While a hunt is on, the same press parks a thought, which needs Scootch in front to
/// take the words; so does a day with nothing waiting, where there is a thing to say first.
/// An intent can only open its app part of the time from iOS 26, so it starts there; older
/// systems keep the press that always opens Scootch (`StartSessionIntent`).
@available(iOS 26.0, *)
struct StartOrParkIntent: AppIntent {
    static let title: LocalizedStringResource = "Start a hunt"
    static let description = IntentDescription(
        "Starts ten minutes on the thing that has waited longest. While hunting, parks a thought.")
    static let openAppWhenRun = false

    func perform() async throws -> some IntentResult {
        let now = Date()
        let snapshot = SurfaceSnapshot.load().shown(at: now)
        let record = HuntStore.load()
        if HuntActivity.isLive(record) || snapshot.isRunning(at: now) {
            PendingSurfaceActions.record(.parkThought, taskId: record?.taskId ?? snapshot.taskId)
            try await continueInForeground(alwaysConfirm: false)
            return .result()
        }
        if snapshot.state != .crisis, let oldest = snapshot.oldestLurker,
            await HuntActivity.begin(taskId: oldest.taskId)
        {
            PendingSurfaceActions.record(.hunt, taskId: oldest.taskId)
            Surfaces.reload()
            return .result()
        }
        PendingSurfaceActions.record(.startSession)
        try await continueInForeground(alwaysConfirm: false)
        return .result()
    }

}

/// Draws the widgets and the controls again after a hunt began or ended outside the app.
enum Surfaces {
    static func reload() {
        WidgetCenter.shared.reloadAllTimelines()
        if #available(iOS 18.0, *) { ControlCenter.shared.reloadAllControls() }
    }
}

/// What Siri and Spotlight offer without any setting up. The monsters are offered by name.
struct ScootchShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: HuntLurkerIntent(),
            phrases: [
                "\(.applicationName), ten minutes on \(\.$lurker)",
                "Ten minutes on \(\.$lurker) with \(.applicationName)",
                "Hunt \(\.$lurker) with \(.applicationName)",
                "Start a hunt with \(.applicationName)",
            ],
            shortTitle: "Hunt for ten minutes",
            systemImageName: "timer")
    }
}

/// Lets the app say the monsters have changed, so the names Siri and Spotlight offer are
/// today's. The app's JavaScript reaches it by name through the Objective-C runtime
/// (modules/scootch-live-activity), since a module cannot see the app target's own types.
@objc(ScootchShortcutsRefresher)
final class ScootchShortcutsRefresher: NSObject {
    @objc static func refresh() {
        ScootchShortcuts.updateAppShortcutParameters()
    }
}
