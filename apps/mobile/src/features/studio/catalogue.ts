import { CARD_FINISH_IDS, type CardFinish } from '@scootch/domain';
import type { StringKey } from '@scootch/i18n';

import { storeProductId } from '../plus/products';

/** The three things the studio dresses: Scootch and the app, your card, and a catch. */
export const STUDIO_KINDS = ['ink', 'finish', 'trail'] as const;
export type StudioKind = (typeof STUDIO_KINDS)[number];

export const INK_IDS = ['tangerine', 'midnight', 'moss', 'plum', 'mustard'] as const;
export type InkId = (typeof INK_IDS)[number];

export const TRAIL_IDS = ['confetti', 'stardust', 'bubbles', 'splat'] as const;
export type TrailId = (typeof TRAIL_IDS)[number];

/** The four colours an ink prints in, and Scootch's own body in it. */
export interface InkColours {
  readonly accent: string;
  readonly ink: string;
  readonly paper: string;
  readonly deep: string;
  /** The lit side of Scootch and the flush of his cheeks. */
  readonly highlight: string;
  readonly blush: string;
}

/**
 * One thing in the studio: a single purchase that is exactly what it shows. Nothing here is
 * random, rare, a currency or a way to mend a day.
 */
export interface StudioItem {
  readonly id: string;
  readonly kind: StudioKind;
  /** The store's product, bought once and kept; `null` for the one that is everyone's. */
  readonly productId: string | null;
  readonly name: StringKey;
  /** The word under its swatch. */
  readonly short: StringKey;
  readonly about: StringKey;
}

export interface InkItem extends StudioItem {
  readonly id: InkId;
  readonly kind: 'ink';
  /** Printed on the card: "INK 01". */
  readonly code: string;
  readonly colours: InkColours;
}
export interface FinishItem extends StudioItem {
  readonly id: CardFinish;
  readonly kind: 'finish';
}
export interface TrailItem extends StudioItem {
  readonly id: TrailId;
  readonly kind: 'trail';
}

/** What everyone has, and what "Take it off" goes back to. */
export const FREE_LOOK = { ink: 'tangerine', finish: 'paper', trail: 'confetti' } as const;

const INK_COLOURS: Record<InkId, InkColours> = {
  tangerine: {
    accent: '#F0562E',
    ink: '#1C1A17',
    paper: '#F6F3EE',
    deep: '#C63F22',
    highlight: '#F98468',
    blush: '#FF9A80',
  },
  midnight: {
    accent: '#34506E',
    ink: '#1C1A17',
    paper: '#E9EEF4',
    deep: '#22364C',
    highlight: '#5A7696',
    blush: '#86A4C6',
  },
  moss: {
    accent: '#4C6A4C',
    ink: '#1C1A17',
    paper: '#EEF1E6',
    deep: '#334833',
    highlight: '#6F8E6F',
    blush: '#A2BDA2',
  },
  plum: {
    accent: '#5E3B57',
    ink: '#1C1A17',
    paper: '#F2ECF0',
    deep: '#40273B',
    highlight: '#84607C',
    blush: '#B891AF',
  },
  mustard: {
    accent: '#C1922F',
    ink: '#1C1A17',
    paper: '#FBF3E2',
    deep: '#9A7020',
    highlight: '#D8AE55',
    blush: '#ECCB86',
  },
};

/** The store's product of each ink; the ink that was already on sale keeps its product. */
const INK_PRODUCTS: Record<InkId, string | null> = {
  tangerine: null,
  midnight: 'ink_midnight_riso',
  moss: 'ink_moss',
  plum: 'ink_plum',
  mustard: 'ink_mustard',
};

const product = (id: string | null): string | null => (id === null ? null : storeProductId(id));

export const INKS: readonly InkItem[] = INK_IDS.map((id, index) => ({
  id,
  kind: 'ink',
  productId: product(INK_PRODUCTS[id]),
  name: `studio.ink.${id}`,
  short: `studio.ink.${id}.short`,
  about: `studio.ink.${id}.about`,
  code: `INK ${String(index + 1).padStart(2, '0')}`,
  colours: INK_COLOURS[id],
}));

export const FINISHES: readonly FinishItem[] = CARD_FINISH_IDS.map((id) => ({
  id,
  kind: 'finish',
  productId: product(id === FREE_LOOK.finish ? null : `finish_${id}`),
  name: `finish.${id}`,
  short: `studio.finish.${id}.short`,
  about: `studio.finish.${id}.about`,
}));

export const TRAILS: readonly TrailItem[] = TRAIL_IDS.map((id) => ({
  id,
  kind: 'trail',
  productId: product(id === FREE_LOOK.trail ? null : `trail_${id}`),
  name: `studio.trail.${id}`,
  short: `studio.trail.${id}`,
  about: `studio.trail.${id}.about`,
}));

export const STUDIO: readonly StudioItem[] = [...INKS, ...FINISHES, ...TRAILS];

export const studioProductIds: readonly string[] = STUDIO.flatMap((item) =>
  item.productId === null ? [] : [item.productId],
);

export function inkOf(id: InkId): InkItem {
  return INKS.find((ink) => ink.id === id) ?? (INKS[0] as InkItem);
}

export function itemsOf(kind: StudioKind): readonly StudioItem[] {
  return kind === 'ink' ? INKS : kind === 'finish' ? FINISHES : TRAILS;
}
