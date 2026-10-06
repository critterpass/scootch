import { taskCreateNameRequestSchema, type TaskCreateNameResponse } from '@scootch/domain';

import {
  continuationSecret,
  openContinuation,
  sealContinuation,
} from '../ai/task-create/continuation';
import { writeName } from '../ai/task-create/write-lines';
import { ApiError } from '../errors';
import { readBody, type RouteDefinition } from '../route';

/**
 * The monster first: its name and card and the line it hatches with, for the one thing a
 * continuation from `POST /v1/task-create` names. The answer carries a continuation of its own,
 * which `POST /v1/task-create/pack` turns into every other line while the hatch plays. A good
 * continuation is always answered: with a name made in code when the writer cannot.
 *
 * The `X-Voice-Check` header carries counts only, as on `/v1/task-create/lines`.
 */
export const taskCreateNameRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/task-create/name',
  access: 'device',
  handle: async (c) => {
    const { continuation } = await readBody(c, taskCreateNameRequestSchema);
    const secret = continuationSecret(c.env) ?? '';
    const payload = await openContinuation(secret, c.var.device.hash, continuation);
    if (payload === 'invalid' || payload === 'expired') {
      throw new ApiError('bad_request', 'The continuation cannot be used', {
        reason: `continuation_${payload}`,
      });
    }
    const { monster, hatch, voice } = await writeName(
      { env: c.env, deviceHash: c.var.device.hash, requestId: c.var.requestId },
      payload,
    );
    c.header(
      'X-Voice-Check',
      `attempts=${voice.attempts}; replaced=${voice.replaced}; source=${voice.source}`,
    );
    return c.json({
      monster,
      hatch,
      continuation: await sealContinuation(secret, c.var.device.hash, {
        ...payload,
        monsterName: monster.name,
      }),
    } satisfies TaskCreateNameResponse);
  },
};
