import Constants from 'expo-constants';
import * as Keychain from 'react-native-keychain';

import type { TokenStore } from './http-client';

const DEV_URL = 'https://scootch-dev.bkdev98.workers.dev';

/** The API each app variant talks to. Device runs use the dev app, so they share its API. */
const API_URLS: Readonly<Record<string, string>> = {
  dev: DEV_URL,
  'e2e-test': DEV_URL,
  prd: 'https://scootch.bkdev98.workers.dev',
};

/** The base URL for a variant name from the app config. An unknown variant talks to dev. */
export function apiBaseUrlFor(variant: unknown): string {
  return (typeof variant === 'string' ? API_URLS[variant] : undefined) ?? DEV_URL;
}

export function apiBaseUrl(): string {
  return apiBaseUrlFor(Constants.expoConfig?.extra?.['appVariant']);
}

const TOKEN_SERVICE = 'app.scootch.device-token';

/** The anonymous device token, kept in the keychain. It has never run outside a native build. */
export const keychainTokenStore: TokenStore = {
  read: async () => {
    const found = await Keychain.getGenericPassword({ service: TOKEN_SERVICE });
    return found ? found.password : null;
  },
  write: async (token) => {
    await Keychain.setGenericPassword('device', token, {
      service: TOKEN_SERVICE,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
    });
  },
};
