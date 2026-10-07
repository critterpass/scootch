import { useEffect } from 'react';

import type { Stage } from './one-screen-stage';

/**
 * Whether the words last sent can still become a reveal. They wait through the composer and the
 * battery question, and are played on the one thing. Anywhere else (a serious task set plainly, a
 * hatch, a finished day), or once the words were handed back or turned away, they are stale.
 */
export function sentWordsAreStale(
  stage: Stage['kind'],
  handedBack: boolean,
  turnedAway: boolean,
): boolean {
  if (handedBack || turnedAway) return true;
  return stage !== 'composer' && stage !== 'energy' && stage !== 'one_thing';
}

/** Lets go of the sent words as soon as they can no longer be played. */
export function useForgetSentWords(stale: boolean, sent: string | null, forget: () => void): void {
  useEffect(() => {
    if (stale && sent !== null) forget();
  }, [stale, sent, forget]);
}
