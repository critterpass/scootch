import * as AppleAuthentication from 'expo-apple-authentication';

import type { ApplePort } from './account-flow';

/**
 * Apple's own sheet. No name and no email are asked for: the server keeps only a hash of Apple's
 * stable subject. It has never run: Sign in with Apple needs a native build on a real device.
 */
export const nativeApple: ApplePort = {
  async signIn(nonce) {
    try {
      const credential = await AppleAuthentication.signInAsync({ nonce });
      return credential.identityToken;
    } catch (error) {
      if ((error as { code?: unknown } | null)?.code === 'ERR_REQUEST_CANCELED') return null;
      throw error;
    }
  },
};
