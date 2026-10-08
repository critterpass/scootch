import SwiftUI
import UIKit

/// The share sheet's controller: reads what was shared, shows it, and keeps it for the app with
/// the choice that was made. Nothing is sent anywhere from here.
final class ShareViewController: UIViewController {
    private var stage: ShareSheetView.Stage = .reading
    private var host: UIHostingController<ShareSheetView>?
    private let snapshot = SurfaceSnapshot.load().shown(at: Date())

    override func viewDidLoad() {
        super.viewDidLoad()
        let made = UIHostingController(rootView: sheet())
        addChild(made)
        made.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(made.view)
        NSLayoutConstraint.activate([
            made.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            made.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            made.view.topAnchor.constraint(equalTo: view.topAnchor),
            made.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        made.didMove(toParent: self)
        host = made

        let items = (extensionContext?.inputItems ?? []).compactMap { $0 as? NSExtensionItem }
        Task { @MainActor in
            let found = await SharedWords.read(items)
            show(found.map { .found($0) } ?? .nothing)
        }
    }

    private func sheet() -> ShareSheetView {
        ShareSheetView(
            stage: stage, language: snapshot.language, plain: snapshot.state == .crisis,
            keep: { [weak self] found, when in self?.keep(found, when) },
            close: { [weak self] in self?.finish() })
    }

    private func show(_ next: ShareSheetView.Stage) {
        stage = next
        host?.rootView = sheet()
    }

    private func keep(_ found: SharedWords.Found, _ when: SharedIn.When) {
        guard SharedIn.keep(found.text, kind: found.kind, when: when) else { return finish() }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        show(.kept(when))
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) { [weak self] in self?.finish() }
    }

    private func finish() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}
