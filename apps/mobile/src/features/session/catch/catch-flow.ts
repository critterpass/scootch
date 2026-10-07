import type { SessionView } from '../session-view';

/**
 * Where a catch stands. The work sets the trap (`setting`); when time is up Scootch asks whether
 * the thing was really done (`asking`); "Not yet" waits for the person to say so (`waiting`); only
 * a yes unlocks the gesture (`ready`); and then the monster is caught.
 */
export type CatchStage = 'coach' | 'setting' | 'asking' | 'waiting' | 'ready' | 'caught';

/** What the person has told Scootch since time was up. */
export type CatchAnswer = 'none' | 'yes' | 'not_yet';

/**
 * The stage for a view of the session and the person's answer. Saying "I'm done" before time is
 * up is already the answer, so it goes straight to the gesture; time running out always asks.
 */
export function catchStage(view: SessionView, answer: CatchAnswer): CatchStage {
  if (view.kind === 'coach') return 'coach';
  if (view.kind === 'caught') return 'caught';
  if (view.kind !== 'finish') return 'setting';
  if (!view.timeUp || answer === 'yes') return 'ready';
  return answer === 'not_yet' ? 'waiting' : 'asking';
}

/** The gesture works at no other stage: the monster cannot be caught early. */
export function gestureUnlocked(stage: CatchStage): boolean {
  return stage === 'ready';
}

/** How far the trap has set, from 0 to 1: the share of the time gone, and whole once unlocked. */
export function trapProgress(stage: CatchStage, timeLeftFraction: number): number {
  if (stage === 'coach') return 0;
  if (stage === 'ready' || stage === 'caught') return 1;
  return Math.min(1, Math.max(0, 1 - timeLeftFraction));
}

/**
 * When the session ends, as a clock reads it on this phone ("12:47"): the other thing the corner
 * can show while the trap sets.
 */
export function endsAtClock(timeLeftFraction: number, plannedMinutes: number, now: number): string {
  const left = Math.min(1, Math.max(0, timeLeftFraction)) * plannedMinutes * 60_000;
  const end = new Date(now + left);
  return `${end.getHours()}:${String(end.getMinutes()).padStart(2, '0')}`;
}

/** The time left as the corner shows it while the trap sets: minutes and seconds. */
export function clockLeft(timeLeftFraction: number, plannedMinutes: number): string {
  const left = Math.round(Math.min(1, Math.max(0, timeLeftFraction)) * plannedMinutes * 60);
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}
