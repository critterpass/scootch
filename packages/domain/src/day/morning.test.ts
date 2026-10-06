import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { DrawerItemRow } from '../contracts';

import { addDays } from './local-time';
import { LONG_AWAY_DAYS, NOTE_DUE_WITHIN_DAYS, morningOffer, type MorningInput } from './morning';
import { TODAY, drawerItem, taskRow, taskRowArbitrary } from './test/rows';

const yesterday = addDays(TODAY, -1);
const longAgo = addDays(TODAY, -LONG_AWAY_DAYS);
const carried = taskRow({ carriedOver: true });

function morning(over: Partial<MorningInput> = {}): MorningInput {
  return {
    today: TODAY,
    lastOpenedDay: yesterday,
    tasks: [],
    returning: null,
    drawer: [],
    ...over,
  };
}

/** A dated drawer item due `dueIn` days from today, back `backIn` days from today. */
function dated(id: string, dueIn: number, backIn: number): DrawerItemRow {
  return drawerItem({
    id,
    dueDate: addDays(TODAY, dueIn),
    returnOn: addDays(TODAY, backIn),
    fadesOn: null,
  });
}

describe('what the morning offers', () => {
  it('asks afresh when nothing was left over', () => {
    expect(morningOffer(morning())).toEqual({ kind: 'fresh_ask' });
    expect(morningOffer(morning({ lastOpenedDay: null }))).toEqual({ kind: 'fresh_ask' });
  });

  it("offers yesterday's carried-over task, smaller", () => {
    expect(morningOffer(morning({ tasks: [carried] }))).toEqual({
      kind: 'carried_over',
      taskId: 'task-a',
      makeSmaller: true,
    });
  });

  it('puts a dated thing due back this morning before the carried-over task', () => {
    const returning = dated('item-tax', 1, 0);
    expect(morningOffer(morning({ tasks: [carried], returning, drawer: [returning] }))).toEqual({
      kind: 'deadline_returns',
      drawerItemId: 'item-tax',
    });
  });

  it.each([
    [6, 'carried_over'],
    [7, 'smallest_ask'],
    [30, 'smallest_ask'],
  ])('after %i days away the offer is %s', (days, kind) => {
    const offer = morningOffer(morning({ lastOpenedDay: addDays(TODAY, -days), tasks: [carried] }));
    expect(offer.kind).toBe(kind);
  });
});

describe('coming back after a week or more', () => {
  it('still offers the smallest ask, with nothing beside it when no date is close', () => {
    const farOff = dated('item-mot', 24, 17);
    expect(
      morningOffer(morning({ lastOpenedDay: longAgo, tasks: [carried], drawer: [farOff] })),
    ).toEqual({ kind: 'smallest_ask', minutes: 2, note: null });
  });

  it('keeps the smallest ask and adds a quiet note for the thing due back this morning', () => {
    const returning = dated('item-tax', 6, 0);
    expect(
      morningOffer(morning({ lastOpenedDay: longAgo, returning, drawer: [returning] })),
    ).toEqual({
      kind: 'smallest_ask',
      minutes: 2,
      note: { drawerItemId: 'item-tax', dueDate: addDays(TODAY, 6) },
    });
  });

  it.each([
    // Due in days, back in days, noted.
    [NOTE_DUE_WITHIN_DAYS + 1, 3, false], // four days off and not back yet
    [NOTE_DUE_WITHIN_DAYS, 2, true], // due within three days, though not back until the day before
    [1, 0, true],
    [0, 0, true],
    [-2, -3, true], // the date went by while the user was away: still said, still quietly
    [10, 0, true], // back this morning, a week ahead of its date
    [10, -4, true], // came back on a morning the app was not opened
    [10, 1, false],
  ])('a thing due in %i days, back in %i: noted %s', (dueIn, backIn, noted) => {
    const item = dated('item-a', dueIn, backIn);
    const offer = morningOffer(morning({ lastOpenedDay: longAgo, drawer: [item] }));
    expect(offer).toEqual({
      kind: 'smallest_ask',
      minutes: 2,
      note: noted ? { drawerItemId: 'item-a', dueDate: addDays(TODAY, dueIn) } : null,
    });
  });

  it('notes one thing only, the nearest date, and never an undated one', () => {
    const drawer = [drawerItem({ id: 'item-mum' }), dated('item-b', 3, 2), dated('item-a', 1, 0)];
    const offer = morningOffer(morning({ lastOpenedDay: longAgo, drawer }));
    expect(offer).toMatchObject({ note: { drawerItemId: 'item-a', dueDate: addDays(TODAY, 1) } });
  });

  it('adds no note on an ordinary morning: the returning thing is the offer itself', () => {
    const returning = dated('item-tax', 1, 0);
    const offer = morningOffer(morning({ returning, drawer: [returning] }));
    expect('note' in offer).toBe(false);
  });
});

describe('time away in the morning offer', { timeout: 60_000 }, () => {
  const tasks = fc.array(taskRowArbitrary, { maxLength: 3 });
  const drawer = fc.array(
    fc
      .record({
        id: fc.constantFrom('item-a', 'item-b', 'item-c'),
        dueIn: fc.integer({ min: -5, max: 30 }),
        lead: fc.integer({ min: 0, max: 9 }),
      })
      .map(({ id, dueIn, lead }) => dated(id, dueIn, dueIn - lead)),
    { maxLength: 4 },
  );
  const offerAfter = (days: number, rows: MorningInput['tasks'], items: DrawerItemRow[]) =>
    morningOffer(
      morning({
        lastOpenedDay: addDays(TODAY, -days),
        tasks: rows,
        drawer: items,
        returning: items.find((item) => item.returnOn !== null && item.returnOn <= TODAY) ?? null,
      }),
    );
  const aboutTheGap = /day|away|since|last|count|gap|miss|week/i;

  it('is the smallest ask after a week, a month or ten years, whatever else is waiting', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: LONG_AWAY_DAYS, max: 3650 }),
        tasks,
        drawer,
        (days, rows, items) => {
          const offer = offerAfter(days, rows, items);
          expect(offer).toMatchObject({ kind: 'smallest_ask', minutes: 2 });
          // The same answer as on the first morning of a long gap: its length is not in the result.
          expect(offer).toStrictEqual(offerAfter(LONG_AWAY_DAYS, rows, items));
        },
      ),
    );
  });

  it('carries nothing but the ask and, at most, an item and its own date', () => {
    fc.assert(
      fc.property(fc.integer({ min: LONG_AWAY_DAYS, max: 3650 }), drawer, (days, items) => {
        const offer = offerAfter(days, [], items);
        if (offer.kind !== 'smallest_ask') throw new Error('expected the smallest ask');
        expect(Object.keys(offer).sort()).toEqual(['kind', 'minutes', 'note']);
        if (offer.note === null) return;
        expect(Object.keys(offer.note).sort()).toEqual(['drawerItemId', 'dueDate']);
        const item = items.find((one) => one.id === offer.note?.drawerItemId);
        expect(items.map((one) => one.dueDate)).toContain(offer.note.dueDate);
        expect(item).toBeDefined();
        // No value in the result is the last visit or a number of days.
        const values = [offer.minutes, offer.note.drawerItemId, offer.note.dueDate];
        expect(values).not.toContain(days);
        expect(values).not.toContain(addDays(TODAY, -days));
      }),
    );
  });

  it('never shapes the offer below a week either: the count of days is not in the result', () => {
    const short = fc.integer({ min: 0, max: LONG_AWAY_DAYS - 1 });
    fc.assert(
      fc.property(short, short, tasks, drawer, (one, other, rows, items) => {
        expect(offerAfter(one, rows, items)).toStrictEqual(offerAfter(other, rows, items));
        expect(Object.keys(offerAfter(one, rows, items)).join(' ')).not.toMatch(aboutTheGap);
      }),
    );
  });
});
