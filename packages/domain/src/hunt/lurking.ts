import type { IsoDate } from '../contracts';
import { daysBetween } from '../day/local-time';

/** A widget shows at most this many waiting monsters. */
export const LURKERS_SHOWN = 4;
/** The day a lurker is pressed against the glass; it grows no further. */
export const LURKER_FULL_DAY = 9;
/** A first-day lurker's share of its full size. */
export const LURKER_FIRST_DAY_SIZE = 0.4;

/**
 * Which day of waiting a thing is on: the day it was first mentioned is day 1. It counts the
 * thing's days, never the person's.
 */
export function dayOfLurking(firstMentionedOn: IsoDate, today: IsoDate): number {
  return Math.max(1, daysBetween(firstMentionedOn, today) + 1);
}

/** How big a lurker is drawn on its day, from `LURKER_FIRST_DAY_SIZE` up to 1. */
export function lurkerSize(day: number): number {
  const grown = Math.min(Math.max(day, 1), LURKER_FULL_DAY) - 1;
  return LURKER_FIRST_DAY_SIZE + ((1 - LURKER_FIRST_DAY_SIZE) * grown) / (LURKER_FULL_DAY - 1);
}

/** The longest-waiting first; among equals, the order given. At most `LURKERS_SHOWN`. */
export function oldestFirst<T extends { readonly day: number }>(waiting: readonly T[]): T[] {
  return waiting
    .map((one, index) => ({ one, index }))
    .sort((a, b) => b.one.day - a.one.day || a.index - b.index)
    .slice(0, LURKERS_SHOWN)
    .map(({ one }) => one);
}
