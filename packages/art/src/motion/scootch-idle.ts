import { eventStart, lid, seeded, smooth } from './loop-math';

/** The idle values, named as the drawing takes them. All rest at zero. */
export interface ScootchIdleMotion {
  /** Breathing, -1 to 1. */
  readonly bob: number;
  /** 0 eyes open, 1 shut. */
  readonly blink: number;
  readonly gazeX: number;
  readonly gazeY: number;
}

/** The design breathes with sin(2t): one breath every pi seconds. */
export const BREATH_RATE = 2;
/** The design blinks every 3.7 seconds for 0.12 seconds. */
export const BLINK_EVERY_S = 3.7;
export const BLINK_LENGTH_S = 0.12;
const BLINK_SPREAD_S = 1.1;
/** One blink in six is a double. */
const DOUBLE_BLINK_SHARE = 1 / 6;
const DOUBLE_BLINK_GAP_S = 0.3;

const GLANCE_EVERY_S = 9;
const GLANCE_SPREAD_S = 2.5;
export const GLANCE_LENGTH_S = 1.4;
const GLANCE_EASE_S = 0.25;
/** Half the windows pass without a glance. */
const GLANCE_SHARE = 0.5;
const GLANCE_X = 0.6;
const GLANCE_Y = -0.15;

function blinkAt(t: number, seed: string): number {
  const nearest = Math.round(t / BLINK_EVERY_S);
  let shut = 0;
  // The spread is under half the spacing, so only the neighbouring events can cover `t`.
  for (let index = Math.max(1, nearest - 1); index <= nearest + 1; index++) {
    const start = eventStart(seed, 1, index, BLINK_EVERY_S, BLINK_SPREAD_S);
    shut = Math.max(shut, lid(t - start, BLINK_LENGTH_S));
    if (seeded(seed, 2 + index * 13) < DOUBLE_BLINK_SHARE) {
      shut = Math.max(shut, lid(t - start - DOUBLE_BLINK_GAP_S, BLINK_LENGTH_S));
    }
  }
  return shut;
}

/** How far into a glance Scootch is, 0 to 1, and which way it looks: -1 left, 1 right. */
function glanceAt(t: number, seed: string): { amount: number; side: -1 | 1 } {
  const nearest = Math.round(t / GLANCE_EVERY_S);
  for (let index = Math.max(1, nearest - 1); index <= nearest + 1; index++) {
    if (seeded(seed, 3 + index * 17) >= GLANCE_SHARE) continue;
    const since = t - eventStart(seed, 4, index, GLANCE_EVERY_S, GLANCE_SPREAD_S);
    if (since <= 0 || since >= GLANCE_LENGTH_S) continue;
    const amount = Math.min(
      smooth(since / GLANCE_EASE_S),
      smooth((GLANCE_LENGTH_S - since) / GLANCE_EASE_S),
    );
    return { amount, side: seeded(seed, 5 + index * 19) < 0.5 ? -1 : 1 };
  }
  return { amount: 0, side: 1 };
}

/**
 * Scootch's idle at `t` seconds: a slow breath, a blink every few seconds at uneven intervals
 * (now and then a double), and an occasional glance to one side. The same seed always gives the
 * same idle; at zero everything rests.
 */
export function scootchIdle(t: number, seed: string): ScootchIdleMotion {
  const glance = glanceAt(t, seed);
  return {
    bob: Math.sin(t * BREATH_RATE),
    blink: blinkAt(t, seed),
    gazeX: glance.side * GLANCE_X * glance.amount,
    gazeY: GLANCE_Y * glance.amount,
  };
}

/** Breathing alone, for a serious task: nothing else moves. */
export function scootchBreath(t: number): number {
  return Math.sin(t * BREATH_RATE);
}
