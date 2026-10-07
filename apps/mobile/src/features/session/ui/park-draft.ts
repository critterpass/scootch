import type { ComposerState } from '../../composer/composer-machine';

/** A typed thought is a few words, not a note. A spoken one is as long as it was said. */
export const THOUGHT_MAX = 120;

/**
 * The words the park field holds right now: what has been typed, or what has been heard so far of
 * a recording still under way. Closing the field parks these, so nothing written or said is lost.
 */
export function parkDraft(state: Pick<ComposerState, 'phase' | 'text' | 'transcript'>): string {
  const recording = state.phase === 'listening' || state.phase === 'finishing';
  return (recording ? state.transcript : state.text).trim();
}
