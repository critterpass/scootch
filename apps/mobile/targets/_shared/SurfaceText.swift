import Foundation

/// Fixed labels, in the language the person chose in the app (the snapshot's), not the phone's.
/// The key is the English text, so a missing table still reads as English.
enum SurfaceText {
    /// Where the labels are. An extension carries its own; the app, which runs the intents,
    /// reads the widget extension's, so a label is written once.
    private static let labels: Bundle = {
        guard !Bundle.main.bundlePath.hasSuffix(".appex"),
            let widgets = Bundle.main.builtInPlugInsURL?.appendingPathComponent("ScootchWidgets.appex"),
            let bundle = Bundle(url: widgets)
        else { return .main }
        return bundle
    }()

    static func string(_ key: String, language: String) -> String {
        let code = language == "vi" ? "vi" : "en"
        guard let path = labels.path(forResource: code, ofType: "lproj"),
            let bundle = Bundle(path: path)
        else { return key }
        return bundle.localizedString(forKey: key, value: key, table: nil)
    }
}

extension SurfaceSnapshot {
    func text(_ key: String) -> String { SurfaceText.string(key, language: language) }
}
