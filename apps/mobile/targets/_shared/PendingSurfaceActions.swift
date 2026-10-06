import Foundation

/// What a control, the Action button or a Live Activity button can ask the app to do.
enum SurfaceAction: String, Sendable {
    case startSession = "start_session"
    case brainDump = "brain_dump"
    case parkThought = "park_thought"
    case stuck
}

/// The list of asked-for actions in the App Group. An intent appends to it; the app reads the
/// list, removes it and acts on each entry once (features/surfaces/pending-actions.ts).
enum PendingSurfaceActions {
    struct Entry: Codable, Equatable {
        let id: String
        let kind: String
        /// Milliseconds since 1970.
        let at: Double
    }

    /// More than this many waiting actions means the app has not been opened for a long while;
    /// the oldest are dropped.
    static let limit = 8

    static func entries(in defaults: UserDefaults?) -> [Entry] {
        guard let json = defaults?.string(forKey: AppGroup.Key.pendingSurfaceActions),
            let data = json.data(using: .utf8),
            let entries = try? JSONDecoder().decode([Entry].self, from: data)
        else { return [] }
        return entries
    }

    /// False when there is no App Group to write to.
    @discardableResult
    static func record(
        _ action: SurfaceAction, at date: Date = Date(), in defaults: UserDefaults? = AppGroup.defaults
    ) -> Bool {
        guard let defaults else { return false }
        var list = entries(in: defaults)
        list.append(
            Entry(id: UUID().uuidString, kind: action.rawValue, at: date.timeIntervalSince1970 * 1000))
        guard let data = try? JSONEncoder().encode(Array(list.suffix(limit))),
            let json = String(data: data, encoding: .utf8)
        else { return false }
        // Stored as text, which is what the app's bridge reads back.
        defaults.set(json, forKey: AppGroup.Key.pendingSurfaceActions)
        return true
    }
}
