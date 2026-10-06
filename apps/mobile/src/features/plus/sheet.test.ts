import { describe, expect, it } from '@jest/globals';

import { t as translate, type Language } from '@scootch/i18n';

import { plusMemory } from '../../data/plus-memory';
import { openTestDatabase } from '../../data/test/open-test-database';
import type { Translate } from '../../i18n/i18n-provider';
import { createPlusStore } from '../../state/plus-store';

import { unavailablePurchases, type PlanOffer } from './purchases-port';
import { createSheetController, offerOf } from './sheet-controller';
import { actionLabel, planNote, sheetLineSlot, smallPrint } from './sheet-model';
import {
  CUSTOMERS,
  FAKE_OFFERINGS,
  FAKE_PRICES,
  fakePurchases,
  fakeStore,
  type FakeStore,
} from './test/fake-purchases';

const words =
  (language: Language): Translate =>
  (key, ...params) =>
    translate(language, key, ...params);
const en = words('en');
const { monthly, yearly, lifetime } = FAKE_OFFERINGS.plans as Record<string, PlanOffer>;

async function sheet(shop: FakeStore) {
  const data = await openTestDatabase();
  const port = fakePurchases(shop);
  const store = createPlusStore({ port, memory: plusMemory(data.db) });
  await store.load();
  const controller = createSheetController({ port, store });
  await controller.open();
  return { controller, store, shop };
}

describe("the sheet's one action and its small print", () => {
  it('names the trial on yearly, a plain subscribe on monthly and a single purchase on lifetime', () => {
    expect(actionLabel(yearly!, en)).toBe('Start 7 free days');
    expect(actionLabel(monthly!, en)).toBe(`Subscribe · ${FAKE_PRICES.monthly} a month`);
    expect(actionLabel(lifetime!, en)).toBe(`Buy once · ${FAKE_PRICES.lifetime}`);
  });

  it('says what renews, when, and how to cancel, with the price the store gave', () => {
    const trial = smallPrint(yearly!, en);
    expect(trial).toContain(`7 days free, then ${FAKE_PRICES.yearly} a year`);
    expect(trial).toContain('Renews automatically until cancelled in Settings');
    expect(trial).toContain('remind you the day before');

    const month = smallPrint(monthly!, en);
    expect(month).toContain(`${FAKE_PRICES.monthly} a month`);
    expect(month).toContain('No trial on monthly');
    expect(month).toContain('cancelled in Settings');

    const once = smallPrint(lifetime!, en);
    expect(once).toContain(FAKE_PRICES.lifetime);
    expect(once).toContain('nothing renews');
    expect(once).not.toContain('Renews automatically');
  });

  it('promises no trial when the store offers this Apple ID none', () => {
    const used: PlanOffer = { ...yearly!, trialDays: null };
    expect(actionLabel(used, en)).toBe(`Subscribe · ${FAKE_PRICES.yearly} a year`);
    expect(smallPrint(used, en)).toContain('No free trial this time');
    expect(planNote(used, en)).toBe('a year');
  });

  it('carries the store price in Vietnamese too, and never one of its own', () => {
    const vi = words('vi');
    for (const offer of [monthly!, yearly!, lifetime!]) {
      const print = smallPrint(offer, vi);
      expect(print).toContain(offer.priceText);
      expect(print).not.toMatch(/[$€£₫]\s?\d/);
    }
    expect(actionLabel(lifetime!, vi)).toContain(FAKE_PRICES.lifetime);
  });

  it('fits its line to the moment it was opened from', () => {
    expect(sheetLineSlot('one_more')).toBe('plusOneMore');
    expect(sheetLineSlot('asked')).toBe('plusSheet');
  });
});

describe('the sheet at the store', () => {
  it('opens on yearly with the prices the store sent', async () => {
    const { controller, store } = await sheet(fakeStore());
    expect(controller.getState()).toMatchObject({ phase: 'ready', plan: 'yearly', notice: null });
    expect(offerOf(controller.getState())?.priceText).toBe(FAKE_PRICES.yearly);
    expect(store.getState().prices).toEqual(FAKE_PRICES);
  });

  it('goes back to the sheet without a word when the person cancels the purchase', async () => {
    const { controller, store } = await sheet(fakeStore({ nextPurchase: 'cancelled' }));
    await controller.buy();
    expect(controller.getState()).toMatchObject({
      phase: 'ready',
      busy: false,
      notice: null,
      done: null,
    });
    expect(store.getState().unlocked.plus).toBe(false);
  });

  it('says one plain line when a purchase fails, and unlocks nothing', async () => {
    const { controller, store, shop } = await sheet(fakeStore({ nextPurchase: 'failed' }));
    await controller.buy();
    expect(controller.getState()).toMatchObject({ busy: false, notice: 'failed', done: null });
    expect(store.getState().unlocked.plus).toBe(false);

    // Choosing another plan clears the line; trying again can go through.
    controller.choose('monthly');
    expect(controller.getState().notice).toBeNull();
    shop.nextPurchase = CUSTOMERS.monthly;
    await controller.buy();
    expect(shop.calls).toContain('purchase plus_monthly');
    expect(controller.getState().done).toEqual({ plan: 'monthly', customer: CUSTOMERS.monthly });
    expect(store.getState().unlocked.plus).toBe(true);
  });

  it('buys the plan that is chosen, and unlocks Plus from what the store reports back', async () => {
    const { controller, store, shop } = await sheet(fakeStore({ nextPurchase: CUSTOMERS.trial }));
    await controller.buy();
    expect(shop.calls).toContain('purchase plus_yearly');
    expect(controller.getState().done?.customer.inTrial).toBe(true);
    expect(store.getState().unlocked.startsPerDay).toBe(3);
  });

  it('restores through the Apple ID, and says so when there is nothing to restore', async () => {
    const nothing = await sheet(fakeStore());
    await nothing.controller.restore();
    expect(nothing.controller.getState()).toMatchObject({ notice: 'restore_none', done: null });

    const owned = await sheet(fakeStore({ customer: CUSTOMERS.lifetime }));
    await owned.controller.restore();
    expect(owned.controller.getState().done).toEqual({
      plan: 'lifetime',
      customer: CUSTOMERS.lifetime,
    });
    expect(owned.store.getState().unlocked.plus).toBe(true);
  });

  it('says purchases are unavailable, and offers nothing to buy, with no store or no prices', async () => {
    const data = await openTestDatabase();
    const store = createPlusStore({ port: unavailablePurchases, memory: plusMemory(data.db) });
    const none = createSheetController({ port: unavailablePurchases, store });
    await none.open();
    expect(none.getState()).toMatchObject({ phase: 'unavailable', offerings: null });
    await none.buy();
    expect(none.getState()).toMatchObject({ busy: false, done: null });

    const down = await sheet(fakeStore({ down: true }));
    expect(down.controller.getState().phase).toBe('unavailable');
    await down.controller.restore();
    expect(down.controller.getState().notice).toBe('restore_failed');
  });
});
