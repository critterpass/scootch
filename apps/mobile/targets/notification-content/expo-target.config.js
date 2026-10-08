/**
 * What a long press on a monster's notification opens: its three bites, each a tick. It reads the
 * shared snapshot, so it needs the app's App Group, which follows the app variant and is read
 * from the app's own entitlements in app.config.ts.
 *
 * @type {import('@bacons/apple-targets').ConfigFunction}
 */
module.exports = (config) => ({
  type: 'notification-content',
  name: 'ScootchNotificationContent',
  bundleIdentifier: '.notification-content',
  // One minimum iOS version for the app and every target: IOS_DEPLOYMENT_TARGET in app.config.ts.
  deploymentTarget: config.ios.deploymentTarget,
  frameworks: ['UserNotifications', 'UserNotificationsUI', 'SwiftUI'],
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
  },
});
