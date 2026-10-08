import SwiftUI
import UIKit

/// What the long press shows under a monster's message: the monster in three bites, each a step
/// under five minutes and each a tick. The bites are the task call's own words, read from the
/// shared snapshot; nothing here is written by this extension.
struct BitesModel: Equatable {
    let monsterName: String
    let language: String
    let bites: [SurfaceSnapshot.Bite]
    let picture: UIImage?

    var left: [SurfaceSnapshot.Bite] { bites.filter { !$0.caught } }
    var next: SurfaceSnapshot.Bite? { left.first }
    var minutesLeft: Int { left.reduce(0) { $0 + $1.minutes } }

    func text(_ key: String) -> String { SurfaceText.string(key, language: language) }

    var title: String { String(format: text("%@, in three bites"), monsterName) }

    var summary: String {
        if left.isEmpty {
            return String(format: text("All three caught. Open Scootch to catch %@."), monsterName)
        }
        if left.count == 1, minutesLeft == 1 { return text("1 left · about 1 minute") }
        return String(
            format: text("%lld left · about %lld minutes in total"), left.count, minutesLeft)
    }

    /// The thing's bites as the snapshot and the ticks made here stand. Nil when the thing has no
    /// monster to show, no bites, or the day is one on which nothing of it is shown.
    static func load(taskId: String?) -> BitesModel? {
        let snapshot = SurfaceSnapshot.load().shown(at: Date())
        guard let taskId, snapshot.state != .crisis, let lurker = snapshot.lurker(for: taskId)
        else { return nil }
        let bites = snapshot.bites(of: taskId)
        guard !bites.isEmpty else { return nil }
        let picture = lurker.image.flatMap { name in
            AppGroup.containerURL.flatMap {
                UIImage(contentsOfFile: $0.appendingPathComponent(name).path)
            }
        }
        return BitesModel(
            monsterName: lurker.name, language: snapshot.language, bites: bites, picture: picture)
    }
}

private enum Ink {
    static let tomato = Color(red: 0.941, green: 0.337, blue: 0.180)
    static let paper = Color(red: 0.980, green: 0.965, blue: 0.937)
    static let dark = Color(red: 0.110, green: 0.102, blue: 0.090)
}

/// One bite: a baby of the monster, the step in the task call's words, and a tick.
private struct BiteRow: View {
    @Environment(\.colorScheme) private var scheme
    let bite: SurfaceSnapshot.Bite
    let model: BitesModel
    let isNext: Bool
    let tick: () -> Void

    private var ink: Color { scheme == .dark ? .white : Ink.dark }

    var body: some View {
        Button(action: tick) {
            HStack(spacing: 12) {
                ZStack(alignment: .bottom) {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(scheme == .dark ? Color.white.opacity(0.1) : Color.white.opacity(0.85))
                    if let picture = model.picture {
                        Image(uiImage: picture)
                            .resizable()
                            .scaledToFit()
                            // A caught bite is a crumb of what it was.
                            .frame(width: bite.caught ? 30 : 56, height: bite.caught ? 30 : 56)
                            .grayscale(bite.caught ? 1 : 0)
                            .opacity(bite.caught ? 0.45 : 1)
                            .offset(y: bite.caught ? -2 : 6)
                    }
                }
                .frame(width: 52, height: 52)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 4) {
                    Text(bite.text)
                        .font(.callout.weight(.semibold))
                        .strikethrough(bite.caught)
                        .foregroundStyle(bite.caught ? ink.opacity(0.55) : ink)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(
                        bite.caught
                            ? model.text("caught")
                            : String(format: model.text("%lld min"), bite.minutes)
                    )
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(ink.opacity(0.6))
                }
                Spacer(minLength: 8)
                ZStack {
                    if bite.caught {
                        Circle().fill(ink)
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(scheme == .dark ? Ink.dark : Color.white)
                    } else {
                        Circle().strokeBorder(ink.opacity(0.3), lineWidth: 1.5)
                    }
                }
                .frame(width: 26, height: 26)
            }
            .padding(8)
            .padding(.trailing, 6)
            .frame(maxWidth: .infinity, minHeight: 68, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(isNext ? Ink.tomato.opacity(0.12) : ink.opacity(0.05)))
            .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
        .allowsHitTesting(!bite.caught)
        .accessibilityLabel(
            bite.caught
                ? String(format: model.text("%@, caught"), bite.text)
                : String(format: model.text("%@, %lld minutes. Tick it."), bite.text, bite.minutes)
        )
    }
}

struct BitesView: View {
    @Environment(\.colorScheme) private var scheme
    let model: BitesModel
    let tick: (SurfaceSnapshot.Bite) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(model.title)
                    .font(.system(.title3, design: .rounded).weight(.heavy))
                    .foregroundStyle(scheme == .dark ? Color.white : Ink.dark)
                Text(model.summary)
                    .font(.subheadline)
                    .foregroundStyle((scheme == .dark ? Color.white : Ink.dark).opacity(0.6))
            }
            .padding(.horizontal, 4)
            VStack(spacing: 8) {
                ForEach(model.bites) { bite in
                    BiteRow(bite: bite, model: model, isNext: bite.id == model.next?.id) {
                        tick(bite)
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(scheme == .dark ? Color.clear : Ink.paper)
    }
}
