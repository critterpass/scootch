import * as CloudSettings from '@nauverse/expo-cloud-settings';
import * as Crypto from 'expo-crypto';
import * as Keychain from 'react-native-keychain';

import {
  createBackupTokens,
  tokenFromBytes,
  type BackupTokens,
  type BackupTokenStore,
} from './backup-token';

// The real stores behind the backup token. Nothing in this file is covered by the unit tests,
// which use fakes: neither store has ever run outside a native build, and whether a token written
// on one phone arrives on another can only be seen on two real devices signed in to one iCloud.

const KEYCHAIN_SERVICE = 'app.scootch.backup-token';
const CLOUD_KEY = 'backupToken';

/**
 * A Keychain item that iCloud Keychain carries to the person's other devices. With iCloud
 * Keychain switched off the item still works on this phone; it just does not travel. The same
 * `cloudSync` flag must be given to every call, or the item is not found.
 */
export const keychainBackupTokenStore: BackupTokenStore = {
  read: async () => {
    const found = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
      cloudSync: true,
    });
    return found ? found.password : null;
  },
  write: async (token) => {
    const saved = await Keychain.setGenericPassword('backup', token, {
      service: KEYCHAIN_SERVICE,
      cloudSync: true,
      // An item kept to "this device only" would never sync, so the plain class is used.
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
    });
    if (saved === false) throw new Error('The Keychain did not keep the backup token');
  },
  clear: async () => {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE, cloudSync: true });
  },
};

function cloudOrThrow(): void {
  // False when the person is signed out of iCloud or has switched iCloud off for Scootch.
  if (!CloudSettings.isAvailable()) throw new Error('iCloud key-value storage is off');
}

/** iCloud key-value storage. Its calls are synchronous; a store that is off throws on every call. */
export const cloudBackupTokenStore: BackupTokenStore = {
  read: () =>
    Promise.resolve().then(() => {
      cloudOrThrow();
      return CloudSettings.getString(CLOUD_KEY);
    }),
  write: (token) =>
    Promise.resolve().then(() => {
      cloudOrThrow();
      CloudSettings.setString(CLOUD_KEY, token);
    }),
  clear: () =>
    Promise.resolve().then(() => {
      cloudOrThrow();
      CloudSettings.remove(CLOUD_KEY);
    }),
};

/** A new token from 32 random bytes of the system's generator. */
export function newBackupToken(): string {
  return tokenFromBytes(Crypto.getRandomBytes(32));
}

/** The backup token on the real phone: both stores, and the system's random bytes. */
export function nativeBackupTokens(): BackupTokens {
  return createBackupTokens({
    keychain: keychainBackupTokenStore,
    cloud: cloudBackupTokenStore,
    newToken: newBackupToken,
  });
}
