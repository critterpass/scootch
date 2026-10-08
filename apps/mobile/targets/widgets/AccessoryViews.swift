import AppIntents
import SwiftUI
import WidgetKit

// The Lock Screen accessories: the oldest lurker, at a glance. The system draws them in its own
// vibrant mode, which keeps a picture's light and dark and drops its colour. A serious task is
// its plain words with no monster and no day, and a crisis day shows only Scootch's name.

/// A lurker's picture for the Lock Screen, lifted so a dark monster still reads on glass.
private struct AccessoryMonster: View {
    let lurker: SurfaceSnapshot.Lurker
    let snapshot: SurfaceSnapshot

    var body: some View {
        LurkerArt(lurker: lurker, snapshot: snapshot)
            .grayscale(1)
            .brightness(0.22)
            .contrast(1.1)
    }
}

/// Inline, above the clock: "Goblin, day 9".
struct LurkerInlineView: View {
    let entry: SurfaceEntry

    var body: some View {
        let snapshot = entry.snapshot
        if entry.showsLurker, let lurker = entry.lurker {
            Text(String(format: snapshot.text("%@, day %lld"), lurker.name, lurker.day))
        } else {
            switch snapshot.state {
            case .taskSet, .inSession, .serious:
                Text(snapshot.task ?? "Scootch")
            case .done:
                Text(snapshot.text("Done for today"))
            case .nothingYet, .crisis:
                Text("Scootch")
            }
        }
    }
}

/// Circular: the lurker inside a ring that fills as its days go by, full on the day it is
/// pressed against the glass. With nothing lurking, the session's ring or Scootch's mark.
struct LurkerCircularView: View {
    let entry: SurfaceEntry

    var body: some View {
        let snapshot = entry.snapshot
        ZStack {
            AccessoryWidgetBackground()
            if entry.showsLurker, let lurker = entry.lurker {
                Circle().stroke(Color.white.opacity(0.22), lineWidth: 4).padding(2)
                Circle()
                    .trim(from: 0, to: CGFloat(min(max(lurker.day, 1), 9)) / 9)
                    .stroke(Color.white, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .padding(2)
                    .widgetAccentable()
                AccessoryMonster(lurker: lurker, snapshot: snapshot)
                    .padding(6)
                    .offset(y: 4)
                    .clipShape(Circle().inset(by: 5))
            } else if entry.running, let end = snapshot.sessionEnd {
                ProgressView(
                    timerInterval: min(snapshot.sessionStart ?? entry.date, end)...end,
                    countsDown: true
                ) {
                    EmptyView()
                } currentValueLabel: {
                    SessionTimeLeft(end: end, from: entry.date).font(.caption2)
                }
                .progressViewStyle(.circular)
            } else {
                Image("GlyphWorld").resizable().scaledToFit().padding(13)
            }
        }
        .widgetURL(
            entry.showsLurker ? SurfaceLinks.home : SurfaceLinks.destination(for: snapshot, at: entry.date)
        )
        .accessibilityLabel(
            entry.lurker.map {
                String(format: snapshot.text("%@, day %lld"), $0.name, $0.day)
            } ?? "Scootch")
    }
}

/// Circular, in the Lurkers widget: "10 HUNT", a button that starts ten minutes on the oldest
/// lurker from the Lock Screen.
struct HuntCircularView: View {
    let entry: SurfaceEntry

    var body: some View {
        let snapshot = entry.snapshot
        if entry.showsLurker, let lurker = entry.lurker, entry.hunted == nil {
            Button(intent: HuntIntent(taskId: lurker.taskId)) {
                ZStack {
                    AccessoryWidgetBackground()
                    VStack(spacing: 0) {
                        Text("10")
                            .font(.system(size: 20, weight: .heavy, design: .rounded))
                            .widgetAccentable()
                        Text(snapshot.text("HUNT"))
                            .font(.system(size: 9, weight: .semibold))
                            .opacity(0.8)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                    .padding(.horizontal, 6)
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel(
                String(
                    format: snapshot.text("%@, day %lld. Hunt it for ten minutes."),
                    lurker.task, lurker.day))
        } else {
            ZStack {
                AccessoryWidgetBackground()
                Image(entry.hunted == nil ? "GlyphWorld" : "GlyphPlay")
                    .resizable().scaledToFit().padding(13)
            }
            .widgetURL(entry.hunted == nil ? SurfaceLinks.home : SurfaceLinks.session)
            .accessibilityLabel("Scootch")
        }
    }
}

/// Rectangular: the lurker beside its task and "day 9 · tap to hunt". The whole of it is the
/// button. With nothing lurking it is the plain day in two lines.
struct LurkerRectangularView: View {
    let entry: SurfaceEntry

    var body: some View {
        let snapshot = entry.snapshot
        if entry.showsLurker, let lurker = entry.lurker {
            let hunted = entry.hunted == lurker.taskId
            let row = HStack(spacing: 6) {
                AccessoryMonster(lurker: lurker, snapshot: snapshot)
                    .frame(width: 40, height: 48)
                VStack(alignment: .leading, spacing: 2) {
                    Text(lurker.task)
                        .font(.system(.footnote).weight(.bold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                        .widgetAccentable()
                    Text(
                        String(
                            format: snapshot.text(hunted ? "day %lld · hunting" : "day %lld · tap to hunt"),
                            lurker.day)
                    )
                    .font(.caption2.weight(.medium))
                    .opacity(0.75)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 6)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .background(AccessoryWidgetBackground().clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous)))
            if hunted {
                row.widgetURL(SurfaceLinks.session)
            } else {
                Button(intent: HuntIntent(taskId: lurker.taskId)) { row }.buttonStyle(.plain)
            }
        } else {
            let day = PlainDay(entry)
            VStack(alignment: .leading, spacing: 1) {
                Text(day.title).font(.headline).lineLimit(entry.running ? 1 : 2).widgetAccentable()
                if entry.running, let end = snapshot.sessionEnd {
                    SessionTimeLeft(end: end, from: entry.date).font(.subheadline)
                } else if let line = day.line, snapshot.state == .serious {
                    Text(line).font(.caption).lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .widgetURL(day.destination)
        }
    }
}
