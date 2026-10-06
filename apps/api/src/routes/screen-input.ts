import { screenText, unscreenedResponse } from '../ai/screen-input';
import { screenInputRequestSchema, type ScreenInputResponse } from '../contracts';
import { ApiError } from '../errors';
import { readBody, type RouteDefinition } from '../route';

const routeId = 'screen.input';

/**
 * The care screen: is this text ordinary, serious or a crisis, or not a note at all (`reject`:
 * abuse or an attempt to instruct the app). Nothing funny is said about a task until this has
 * answered. When no model answers, the answer is `serious`, never `pass`.
 *
 * The text goes to the decision model, and to the fast generation model when it must stand in for
 * Jev or restore the marks of Vietnamese typed without them. It is not logged and not stored.
 */
export const screenInputRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/screen-input',
  access: 'device',
  handle: async (c) => {
    const { text } = await readBody(c, screenInputRequestSchema);

    let response: ScreenInputResponse;
    try {
      response = await screenText(
        { env: c.env, route: routeId, deviceHash: c.var.device.hash },
        text,
      );
    } catch (error) {
      // The reason only: an error here can never carry the text into the log.
      console.error('input not screened', {
        requestId: c.var.requestId,
        reason: error instanceof ApiError ? error.code : 'internal',
      });
      response = unscreenedResponse;
    }
    return c.json(response);
  },
};
