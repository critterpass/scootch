/**
 * The App Clip: a native SwiftUI target with no JavaScript bundle. It shares the app's App Group so
 * the link it was opened with reaches the full app. The plugin adds the parent application
 * identifier itself.
 *
 * @type {import('@bacons/apple-targets').ConfigFunction}
 */
module.exports = (config) => ({
  type: 'clip',
  name: 'ScootchClip',
  displayName: 'Scootch',
  bundleIdentifier: '.Clip',
  // One minimum iOS version for the app and every target: IOS_DEPLOYMENT_TARGET in app.config.ts.
  deploymentTarget: config.ios.deploymentTarget,
  // The app's own icon (assets/render-app-icon.ts).
  icon: '../../assets/icon.png',
  exportJs: false,
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
    'com.apple.developer.associated-domains': config.ios.associatedDomains.filter((domain) =>
      domain.startsWith('appclips:'),
    ),
  },
});
