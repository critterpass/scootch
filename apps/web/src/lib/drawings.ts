import { buildMonster, buildScootch, type MONSTER_BODIES, specFromSeed, toSvg } from '@scootch/art';

export type BodyType = keyof typeof MONSTER_BODIES;
type ScootchMood = Parameters<typeof buildScootch>[0]['mood'];

/** One monster as inline SVG, drawn by the same generator as the app. */
export function monsterSvg(bodyType: BodyType, seed: string): string {
  return toSvg(buildMonster(specFromSeed(bodyType, seed)), { idPrefix: `m-${bodyType}-${seed}-` });
}

/** Scootch in one mood, still, as inline SVG. `slot` keeps ids apart when a mood is drawn twice. */
export function scootchSvg(mood: ScootchMood, slot = 'a'): string {
  const commands = buildScootch({ mood, attitude: 'cheeky', workMode: null, reducedMotion: true });
  return toSvg(commands, { idPrefix: `s-${mood}-${slot}-` });
}

/**
 * The home page's strip of example monsters: a fixed, hand-checked set, never live data. Each
 * pairs with the name and card line at the same index of the site copy's `strip.monsters`.
 */
export const stripMonsters: readonly { readonly bodyType: BodyType; readonly seed: string }[] = [
  { bodyType: 'envelope', seed: 'council' },
  { bodyType: 'receipt', seed: 'taxes' },
  { bodyType: 'slime', seed: 'grout' },
  { bodyType: 'phone', seed: 'mum' },
  { bodyType: 'kettle', seed: 'gym' },
  { bodyType: 'weed', seed: 'garden' },
];
