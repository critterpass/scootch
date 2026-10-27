import type { HearingTokenResponse } from '../contracts';
import { ApiError } from '../errors';

export const scribeTokenUrl = 'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe';
export const scribeSocketUrl = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';
export const scribeModel = 'scribe_v2_realtime';

/** ElevenLabs' single-use tokens open one socket within fifteen minutes of being made. */
const TOKEN_LIFE_MS = 15 * 60_000;
/** The phone holds the microphone open while it waits for this, so it has to be quick. */
const TIMEOUT_MS = 4_000;

function unavailable(reason: string): ApiError {
  return new ApiError('model_unavailable', 'Hearing is not available', { reason });
}

/**
 * A single-use key to ElevenLabs Scribe Realtime, minted with the account's key, which never leaves
 * the server. The phone streams 16 kHz mono PCM to the socket and Scribe's voice detector settles
 * each phrase after a pause; no language is named, so it hears English or Vietnamese whatever the
 * app's language. Only the vendor's status is ever reported, never its body.
 */
export async function mintHearingToken(
  key: string | undefined,
  now: Date,
): Promise<HearingTokenResponse> {
  if (!key) throw unavailable('no_key');
  let response: Response;
  try {
    response = await fetch(scribeTokenUrl, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError('model_timeout', 'Hearing took too long to answer');
    }
    throw unavailable('network');
  }
  if (!response.ok) throw unavailable(`status_${response.status}`);
  const body = (await response.json().catch(() => null)) as { token?: unknown } | null;
  const token = body?.token;
  if (typeof token !== 'string' || token === '') throw unavailable('bad_response');
  return {
    token,
    expiresAt: new Date(now.getTime() + TOKEN_LIFE_MS).toISOString(),
    url: scribeSocketUrl,
    params: { model_id: scribeModel, audio_format: 'pcm_16000', commit_strategy: 'vad' },
  };
}
