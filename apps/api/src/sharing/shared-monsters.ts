import { monsterBodyTypeSchema } from '@scootch/domain';
import { z } from 'zod';

import { languageSchema } from '../contracts';

/** A shared monster as its page and its link preview read it. Nothing private is in it. */
export const sharedMonsterSchema = z.strictObject({
  id: z.string(),
  seed: z.string(),
  bodyType: monsterBodyTypeSchema,
  name: z.string(),
  flavourText: z.string(),
  /** The kind line the task call wrote when the monster arrived in an app; `null` until then. */
  title: z.string().nullable(),
  language: languageSchema,
  /** What the visitor typed, only when they chose to show it. */
  typed: z.string().nullable(),
  status: z.enum(['wild', 'caught']),
  /** ISO 8601 in UTC, when caught. */
  caughtAt: z.string().nullable(),
  catchMinutes: z.number().int().nullable(),
  sharedAt: z.string(),
  /**
   * The server's signature over the name, the card line (with no title), the seed and the
   * language: what the app keeps with the monster so it can give it a card page later. Absent
   * when no signing secret is set.
   */
  signature: z.string().optional(),
});
export type SharedMonster = z.infer<typeof sharedMonsterSchema>;

type Row = {
  id: string;
  seed: string;
  body_type: string;
  name: string;
  flavour_text: string;
  kind_line: string | null;
  language: string;
  typed_line: string | null;
  created_at: string;
  caught_at: string | null;
  catch_minutes: number | null;
};

/** The shared monster with this id, or null when there is none or it was unshared. */
export async function readSharedMonster(db: D1Database, id: string): Promise<SharedMonster | null> {
  const row = await db
    .prepare(
      `SELECT id, seed, body_type, name, flavour_text, kind_line, language, typed_line,
              created_at, caught_at, catch_minutes
       FROM shared_monsters WHERE id = ?`,
    )
    .bind(id)
    .first<Row>();
  if (!row) return null;
  return sharedMonsterSchema.parse({
    id: row.id,
    seed: row.seed,
    bodyType: row.body_type,
    name: row.name,
    flavourText: row.flavour_text,
    title: row.kind_line,
    language: row.language,
    typed: row.typed_line,
    status: row.caught_at === null ? 'wild' : 'caught',
    caughtAt: row.caught_at,
    catchMinutes: row.catch_minutes,
    sharedAt: row.created_at,
  });
}

/**
 * Notes that a phone took the monster in, and the kind line written for it then. The first phone
 * and the first kind line stand: a later arrival changes neither.
 */
export async function noteTakenIn(
  db: D1Database,
  id: string,
  deviceHash: string | null,
  kindLine: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE shared_monsters
       SET taken_in_by = COALESCE(taken_in_by, ?), kind_line = COALESCE(kind_line, ?)
       WHERE id = ?`,
    )
    .bind(deviceHash, kindLine, id)
    .run();
}

const idLetters = 'abcdefghjkmnpqrstuvwxyz23456789';

/** "molar-7f3k9x": the first word of the name, plain letters only, and six random characters. */
export function newShareId(name: string): string {
  const word =
    name
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replaceAll(/[đĐ]/g, 'd')
      .toLowerCase()
      .match(/[a-z0-9]+/)?.[0]
      ?.slice(0, 16) ?? 'monster';
  const random = Array.from(
    crypto.getRandomValues(new Uint8Array(6)),
    (byte) => idLetters[byte % idLetters.length],
  ).join('');
  return `${word}-${random}`;
}

/** Where a monster's link preview images are kept: one per status, so a catch makes a new one. */
export function previewPrefix(id: string): string {
  return `previews/m/${id}/`;
}

/** The header a phone proves a shared page is its own with: the token the share answered with. */
export const unshareTokenHeader = 'X-Unshare-Token';
