import type { Id, IsoDate, MonsterRow } from '../contracts';
import { addDays, instantFromIso, localDateTime } from '../day';

import { fractionOf } from './fraction';
import * as entries from './odd/index.generated';
import { isOddVariation, type OddCatch, type OddHatch } from './odd-variation';
import { isoWeekOf } from './record-bar';

type Entry = (typeof entries)[keyof typeof entries];
/** The catches that are not among the usual ones, by the name of their scene. */
export type OddCatchKind = Extract<Entry, { readonly on: 'catch' }>['kind'];

const variations = Object.values(entries).filter(isOddVariation);
/** Every odd hatch and every odd catch there is: the files of `odd/`, and nothing else. */
export const ODD_HATCHES: readonly OddHatch[] = variations.filter((one) => one.on === 'hatch');
export const ODD_CATCHES = variations.filter((one) => one.on === 'catch') as readonly (OddCatch & {
  readonly kind: OddCatchKind;
})[];

/**
 * The chance a week is drawn. A drawn week straight after an odd one stays ordinary, which leaves
 * about one week in six odd.
 */
export const ODD_WEEK_DRAW = 1 / 5;
/** Nothing is odd until this catch: the first three are as they always were. */
export const ODD_FROM_CATCH = 4;

/**
 * What the rule reads of a monster: when it hatched, when it was caught, and what it was. A stored
 * monster row is one of these as it stands.
 */
export type OddHistoryMonster = Pick<
  MonsterRow,
  'taskId' | 'hatchedAt' | 'caughtOn' | 'number' | 'oddWord'
>;

/**
 * Everything an odd week is decided from: the user's own monsters, the task in hand and the day.
 * There is no field for Plus, a purchase, a streak or a calendar of events: an odd week cannot be
 * bought, earned or looked up, and it earns nothing.
 */
export interface OddDraw {
  readonly taskId: Id;
  /** The task's stored care flag. A serious task is never varied. */
  readonly serious: boolean;
  /** The user's local day. */
  readonly today: IsoDate;
  /** Every monster on the phone, in any order. */
  readonly monsters: readonly OddHistoryMonster[];
}

export interface OddHatchDraw extends OddDraw {
  /** Where the user is, to tell which week a monster hatched in. */
  readonly timeZone: string;
}

/** The Monday of the week a day falls in. */
function weekOf(day: IsoDate): IsoDate {
  return addDays(day, 1 - isoWeekOf(day).weekday);
}

const drawn = (seed: string, week: IsoDate) =>
  fractionOf(`${seed}/odd-week/${week}`) < ODD_WEEK_DRAW;

/**
 * Whether the week of `day` is odd for this seed. Weeks are drawn one by one; in a run of drawn
 * weeks the first is odd, the next is not, and so on, so no two odd weeks ever follow each other.
 */
export function isOddWeek(seed: string, day: IsoDate): boolean {
  let run = 0;
  for (let week = weekOf(day); drawn(seed, week); week = addDays(week, -7)) run += 1;
  return run % 2 === 1;
}

type Caught = OddHistoryMonster & { readonly caughtOn: IsoDate; readonly number: number };

/** The monsters caught before the task in hand, first catch first. */
function caughtBefore(draw: Pick<OddDraw, 'taskId' | 'monsters'>): Caught[] {
  return draw.monsters
    .filter(
      (one): one is Caught =>
        one.number !== null && one.caughtOn !== null && one.taskId !== draw.taskId,
    )
    .sort((a, b) => a.number - b.number);
}

function pick<T>(from: readonly T[], seed: string, what: string, week: IsoDate): T | null {
  return from[Math.floor(fractionOf(`${seed}/${what}/${week}`) * from.length)] ?? null;
}

/**
 * The odd week the task in hand is in, or `null`: where the first three catches are not yet in
 * the binder, where the task is serious, and in every ordinary week. The seed is the first catch
 * the user ever made, so it is theirs alone and comes back with a restore.
 */
function oddWeekOf(draw: OddDraw): { seed: string; week: IsoDate; caught: Caught[] } | null {
  if (draw.serious) return null;
  const caught = caughtBefore(draw);
  const first = caught[0];
  if (!first || caught.length < ODD_FROM_CATCH - 1) return null;
  if (!isOddWeek(first.taskId, draw.today)) return null;
  return { seed: first.taskId, week: weekOf(draw.today), caught };
}

/**
 * The odd hatch for a task hatching today, or `null`. An odd week has at most one: once a monster
 * hatched in it carries a word, every other hatch that week is an ordinary one. The same monsters
 * and the same day always give the same answer.
 */
export function oddHatchFor(draw: OddHatchDraw): OddHatch | null {
  const odd = oddWeekOf(draw);
  if (odd === null) return null;
  const taken = draw.monsters.some(
    (one) =>
      one.taskId !== draw.taskId &&
      (one.oddWord ?? null) !== null &&
      weekOf(localDateTime(instantFromIso(one.hatchedAt), draw.timeZone).date) === odd.week,
  );
  return taken ? null : pick(ODD_HATCHES, odd.seed, 'hatch', odd.week);
}

/**
 * The odd catch for the task in hand today, or `null`. An odd week has at most one: it is the
 * week's first catch, so once anything else has been caught in the week the usual roll is back.
 */
export function oddCatchFor(draw: OddDraw): (typeof ODD_CATCHES)[number] | null {
  const odd = oddWeekOf(draw);
  if (odd === null) return null;
  if (odd.caught.some((one) => weekOf(one.caughtOn) === odd.week)) return null;
  return pick(ODD_CATCHES, odd.seed, 'catch', odd.week);
}

/**
 * The odd catches that have had their first turn, which is when each joins the usual roll: every
 * one that was the first catch of an odd week already behind the task in hand. In the order of
 * the registry, so the answer does not depend on which turned up first.
 */
export function oddCatchesJoined(draw: Pick<OddDraw, 'taskId' | 'monsters'>): OddCatchKind[] {
  const caught = caughtBefore(draw);
  const seed = caught[0]?.taskId;
  if (seed === undefined) return [];
  const turned = new Set<OddCatchKind>();
  const weeks = new Set<IsoDate>();
  for (const [before, one] of caught.entries()) {
    const week = weekOf(one.caughtOn);
    // Only a week's first catch can have been its odd one.
    if (weeks.has(week)) continue;
    weeks.add(week);
    if (before < ODD_FROM_CATCH - 1 || !isOddWeek(seed, week)) continue;
    const kind = pick(ODD_CATCHES, seed, 'catch', week)?.kind;
    if (kind !== undefined) turned.add(kind);
  }
  return ODD_CATCHES.map((one) => one.kind).filter((kind) => turned.has(kind));
}
