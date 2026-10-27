import UIKit

/// What the fold is doing: the hinge's status and angle, and where the screen folds when the
/// system keeps a strip clear there (half open), in the window's points.
struct FoldReading {
  /// `none` on a phone without a hinge (or a system without the API); otherwise `unknown`,
  /// `closed`, `partial` or `open`.
  let status: String
  /// Degrees; 0 when the hinge does not say.
  let angle: Double
  let division: CGRect?

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
/// division region (`reservedRegions(kind: .division)`) with every change.
///
/// Both APIs are new in iOS 27.1, and the app is also built with SDKs that do not declare them,
/// so they are reached through the Objective-C runtime by name: on a system without them the
/// watcher reports `none` and the app lays out by its window size alone.
final class HingeWatcher: NSObject {
  private var interaction: UIInteraction?
  private weak var window: UIWindow?
  private let onChange: (FoldReading) -> Void
  private var attempts = 0

  /// The hinge as last reported, kept for `current()`.
  private static var lastHinge: NSObject?
  private static var hasHinge = false

  init(onChange: @escaping (FoldReading) -> Void) {
    self.onChange = onChange
    super.init()
    attach()
  }

  func stop() {
    if let interaction, let window { window.removeInteraction(interaction) }
    interaction = nil
  }

  /// The reading now. With no hinge given, the last one the interaction reported.
  static func reading(hinge: NSObject?) -> FoldReading? {
    guard let window = keyWindow() else { return nil }
    guard NSClassFromString("UIHingeInteraction") != nil else {
      return FoldReading(status: "none", angle: 0, division: nil)
    }
    let hinge = hinge ?? lastHinge
    guard let hinge else {
      return FoldReading(status: hasHinge ? "unknown" : "none", angle: 0, division: nil)
    }
    let raw = (hinge.value(forKey: "status") as? Int) ?? 0
    let status = [1: "closed", 2: "partial", 3: "open"][raw] ?? "unknown"
    let radians = (hinge.value(forKey: "angle") as? Double) ?? 0
    return FoldReading(
      status: status, angle: radians * 180 / .pi, division: division(in: window))
  }

  static func onMain<T>(_ read: () -> T) -> T {
    Thread.isMainThread ? read() : DispatchQueue.main.sync(execute: read)
  }

  private func attach() {
    guard let window = HingeWatcher.keyWindow() else {
      // Asked before the first window is up: try again shortly, for a few seconds.
      attempts += 1
      if attempts < 20 {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in self?.attach() }
      }
      return
    }
    self.window = window
    guard let made = HingeWatcher.makeInteraction(onUpdate: { [weak self] update in
      let hinge = update.value(forKey: "hinge") as? NSObject
      HingeWatcher.lastHinge = hinge
      if hinge != nil { HingeWatcher.hasHinge = true }
      guard let self, let reading = HingeWatcher.reading(hinge: hinge) else { return }
      self.onChange(hinge == nil ? FoldReading(status: "none", angle: 0, division: nil) : reading)
    }) else {
      onChange(FoldReading(status: "none", angle: 0, division: nil))
      return
    }
    interaction = made
    window.addInteraction(made)
  }

  /// `UIHingeInteraction(updateHandler:)`, made by name: alloc, then `initWithUpdateHandler:`,
  /// which consumes what alloc returned and returns its own retained object.
  private static func makeInteraction(onUpdate: @escaping (NSObject) -> Void) -> UIInteraction? {
    guard let cls = NSClassFromString("UIHingeInteraction") as? NSObject.Type else { return nil }
    let initSelector = NSSelectorFromString("initWithUpdateHandler:")
    guard cls.instancesRespond(to: initSelector),
      let implementation = class_getMethodImplementation(cls, initSelector)
    else { return nil }
    typealias Handler = @convention(block) (AnyObject, AnyObject) -> Void
    typealias Initializer =
      @convention(c) (UnsafeRawPointer, Selector, Handler) -> UnsafeRawPointer?
    let initialize = unsafeBitCast(implementation, to: Initializer.self)
    let handler: Handler = { _, update in
      if let update = update as? NSObject { onUpdate(update) }
    }
    guard let allocated = (cls as AnyObject).perform(NSSelectorFromString("alloc")),
      let made = initialize(allocated.toOpaque(), initSelector, handler)
    else { return nil }
    return Unmanaged<AnyObject>.fromOpaque(made).takeRetainedValue() as? UIInteraction
  }

  /// The active division region of the window, in its points: where the screen folds.
  private static func division(in view: UIView) -> CGRect? {
    guard let kindClass = NSClassFromString("UIViewReservedRegionKind") else { return nil }
    let kindSelector = NSSelectorFromString("divisionRegionKind")
    let regionsSelector = NSSelectorFromString("reservedRegionsOfKind:")
    guard (kindClass as AnyObject).responds(to: kindSelector),
      view.responds(to: regionsSelector),
      let kind = (kindClass as AnyObject).perform(kindSelector)?.takeUnretainedValue(),
      let regions = view.perform(regionsSelector, with: kind)?.takeUnretainedValue()
        as? [NSObject]
    else { return nil }
    for region in regions where (region.value(forKey: "active") as? Bool) ?? false {
      if let frame = region.value(forKey: "frame") as? NSValue { return frame.cgRectValue }
    }
    return nil
  }

  private static func keyWindow() -> UIWindow? {
    let windows = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
    return windows.first { $0.isKeyWindow } ?? windows.first
  }
}
