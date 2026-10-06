import SwiftUI

/// Placeholder App Clip. It keeps the link it was opened with in the App Group, where the full
/// app can read it on first launch.
@main
struct ScootchClipApp: App {
    var body: some Scene {
        WindowGroup {
            ClipPlaceholderView()
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    ClipInvocation.store(activity.webpageURL)
                }
        }
    }
}

enum ClipInvocation {
    static func store(_ url: URL?) {
        guard let url, let defaults = AppGroup.defaults else { return }
        defaults.set(url.absoluteString, forKey: AppGroup.Key.clipInvocationURL)
        defaults.set(Date().timeIntervalSince1970, forKey: AppGroup.Key.clipInvocationStoredAt)
    }
}

struct ClipPlaceholderView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "pawprint")
                .font(.largeTitle)
            Text("Scootch")
                .font(.title2.bold())
            Text("Placeholder App Clip")
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}
