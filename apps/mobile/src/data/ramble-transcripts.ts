import { DAY_MS, instantFromIso, isoFromInstant, type Id, type Instant } from '@scootch/domain';

import type { SqlDatabase } from './table';

/** A kept transcript is purged this long after the ramble was made. */
export const TRANSCRIPT_KEPT_DAYS = 7;

export interface RambleTranscript {
  readonly id: Id;
  readonly text: string;
  readonly createdAt: string;
  readonly pickedAt: string | null;
}

export interface RambleTranscripts {
  /** Keeps a ramble's words while its one thing is being picked. Never called with a crisis text. */
  save(id: Id, text: string, now: Instant): Promise<void>;
  /** The ramble still waiting for its pick, newest first. */
  pending(): Promise<RambleTranscript | null>;
  all(): Promise<RambleTranscript[]>;
  /** The one thing was picked: the words go, unless the person chose to keep transcripts. */
  picked(id: Id, keep: boolean, now: Instant): Promise<void>;
  remove(id: Id): Promise<void>;
  /** Deletes every transcript older than seven days. The app calls this at start. */
  purgeOld(now: Instant): Promise<void>;
}

interface StoredTranscript {
  id: string;
  text: string;
  created_at: string;
  picked_at: string | null;
}

const fromStored = (row: StoredTranscript): RambleTranscript => ({
  id: row.id,
  text: row.text,
  createdAt: row.created_at,
  pickedAt: row.picked_at,
});

export function rambleTranscripts(db: SqlDatabase): RambleTranscripts {
  const select = async (clause: string) =>
    (
      await db.getAllAsync<StoredTranscript>(
        `SELECT id, text, created_at, picked_at FROM ramble_transcripts ${clause}`,
        [],
      )
    ).map(fromStored);
  const remove = async (id: Id) => {
    await db.runAsync('DELETE FROM ramble_transcripts WHERE id = ?', [id]);
  };

  return {
    save: async (id, text, now) => {
      await db.runAsync(
        'INSERT OR REPLACE INTO ramble_transcripts (id, text, created_at, picked_at) VALUES (?, ?, ?, NULL)',
        [id, text, isoFromInstant(now)],
      );
    },
    pending: async () =>
      (await select('WHERE picked_at IS NULL ORDER BY created_at DESC LIMIT 1'))[0] ?? null,
    all: () => select('ORDER BY created_at'),
    picked: async (id, keep, now) => {
      if (!keep) return remove(id);
      await db.runAsync('UPDATE ramble_transcripts SET picked_at = ? WHERE id = ?', [
        isoFromInstant(now),
        id,
      ]);
    },
    remove,
    purgeOld: async (now) => {
      const cutOff = now - TRANSCRIPT_KEPT_DAYS * DAY_MS;
      for (const transcript of await select('')) {
        if (instantFromIso(transcript.createdAt) <= cutOff) await remove(transcript.id);
      }
    },
  };
}
