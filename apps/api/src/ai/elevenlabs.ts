import { z } from 'zod';

import { ApiError } from '../errors';

/**
 * ElevenLabs, which turns speech into text while the phone is online. The phone streams its
 * microphone straight to ElevenLabs; this Worker only issues the pass that lets it, so no audio
 * and no transcript ever passes through here.
 */
export const speechTokenUrl = 'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe';
/** The model the pass is used with, as the cost ledger names it. */
export const speechModel = 'scribe_v2_realtime';
export const speechTokenTimeoutMs = 3000;

const tokenAnswerSchema = z.object({ token: z.string().min(1) });

/**
 * A pass for one live transcription: it works once and expires within minutes. Fails with
 * `model_unavailable` (no key, or ElevenLabs refused) or `model_timeout`; either way the phone
 * transcribes by itself.
 */
export async function issueSpeechToken(apiKey: string | undefined): Promise<string> {
  if (apiKey === undefined || apiKey === '') {
    throw new ApiError('model_unavailable', 'Speech is not set up', { reason: 'missing_key' });
  }
  let response: Response;
  try {
    response = await fetch(speechTokenUrl, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      signal: AbortSignal.timeout(speechTokenTimeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new ApiError('model_timeout', 'Speech took too long');
    }
    throw new ApiError('model_unavailable', 'Speech is not answering', {
      reason: 'transport_error',
    });
  }
  if (!response.ok) {
    throw new ApiError('model_unavailable', 'Speech is not answering', {
      reason: response.status === 429 ? 'rate_limited' : 'provider_error',
    });
  }
  const answer = tokenAnswerSchema.safeParse(await response.json().catch(() => null));
  if (!answer.success) {
    throw new ApiError('model_unavailable', 'Speech is not answering', {
      reason: 'invalid_response',
    });
  }
  return answer.data.token;
}
