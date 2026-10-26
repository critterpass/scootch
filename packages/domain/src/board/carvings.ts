import type { Instant } from './moment';
import { choose, oneIn, roll } from './seed';
import type { Carving, CarvingKind, CommentStep } from './task';

/** The everyday doodles, equally likely. */
export const DOODLES: readonly CarvingKind[] = [
  'initials',
  'star',
  'heart',
  'tiny phu',
  'arrow',
  'flower',
];

/** About one graded finish in this many that is not a circled 10 leaves a gold star sticker. */
export const GOLD_STAR_ONE_IN = 30;

export type CarvingInput = {
  readonly taskId: string;
  readonly seed: string;
  readonly comment: CommentStep | null;
  readonly heavy: boolean;
  readonly at: Instant;
};

/**
 * What a finish carves into the desk. A circled 10 carves a "10"; about one other graded finish
 * in thirty leaves a gold star; everything else is a doodle. A serious or crisis task still
 * leaves a plain doodle (it was finished) but never a rare mark, since it is not graded.
 */
export function carvingFor(input: CarvingInput): Carving {
  const kind: CarvingKind =
    input.comment === 'ten'
      ? 'carved ten'
      : !input.heavy && input.comment !== null && oneIn(GOLD_STAR_ONE_IN, input.seed, 'gold star')
        ? 'gold star'
        : choose(DOODLES, input.seed, 'doodle');
  return {
    taskId: input.taskId,
    kind,
    x: roll(input.seed, 'carving x'),
    y: roll(input.seed, 'carving y'),
    turn: Math.round(roll(input.seed, 'carving turn') * 60 - 30),
    at: input.at,
  };
}

/** Adds a carving. The desk never loses a mark, and one task carves once. */
export function carveInto(desk: readonly Carving[], carving: Carving): readonly Carving[] {
  return desk.some((mark) => mark.taskId === carving.taskId) ? desk : [...desk, carving];
}
