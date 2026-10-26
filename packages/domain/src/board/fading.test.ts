import { describe, expect, it } from 'vitest';

import { reword } from './actions';
import { answerStillYours, askedStillYours, fadeStateOf, stillYoursToAsk } from './fading';
import { DAY_MS, addDays } from './moment';
import { aTask, onDesk, when } from './testing';

const now = when('2026-10-27', '10:00');

describe('fading', () => {
  it('fades an undated board task untouched for fourteen days, and nothing sooner', () => {
    expect(fadeStateOf(aTask(now, { daysOld: 13 }), now)).toBe('clear');
    expect(fadeStateOf(aTask(now, { daysOld: 14 }), now)).toBe('fading');
  });

  it('never fades a dated task, the desk task, or one touched within the fortnight', () => {
    expect(fadeStateOf(aTask(now, { daysOld: 30, dueDate: addDays(now.day, 3) }), now)).toBe(
      'clear',
    );
    expect(fadeStateOf(onDesk(when('2026-09-01')), now)).toBe('clear');
    const old = aTask(now, { daysOld: 30 });
    expect(fadeStateOf(reword(old, 'Call the bank', now.at - 2 * DAY_MS), now)).toBe('clear');
  });

  it('asks "Still yours?" once, about the longest untouched first', () => {
    const month = aTask(now, { daysOld: 30 }, 'month');
    const fortnight = aTask(now, { daysOld: 15 }, 'fortnight');

    expect(stillYoursToAsk([fortnight, month], now)?.id).toBe('month');

    const asked = askedStillYours(month, now);
    expect(fadeStateOf(asked, now)).toBe('asked');
    expect(stillYoursToAsk([fortnight, asked], now)?.id).toBe('fortnight');
    expect(stillYoursToAsk([asked], when(addDays(now.day, 10)))).toBeNull();
  });

  it('keeps an unanswered task on the board, faded: nothing goes without the user saying so', () => {
    const asked = askedStillYours(aTask(now, { daysOld: 30 }), now);

    expect(asked.status).toBe('board');
    expect(fadeStateOf(asked, when(addDays(now.day, 60)))).toBe('asked');
  });

  it('erases quietly on "no", and makes the task fresh on "yes"', () => {
    const asked = askedStillYours(aTask(now, { daysOld: 30 }), now);

    expect(answerStillYours(asked, 'no', now)).toMatchObject({ status: 'erased' });
    const kept = answerStillYours(asked, 'yes', now);
    expect(kept).toMatchObject({ status: 'board', lastTouched: now.at, stillYoursAskedAt: null });
    expect(fadeStateOf(kept, now)).toBe('clear');
    // A fortnight later it may fade, and be asked about, again.
    expect(fadeStateOf(kept, when(addDays(now.day, 14), '10:00'))).toBe('fading');
  });
});
