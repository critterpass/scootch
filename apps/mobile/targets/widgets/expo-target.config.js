/**
 * Home Screen and Lock Screen widgets and the session Live Activity. The App Group and Keychain
 * group follow the app variant, so they are read from the app's own entitlements in app.config.ts.
 *
 * @type {import('@bacons/apple-targets').ConfigFunction}
 */
module.exports = (config) => ({
  type: 'widget',
  name: 'PhusclassWidgets',
  displayName: "Phu's Class",
  bundleIdentifier: '.widgets',
  // One minimum iOS version for the app and every target: IOS_DEPLOYMENT_TARGET in app.config.ts.
  deploymentTarget: config.ios.deploymentTarget,
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
    'keychain-access-groups': config.ios.entitlements['keychain-access-groups'],
  },
});
