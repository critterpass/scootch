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
/**
 * The oldest iOS the app, its extensions and the App Clip install on. Every target reads this one
 * value (targets/<name>/expo-target.config.js take it from `ios.deploymentTarget`). The founder is
 * deciding the minimum version; until then it stays at the Expo default.
 */
const IOS_DEPLOYMENT_TARGET = '16.4';

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

/**
 * What iOS shows when it asks for the microphone, for speech recognition, for the camera and to add
 * a picture to Photos, per language.
 */
const PERMISSION_STRINGS = {
  en: {
    NSMicrophoneUsageDescription: 'Scootch uses the microphone so you can talk instead of type.',
    NSSpeechRecognitionUsageDescription:
      'Scootch turns what you say into text so you do not have to type.',
    NSCameraUsageDescription:
      'Scootch looks at a photo you take of the mess to find one place to start.',
    NSPhotoLibraryAddUsageDescription: 'Scootch saves a card to your photos when you tap Save.',
    // Apple asks for this whenever a linked library can read photos. Scootch never does.
    NSPhotoLibraryUsageDescription:
      'Scootch only adds the cards you save to your photos. It never looks at the rest.',
  },
  vi: {
    NSMicrophoneUsageDescription: 'Scootch dùng micro để bạn có thể nói thay vì gõ.',
    NSSpeechRecognitionUsageDescription:
      'Scootch chuyển lời bạn nói thành chữ để bạn không phải gõ.',
    NSCameraUsageDescription: 'Scootch xem tấm ảnh bạn chụp đống bừa bộn để tìm một chỗ bắt đầu.',
    NSPhotoLibraryAddUsageDescription: 'Scootch lưu thẻ vào ảnh của bạn khi bạn chạm Lưu.',
    NSPhotoLibraryUsageDescription:
      'Scootch chỉ thêm những thẻ bạn lưu vào ảnh. Scootch không bao giờ xem các ảnh khác.',
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
  // Placeholder art drawn by assets/render-app-icon.ts. iOS takes this file as it is (opaque).
  icon: './assets/icon.png',
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
    deploymentTarget: IOS_DEPLOYMENT_TARGET,
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
      // Lets a silent push wake the app (a table changing, a Live Activity token to renew).
      UIBackgroundModes: ['remote-notification'],
    },
    entitlements: IOS_ENTITLEMENTS,
  },
  android: {
    package: variant.bundleIdentifier,
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundColor: palettes.light.page,
    },
  },
  // Everything iOS-only below is written by iOS-only mods, so Android config and prebuild skip it.
  plugins: [
    'expo-router',
    'expo-sqlite',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        backgroundColor: palettes.light.page,
        dark: { backgroundColor: palettes.dark.page },
      },
    ],
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
    [
      'expo-audio',
      {
        // Sound cues only: nothing records through this library and nothing plays with the app in
        // the background, so it adds no background mode, service or Android record permission.
        // The microphone string stays the one speech recognition shows.
        microphonePermission: PERMISSION_STRINGS.en.NSMicrophoneUsageDescription,
        recordAudioAndroid: false,
        enableBackgroundPlayback: false,
        enableBackgroundRecording: false,
      },
    ],
    [
      'expo-camera',
      {
        // Stills only: the camera never records sound or video, and reads no barcodes. The
        // microphone string stays the one speech recognition shows.
        cameraPermission: PERMISSION_STRINGS.en.NSCameraUsageDescription,
        microphonePermission: PERMISSION_STRINGS.en.NSMicrophoneUsageDescription,
        recordAudioAndroid: false,
        barcodeScannerEnabled: false,
      },
    ],
    [
      'expo-media-library',
      {
        // Saving a card only ever adds a picture and the app never reads the photo library. The
        // read string is still required: Apple refuses a binary whose linked library can read
        // photos without one. No Android media-read permission.
        photosPermission: PERMISSION_STRINGS.en.NSPhotoLibraryUsageDescription,
        savePhotosPermission: PERMISSION_STRINGS.en.NSPhotoLibraryAddUsageDescription,
        isAccessMediaLocationEnabled: false,
        granularPermissions: [],
      },
    ],
    // The languages the app is written in, for the per-app language setting on both platforms.
    ['expo-localization', { supportedLocales: Object.keys(PERMISSION_STRINGS) }],
    // Every folder under targets/ with an expo-target.config.js becomes an Apple target.
    '@bacons/apple-targets',
    // Crash reporting. The DSN is read at run time (EXPO_PUBLIC_SENTRY_DSN; with none, nothing is
    // sent). The organisation, project and token come from SENTRY_ORG, SENTRY_PROJECT and
    // SENTRY_AUTH_TOKEN wherever symbols are uploaded. Upload during the native build is off so a
    // build with no token cannot fail, and so the generated project does not depend on which
    // variables happen to be set.
    ['@sentry/react-native/expo', { disableAutoUpload: true }],
    // Linked with no config plugin: expo-haptics, react-native-purchases, react-native-keychain,
    // @nauverse/expo-cloud-settings (its plugin would also claim CloudKit, which the app does not
    // use; the key-value store entitlement is set above instead), @shopify/react-native-skia,
    // react-native-reanimated, react-native-worklets, react-native-gesture-handler, expo-font,
    // expo-sharing, expo-file-system, expo-clipboard, expo-crypto, expo-application, expo-device,
    // expo-glass-effect, @expo/ui, expo-image-manipulator and the local modules/scootch-live-activity
    // and modules/scootch-reading.
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
