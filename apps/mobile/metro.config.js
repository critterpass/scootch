// Metro loads this file with Node's CommonJS loader, so it uses require and module.exports.
// Sentry's wrapper around Expo's default config adds debug ids to bundles and source maps, so a
// crash report matches the exact bundle that ran (the embedded one or an update).
// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS, see above
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
