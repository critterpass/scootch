import Foundation

/// The App Group container shared by the app, its extensions and the App Clip.
///
/// The dev and prd apps install side by side, so each has its own group. Every bundle id of the
/// dev app (the app, `.widgets`, `.notification-service`, `.Clip`) starts with `app.scootch.dev`;
/// the identifiers here match the App Group entitlement in `app.config.ts`.
enum AppGroup {
    static let devIdentifier = "group.app.scootch.dev"
    static let prdIdentifier = "group.app.scootch"
    static let devBundleIdentifier = "app.scootch.dev"

    static func identifier(forBundleIdentifier bundleIdentifier: String?) -> String {
        guard let bundleIdentifier else { return prdIdentifier }
        let isDev = bundleIdentifier == devBundleIdentifier
            || bundleIdentifier.hasPrefix(devBundleIdentifier + ".")
        return isDev ? devIdentifier : prdIdentifier
    }

    static var identifier: String {
        identifier(forBundleIdentifier: Bundle.main.bundleIdentifier)
    }

    /// `nil` when the running binary was signed without the App Group entitlement.
    static var defaults: UserDefaults? {
        UserDefaults(suiteName: identifier)
    }

    static var containerURL: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: identifier)
    }

    /// Keys in the group's `UserDefaults`.
    enum Key {
        /// The link the App Clip was opened with, as an absolute URL string.
        static let clipInvocationURL = "clip.invocation-url"
        /// When the App Clip stored that link, in seconds since 1970.
        static let clipInvocationStoredAt = "clip.invocation-stored-at"
        /// Today as the surfaces draw it: one JSON string the app writes (`SurfaceSnapshot`).
        static let surfaceSnapshot = "surfaces.snapshot"
        /// What the controls and buttons asked for, as one JSON string the app reads and removes.
        static let pendingSurfaceActions = "surfaces.pending-actions"
        /// The session the Lock Screen and the Island follow, as one JSON string (`HuntRecord`).
        static let huntRecord = "surfaces.hunt"
        /// The thing "Hunt at 9:00" was pressed for, as one JSON string (`MorningHunt`).
        static let morningHunt = "surfaces.morning-hunt"
    }
}
