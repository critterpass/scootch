import ExpoModulesCore
import UIKit

/// The app is upright on every iPhone. On iPhone Duo's inner display it may also turn to
/// landscape, which is how the desk stand stands the inner display upright (the Info.plist lists
/// landscape for this; app.config.ts). The outer display stays in portrait.
public class FoldOrientationAppDelegate: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?
  ) -> UIInterfaceOrientationMask {
    FoldOrientation.mask(for: window)
  }
}

enum FoldOrientation {
  /// iPhone Duo's inner display, in points, either way up.
  private static let inner = CGSize(width: 669, height: 951)

  static func mask(for window: UIWindow?) -> UIInterfaceOrientationMask {
    guard let screen = window?.windowScene?.screen.bounds.size else { return .portrait }
    let long = max(screen.width, screen.height)
    let short = min(screen.width, screen.height)
    let isInner = abs(long - inner.height) <= 1 && abs(short - inner.width) <= 1
    return isInner ? [.portrait, .landscapeLeft, .landscapeRight] : .portrait
  }
}
