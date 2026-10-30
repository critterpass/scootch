import type { ConfigContext, ExpoConfig } from 'expo/config';

// Read as JSON because the config loader runs under plain Node, which cannot load the tokens
// package's TypeScript source.
import palettes from '../../packages/tokens/src/colors.json' with { type: 'json' };

/** Two environments, dev and prd. `e2e-test` is the dev app as device runs install it. */
type AppVariant = 'dev' | 'prd' | 'e2e-test';

interface VariantConfig {
  name: string;
  /** The extensions sit beneath it (targets/<name>/expo-target.config.js). */
  bundleIdentifier: string;
  /** Shared by the app and its extensions (targets/_shared/AppGroup.swift). */
  appGroup: string;
  scheme: string;
  /** Over-the-air updates. Off for device runs, which swap in the commit's own bundle. */
  updates: boolean;
}

const EAS_PROJECT_ID = '9fa12e59-52d4-4bbe-a34d-90e2ed174bf1';
const APPLE_TEAM_ID = 'YFND2EEW8S';
/** Universal links and shared web credentials. */
const LINK_HOST = 'todo.phusclass.com';
/**
 * The oldest iOS the app and its extensions install on. Every target reads this one value
 * (targets/<name>/expo-target.config.js take it from `ios.deploymentTarget`). iOS 17 is the oldest:
 * interactive widgets and a Live Activity whose buttons work on the Lock Screen need it. What
 * needs iOS 18 (controls, tinted icons) is switched on there.
 */
const IOS_DEPLOYMENT_TARGET = '17.0';

const DEV: VariantConfig = {
  name: "Phu's To-Do Dev",
  bundleIdentifier: 'com.phusclass.dev',
  appGroup: 'group.com.phusclass.dev',
  scheme: 'phusclass-dev',
  updates: true,
};

const VARIANTS: Record<AppVariant, VariantConfig> = {
  dev: DEV,
  'e2e-test': { ...DEV, updates: false },
  prd: {
    name: "Phu's To-Do",
    bundleIdentifier: 'com.phusclass',
    appGroup: 'group.com.phusclass',
    scheme: 'phusclass',
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
 * What iOS shows when it asks for the microphone, for the calendars and to add a picture to Photos,
 * per language. Thầy Phú says them, plainly. The microphone's string says where the voice goes:
 * while the button is held it streams to a speech service, which turns it into text.
 */
const CALENDAR_EN =
  'To turn your day into a timetable. I read your calendar on this phone and never change it.';
const CALENDAR_VI =
  'Để biến ngày của em thành thời khóa biểu. Thầy chỉ đọc lịch trên điện thoại này và không bao giờ sửa nó.';
const PERMISSION_STRINGS = {
  en: {
    NSMicrophoneUsageDescription:
      'So you can say a task out loud instead of typing it. I listen only while you hold, and a speech service turns your words into text.',
    NSCalendarsUsageDescription: CALENDAR_EN,
    NSCalendarsFullAccessUsageDescription: CALENDAR_EN,
    NSPhotoLibraryAddUsageDescription: 'To save a card you chose to share to your photos.',
    // Apple asks for this whenever a linked library can read photos. The app never does.
    NSPhotoLibraryUsageDescription:
      'I only add the cards you save to your photos. I never look at the rest.',
  },
  vi: {
    NSMicrophoneUsageDescription:
      'Để em nói việc cần làm thay vì gõ. Thầy chỉ nghe khi em giữ nút, và một dịch vụ giọng nói chuyển lời em thành chữ.',
    NSCalendarsUsageDescription: CALENDAR_VI,
    NSCalendarsFullAccessUsageDescription: CALENDAR_VI,
    NSPhotoLibraryAddUsageDescription: 'Để lưu tấm thẻ em chọn chia sẻ vào ảnh.',
    NSPhotoLibraryUsageDescription:
      'Thầy chỉ thêm những tấm thẻ em lưu vào ảnh. Thầy không bao giờ xem các ảnh khác.',
  },
};

/**
 * Every capability the app is signed with. Each one is also ticked on the App ID, so adding one
 * here means a new provisioning profile and a new native build. Push (`aps-environment`) and
 * Associated Domains are written by their own config fields and plugins.
 */
const IOS_ENTITLEMENTS = {
  'com.apple.security.application-groups': [variant.appGroup],
  // Keychain sharing with the extensions; the first group is also where new items go by default.
  'keychain-access-groups': [`$(AppIdentifierPrefix)${variant.bundleIdentifier}.shared`],
  // iCloud key-value storage, one store per app.
  'com.apple.developer.ubiquity-kvstore-identifier': `$(TeamIdentifierPrefix)${variant.bundleIdentifier}`,
  'com.apple.developer.usernotifications.time-sensitive': true,
};

const app = ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: variant.name,
  owner: 'critterpass',
  slug: 'phusclass',
  scheme: variant.scheme,
  version: '1.0.0',
  orientation: 'portrait',
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
    // The app's icon in the three ways iOS shows one.
    icon: {
      light: './assets/icons/app.png',
      dark: './assets/icons/app-dark.png',
      tinted: './assets/icons/app-tinted.png',
    },
    associatedDomains: [`applinks:${LINK_HOST}`, `webcredentials:${LINK_HOST}`],
    // No encryption beyond what the operating system provides.
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      ...PERMISSION_STRINGS.en,
      // Lets iOS pick the Vietnamese permission strings on a Vietnamese phone.
      CFBundleAllowMixedLocalizations: true,
      NSSupportsLiveActivities: true,
      NSSupportsLiveActivitiesFrequentUpdates: true,
      // Lets a silent push wake the app (a Live Activity token to renew).
      UIBackgroundModes: ['remote-notification'],
      // Landscape is listed for iPhone Duo's desk stand (the inner display turned upright). At run
      // time every other iPhone, and the Duo's outer display, stays in portrait
      // (modules/phusclass-fold, FoldOrientation.swift).
      UISupportedInterfaceOrientations: [
        'UIInterfaceOrientationPortrait',
        'UIInterfaceOrientationLandscapeLeft',
        'UIInterfaceOrientationLandscapeRight',
      ],
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
    // Push entitlement on iOS; notification defaults on Android.
    'expo-notifications',
    [
      'expo-audio',
      {
        // Sound cues only: nothing records through this library (the microphone is
        // modules/phusclass-mic) and nothing plays with the app in the background, so it adds no
        // background mode, service or Android record permission. It writes the microphone string.
        microphonePermission: PERMISSION_STRINGS.en.NSMicrophoneUsageDescription,
        recordAudioAndroid: false,
        enableBackgroundPlayback: false,
        enableBackgroundRecording: false,
      },
    ],
    [
      'expo-calendar',
      {
        // Read only: the timetable is made from the day's events, and nothing is ever written back.
        calendarPermission: PERMISSION_STRINGS.en.NSCalendarsFullAccessUsageDescription,
      },
    ],
    [
      'expo-media-library',
      {
        // Saving a shared card only ever adds a picture and the app never reads the photo library. The
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
    // expo-glass-effect, @expo/ui and the local modules (modules/phusclass-live-activity,
    // modules/phusclass-notifications, modules/phusclass-intelligence, modules/app-icon,
    // modules/phusclass-fold: the hinge and the fold on iPhone Duo, iOS 27.1 and later,
    // modules/phusclass-mic: the microphone as PCM while a task is said).
    // The App Intents for Siri and Shortcuts (targets/widgets/_shared) compile into the app and
    // the widget extension and need no capability; the on-device model links FoundationModels
    // weakly, so iOS 17 still launches.
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

export default app;
