import type { Attitude } from '@scootch/domain';

export type Pair = readonly [number, number];

export type EyeShape = 'round' | 'happy' | 'closed' | 'sparkle' | 'squeeze';
export type MouthShape =
  'smile' | 'flat' | 'side' | 'o' | 'grin' | 'wobble' | 'pout' | 'tongue' | 'cat' | 'wail';
export type Effect =
  | 'dots'
  | 'waves'
  | 'think'
  | 'laptop'
  | 'sweat'
  | 'stars'
  | 'confetti'
  | 'zzz'
  | 'tears'
  | 'cloud'
  | null;

/** Everything a mood decides: how the body sits, the face, where the hands go and what floats around. */
export interface Expression {
  /** Lift off the ground, negative is up. */
  dy: number;
  /** Squash and stretch of the body. */
  sx: number;
  sy: number;
  /** Sideways lean of the top of the body. */
  lean: number;
  /** Rotation around the feet, in radians. */
  rot: number;
  /** 0 on the ground, 1 at the top of a jump. Shrinks the shadow. */
  bounce: number;
  eye: EyeShape;
  /** How far the lids are open: 1 is fully open, above 1 is wide. */
  open: number;
  /** Slant of the lids. */
  tilt: number;
  /** Where the eyes look, -1 to 1 each way. */
  lx: number;
  ly: number;
  /** Pupil radius as a share of the eye. */
  pup: number;
  /** Bigger, wetter glints. */
  gloss: boolean;
  /** Each brow as [lift, slant]; `null` draws none. */
  brows: readonly [left: Pair, right: Pair] | null;
  mouth: MouthShape;
  /** Mouth width, 1 is the plain smile. */
  mw: number;
  /** Mouth pushed sideways. */
  mx: number;
  blush: number;
  /** Each hand as a share of the body's radii from its centre. */
  hl: Pair;
  hr: Pair;
  fx: Effect;
  /** How much of the effect is drawn: pieces of confetti, stars, drops. */
  fxCount: number;
  /** Extra sway of the curl on top. */
  tip: number;
  /** The star eyes: how far they have turned, in radians, and their size (1 as drawn at rest). */
  sparkTurn: number;
  sparkSize: number;
  /** Where the wobble of a wailing mouth stands, in radians. */
  wail: number;
}

/** Scootch standing with nothing to say. Every mood starts from this. */
export function neutral(): Expression {
  return {
    dy: 0,
    sx: 1,
    sy: 1,
    lean: 0,
    rot: 0,
    bounce: 0,
    eye: 'round',
    open: 1,
    tilt: 0,
    lx: 0,
    ly: 0,
    pup: 0.58,
    gloss: false,
    brows: null,
    mouth: 'smile',
    mw: 1,
    mx: 0,
    blush: 0.7,
    hl: [1.04, 0.64],
    hr: [1.04, 0.64],
    fx: null,
    fxCount: 3,
    tip: 0,
    sparkTurn: 0,
    sparkSize: 1,
    wail: 0,
  };
}

/**
 * One mood. `act` is how big the acting is (1 is cheeky, the pose as designed); `beat` is where
 * the mood's own loop stands, 0 to 1, with 0 the rest frame; `t` is the seconds the mood has been
 * moving, which the body's own motion follows (a lean, tapping hands, a tremble). At zero seconds
 * every mood is its still.
 */
export type MoodPose = (act: number, beat: number, t: number) => Partial<Expression>;

/**
 * 0 at rest, 1 a quarter of a second in. A movement the design starts off its rest pose is
 * multiplied by this, so the still is untouched and the motion is the design's from then on.
 */
export function settle(t: number): number {
  const k = Math.min(1, Math.max(0, t / 0.25));
  return k * k * (3 - 2 * k);
}

/** The moods whose eyes follow a point, as in the design. */
export const GAZE_MOODS: ReadonlySet<string> = new Set([
  'waiting',
  'listening',
  'thinking',
  'bargaining',
  'pleased',
  'nudge',
  'shocked',
]);

/** A look towards a point: the direction, -1 to 1 each way, and how much of it is held, 0 to 1. */
export interface ScootchLook {
  readonly x: number;
  readonly y: number;
  readonly hold: number;
}

/** How loud each attitude acts. The character is the same; only the size of the gesture changes. */
export const ACTING: Record<Attitude, number> = { soft: 0.7, cheeky: 1, unhinged: 1.3 };

/**
 * The values an animator drives. All are optional and rest at zero, so a drawing built without
 * them is the rest frame of the mood's animation. Reduce Motion ignores them.
 */
export interface ScootchMotion {
  /** 0 eyes as the mood holds them, 1 shut. */
  readonly blink?: number;
  /** Breathing, -1 to 1. */
  readonly bob?: number;
  /** Where Scootch looks on top of the mood's own gaze, -1 to 1 each way. */
  readonly gazeX?: number;
  readonly gazeY?: number;
  /** Where the mood's own loop stands, 0 to 1: the jump, the dots, the drifting letters. */
  readonly beat?: number;
  /**
   * Seconds the mood has been moving. Drives the body's own motion: the lean and the tapping hand
   * of waiting, typing hands, the shiver of being stuck, the sway of the curl.
   */
  readonly time?: number;
  /** Eyes drawn towards a point. Only the moods that watch follow it; a work mode never does. */
  readonly look?: ScootchLook;
  /**
   * The named values of the work mode's own loop (the fold of the shirt, the swing of the
   * hammer). Each mode lists its names and rest values; a name left out stays at rest.
   */
  readonly work?: Readonly<Record<string, number>>;
}

const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v));

/** Makes the body language of an expression bigger or smaller, leaving the face shapes alone. */
export function scaleActing(e: Expression, act: number): void {
  e.dy *= act;
  e.lean *= act;
  e.rot *= act;
  e.sx = 1 + (e.sx - 1) * act;
  e.sy = 1 + (e.sy - 1) * act;
  if (e.brows) {
    const [l, r] = e.brows;
    e.brows = [
      [l[0] * act, l[1] * act],
      [r[0] * act, r[1] * act],
    ];
  }
}

/**
 * Turns the eyes towards a point the way the design follows the pointer: three quarters the
 * point, one quarter the mood's own gaze. Waiting also lifts its lids and leans that way.
 */
export function applyLook(e: Expression, look: ScootchLook, waiting: boolean): void {
  const hold = clamp(look.hold, 0, 1);
  const pull = hold * 0.75;
  e.lx += (clamp(look.x, -1, 1) - e.lx) * pull;
  e.ly += (clamp(look.y, -1, 1) - e.ly) * pull;
  if (!waiting) return;
  e.open += (Math.max(e.open, 0.82) - e.open) * hold;
  e.lean += (clamp(look.x, -1, 1) * 3 - e.lean) * hold;
}

export function applyMotion(e: Expression, motion: ScootchMotion): void {
  const bob = clamp(motion.bob ?? 0, -1, 1);
  e.sy += bob * 0.014;
  e.sx -= bob * 0.0084;
  e.tip += bob * 1.5;
  e.lx = clamp(e.lx + (motion.gazeX ?? 0), -1, 1);
  e.ly = clamp(e.ly + (motion.gazeY ?? 0), -1, 1);
  const blink = clamp(motion.blink ?? 0, 0, 1);
  if (e.eye === 'round') e.open += (0.06 - e.open) * blink;
}
