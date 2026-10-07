/** A pass is good for fifteen minutes; one held longer than this is not trusted to still work. */
export const TOKEN_KEEP_MS = 10 * 60_000;

export interface SpeechTokens {
  /** Fetches a pass ahead of time, so the next recording starts without waiting for one. */
  warm(): void;
  /** The pass for one recording: the one fetched ahead when it is still good, or a new one. */
  take(): Promise<string>;
}

/** Hands out the single-use passes live transcription is opened with, each used once. */
export function speechTokens(
  fetchToken: () => Promise<string>,
  now: () => number = Date.now,
): SpeechTokens {
  let held: { readonly at: number; readonly token: Promise<string> } | null = null;
  const good = () => held !== null && now() - held.at <= TOKEN_KEEP_MS;
  return {
    warm() {
      if (good()) return;
      const token = fetchToken();
      // A pass that could not be fetched is asked for again when a recording needs it.
      token.catch(() => undefined);
      held = { at: now(), token };
    },
    take() {
      const ahead = good() ? held : null;
      held = null;
      return ahead === null ? fetchToken() : ahead.token.catch(() => fetchToken());
    },
  };
}
