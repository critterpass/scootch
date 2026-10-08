import type { CardRarity, GuessMinutes, IsoDate } from '../contracts';
import { MINUTE_MS, daysBetween, type Instant } from '../day';

/** Lurking this many days or more moves the dread meter up one pip each: 2 to 5 pips. */
export const DREAD_FROM_DAYS_LURKED = [2, 14, 90, 365] as const;
/** Carried over or shrunk this many times in all, a task is one pip more dreaded. */
export const DREAD_AVOIDED_TIMES = 2;
export const DREAD_MAX = 5;

/** Days lurked from which a card is uncommon, then rare. Nothing else moves rarity. */
export const UNCOMMON_FROM_DAYS_LURKED = 14;
export const RARE_FROM_DAYS_LURKED = 90;

/** One sitting on the task, from its start to its end. */
export interface Sitting {
  readonly startedAt: Instant;
  readonly endedAt: Instant;
}

/**
 * What really happened to one task, and nothing else. There is no field for Plus, a purchase, a
 * shelf item or a roll of the dice, so none of them can reach a card.
 */
export interface TaskHistory {
  /** The first day the user mentioned or parked it. */
  readonly firstMentionedOn: IsoDate;
  /** The user's local day of the catch. */
  readonly caughtOn: IsoDate;
  /** How many times it was carried on to another day. */
  readonly carriedOverCount: number;
  /** How many times it was made smaller. */
  readonly shrinkCount: number;
  /** Every sitting it took, the catching one included. */
  readonly sittings: readonly Sitting[];
  /** How long the user thought it would take, when they guessed before starting. */
  readonly guessMinutes?: GuessMinutes | null;
}

/** The numbers printed on a caught card, frozen at the catch. */
export interface CardStats {
  readonly daysLurked: number;
  /** Whole minutes of sittings, rounded up, at least one. */
  readonly catchMinutes: number;
  /** The five-pip meter, 1 to 5. */
  readonly dread: number;
  readonly rarity: CardRarity;
  /** The guess, kept beside the real time and never weighed against it. Absent with no guess. */
  readonly guessMinutes?: GuessMinutes;
}

export function daysLurked(history: Pick<TaskHistory, 'firstMentionedOn' | 'caughtOn'>): number {
  return Math.max(0, daysBetween(history.firstMentionedOn, history.caughtOn));
}

export function catchMinutes(sittings: readonly Sitting[]): number {
  const spent = sittings.reduce(
    (sum, sitting) => sum + Math.max(0, sitting.endedAt - sitting.startedAt),
    0,
  );
  return Math.max(1, Math.ceil(spent / MINUTE_MS));
}

/** How dreaded the task was: mostly how long it lurked, one pip more when it kept being put off. */
export function dreadLevel(
  history: Pick<TaskHistory, 'firstMentionedOn' | 'caughtOn' | 'carriedOverCount' | 'shrinkCount'>,
): number {
  const days = daysLurked(history);
  const fromDays = 1 + DREAD_FROM_DAYS_LURKED.filter((from) => days >= from).length;
  const avoided = history.carriedOverCount + history.shrinkCount >= DREAD_AVOIDED_TIMES ? 1 : 0;
  return Math.min(DREAD_MAX, fromDays + avoided);
}

/**
 * Rarity is how long the task really lurked. Sitting again, carrying over or tapping "too big"
 * cannot raise it, and neither can anything that is paid for.
 */
export function rarityFor(lurkedDays: number): CardRarity {
  if (lurkedDays >= RARE_FROM_DAYS_LURKED) return 'rare';
  if (lurkedDays >= UNCOMMON_FROM_DAYS_LURKED) return 'uncommon';
  return 'common';
}

/** The card's stats from the task's own history. The same history always gives the same card. */
export function cardStats(history: TaskHistory): CardStats {
  const lurked = daysLurked(history);
  return {
    daysLurked: lurked,
    catchMinutes: catchMinutes(history.sittings),
    dread: dreadLevel(history),
    rarity: rarityFor(lurked),
    ...(history.guessMinutes != null ? { guessMinutes: history.guessMinutes } : {}),
  };
}

/** The two numbers a card prints side by side: "Thought 2 hours. Took 11 minutes." */
export interface GuessAndReal {
  readonly thoughtMinutes: number;
  readonly tookMinutes: number;
}

/**
 * The guess and the real time of a caught thing, or `null` when no guess was made or it is not
 * caught yet. Two numbers and nothing else: which one is larger is never worked out, so no line
 * can say faster, slower, only or just, and a guess that was too short prints like any other.
 */
export function guessAndReal(card: {
  readonly guessMinutes?: number | null | undefined;
  readonly catchMinutes: number | null;
}): GuessAndReal | null {
  if (card.guessMinutes == null || card.catchMinutes === null) return null;
  return { thoughtMinutes: card.guessMinutes, tookMinutes: card.catchMinutes };
}
