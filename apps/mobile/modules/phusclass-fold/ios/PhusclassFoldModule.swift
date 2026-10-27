import ExpoModulesCore
import UIKit

/// The JavaScript side of the fold (modules/phusclass-fold/index.ts): the hinge's status and
/// angle, and the strip the system keeps clear where the screen folds. Sends `onFold` with each
/// change while something listens; `current()` reads it at once.
public class PhusclassFoldModule: Module {
  private var watcher: HingeWatcher?

  public func definition() -> ModuleDefinition {
    Name("PhusclassFold")

    Events("onFold")

    Function("current") { () -> [String: Any]? in
      HingeWatcher.onMain { HingeWatcher.reading(hinge: nil)?.dictionary }
    }

    OnStartObserving {
      DispatchQueue.main.async { [weak self] in
        guard let self, self.watcher == nil else { return }
        self.watcher = HingeWatcher { [weak self] reading in
          self?.sendEvent("onFold", reading.dictionary)
        }
      }
    }

    OnStopObserving {
      DispatchQueue.main.async { [weak self] in
        self?.watcher?.stop()
        self?.watcher = nil
      }
    }
  }
}
