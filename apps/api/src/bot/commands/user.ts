import { deviceTokenPattern, hashDeviceToken } from '../../device-auth';
import type { BotCommand } from '../command';

/**
 * The first characters of a device's token hash. The token itself is never stored, so a device is
 * found by its hash: either these characters, or the whole token, which is hashed here.
 */
const hashPrefixPattern = /^[0-9a-f]{8,64}$/;

/** Everything the bot may read about a device. No column here can hold a user's words. */
type DeviceRow = { token_hash: string; language: string; created_at: string; last_seen_at: string };

const deviceColumns = 'token_hash, language, created_at, last_seen_at';

async function findDevices(db: D1Database, key: string): Promise<DeviceRow[]> {
  if (hashPrefixPattern.test(key)) {
    // Hex only, so the key cannot carry a LIKE wildcard.
    const { results } = await db
      .prepare(`SELECT ${deviceColumns} FROM devices WHERE token_hash LIKE ? LIMIT 2`)
      .bind(`${key}%`)
      .all<DeviceRow>();
    if (results.length > 0) return results;
  }
  if (!deviceTokenPattern.test(key)) return [];
  const { results } = await db
    .prepare(`SELECT ${deviceColumns} FROM devices WHERE token_hash = ?`)
    .bind(await hashDeviceToken(key))
    .all<DeviceRow>();
  return results;
}

export const userCommand: BotCommand = {
  name: 'user',
  usage: '/user <hash prefix or token>',
  summary: 'when one device was created and last seen, its language and its model-call count',
  run: async ({ env }, [key]) => {
    if (key === undefined || !(hashPrefixPattern.test(key) || deviceTokenPattern.test(key))) {
      return 'Usage: /user <first 8 or more characters of the device hash, or the whole token>';
    }
    const devices = await findDevices(env.DB, key);
    const [device] = devices;
    if (device === undefined) return 'No device matches.';
    if (devices.length > 1) return 'More than one device matches. Send more characters.';

    const usage = await env.DB.prepare(
      'SELECT COUNT(*) AS calls FROM ai_usage WHERE device_hash = ?',
    )
      .bind(device.token_hash)
      .first<{ calls: number }>();
    return [
      `Device: ${device.token_hash.slice(0, 12)}`,
      `Created: ${device.created_at}`,
      `Last seen: ${device.last_seen_at}`,
      `Language: ${device.language}`,
      `Model calls: ${usage?.calls ?? 0}`,
    ].join('\n');
  },
};
