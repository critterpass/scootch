import SwiftUI

/// The clip's one screen. With a monster: its card, its name and one sentence. Without one (still
/// loading, not a monster's link, or nothing could be read): Scootch's name and one sentence
/// about what Scootch is. The words are fixed labels, never Scootch's own voice.
struct ClipPage: View {
    @Environment(\.colorScheme) private var scheme
    let monster: ClipMonster?
    let loading: Bool
    let language: String

    private func text(_ key: String) -> String { SurfaceText.string(key, language: language) }

    private var ink: Color { scheme == .dark ? .white : Color(red: 0.110, green: 0.102, blue: 0.090) }
    private var page: Color {
        scheme == .dark
            ? Color(red: 0.122, green: 0.106, blue: 0.094) : Color(red: 0.980, green: 0.965, blue: 0.937)
    }

    private var aboutScootch: String {
        text("Scootch turns a thing you have been avoiding into a monster, then helps you start it.")
    }

    var body: some View {
        // In the middle of the page while it fits; a page that scrolls once the text is large.
        ViewThatFits(in: .vertical) {
            content
            ScrollView { content }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .foregroundStyle(ink)
        .background(page.ignoresSafeArea())
    }

    private var content: some View {
        VStack(spacing: 14) {
            if let monster {
                card(of: monster)
                title(monster.name)
                sentence(
                    monster.waits
                        ? text("It is waiting, and the Scootch app is where you hunt it.")
                        : aboutScootch)
            } else {
                title("Scootch")
                sentence(aboutScootch)
                if loading { ProgressView().tint(ink).padding(.top, 6) }
            }
        }
        .padding(24)
        .frame(maxWidth: 560)
        .frame(maxWidth: .infinity)
    }

    /// The link preview as the server drew it. It is always printed paper, so on a dark page it
    /// sits as a light card.
    private func card(of monster: ClipMonster) -> some View {
        Image(uiImage: monster.card)
            .resizable()
            .aspectRatio(contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .strokeBorder(ink.opacity(0.12), lineWidth: 1)
            )
            .padding(.bottom, 6)
            .accessibilityLabel(String(format: text("The card of %@"), monster.name))
            .accessibilityValue(monster.flavourText)
    }

    private func title(_ name: String) -> some View {
        Text(name)
            .font(.system(.largeTitle, design: .rounded).weight(.heavy))
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityAddTraits(.isHeader)
    }

    private func sentence(_ words: String) -> some View {
        Text(words)
            .font(.system(.title3, design: .rounded).weight(.semibold))
            .foregroundStyle(ink.opacity(0.72))
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
    }
}

/// The way back to the App Store's own card once the person has put it away.
struct GetScootchButton: View {
    @Environment(\.colorScheme) private var scheme
    let language: String
    let action: () -> Void

    var body: some View {
        let dark = Color(red: 0.110, green: 0.102, blue: 0.090)
        Button(action: action) {
            Text(SurfaceText.string("Get Scootch", language: language))
                .font(.system(.headline, design: .rounded).weight(.heavy))
                .foregroundStyle(scheme == .dark ? dark : Color.white)
                .padding(.horizontal, 20)
                .frame(maxWidth: .infinity, minHeight: 54)
                .background(Capsule().fill(scheme == .dark ? Color.white : dark))
        }
        .buttonStyle(.plain)
        .frame(maxWidth: 560)
        .padding(.horizontal, 24)
        .padding(.bottom, 12)
    }
}
