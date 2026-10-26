import * as Keychain from 'react-native-keychain';
import type { HttpClient } from './http-client';

/** The route's answer: `{ deleted: true }`. */
function parseDeleted(json: unknown): true {
  if ((json as { deleted?: unknown } | null)?.deleted !== true)
    throw new Error('Unexpected answer');
  return true;
}

/**
 * "Delete everything" on the server: this phone's registration and push tokens go at once. The
 * route answers once it is done.
 */
export function deleteServerData(http: HttpClient): Promise<void> {
  return http.post('/v1/data-delete', {}, parseDeleted).then(() => undefined);
}

/** The anonymous device token's keychain entry, forgotten so the phone registers as new. */
export async function forgetDeviceToken(): Promise<void> {
  await Keychain.resetGenericPassword({ service: 'com.phusclass.device-token' });
}
