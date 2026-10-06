// Metro loads this file with Node's CommonJS loader, so it uses require and module.exports.
// Sentry's wrapper around Expo's default config adds debug ids to bundles and source maps, so a
// crash report matches the exact bundle that ran (the embedded one or an update).
// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS, see above
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// The store app is bundled without the developer screens: the router never sees the `(dev)`
// routes, so nothing they import (the screen registry, the developer tools) is in the bundle.
// The developer app and the app device runs install keep them.
if (process.env.APP_VARIANT === 'prd') {
  const developerRoutes = /[\\/]src[\\/]app[\\/]\(dev\)[\\/].*/;
  const blocked = config.resolver.blockList;
  config.resolver.blockList = [
    ...(Array.isArray(blocked) ? blocked : blocked ? [blocked] : []),
    developerRoutes,
  ];
}

module.exports = config;
