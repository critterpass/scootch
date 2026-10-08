import {
  boilFrame,
  buildMonster,
  buildScootch,
  moodBeat,
  scootchBreath,
  scootchIdle,
  specFromSeed,
  WORK_LOOPS,
  workLoop,
  type DrawCommand,
  type MONSTER_BODIES,
} from '@scootch/art';

export type BodyType = keyof typeof MONSTER_BODIES;
type ScootchProps = Parameters<typeof buildScootch>[0];
export type ScootchMood = ScootchProps['mood'];
export type WorkMode = NonNullable<ScootchProps['workMode']>;

/**
 * One character, as little as it takes to draw it again: on the server as a still, and in the
 * browser moment by moment. Short keys, because every character on a page carries its own.
 */
export type ArtSpec =
  | {
      readonly k: 'scootch';
      readonly mood: ScootchMood;
      /** What he is working at. Only the `working` mood shows it. */
      readonly work?: WorkMode | null;
      /** The pale Scootch who sits at someone else's seat. */
      readonly paper?: boolean;
      /** On a night section the marks around him turn light. */
      readonly night?: boolean;
    }
  | { readonly k: 'monster'; readonly body: BodyType; readonly seed: string };

/** A full breath makes Scootch this much taller and narrower, as in the app. */
export const BREATH = { taller: 0.014, narrower: 0.0084 } as const;

export interface ArtFrame {
  readonly commands: DrawCommand[];
  /** Breathing, -1 to 1, shown as a stretch of the whole figure about its feet. */
  readonly breath: number;
}

/**
 * The character `seconds` into its life, or its still when `seconds` is null. Moving, Scootch
 * breathes, blinks, glances, boils and runs his mood's or his work's own motion, and a monster
 * bobs, blinks and boils, exactly as in the app. The serious mood only breathes.
 */
export function artFrame(spec: ArtSpec, seconds: number | null): ArtFrame {
  if (spec.k === 'monster') {
    const monster = specFromSeed(spec.body, spec.seed);
    const life = seconds === null ? {} : { t: seconds, boil: boilFrame(seconds) };
    return { commands: buildMonster(monster, 1, life), breath: 0 };
  }
  const workMode = spec.work ?? null;
  const options = {
    tone: spec.paper ? 'paper' : 'tomato',
    ground: spec.night ? 'dark' : 'light',
  } as const;
  const props = { mood: spec.mood, attitude: 'cheeky', workMode } as const;
  if (seconds === null) {
    return {
      commands: buildScootch({ ...props, reducedMotion: true }, {}, options),
      breath: 0,
    };
  }
  const breath = scootchBreath(seconds);
  if (spec.mood === 'serious') {
    return { commands: buildScootch({ ...props, reducedMotion: true }, {}, options), breath };
  }
  const working = spec.mood === 'working' && workMode !== null && workMode in WORK_LOOPS;
  const idle = scootchIdle(seconds, `${spec.mood}-${workMode ?? ''}`);
  const motion = {
    blink: idle.blink,
    time: seconds,
    // A work mode holds his eyes on the work; otherwise he glances about.
    ...(working
      ? { work: workLoop(workMode, seconds) }
      : { gazeX: idle.gazeX, gazeY: idle.gazeY, beat: moodBeat(spec.mood, seconds) }),
  };
  return {
    commands: buildScootch({ ...props, reducedMotion: false }, motion, {
      ...options,
      boil: boilFrame(seconds),
    }),
    breath,
  };
}
