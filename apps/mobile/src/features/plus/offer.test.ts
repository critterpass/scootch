import { describe, expect, it } from '@jest/globals';

import { DAY_MS, OFFER_AFTER_CATCHES, OFFER_QUIET_DAYS, dismissOffer } from '@scootch/domain';

import { readOfferFacts } from '../../state/plus-runtime';

import { throughAppleSheet } from './apple-sheet';
import { offerShows, type OfferFacts, type OfferMemoryFacts } from './offer-rules';
import { CUSTOMERS, fakeStore } from './test/fake-purchases';
import { plusPhone } from './test/plus-phone';

const NOW = Date.parse('2026-10-09T09:00:00.000Z');
const facts: OfferFacts = {
  catches: OFFER_AFTER_CATCHES,
  lastFinishAt: NOW - DAY_MS,
  firstLaunchDone: true,
  sessionRunning: false,
};
/** The world was opened once since the last finish, so this visit does not follow one. */
const seen: OfferMemoryFacts = { dismissedAt: null, worldVisitedAt: NOW - DAY_MS + 1 };

describe('the first offer', () => {
  it('shows in the world after the third catch, on a visit that does not follow a finish', () => {
    expect(offerShows(facts, seen, 'free', NOW)).toBe(true);
    expect(offerShows({ ...facts, catches: 2 }, seen, 'free', NOW)).toBe(false);
  });

  it('never shows on the visit that follows a finish', () => {
    expect(offerShows(facts, { ...seen, worldVisitedAt: null }, 'free', NOW)).toBe(false);
    expect(offerShows(facts, { ...seen, worldVisitedAt: NOW - 2 * DAY_MS }, 'free', NOW)).toBe(
      false,
    );
  });

  it('stays away for seven days after one tap, and comes back after', () => {
    const { dismissedAt } = dismissOffer(NOW);
    const later = (days: number) =>
      offerShows(facts, { ...seen, dismissedAt }, 'free', NOW + days * DAY_MS);
    expect(later(0)).toBe(false);
    expect(later(OFFER_QUIET_DAYS - 1)).toBe(false);
    expect(later(OFFER_QUIET_DAYS)).toBe(true);
  });

  it('never shows to someone with Plus, during a session or before first launch is over', () => {
    for (const purchase of ['trial', 'monthly', 'yearly', 'lifetime'] as const) {
      expect(offerShows(facts, seen, purchase, NOW)).toBe(false);
    }
    expect(offerShows(facts, seen, 'expired', NOW)).toBe(true);
    expect(offerShows({ ...facts, sessionRunning: true }, seen, 'free', NOW)).toBe(false);
    expect(offerShows({ ...facts, firstLaunchDone: false }, seen, 'free', NOW)).toBe(false);
  });

  it("reads its facts from the phone's own tables", async () => {
    const app = await plusPhone(fakeStore());
    const before = await readOfferFacts(app.repositories, app.store.getState());
    expect(before).toMatchObject({ catches: 0, lastFinishAt: null, sessionRunning: false });

    await app.finishOne('Reply to Sam');
    const after = await readOfferFacts(app.repositories, app.store.getState());
    expect(after).toMatchObject({ catches: 1, lastFinishAt: app.time.clock.now() });
  });
});

describe("cancelling and changing plan through Apple's sheet", () => {
  it('reads the state again afterwards and reports renewal going off', async () => {
    const shop = fakeStore({ customer: CUSTOMERS.yearly, afterManage: CUSTOMERS.yearlyRenewalOff });
    const app = await plusPhone(shop);
    expect(await throughAppleSheet(app.port, app.plus)).toBe('renewal_off');
    expect(shop.calls).toContain('manage');
    // Plus stays on until the store's end date: nothing is taken away early.
    expect(app.plus.getState().unlocked.plus).toBe(true);
    expect(app.plus.getState().customer.endsAt).toBe(CUSTOMERS.yearlyRenewalOff.endsAt);
  });

  it('reports a changed plan, and nothing when the sheet was only looked at', async () => {
    const shop = fakeStore({ customer: CUSTOMERS.trial, afterManage: CUSTOMERS.monthly });
    const app = await plusPhone(shop);
    expect(await throughAppleSheet(app.port, app.plus)).toBe('changed');
    expect(app.plus.getState().customer.activePlan).toBe('monthly');
    shop.afterManage = null;
    expect(await throughAppleSheet(app.port, app.plus)).toBe('same');
  });
});
