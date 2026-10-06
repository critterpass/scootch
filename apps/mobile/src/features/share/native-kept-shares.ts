import * as Keychain from 'react-native-keychain';

import type { KeptShare, KeptShares } from './kept-shares';

// The real store behind the kept pages. Nothing here is covered by the unit tests, which keep the
// list in memory: it runs only in a native build.

const SERVICE = 'app.scootch.shared-pages';

/** The pages this phone shared and their unshare tokens, as one keychain item on this phone. */
export const keychainKeptShares: KeptShares = {
  read: async () => {
    const found = await Keychain.getGenericPassword({ service: SERVICE });
    if (!found) return [];
    const stored: unknown = JSON.parse(found.password);
    return Array.isArray(stored) ? (stored as KeptShare[]) : [];
  },
  write: async (shares) => {
    const saved = await Keychain.setGenericPassword('shared-pages', JSON.stringify(shares), {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
    });
    if (saved === false) throw new Error('The Keychain did not keep the shared pages');
  },
};
