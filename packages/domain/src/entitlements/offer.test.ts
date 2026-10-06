import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { DAY_MS, HOUR_MS, instantFromIso } from '../day';

import {
  OFFER_AFTER_CATCHES,
  OFFER_NEVER_DISMISSED,
  OFFER_PLACES,
  OFFER_QUIET_DAYS,
  dismissOffer,
  mayShowOffer,
  type OfferMemory,
  type OfferMoment,
} from './offer';
import { PURCHASE_STATES, hasPlus } from './unlocked';

const dayOne = instantFromIso('2026-10-06T09:00:00+01:00');

/** A free user standing in their world with three catches, nothing running, nothing dismissed. */
function moment(over: Partial<OfferMoment> = {}): OfferMoment {
  return {
    now: dayOne,
    place: 'world',
    purchase: 'free',
    catches: OFFER_AFTER_CATCHES,
    firstLaunchDone: true,
    sessionRunning: false,
    finishedThisVisit: false,
    memory: OFFER_NEVER_DISMISSED,
    ...over,
  };
}

describe('when the first offer may be shown', () => {
  it('may be shown in the world after the third catch', () => {
    expect(mayShowOffer(moment())).toBe(true);
  });

  it.each([0, 1, 2])('waits for the third catch: not after %i', (catches) => {
    expect(mayShowOffer(moment({ catches }))).toBe(false);
  });

  it.each(OFFER_PLACES.filter((place) => place !== 'world'))('is never shown in %s', (place) => {
    expect(mayShowOffer(moment({ place }))).toBe(false);
  });

  it('is never shown on the visit that included a finish, even the third catch itself', () => {
    expect(mayShowOffer(moment({ finishedThisVisit: true }))).toBe(false);
  });

  it('is never shown during first launch or while a session runs', () => {
    expect(mayShowOffer(moment({ firstLaunchDone: false }))).toBe(false);
    expect(mayShowOffer(moment({ sessionRunning: true }))).toBe(false);
  });

  it.each(PURCHASE_STATES)('with purchase state %s it is shown only without Plus', (purchase) => {
    expect(mayShowOffer(moment({ purchase }))).toBe(!hasPlus(purchase));
  });

  it('follows one user through two weeks', () => {
    // Day (from 0), hour, place, catches, finished on this visit, tap dismiss, expected.
    const timeline = [
      [0, 9, 'first_launch', 0, false, false, false],
      [0, 10, 'world', 1, true, false, false],
      [1, 10, 'world', 2, true, false, false],
      [2, 10, 'world', 3, true, false, false], // the third catch: not on the finish itself
      [2, 18, 'one_screen', 3, false, false, false],
      [2, 19, 'world', 3, false, true, true], // back in the world that evening: shown, and dismissed
      [2, 20, 'world', 3, false, false, false],
      [3, 10, 'world', 4, false, false, false],
      [5, 10, 'done_for_today', 5, false, false, false],
      [9, 18, 'world', 6, false, false, false], // an hour short of seven days
      [9, 19, 'session', 6, false, false, false],
      [9, 20, 'world', 6, false, true, true], // seven days on: shown once more, dismissed again
      [10, 10, 'world', 7, false, false, false],
      [13, 10, 'world', 9, false, false, false],
    ] as const;

    let memory: OfferMemory = OFFER_NEVER_DISMISSED;
    const shown = timeline.map(([day, hour, place, catches, finishedThisVisit, tap]) => {
      const now = dayOne - 9 * HOUR_MS + day * DAY_MS + hour * HOUR_MS;
      const may = mayShowOffer(
        moment({ now, place, catches, finishedThisVisit, firstLaunchDone: day > 0, memory }),
      );
      if (may && tap) memory = dismissOffer(now);
      return may;
    });
    expect(shown).toEqual(timeline.map((row) => row[6]));
  });

  it('is gone after one tap and back exactly seven days on', () => {
    const memory = dismissOffer(dayOne);
    expect(mayShowOffer(moment({ memory, now: dayOne }))).toBe(false);
    expect(mayShowOffer(moment({ memory, now: dayOne + OFFER_QUIET_DAYS * DAY_MS - 1 }))).toBe(
      false,
    );
    expect(mayShowOffer(moment({ memory, now: dayOne + OFFER_QUIET_DAYS * DAY_MS }))).toBe(true);
  });
});

const anyMoment: fc.Arbitrary<OfferMoment> = fc.record({
  now: fc.integer({ min: dayOne, max: dayOne + 400 * DAY_MS }),
  place: fc.constantFrom(...OFFER_PLACES),
  purchase: fc.constantFrom(...PURCHASE_STATES),
  catches: fc.integer({ min: 0, max: 400 }),
  firstLaunchDone: fc.boolean(),
  sessionRunning: fc.boolean(),
  finishedThisVisit: fc.boolean(),
  memory: fc.record({
    dismissedAt: fc.option(fc.integer({ min: dayOne - 30 * DAY_MS, max: dayOne + 400 * DAY_MS }), {
      nil: null,
    }),
  }),
});

describe('offer properties', { timeout: 60_000 }, () => {
  it('is never eligible in a forbidden moment', () => {
    fc.assert(
      fc.property(anyMoment, (one) => {
        const forbidden =
          one.place !== 'world' ||
          !one.firstLaunchDone ||
          one.sessionRunning ||
          one.finishedThisVisit ||
          one.catches < OFFER_AFTER_CATCHES ||
          hasPlus(one.purchase) ||
          (one.memory.dismissedAt !== null &&
            one.now >= one.memory.dismissedAt &&
            one.now - one.memory.dismissedAt < OFFER_QUIET_DAYS * DAY_MS);
        if (forbidden) expect(mayShowOffer(one)).toBe(false);
      }),
      { numRuns: 2000 },
    );
  });

  it('is never shown twice within seven days, however the user moves about', () => {
    const visit = fc.record({
      wait: fc.integer({ min: 0, max: 3 * DAY_MS }),
      place: fc.constantFrom(...OFFER_PLACES),
      finishedThisVisit: fc.boolean(),
      sessionRunning: fc.boolean(),
    });
    fc.assert(
      fc.property(fc.array(visit, { maxLength: 40 }), (visits) => {
        let now = dayOne;
        let memory: OfferMemory = OFFER_NEVER_DISMISSED;
        let lastShown: number | null = null;
        for (const { wait, ...where } of visits) {
          now += wait;
          if (!mayShowOffer(moment({ ...where, now, memory }))) continue;
          if (lastShown !== null) {
            expect(now - lastShown).toBeGreaterThanOrEqual(OFFER_QUIET_DAYS * DAY_MS);
          }
          lastShown = now;
          memory = dismissOffer(now);
        }
      }),
    );
  });
});
