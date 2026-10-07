import { boxArea, edgeDistance, type FoundThing } from './things';

/**
 * How quickly a kind of thing leaves a desk, quickest first. `carried` goes in one hand to the
 * sink or the bin; `loose` is small and has a home; `paper` needs a decision before it moves;
 * `fixed` belongs there and is never the first step.
 */
export const DESK_FAMILIES = ['carried', 'loose', 'paper', 'unnamed', 'fixed'] as const;
export type DeskFamily = (typeof DESK_FAMILIES)[number];

const FAMILY_WORDS: Readonly<Record<Exclude<DeskFamily, 'unnamed'>, readonly string[]>> = {
  carried: [
    'mug',
    'cup',
    'glass',
    'bottle',
    'can',
    'plate',
    'bowl',
    'dish',
    'tableware',
    'drink',
    'cutlery',
    'fork',
    'spoon',
    'knife',
    'wrapper',
    'packaging',
    'tissue',
    'napkin',
    'food',
    'coaster',
  ],
  loose: [
    'cable',
    'wire',
    'charger',
    'pen',
    'pencil',
    'marker',
    'scissors',
    'tape',
    'key',
    'coin',
    'toy',
    'headphones',
    'glasses',
    'sunglasses',
    'remote',
    'wallet',
    'bag',
    'clothing',
    'sock',
  ],
  paper: [
    'paper',
    'document',
    'letter',
    'envelope',
    'receipt',
    'book',
    'notebook',
    'magazine',
    'newspaper',
    'folder',
    'card',
    'mail',
  ],
  fixed: [
    'desk',
    'table',
    'chair',
    'shelf',
    'furniture',
    'monitor',
    'screen',
    'display',
    'computer',
    'laptop',
    'keyboard',
    'mouse',
    'lamp',
    'printer',
    'speaker',
    'plant',
    'wall',
    'floor',
    'window',
    'television',
  ],
};

/** The family of the first label that names one; a thing nobody can name is `unnamed`. */
export function deskFamily(labels: readonly string[]): DeskFamily {
  for (const label of labels) {
    const word = label.trim().toLowerCase();
    for (const family of ['carried', 'loose', 'paper', 'fixed'] as const) {
      if (FAMILY_WORDS[family].includes(word)) return family;
    }
  }
  return 'unnamed';
}

export type DeskRead =
  | { readonly kind: 'nothing' }
  | {
      readonly kind: 'step';
      /** The one thing to ring. */
      readonly thing: FoundThing;
      /** Everything else that could move, to fade back. */
      readonly others: readonly FoundThing[];
    };

/**
 * The one thing on a desk to start with: the one that leaves fastest. The quickest family wins;
 * within a family the smallest thing, then the one nearest the edge of the photo (already on its
 * way out), then the first found. Things that belong on a desk are never picked, and a desk with
 * only those on it has nothing to start with.
 */
export function readDesk(things: readonly FoundThing[]): DeskRead {
  const movable = things
    .map((thing, found) => ({ thing, found, family: deskFamily(thing.labels) }))
    .filter((entry) => entry.family !== 'fixed')
    .sort(
      (a, b) =>
        DESK_FAMILIES.indexOf(a.family) - DESK_FAMILIES.indexOf(b.family) ||
        boxArea(a.thing.box) - boxArea(b.thing.box) ||
        edgeDistance(a.thing.box) - edgeDistance(b.thing.box) ||
        a.found - b.found,
    );
  const [first, ...rest] = movable;
  if (first === undefined) return { kind: 'nothing' };
  return { kind: 'step', thing: first.thing, others: rest.map((entry) => entry.thing) };
}
