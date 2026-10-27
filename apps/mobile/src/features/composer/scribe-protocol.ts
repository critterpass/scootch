import type { HearingTokenResponse } from '@phusclass/domain';

/** What one message from ElevenLabs Scribe Realtime says. */
export type Reading =
  /** The words of the phrase being spoken, as guessed so far: each replaces the last. */
  | { readonly kind: 'partial'; readonly text: string }
  /** A phrase settled, after a pause or a commit. Empty when there was nothing left to settle. */
  | { readonly kind: 'committed'; readonly text: string }
  /** Nothing was said: no more words will come. */
  | { readonly kind: 'silence' }
  /** Scribe refused or broke off the session. */
  | { readonly kind: 'error' }
  | { readonly kind: 'ignore' };

/** The socket's address: the server's parameters with the single-use token. */
export function socketUrl(token: HearingTokenResponse): string {
  const query = Object.entries({ ...token.params, token: token.token })
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `${token.url}?${query}`;
}

/** One chunk of 16 kHz mono 16-bit PCM, base64, as Scribe takes it. */
export function audioMessage(chunk: string): string {
  return JSON.stringify({
    message_type: 'input_audio_chunk',
    audio_base_64: chunk,
    commit: false,
    sample_rate: 16_000,
  });
}

/** Settles whatever has been said since the last phrase: the finger is up. */
export const COMMIT_MESSAGE = JSON.stringify({
  message_type: 'input_audio_chunk',
  audio_base_64: '',
  commit: true,
  sample_rate: 16_000,
});

/** The message types that end a session. */
const ERRORS = new Set([
  'error',
  'auth_error',
  'quota_exceeded',
  'commit_throttled',
  'unaccepted_terms',
  'rate_limited',
  'queue_overflow',
  'resource_exhausted',
  'session_time_limit_exceeded',
  'input_error',
  'invalid_request',
  'chunk_size_exceeded',
  'insufficient_audio_activity_error',
  'transcriber_error',
]);

const IGNORE: Reading = { kind: 'ignore' };

export function readScribe(message: unknown): Reading {
  if (typeof message !== 'string') return IGNORE;
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(message);
    if (typeof parsed !== 'object' || parsed === null) return IGNORE;
    body = parsed as Record<string, unknown>;
  } catch {
    return IGNORE;
  }
  const type = body['message_type'];
  const text = typeof body['text'] === 'string' ? body['text'] : '';
  switch (type) {
    case 'partial_transcript':
      return { kind: 'partial', text };
    case 'committed_transcript':
      return { kind: 'committed', text };
    case 'insufficient_audio_activity':
      return { kind: 'silence' };
    default:
      return typeof type === 'string' && (ERRORS.has(type) || type.endsWith('_error'))
        ? { kind: 'error' }
        : IGNORE;
  }
}
