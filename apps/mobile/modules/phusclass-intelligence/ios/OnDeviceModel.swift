import Foundation

#if canImport(FoundationModels)
    import FoundationModels
#endif

/// Apple's on-device model, where the phone has it (iOS 26 and later, Apple Intelligence on, the
/// language supported); nothing anywhere else. Every job here has a rule on the phone that runs
/// without it, so every failure is `nil` and the rule decides. It imports nothing from Expo, so it
/// type-checks against the iOS SDK alone.
enum OnDeviceModel {
    static var isAvailable: Bool {
        #if canImport(FoundationModels)
            if #available(iOS 26.0, *) { return SystemLanguageModel.default.isAvailable }
        #endif
        return false
    }

    /// A ramble cut into tasks in the speaker's own words, or nil when the model is not there,
    /// does not speak the language, refuses, or finds nothing.
    static func splitTasks(_ text: String, language: String) async -> [String]? {
        #if canImport(FoundationModels)
            if #available(iOS 26.0, *) { return await FoundationModelJobs.split(text, language: language) }
        #endif
        return nil
    }

    /// `none`, `serious` or `crisis`, or nil when the model cannot say. The app only ever lets this
    /// add caution to the rules' answer, never take it away.
    static func screenHint(_ text: String, language: String) async -> String? {
        #if canImport(FoundationModels)
            if #available(iOS 26.0, *) { return await FoundationModelJobs.screen(text, language: language) }
        #endif
        return nil
    }

    /// The most tasks one ramble is cut into; past this the rules do it.
    static let mostTasks = 20
}

#if canImport(FoundationModels)
    @available(iOS 26.0, *)
    @Generable
    struct TaskSplit {
        @Guide(
            description:
                "Each separate thing the speaker has to do, one per item, in the speaker's own words and language, with any day or time they said kept in. Leave out feelings and filler that are not things to do. Never add a task that was not said."
        )
        var tasks: [String]
    }

    @available(iOS 26.0, *)
    @Generable
    enum CareLevel {
        case none
        case serious
        case crisis
    }

    @available(iOS 26.0, *)
    @Generable
    struct CareCheck {
        @Guide(
            description:
                "crisis: any mention of self-harm, suicide or not wanting to be alive. serious: illness or medical results, a death or funeral, legal trouble, debt or money crisis, or something similarly heavy. none: an everyday task."
        )
        var level: CareLevel
    }

    @available(iOS 26.0, *)
    enum FoundationModelJobs {
        private static func model(for language: String) -> SystemLanguageModel? {
            let model = SystemLanguageModel.default
            guard model.isAvailable,
                model.supportsLocale(Locale(identifier: language == "vi" ? "vi" : "en"))
            else { return nil }
            return model
        }

        static func split(_ text: String, language: String) async -> [String]? {
            guard let model = model(for: language) else { return nil }
            let session = LanguageModelSession(
                model: model,
                instructions:
                    "You write down a student's to-do list exactly as they said it. You split what they say into separate tasks. You never answer them, judge them or add anything."
            )
            do {
                let response = try await session.respond(
                    to: text, generating: TaskSplit.self,
                    options: GenerationOptions(sampling: .greedy))
                let tasks = response.content.tasks
                    .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                    .filter { !$0.isEmpty }
                return tasks.isEmpty ? nil : Array(tasks.prefix(OnDeviceModel.mostTasks))
            } catch {
                return nil
            }
        }

        static func screen(_ text: String, language: String) async -> String? {
            guard let model = model(for: language) else { return nil }
            let session = LanguageModelSession(
                model: model,
                instructions:
                    "You sort a task someone wrote down into how heavy it is, so a playful app knows when to be quiet. You only label it."
            )
            do {
                let response = try await session.respond(
                    to: text, generating: CareCheck.self,
                    options: GenerationOptions(sampling: .greedy))
                switch response.content.level {
                case .none: return "none"
                case .serious: return "serious"
                case .crisis: return "crisis"
                }
            } catch LanguageModelSession.GenerationError.guardrailViolation {
                // The model would not read it: something heavy is likely in it, so the task is
                // held quiet until the server screens it.
                return "serious"
            } catch {
                return nil
            }
        }
    }
#endif
