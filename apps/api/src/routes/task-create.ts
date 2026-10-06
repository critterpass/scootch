import { taskCreateRequestSchema } from '@scootch/domain';

import { createTask } from '../ai/task-create/create-task';
import { readBody, type RouteDefinition } from '../route';

/**
 * The one call per task: screens the text, then answers with the one thing, the parked rest, any
 * dates heard, the monster's words, the session's lines and the day's notifications.
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
    const { response, voice } = await createTask(
      { env: c.env, deviceHash: c.var.device.hash, requestId: c.var.requestId },
      request,
    );
    c.header('X-Voice-Check', `attempts=${voice.attempts}; replaced=${voice.replaced}`);
    return c.json(response);
  },
};
