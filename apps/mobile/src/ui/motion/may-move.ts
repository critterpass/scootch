/** How much care the moment asks for: an ordinary one, a serious task, or a crisis day. */
export type MotionCare = 'none' | 'serious' | 'crisis';

/** Everything that can hold the app still. */
export interface MotionFacts {
  /** The system's Reduce Motion. */
  readonly systemReducedMotion: boolean;
  /** The app's own Motion switch in Settings. */
  readonly motion: 'full' | 'calm';
  /** A registry capture, which must look the same every time. */
  readonly captured: boolean;
  readonly care: MotionCare;
}

export interface Feel {
  /**
   * The one answer to "may this move?" for the interface: presses, entrances, bursts, flips. False
   * means a crossfade at most.
   */
  readonly mayMove: boolean;
  /** What a character is told. A serious task still lets it breathe, through its `care`. */
  readonly character: { readonly reducedMotion: boolean; readonly care: MotionCare };
}

/**
 * Whether anything may move. The system's Reduce Motion always wins, then the person's own Motion
 * switch; a capture is always still. A serious task and a crisis day get no theatre: the interface
 * only fades, and a character is left to its own care rule (a breath, or nothing at all).
 */
export function feelFor(facts: MotionFacts): Feel {
  const still = facts.systemReducedMotion || facts.motion === 'calm' || facts.captured;
  return {
    mayMove: !still && facts.care === 'none',
    character: { reducedMotion: still, care: facts.care },
  };
}

/** What a tap on a control feels like: the one action of a screen, one choice among several, or nothing. */
export type TouchFeedback = 'primary' | 'choice' | 'none';
