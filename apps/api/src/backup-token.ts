import { deviceTokenPattern, hashDeviceToken } from './device-auth';
import { ApiError } from './errors';
import type { RouteContext } from './route';

/** The most a snapshot may weigh once serialized as JSON, in bytes of UTF-8. */
export const BACKUP_MAX_BYTES = 512 * 1024;

const backupTokenHeader = 'X-Backup-Token';

/**
 * The hash a request's snapshot is kept under. The backup token is separate from the device
 * token, so a restored phone that registers as a new device still finds its snapshot.
 */
export async function backupTokenHash(c: RouteContext): Promise<string> {
  const token = c.req.header(backupTokenHeader);
  if (token === undefined || !deviceTokenPattern.test(token)) {
    throw new ApiError('bad_request', `A valid ${backupTokenHeader} header is required`);
  }
  return hashDeviceToken(token);
}
