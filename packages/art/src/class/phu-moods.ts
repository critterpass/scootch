/**
 * Thầy Phú's 24 moods as poses, and the pressure ladder. A pose names one part from each family
 * of the Phu board (glasses, lens or lid, mouth, arms) and a few numbers (brows, blush, flush,
 * puff, tilt) and effects, exactly as the board's `renderVals()` table does.
 */
export const PHU_MOODS = [
  'calm',
  'over',
  'crossed',
  'ruler',
  'name',
  'stare',
  'grading',
  'approve',
  'serious',
  'surprised',
  'laugh',
  'moved',
  'think',
  'point',
  'wave',
  'facepalm',
  'clap',
  'sleep',
  'hips',
  'watch',
  'peer',
  'count',
  'snap',
  'huff',
] as const;
export type PhuMood = (typeof PHU_MOODS)[number];

export type Glasses = 'Up' | 'Down' | 'None';
export type Lens =
  | 'Open'
  | 'Angry'
  | 'Squeeze'
  | 'Happy'
  | 'Glint'
  | 'Surprise'
  | 'Look'
  | 'Side'
  | 'Teary'
  | 'Shut';
export type Lid = 'Flat' | 'Angry' | 'Down' | 'Closed' | 'Peer';
export type Bare = 'Soft';
export type Mouth =
  | 'Calm'
  | 'Flat'
  | 'Pout'
  | 'Smile'
  | 'Shout'
  | 'O'
  | 'Laugh'
  | 'Wavy'
  | 'Side'
  | 'Frown'
  | 'Grit'
  | 'Tight';
export type Arms =
  | 'Rest'
  | 'Tea'
  | 'Crossed'
  | 'Ruler'
  | 'Fists'
  | 'Grading'
  | 'Thumb'
  | 'Glasses'
  | 'Wave'
  | 'Point'
  | 'Think'
  | 'Palm'
  | 'Belly'
  | 'Clap'
  | 'Hips'
  | 'Watch'
  | 'Snap'
  | 'Slip'
  | 'Count';
export type PhuEffect =
  'vein' | 'steam' | 'sparkle' | 'exclaim' | 'zzz' | 'tear' | 'sweat' | 'cheeks';

/** One brow: its angle in degrees and the height of its centre. */
export interface Brow {
  readonly angle: number;
  readonly y: number;
}

export interface PhuPose {
  readonly mood: PhuMood;
  readonly glasses: Glasses;
  /** The eyes behind raised glasses. */
  readonly lens?: Lens;
  /** The eyes above lowered glasses. */
  readonly above?: Lid;
  /** The eyes with the glasses off. */
  readonly bare?: Bare;
  readonly mouth: Mouth;
  readonly arms: Arms;
  readonly brows: { readonly left: Brow; readonly right: Brow };
  readonly blush: number;
  /** The red flush over his whole face, 0 to 1. */
  readonly red: number;
  /** Head scale: the angrier, the rounder. Never more than 1.06. */
  readonly puff: number;
  /** Head tilt in degrees. */
  readonly tilt: number;
  readonly effects: readonly PhuEffect[];
  /** What a screen reader says. Board copy: the app's own words come from the voice package. */
  readonly label: string;
}

type Row = {
  glasses: 'Up' | 'Down' | 'None';
  lens?: Lens;
  above?: Lid;
  bare?: Bare;
  brow: readonly [number, number] | readonly [number, number, number, number];
  mouth: Mouth;
  arms: Arms;
  blush: number;
  puff: number;
  red?: number;
  tilt?: number;
  vein?: 1;
  steam?: 1;
  sparkle?: 1;
  exclaim?: 1;
  zzz?: 1;
  tear?: 1;
  sweat?: 1;
  cheeks?: 1;
  label: string;
};

const EFFECTS = ['vein', 'steam', 'sparkle', 'exclaim', 'zzz', 'tear', 'sweat', 'cheeks'] as const;

/** The board's table, one row per mood, copied unchanged from its `renderVals()`. */
// prettier-ignore
const MOODS: Readonly<Record<PhuMood, Row>> = {
  calm:      { glasses: 'Up',   lens: 'Open',     brow: [-3, 58],          mouth: 'Calm',  arms: 'Rest',    blush: 0.55, puff: 1,    label: 'Thầy Phú looks up' },
  over:      { glasses: 'Down', above: 'Flat',    brow: [0, 56],           mouth: 'Flat',  arms: 'Tea',     blush: 0.5,  puff: 1,    label: 'Thầy Phú sips his tea over his glasses' },
  crossed:   { glasses: 'Down', above: 'Angry',   brow: [16, 56],          mouth: 'Pout',  arms: 'Crossed', blush: 0.8,  puff: 1.02, label: 'Thầy Phú with his arms crossed' },
  ruler:     { glasses: 'Up',   lens: 'Angry',    brow: [16, 60],          mouth: 'Pout',  arms: 'Ruler',   blush: 0.85, puff: 1.03, vein: 1, label: 'Thầy Phú taps his ruler' },
  name:      { glasses: 'Up',   lens: 'Squeeze',  brow: [20, 60],          mouth: 'Shout', arms: 'Fists',   blush: 1,    puff: 1.06, vein: 1, red: 0.42, steam: 1, label: 'Thầy Phú calls your full name' },
  stare:     { glasses: 'Up',   lens: 'Glint',    brow: [0, 61],           mouth: 'Flat',  arms: 'Crossed', blush: 0.95, puff: 1.04, label: 'Thầy Phú stares in silence, glasses glinting' },
  grading:   { glasses: 'Down', above: 'Down',    brow: [-3, 54],          mouth: 'Calm',  arms: 'Grading', blush: 0.45, puff: 1,    label: 'Thầy Phú grading papers' },
  approve:   { glasses: 'Up',   lens: 'Happy',    brow: [-8, 53],          mouth: 'Smile', arms: 'Thumb',   blush: 0.95, puff: 1,    sparkle: 1, label: 'Thầy Phú, quietly pleased' },
  serious:   { glasses: 'None', bare: 'Soft',     brow: [-14, 64],         mouth: 'Calm',  arms: 'Glasses', blush: 0.3,  puff: 1,    label: 'Thầy Phú with his glasses off' },
  surprised: { glasses: 'Up',   lens: 'Surprise', brow: [-10, 48],         mouth: 'O',     arms: 'Rest',    blush: 0.6,  puff: 1.02, exclaim: 1, label: 'Thầy Phú, startled' },
  laugh:     { glasses: 'Up',   lens: 'Happy',    brow: [-8, 52],          mouth: 'Laugh', arms: 'Belly',   blush: 1,    puff: 1.02, tilt: -5, label: 'Thầy Phú laughing despite himself' },
  moved:     { glasses: 'Up',   lens: 'Teary',    brow: [-14, 60],         mouth: 'Wavy',  arms: 'Rest',    blush: 0.95, puff: 1,    tear: 1, label: 'Thầy Phú, quietly moved' },
  think:     { glasses: 'Up',   lens: 'Look',     brow: [-6, 54, 10, 60],  mouth: 'Side',  arms: 'Think',   blush: 0.5,  puff: 1,    tilt: 5, label: 'Thầy Phú thinking it over' },
  point:     { glasses: 'Up',   lens: 'Side',     brow: [4, 58],           mouth: 'Calm',  arms: 'Point',   blush: 0.55, puff: 1,    label: 'Thầy Phú points at the board' },
  wave:      { glasses: 'Up',   lens: 'Open',     brow: [-6, 55],          mouth: 'Smile', arms: 'Wave',    blush: 0.7,  puff: 1,    tilt: 3, label: 'Thầy Phú waves' },
  facepalm:  { glasses: 'Up',   lens: 'Shut',     brow: [12, 60, -12, 55], mouth: 'Wavy',  arms: 'Palm',    blush: 0.8,  puff: 1.02, sweat: 1, label: 'Thầy Phú, hand pressed to his forehead' },
  clap:      { glasses: 'Up',   lens: 'Happy',    brow: [-6, 54],          mouth: 'Smile', arms: 'Clap',    blush: 0.9,  puff: 1,    sparkle: 1, label: 'Thầy Phú gives a slow clap' },
  sleep:     { glasses: 'Down', above: 'Closed',  brow: [0, 60],           mouth: 'O',     arms: 'Crossed', blush: 0.45, puff: 1,    tilt: -8, zzz: 1, label: 'Thầy Phú dozing' },
  hips:      { glasses: 'Up',   lens: 'Angry',    brow: [18, 60],          mouth: 'Frown', arms: 'Hips',    blush: 0.85, puff: 1.03, red: 0.12, label: 'Thầy Phú, hands on his hips' },
  watch:     { glasses: 'Up',   lens: 'Angry',    brow: [16, 60, -6, 55],  mouth: 'Side',  arms: 'Watch',   blush: 0.7,  puff: 1.02, label: 'Thầy Phú taps his watch' },
  peer:      { glasses: 'Down', above: 'Peer',    brow: [12, 58, -14, 49], mouth: 'Flat',  arms: 'Slip',    blush: 0.6,  puff: 1,    label: 'Thầy Phú reads your excuse over his glasses' },
  count:     { glasses: 'Up',   lens: 'Angry',    brow: [16, 59],          mouth: 'Frown', arms: 'Count',   blush: 0.85, puff: 1.03, red: 0.1, label: 'Thầy Phú counts to three' },
  snap:      { glasses: 'Up',   lens: 'Angry',    brow: [22, 61],          mouth: 'Grit',  arms: 'Snap',    blush: 1,    puff: 1.04, red: 0.28, vein: 1, label: 'Thầy Phú snaps his chalk' },
  huff:      { glasses: 'Up',   lens: 'Angry',    brow: [20, 60],          mouth: 'Tight', arms: 'Crossed', blush: 1,    puff: 1.05, red: 0.22, steam: 1, cheeks: 1, label: 'Thầy Phú huffs, cheeks puffed' },
};

export const isPhuMood = (value: string): value is PhuMood =>
  (PHU_MOODS as readonly string[]).includes(value);

/** The pose for a mood. */
export function phuPose(mood: PhuMood): PhuPose {
  const m = MOODS[mood];
  const [leftAngle, leftY, rightAngle, rightY] = m.brow;
  return {
    mood,
    glasses: m.glasses,
    ...(m.lens ? { lens: m.lens } : {}),
    ...(m.above ? { above: m.above } : {}),
    ...(m.bare ? { bare: m.bare } : {}),
    mouth: m.mouth,
    arms: m.arms,
    brows: {
      left: { angle: leftAngle, y: leftY },
      right: { angle: rightAngle ?? leftAngle, y: rightY ?? leftY },
    },
    blush: m.blush,
    red: m.red ?? 0,
    puff: m.puff,
    tilt: m.tilt ?? 0,
    effects: EFFECTS.filter((e) => m[e] === 1),
    label: m.label,
  };
}

/**
 * The pressure ladder (brief, section 4): 0 looks up, 1 sips tea over his glasses, 2 arms crossed,
 * 3 taps the ruler, 4 puffed and pink with the chalk flying, 5 the white glare. Out-of-range steps
 * are held to the ends; a step that is not a number is 0.
 */
export const PRESSURE_MOODS = [
  'calm',
  'over',
  'crossed',
  'ruler',
  'name',
  'stare',
] as const satisfies readonly PhuMood[];

export function pressureMood(step: number): (typeof PRESSURE_MOODS)[number] {
  const s = Number.isFinite(step) ? Math.min(5, Math.max(0, Math.round(step))) : 0;
  return PRESSURE_MOODS[s] ?? 'calm';
}

/** Whether a blink can show: not with eyes already shut, squeezed, smiling or behind the glint. */
export function canBlink(pose: PhuPose): boolean {
  if (pose.glasses === 'None') return false;
  if (pose.glasses === 'Down') return pose.above !== 'Closed';
  return !['Shut', 'Happy', 'Squeeze', 'Glint'].includes(pose.lens ?? '');
}

/** The same pose with its eyes closed for a blink. */
export function blinking(pose: PhuPose): PhuPose {
  if (!canBlink(pose)) return pose;
  return pose.glasses === 'Down' ? { ...pose, above: 'Closed' } : { ...pose, lens: 'Shut' };
}
