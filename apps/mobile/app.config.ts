import type { ConfigContext, ExpoConfig } from 'expo/config';

// Read as JSON because the config loader runs under plain Node, which cannot load the tokens
// package's TypeScript source.
import palettes from '../../packages/tokens/src/colors.json' with { type: 'json' };

/** Two environments, dev and prd. `e2e-test` is the dev app as device runs install it. */
type AppVariant = 'dev' | 'prd' | 'e2e-test';

interface VariantConfig {
  name: string;
  bundleIdentifier: string;
  scheme: string;
  /** Over-the-air updates. Off for device runs, which swap in the commit's own bundle. */
  updates: boolean;
}

const EAS_PROJECT_ID = '534fb786-e7e7-4058-a3c4-636196dc5078';

const DEV: VariantConfig = {
  name: 'Scootch Dev',
  bundleIdentifier: 'app.scootch.dev',
  scheme: 'scootch-dev',
  updates: true,
};

const VARIANTS: Record<AppVariant, VariantConfig> = {
  dev: DEV,
  'e2e-test': { ...DEV, updates: false },
  prd: {
    name: 'Scootch',
    bundleIdentifier: 'app.scootch',
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
  ios: {
    bundleIdentifier: variant.bundleIdentifier,
    supportsTablet: false,
    // No encryption beyond what the operating system provides.
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: variant.bundleIdentifier,
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    [
      'expo-build-properties',
      // Expo's modules compile against API 37; runtime behaviour still targets API 36.
      { android: { compileSdkVersion: 37, targetSdkVersion: 36 } },
    ],
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
