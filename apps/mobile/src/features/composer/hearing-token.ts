import { hearingTokenResponseSchema, type HearingTokenResponse } from '@phusclass/domain';

import type { HttpClient } from '../../api/http-client';

/** The microphone is already on while this is asked for: a slow answer is a failed one. */
export const HEARING_TOKEN_TIMEOUT_MS = 3_500;
/** A kept token is used only while it has at least this long left to open a socket. */
const SPARE_MS = 60_000;

export type FetchToken = () => Promise<HearingTokenResponse>;

/** Asks the server for a single-use key to the transcriber. */
export function fetchHearingToken(http: HttpClient): FetchToken {
  return () =>
    http.post('/v1/hearing/token', {}, (json) => hearingTokenResponseSchema.parse(json), {
      timeoutMs: HEARING_TOKEN_TIMEOUT_MS,
    });
}

export interface TokenSource {
  /** A token for this hold: the one kept ready if it is still good, otherwise a new one. */
  take(): Promise<HearingTokenResponse>;
  /** Gets a token ready for the next hold, if none is. Failure is quiet: `take` asks again. */
  warm(): void;
}

/**
 * Keeps one single-use token ready, so a hold opens its socket without waiting for the server.
 * Each token is handed out once.
 */
export function createTokenSource(fetch: FetchToken, now: () => number = Date.now): TokenSource {
  let kept: HearingTokenResponse | null = null;
  let coming: Promise<void> | null = null;

  const fresh = (token: HearingTokenResponse | null): token is HearingTokenResponse =>
    token !== null && Date.parse(token.expiresAt) - now() > SPARE_MS;

  return {
    take: async () => {
      if (coming !== null) await coming;
      const ready = kept;
      kept = null;
      return fresh(ready) ? ready : fetch();
    },
    warm: () => {
      if (fresh(kept) || coming !== null) return;
      coming = fetch()
        .then(
          (token) => {
            kept = token;
          },
          () => undefined,
        )
        .finally(() => {
          coming = null;
        });
    },
  };
}
