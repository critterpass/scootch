import { hashDeviceToken } from '../device-auth';
import { ApiError } from '../errors';

/** Lower-case base32: no character that reads as another, and safe in a link or a bot command. */
const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';

/** A random id of `length` characters, five bits each. */
export function randomId(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte & 31]).join('');
}

export const accountIdPattern = /^[a-z2-7]{12}$/;
export const tableIdPattern = /^[a-z2-7]{16}$/;
/** An invite code: 50 bits, short enough to read aloud, useless once it has expired. */
export const inviteCodePattern = /^[a-z2-7]{10}$/;

export const newAccountId = () => randomId(12);
export const newTableId = () => randomId(16);
export const newInviteCode = () => randomId(10);

/**
 * SHA-256, hex, of a value under a purpose. The purpose keeps a friend code from ever matching a
 * table code, and an Apple subject from matching either.
 */
export function hashFor(
  purpose: 'apple-subject' | 'apple-nonce' | 'friend-invite' | 'table-invite',
  value: string,
): Promise<string> {
  return hashDeviceToken(`${purpose}:${value}`);
}

/**
 * A request the rules turn down. The wire code is `bad_request`; `detail.reason` is the fixed
 * word the phone switches on. Neither ever names another person.
 */
export function refusal(reason: string, message: string): ApiError {
  return new ApiError('bad_request', message, { reason });
}

export const isoAfter = (now: Date, ms: number) => new Date(now.getTime() + ms).toISOString();
