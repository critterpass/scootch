/**
 * Home Screen and Lock Screen widgets, the session Live Activity and the Control Center control.
 * The App Group and Keychain group follow the app variant, so they are read from the app's own
 * entitlements in app.config.ts.
 *
 * @type {import('@bacons/apple-targets').ConfigFunction}
 */
module.exports = (config) => ({
  type: 'widget',
  name: 'ScootchWidgets',
  displayName: 'Scootch',
  bundleIdentifier: '.widgets',
  deploymentTarget: '16.4',
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
    'keychain-access-groups': config.ios.entitlements['keychain-access-groups'],
  },
});
