import {
  MOOD_LOOP_SECONDS,
  moodBeat,
  scootchBreath,
  scootchIdle,
  WORK_LOOPS,
  workLoopAt,
  type buildScootch,
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
  /** False keeps the mood's or the work mode's own loop off: idle only, as at a table. */
  readonly ownLoop: boolean;
}

/** What moves. With everything false the character is a still and nothing is scheduled. */
export interface ScootchMotionPlan {
  readonly breath: boolean;
  readonly blink: boolean;
  readonly glance: boolean;
  readonly loop: 'none' | 'mood' | 'work';
}

const STILL: ScootchMotionPlan = { breath: false, blink: false, glance: false, loop: 'none' };
const BREATH_ONLY: ScootchMotionPlan = { ...STILL, breath: true };

/** The most frames one character keeps: its loop, then the blink and the glances if they fit. */
export const MAX_FRAMES = 24;
/** A work mode's loop is always this many frames, so its quickest value has eight per turn. */
const WORK_FRAMES = 24;
/** Frames per turn of each mood's loop. The dots only ever show four states. */
const MOOD_FRAMES: Partial<Record<Mood, number>> = {
  waiting: 4,
  typing: 4,
  listening: 6,
  celebrating: 6,
  thinking: 8,
  stuck: 8,
  pleased: 8,
  asleep: 8,
};

function loopOf(input: ScootchMotionInput): { kind: ScootchMotionPlan['loop']; frames: number } {
  if (!input.ownLoop) return { kind: 'none', frames: 1 };
  if (input.mood === 'working' && input.workMode && input.workMode in WORK_LOOPS) {
    return { kind: 'work', frames: WORK_FRAMES };
  }
  const frames = MOOD_FRAMES[input.mood];
  return frames === undefined ? { kind: 'none', frames: 1 } : { kind: 'mood', frames };
}

/**
 * Decides what moves. Reduce Motion and a crisis day move nothing; a serious task, by its flag or
 * by the serious mood, only breathes. Otherwise Scootch breathes and runs its loop, and blinks and
 * glances when those frames fit beside the loop.
 */
export function scootchMotionPlan(input: ScootchMotionInput): ScootchMotionPlan {
  if (input.reducedMotion || input.care === 'crisis') return STILL;
  if (input.care === 'serious' || input.mood === 'serious') return BREATH_ONLY;
  const loop = loopOf(input);
  return {
    breath: true,
    blink: loop.frames * 2 <= MAX_FRAMES,
    glance: loop.frames * 4 <= MAX_FRAMES,
    loop: loop.kind,
  };
}

/** The names of the values a plan animates; empty for a still. */
export function animatedValues(plan: ScootchMotionPlan): string[] {
  return [
    ...(plan.breath ? ['breath'] : []),
    ...(plan.blink ? ['blink'] : []),
    ...(plan.glance ? ['glance'] : []),
    ...(plan.loop === 'none' ? [] : ['loop']),
  ];
}

/** The eye states a frame is kept in: as the mood holds them, shut, and glancing either way. */
const OPEN = 0;
const SHUT = 1;
const GLANCE_LEFT = 2;
const GLANCE_RIGHT = 3;
const GLANCE = { gazeX: 0.6, gazeY: -0.15 } as const;

/**
 * The frames one character keeps, as the motion each is built with: `loopFrames` steps of the
 * loop for each eye state, the first of them the still.
 */
export interface FrameSet {
  readonly loopFrames: number;
  readonly loopSeconds: number;
  readonly eyeStates: number;
  readonly motions: readonly ScootchMotion[];
}

export function scootchFrameSet(input: ScootchMotionInput, plan: ScootchMotionPlan): FrameSet {
  const loopFrames = plan.loop === 'none' ? 1 : loopOf(input).frames;
  const mode = plan.loop === 'work' ? input.workMode : null;
  const loopSeconds = mode
    ? WORK_LOOPS[mode].seconds
    : plan.loop === 'mood'
      ? (MOOD_LOOP_SECONDS[input.mood] ?? 1)
      : 1;
  const eyeStates = plan.glance ? 4 : plan.blink ? 2 : 1;
  const motions: ScootchMotion[] = [];
  for (let eyes = 0; eyes < eyeStates; eyes++) {
    for (let step = 0; step < loopFrames; step++) {
      const u = step / loopFrames;
      motions.push({
        ...(eyes === SHUT ? { blink: 1 } : {}),
        ...(eyes === GLANCE_LEFT ? { gazeX: -GLANCE.gazeX, gazeY: GLANCE.gazeY } : {}),
        ...(eyes === GLANCE_RIGHT ? { gazeX: GLANCE.gazeX, gazeY: GLANCE.gazeY } : {}),
        ...(plan.loop === 'mood' && step > 0 ? { beat: u } : {}),
        ...(mode && step > 0 ? { work: workLoopAt(mode, u) } : {}),
      });
    }
  }
  return { loopFrames, loopSeconds, eyeStates, motions };
}

export interface ScootchTick {
  /** Which of the set's frames shows. */
  readonly frame: number;
  /** Breathing, -1 to 1. */
  readonly bob: number;
}

/** What shows `t` seconds into the motion: the frame and the breath. Zero is the still. */
export function scootchTick(
  set: FrameSet,
  plan: ScootchMotionPlan,
  input: Pick<ScootchMotionInput, 'mood'>,
  t: number,
  seed: string,
): ScootchTick {
  if (!plan.breath) return { frame: 0, bob: 0 };
  const idle = scootchIdle(t, seed);
  const beat = plan.loop === 'mood' ? moodBeat(input.mood, t) : (t / set.loopSeconds) % 1;
  const step = plan.loop === 'none' ? 0 : Math.floor(beat * set.loopFrames) % set.loopFrames;
  let eyes = OPEN;
  if (plan.blink && idle.blink > 0.5) eyes = SHUT;
  else if (plan.glance && Math.abs(idle.gazeX) > GLANCE.gazeX / 2) {
    eyes = idle.gazeX < 0 ? GLANCE_LEFT : GLANCE_RIGHT;
  }
  return { frame: eyes * set.loopFrames + step, bob: scootchBreath(t) };
}

/**
 * Folds frames that came out as the same drawing into one layer (a mood with shut eyes has no
 * blink to draw; the dots hold for a while). `layerOf[frame]` is the layer that frame shows.
 */
export function uniqueLayers<T>(frames: readonly T[]): { layers: T[]; layerOf: number[] } {
  const layers: T[] = [];
  const seen = new Map<string, number>();
  const layerOf = frames.map((frame) => {
    const key = JSON.stringify(frame);
    let layer = seen.get(key);
    if (layer === undefined) {
      layer = layers.push(frame) - 1;
      seen.set(key, layer);
    }
    return layer;
  });
  return { layers, layerOf };
}
