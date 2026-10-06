import { z } from 'zod';

import { deviceTokenPattern, hashDeviceToken } from '../device-auth';
import { readBody, type RouteDefinition } from '../route';

const dataDeleteRequestSchema = z.strictObject({
  /** The phone's backup token, when it has one: its snapshot goes too. */
  backupToken: z.string().regex(deviceTokenPattern).optional(),
});

/**
 * "Delete everything": removes what the server holds for the calling device, in one step.
 *
 * The device's registration is deleted, so its token stops working at once. Its rows in the cost
 * ledger stay, because they are the record of what was spent and hold no text, but they are cut
 * loose from the device and can no longer be traced to it. The backup snapshot is deleted when
 * the phone sends its backup token. Pages shared from the app are not tied to a device and are
 * removed by unsharing them.
 */
export const dataDeleteRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/data-delete',
  access: 'device',
  handle: async (c) => {
    const { backupToken } = await readBody(c, dataDeleteRequestSchema);
    const db = c.env.DB;
    const deviceHash = c.var.device.hash;
    const statements = [
      db.prepare('UPDATE ai_usage SET device_hash = NULL WHERE device_hash = ?').bind(deviceHash),
      db.prepare('DELETE FROM devices WHERE token_hash = ?').bind(deviceHash),
    ];
    if (backupToken !== undefined) {
      statements.push(
        db
          .prepare('DELETE FROM backup_snapshots WHERE token_hash = ?')
          .bind(await hashDeviceToken(backupToken)),
      );
    }
    await db.batch(statements);
    return c.json({ deleted: true });
  },
};
