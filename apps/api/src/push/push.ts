import type { Language, PushTokenKind, RegisterPushTokenRequest } from '../contracts';
import type { Bindings } from '../env';
import { createFlagReader } from '../flags';

import { apnsKey, apnsRequest, readApnsAnswer, type ApnsMessage } from './apns';

/**
 * `push.remote`: on, the server sends remote pushes. Off by default: the pieces are in place
 * before Apple's key exists, and one row turns them on.
 */
export const pushFlags = createFlagReader({ 'push.remote': false });

/** Tokens one device may hold: its own, a push-to-start token and a few running activities. */
const tokensPerDevice = 6;

/**
 * Keeps a token Apple gave a phone, tied to the device that sent it. A token seen again moves to
 * the device that sent it last, and a device's oldest tokens beyond the cap are forgotten.
 */
export async function registerPushToken(
  db: D1Database,
  deviceHash: string,
  { token, kind, environment, bundleId }: RegisterPushTokenRequest,
  now: Date,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `INSERT INTO push_tokens (token, device_hash, kind, environment, bundle_id, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (token) DO UPDATE SET device_hash = excluded.device_hash,
           kind = excluded.kind, environment = excluded.environment,
           bundle_id = excluded.bundle_id, updated_at = excluded.updated_at`,
      )
      .bind(token, deviceHash, kind, environment, bundleId, now.toISOString()),
    // One device token and one push-to-start token per device: the newest replaces the others.
    db
      .prepare(
        `DELETE FROM push_tokens WHERE device_hash = ?1 AND kind = ?2 AND token != ?3
           AND ?2 != 'live_activity'`,
      )
      .bind(deviceHash, kind satisfies PushTokenKind, token),
    db
      .prepare(
        `DELETE FROM push_tokens WHERE device_hash = ?1 AND token NOT IN (
           SELECT token FROM push_tokens WHERE device_hash = ?1
           ORDER BY updated_at DESC LIMIT ?2)`,
      )
      .bind(deviceHash, tokensPerDevice),
  ]);
}

export async function forgetPushToken(
  db: D1Database,
  deviceHash: string,
  token: string,
): Promise<void> {
  await db
    .prepare('DELETE FROM push_tokens WHERE token = ? AND device_hash = ?')
    .bind(token, deviceHash)
    .run();
}

/** What a push says, in each language. `data` is what the app is told beside it: ids only. */
export type PushToSend = Omit<ApnsMessage, 'alert'> & {
  readonly alert: Readonly<Record<Language, ApnsMessage['alert']>>;
};

type PushEnv = Pick<Bindings, 'DB' | 'APNS_KEY_P8' | 'APNS_KEY_ID' | 'APNS_TEAM_ID'>;

let saidNoKey = false;

/**
 * Sends one alert to every phone signed in to an account, each in its own language. True when
 * Apple took at least one. With the flag off, the key's secrets absent or no token to send to,
 * nothing is sent and the answer is false; the missing key is logged once, not per push.
 */
export async function pushToAccount(
  env: PushEnv,
  accountId: string,
  push: PushToSend,
  now: Date,
  send: typeof fetch = fetch,
): Promise<boolean> {
  if (!(await pushFlags.isOn(env.DB, 'push.remote'))) return false;
  const key = apnsKey(env);
  if (key === null) {
    if (!saidNoKey)
      console.warn('push is on but APNS_KEY_P8, APNS_KEY_ID or APNS_TEAM_ID is not set');
    saidNoKey = true;
    return false;
  }
  const { results } = await env.DB.prepare(
    `SELECT p.token, p.environment, p.bundle_id, d.language FROM push_tokens p
     JOIN account_devices a ON a.device_hash = p.device_hash
     JOIN devices d ON d.token_hash = p.device_hash
     WHERE a.account_id = ? AND p.kind = 'alert'`,
  )
    .bind(accountId)
    .all<{
      token: string;
      environment: 'sandbox' | 'production';
      bundle_id: string;
      language: Language;
    }>();

  let sent = false;
  for (const row of results) {
    const target = { token: row.token, environment: row.environment, bundleId: row.bundle_id };
    const outcome = await apnsRequest(
      key,
      target,
      { ...push, alert: push.alert[row.language] },
      now,
    )
      .then((request) => send(request))
      .then(readApnsAnswer)
      .catch(() => 'failed' as const);
    if (outcome === 'sent') sent = true;
    if (outcome === 'gone') {
      await env.DB.prepare('DELETE FROM push_tokens WHERE token = ?').bind(row.token).run();
    }
  }
  return sent;
}
