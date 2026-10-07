import { issueSpeechToken, speechModel } from '../ai/elevenlabs';
import type { SpeechTokenResponse } from '../contracts';
import { recordAiUsage } from '../ledger';
import type { RouteDefinition } from '../route';

const routeId = 'speech.token';

/**
 * The pass a phone opens one live transcription with. The audio goes from the phone straight to
 * ElevenLabs and the words come straight back: neither reaches this Worker, and nothing about
 * what was said is logged or stored. The ledger counts the pass, since speech is billed by the
 * minute and not by tokens.
 */
export const speechTokenRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/speech-token',
  access: 'device',
  handle: async (c) => {
    const token = await issueSpeechToken(c.env.ELEVENLABS_API_KEY);
    try {
      await recordAiUsage(c.env.DB, {
        route: routeId,
        model: speechModel,
        inputTokens: 0,
        outputTokens: 0,
        deviceHash: c.var.device.hash,
      });
    } catch {
      // A ledger failure must not cost the caller a pass it already has.
      console.error('ai usage not recorded', { route: routeId, model: speechModel });
    }
    return c.json({ token } satisfies SpeechTokenResponse);
  },
};
