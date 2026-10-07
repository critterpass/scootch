import {
  boilFrame,
  moodBeat,
  scootchBreath,
  scootchIdle,
  WORK_LOOPS,
  workLoop,
  type BoilFrame,
  type buildScootch,
  type ScootchLook,
  type ScootchMotion,
} from '@scootch/art';

type ScootchDrawing = Parameters<typeof buildScootch>[0];
type Mood = ScootchDrawing['mood'];
type WorkMode = NonNullable<ScootchDrawing['workMode']>;

/** How much care the moment asks for: a serious task only breathes, a crisis day is still. */
export type MotionCare = 'none' | 'serious' | 'crisis';

export interface ScootchMotionInput {
  readonly mood: Mood;
  readonly workMode: WorkMode | null;
  /** The system's Reduce Motion, or the forced variant of a capture. */
  readonly reducedMotion: boolean;
  readonly care: MotionCare;
  /** False keeps the mood's or the work mode's own motion off: idle only, as at a table. */
  readonly ownLoop: boolean;
}

/** What moves. With everything false the character is a still and nothing is scheduled. */
export interface ScootchMotionPlan {
  readonly breath: boolean;
  readonly blink: boolean;
  readonly glance: boolean;
  /** The line boil: the same drawing in three stroke sets, four a second. */
  readonly boil: boolean;
  /** The mood's or the work mode's own motion: its body, its hands and what floats around it. */
  readonly loop: 'none' | 'mood' | 'work';
}

const STILL: ScootchMotionPlan = {
  breath: false,
  blink: false,
  glance: false,
  boil: false,
  loop: 'none',
};
const BREATH_ONLY: ScootchMotionPlan = { ...STILL, breath: true };

function loopOf(input: ScootchMotionInput): ScootchMotionPlan['loop'] {
  if (!input.ownLoop) return 'none';
  return input.mood === 'working' && input.workMode && input.workMode in WORK_LOOPS
    ? 'work'
    : 'mood';
}

/**
 * Decides what moves. Reduce Motion and a crisis day move nothing; a serious task, by its flag or
 * by the serious mood, only breathes. Otherwise Scootch breathes, blinks, boils and runs its own
 * motion, all at once; it glances about unless a work mode holds its eyes on the work.
 */
export function scootchMotionPlan(input: ScootchMotionInput): ScootchMotionPlan {
  if (input.reducedMotion || input.care === 'crisis') return STILL;
  if (input.care === 'serious' || input.mood === 'serious') return BREATH_ONLY;
  const loop = loopOf(input);
  return { breath: true, blink: true, glance: loop !== 'work', boil: true, loop };
}

/** The names of the values a plan animates; empty for a still. */
export function animatedValues(plan: ScootchMotionPlan): string[] {
  return [
    ...(plan.breath ? ['breath'] : []),
    ...(plan.blink ? ['blink'] : []),
    ...(plan.glance ? ['glance'] : []),
    ...(plan.boil ? ['boil'] : []),
    ...(plan.loop === 'none' ? [] : ['loop']),
  ];
}

/** A drawing is rebuilt this often when its pose moves, and half as often when it is small. */
export const FULL_HZ = 24;
export const SMALL_HZ = 12;
/** Under this many points a character is drawn at the lower rate: the difference cannot be seen. */
export const SMALL_SIZE = 96;

/** How often a character with this plan is looked at again. A breath alone needs little. */
export function tickHz(plan: ScootchMotionPlan, size: number): number {
  return plan.boil && size >= SMALL_SIZE ? FULL_HZ : SMALL_HZ;
}

export interface ScootchFrame {
  /** What the drawing is built with. Empty for the still. */
  readonly motion: ScootchMotion;
  readonly boil: BoilFrame;
  /** Breathing, -1 to 1, shown as a stretch of the whole figure. */
  readonly bob: number;
  /** Two frames with the same key are the same drawing: nothing needs building. */
  readonly key: string;
}

const REST: ScootchFrame = { motion: {}, boil: 0, bob: 0, key: '' };

export interface ScootchMoment {
  /** Seconds this character has been moving, for the idle: its breath, blinks and glances. */
  readonly seconds: number;
  /** Seconds since the mood or the work mode last changed, for its own motion. */
  readonly sinceChange: number;
  readonly seed: string;
  /** Eyes drawn to a point, when the screen gives one. */
  readonly look?: ScootchLook | undefined;
}

/** What shows at one moment: the motion the drawing is built with, the boil frame and the breath. */
export function scootchFrameAt(
  input: ScootchMotionInput,
  plan: ScootchMotionPlan,
  at: ScootchMoment,
): ScootchFrame {
  if (!plan.breath) return REST;
  const bob = scootchBreath(at.seconds);
  if (!plan.boil) return { ...REST, bob };
  const idle = scootchIdle(at.seconds, at.seed);
  const t = Math.max(0, at.sinceChange);
  const motion: ScootchMotion = {
    blink: idle.blink,
    ...(plan.glance ? { gazeX: idle.gazeX, gazeY: idle.gazeY } : {}),
    ...(plan.loop === 'none' ? {} : { time: t }),
    ...(plan.loop === 'mood' ? { beat: moodBeat(input.mood, t) } : {}),
    ...(plan.loop === 'work' && input.workMode ? { work: workLoop(input.workMode, t) } : {}),
    ...(at.look && at.look.hold > 0 ? { look: at.look } : {}),
  };
  const boil = boilFrame(at.seconds);
  return { motion, boil, bob, key: JSON.stringify([motion, boil]) };
}
