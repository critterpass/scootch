import { mayShowOffer, type Instant, type OfferMoment, type PurchaseState } from '@scootch/domain';

/** What the phone knows when the world opens. */
export interface OfferFacts {
  /** Monsters caught so far. */
  readonly catches: number;
  /** When the latest task was finished; `null` when none has been. */
  readonly lastFinishAt: Instant | null;
  readonly firstLaunchDone: boolean;
  readonly sessionRunning: boolean;
  /** False on a day with something heavy in it: nothing is offered then. Absent means it may. */
  readonly selling?: boolean;
}

/** What the phone remembers about the offer and the world. */
export interface OfferMemoryFacts {
  readonly dismissedAt: Instant | null;
  /** When the world was last opened before this visit; `null` when it never was. */
  readonly worldVisitedAt: Instant | null;
}

/**
 * This visit to the world as the domain's offer rule reads it. A visit follows a finish when
 * something was finished since the world was last opened: the offer waits for the visit after.
 */
export function worldVisit(
  facts: OfferFacts,
  memory: OfferMemoryFacts,
  purchase: PurchaseState,
  now: Instant,
): OfferMoment {
  const followsFinish =
    facts.lastFinishAt !== null &&
    (memory.worldVisitedAt === null || facts.lastFinishAt > memory.worldVisitedAt);
  return {
    now,
    place: 'world',
    purchase,
    catches: facts.catches,
    firstLaunchDone: facts.firstLaunchDone,
    sessionRunning: facts.sessionRunning,
    finishedThisVisit: followsFinish,
    memory: { dismissedAt: memory.dismissedAt },
  };
}

/** Whether the one-line offer shows on this visit. The domain's rule decides. */
export function offerShows(
  facts: OfferFacts,
  memory: OfferMemoryFacts,
  purchase: PurchaseState,
  now: Instant,
): boolean {
  if (facts.selling === false) return false;
  return mayShowOffer(worldVisit(facts, memory, purchase, now));
}
