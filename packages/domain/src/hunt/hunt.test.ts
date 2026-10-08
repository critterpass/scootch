import { describe, expect, it } from 'vitest';

import { HOUR_MS, MINUTE_MS } from '../day/local-time';
import { taskRow } from '../day/test/rows';

import { bittenScale, firstBite, sittingBites, tickBite } from './bites';
import {
  HUNT_SMALLEST_MONSTER,
  beginHunt,
  catchHunt,
  huntOfSession,
  huntView,
  moreHunt,
  nextHuntChange,
  parkInHunt,
  pauseHunt,
  resumeHunt,
  shortenHunt,
  stopHunt,
  type HuntPhase,
} from './hunt-record';
import { dayOfLurking, lurkerSize, oldestFirst } from './lurking';

// 14:43:00 UTC, so "the top of the hour" is easy to read.
const T0 = Date.parse('2026-10-07T14:43:00.000Z');
const SEC = 1000;
const begun = beginHunt('task-1', 10, T0);
const CLOCK = begun.beginsAt;

describe('what the hunt shows', () => {
  const phases: readonly (readonly [string, number, HuntPhase])[] = [
    ['the moment it is asked for', T0, 'starting'],
    ['one second before the clock', CLOCK - SEC, 'starting'],
    ['as the clock starts', CLOCK, 'running'],
    ['with just over two minutes left', CLOCK + 8 * MINUTE_MS - SEC, 'running'],
    ['with two minutes left', CLOCK + 8 * MINUTE_MS, 'last_minutes'],
    ['one second before the end', CLOCK + 10 * MINUTE_MS - SEC, 'last_minutes'],
    ['at the end', CLOCK + 10 * MINUTE_MS, 'overtime'],
    ['an hour past the end', CLOCK + 70 * MINUTE_MS, 'overtime'],
  ];
  it.each(phases)('%s', (_when, now, phase) => {
    expect(huntView(begun, now)?.phase).toBe(phase);
  });

  it('counts in by whole seconds and has the whole race ahead', () => {
    expect(huntView(begun, T0)).toMatchObject({ countIn: 3, progress: 0, monsterScale: 1 });
    expect(huntView(begun, T0 + 2500)?.countIn).toBe(1);
    expect(huntView(begun, CLOCK)?.countIn).toBe(0);
  });

  it('runs Scootch along the bar as the monster shrinks to a crumb', () => {
    const half = huntView(begun, CLOCK + 5 * MINUTE_MS);
    expect(half).toMatchObject({ progress: 0.5, remainingMs: 5 * MINUTE_MS, overMs: 0 });
    expect(half?.monsterScale).toBeCloseTo(1 - (1 - HUNT_SMALLEST_MONSTER) / 2);
    const end = huntView(begun, CLOCK + 13 * MINUTE_MS + 10 * SEC);
    expect(end).toMatchObject({ progress: 1, remainingMs: 0, overMs: 3 * MINUTE_MS + 10 * SEC });
    expect(end?.monsterScale).toBe(HUNT_SMALLEST_MONSTER);
  });

  it('never calls a hunt caught because the time ran out', () => {
    expect(huntView(begun, CLOCK + 24 * HOUR_MS)?.phase).toBe('overtime');
  });
});

describe('a parked thought', () => {
  const parkedAt = CLOCK + 3 * MINUTE_MS;
  const parked = parkInHunt(begun, 'buy stamps', parkedAt);

  it('shows its receipt for four seconds without stopping the clock', () => {
    expect(huntView(parked, parkedAt + 3 * SEC)).toMatchObject({
      phase: 'parked',
      remainingMs: 7 * MINUTE_MS - 3 * SEC,
    });
    expect(huntView(parked, parkedAt + 4 * SEC)?.phase).toBe('running');
    expect(parked.endsAt).toBe(begun.endsAt);
  });

  it('gives way to stuck and to the end of the time', () => {
    expect(huntView(pauseHunt(parked, parkedAt + SEC), parkedAt + 2 * SEC)?.phase).toBe('stuck');
    const late = parkInHunt(begun, null, begun.endsAt - SEC);
    expect(huntView(late, begun.endsAt)?.phase).toBe('overtime');
  });
});

describe('stuck', () => {
  const pausedAt = CLOCK + 4 * MINUTE_MS;
  const stuck = pauseHunt(begun, pausedAt);

  it('holds the clock where it was', () => {
    const later = huntView(stuck, pausedAt + 30 * MINUTE_MS);
    expect(later).toMatchObject({ phase: 'stuck', remainingMs: 6 * MINUTE_MS, progress: 0.4 });
  });

  it('gives every held minute back when the clock resumes', () => {
    const resumed = resumeHunt(stuck, pausedAt + 30 * MINUTE_MS);
    expect(resumed.pausedAt).toBeNull();
    expect(huntView(resumed, pausedAt + 30 * MINUTE_MS)).toMatchObject({
      phase: 'running',
      remainingMs: 6 * MINUTE_MS,
    });
  });

  it('cannot hold a clock that has not started, has run out or is already held', () => {
    expect(pauseHunt(begun, T0)).toBe(begun);
    expect(pauseHunt(begun, begun.endsAt)).toBe(begun);
    expect(pauseHunt(stuck, pausedAt + SEC)).toBe(stuck);
    expect(resumeHunt(begun, pausedAt)).toBe(begun);
  });
});

describe('overtime', () => {
  it('"5 more" is five minutes from when it is asked', () => {
    const asked = begun.endsAt + 3 * MINUTE_MS;
    const more = moreHunt(begun, asked);
    expect(huntView(more, asked)).toMatchObject({ phase: 'running', remainingMs: 5 * MINUTE_MS });
    expect(moreHunt(begun, begun.endsAt - SEC)).toBe(begun);
  });

  it('"Make it 5" shortens a hunt that still has more than that to go, and nothing else', () => {
    const five = shortenHunt(begun, 5, CLOCK + MINUTE_MS);
    expect(five.endsAt).toBe(begun.beginsAt + 5 * MINUTE_MS);
    expect(huntView(five, CLOCK + MINUTE_MS)).toMatchObject({ remainingMs: 4 * MINUTE_MS });
    // Never longer, never into the past, never while held or once over.
    expect(shortenHunt(begun, 15, CLOCK)).toBe(begun);
    expect(shortenHunt(begun, 5, CLOCK + 6 * MINUTE_MS)).toBe(begun);
    const held = pauseHunt(begun, CLOCK + MINUTE_MS);
    expect(shortenHunt(held, 5, CLOCK + MINUTE_MS)).toBe(held);
    const caught = catchHunt(begun, CLOCK + MINUTE_MS);
    expect(shortenHunt(caught, 5, CLOCK + MINUTE_MS)).toBe(caught);
  });
});

describe('the ends of a hunt', () => {
  it('"Not yet" during the count-in leaves nothing', () => {
    expect(stopHunt(begun, T0 + SEC)).toBeNull();
  });

  it('stopped early keeps the shrinking it was given', () => {
    const stopped = stopHunt(begun, CLOCK + 6 * MINUTE_MS);
    expect(stopped).not.toBeNull();
    if (stopped === null) return;
    const shown = huntView(stopped, CLOCK + 40 * MINUTE_MS);
    expect(shown).toMatchObject({ phase: 'stopped_early', progress: 0.6 });
    expect(shown?.monsterScale).toBeCloseTo(1 - (1 - HUNT_SMALLEST_MONSTER) * 0.6);
  });

  it('stopped while stuck keeps the clock where it was held', () => {
    const stuck = pauseHunt(begun, CLOCK + 2 * MINUTE_MS);
    const stopped = stopHunt(stuck, CLOCK + 9 * MINUTE_MS);
    expect(stopped && huntView(stopped, CLOCK + 9 * MINUTE_MS)?.progress).toBe(0.2);
  });

  it('caught is a whole card for eight minutes, one line until the hour, then gone', () => {
    // Caught at 14:53:03; the card folds at 15:01:03 and leaves at 16:00.
    const caughtAt = CLOCK + 10 * MINUTE_MS;
    const caught = catchHunt(begun, caughtAt);
    expect(huntView(caught, caughtAt)).toMatchObject({ phase: 'caught', progress: 1 });
    expect(huntView(caught, caughtAt + 8 * MINUTE_MS - SEC)?.phase).toBe('caught');
    expect(huntView(caught, caughtAt + 8 * MINUTE_MS)?.phase).toBe('caught_collapsed');
    expect(huntView(caught, Date.parse('2026-10-07T15:59:59.000Z'))?.phase).toBe(
      'caught_collapsed',
    );
    expect(huntView(caught, Date.parse('2026-10-07T16:00:00.000Z'))).toBeNull();
  });

  it('nothing moves a hunt that is over', () => {
    const caught = catchHunt(begun, begun.endsAt);
    expect(pauseHunt(caught, begun.endsAt + SEC)).toBe(caught);
    expect(moreHunt(caught, begun.endsAt + SEC)).toBe(caught);
    expect(parkInHunt(caught, 'x', begun.endsAt + SEC)).toBe(caught);
    expect(stopHunt(caught, begun.endsAt + SEC)).toBe(caught);
    expect(catchHunt(caught, begun.endsAt + MINUTE_MS)).toBe(caught);
  });
});

describe('when the picture next changes by the clock alone', () => {
  it('is the start of the clock, the end of the receipt, the end of the time, the fold of the card', () => {
    expect(nextHuntChange(begun, T0)).toBe(begun.beginsAt);
    expect(nextHuntChange(begun, CLOCK + MINUTE_MS)).toBe(begun.endsAt);
    expect(nextHuntChange(begun, begun.endsAt - SEC)).toBe(begun.endsAt);
    const parkedAt = CLOCK + MINUTE_MS;
    expect(nextHuntChange(parkInHunt(begun, 'x', parkedAt), parkedAt + SEC)).toBe(
      parkedAt + 4 * SEC,
    );
    const caughtAt = begun.endsAt + SEC;
    expect(nextHuntChange(catchHunt(begun, caughtAt), caughtAt)).toBe(caughtAt + 8 * MINUTE_MS);
  });

  it('is never, where only a tap moves it on', () => {
    expect(nextHuntChange(pauseHunt(begun, CLOCK + SEC), CLOCK + MINUTE_MS)).toBeNull();
    expect(nextHuntChange(begun, begun.endsAt)).toBeNull();
    expect(nextHuntChange(catchHunt(begun, begun.endsAt), begun.endsAt + 9 * MINUTE_MS)).toBeNull();
  });

  it('a session begun in the app has no count-in', () => {
    const inApp = huntOfSession('task-1', T0, T0 + 10 * MINUTE_MS);
    expect(huntView(inApp, T0)).toMatchObject({ phase: 'running', countIn: 0, progress: 0 });
  });
});

describe('lurking', () => {
  it('is on day 1 the day it is first mentioned, and counts on across midnight', () => {
    expect(dayOfLurking('2026-10-07', '2026-10-07')).toBe(1);
    expect(dayOfLurking('2026-10-07', '2026-10-08')).toBe(2);
    expect(dayOfLurking('2026-09-29', '2026-10-07')).toBe(9);
    expect(dayOfLurking('2026-10-09', '2026-10-07')).toBe(1);
  });

  it('grows a little each day until it is pressed against the glass on day 9', () => {
    expect(lurkerSize(1)).toBeCloseTo(0.4);
    expect(lurkerSize(4)).toBeCloseTo(0.625);
    expect(lurkerSize(9)).toBe(1);
    expect(lurkerSize(40)).toBe(1);
    expect(lurkerSize(5)).toBeGreaterThan(lurkerSize(4));
  });

  it('shows the four that have waited longest, oldest first', () => {
    const waiting = [3, 9, 1, 5, 9, 2].map((day, index) => ({ day, id: index }));
    expect(oldestFirst(waiting).map((one) => one.id)).toEqual([1, 4, 3, 0]);
  });
});

describe('bites', () => {
  it('takes a third of the monster each, down to a crumb', () => {
    expect(bittenScale(0)).toBe(1);
    expect(bittenScale(1)).toBeCloseTo(2 / 3);
    expect(bittenScale(2)).toBeCloseTo(1 / 3);
    expect(bittenScale(3)).toBe(0.25);
    expect(bittenScale(9)).toBe(0.25);
  });

  it('are ticked in any order, and the last one says so', () => {
    expect(tickBite([], 1)).toEqual({ caught: [1], last: false });
    expect(tickBite([1], 0)).toEqual({ caught: [0, 1], last: false });
    expect(tickBite([0, 1], 2)).toEqual({ caught: [0, 1, 2], last: true });
  });

  it('cannot be ticked twice, and there is no fourth', () => {
    expect(tickBite([1], 1)).toBeNull();
    expect(tickBite([0, 1, 2], 2)).toBeNull();
    expect(tickBite([], 3)).toBeNull();
    expect(tickBite([], -1)).toBeNull();
    expect(tickBite([], 0.5)).toBeNull();
  });
});

describe('the first bite of a sitting', () => {
  const pack = {
    hatch: 'It hatched.',
    start: 'Off we go.',
    working: ['One.', 'Two.', 'Three.'],
    pickedUp: 'Oh, hello.',
    checkIn: 'How is it going?',
    tinyNextStep: 'Find the address.',
    twoMinutesLeft: 'Two minutes.',
    timeUp: 'Time.',
    caught: 'Caught.',
    notFinished: 'You started.',
  };
  const bites = [
    { text: 'Open the email.', minutes: 1 },
    { text: 'Write two lines.', minutes: 4 },
    { text: 'Press send.', minutes: 1 },
  ];
  const nextStart = { text: 'reply to the bit about Thursday', writtenOn: '2026-10-05' };
  const own = { text: nextStart.text, minutes: null, own: true };

  it('is the written one when no line was left', () => {
    const task = taskRow({ lines: { ...pack, bites } });
    expect(firstBite(task)).toEqual({ text: 'Open the email.', minutes: 1, own: false });
    expect(sittingBites(task).map((bite) => bite.text)).toEqual(bites.map((bite) => bite.text));
    expect(firstBite({ ...task, nextStart: null })).toEqual(firstBite(task));
  });

  it("is the user's own line in place of the written one, word for word", () => {
    const task = taskRow({ lines: { ...pack, bites }, nextStart });
    expect(firstBite(task)).toEqual(own);
    expect(sittingBites(task)).toEqual([
      own,
      { text: 'Write two lines.', minutes: 4, own: false },
      { text: 'Press send.', minutes: 1, own: false },
    ]);
  });

  it('is the line alone when the task has no written bites', () => {
    expect(sittingBites(taskRow({ lines: pack, nextStart }))).toEqual([own]);
    expect(sittingBites(taskRow({ lines: null, nextStart }))).toEqual([own]);
    // A serious task has no bites of its own, and still keeps the line it was left.
    const serious = taskRow({
      screen: 'serious',
      nextStart,
      lines: {
        acknowledge: 'I am here.',
        working: ['Still here.'],
        tinyNextStep: 'Open the letter.',
        done: 'Done.',
        notFinished: 'That is fine.',
      },
    });
    expect(sittingBites(serious)).toEqual([own]);
  });

  it('is nothing when there is neither', () => {
    expect(firstBite(taskRow({ lines: pack }))).toBeNull();
    expect(sittingBites(taskRow())).toEqual([]);
  });

  it('goes back to the written one once the line is cleared', () => {
    const task = taskRow({ lines: { ...pack, bites }, nextStart });
    expect(firstBite({ ...task, nextStart: null })?.text).toBe('Open the email.');
  });
});
