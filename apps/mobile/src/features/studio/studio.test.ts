import { describe, expect, it } from '@jest/globals';

import { CARD_FINISH_IDS } from '@scootch/domain';
import { t as translate } from '@scootch/i18n';

import { plusMemory } from '../../data/plus-memory';
import { openTestDatabase } from '../../data/test/open-test-database';
import { createPlusStore } from '../../state/plus-store';
import { unlockedFor } from '../plus/entitlement';
import type { CustomerState } from '../plus/purchases-port';
import { CUSTOMERS, fakePurchases, fakeStore } from '../plus/test/fake-purchases';

import {
  FINISHES,
  FREE_LOOK,
  INKS,
  STUDIO,
  STUDIO_KINDS,
  TRAILS,
  studioProductIds,
} from './catalogue';
import { lookFromStored, PLAIN_LOOK, withPart } from './look';
import {
  actionFor,
  afterPick,
  afterTakeOff,
  canTakeOff,
  finishesOwned,
  lookAfter,
  mayWear,
  owns,
  type WearFacts,
} from './rules';

const factsOf = (customer: CustomerState): WearFacts => ({
  ownedItems: customer.ownedItems,
  capabilities: unlockedFor(customer).capabilities,
});
const holo = FINISHES.find((finish) => finish.id === 'holo')!;
const moss = INKS.find((ink) => ink.id === 'moss')!;
const bubbles = TRAILS.find((trail) => trail.id === 'bubbles')!;
const PLUS = ['trial', 'monthly', 'yearly', 'yearlyRenewalOff', 'lifetime'] as const;
const NOT_PLUS = ['free', 'expired', 'refunded'] as const;

describe('what the studio sells', () => {
  it('sells five inks, seven finishes and four trails, one product each, and gives one of each away', () => {
    expect(INKS.map((ink) => ink.id)).toEqual(['tangerine', 'midnight', 'moss', 'plum', 'mustard']);
    expect(FINISHES.map((finish) => finish.id)).toEqual([...CARD_FINISH_IDS]);
    expect(TRAILS.map((trail) => trail.id)).toEqual(['confetti', 'stardust', 'bubbles', 'splat']);
    const free = STUDIO.filter((item) => item.productId === null).map((item) => item.id);
    expect(free).toEqual([FREE_LOOK.ink, FREE_LOOK.finish, FREE_LOOK.trail]);
    expect(studioProductIds).toEqual([
      'ink_midnight_riso',
      'ink_moss',
      'ink_plum',
      'ink_mustard',
      'finish_holo',
      'finish_chrome',
      'finish_jelly',
      'finish_glass',
      'finish_flock',
      'finish_riso',
      'trail_stardust',
      'trail_bubbles',
      'trail_splat',
    ]);
    expect(new Set(studioProductIds).size).toBe(studioProductIds.length);
  });

  it('never sells rarity, luck, a currency or a mended day', () => {
    const NEVER_SOLD =
      /rar(e|ity)|random|pack|loot|gacha|lucky|chance|odds|coin|gem|currency|credit|token|streak|repair|freeze|missed|skip|catch.?up/i;
    for (const item of STUDIO) {
      expect(STUDIO_KINDS).toContain(item.kind);
      for (const language of ['en', 'vi'] as const) {
        const words = [item.name, item.short, item.about].map((key) =>
          translate(language, key as never),
        );
        for (const text of [item.id, item.productId ?? '', ...words]) {
          expect(typeof text).toBe('string');
          expect([item.id, text, NEVER_SOLD.test(String(text))]).toEqual([item.id, text, false]);
        }
      }
    }
  });
});

describe('who may wear what', () => {
  it.each(PLUS)('lets %s wear every finish, bought or not', (name) => {
    for (const finish of FINISHES) expect(mayWear(finish, factsOf(CUSTOMERS[name]))).toBe(true);
  });

  it.each(NOT_PLUS)('lets %s wear only Paper until a finish is bought', (name) => {
    const facts = factsOf(CUSTOMERS[name]);
    expect(FINISHES.filter((finish) => mayWear(finish, facts)).map((finish) => finish.id)).toEqual([
      'paper',
    ]);
    const bought = factsOf({ ...CUSTOMERS[name], ownedItems: [holo.productId!] });
    expect(FINISHES.filter((finish) => mayWear(finish, bought)).map((finish) => finish.id)).toEqual(
      ['paper', 'holo'],
    );
  });

  it.each([...PLUS, ...NOT_PLUS])('sells inks and trails singly to %s, Plus or not', (name) => {
    const facts = factsOf(CUSTOMERS[name]);
    expect(INKS.filter((ink) => mayWear(ink, facts)).map((ink) => ink.id)).toEqual(['tangerine']);
    expect(TRAILS.filter((trail) => mayWear(trail, facts)).map((trail) => trail.id)).toEqual([
      'confetti',
    ]);
    const bought = factsOf({
      ...CUSTOMERS[name],
      ownedItems: [moss.productId!, bubbles.productId!],
    });
    expect(mayWear(moss, bought)).toBe(true);
    expect(mayWear(bubbles, bought)).toBe(true);
    expect(actionFor(moss, PLAIN_LOOK, facts)).toBe('buy');
    expect(actionFor(moss, PLAIN_LOOK, bought)).toBe('wear');
  });

  it('never shows a price on what is already on, and keeps it on when Plus ends', () => {
    const wearingHolo = withPart(PLAIN_LOOK, 'finish', 'holo');
    for (const name of ['expired', 'refunded'] as const) {
      const facts = factsOf(CUSTOMERS[name]);
      expect(lookAfter(wearingHolo, facts)).toEqual(wearingHolo);
      expect(actionFor(holo, wearingHolo, facts)).toBe('wearing');
      // Once it is taken off, putting it back on is a purchase again.
      expect(actionFor(holo, PLAIN_LOOK, facts)).toBe('buy');
    }
    expect(actionFor(holo, PLAIN_LOOK, factsOf(CUSTOMERS.yearly))).toBe('wear');
  });

  it("counts as owned only what is the person's to keep: Paper and each finish bought", () => {
    expect(finishesOwned([])).toBe(1);
    expect(finishesOwned(CUSTOMERS.lifetime.ownedItems)).toBe(1);
    expect(finishesOwned([holo.productId!, moss.productId!])).toBe(2);
    expect(owns(holo, [])).toBe(false);
  });
});

describe('the look that is worn', () => {
  it('reads anything unreadable as the plain look, part by part', () => {
    expect(lookFromStored(null)).toEqual(PLAIN_LOOK);
    expect(lookFromStored('holo')).toEqual(PLAIN_LOOK);
    expect(lookFromStored({ ink: 'moss', finish: 'kraft', trail: 7 })).toEqual({
      ...PLAIN_LOOK,
      ink: 'moss',
    });
    expect(withPart(PLAIN_LOOK, 'trail', 'no-such-trail')).toEqual(PLAIN_LOOK);
  });

  it('carries the ink the shelf kept into the first look, and no ink that is gone', () => {
    expect(lookFromStored(null, 'midnight-riso').ink).toBe('midnight');
    expect(lookFromStored(null, 'kraft-paper').ink).toBe('tangerine');
    expect(lookFromStored({ ink: 'plum' }, 'midnight-riso').ink).toBe('plum');
  });

  it('is plain on a new phone, and what was put on after the app is opened again', async () => {
    const { db } = await openTestDatabase();
    const open = () =>
      createPlusStore({ port: fakePurchases(fakeStore()), memory: plusMemory(db) });
    const first = open();
    await first.load();
    expect(first.getState().look).toEqual(PLAIN_LOOK);
    const look = { ink: 'moss', finish: 'jelly', trail: 'bubbles' } as const;
    await first.wear(look);
    expect(first.getState().look).toEqual(look);
    const second = open();
    await second.load();
    expect(second.getState().look).toEqual(look);
  });
});

describe('picking a swatch and taking one off', () => {
  const free = factsOf(CUSTOMERS.free);
  const plain = { worn: PLAIN_LOOK, trying: PLAIN_LOOK };

  it('only tries on what has to be bought first, and leaves what is worn alone', () => {
    const after = afterPick(plain, holo, free);
    expect(after.trying.finish).toBe('holo');
    expect(after.worn).toEqual(PLAIN_LOOK);
    expect(afterPick(plain, moss, factsOf(CUSTOMERS.yearly)).worn).toEqual(PLAIN_LOOK);
  });

  it('puts on at once what may be worn: something bought, or any finish with Plus', () => {
    const bought = { ...free, ownedItems: [moss.productId!] };
    expect(afterPick(plain, moss, bought).worn.ink).toBe('moss');
    expect(afterPick(plain, holo, factsOf(CUSTOMERS.yearly)).worn.finish).toBe('holo');
  });

  it('takes off the one kind in focus and never the other two', () => {
    const worn = { ink: 'moss', finish: 'holo', trail: 'bubbles' } as const;
    const after = afterTakeOff({ worn, trying: worn }, 'finish');
    expect(after.worn).toEqual({ ink: 'moss', finish: FREE_LOOK.finish, trail: 'bubbles' });
    expect(after.trying).toEqual(after.worn);
  });

  it('goes back to what is worn when the thing in focus was only tried on', () => {
    const worn = withPart(PLAIN_LOOK, 'finish', 'riso');
    const trying = withPart(worn, 'finish', 'chrome');
    const after = afterTakeOff({ worn, trying }, 'finish');
    expect(after.worn).toEqual(worn);
    expect(after.trying.finish).toBe('riso');
  });

  it('has nothing to take off when the plain one of the kind is on and in focus', () => {
    expect(canTakeOff(plain, 'ink')).toBe(false);
    expect(
      canTakeOff({ worn: PLAIN_LOOK, trying: withPart(PLAIN_LOOK, 'ink', 'plum') }, 'ink'),
    ).toBe(true);
    const worn = withPart(PLAIN_LOOK, 'trail', 'splat');
    expect(canTakeOff({ worn, trying: worn }, 'trail')).toBe(true);
  });
});
