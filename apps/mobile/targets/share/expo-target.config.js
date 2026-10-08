/**
 * The share sheet: words, a link or a picture from another app are kept for Scootch. It writes
 * to the app's App Group, which follows the app variant and is read from the app's own
 * entitlements in app.config.ts.
 *
 * @type {import('@bacons/apple-targets').ConfigFunction}
 */
module.exports = (config) => ({
  type: 'share',
  name: 'ScootchShare',
  displayName: 'Scootch',
  bundleIdentifier: '.share',
  // One minimum iOS version for the app and every target: IOS_DEPLOYMENT_TARGET in app.config.ts.
  deploymentTarget: config.ios.deploymentTarget,
  // The app's own icon, which the share sheet shows beside the name.
  icon: '../../assets/icons/cheeky.png',
  frameworks: ['SwiftUI', 'Vision', 'UniformTypeIdentifiers'],
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
  },
});
