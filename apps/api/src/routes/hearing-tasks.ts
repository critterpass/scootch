import { hearTasks } from '../ai/hearing-tasks';
import { hearingTasksRequestSchema } from '../contracts';
import { ApiError } from '../errors';
import { recordAiUsage } from '../ledger';
import { readBody, type RouteDefinition } from '../route';

const routeId = 'hearing.tasks';

/**
 * One utterance heard as tasks: one hold to talk, or what was typed, split only where the person
 * listed separate things, each task in their own words with a short chalk name. The phone sends
 * it while the words are on show and uses the answer only once it has checked it against what
 * was said; without an answer it hears with its own rules. The care screen is its own route and
 * still judges what was heard.
 *
 * The text goes to the fast generation model and nowhere else. It is not logged and not stored.
 */
export const hearingTasksRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/hearing/tasks',
  access: 'device',
  handle: async (c) => {
    const { text } = await readBody(c, hearingTasksRequestSchema);
    try {
      const heard = await hearTasks({ apiKey: c.env.ANTHROPIC_API_KEY }, text);
      c.executionCtx.waitUntil(
        recordAiUsage(c.env.DB, {
          route: routeId,
          model: heard.model,
          inputTokens: heard.inputTokens,
          outputTokens: heard.outputTokens,
          deviceHash: c.var.device.hash,
        }).catch(() => console.error('ai usage not recorded', { route: routeId })),
      );
      return c.json(heard.output);
    } catch (error) {
      // The reason only: an error here can never carry the text into the log.
      console.error('tasks not heard', {
        requestId: c.var.requestId,
        reason: error instanceof ApiError ? (error.detail?.['reason'] ?? error.code) : 'internal',
      });
      throw error;
    }
  },
};
