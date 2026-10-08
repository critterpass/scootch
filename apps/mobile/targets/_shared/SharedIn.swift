import Foundation

/// Things shared into Scootch from another app, waiting in the App Group for the app to take
/// them in (apps/mobile/src/features/surfaces/shared-in.ts has the same names). The share sheet
/// only keeps the words: screening, the monster and its name are the app's to do.
enum SharedIn {
    static let key = "surfaces.shared-in"

    enum When: String, Codable, Sendable {
        /// "Hunt it now": it becomes the one thing when the app is next opened, if the day is free.
        case now
        /// "Let it lurk till tomorrow": it waits in the drawer and comes back tomorrow.
        case tomorrow
    }

    enum Kind: String, Codable, Sendable {
        case text, link, picture
    }

    struct Item: Codable, Equatable {
        let id: String
        let text: String
        let kind: Kind
        let when: When
        /// Milliseconds since 1970.
        let at: Double
    }

    /// The most a shared thing's words are kept at; the app trims further for what it stores.
    static let textLimit = 2000
    /// A thing shared and never taken in is the person's own, so none is dropped for age; this
    /// only keeps the list from growing without end on a phone where the app is never opened.
    static let limit = 20

    static func items(in defaults: UserDefaults? = AppGroup.defaults) -> [Item] {
        guard let json = defaults?.string(forKey: key), let data = json.data(using: .utf8),
            let items = try? JSONDecoder().decode([Item].self, from: data)
        else { return [] }
        return items
    }

    /// False when there is no App Group to write to, or no words to keep.
    @discardableResult
    static func keep(
        _ text: String, kind: Kind, when: When, at date: Date = Date(),
        in defaults: UserDefaults? = AppGroup.defaults
    ) -> Bool {
        let words = String(tidy(text).prefix(textLimit))
        guard let defaults, !words.isEmpty else { return false }
        var list = items(in: defaults)
        list.append(
            Item(
                id: UUID().uuidString, text: words, kind: kind, when: when,
                at: date.timeIntervalSince1970 * 1000))
        guard let data = try? JSONEncoder().encode(Array(list.suffix(limit))),
            let json = String(data: data, encoding: .utf8)
        else { return false }
        defaults.set(json, forKey: key)
        return true
    }

    /// The words on one line each, with runs of space and empty lines taken out.
    static func tidy(_ text: String) -> String {
        text.components(separatedBy: .newlines)
            .map { $0.split(whereSeparator: { $0 == " " || $0 == "\t" }).joined(separator: " ") }
            .filter { !$0.isEmpty }
            .joined(separator: "\n")
    }
}
