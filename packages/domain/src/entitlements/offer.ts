import { DAY_MS, type Instant } from '../day';

import { hasPlus, type PurchaseState } from './unlocked';

/** The first offer waits for this many caught monsters. */
export const OFFER_AFTER_CATCHES = 3;
/** Once dismissed, the offer stays away this long. */
export const OFFER_QUIET_DAYS = 7;

/** Where the user is. The offer lives in the world and nowhere else. */
export const OFFER_PLACES = [
  'first_launch',
  'one_screen',
  'session',
  'done_for_today',
  'world',
  'zoo',
  'record',
  'settings',
] as const;
export type OfferPlace = (typeof OFFER_PLACES)[number];

export const OFFER_HOME: OfferPlace = 'world';

/** What the phone remembers about the offer: only when it was last waved away. */
export interface OfferMemory {
  readonly dismissedAt: Instant | null;
}

export const OFFER_NEVER_DISMISSED: OfferMemory = { dismissedAt: null };

export interface OfferMoment {
  readonly now: Instant;
  readonly place: OfferPlace;
  readonly purchase: PurchaseState;
  /** Monsters caught so far. */
  readonly catches: number;
  readonly firstLaunchDone: boolean;
  /** A session is running, on this screen or behind it. */
  readonly sessionRunning: boolean;
  /** Something was finished since the user arrived on this screen. */
  readonly finishedThisVisit: boolean;
  readonly memory: OfferMemory;
}

/**
 * Whether the one-line offer may be shown now. It is never a paywall: it waits in the world, after
 * the third catch, on a visit that did not include a finish, and stays away for a week once
 * dismissed.
 */
export function mayShowOffer(moment: OfferMoment): boolean {
  if (moment.place !== OFFER_HOME) return false;
  if (!moment.firstLaunchDone || moment.sessionRunning || moment.finishedThisVisit) return false;
  if (hasPlus(moment.purchase)) return false;
  if (moment.catches < OFFER_AFTER_CATCHES) return false;
  const { dismissedAt } = moment.memory;
  return dismissedAt === null || moment.now - dismissedAt >= OFFER_QUIET_DAYS * DAY_MS;
}

/** One tap dismisses it. There is no second step and nothing to confirm. */
export function dismissOffer(now: Instant): OfferMemory {
  return { dismissedAt: now };
}
