import { CARD_FINISHES, specFromSeed, type CardFinishInks, type DrawCommand } from '@scootch/art';
import { MONSTER_BODY_TYPE_IDS, type CardData, type IsoDate } from '@scootch/domain';

/**
 * The finish only the lifetime card wears: deep gold leaf on cream, with a warm foil. It is data
 * here and not a finish anyone can choose, so there is exactly one card like it.
 */
export const FOREVER_FINISH: CardFinishInks = {
  frame: '#B8862B',
  paper: '#FFFAF0',
  panel: '#FCE7C8',
  panelDot: '#F0A35E',
  tile: '#FBEFD9',
  ink: '#2B2010',
  muted: '#8A6D2F',
  flavour: '#5C4716',
  accent: '#F0562E',
  onAccent: '#FFFFFF',
  pill: '#FFF6E2',
  pillInk: '#2B2010',
  foil: ['#F2C46B', '#FFE9A8', '#FFF7D6', '#F6B98A', '#B8862B'],
  foilAlpha: 0.42,
  glare: '#FFFBE6',
};

/** The finish the builder is asked for; its inks are then swapped for the lifetime ones. */
const DRAWN_AS = 'holo' as const;

export interface LifetimeCardWords {
  readonly name: string;
  readonly title: string;
  readonly flavour: string;
}

/** The one-of-one card: number one, minted on the day the lifetime purchase was made. */
export function lifetimeCard(words: LifetimeCardWords, mintedOn: IsoDate): CardData {
  return {
    monster: specFromSeed(MONSTER_BODY_TYPE_IDS[0], 'scootch-forever'),
    name: words.name,
    title: words.title,
    rarity: 'rare',
    number: 1,
    taskLine: null,
    daysLurked: 0,
    catchMinutes: 1,
    dread: 1,
    flavourText: words.flavour,
    finish: DRAWN_AS,
    caughtOn: mintedOn,
  };
}

/**
 * Prints a card drawn by the art package's builder in the lifetime finish: every ink of the
 * finish it was drawn in is replaced by the same ink of the lifetime one. Layout is untouched.
 */
export function inForeverFinish(commands: readonly DrawCommand[]): DrawCommand[] {
  const from = CARD_FINISHES[DRAWN_AS];
  const swap = new Map<string, string>();
  for (const key of Object.keys(from) as (keyof CardFinishInks)[]) {
    const before = from[key];
    const after = FOREVER_FINISH[key];
    if (typeof before === 'string' && typeof after === 'string') swap.set(before, after);
  }
  from.foil.forEach((color, index) => swap.set(color, FOREVER_FINISH.foil[index] ?? color));
  const recolour = (value: unknown): unknown => {
    if (typeof value === 'string') return swap.get(value) ?? value;
    if (Array.isArray(value)) return value.map(recolour);
    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([key, inner]) => [key, recolour(inner)]),
      );
    }
    return value;
  };
  return commands.map((command) => recolour(command) as DrawCommand);
}
