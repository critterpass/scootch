import { buildMonster, buildScootch, type MONSTER_BODIES, specFromSeed, toSvg } from '@scootch/art';

export type BodyType = keyof typeof MONSTER_BODIES;
type ScootchMood = Parameters<typeof buildScootch>[0]['mood'];

/** One monster as inline SVG, drawn by the same generator as the app. */
export function monsterSvg(bodyType: BodyType, seed: string): string {
  return toSvg(buildMonster(specFromSeed(bodyType, seed)), {
    idPrefix: `m-${bodyType}-${seed}-${drawn++}-`,
  });
}

type WorkMode = NonNullable<Parameters<typeof buildScootch>[0]['workMode']>;

export interface ScootchDrawing {
  /** What he is working at. Only the `working` mood shows it. */
  readonly work?: WorkMode;
  /** The pale Scootch who sits at someone else's seat. */
  readonly paper?: boolean;
  /** On a night section the marks around him turn light. */
  readonly night?: boolean;
}

let drawn = 0;

/** Scootch in one mood, still, as inline SVG. Every drawing gets ids of its own. */
export function scootchSvg(mood: ScootchMood, drawing: ScootchDrawing = {}): string {
  const commands = buildScootch(
    { mood, attitude: 'cheeky', workMode: drawing.work ?? null, reducedMotion: true },
    {},
    { tone: drawing.paper ? 'paper' : 'tomato', ground: drawing.night ? 'dark' : 'light' },
  );
  return toSvg(commands, { idPrefix: `s-${mood}-${drawn++}-` });
}

/**
 * The home page's strip of example monsters: a fixed, hand-checked set, never live data. Each
 * pairs with the name and card line at the same index of the site copy's `strip.monsters`.
 */
export const stripMonsters: readonly { readonly bodyType: BodyType; readonly seed: string }[] = [
  { bodyType: 'envelope', seed: 'inbox' },
  { bodyType: 'receipt', seed: 'receipt' },
  { bodyType: 'slime', seed: 'grout' },
  { bodyType: 'phone', seed: 'mum' },
  { bodyType: 'sock', seed: 'gym' },
  { bodyType: 'weed', seed: 'fern' },
];

/** The caught monsters that stand in a row wherever a shelf is drawn. */
export const shelfMonsters: readonly { readonly bodyType: BodyType; readonly seed: string }[] = [
  { bodyType: 'tooth', seed: 'dentist' },
  { bodyType: 'box', seed: 'parcel' },
  { bodyType: 'note', seed: 'form' },
  { bodyType: 'pot', seed: 'sink' },
  { bodyType: 'clock', seed: 'later' },
];
