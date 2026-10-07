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

    init(context: ActivityViewContext<SessionActivityAttributes>, now: Date = Date()) {
        let state = context.state
        let stored = SurfaceSnapshot.load()
        let nowMs = now.timeIntervalSince1970 * 1000
        let end = state.endDate.timeIntervalSince1970 * 1000
        let taskId = context.attributes.taskId ?? state.hunt?.taskId ?? stored.taskId ?? ""
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
        taskTitle = context.attributes.taskTitle
        offline = state.offline ?? false
        lines = stored.huntLines(for: taskId)
        lurker = stored.lurker(for: taskId)
        isToday = stored.taskId == taskId
        caught = state.caught
        // The app's last update is the line. Once that has gone stale, the line planned for this
        // moment is, when the snapshot still describes this session.
        let planned = context.isStale && isToday ? stored.sessionLine(at: now) : nil
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

    /// The monster is the picture while it is being run down; Scootch otherwise.
    var showsMonster: Bool {
        monsterPicture != nil && (clockRuns || phase == .stoppedEarly) && phase != .parked
    }
}

private let gold = Color(red: 1.0, green: 0.78, blue: 0.30)

/// The picture at the left: the monster at the size the hunt has brought it to, or Scootch.
struct HuntTile: View {
    let content: HuntContent
    var side: CGFloat = 56

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
            Text("\(content.view.countIn)").font(font).foregroundStyle(SurfaceColor.accent)
        case .running, .parked, .lastMinutes:
            Text(timerInterval: min(content.now, content.endDate)...content.endDate, countsDown: true)
                .font(font)
                .monospacedDigit()
                .multilineTextAlignment(.trailing)
                .foregroundStyle(SurfaceColor.accent)
        case .stuck:
            VStack(alignment: .trailing, spacing: 2) {
                Text(Self.clock(content.view.remainingMs)).font(font).monospacedDigit()
                Text(content.text("PAUSED")).font(.caption2.weight(.bold)).tracking(1.5)
            }
            .foregroundStyle(.white.opacity(0.6))
        case .overtime:
            HStack(spacing: 0) {
                Text("+")
                Text(content.endDate, style: .timer).monospacedDigit()
            }
            .font(font)
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
    private let pips = 12
    private let runner: CGFloat = 22

    var body: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            ZStack(alignment: .bottomLeading) {
                track.foregroundStyle(Color.white.opacity(0.18))
                filled(width: width).mask(track)
                if content.phase != .starting && !content.serious {
                    SurfaceArt(source: .baked(content.snapshot.pose("Working")))
                        .frame(width: runner, height: runner)
                        .offset(x: (width - runner) * content.view.progress, y: -7)
                }
            }
            .frame(width: width, height: geometry.size.height, alignment: .bottomLeading)
        }
        .frame(height: 28)
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
                colors: [SurfaceColor.accent, gold], startPoint: .leading, endPoint: .trailing
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
            .tint(SurfaceColor.accent)
            .scaleEffect(x: 1, y: 3, anchor: .bottom)
            .frame(height: 5)
        } else {
            Rectangle()
                .fill(SurfaceColor.accent)
                .frame(width: width * content.view.progress, height: 5)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

/// One of the Live Activity's buttons: a pill, white when it is the way on.
struct HuntPill: View {
    let label: String
    var primary = false

    var body: some View {
        Text(label)
            .font(.subheadline.weight(.bold))
            .lineLimit(1)
            .minimumScaleFactor(0.75)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(Capsule().fill(primary ? Color.white : Color.white.opacity(0.16)))
            .foregroundStyle(primary ? SurfaceColor.ink : Color.white)
    }
}

/// The buttons each state offers. They work without unlocking, except the ones whose work is the
/// app's to do, which open it.
struct HuntButtons: View {
    let content: HuntContent

    var body: some View {
        HStack(spacing: 8) {
            switch content.phase {
            case .starting:
                Button(intent: NotYetIntent()) { HuntPill(label: content.text("Not yet")) }
            case .running, .lastMinutes:
                Button(intent: ParkThoughtIntent()) { HuntPill(label: content.text("Park a thought")) }
                Button(intent: StuckIntent()) { HuntPill(label: content.text("I'm stuck")) }
            case .parked:
                Button(intent: ParkThoughtIntent()) { HuntPill(label: content.text("Park another")) }
                Button(intent: StuckIntent()) { HuntPill(label: content.text("I'm stuck")) }
            case .stuck:
                Button(intent: FirstLineIntent()) {
                    HuntPill(label: content.text("Give me a first line"), primary: true)
                }
                Button(intent: MakeSmallerIntent()) { HuntPill(label: content.text("Make it smaller")) }
            case .overtime:
                Button(intent: FinishIntent()) { HuntPill(label: content.text("Finish"), primary: true) }
                Button(intent: FiveMoreIntent()) { HuntPill(label: content.text("5 more")) }
            case .caught:
                // No monster, no card: a serious task has nothing to share.
                if !content.serious && content.monsterName != nil {
                    Link(destination: SurfaceLinks.cards) {
                        HuntPill(label: content.text("Share card"), primary: true)
                    }
                }
                Link(destination: SurfaceLinks.home) { HuntPill(label: content.text("Next thing")) }
            case .stoppedEarly:
                Button(intent: TomorrowIntent()) { HuntPill(label: content.text("Tomorrow 9:00")) }
                Button(intent: KeepHereIntent()) { HuntPill(label: content.text("Keep it here")) }
            case .caughtCollapsed:
                EmptyView()
            }
        }
        .buttonStyle(.plain)
    }
}

/// "Parked: "buy stamps". It's in the drawer.", for the four seconds after a thought is parked.
struct ParkedReceipt: View {
    let content: HuntContent

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill").foregroundStyle(SurfaceColor.accent)
            Text(words).font(.subheadline).lineLimit(1)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(SurfaceColor.accent.opacity(0.22)))
    }

    private var words: String {
        guard let thought = content.record.parkedText, !thought.isEmpty else {
            return content.text("Parked. It's in the drawer.")
        }
        return content.text("Parked: “%@”. It's in the drawer.", thought)
    }
}

/// The caught card in the finish the person wears. Its shine is drawn still.
struct CaughtCard: View {
    let content: HuntContent

    var body: some View {
        let look = content.snapshot.look
        let dark = FinishFill.isDark(look.finish)
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .top) {
                Text(caption)
                    .font(.caption2.weight(.bold).monospaced())
                    .tracking(0.8)
                    .opacity(0.7)
                Spacer(minLength: 8)
                if let picture = content.monsterPicture {
                    SurfaceArt(source: .picture(picture)).frame(width: 54, height: 54)
                }
            }
            Text(content.title).font(.title3.weight(.heavy)).lineLimit(1)
            Text(content.line).font(.subheadline).lineLimit(2).opacity(0.8)
        }
        .foregroundStyle(dark ? Color.white : look.inkColour)
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(FinishFill(finish: look.finish, paper: look.paper))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var caption: String {
        [
            content.text("CAUGHT"), content.text("%lld MIN", content.minutesRun),
            content.text("No. %@", content.cardNumber),
        ].joined(separator: " · ")
    }
}

/// The Lock Screen activity in every state of the hunt.
struct HuntLockScreenView: View {
    let content: HuntContent

    var body: some View {
        Group {
            switch content.phase {
            case .caught: caught
            case .caughtCollapsed: collapsed
            default: running
            }
        }
        .foregroundStyle(.white)
        .padding(16)
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            HuntTile(content: content)
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(content.title).font(.headline).lineLimit(1)
                    if content.offline && content.clockRuns {
                        Text(content.text("OFFLINE"))
                            .font(.caption2.weight(.bold).monospaced())
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(Capsule().fill(Color.white.opacity(0.16)))
                    }
                }
                Text(content.line)
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.72))
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            HuntClock(content: content)
        }
    }

    private var running: some View {
        VStack(spacing: 12) {
            header
            if content.phase != .stuck && content.phase != .stoppedEarly {
                RaceBar(content: content)
            }
            if content.phase == .parked { ParkedReceipt(content: content) }
            HuntButtons(content: content)
        }
    }

    @ViewBuilder private var caught: some View {
        if content.serious || content.monsterName == nil {
            // No monster, so no card: the plain words and the way on.
            VStack(spacing: 12) {
                header
                HuntButtons(content: content)
            }
        } else {
            VStack(spacing: 12) {
                CaughtCard(content: content)
                HuntButtons(content: content)
            }
        }
    }

    private var collapsed: some View {
        HStack(spacing: 12) {
            if !content.serious, let picture = content.monsterPicture {
                SurfaceArt(source: .picture(picture))
                    .padding(5)
                    .frame(width: 40, height: 52)
                    .background(
                        FinishFill(
                            finish: content.snapshot.look.finish, paper: content.snapshot.look.paper)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(content.title).font(.headline).lineLimit(1)
                if !content.serious && content.monsterName != nil {
                    Text(
                        content.text("No. %@", content.cardNumber) + " · "
                            + content.text("caught %@", content.caughtClock)
                    )
                    .font(.caption.monospaced())
                    .foregroundStyle(.white.opacity(0.6))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if !content.serious && content.monsterName != nil {
                Link(destination: SurfaceLinks.cards) {
                    HuntPill(label: content.text("Share"), primary: true).frame(width: 84)
                }
            }
        }
    }
}

/// The right side of the compact Island, which carries the meaning at that size: the time, a
/// tick, a question, gold, a card.
struct HuntCompactTrailing: View {
    let content: HuntContent

    var body: some View {
        switch content.phase {
        case .starting:
            Text("\(content.view.countIn)").foregroundStyle(SurfaceColor.accent)
        case .running, .lastMinutes:
            Text(timerInterval: min(content.now, content.endDate)...content.endDate, countsDown: true)
                .monospacedDigit()
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 44)
                .foregroundStyle(SurfaceColor.accent)
        case .parked:
            Image(systemName: "checkmark.circle.fill").foregroundStyle(SurfaceColor.accent)
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
            .tint(SurfaceColor.accent)
        } else {
            HuntCompactTrailing(content: content).font(.caption.weight(.bold))
        }
    }
}

/// The hunt's Live Activity on the Lock Screen and in the Dynamic Island. A tap anywhere but the
/// buttons opens the session. On an Apple Watch the system shows the compact views in the Smart
/// Stack by itself.
struct SessionLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SessionActivityAttributes.self) { context in
            HuntLockScreenView(content: HuntContent(context: context))
                .activityBackgroundTint(SurfaceColor.glass.opacity(0.78))
                .activitySystemActionForegroundColor(.white)
                .widgetURL(SurfaceLinks.session)
        } dynamicIsland: { context in
            let content = HuntContent(context: context)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HuntTile(content: content, side: 52)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    HuntClock(content: content, font: .title3.weight(.heavy))
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(content.title).font(.headline).lineLimit(1)
                        Text(content.line)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 8) {
                        if content.clockRuns || content.phase == .overtime
                            || content.phase == .starting
                        {
                            RaceBar(content: content)
                        }
                        HuntButtons(content: content)
                    }
                }
            } compactLeading: {
                SurfaceArt(source: content.scootch).frame(width: 24, height: 24)
            } compactTrailing: {
                HuntCompactTrailing(content: content).font(.caption.weight(.bold))
            } minimal: {
                HuntMinimal(content: content).frame(width: 22, height: 22)
            }
            .keylineTint(content.phase == .overtime ? gold : SurfaceColor.accent)
            .widgetURL(SurfaceLinks.session)
        }
    }
}
