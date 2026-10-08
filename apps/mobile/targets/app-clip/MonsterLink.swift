import SwiftUI

/// A monster's link, as the site writes it: `/m/<id>`, or `/vi/m/<id>` on the Vietnamese pages.
/// Everything the clip reads comes from the host the link itself names, so the clip names no
/// server of its own.
struct MonsterLink: Equatable {
    let id: String
    /// The monster as the site's own pages read it.
    let pageURL: URL
    /// Its link preview: the card, 1200 by 630, drawn by the server.
    let cardURL: URL

    /// Nil for a link that is not a monster's.
    init?(_ url: URL?) {
        guard let url, url.scheme == "https", let host = url.host, !host.isEmpty else { return nil }
        var parts = Array(url.pathComponents.dropFirst())
        if parts.first == "vi" { parts.removeFirst() }
        guard parts.count == 2, parts[0] == "m",
            parts[1].range(of: "^[a-z0-9-]{1,40}$", options: .regularExpression) != nil
        else { return nil }

        var origin = URLComponents()
        origin.scheme = "https"
        origin.host = host
        origin.port = url.port
        origin.path = "/api/monster-page/\(parts[1])"
        guard let pageURL = origin.url else { return nil }
        origin.path = "/m/\(parts[1])/preview.png"
        guard let cardURL = origin.url else { return nil }

        self.id = parts[1]
        self.pageURL = pageURL
        self.cardURL = cardURL
    }
}

/// The monster the clip shows: its name, its card line, its card as a picture, and whether it is
/// one the app will have waiting.
struct ClipMonster {
    let name: String
    let flavourText: String
    /// True for a monster still wild, whether or not its typed words are shown: the app takes it
    /// in either way. A caught monster is shown without the word "waiting".
    let waits: Bool
    let card: UIImage

    private struct Page: Decodable {
        let name: String
        let flavourText: String
        let status: String
    }

    /// Nil when the page or its card cannot be read, for any reason.
    static func load(_ link: MonsterLink, session: URLSession = .shared) async -> ClipMonster? {
        async let page = read(link.pageURL, session)
        async let picture = read(link.cardURL, session)
        guard let pageData = await page, let pictureData = await picture,
            let found = try? JSONDecoder().decode(Page.self, from: pageData),
            !found.name.isEmpty, let card = UIImage(data: pictureData)
        else { return nil }
        return ClipMonster(
            name: found.name, flavourText: found.flavourText, waits: found.status == "wild",
            card: card)
    }

    private static func read(_ url: URL, _ session: URLSession) async -> Data? {
        // Short, so a slow network leaves the plain page rather than a long wait.
        let request = URLRequest(url: url, timeoutInterval: 15)
        guard let (data, response) = try? await session.data(for: request),
            (response as? HTTPURLResponse)?.statusCode == 200
        else { return nil }
        return data
    }
}

/// The language of the clip's own words: Vietnamese from a Vietnamese page or on a Vietnamese
/// phone, English otherwise. The person has not chosen one in the app yet.
enum ClipLanguage {
    static func of(_ url: URL?, preferred: [String] = Locale.preferredLanguages) -> String {
        if url?.pathComponents.dropFirst().first == "vi" { return "vi" }
        return preferred.first?.hasPrefix("vi") == true ? "vi" : "en"
    }
}
