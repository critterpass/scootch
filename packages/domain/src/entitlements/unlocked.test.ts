import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  ALWAYS_FREE,
  CAPABILITIES,
  PLUS_ONLY,
  PURCHASE_STATES,
  hasPlus,
  holdingsAfter,
  isUnlocked,
  unlockedBy,
  type Capability,
  type Holdings,
  type PurchaseState,
} from './unlocked';

const anyState = fc.constantFrom(...PURCHASE_STATES);

describe('what each purchase state unlocks', () => {
  it('names the things that are free forever', () => {
    expect([...ALWAYS_FREE].sort()).toEqual(
      [
        'action_button',
        'all_attitudes',
        'all_monsters',
        'all_work_modes',
        'caught_cards',
        'control_center',
        'day_loop',
        'join_table',
        'listen_to_sunday_record',
        'live_activity',
        'medium_widget',
        'share',
        'small_widget',
        'start',
        'world',
      ].sort(),
    );
    expect(ALWAYS_FREE.filter((free) => (PLUS_ONLY as readonly string[]).includes(free))).toEqual(
      [],
    );
  });

  // Purchase state, has Plus, things a day, friends the pass seats.
  const states: readonly (readonly [PurchaseState, boolean, number, number])[] = [
    ['free', false, 1, 0],
    ['trial', true, 3, 3],
    ['monthly', true, 3, 3],
    ['yearly', true, 3, 3],
    ['lifetime', true, 3, 3],
    // A trial or subscription that lapsed, and a purchase Apple refunded, are free Scootch again.
    ['expired', false, 1, 0],
    ['refunded', false, 1, 0],
    // A guest sits at the host's table on the host's pass; it gives the guest no Plus of their own.
    ['friend_pass_guest', false, 1, 0],
  ];

  it('covers every purchase state', () => {
    expect(states.map(([state]) => state)).toEqual([...PURCHASE_STATES]);
  });

  it.each(states)('%s: Plus %s, %i a day, pass seats %i', (state, plus, starts, seats) => {
    const unlocked = unlockedBy(state);
    expect(unlocked.plus).toBe(plus);
    expect(hasPlus(state)).toBe(plus);
    expect(unlocked.startsPerDay).toBe(starts);
    expect(unlocked.friendPassSeats).toBe(seats);
  });

  const grid = states.flatMap(([state, plus]) =>
    CAPABILITIES.map((capability): [PurchaseState, Capability, boolean] => [
      state,
      capability,
      plus || (ALWAYS_FREE as readonly Capability[]).includes(capability),
    ]),
  );

  it('checks every state against every capability', () => {
    expect(grid).toHaveLength(PURCHASE_STATES.length * (ALWAYS_FREE.length + PLUS_ONLY.length));
  });

  it.each(grid)('%s, %s: %s', (state, capability, open) => {
    expect(isUnlocked(state, capability)).toBe(open);
  });

  it.each([
    ['free', 'open_table', false],
    ['free', 'join_table', true],
    ['friend_pass_guest', 'join_table', true],
    ['friend_pass_guest', 'open_table', false],
    ['expired', 'binder', false],
    ['expired', 'caught_cards', true],
    ['refunded', 'keep_records', false],
    ['refunded', 'listen_to_sunday_record', true],
    ['trial', 'learning', true],
    ['lifetime', 'stand_by', true],
    ['monthly', 'extra_large_widget', true],
    ['yearly', 'export_records', true],
    ['free', 'extra_card_finishes', false],
    ['free', 'medium_widget', true],
  ] as const)('%s, %s is %s, spelled out', (state, capability, open) => {
    expect(isUnlocked(state, capability)).toBe(open);
  });
});

const count = fc.integer({ min: 0, max: 500 });
const anyHoldings: fc.Arbitrary<Holdings> = fc.record({
  cards: count,
  worldPieces: count,
  surpriseDrops: count,
  keptRecords: count,
  finishedCards: count,
});

describe('entitlement properties', { timeout: 60_000 }, () => {
  it('never removes an always-free capability, in any purchase state', () => {
    fc.assert(
      fc.property(anyState, fc.constantFrom(...ALWAYS_FREE), (state, capability) => {
        expect(isUnlocked(state, capability)).toBe(true);
        expect(unlockedBy(state).startsPerDay).toBeGreaterThanOrEqual(1);
      }),
    );
  });

  it('never unlocks a Plus capability without Plus, and unlocks all of them with it', () => {
    fc.assert(
      fc.property(anyState, fc.constantFrom(...PLUS_ONLY), (state, capability) => {
        expect(isUnlocked(state, capability)).toBe(hasPlus(state));
      }),
    );
  });

  it('never reduces what was caught or kept, through any run of purchase states', () => {
    fc.assert(
      fc.property(anyHoldings, fc.array(anyState, { minLength: 1, maxLength: 12 }), (had, run) => {
        let has = had;
        for (const state of run) {
          has = holdingsAfter(has, state);
          expect(has).toStrictEqual(had);
          // The cards and the world stay readable in the state the user lands in.
          expect(isUnlocked(state, 'caught_cards')).toBe(true);
          expect(isUnlocked(state, 'world')).toBe(true);
          expect(isUnlocked(state, 'listen_to_sunday_record')).toBe(true);
        }
      }),
    );
  });
});
