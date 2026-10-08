import AppIntents
import SwiftUI
import WidgetKit

// The session at a table, on the Lock Screen and the Island: the seats in place of the race. Each
// seat shows a name and the one or two words the table shows for its work, never the task. A
// wave is a quiet ripple on its seat.

/// What the table views show, worked out once.
struct TableContent {
    let table: SessionActivityAttributes.Table
    let end: Date
    let now: Date
    let snapshot: SurfaceSnapshot

    func text(_ key: String) -> String { SurfaceText.string(key, language: snapshot.language) }

    var seats: [SessionActivityAttributes.Table.Seat] { Array(table.seats.prefix(4)) }

    /// The seat whose wave "Wave back" answers, while this person has a wave left to send.
    var waver: SessionActivityAttributes.Table.Seat? {
        guard table.nudgesLeft > 0, let id = table.wavedBy else { return nil }
        return table.seats.first { $0.id == id && !$0.you }
    }

    func name(_ seat: SessionActivityAttributes.Table.Seat) -> String {
        seat.you ? text("You") : seat.name ?? text("Someone")
    }

    /// Under a seat's name: that it waved, that it is done, or its work in a word or two.
    func label(_ seat: SessionActivityAttributes.Table.Seat) -> String? {
        if seat.waved { return text("waved") }
        if seat.done { return text("done") }
        return seat.label
    }

    var headline: String {
        table.seats.count < 2
            ? text("At a table")
            : String(format: text("%lld at the table"), table.seats.count)
    }

    /// The quiet second line: who waved, or that the chairs beside this one are empty.
    var subline: String? {
        if let seat = table.seats.first(where: { $0.waved && !$0.you }) {
            return String(format: text("%@ waved"), name(seat))
        }
        return table.seats.count < 2 ? text("Nobody else has sat down yet") : nil
    }

    /// Whether the table still has a clock to show; after it the hunt's own ending takes over.
    static func shows(_ state: SessionActivityAttributes.ContentState, at now: Date = Date()) -> Bool {
        guard state.table != nil, now < state.endDate else { return false }
        return state.hunt?.caughtAt == nil && state.hunt?.stoppedAt == nil
    }
}

/// The colours the seats are told apart by on the Island, the person's own first.
private let seatColours: [Color] = [
    SurfaceColor.tomato, SurfaceColor.butter,
    Color(red: 0.561, green: 0.722, blue: 0.576), Color(red: 0.498, green: 0.718, blue: 1.0),
]

private func colour(of seat: SessionActivityAttributes.Table.Seat, in content: TableContent) -> Color {
    if seat.you { return seatColours[0] }
    let others = content.seats.filter { !$0.you }
    let place = others.firstIndex { $0.id == seat.id } ?? 0
    return seatColours[1 + place % (seatColours.count - 1)]
}

/// One seat: Scootch at work as its critter, the name, and the word under it.
struct SeatTile: View {
    let seat: SessionActivityAttributes.Table.Seat
    let content: TableContent
    var compact = false

    private var pose: String {
        if seat.done { return content.snapshot.pose("Celebrating") }
        return content.snapshot.pose(seat.away ? "Asleep" : "Working")
    }

    var body: some View {
        VStack(spacing: 1) {
            SurfaceArt(source: .baked(pose))
                .frame(width: compact ? 26 : 28, height: compact ? 26 : 28)
                .opacity(seat.away ? 0.55 : 1)
                .background {
                    if seat.waved {
                        // The wave: two soft rings, still, since a Live Activity cannot animate.
                        Circle().stroke(SurfaceColor.butter.opacity(0.55), lineWidth: 1.5).scaleEffect(1.05)
                        Circle().stroke(SurfaceColor.butter.opacity(0.25), lineWidth: 1.5).scaleEffect(1.3)
                    }
                }
            Text(content.name(seat))
                .font(.system(compact ? .caption2 : .caption, design: .rounded).weight(.bold))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            if !compact, let label = content.label(seat) {
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(seat.waved ? SurfaceColor.butter : Color.white.opacity(0.62))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 3)
        .padding(.horizontal, 4)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(seat.you ? SurfaceColor.tomato.opacity(0.22) : Color.white.opacity(0.08))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(seat.you ? SurfaceColor.tomato.opacity(0.6) : .clear, lineWidth: 1)
        )
        .accessibilityElement(children: .ignore)
        .accessibilityLabel([content.name(seat), content.label(seat)].compactMap { $0 }.joined(separator: ", "))
    }
}

/// "Wave back" when someone waved and a wave is left to send, and "Leave table".
struct TableButtons: View {
    let content: TableContent

    var body: some View {
        HStack(spacing: 8) {
            if let waver = content.waver {
                Button(intent: WaveIntent(seatId: waver.id)) {
                    HuntPill(label: content.text("Wave back"), slim: true)
                }
            }
            Button(intent: LeaveTableIntent()) {
                HuntPill(label: content.text("Leave table"), slim: true)
            }
        }
        .buttonStyle(.plain)
    }
}

/// The time left on the table's clock, counted down by the system.
struct TableClock: View {
    let content: TableContent

    var body: some View {
        Text(timerInterval: min(content.now, content.end)...content.end, countsDown: true)
            .monospacedDigit()
            .multilineTextAlignment(.trailing)
    }
}

/// The Lock Screen at a table. A Live Activity is cut off past 160 points, so everything here is
/// kept small enough to stand inside that at the default text size.
struct TableLockScreenView: View {
    let content: TableContent

    var body: some View {
        VStack(spacing: 5) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 1) {
                    Text(content.headline)
                        .font(.system(.subheadline, design: .rounded).weight(.heavy))
                        .lineLimit(1)
                    if let subline = content.subline {
                        Text(subline).font(.caption2).foregroundStyle(Color.white.opacity(0.62)).lineLimit(1)
                    }
                }
                Spacer(minLength: 8)
                TableClock(content: content)
                    .font(.system(.headline, design: .rounded).weight(.heavy))
                    .foregroundStyle(SurfaceColor.tomato)
                    .frame(maxWidth: 90, alignment: .trailing)
            }
            HStack(spacing: 6) {
                ForEach(content.seats) { seat in SeatTile(seat: seat, content: content) }
            }
            TableButtons(content: content)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 14)
        .padding(.vertical, 7)
        // Larger text would push the buttons out of the card.
        .dynamicTypeSize(...DynamicTypeSize.large)
    }
}

/// Compact, on the Island: the seats as overlapping discs, the person's own on top.
struct TableSeatDiscs: View {
    let content: TableContent

    var body: some View {
        HStack(spacing: -6) {
            ForEach(content.seats) { seat in
                Circle()
                    .fill(colour(of: seat, in: content))
                    .frame(width: 14, height: 14)
                    .overlay(Circle().strokeBorder(Color.black, lineWidth: 1.5))
                    .opacity(seat.away ? 0.5 : 1)
            }
        }
    }
}

/// Expanded, on the Island: the seats, and the two buttons under them.
struct TableIslandSeats: View {
    let content: TableContent

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 6) {
                ForEach(content.seats) { seat in SeatTile(seat: seat, content: content, compact: true) }
            }
            TableButtons(content: content)
        }
    }
}
