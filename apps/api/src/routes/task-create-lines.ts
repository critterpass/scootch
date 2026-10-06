import { taskCreateLinesRequestSchema } from '@scootch/domain';

import { continuationSecret, openContinuation } from '../ai/task-create/continuation';
import { writeLines } from '../ai/task-create/write-lines';
import { ApiError } from '../errors';
import { readBody, type RouteDefinition } from '../route';

/**
 * Stage two of the task call: the monster's name and card, the session's lines and the day's
 * notifications, for the one thing a continuation from `POST /v1/task-create` names. It can be
 * asked again until the continuation expires, and it always answers a good continuation: with
 * offline lines when the writer cannot.
 *
 * The `X-Voice-Check` header carries counts only: writer calls made, lines replaced by offline
 * lines, and whether the answer came from the writer or is offline throughout.
 */
export const taskCreateLinesRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/task-create/lines',
  access: 'device',
  handle: async (c) => {
    const { continuation } = await readBody(c, taskCreateLinesRequestSchema);
    const payload = await openContinuation(
      continuationSecret(c.env) ?? '',
      c.var.device.hash,
      continuation,
    );
    if (payload === 'invalid' || payload === 'expired') {
      throw new ApiError('bad_request', 'The continuation cannot be used', {
        reason: `continuation_${payload}`,
      });
    }
    const { response, voice } = await writeLines(
      { env: c.env, deviceHash: c.var.device.hash, requestId: c.var.requestId },
      payload,
    );
    c.header(
      'X-Voice-Check',
      `attempts=${voice.attempts}; replaced=${voice.replaced}; source=${voice.source}`,
    );
    return c.json(response);
  },
};
