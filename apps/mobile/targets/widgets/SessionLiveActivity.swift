import ActivityKit
import SwiftUI
import WidgetKit

/// What the hunt's Live Activity shows at one drawing: the record the activity carries, read at
/// this moment, joined with the shared snapshot for the task's monster, words and look.
///
/// The system draws an activity again only when it is updated or when its content goes stale, so
/// everything that moves between drawings (the clock, the bar filling) is a view the system
/// animates from two dates. Scootch's place on the bar and the monster's size are as of the
/// drawing.
struct HuntContent {
    let taskTitle: String
    let record: HuntRecord
    let view: HuntRecord.View
    let snapshot: SurfaceSnapshot
    let now: Date
    let offline: Bool
    private let stateLine: String
    private let lines: SurfaceSnapshot.HuntLines?
    private let lurker: SurfaceSnapshot.Lurker?
    private let isToday: Bool
    private let caught: SessionActivityAttributes.CaughtCard?

    /// `isStale` is whether the system is drawing the activity again past its stale date.
    init(
        attributes: SessionActivityAttributes, state: SessionActivityAttributes.ContentState,
        isStale: Bool, now: Date = Date()
    ) {
        let stored = SurfaceSnapshot.load()
        let nowMs = now.timeIntervalSince1970 * 1000
        let end = state.endDate.timeIntervalSince1970 * 1000
        let taskId = attributes.taskId ?? state.hunt?.taskId ?? stored.taskId ?? ""
        // An activity with no record is a plain running session that ends at its end date.
        let start = min(stored.taskId == taskId ? (stored.sessionStartedAt ?? nowMs) : nowMs, end)
        let record =
            state.hunt
            ?? HuntRecord(
                taskId: taskId, startedAt: start, beginsAt: start, endsAt: end, pausedAt: nil,
                parkedAt: nil, parkedText: nil, caughtAt: nil, stoppedAt: nil)
        self.record = record
        // Past the hour a folded card should be gone; until the system removes it, it stays folded.
        view =
            record.view(at: nowMs)
            ?? HuntRecord.View(
                phase: .caughtCollapsed, countIn: 0, remainingMs: 0, overMs: 0, progress: 1,
                monsterScale: HuntRecord.smallestMonster)
        snapshot = stored
        self.now = now
        taskTitle = attributes.taskTitle
        offline = state.offline ?? false
        lines = stored.huntLines(for: taskId)
        lurker = stored.lurker(for: taskId)
        isToday = stored.taskId == taskId
        caught = state.caught
        // The app's last update is the line. Once that has gone stale, the line planned for this
        // moment is, when the snapshot still describes this session.
        let planned = isStale && isToday ? stored.sessionLine(at: now) : nil
        stateLine = planned ?? state.line
    }

    var phase: HuntRecord.Phase { view.phase }

    /// A serious task has no monster, no race joke and only its plain words.
    var serious: Bool { isToday && snapshot.state == .serious }

    /// A caught hunt carries its own card; before that the snapshot knows the monster.
    var monsterName: String? {
        if let caught { return caught.name }
        return serious ? nil : (lurker?.name ?? (isToday ? snapshot.monsterName : nil))
    }

    var monsterPicture: UIImage? {
        let known = caught.map(\.image) ?? lurker?.image ?? (isToday ? snapshot.monsterImage : nil)
        guard !serious, let name = known, let folder = AppGroup.containerURL else { return nil }
        return UIImage(contentsOfFile: folder.appendingPathComponent(name).path)
    }

    func text(_ key: String) -> String { snapshot.text(key) }

    func text(_ key: String, _ arguments: CVarArg...) -> String {
        String(format: snapshot.text(key), arguments: arguments)
    }

    var beginDate: Date { Date(timeIntervalSince1970: record.beginsAt / 1000) }
    var endDate: Date { Date(timeIntervalSince1970: record.endsAt / 1000) }

    /// The minutes the clock ran before the hunt was caught or stopped.
    var minutesRun: Int {
        let until = record.caughtAt ?? record.stoppedAt ?? record.endsAt
        return max(1, Int(((until - record.beginsAt) / HuntRecord.minuteMs).rounded()))
    }

    var title: String {
        switch phase {
        case .stoppedEarly:
            return minutesRun == 1
                ? text("Stopped at 1 minute") : text("Stopped at %lld minutes", minutesRun)
        case .caught: return monsterName ?? taskTitle
        case .caughtCollapsed:
            return monsterName.map { text("%@ is on your shelf", $0) } ?? taskTitle
        default: return taskTitle
        }
    }

    var line: String {
        let own: String?
        switch phase {
        case .starting: own = lines?.start
        case .lastMinutes: own = lines?.lastMinutes
        case .overtime: own = lines?.overtime
        // The app sends the caught line with the card; a hunt nobody sent one for has the task's.
        case .caught, .caughtCollapsed: own = caught == nil ? lines?.caught : nil
        case .stoppedEarly: own = lines?.stoppedEarly
        case .running, .parked, .stuck: own = nil
        }
        return own ?? stateLine
    }

    /// The card's number as the shelf counts it, "0043".
    var cardNumber: String { String(format: "%04d", caught?.number ?? snapshot.shelf) }

    var caughtClock: String {
        guard let caughtAt = record.caughtAt else { return "" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: snapshot.language)
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: Date(timeIntervalSince1970: caughtAt / 1000))
    }

    /// Whether the clock is counting, so the system can animate the bar and the time by itself.
    var clockRuns: Bool { phase == .running || phase == .parked || phase == .lastMinutes }

    /// Scootch for this moment; the listening pose beside a serious task.
    var scootch: SurfaceArt.Source {
        if serious { return .baked("ScootchSerious") }
        switch phase {
        case .starting, .caught, .caughtCollapsed: return .baked(snapshot.pose("Celebrating"))
        case .stuck, .stoppedEarly: return .baked(snapshot.pose("Waiting"))
        default: return .baked(snapshot.pose("Working"))
        }
    }

    /// A caught monster has a card. A serious task has none, and neither has a task without one.
    var hasCard: Bool { !serious && monsterName != nil }

    /// Where a tap on the activity lands: the session while it runs, and once it is caught the
    /// card, or the one screen when there is no card. The session's own screen has nothing left
    /// to show by then.
    var destination: URL {
        guard phase == .caught || phase == .caughtCollapsed else { return SurfaceLinks.session }
        return hasCard ? SurfaceLinks.card(ofTask: record.taskId) : SurfaceLinks.home
    }

    /// The Island shows the race in every state that has a clock or a count-in. A parked thought
    /// has no receipt there, so the race stays.
    var islandShowsRace: Bool { clockRuns || phase == .overtime || phase == .starting }

    /// The monster is the picture while it is being run down; Scootch otherwise.
    var showsMonster: Bool {
        monsterPicture != nil && (clockRuns || phase == .stoppedEarly) && phase != .parked
    }
}

private let gold = Color(red: 1.0, green: 0.78, blue: 0.30)

/// The picture at the left: the monster at the size the hunt has brought it to, or Scootch.
struct HuntTile: View {
    let content: HuntContent
    var side: CGFloat = 48

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: side * 0.3, style: .continuous)
                .fill(Color.white.opacity(0.1))
            if content.showsMonster, let picture = content.monsterPicture {
                SurfaceArt(source: .picture(picture))
                    .padding(side * 0.12)
                    .scaleEffect(content.view.monsterScale, anchor: .bottom)
            } else {
                SurfaceArt(source: content.scootch).padding(side * 0.1)
            }
        }
        .frame(width: side, height: side)
    }
}

/// The time: counted down by the system, held while stuck, counted up in gold past the end.
struct HuntClock: View {
    let content: HuntContent
    var font: Font = .title2.weight(.heavy)

    var body: some View {
        switch content.phase {
        case .starting:
            Text("\(content.view.countIn)").font(font).foregroundStyle(SurfaceColor.accentOnDark)
        case .running, .parked, .lastMinutes:
            Text(timerInterval: min(content.now, content.endDate)...content.endDate, countsDown: true)
                .font(font)
                .monospacedDigit()
                .multilineTextAlignment(.trailing)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .foregroundStyle(SurfaceColor.accentOnDark)
        case .stuck:
            VStack(alignment: .trailing, spacing: 2) {
                Text(Self.clock(content.view.remainingMs)).font(font).monospacedDigit()
                Text(content.text("PAUSED"))
                    .font(.caption2.weight(.bold))
                    .tracking(1.5)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .foregroundStyle(.white.opacity(0.6))
        case .overtime:
            HStack(spacing: 0) {
                Text("+")
                Text(content.endDate, style: .timer).monospacedDigit()
            }
            .font(font)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .foregroundStyle(gold)
        case .caught, .caughtCollapsed, .stoppedEarly:
            EmptyView()
        }
    }

    static func clock(_ ms: Double) -> String {
        let seconds = Int((ms / 1000).rounded(.up))
        return String(format: "%d:%02d", seconds / 60, seconds % 60)
    }
}

/// The race: twelve pips that fill as the minutes go, with Scootch running along them.
struct RaceBar: View {
    let content: HuntContent
    /// A lower bar for the Island, where Scootch runs in the gap above it.
    var low = false
    private let pips = 12
    private var runner: CGFloat { low ? 18 : 20 }

    var body: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            ZStack(alignment: .bottomLeading) {
                track.foregroundStyle(Color.white.opacity(0.18))
                filled(width: width).mask(track)
                if content.phase != .starting && !content.serious {
                    SurfaceArt(source: .baked(content.snapshot.pose("Working")))
                        .frame(width: runner, height: runner)
                        .offset(x: (width - runner) * content.view.progress, y: -4)
                }
            }
            .frame(width: width, height: geometry.size.height, alignment: .bottomLeading)
        }
        .frame(height: low ? 14 : 24)
    }

    private var track: some View {
        HStack(spacing: 3) {
            ForEach(0..<pips, id: \.self) { _ in Capsule().frame(height: 5) }
            Circle().frame(width: 5, height: 5)
        }
    }

    @ViewBuilder private func filled(width: CGFloat) -> some View {
        if content.phase == .overtime {
            LinearGradient(
                colors: [SurfaceColor.accentOnDark, gold], startPoint: .leading, endPoint: .trailing
            )
            .frame(height: 5)
        } else if content.clockRuns {
            // Drawn by the system from the two dates, so it fills with no update from the app.
            ProgressView(timerInterval: content.beginDate...content.endDate, countsDown: false) {
                EmptyView()
            } currentValueLabel: {
                EmptyView()
            }
            .progressViewStyle(.linear)
            .tint(SurfaceColor.accentOnDark)
            .scaleEffect(x: 1, y: 3, anchor: .bottom)
            .frame(height: 5)
        } else {
            Rectangle()
                .fill(SurfaceColor.accentOnDark)
                .frame(width: width * content.view.progress, height: 5)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

/// One of the Live Activity's buttons: a pill, white when it is the way on.
struct HuntPill: View {
    let label: String
    var primary = false
    /// A shorter pill, where the Lock Screen's height is nearly spent.
    var slim = false
    /// On the caught card's light finishes, where the way on is ink and the other is paper.
    var onPaper = false

    var body: some View {
        Text(label)
            .font(.subheadline.weight(.bold))
            .lineLimit(1)
            .minimumScaleFactor(0.75)
            .frame(maxWidth: .infinity)
            .padding(.vertical, slim ? 7 : 10)
            .padding(.horizontal, 6)
            .background(Capsule().fill(fill))
            .foregroundStyle(primary == onPaper ? Color.white : SurfaceColor.ink)
    }

    private var fill: Color {
        if onPaper { return primary ? SurfaceColor.ink : Color.white.opacity(0.7) }
        return primary ? Color.white : Color.white.opacity(0.16)
    }
}

/// The buttons each state offers. They work without unlocking, except the ones whose work is the
/// app's to do, which open it.
struct HuntButtons: View {
    let content: HuntContent
    /// Shorter pills, under the race or the receipt on the Lock Screen.
    var slim = false
    /// On the caught card's own finish.
    var onPaper = false

    var body: some View {
        HStack(spacing: 8) {
            switch content.phase {
            case .starting:
                Button(intent: NotYetIntent()) { pill("Not yet") }
            case .running, .lastMinutes:
                Button(intent: ParkThoughtIntent()) { pill("Park a thought") }
                Button(intent: StuckIntent()) { pill("I'm stuck") }
            case .parked:
                Button(intent: ParkThoughtIntent()) { pill("Park another") }
                Button(intent: StuckIntent()) { pill("I'm stuck") }
            case .stuck:
                Button(intent: FirstLineIntent()) { pill("Give me a first line", primary: true) }
                Button(intent: MakeSmallerIntent()) { pill("Make it smaller") }
            case .overtime:
                Button(intent: FinishIntent()) { pill("Finish", primary: true) }
                Button(intent: FiveMoreIntent()) { pill("5 more") }
            case .caught:
                // No monster, no card: a serious task has nothing to share.
                if content.hasCard {
                    Link(destination: content.destination) { pill("Share card", primary: true) }
                }
                Link(destination: SurfaceLinks.home) { pill("Next thing") }
            case .stoppedEarly:
                Button(intent: TomorrowIntent()) { pill("Tomorrow 9:00") }
                Button(intent: KeepHereIntent()) { pill("Keep it here") }
            case .caughtCollapsed:
                EmptyView()
            }
        }
        .buttonStyle(.plain)
    }

    private func pill(_ label: String, primary: Bool = false) -> HuntPill {
        HuntPill(label: content.text(label), primary: primary, slim: slim, onPaper: onPaper)
    }
}

/// "Parked: "buy stamps". It's in the drawer.", for the four seconds after a thought is parked.
struct ParkedReceipt: View {
    let content: HuntContent

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill").foregroundStyle(SurfaceColor.accentOnDark)
            Text(words).font(.subheadline).lineLimit(1)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(SurfaceColor.accentOnDark.opacity(0.22)))
    }

    private var words: String {
        guard let thought = content.record.parkedText, !thought.isEmpty else {
            return content.text("Parked. It's in the drawer.")
        }
        return content.text("Parked: “%@”. It's in the drawer.", thought)
    }
}

/// The caught card: the whole activity in the finish the person wears, the monster on its own
/// panel and the two ways on beside its name. Its shine is drawn still.
struct CaughtCard: View {
    let content: HuntContent

    var body: some View {
        let finish = content.snapshot.finish
        let dark = FinishFill.isDark(finish)
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color.white.opacity(dark ? 0.14 : 0.45))
                if let picture = content.monsterPicture {
                    SurfaceArt(source: .picture(picture)).padding(10)
                }
            }
            .frame(width: 96)
            VStack(alignment: .leading, spacing: 0) {
                Text(caption)
                    .font(.caption2.weight(.bold).monospaced())
                    .tracking(0.8)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .opacity(0.7)
                // A long name takes a second line, and the line under it gives one up.
                Text(content.title)
                    .font(.title3.weight(.heavy))
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                    .padding(.top, 3)
                    .layoutPriority(1)
                Text(content.line).font(.footnote).lineLimit(2).opacity(0.8).padding(.top, 2)
                Spacer(minLength: 6)
                HuntButtons(content: content, slim: true, onPaper: !dark)
                    .fixedSize(horizontal: false, vertical: true)
                    .layoutPriority(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(height: HuntLockScreenView.tallest - 24)
        .foregroundStyle(dark ? Color.white : SurfaceColor.ink)
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(FinishFill(finish: finish))
    }

    private var caption: String {
        [
            content.text("CAUGHT"), content.text("%lld MIN", content.minutesRun),
            content.text("No. %@", content.cardNumber),
        ].joined(separator: " · ")
    }
}

/// The Lock Screen activity in every state of the hunt. A Live Activity is cut off past 160
/// points, so every state is kept inside that at the default text size.
struct HuntLockScreenView: View {
    /// The height the caught card is drawn at, just inside what the Lock Screen shows.
    static let tallest: CGFloat = 156

    let content: HuntContent

    var body: some View {
        Group {
            if content.phase == .caught && content.hasCard {
                CaughtCard(content: content)
            } else {
                plain.foregroundStyle(.white).padding(.horizontal, 16).padding(.vertical, 12)
            }
        }
        // Larger text would push the buttons out of the card.
        .dynamicTypeSize(...DynamicTypeSize.large)
    }

    @ViewBuilder private var plain: some View {
        switch content.phase {
        case .caughtCollapsed: collapsed
        // The race and the receipt leave room for one line and the shorter buttons.
        case .starting, .running, .lastMinutes, .overtime:
            VStack(spacing: 8) {
                header
                RaceBar(content: content)
                HuntButtons(content: content, slim: true)
            }
        case .parked:
            VStack(spacing: 8) {
                header
                ParkedReceipt(content: content)
                HuntButtons(content: content, slim: true)
            }
        // Stuck, stopped early, and caught with no monster and so no card: the words and the ways on.
        case .stuck, .stoppedEarly, .caught:
            VStack(spacing: 12) {
                header
                HuntButtons(content: content)
            }
        }
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            HuntTile(content: content)
            VStack(alignment: .leading, spacing: 1) {
                HStack(spacing: 6) {
                    Text(content.title).font(.headline).lineLimit(1)
                    if content.offline && content.clockRuns {
                        Text(content.text("OFFLINE"))
                            .font(.caption2.weight(.bold).monospaced())
                            .lineLimit(1)
                            .fixedSize()
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(Capsule().fill(Color.white.opacity(0.16)))
                    }
                }
                Text(content.line)
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.72))
                    .lineLimit(content.phase == .parked ? 1 : 2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            HuntClock(content: content)
        }
    }

    private var collapsed: some View {
        HStack(spacing: 12) {
            if content.hasCard, let picture = content.monsterPicture {
                SurfaceArt(source: .picture(picture))
                    .padding(5)
                    .frame(width: 40, height: 52)
                    .background(
                        FinishFill(finish: content.snapshot.finish)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
            VStack(alignment: .leading, spacing: 2) {
                // A long name takes a second line before it is cut short.
                Text(content.title).font(.headline).lineLimit(2).minimumScaleFactor(0.85)
                if content.hasCard {
                    Text(
                        content.text("No. %@", content.cardNumber) + " · "
                            + content.text("caught %@", content.caughtClock)
                    )
                    .font(.caption.monospaced())
                    .foregroundStyle(.white.opacity(0.6))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if content.hasCard {
                Link(destination: content.destination) {
                    HuntPill(label: content.text("Share"), primary: true).frame(width: 84)
                }
            }
        }
    }
}

// The Island opened out. iOS cuts it off at 160 points, and the camera takes the top of it: what
// is said starts under the camera, about 40 points down, and what is under that has some 55
// points left. So the words are smaller than on the Lock Screen and the race is lower.

/// How wide the Island's clock is drawn. The system's own timer text is cut short in a region
/// that sizes itself to it, so it is given its room.
let islandClockWidth: CGFloat = 68

/// The task and Scootch's line, under the camera. With the race below there is room for one line.
struct HuntIslandWords: View {
    let content: HuntContent

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(content.title).font(.subheadline.weight(.semibold)).lineLimit(1)
            Text(content.line)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.72))
                .lineLimit(content.islandShowsRace ? 1 : 2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .dynamicTypeSize(...DynamicTypeSize.large)
    }
}

/// The race and the buttons, at the foot of the Island.
struct HuntIslandFoot: View {
    let content: HuntContent

    var body: some View {
        VStack(spacing: 6) {
            if content.islandShowsRace { RaceBar(content: content, low: true) }
            HuntButtons(content: content, slim: content.islandShowsRace)
        }
        .dynamicTypeSize(...DynamicTypeSize.large)
    }
}

/// The right side of the compact Island, which carries the meaning at that size: the time, a
/// tick, a question, gold, a card.
struct HuntCompactTrailing: View {
    let content: HuntContent

    var body: some View {
        switch content.phase {
        case .starting:
            Text("\(content.view.countIn)").foregroundStyle(SurfaceColor.accentOnDark)
        case .running, .lastMinutes:
            Text(timerInterval: min(content.now, content.endDate)...content.endDate, countsDown: true)
                .monospacedDigit()
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 44)
                .foregroundStyle(SurfaceColor.accentOnDark)
        case .parked:
            Image(systemName: "checkmark.circle.fill").foregroundStyle(SurfaceColor.accentOnDark)
        case .stuck:
            Text("?").foregroundStyle(.white.opacity(0.7))
        case .overtime:
            HStack(spacing: 0) {
                Text("+")
                Text(content.endDate, style: .timer).monospacedDigit()
            }
            .frame(maxWidth: 52)
            .foregroundStyle(gold)
        case .caught, .caughtCollapsed:
            Image(systemName: "checkmark").foregroundStyle(gold)
        case .stoppedEarly:
            Image(systemName: "pause.fill").foregroundStyle(.white.opacity(0.7))
        }
    }
}

/// The circle iOS shows when another app's activity shares the Island: the ring filling as the
/// time is spent, or a mark for a state with no clock.
struct HuntMinimal: View {
    let content: HuntContent

    var body: some View {
        if content.clockRuns {
            ProgressView(timerInterval: content.beginDate...content.endDate, countsDown: false) {
                EmptyView()
            } currentValueLabel: {
                EmptyView()
            }
            .progressViewStyle(.circular)
            .tint(SurfaceColor.accentOnDark)
        } else {
            HuntCompactTrailing(content: content).font(.caption.weight(.bold))
        }
    }
}

extension HuntContent {
    init(context: ActivityViewContext<SessionActivityAttributes>, now: Date = Date()) {
        self.init(
            attributes: context.attributes, state: context.state, isStale: context.isStale, now: now)
    }
}

/// The hunt's Live Activity on the Lock Screen and in the Dynamic Island. A tap anywhere but the
/// buttons opens the session, or the card once the hunt is caught. On an Apple Watch the system shows the compact views in the Smart
/// Stack by itself.
struct SessionLiveActivity: Widget {
    /// The table, while the session is at one and its clock still runs.
    private func table(
        _ context: ActivityViewContext<SessionActivityAttributes>, _ content: HuntContent
    ) -> TableContent? {
        guard TableContent.shows(context.state, at: content.now), let table = context.state.table
        else { return nil }
        return TableContent(
            table: table, end: context.state.endDate, now: content.now, snapshot: content.snapshot)
    }

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SessionActivityAttributes.self) { context in
            let content = HuntContent(context: context)
            Group {
                if let seated = table(context, content) {
                    TableLockScreenView(content: seated)
                } else {
                    HuntLockScreenView(content: content)
                }
            }
            .activityBackgroundTint(SurfaceColor.glass.opacity(0.78))
            .activitySystemActionForegroundColor(.white)
            .widgetURL(content.destination)
        } dynamicIsland: { context in
            let content = HuntContent(context: context)
            let seated = table(context, content)
            return DynamicIsland {
                // At a table the headline and the clock sit beside the camera, as the board
                // draws them, which leaves the room under it to the seats and the buttons.
                DynamicIslandExpandedRegion(.leading) {
                    if let seated {
                        Text(seated.headline)
                            .font(.system(.subheadline, design: .rounded).weight(.heavy))
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                            .padding(.leading, 4)
                            .dynamicTypeSize(...DynamicTypeSize.large)
                    } else {
                        HuntTile(content: content, side: 52)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Group {
                        if let seated {
                            TableClock(content: seated)
                                .font(.title3.weight(.heavy))
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                        } else {
                            HuntClock(content: content, font: .title3.weight(.heavy))
                        }
                    }
                    .frame(width: islandClockWidth, alignment: .trailing)
                    .dynamicTypeSize(...DynamicTypeSize.large)
                }
                DynamicIslandExpandedRegion(.center) {
                    if seated == nil { HuntIslandWords(content: content) }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if let seated {
                        TableIslandSeats(content: seated)
                    } else {
                        HuntIslandFoot(content: content)
                    }
                }
            } compactLeading: {
                if let seated {
                    TableSeatDiscs(content: seated)
                } else {
                    SurfaceArt(source: content.scootch).frame(width: 24, height: 24)
                }
            } compactTrailing: {
                if let seated {
                    TableClock(content: seated).font(.caption.weight(.bold)).frame(maxWidth: 44)
                } else {
                    HuntCompactTrailing(content: content).font(.caption.weight(.bold))
                }
            } minimal: {
                if let seated {
                    Text("\(seated.table.seats.count)").font(.caption.weight(.heavy))
                } else {
                    HuntMinimal(content: content).frame(width: 22, height: 22)
                }
            }
            .keylineTint(content.phase == .overtime ? gold : SurfaceColor.accentOnDark)
            .widgetURL(content.destination)
        }
    }
}
