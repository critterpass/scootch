import ExpoModulesCore
import UIKit

/// The JavaScript side of the app icon (modules/app-icon/index.ts). The icons themselves are
/// declared in the app's asset catalogue by app.config.ts; this only asks the system to show one.
public class ScootchAppIconModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ScootchAppIcon")

    Function("supported") { () -> Bool in
      AppIcon.onMain { UIApplication.shared.supportsAlternateIcons }
    }

    Function("current") { () -> String? in
      AppIcon.onMain { UIApplication.shared.alternateIconName }
    }

    AsyncFunction("set") { (name: String?) async throws in
      try await AppIcon.set(name)
    }
  }
}

enum AppIcon {
  /// Reads something of the application, which is the main thread's to answer.
  static func onMain<T>(_ read: () -> T) -> T {
    Thread.isMainThread ? read() : DispatchQueue.main.sync(execute: read)
  }

  /// Asks the system for the icon. The system shows its own alert and throws when it refuses.
  @MainActor
  static func set(_ name: String?) async throws {
    guard UIApplication.shared.supportsAlternateIcons,
      UIApplication.shared.alternateIconName != name
    else { return }
    try await UIApplication.shared.setAlternateIconName(name)
  }
}
