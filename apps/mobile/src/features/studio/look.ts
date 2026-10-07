import { CARD_FINISH_IDS, type CardFinish } from '@scootch/domain';

import { FREE_LOOK, INK_IDS, TRAIL_IDS, type InkId, type StudioKind, type TrailId } from './catalogue';

/** What the person wears: one ink, one finish and one trail, everywhere at once. */
export interface Look {
  readonly ink: InkId;
  readonly finish: CardFinish;
  readonly trail: TrailId;
}

export const PLAIN_LOOK: Look = FREE_LOOK;

/** The inks the shelf used to sell, and the ink each is today. */
const SHELF_INKS: Readonly<Record<string, InkId>> = { 'midnight-riso': 'midnight' };

const oneOf = <T extends string>(all: readonly T[], value: unknown, otherwise: T): T =>
  all.includes(value as T) ? (value as T) : otherwise;

/**
 * The look as stored, checked part by part: anything unreadable is the plain one. `shelfInk` is
 * the ink the shelf kept before there was a look, read once so a bought ink stays on.
 */
export function lookFromStored(value: unknown, shelfInk: unknown = null): Look {
  const stored = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const carried =
    typeof shelfInk === 'string' && Object.hasOwn(SHELF_INKS, shelfInk)
      ? SHELF_INKS[shelfInk]
      : undefined;
  return {
    ink: oneOf(INK_IDS, stored['ink'], carried ?? PLAIN_LOOK.ink),
    finish: oneOf(CARD_FINISH_IDS, stored['finish'], PLAIN_LOOK.finish),
    trail: oneOf(TRAIL_IDS, stored['trail'], PLAIN_LOOK.trail),
  };
}

/** The look with one part changed. */
export function withPart(look: Look, kind: StudioKind, id: string): Look {
  return lookFromStored({ ...look, [kind]: id });
}

export function partOf(look: Look, kind: StudioKind): string {
  return look[kind];
}
