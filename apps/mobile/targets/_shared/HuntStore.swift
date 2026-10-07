import Foundation

/// The hunt record in the App Group, where an intent and the app both read and write it.
enum HuntStore {
    static func load(from defaults: UserDefaults? = AppGroup.defaults) -> HuntRecord? {
        guard let json = defaults?.string(forKey: AppGroup.Key.huntRecord),
            let data = json.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(HuntRecord.self, from: data)
    }

    /// Stored as text, which is what the app's bridge reads back. Nil removes it.
    static func store(_ record: HuntRecord?, in defaults: UserDefaults? = AppGroup.defaults) {
        guard let defaults else { return }
        guard let record, let data = try? JSONEncoder().encode(record),
            let json = String(data: data, encoding: .utf8)
        else {
            defaults.removeObject(forKey: AppGroup.Key.huntRecord)
            return
        }
        defaults.set(json, forKey: AppGroup.Key.huntRecord)
    }
}
