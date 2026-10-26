import Foundation

/// What Siri, Shortcuts, a widget or the Live Activity can ask the app to do
/// (features/surfaces/pending-actions.ts has the same names).
enum SurfaceAction: String, Sendable {
    /// "Add to the board", with the words said.
    case add
    /// "Start the desk's task".
    case start
    /// "Done", on the Live Activity.
    case done
}

/// The list of asked-for actions in the App Group. An intent appends to it; the app reads the
/// list, removes it and acts on each entry once (features/surfaces/pending-actions.ts).
enum PendingSurfaceActions {
    struct Entry: Codable, Equatable, Sendable {
        let id: String
        let kind: String
        /// The words, for `add`.
        var text: String? = nil
        /// The task it is about, when it is about one.
        var taskId: String? = nil
        /// Milliseconds since 1970.
        let at: Double
    }

    /// More than this many waiting actions means the app has not been opened for a long while;
    /// the oldest are dropped.
    static let limit = 12

    static func entries(in defaults: UserDefaults?) -> [Entry] {
        guard let json = defaults?.string(forKey: AppGroup.Key.pendingActions),
            let data = json.data(using: .utf8),
            let entries = try? JSONDecoder().decode([Entry].self, from: data)
        else { return [] }
        return entries
    }

    /// False when there is no App Group to write to.
    @discardableResult
    static func record(
        _ action: SurfaceAction, text: String? = nil, taskId: String? = nil, at date: Date = Date(),
        in defaults: UserDefaults? = AppGroup.defaults
    ) -> Bool {
        guard let defaults else { return false }
        var list = entries(in: defaults)
        list.append(
            Entry(
                id: UUID().uuidString, kind: action.rawValue, text: text, taskId: taskId,
                at: date.timeIntervalSince1970 * 1000))
        guard let data = try? JSONEncoder().encode(Array(list.suffix(limit))),
            let json = String(data: data, encoding: .utf8)
        else { return false }
        // Stored as text, which is what the app's bridge reads back.
        defaults.set(json, forKey: AppGroup.Key.pendingActions)
        return true
    }
}
