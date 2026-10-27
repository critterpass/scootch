import { mintHearingToken, scribeModel } from '../ai/hearing-token';
import { ApiError } from '../errors';
import { recordAiUsage } from '../ledger';
import type { RouteDefinition } from '../route';

const routeId = 'hearing.token';

/**
 * A single-use key for the phone to stream one hold of the microphone to the transcriber. The
 * phone asks for it as the finger goes down, with the microphone already listening, so it answers
 * at once. Each key minted is one row in the cost ledger, written after the answer.
 */
export const hearingTokenRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/hearing/token',
  access: 'device',
  handle: async (c) => {
    try {
      const minted = await mintHearingToken(c.env.ELEVENLABS_API_KEY, new Date());
      c.executionCtx.waitUntil(
        recordAiUsage(c.env.DB, {
          route: routeId,
          model: scribeModel,
          inputTokens: 0,
          outputTokens: 0,
          deviceHash: c.var.device.hash,
        }).catch(() => console.error('ai usage not recorded', { route: routeId })),
      );
      return c.json(minted);
    } catch (error) {
      console.error('hearing token not minted', {
        requestId: c.var.requestId,
        reason: error instanceof ApiError ? (error.detail?.['reason'] ?? error.code) : 'internal',
      });
      throw error;
    }
  },
};
