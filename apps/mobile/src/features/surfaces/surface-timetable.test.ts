import { describe, expect, it } from '@jest/globals';

import { MINUTE_MS, momentAt } from '@phusclass/domain/board';

import { openMigratedDatabase } from '../../data/test-database';
import { createBoardStore } from '../../state/board-store';
import { schoolDay } from '../timetable/periods';

import { midnightOf, surfaceTimetableOf } from './surface-timetable';

const event = (id: string, from: string, to: string) => {
  const minutes = (clock: string) => {
    const [hour = 0, minute = 0] = clock.split(':').map(Number);
    return hour * 60 + minute;
  };
  return { id, title: id, start: minutes(from), end: minutes(to), allDay: false, location: null };
};

async function boardAt(start: string) {
  const db = await openMigratedDatabase();
  const at = Date.parse(start);
  let id = 0;
  const store = createBoardStore({
    db,
    clock: () => momentAt(at, 'UTC', 4),
    newId: () => `id-${(id += 1)}`,
  });
  await store.load();
  return store;
}

describe("the widgets' timetable", () => {
  it('is the timetable rules for today, as instants, with the next free period and his pick', async () => {
    const store = await boardAt('2026-10-27T09:10:00Z');
    await store.say('call the bank');
    const board = store.getSnapshot();
    const midnight = midnightOf(board.now);
    expect(midnight).toBe(Date.parse('2026-10-27T00:00:00Z'));

    const day = schoolDay([event('Maths', '08:00', '08:30'), event('History', '10:00', '11:00')]);
    const timetable = surfaceTimetableOf(day, board, midnight);
    const at = (clock: string) => Date.parse(`2026-10-27T${clock}:00Z`);

    expect(timetable.blocks).toEqual([
      { start: at('08:00'), end: at('08:30') },
      { start: at('10:00'), end: at('11:00') },
    ]);
    // The school day runs from seven to five, and recess splits it at noon.
    expect(timetable.free).toEqual([
      { start: at('07:00'), end: at('08:00') },
      { start: at('08:30'), end: at('10:00') },
      { start: at('11:00'), end: at('12:00') },
      { start: at('12:00'), end: at('17:00') },
    ]);
    // The free period has begun: it is counted from now.
    expect(timetable.nextFree).toEqual({
      start: at('09:10'),
      end: at('10:00'),
      task: 'Call the bank',
    });
    expect(timetable.nextFree?.end).toBe(midnight + 600 * MINUTE_MS);
  });

  it('names no task for a free period on a heavy one', async () => {
    const store = await boardAt('2026-10-27T09:10:00Z');
    await store.say('get the biopsy results from the hospital');
    const board = store.getSnapshot();
    const timetable = surfaceTimetableOf(schoolDay([]), board, midnightOf(board.now));
    expect(timetable.nextFree).toMatchObject({ task: null });
  });
});
