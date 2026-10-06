import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { addDays, daysBetween, instantFromIso } from '../day';
import { TODAY, dayNear, drawerItem, idMaker, taskRow } from '../day/test/rows';

import {
  FADE_AFTER_DAYS,
  fadeDrawer,
  mentionAgain,
  parkThings,
  returnDateFor,
  returningItem,
  swapIn,
} from './drawer-items';
import { DRAWER_CLOSED, drawerViewReducer, type DrawerEvent } from './drawer-view';

const now = instantFromIso('2026-10-06T08:41:00Z');
const parkInput = { drawer: [], screen: 'pass' as const, today: TODAY, now };

describe('the morning a dated thing comes back', () => {
  // The design board is dated Tuesday 6 October 2026.
  it.each([
    ['council tax, due Friday, back on Thursday', '2026-10-09', '2026-10-08'],
    ['the MOT, expires 30 Oct, back on 23 Oct', '2026-10-30', '2026-10-23'],
    ['a week away is still near: the day before', '2026-10-13', '2026-10-12'],
    ['eight days away is far: a week before', '2026-10-14', '2026-10-07'],
    ['due tomorrow: today', '2026-10-07', TODAY],
    ['due today: today', TODAY, TODAY],
    ['already overdue: today', '2026-10-01', TODAY],
    ['months away: a week before', '2027-02-01', '2027-01-25'],
  ])('%s', (_name, dueDate, back) => {
    expect(returnDateFor(dueDate, TODAY)).toBe(back);
  });
});

describe('parking what the brain dump did not pick', () => {
  it('parks undated things with a fade date and dated things with a return date', () => {
    const drawer = parkThings({
      ...parkInput,
      things: [{ text: 'Call mum back' }, { text: 'Council tax', dueDate: '2026-10-09' }],
      nextId: idMaker('item'),
    });
    expect(drawer).toEqual([
      drawerItem({ id: 'item-1', createdAt: '2026-10-06T08:41:00.000Z' }),
      drawerItem({
        id: 'item-2',
        text: 'Council tax',
        dueDate: '2026-10-09',
        returnOn: '2026-10-08',
        fadesOn: null,
        createdAt: '2026-10-06T08:41:00.000Z',
      }),
    ]);
  });

  it('keeps the care flag of the text the things came from', () => {
    const [item] = parkThings({
      ...parkInput,
      screen: 'serious',
      things: [{ text: 'Ring the solicitor' }],
      nextId: idMaker('item'),
    });
    expect(item?.screen).toBe('serious');
  });

  it('does not park the same thing twice: a new mention resets its two weeks', () => {
    const old = drawerItem({ lastMentionedOn: addDays(TODAY, -13), fadesOn: addDays(TODAY, 1) });
    const drawer = parkThings({
      ...parkInput,
      drawer: [old],
      things: [{ text: '  call MUM back ' }],
      nextId: idMaker('item'),
    });
    expect(drawer).toEqual([{ ...old, lastMentionedOn: TODAY, fadesOn: addDays(TODAY, 14) }]);
  });

  it('gives an undated thing a return morning when a date is heard for it', () => {
    const item = mentionAgain(drawerItem({ text: 'Book the MOT' }), TODAY, '2026-10-30');
    expect(item).toMatchObject({ dueDate: '2026-10-30', returnOn: '2026-10-23', fadesOn: null });
  });

  it('keeps the return morning of a dated thing when it is only mentioned again', () => {
    const dated = drawerItem({ dueDate: '2026-10-30', returnOn: '2026-10-23', fadesOn: null });
    expect(mentionAgain(dated, '2026-10-24')).toEqual({ ...dated, lastMentionedOn: '2026-10-24' });
  });
});

describe('fading', () => {
  it.each([
    [13, true],
    [14, false],
    [15, false],
  ])('an undated thing last mentioned %i days ago is kept: %s', (days, kept) => {
    const lastMentionedOn = addDays(TODAY, -days);
    const item = drawerItem({
      lastMentionedOn,
      fadesOn: addDays(lastMentionedOn, FADE_AFTER_DAYS),
    });
    expect(fadeDrawer([item], TODAY)).toEqual(
      kept ? { kept: [item], fadedIds: [] } : { kept: [], fadedIds: ['item-a'] },
    );
  });

  it('never fades a dated thing', () => {
    const dated = drawerItem({ dueDate: '2026-01-01', returnOn: '2025-12-25', fadesOn: null });
    expect(fadeDrawer([dated], '2027-06-01').kept).toEqual([dated]);
  });
});

describe('returning as the one thing', () => {
  const tax = drawerItem({
    id: 'tax',
    dueDate: '2026-10-09',
    returnOn: '2026-10-08',
    fadesOn: null,
  });
  const mot = drawerItem({
    id: 'mot',
    dueDate: '2026-10-30',
    returnOn: '2026-10-23',
    fadesOn: null,
  });

  it.each([
    ['2026-10-07', null],
    ['2026-10-08', 'tax'],
    ['2026-10-22', 'tax'],
    ['2026-10-23', 'tax'],
  ])('on %s the returning item is %s', (today, id) => {
    expect(returningItem([drawerItem(), mot, tax], today)?.id ?? null).toBe(id);
  });

  it('brings back one thing at a time, nearest date first', () => {
    expect(returningItem([mot], '2026-10-23')?.id).toBe('mot');
    expect(returningItem([drawerItem()], '2027-01-01')).toBeNull();
  });
});

describe('swapping a drawer item in', () => {
  const mot = drawerItem({
    id: 'mot',
    text: 'Book the MOT',
    firstMentionedOn: '2026-09-20',
    dueDate: '2026-10-30',
    returnOn: '2026-10-23',
    fadesOn: null,
  });
  const input = { drawer: [mot, drawerItem()], itemId: 'mot', today: TODAY, now };

  it('makes it the one thing and parks the thing it replaces', () => {
    const current = taskRow({ firstMentionedOn: '2026-10-01' });
    const result = swapIn({ ...input, current, nextId: idMaker('item') });
    expect(result).toEqual({
      ok: true,
      replacedTaskId: 'task-a',
      oneThing: {
        text: 'Book the MOT',
        source: 'drawer',
        screen: 'pass',
        localDate: TODAY,
        firstMentionedOn: '2026-09-20',
        dueDate: '2026-10-30',
      },
      drawer: [
        drawerItem(),
        drawerItem({
          id: 'item-1',
          text: 'Email the dentist about Thursday',
          firstMentionedOn: '2026-10-01',
          createdAt: '2026-10-06T08:41:00.000Z',
        }),
      ],
    });
  });

  it('works with nothing set, and refuses a thing already started or not in the drawer', () => {
    const nextId = idMaker('item');
    expect(swapIn({ ...input, current: null, nextId })).toMatchObject({
      ok: true,
      replacedTaskId: null,
      drawer: [drawerItem()],
    });
    expect(swapIn({ ...input, current: taskRow({ status: 'started' }), nextId })).toEqual({
      ok: false,
      reason: 'already_started',
    });
    expect(swapIn({ ...input, itemId: 'gone', current: null, nextId })).toEqual({
      ok: false,
      reason: 'not_in_drawer',
    });
  });
});

const drawerEvent: fc.Arbitrary<DrawerEvent> = fc.constantFrom<DrawerEvent>(
  { type: 'pulled' },
  { type: 'closed' },
  { type: 'swapped_in' },
  { type: 'things_parked' },
  { type: 'deadline_heard' },
  { type: 'thought_kept' },
  { type: 'item_returned' },
  { type: 'items_faded' },
  { type: 'day_rolled_over' },
  { type: 'app_opened' },
);

describe('drawer properties', { timeout: 60_000 }, () => {
  it('never opens without the deliberate pull', () => {
    fc.assert(
      fc.property(fc.array(drawerEvent, { maxLength: 60 }), (events) => {
        let view = DRAWER_CLOSED;
        for (const event of events) {
          const step = drawerViewReducer(view, event);
          const shows = step.effects.some((effect) => effect.kind === 'show_drawer');
          expect(shows).toBe(event.type === 'pulled' && !view.open);
          if (step.view.open && !view.open) expect(event.type).toBe('pulled');
          view = step.view;
        }
      }),
    );
  });

  it('stays shut for any sequence that has no pull in it', () => {
    const quiet = drawerEvent.filter((event) => event.type !== 'pulled');
    fc.assert(
      fc.property(fc.array(quiet, { maxLength: 60 }), (events) => {
        let view = DRAWER_CLOSED;
        for (const event of events) {
          const step = drawerViewReducer(view, event);
          expect(step).toStrictEqual({ view: DRAWER_CLOSED, effects: [] });
          view = step.view;
        }
      }),
    );
  });

  it('brings a dated thing back on or before its date, never before it was heard', () => {
    fc.assert(
      fc.property(dayNear(400), fc.integer({ min: 0, max: 800 }), (heardOn, ahead) => {
        const dueDate = addDays(heardOn, ahead);
        const back = returnDateFor(dueDate, heardOn);
        expect(back >= heardOn && back <= dueDate).toBe(true);
        expect(daysBetween(back, dueDate)).toBeLessThanOrEqual(7);
        if (ahead >= 1) expect(back < dueDate).toBe(true);
      }),
    );
  });

  it('fades an undated thing exactly two weeks after its last mention, and a mention resets it', () => {
    fc.assert(
      fc.property(
        dayNear(60),
        dayNear(60),
        fc.integer({ min: 0, max: 40 }),
        (first, again, wait) => {
          const [parked] = parkThings({
            ...parkInput,
            today: first,
            things: [{ text: 'Reply to Sam' }],
            nextId: idMaker('item'),
          });
          if (!parked) throw new Error('nothing was parked');
          const item = again >= first ? mentionAgain(parked, again) : parked;
          const today = addDays(item.lastMentionedOn, wait);
          expect(fadeDrawer([item], today).kept.length).toBe(wait < FADE_AFTER_DAYS ? 1 : 0);
        },
      ),
    );
  });
});
