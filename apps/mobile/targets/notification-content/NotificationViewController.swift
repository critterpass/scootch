import SwiftUI
import UIKit
import UserNotifications
import UserNotificationsUI

/// The long press on a monster's notification. It shows the thing's three bites when it has
/// them, and renames the three actions for the monster; with no bites it shows nothing of its
/// own and the three actions stand alone. Ticking a bite is kept at once; the last one opens
/// Scootch, where the catch is.
final class NotificationViewController: UIViewController, UNNotificationContentExtension {
    private var taskId: String?
    private var host: UIHostingController<AnyView>?

    func didReceive(_ notification: UNNotification) {
        taskId = notification.request.content.userInfo["taskId"] as? String
        draw()
    }

    /// The actions are the app's to answer: each is passed on.
    func didReceive(
        _ response: UNNotificationResponse,
        completionHandler completion: @escaping (UNNotificationContentExtensionResponseOption) -> Void
    ) {
        completion(.dismissAndForwardAction)
    }

    private func draw() {
        let model = BitesModel.load(taskId: taskId)
        rename(for: model)
        guard let model else {
            host?.view.removeFromSuperview()
            host = nil
            preferredContentSize = CGSize(width: view.bounds.width, height: 1)
            return
        }
        let content = AnyView(BitesView(model: model) { [weak self] bite in self?.tick(bite) })
        if let host {
            host.rootView = content
        } else {
            let made = UIHostingController(rootView: content)
            made.view.backgroundColor = .clear
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
        }
        let width = view.bounds.width > 0 ? view.bounds.width : UIScreen.main.bounds.width
        let fitted = host?.sizeThatFits(in: CGSize(width: width, height: .greatestFiniteMagnitude))
        preferredContentSize = CGSize(width: width, height: fitted?.height ?? 320)
    }

    private func tick(_ bite: SurfaceSnapshot.Bite) {
        guard BiteTicks.tick(bite) else { return }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        draw()
        // The last bite: the thing is done but for the catch, and the catch is in Scootch.
        if BitesModel.load(taskId: taskId)?.left.isEmpty == true {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) { [weak self] in
                self?.extensionContext?.performNotificationDefaultAction()
            }
        }
    }

    /// The actions in the monster's name, with the next bite's minutes on the first.
    private func rename(for model: BitesModel?) {
        guard let context = extensionContext else { return }
        let snapshot = SurfaceSnapshot.load().shown(at: Date())
        let name = model?.monsterName ?? taskId.flatMap { snapshot.lurker(for: $0)?.name }
        let text = { (key: String) in SurfaceText.string(key, language: snapshot.language) }
        context.notificationActions = context.notificationActions.map { action in
            let title: String
            switch action.identifier {
            case "scootch.hunt.now":
                title = model?.next.map {
                    String(format: text("Hunt the next bite now · %lld min"), $0.minutes)
                } ?? text("Hunt it now")
            case "scootch.hunt.tomorrow":
                title = text("Tomorrow at 9:00")
            case "scootch.hunt.turn-down":
                title = name.map { String(format: text("Turn %@ down for a week"), $0) } ?? action.title
            default:
                title = action.title
            }
            return UNNotificationAction(identifier: action.identifier, title: title, options: action.options)
        }
    }
}
