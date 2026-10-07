import type { Bindings } from '../env';

/** The three secrets a push needs. All present, or no push is sent. */
export type ApnsKey = { readonly p8: string; readonly keyId: string; readonly teamId: string };

export function apnsKey(
  env: Pick<Bindings, 'APNS_KEY_P8' | 'APNS_KEY_ID' | 'APNS_TEAM_ID'>,
): ApnsKey | null {
  const { APNS_KEY_P8: p8, APNS_KEY_ID: keyId, APNS_TEAM_ID: teamId } = env;
  return p8 && keyId && teamId ? { p8, keyId, teamId } : null;
}

const encoder = new TextEncoder();

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

const part = (value: object): string => base64Url(encoder.encode(JSON.stringify(value)));

/** The private key in Apple's `.p8` file: PKCS#8 in PEM, for ECDSA on P-256. */
async function importKey(p8: string): Promise<CryptoKey> {
  // A secret pasted on one line keeps its line breaks as the two characters `\n`.
  const body = p8
    .replaceAll('\\n', '\n')
    .replace(/-----[A-Z ]+-----/g, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (character) => character.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
  ]);
}

/**
 * The provider token APNs asks for: a JWT signed with ES256, naming the key in its header and
 * the team as its issuer, with the time it was made.
 */
export async function signProviderToken(key: ApnsKey, now: Date): Promise<string> {
  const unsigned = `${part({ alg: 'ES256', kid: key.keyId })}.${part({
    iss: key.teamId,
    iat: Math.floor(now.getTime() / 1000),
  })}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    await importKey(key.p8),
    encoder.encode(unsigned),
  );
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
}

/** Apple refuses a token older than an hour and one remade too often, so one is kept a while. */
const tokenLifeMs = 40 * 60 * 1000;
let kept: { for: string; token: string; madeAt: number } | undefined;

async function providerToken(key: ApnsKey, now: Date): Promise<string> {
  const owner = `${key.teamId}.${key.keyId}`;
  if (kept?.for === owner && now.getTime() - kept.madeAt < tokenLifeMs) return kept.token;
  kept = { for: owner, token: await signProviderToken(key, now), madeAt: now.getTime() };
  return kept.token;
}

export type ApnsTarget = {
  /** The device token, hex. */
  readonly token: string;
  readonly environment: 'sandbox' | 'production';
  /** The app the token was issued to. */
  readonly bundleId: string;
};

export type ApnsMessage = {
  /** What the phone shows. Fixed lines and a display name: never a task. */
  readonly alert: { readonly title: string; readonly body: string };
  /** What the app is told beside it: ids only. */
  readonly data: Readonly<Record<string, string>>;
  /** Later pushes with the same id replace earlier ones on the lock screen. */
  readonly collapseId: string;
  /** Apple stops trying to deliver after this many seconds. */
  readonly expiresInSeconds: number;
};

const hosts = {
  sandbox: 'https://api.sandbox.push.apple.com',
  production: 'https://api.push.apple.com',
} as const;

/** The request for one alert push, as APNs documents it. */
export async function apnsRequest(
  key: ApnsKey,
  target: ApnsTarget,
  message: ApnsMessage,
  now: Date,
): Promise<Request> {
  return new Request(`${hosts[target.environment]}/3/device/${target.token}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${await providerToken(key, now)}`,
      'apns-topic': target.bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'apns-collapse-id': message.collapseId,
      'apns-expiration': String(Math.floor(now.getTime() / 1000) + message.expiresInSeconds),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      aps: { alert: message.alert, sound: 'default' },
      scootch: message.data,
    }),
  });
}

/**
 * What became of one push. `gone`: Apple says the token is no longer any phone's, so it is
 * forgotten. `failed`: anything else, the reason only.
 */
export type ApnsOutcome = 'sent' | 'gone' | 'failed';

export async function readApnsAnswer(response: Response): Promise<ApnsOutcome> {
  if (response.ok) return 'sent';
  const reason = await response
    .json<{ reason?: string }>()
    .then((body) => body.reason ?? '')
    .catch(() => '');
  if (response.status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered') {
    return 'gone';
  }
  console.warn('push refused', { status: response.status, reason });
  return 'failed';
}
