import ExpoModulesCore

/// The JavaScript side of the on-device model (modules/phusclass-intelligence/index.ts). This file
/// only maps calls; the model's work is in OnDeviceModel.
public class PhusclassIntelligenceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PhusclassIntelligence")

    Function("isAvailable") { () -> Bool in
      OnDeviceModel.isAvailable
    }

    AsyncFunction("splitTasks") { (text: String, lang: String) async -> [String]? in
      await OnDeviceModel.splitTasks(text, language: lang)
    }

    AsyncFunction("screenHint") { (text: String, lang: String) async -> String? in
      await OnDeviceModel.screenHint(text, language: lang)
    }
  }
}
