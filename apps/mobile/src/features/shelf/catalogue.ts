import { CARD_FINISHES, type CardFinishInks } from '@scootch/art';
import type { StringKey } from '@scootch/i18n';

/** The parts of the shelf. A part is shown once the catalogue has something in it. */
export const SHELF_KINDS = ['inks', 'outfits', 'worlds'] as const;
export type ShelfKind = (typeof SHELF_KINDS)[number];

/** The catalogue's own words: plain strings with nothing to fill in. */
export type ShelfWord = Extract<StringKey, `shelf.ink.${string}`>;

/** The four colours an ink prints the app in. */
export interface InkColours {
  readonly ink: string;
  readonly paper: string;
  readonly accent: string;
  readonly deep: string;
}

/**
 * One thing on the shelf: a single purchase that is exactly what it shows. Nothing here is
 * random, rare, a currency or a way to mend a day.
 */
export interface ShelfItem {
  readonly id: string;
  readonly kind: ShelfKind;
  /** The store's product, bought once and kept; `null` for the one that is always free. */
  readonly productId: string | null;
  readonly name: ShelfWord;
  readonly about: ShelfWord;
  readonly colours: InkColours;
}

/** An ink taken from a card finish: its ink, its paper, its edge and its pill. */
function fromFinish(finish: CardFinishInks): InkColours {
  return { ink: finish.ink, paper: finish.paper, accent: finish.frame, deep: finish.muted };
}

export const STANDARD_INK = 'standard';

export const SHELF: readonly ShelfItem[] = [
  {
    id: STANDARD_INK,
    kind: 'inks',
    productId: null,
    name: 'shelf.ink.standard',
    about: 'shelf.ink.standard.about',
    colours: { ink: '#1C1A17', paper: '#F6F3EE', accent: '#F0562E', deep: '#C2603F' },
  },
  {
    id: 'midnight-riso',
    kind: 'inks',
    productId: 'ink_midnight_riso',
    name: 'shelf.ink.midnightRiso',
    about: 'shelf.ink.midnightRiso.about',
    colours: { ink: '#1C1A17', paper: '#E7ECF3', accent: '#0B8BBF', deep: '#22384F' },
  },
  {
    id: 'kraft-paper',
    kind: 'inks',
    productId: 'ink_kraft_paper',
    name: 'shelf.ink.kraftPaper',
    about: 'shelf.ink.kraftPaper.about',
    colours: fromFinish(CARD_FINISHES.kraft),
  },
  {
    id: 'gold-leaf',
    kind: 'inks',
    productId: 'ink_gold_leaf',
    name: 'shelf.ink.goldLeaf',
    about: 'shelf.ink.goldLeaf.about',
    colours: fromFinish(CARD_FINISHES.gold),
  },
];

/** The item the shelf opens on when nothing has been chosen yet. */
export const SHELF_OPENS_ON = 'midnight-riso';

export const shelfProductIds: readonly string[] = SHELF.flatMap((item) =>
  item.productId === null ? [] : [item.productId],
);

export function shelfItem(id: string): ShelfItem | null {
  return SHELF.find((item) => item.id === id) ?? null;
}

/** Whether an item is the person's to wear: the free one, or one this Apple ID has bought. */
export function owns(item: ShelfItem, ownedItems: readonly string[]): boolean {
  return item.productId === null || ownedItems.includes(item.productId);
}
