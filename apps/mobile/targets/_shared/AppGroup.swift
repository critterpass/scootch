import Foundation

/// The App Group container shared by the app and its extensions.
///
/// The dev and prd apps install side by side, so each has its own group. Every bundle id of the
/// dev app (the app, `.widgets`, `.notification-service`) starts with `com.phusclass.dev`; the
/// identifiers here match the App Group entitlement in `app.config.ts`.
enum AppGroup {
    static let devIdentifier = "group.com.phusclass.dev"
    static let prdIdentifier = "group.com.phusclass"
    static let devBundleIdentifier = "com.phusclass.dev"

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
        /// Today as the surfaces draw it: one JSON string the app writes (`SurfaceSnapshot`).
        static let surfaceSnapshot = "surfaces.snapshot"
        /// What Siri, Shortcuts, a widget or the Live Activity asked the app to do, as one JSON
        /// list (`PendingSurfaceActions`); the app acts on it when it next comes to the front.
        static let pendingActions = "surfaces.pending-actions"
    }
}
