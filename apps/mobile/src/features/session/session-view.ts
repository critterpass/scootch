import {
  MINUTE_MS,
  type Instant,
  type LiveSession,
  type ParkedThought,
  type SessionEvent,
  type SessionState,
  type SettingsRow,
} from '@scootch/domain';

import type { ShownLine } from '../../state/day-types';

/** The control a finish is made with. Saying "done" has no control of its own. */
export type FinishControl = 'hold' | 'double_tap';

/** What the session screens show, worked out from the store's state and nothing else. */
export type SessionView =
  /** Nothing left to show: back to the one screen. */
  | { readonly kind: 'home' }
  /** The session is set and its start is on the way. */
  | { readonly kind: 'starting' }
  | { readonly kind: 'burst' }
  | {
      readonly kind: 'working';
      readonly quiet: boolean;
      readonly stuck: boolean;
      readonly twoMinutesLeft: boolean;
      readonly timeUp: boolean;
    }
  | {
      readonly kind: 'finish';
      readonly control: FinishControl;
      /** Time is up, so "Not finished" is offered beside finishing. */
      readonly timeUp: boolean;
    }
  | { readonly kind: 'not_finished' }
  /**
   * The catch: the finish screen stays up for a moment after a finish made by hand, so the burst
   * and the caught monster have a screen to play on before the reveal takes over. Everything the
   * finish records is already stored; only the hand-over waits.
   */
  | { readonly kind: 'caught'; readonly control: FinishControl }
  /** What the finish gave is shown on its own screens; the session waits behind them. */
  | { readonly kind: 'reveal' }
  /** The finish itself: the caught line, or the plain one of a serious task. */
  | { readonly kind: 'moment'; readonly quiet: boolean }
  | { readonly kind: 'treat'; readonly treat: string }
  | { readonly kind: 'thoughts'; readonly thoughts: readonly ParkedThought[] };

/** What the person has already passed on this visit to the session screens. */
export interface Passed {
  readonly burst: boolean;
  /** The catch has played, or was tapped away. */
  readonly caught: boolean;
  readonly moment: boolean;
  readonly treat: boolean;
  readonly thoughts: boolean;
  /** "I'm done" was tapped before time was up, and not taken back. */
  readonly finishingEarly: boolean;
}

export const NOTHING_PASSED: Passed = {
  burst: false,
  caught: false,
  moment: false,
  treat: false,
  thoughts: false,
  finishingEarly: false,
};

export interface SessionViewInput {
  readonly session: SessionState | null;
  readonly burst: 'start' | 'confetti' | null;
  readonly treat: string | null;
  readonly parkedThoughts: readonly ParkedThought[];
  readonly finishWith: SettingsRow['finishWith'];
  readonly passed: Passed;
  /**
   * The reveal of a finish: `pending` hands over to it, `seen` comes back from it. Left out, there
   * is no reveal and the finish says its caught line here.
   */
  readonly reveal?: 'pending' | 'seen';
  /** The catch may play before the reveal: see `catchPlays`. Left out, it does not. */
  readonly caught?: boolean;
}

/** How long the finish screen stays up for the catch before the reveal takes over. */
export const CAUGHT_HOLD_MS = 3200;

/** A finish made on the finish control itself: a completed hold, or the second of two taps. */
export function finishedByHand(event: SessionEvent): boolean {
  return event.type === 'hold_completed' || event.type === 'double_tapped';
}

/**
 * Whether the catch plays. Only straight after a finish made by hand on this visit (so never
 * after a relaunch), never when motion may not play, and never on a crisis day. A quiet session
 * has no reveal to wait for, so it never reaches it.
 */
export function catchPlays(facts: {
  readonly byHand: boolean;
  readonly reducedMotion: boolean;
  readonly crisis: boolean;
}): boolean {
  return facts.byHand && !facts.reducedMotion && !facts.crisis;
}

/**
 * The control shown for a finish method. Someone who chose to say "done" gets the tap-twice
 * control, which needs no holding either, alone until a spoken "done" can be heard and beside it
 * afterwards.
 */
export function finishControl(finishWith: SettingsRow['finishWith']): FinishControl {
  return finishWith === 'hold' ? 'hold' : 'double_tap';
}

function afterTheEnd(input: SessionViewInput): SessionView {
  const { parkedThoughts, passed } = input;
  if (parkedThoughts.length > 0 && !passed.thoughts) {
    return { kind: 'thoughts', thoughts: parkedThoughts };
  }
  return { kind: 'home' };
}

function afterFinish(session: LiveSession, input: SessionViewInput): SessionView {
  const quiet = session.tone === 'quiet';
  const { treat, passed } = input;
  // A serious task has no ceremony: no reveal, and the treat is never handed over with one.
  if (!quiet && input.reveal === 'pending') {
    return input.caught === true && !passed.caught
      ? { kind: 'caught', control: finishControl(input.finishWith) }
      : { kind: 'reveal' };
  }
  if (!quiet && treat !== null) {
    if (!passed.treat) return { kind: 'treat', treat };
  } else if (!passed.moment && (quiet || input.reveal !== 'seen')) {
    return { kind: 'moment', quiet };
  }
  return afterTheEnd(input);
}

/**
 * What the close control means on a view. While an ordinary session is running, closing is a
 * question first: the session never ends on one stray tap, and "keep going" changes nothing. A
 * quiet session, and every screen after the end, simply closes.
 */
export function closeMeans(view: SessionView): 'ask' | 'leave' {
  if (view.kind === 'burst') return 'ask';
  return view.kind === 'working' && !view.quiet && !view.timeUp ? 'ask' : 'leave';
}

export function sessionView(input: SessionViewInput): SessionView {
  const { session, passed } = input;
  if (session === null) return { kind: 'home' };
  switch (session.phase) {
    case 'let_go':
    case 'carried_over':
    case 'made_smaller':
      return afterTheEnd(input);
    case 'left_early':
      return { kind: 'home' };
    case 'set':
      return { kind: 'starting' };
    case 'finished':
      return afterFinish(session, input);
    case 'not_finished':
      return { kind: 'not_finished' };
    case 'running':
    case 'stuck':
    case 'holding':
    case 'time_up':
      break;
  }

  const quiet = session.tone === 'quiet';
  const timeUp = session.phase === 'time_up' || session.heldFrom === 'time_up';
  const working: SessionView = {
    kind: 'working',
    quiet,
    stuck: session.phase === 'stuck',
    twoMinutesLeft: session.warned && !timeUp,
    timeUp,
  };
  // A serious task has no burst and finishes with a plain tap on the working screen.
  if (quiet) return working;
  if (input.burst === 'start' && !passed.burst && session.phase === 'running') {
    return { kind: 'burst' };
  }
  if (timeUp || session.phase === 'holding' || passed.finishingEarly) {
    return { kind: 'finish', control: finishControl(input.finishWith), timeUp };
  }
  return working;
}

/** Whole minutes left, rounded up, so the last minute reads "1 min" until time is up. */
export function minutesLeft(session: Pick<LiveSession, 'endsAt'>, now: Instant): number {
  if (session.endsAt === null) return 0;
  return Math.max(0, Math.ceil((session.endsAt - now) / MINUTE_MS));
}

/** How much of the session is left, from 1 at the start down to 0 when time is up. */
export function timeLeftFraction(
  session: Pick<LiveSession, 'startedAt' | 'endsAt'>,
  now: Instant,
): number {
  if (session.startedAt === null || session.endsAt === null) return 0;
  const length = session.endsAt - session.startedAt;
  if (length <= 0) return 0;
  return Math.min(1, Math.max(0, (session.endsAt - now) / length));
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * The disc's diameter as a share of the ring it sits in, as the board draws it: a straight line in
 * the time left (232 of 330 with seven minutes of ten left, 92 with two), so the last minutes are
 * still a disc and not a dot. When time is up it is gone.
 */
export function discShare(fraction: number): number {
  const left = clamp01(fraction);
  return left === 0 ? 0 : (36 + 280 * left) / 330;
}

/**
 * Scootch's size on the disc as a share of the ring, as the board draws it: 200 of 330 with seven
 * minutes of ten left, 180 with two. He gives way a little as the disc shrinks and no more.
 */
export function scootchShare(fraction: number): number {
  return (172 + 40 * clamp01(fraction)) / 330;
}

/** The line shown under the timer: any line but the ones the stuck card and the finish carry. */
export function companyLine(line: ShownLine | null): string | null {
  if (line === null) return null;
  const elsewhere: readonly string[] = ['checkIn', 'tinyNextStep', 'timeUp', 'releasedEarly'];
  return elsewhere.includes(line.slot) ? null : line.text;
}
