import { taskCreateRequestSchema, type TaskCreateStartResponse } from '@scootch/domain';

import { sealContinuation } from '../ai/task-create/continuation';
import { createTask, startTask } from '../ai/task-create/create-task';
import { ApiError } from '../errors';
import { readBody, type RouteDefinition } from '../route';

/**
 * The task call. With `staged: true` it answers with stage one alone: the verdict, the one thing,
 * the parked rest, any dates heard and the labels, plus a continuation that
 * `POST /v1/task-create/lines` turns into the monster's words. Without it, both stages are
 * answered at once, as before.
 *
 * The `X-Voice-Check` header carries counts only (writer calls made, lines replaced by offline
 * lines), so an eval can see how often the check fired without the answer changing shape.
 */
export const taskCreateRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/task-create',
  access: 'device',
  handle: async (c) => {
    const request = await readBody(c, taskCreateRequestSchema);
    const context = {
      env: c.env,
      deviceHash: c.var.device.hash,
      requestId: c.var.requestId,
      defer: (work: Promise<unknown>) => c.executionCtx.waitUntil(work),
    };
    if (request.staged !== true) {
      const { response, voice } = await createTask(context, request);
      c.header('X-Voice-Check', `attempts=${voice.attempts}; replaced=${voice.replaced}`);
      return c.json(response);
    }

    const start = await startTask(context, request);
    if (start.verdict !== 'pass') return c.json(start.response satisfies TaskCreateStartResponse);
    const secret = c.env.DEEPSEEK_API_KEY;
    if (secret === undefined || secret === '') {
      throw new ApiError('model_unavailable', 'The model is not answering', {
        reason: 'missing_key',
      });
    }
    const continuation = await sealContinuation(secret, context.deviceHash, start.payload);
    return c.json({ ...start.response, continuation } satisfies TaskCreateStartResponse);
  },
};
