import ExpoModulesCore

/// The JavaScript side of the session Live Activity (modules/scootch-live-activity/index.ts).
/// This file only maps calls; the ActivityKit work is in SessionActivityController and
/// SessionPushTokens.
public class ScootchLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ScootchLiveActivity")

    Events("onPushToken", "onPushToStartToken")

    OnStartObserving {
      SessionPushTokens.shared.setSink { [weak self] activityId, token in
        if let activityId {
          self?.sendEvent("onPushToken", ["id": activityId, "token": token])
        } else {
          self?.sendEvent("onPushToStartToken", ["token": token])
        }
      }
      SessionPushTokens.shared.observeAll()
    }

    OnStopObserving {
      SessionPushTokens.shared.setSink(nil)
    }

    Function("areActivitiesEnabled") { () -> Bool in
      SessionActivityController.areActivitiesEnabled
    }

    AsyncFunction("start") {
      (attributes: [String: Any], state: [String: Any], options: [String: Any]?) throws -> String in
      try SessionActivityController.start(attributes: attributes, state: state, options: options)
    }

    AsyncFunction("update") {
      (id: String, state: [String: Any], options: [String: Any]?) async throws -> Bool in
      try await SessionActivityController.update(id: id, state: state, options: options)
    }

    AsyncFunction("end") {
      (id: String, finalState: [String: Any]?, dismissAfterSeconds: Double?) async throws -> Bool in
      try await SessionActivityController.end(
        id: id, finalState: finalState, dismissAfterSeconds: dismissAfterSeconds)
    }

    AsyncFunction("listActive") { () -> [[String: Any]] in
      SessionActivityController.listActive()
    }

    // The monsters Siri and Spotlight offer by name are the app target's to refresh
    // (targets/widgets/_shared/WaysToStart.swift). A module cannot see that type, so it is
    // reached by name; a binary without it does nothing.
    Function("refreshShortcuts") {
      DispatchQueue.main.async {
        let refresher = NSClassFromString("ScootchShortcutsRefresher") as? NSObject.Type
        _ = refresher?.perform(NSSelectorFromString("refresh"))
      }
    }
  }
}
