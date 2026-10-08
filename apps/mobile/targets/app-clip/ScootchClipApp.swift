import StoreKit
import SwiftUI

/// The App Clip: opened from a monster's link on the site, it shows that monster and offers the
/// full app. It keeps the link it was opened with in the App Group, where the full app can read
/// it on first launch.
@main
struct ScootchClipApp: App {
    @State private var link: URL?

    var body: some Scene {
        WindowGroup {
            ClipScreen(link: link)
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    ClipInvocation.store(activity.webpageURL)
                    link = activity.webpageURL
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

/// The page for the link the clip was opened with, and the App Store's card for the full app
/// over its foot.
struct ClipScreen: View {
    let link: URL?
    @State private var monster: ClipMonster?
    @State private var loading = false
    @State private var offersApp = false

    private var language: String { ClipLanguage.of(link) }

    var body: some View {
        ClipPage(monster: monster, loading: loading, language: language)
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if offersApp {
                    // Room for the App Store's card, so the last line scrolls clear of it.
                    Color.clear.frame(height: 120)
                } else {
                    GetScootchButton(language: language) { offersApp = true }
                }
            }
            .appStoreOverlay(isPresented: $offersApp) {
                SKOverlay.AppClipConfiguration(position: .bottom)
            }
            .onAppear { offersApp = true }
            .task(id: link) {
                monster = nil
                guard let found = MonsterLink(link) else {
                    loading = false
                    return
                }
                loading = true
                let loaded = await ClipMonster.load(found)
                guard !Task.isCancelled else { return }
                monster = loaded
                loading = false
            }
    }
}
