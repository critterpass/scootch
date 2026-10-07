import { z } from 'zod';

import type { ClassifyCodeResponse } from '../contracts';

import { oldestWaiting, stillWaiting } from './haunt-reads';
import { hashFor, inviteCodePattern, tableIdPattern } from './ids';

/** The longest thing a paste field sends: a link with room to spare. */
const longestPaste = 300;

/**
 * The code in what someone pasted: a bare code, or a link whose last path segment is one
 * (`https://scootch.app/vi/t/<code>`, with or without the scheme or a query). A keyboard that
 * capitalised it is forgiven. Null when nothing in it has a code's shape.
 */
export function readCode(pasted: string): string | null {
  const text = pasted.trim();
  if (text.length === 0 || text.length > longestPaste) return null;
  const path = text.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split(/[?#]/)[0] ?? '';
  const last = path.split('/').findLast((segment) => segment.length > 0) ?? '';
  const code = last.toLowerCase();
  return inviteCodePattern.test(code) || tableIdPattern.test(code) ? code : null;
}

/** A body field that takes a bare invite code or the link that carries it, and yields the code. */
export const pastedInviteCodeSchema = z
  .string()
  .max(longestPaste)
  .transform((pasted) => readCode(pasted))
  .refine((code): code is string => code !== null && inviteCodePattern.test(code));

/**
 * What a pasted code or link is for. Each kind of code is hashed under its own purpose, so a
 * code is looked up as each kind in turn. Only a code that would still work is given a kind; the
 * answer never says whose it is, and an unknown code and a spent one look the same.
 */
export async function classifyCode(
  db: D1Database,
  pasted: string,
  now: Date,
): Promise<ClassifyCodeResponse> {
  const unknown: ClassifyCodeResponse = { kind: 'unknown', code: null };
  const code = readCode(pasted);
  if (code === null) return unknown;
  const at = now.toISOString();

  if (tableIdPattern.test(code)) {
    const haunt = await db
      .prepare(`SELECT 1 FROM haunts h WHERE h.id = ? AND ${stillWaiting}`)
      .bind(code, oldestWaiting(now))
      .first();
    return haunt === null ? unknown : { kind: 'haunt', code };
  }
  const [table, friend] = await db.batch([
    db
      .prepare(
        `SELECT 1 FROM table_invites i JOIN tables t ON t.id = i.table_id
         WHERE i.code_hash = ? AND i.expires_at > ? AND t.closed_at IS NULL`,
      )
      .bind(await hashFor('table-invite', code), at),
    db
      .prepare(
        'SELECT 1 FROM friend_invites WHERE code_hash = ? AND expires_at > ? AND used_at IS NULL',
      )
      .bind(await hashFor('friend-invite', code), at),
  ]);
  if ((table?.results.length ?? 0) > 0) return { kind: 'table', code };
  if ((friend?.results.length ?? 0) > 0) return { kind: 'friend', code };
  return unknown;
}
