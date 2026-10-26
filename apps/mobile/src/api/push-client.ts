import type { HttpClient } from './http-client';

/** What the server's push-tokens route takes: this phone's own token for alerts. */
export interface PushTokenRegistration {
  /** Apple's device token, as lower-case hex. */
  readonly token: string;
  readonly environment: 'sandbox' | 'production';
  readonly bundleId: 'com.phusclass' | 'com.phusclass.dev';
}

const BUNDLE_IDS = new Set(['com.phusclass', 'com.phusclass.dev']);

export function isPushBundleId(value: unknown): value is PushTokenRegistration['bundleId'] {
  return typeof value === 'string' && BUNDLE_IDS.has(value);
}

/** The route's answer: `{ registered: true }`. */
function parseRegistered(json: unknown): true {
  if ((json as { registered?: unknown } | null)?.registered !== true)
    throw new Error('Unexpected answer');
  return true;
}

/** Keeps this phone's alert token on the server. Sending the same token again is harmless. */
export function registerPushToken(http: HttpClient, push: PushTokenRegistration): Promise<void> {
  return http
    .post(
      '/v1/push/tokens',
      {
        token: push.token.toLowerCase(),
        kind: 'alert',
        environment: push.environment,
        bundleId: push.bundleId,
      },
      parseRegistered,
    )
    .then(() => undefined);
}
