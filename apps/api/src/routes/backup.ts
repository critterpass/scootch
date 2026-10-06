import { z } from 'zod';

import { BACKUP_MAX_BYTES, backupTokenHash } from '../backup-token';
import { ApiError } from '../errors';
import { readBody, type RouteDefinition } from '../route';

const backupRequestSchema = z.strictObject({
  /** Whatever the phone wants back after a restore. The server never looks inside it. */
  snapshot: z.record(z.string(), z.unknown()),
});

/**
 * Stores the phone's snapshot under its backup token, replacing any earlier one. A snapshot over
 * the size cap is refused and the earlier one stays as it was.
 */
export const backupPutRoute: RouteDefinition = {
  method: 'PUT',
  path: '/v1/backup',
  access: 'device',
  handle: async (c) => {
    const tokenHash = await backupTokenHash(c);
    const { snapshot } = await readBody(c, backupRequestSchema);
    const serialized = JSON.stringify(snapshot);
    if (new TextEncoder().encode(serialized).byteLength > BACKUP_MAX_BYTES) {
      throw new ApiError('bad_request', 'The snapshot is too large', {
        reason: 'snapshot_too_large',
        maxBytes: BACKUP_MAX_BYTES,
      });
    }
    const updatedAt = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO backup_snapshots (token_hash, snapshot, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (token_hash) DO UPDATE
         SET snapshot = excluded.snapshot, updated_at = excluded.updated_at`,
    )
      .bind(tokenHash, serialized, updatedAt)
      .run();
    return c.json({ updatedAt });
  },
};

/** Gives back the snapshot stored under the backup token, exactly as it was sent. */
export const backupGetRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/backup',
  access: 'device',
  handle: async (c) => {
    const row = await c.env.DB.prepare(
      'SELECT snapshot, updated_at FROM backup_snapshots WHERE token_hash = ?',
    )
      .bind(await backupTokenHash(c))
      .first<{ snapshot: string; updated_at: string }>();
    if (row === null) throw new ApiError('not_found', 'No backup is stored under this token');
    return c.json({ snapshot: JSON.parse(row.snapshot) as unknown, updatedAt: row.updated_at });
  },
};

/** Deletes the snapshot stored under the backup token. Answers the same when there was none. */
export const backupDeleteRoute: RouteDefinition = {
  method: 'DELETE',
  path: '/v1/backup',
  access: 'device',
  handle: async (c) => {
    await c.env.DB.prepare('DELETE FROM backup_snapshots WHERE token_hash = ?')
      .bind(await backupTokenHash(c))
      .run();
    return c.json({ deleted: true });
  },
};
