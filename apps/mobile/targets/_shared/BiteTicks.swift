import Foundation

/// The bites ticked under a notification since the app last wrote the snapshot. The app is told
/// through the pending actions and keeps the ticks itself; this only lets the notification show
/// them straight away, and again if it is opened twice before the app is.
enum BiteTicks {
    static let key = "surfaces.bites-ticked"

    static func load(from defaults: UserDefaults? = AppGroup.defaults) -> Set<String> {
        Set(defaults?.stringArray(forKey: key) ?? [])
    }

    /// Records the tick here and for the app. False when it was already ticked.
    @discardableResult
    static func tick(_ bite: SurfaceSnapshot.Bite, in defaults: UserDefaults? = AppGroup.defaults) -> Bool {
        var ticked = load(from: defaults)
        guard !bite.caught, ticked.insert(bite.id).inserted else { return false }
        // Only the bites of things still in the snapshot are worth remembering.
        let known = Set(SurfaceSnapshot.load(from: defaults).bites.map(\.id))
        defaults?.set(Array(ticked.intersection(known.union([bite.id]))), forKey: key)
        PendingSurfaceActions.record(.bite, taskId: bite.taskId, biteId: bite.id, in: defaults)
        return true
    }
}

extension SurfaceSnapshot {
    /// A thing's bites as they stand now: the app's own ticks and the ones made since.
    func bites(of taskId: String, ticked: Set<String> = BiteTicks.load()) -> [Bite] {
        bites.filter { $0.taskId == taskId }.map { bite in
            Bite(
                id: bite.id, taskId: bite.taskId, text: bite.text, minutes: bite.minutes,
                caught: bite.caught || ticked.contains(bite.id))
        }
    }
}
