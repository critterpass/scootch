import * as AppleAuthentication from 'expo-apple-authentication';

import type { ApplePort } from './account-flow';

/**
 * Apple's own sheet. The name is asked for so the seat's name can be filled in for the person to
 * change; it stays on this phone until they keep one. No email is asked for, and the server keeps
 * only a hash of Apple's stable subject. Apple hands the name over the first time only. It has
 * never run: Sign in with Apple needs a native build on a real device.
 */
export const nativeApple: ApplePort = {
  async signIn(nonce) {
    try {
      const credential = await AppleAuthentication.signInAsync({
        nonce,
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME],
      });
      if (credential.identityToken === null) return null;
      return {
        identityToken: credential.identityToken,
        givenName: credential.fullName?.givenName ?? null,
      };
    } catch (error) {
      if ((error as { code?: unknown } | null)?.code === 'ERR_REQUEST_CANCELED') return null;
      throw error;
    }
  },
};
