import AppIntents
import SwiftUI
import WidgetKit

/// A Plus surface without Plus: the picture blurred behind a small lock. It says nothing and
/// sells nothing; the tap opens the app.
struct LockedPreview: View {
    let snapshot: SurfaceSnapshot

    var body: some View {
        ZStack {
            SurfaceArt(source: .baked(snapshot.pose("Waiting")))
                .padding(24)
                .blur(radius: 10)
                .opacity(0.55)
            VStack(spacing: 8) {
                Image("GlyphLock").resizable().scaledToFit().frame(width: 26, height: 26)
                Text(snapshot.text("Scootch Plus")).font(.footnote.weight(.semibold))
            }
            .foregroundStyle(.white)
            .widgetAccentable()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// The nightstand after ten: tomorrow's one thing in dim red, with one press that sets it for
/// nine and one that picks another. Once it is set there is nothing left to press. A serious
/// thing is its plain words: no monster is named and nothing is said about it.
struct NightlightView: View {
    let entry: SurfaceEntry
    let thing: SurfaceSnapshot.Tomorrow

    var body: some View {
        let snapshot = entry.snapshot
        // One paragraph, as the board writes it: the thing, then what Scootch says about it.
        let words = [String(format: snapshot.text("Tomorrow's one thing: %@."), thing.task), thing.line]
            .compactMap { $0 }
            .joined(separator: " ")
        VStack(alignment: .leading, spacing: 6) {
            Text(words)
                .font(SurfaceFont.rounded(.footnote, .bold))
                .foregroundStyle(SurfaceColor.ember)
                .lineLimit(5)
                .minimumScaleFactor(0.75)
            Spacer(minLength: 0)
            if entry.setForNine {
                chip(snapshot.text("Set for 9:00"), filled: false)
            } else {
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 6) { buttons(snapshot) }
                    VStack(alignment: .leading, spacing: 6) { buttons(snapshot) }
                }
            }
        }
        .padding(13)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    @ViewBuilder private func buttons(_ snapshot: SurfaceSnapshot) -> some View {
        Button(intent: HuntAtNineIntent()) {
            chip(snapshot.text("Hunt at 9:00"), filled: true)
        }
        .buttonStyle(.plain)
        Link(destination: SurfaceLinks.home) {
            chip(snapshot.text("Pick another"), filled: false)
        }
    }

    private func chip(_ label: String, filled: Bool) -> some View {
        Text(label)
            .font(.footnote.weight(.semibold))
            .foregroundStyle(SurfaceColor.emberBright.opacity(filled ? 1 : 0.78))
            .lineLimit(1)
            .fixedSize()
            .padding(.horizontal, 12)
            .frame(minHeight: 30)
            .background(Capsule().fill(SurfaceColor.ember.opacity(filled ? 0.18 : 0)))
            .overlay(Capsule().strokeBorder(SurfaceColor.ember.opacity(filled ? 0.45 : 0.28), lineWidth: 1))
    }
}
