import type { ConfigContext, ExpoConfig } from 'expo/config';

// Read as JSON because the config loader runs under plain Node, which cannot load the tokens
// package's TypeScript source.
import palettes from '../../packages/tokens/src/colors.json' with { type: 'json' };

/** Two environments, dev and prd. `e2e-test` is the dev app as device runs install it. */
type AppVariant = 'dev' | 'prd' | 'e2e-test';

interface VariantConfig {
  name: string;
  /** The extensions and the App Clip sit beneath it (targets/<name>/expo-target.config.js). */
  bundleIdentifier: string;
  /** Shared by the app, its extensions and the App Clip (targets/_shared/AppGroup.swift). */
  appGroup: string;
  scheme: string;
  /** Over-the-air updates. Off for device runs, which swap in the commit's own bundle. */
  updates: boolean;
}

const EAS_PROJECT_ID = '534fb786-e7e7-4058-a3c4-636196dc5078';
const APPLE_TEAM_ID = 'YFND2EEW8S';
/** Universal links, App Clip invocations and shared web credentials. */
const LINK_HOST = 'scootch.app';

const DEV: VariantConfig = {
  name: 'Scootch Dev',
  bundleIdentifier: 'app.scootch.dev',
  appGroup: 'group.app.scootch.dev',
  scheme: 'scootch-dev',
  updates: true,
};

const VARIANTS: Record<AppVariant, VariantConfig> = {
  dev: DEV,
  'e2e-test': { ...DEV, updates: false },
  prd: {
    name: 'Scootch',
    bundleIdentifier: 'app.scootch',
    appGroup: 'group.app.scootch',
    scheme: 'scootch',
    updates: true,
  },
};

/** Unset means dev, for local work; every EAS profile names its variant in eas.json. */
function resolveVariant(): AppVariant {
  const raw = process.env['APP_VARIANT'];
  if (raw === undefined || raw === '') return 'dev';
  if (raw === 'dev' || raw === 'prd' || raw === 'e2e-test') return raw;
  throw new Error(`APP_VARIANT must be dev, prd or e2e-test, not "${raw}"`);
}

const appVariant = resolveVariant();
const variant = VARIANTS[appVariant];

/** What iOS shows when it asks for the microphone and for speech recognition, per language. */
const PERMISSION_STRINGS = {
  en: {
    NSMicrophoneUsageDescription: 'Scootch uses the microphone so you can talk instead of type.',
    NSSpeechRecognitionUsageDescription:
      'Scootch turns what you say into text so you do not have to type.',
  },
  vi: {
    NSMicrophoneUsageDescription: 'Scootch dùng micro để bạn có thể nói thay vì gõ.',
    NSSpeechRecognitionUsageDescription:
      'Scootch chuyển lời bạn nói thành chữ để bạn không phải gõ.',
  },
};

/**
 * Every capability the app is signed with. Each one is also ticked on the App ID, so adding one
 * here means a new provisioning profile and a new native build. Push (`aps-environment`), Sign in
 * with Apple and Associated Domains are written by their own config fields and plugins.
 */
const IOS_ENTITLEMENTS = {
  'com.apple.security.application-groups': [variant.appGroup],
  // Keychain sharing with the extensions; the first group is also where new items go by default.
  'keychain-access-groups': [`$(AppIdentifierPrefix)${variant.bundleIdentifier}.shared`],
  // iCloud key-value storage, one store per app.
  'com.apple.developer.ubiquity-kvstore-identifier': `$(TeamIdentifierPrefix)${variant.bundleIdentifier}`,
  'com.apple.developer.usernotifications.time-sensitive': true,
  'com.apple.developer.associated-appclip-app-identifiers': [
    `$(AppIdentifierPrefix)${variant.bundleIdentifier}.Clip`,
  ],
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: variant.name,
  owner: 'critterpass',
  slug: 'scootch',
  scheme: variant.scheme,
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  // The native window behind every screen, shown before the first frame.
  backgroundColor: palettes.light.page,
  // A build only takes updates made from the same native code. The channel (dev or prd) comes from
  // the build profile in eas.json.
  runtimeVersion: { policy: 'fingerprint' },
  updates: variant.updates
    ? { url: `https://u.expo.dev/${EAS_PROJECT_ID}` }
    : { enabled: false, checkAutomatically: 'NEVER' },
  // Vietnamese copies of the permission strings (InfoPlist.strings); English is the base language.
  locales: PERMISSION_STRINGS,
  ios: {
    bundleIdentifier: variant.bundleIdentifier,
    appleTeamId: APPLE_TEAM_ID,
    supportsTablet: false,
    usesAppleSignIn: true,
    associatedDomains: [
      `applinks:${LINK_HOST}`,
      `appclips:${LINK_HOST}`,
      `webcredentials:${LINK_HOST}`,
    ],
    // No encryption beyond what the operating system provides.
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      ...PERMISSION_STRINGS.en,
      // Lets iOS pick the Vietnamese permission strings on a Vietnamese phone.
      CFBundleAllowMixedLocalizations: true,
      NSSupportsLiveActivities: true,
      NSSupportsLiveActivitiesFrequentUpdates: true,
    },
    entitlements: IOS_ENTITLEMENTS,
  },
  android: {
    package: variant.bundleIdentifier,
  },
  // Everything iOS-only below is written by iOS-only mods, so Android config and prebuild skip it.
  plugins: [
    'expo-router',
    'expo-sqlite',
    [
      'expo-build-properties',
      // Expo's modules compile against API 37; runtime behaviour still targets API 36.
      { android: { compileSdkVersion: 37, targetSdkVersion: 36 } },
    ],
    'expo-apple-authentication',
    // Push entitlement on iOS; notification defaults on Android.
    'expo-notifications',
    [
      'expo-speech-recognition',
      {
        microphonePermission: PERMISSION_STRINGS.en.NSMicrophoneUsageDescription,
        speechRecognitionPermission: PERMISSION_STRINGS.en.NSSpeechRecognitionUsageDescription,
      },
    ],
    // Every folder under targets/ with an expo-target.config.js becomes an Apple target.
    '@bacons/apple-targets',
    // Linked with no config plugin: expo-haptics, react-native-purchases, react-native-keychain and
    // @nauverse/expo-cloud-settings (its plugin would also claim CloudKit, which the app does not
    // use; the key-value store entitlement is set above instead).
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    ...config.extra,
    appVariant,
    eas: { projectId: EAS_PROJECT_ID },
  },
});
