import type { SessionEvent } from '@scootch/domain';

/** What the control is: one that is held until it fills, or one that is tapped twice. */
export type HoldKind = 'hold' | 'double_tap';

/** A full hold takes this long; a ring let go of drains back in this long. */
export const HOLD_FILL_MS = 1700;
export const HOLD_DRAIN_MS = 450;
/** A shorter touch than this share of the ring is a brush, and says nothing. */
export const HOLD_NOTICED_FROM = 0.08;
/** The second tap confirms within this long; after it the first tap is forgotten. */
export const CONFIRM_WINDOW_MS = 4000;

export type HoldCaption = 'idle' | 'holding' | 'nearly' | 'confirm';

/** The finish control between frames: how full the ring is and what the caption says. */
export interface HoldControl {
  readonly control: HoldKind;
  /** 0 to 1, linear in time. Drawing eases it. */
  readonly progress: number;
  readonly holding: boolean;
  /** When the first of two taps landed. */
  readonly armedAt: number | null;
  readonly caption: HoldCaption;
  readonly finished: boolean;
}

export type HoldInput =
  | { readonly type: 'pressed' }
  | { readonly type: 'released' }
  | { readonly type: 'frame'; readonly elapsedMs: number }
  /** A tap: the tap-twice control, and VoiceOver's double-tap on the hold control. */
  | { readonly type: 'tapped'; readonly at: number }
  /** The store has answered the finish. If this control is still on the screen, it was not taken. */
  | { readonly type: 'settled' };

export interface HoldStep {
  readonly control: HoldControl;
  /** Session events to dispatch, in order. */
  readonly send: readonly SessionEvent[];
}

/**
 * Whether a finished control starts over once the store has answered. Only one that is still on
 * the screen and whose finish was not taken does: while the catch plays on the same screen the
 * control stays as it ended, ring full, and a screen that has gone has nothing to reset.
 */
export function startsOverAfterAnswer(facts: {
  readonly onScreen: boolean;
  readonly taken: boolean;
}): boolean {
  return facts.onScreen && !facts.taken;
}

export function holdControl(control: HoldKind): HoldControl {
  return { control, progress: 0, holding: false, armedAt: null, caption: 'idle', finished: false };
}

const same = (control: HoldControl): HoldStep => ({ control, send: [] });

/**
 * The finish control as a reducer. Holding fills the ring and finishes when it is full; letting go
 * early drains it, with nothing lost and nothing said against it. A tap arms the control and a
 * second tap in time finishes. Every finish is one session event, and nothing follows it until
 * the store has answered.
 */
export function holdReducer(state: HoldControl, input: HoldInput): HoldStep {
  // A finish the store refused leaves the session running: the control starts over with it.
  if (input.type === 'settled') return same(state.finished ? holdControl(state.control) : state);
  if (state.finished) return same(state);
  switch (input.type) {
    case 'pressed':
      if (state.control !== 'hold' || state.holding) return same(state);
      return {
        control: { ...state, holding: true, armedAt: null, caption: 'holding' },
        send: [{ type: 'hold_started' }],
      };
    case 'released': {
      if (!state.holding) return same(state);
      const caption = state.progress > HOLD_NOTICED_FROM ? 'nearly' : 'idle';
      return {
        control: { ...state, holding: false, caption },
        send: [{ type: 'hold_released' }],
      };
    }
    case 'frame': {
      const elapsed = Math.max(0, input.elapsedMs);
      if (!state.holding) {
        if (state.progress === 0) return same(state);
        return same({ ...state, progress: Math.max(0, state.progress - elapsed / HOLD_DRAIN_MS) });
      }
      const progress = Math.min(1, state.progress + elapsed / HOLD_FILL_MS);
      if (progress < 1) return same({ ...state, progress });
      return {
        control: { ...state, progress: 1, holding: false, finished: true },
        send: [{ type: 'hold_completed' }],
      };
    }
    case 'tapped': {
      if (state.holding) return same(state);
      const armed = state.armedAt !== null && input.at - state.armedAt <= CONFIRM_WINDOW_MS;
      if (!armed) return same({ ...state, armedAt: input.at, caption: 'confirm' });
      return {
        control: { ...state, armedAt: null, finished: true },
        send: [{ type: 'double_tapped' }],
      };
    }
  }
}

/** The ring's fill as drawn: slow to leave, slow to arrive. */
export function easedProgress(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}
