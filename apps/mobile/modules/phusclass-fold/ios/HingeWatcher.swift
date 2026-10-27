import UIKit

/// What the fold is doing: the hinge's status and angle, and where the screen folds when the
/// system keeps a strip clear there (half open), in the window's points.
struct FoldReading: Sendable {
  /// `none` on a phone without a hinge (or a system before iOS 27.1); otherwise `unknown`,
  /// `closed`, `partial` or `open`.
  let status: String
  /// Degrees; 0 when the hinge does not say.
  let angle: Double
  let division: CGRect?

  static let noHinge = FoldReading(status: "none", angle: 0, division: nil)

  var dictionary: [String: Any] {
    var out: [String: Any] = ["status": status, "angle": angle]
    if let division {
      out["division"] = [
        "x": division.origin.x, "y": division.origin.y,
        "width": division.size.width, "height": division.size.height,
      ]
    }
    return out
  }
}

/// Watches the hinge with `UIHingeInteraction` on the app's key window, and reads the window's
/// division region (`reservedRegions(kind: .division)`) with every change. Both are iOS 27.1;
/// before it, and on a phone with no hinge, the reading is `none`.
@MainActor
final class HingeWatcher {
  private var interaction: UIInteraction?
  private weak var window: UIWindow?
  private let onChange: (FoldReading) -> Void
  private var attempts = 0

  /// The last reading the interaction gave, kept for `current()`.
  private static var last: FoldReading?

  init(onChange: @escaping (FoldReading) -> Void) {
    self.onChange = onChange
    attach()
  }

  func stop() {
    if let interaction, let window { window.removeInteraction(interaction) }
    interaction = nil
  }

  /// The reading now: the last status the hinge gave, with the fold's strip read again.
  static func current() -> FoldReading? {
    guard let window = keyWindow() else { return nil }
    guard #available(iOS 27.1, *) else { return .noHinge }
    guard let last, last.status != "none" else { return last ?? .noHinge }
    return FoldReading(status: last.status, angle: last.angle, division: division(in: window))
  }

  /// Runs on the main thread and returns its answer, from whichever thread asks.
  nonisolated static func onMain<T: Sendable>(_ read: @MainActor () -> T) -> T {
    if Thread.isMainThread { return MainActor.assumeIsolated(read) }
    return DispatchQueue.main.sync { MainActor.assumeIsolated(read) }
  }

  private func attach() {
    guard let window = HingeWatcher.keyWindow() else {
      // Asked before the first window is up: try again shortly, for a few seconds.
      attempts += 1
      if attempts < 20 {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
          MainActor.assumeIsolated { self?.attach() }
        }
      }
      return
    }
    self.window = window
    guard #available(iOS 27.1, *) else {
      HingeWatcher.last = .noHinge
      onChange(.noHinge)
      return
    }
    let made = UIHingeInteraction { [weak self] _, update in
      MainActor.assumeIsolated {
        let reading = HingeWatcher.reading(update.hinge, in: window)
        HingeWatcher.last = reading
        self?.onChange(reading)
      }
    }
    interaction = made
    window.addInteraction(made)
  }

  @available(iOS 27.1, *)
  private static func reading(_ hinge: UIHinge?, in window: UIWindow) -> FoldReading {
    // A nil hinge: the window is not in a hierarchy that has one (any other iPhone).
    guard let hinge else { return .noHinge }
    let status: String
    switch hinge.status {
    case .closed: status = "closed"
    case .partiallyOpen: status = "partial"
    case .fullyOpen: status = "open"
    default: status = "unknown"
    }
    return FoldReading(
      status: status, angle: Double(hinge.angle) * 180 / .pi, division: division(in: window))
  }

  /// The active division region of the window, in its points: where the screen folds.
  private static func division(in view: UIView) -> CGRect? {
    guard #available(iOS 27.1, *) else { return nil }
    return view.reservedRegions(kind: .division).first { $0.isActive }?.frame
  }

  private static func keyWindow() -> UIWindow? {
    let windows = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
    return windows.first { $0.isKeyWindow } ?? windows.first
  }
}
