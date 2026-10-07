import { useEffect, useRef, useState } from 'react';

import type { ComposerState } from './composer-machine';

/**
 * What a change in the composer sounds and feels like, as the design's composer plays it: a tick
 * for switching between talking and typing, the listen sound as a hold begins, a tap as the cancel
 * arms, the cancel sound when a recording is thrown away, and the send sound as words go.
 */
export type ComposerFeedback = 'tick' | 'listen' | 'arm' | 'cancel' | 'send';

const GOING: readonly ComposerState['phase'][] = ['finishing', 'sending'];

export function composerFeedback(before: ComposerState, after: ComposerState): ComposerFeedback[] {
  const feedback: ComposerFeedback[] = [];
  // The mode also changes by itself when the phone turns out not to listen: that is not a tap.
  if (before.mode !== after.mode && before.voice === after.voice) feedback.push('tick');
  if (before.phase === 'idle' && after.phase === 'listening') feedback.push('listen');
  if (!before.armed && after.armed) feedback.push('arm');
  if (before.notice !== 'cancelled' && after.notice === 'cancelled') feedback.push('cancel');
  if (!GOING.includes(before.phase) && GOING.includes(after.phase)) feedback.push('send');
  return feedback;
}

/** How long Scootch's nudge lasts after a cancel, as the design holds it. */
const NUDGE_MS = 1200;

/**
 * Plays the composer's feedback as its state changes, and answers with whether Scootch is giving
 * his small "no harm done" nudge after a cancel. `play` is the cue player, which obeys the sound
 * and haptics switches; `tap` is the bare haptic for arming the cancel.
 */
export function useComposerFeedback(
  state: ComposerState,
  play: (cue: string) => void,
  tap: () => void,
): { readonly nudging: boolean } {
  const before = useRef(state);
  const [nudging, setNudging] = useState(false);
  // Kept across state changes: a hold straight after a cancel must not leave the nudge on.
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const feedback = composerFeedback(before.current, state);
    before.current = state;
    for (const one of feedback) {
      if (one === 'arm') tap();
      else play(one);
      if (one === 'cancel') {
        clearTimeout(nudgeTimer.current);
        setNudging(true);
        nudgeTimer.current = setTimeout(() => setNudging(false), NUDGE_MS);
      }
    }
    // The players are stable for the life of the screen.
  }, [state]);
  useEffect(() => () => clearTimeout(nudgeTimer.current), []);
  return { nudging };
}
