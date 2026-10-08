import SwiftUI

/// The share sheet. It shows the words it took and two choices, and says nothing else: the
/// monster, its name and its joke come once Scootch has screened the thing, which happens in the
/// app. On a crisis day the two choices are worded plainly.
struct ShareSheetView: View {
    enum Stage: Equatable {
        case reading
        case found(SharedWords.Found)
        case nothing
        case kept(SharedIn.When)
    }

    @Environment(\.colorScheme) private var scheme
    let stage: Stage
    let language: String
    /// True on a crisis day: no monster's words on the buttons.
    let plain: Bool
    let keep: (SharedWords.Found, SharedIn.When) -> Void
    let close: () -> Void

    private func text(_ key: String) -> String { SurfaceText.string(key, language: language) }

    private var ink: Color { scheme == .dark ? .white : Color(red: 0.110, green: 0.102, blue: 0.090) }
    private var page: Color {
        scheme == .dark ? Color(red: 0.122, green: 0.106, blue: 0.094) : Color(red: 0.961, green: 0.949, blue: 0.925)
    }
    private var card: Color { scheme == .dark ? Color.white.opacity(0.07) : Color(red: 0.929, green: 0.910, blue: 0.878) }

    var body: some View {
        VStack(spacing: 16) {
            ZStack {
                Text("Scootch").font(.system(.headline, design: .rounded).weight(.heavy))
                HStack {
                    Button(action: close) {
                        Text(text(isKept ? "Done" : "Cancel"))
                            .font(.subheadline.weight(.semibold))
                            .padding(.horizontal, 14)
                            .frame(minHeight: 36)
                            .background(Capsule().fill(ink.opacity(0.07)))
                    }
                    .buttonStyle(.plain)
                    Spacer()
                }
            }
            content
        }
        .foregroundStyle(ink)
        .padding(20)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(page.ignoresSafeArea())
    }

    private var isKept: Bool {
        if case .kept = stage { return true }
        return false
    }

    @ViewBuilder private var content: some View {
        switch stage {
        case .reading:
            ProgressView().frame(maxWidth: .infinity, minHeight: 200)
        case .nothing:
            words(text("There are no words here to keep."), tag: nil)
            Spacer(minLength: 0)
        case .kept(let when):
            VStack(spacing: 12) {
                Image(systemName: "checkmark.circle.fill").font(.system(size: 44)).foregroundStyle(ink)
                Text(text(when == .now ? "Kept. Open Scootch to start on it." : "Kept. It comes back tomorrow."))
                    .font(.system(.title3, design: .rounded).weight(.bold))
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, minHeight: 200)
            Spacer(minLength: 0)
        case .found(let found):
            words(found.text, tag: text("NEW THING"))
            HStack(spacing: 8) {
                chip(text(kindLabel(found.kind)))
                Spacer(minLength: 0)
            }
            Spacer(minLength: 8)
            Button {
                keep(found, .now)
            } label: {
                Text(text(plain ? "Keep it for today" : "Hunt it now"))
                    .font(.system(.headline, design: .rounded).weight(.heavy))
                    .foregroundStyle(page)
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .background(Capsule().fill(ink))
            }
            .buttonStyle(.plain)
            Button {
                keep(found, .tomorrow)
            } label: {
                Text(text(plain ? "Keep it for tomorrow" : "Let it lurk till tomorrow"))
                    .font(.system(.headline, design: .rounded).weight(.bold))
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .overlay(Capsule().strokeBorder(ink.opacity(0.25), lineWidth: 1.5))
                    .contentShape(Capsule())
            }
            .buttonStyle(.plain)
        }
    }

    private func kindLabel(_ kind: SharedIn.Kind) -> String {
        switch kind {
        case .text: return "words"
        case .link: return "a link"
        case .picture: return "read from a picture"
        }
    }

    private func chip(_ label: String) -> some View {
        Text(label)
            .font(.subheadline.weight(.semibold))
            .padding(.horizontal, 12)
            .frame(minHeight: 32)
            .background(Capsule().fill(scheme == .dark ? Color.white.opacity(0.1) : Color.white))
            .overlay(Capsule().strokeBorder(ink.opacity(0.1), lineWidth: 0.5))
    }

    /// The words on their card: the dotted ground of the board, with no monster on it yet.
    private func words(_ words: String, tag: String?) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            if let tag {
                Text(tag)
                    .font(.system(.caption2, design: .monospaced).weight(.bold))
                    .tracking(1.6)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(RoundedRectangle(cornerRadius: 7, style: .continuous).fill(scheme == .dark ? Color.white.opacity(0.12) : .white))
            }
            Text(words)
                .font(.system(.title3, design: .rounded).weight(.heavy))
                .lineLimit(6)
                .minimumScaleFactor(0.8)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(card)
                .overlay(
                    Dots().fill(ink.opacity(0.09))
                        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous)))
        )
    }
}

/// The dotted ground of the card.
private struct Dots: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let step: CGFloat = 12
        var y = rect.minY + step / 2
        while y < rect.maxY {
            var x = rect.minX + step / 2
            while x < rect.maxX {
                path.addEllipse(in: CGRect(x: x - 1.3, y: y - 1.3, width: 2.6, height: 2.6))
                x += step
            }
            y += step
        }
        return path
    }
}
