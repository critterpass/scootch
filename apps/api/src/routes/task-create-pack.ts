import { taskCreatePackRequestSchema } from '@scootch/domain';

import { continuationSecret, openContinuation } from '../ai/task-create/continuation';
import { writePack } from '../ai/task-create/write-lines';
import { ApiError } from '../errors';
import { readBody, type RouteDefinition } from '../route';

/**
 * The rest of the pack: every session line but the hatch, and the day's notifications, about the
 * monster `POST /v1/task-create/name` named. It takes that answer's continuation, and the treat
 * when it is known, which the treat line then names. A good continuation is always answered:
 * with offline lines when the writer cannot.
 *
 * The `X-Voice-Check` header carries counts only, as on `/v1/task-create/lines`.
 */
export const taskCreatePackRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/task-create/pack',
  access: 'device',
  handle: async (c) => {
    const { continuation, treat } = await readBody(c, taskCreatePackRequestSchema);
    const payload = await openContinuation(
      continuationSecret(c.env) ?? '',
      c.var.device.hash,
      continuation,
    );
    // Only a continuation from the name answer will do: the pack is about a named monster.
    const opened =
      typeof payload === 'object' && payload.monsterName === undefined ? 'invalid' : payload;
    if (opened === 'invalid' || opened === 'expired') {
      throw new ApiError('bad_request', 'The continuation cannot be used', {
        reason: `continuation_${opened}`,
      });
    }
    const { response, voice } = await writePack(
      { env: c.env, deviceHash: c.var.device.hash, requestId: c.var.requestId },
      { ...opened, monsterName: opened.monsterName ?? '' },
      treat,
    );
    c.header(
      'X-Voice-Check',
      `attempts=${voice.attempts}; replaced=${voice.replaced}; source=${voice.source}`,
    );
    return c.json(response);
  },
};
