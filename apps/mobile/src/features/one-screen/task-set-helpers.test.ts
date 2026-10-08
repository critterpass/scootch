import { describe, expect, it } from '@jest/globals';

import { JOKES, PLAIN, taskRow } from '../surfaces/test/rows';

import { biteRows, bitesNote, endsAtClock, takesGuess } from './task-set-helpers';

const bites = [
  { text: 'Open his last email', minutes: 1 },
  { text: 'Write two lines: can we move Thursday?', minutes: 3 },
  { text: 'Press send', minutes: 1 },
];
const lines = { ...JOKES, bites };
const noteOf = (bitesCaught: number[]) =>
  bitesNote(biteRows(taskRow({ lines, bitesCaught })) ?? []);

describe('a serious task on the set task', () => {
  it('takes no guess and opens no bites, even after "it is fine, be funny"', () => {
    for (const seriousOverridden of [false, true]) {
      const task = taskRow({ screen: 'serious', seriousOverridden, lines: PLAIN });
      expect(takesGuess(task)).toBe(false);
      expect(biteRows(task)).toBeNull();
      // Its pack never carries bites; one that somehow did still opens none.
      expect(biteRows({ ...task, lines })).toBeNull();
    }
  });

  it('is told apart by the stored flag alone: an ordinary and an unscreened task take a guess', () => {
    expect(takesGuess(taskRow())).toBe(true);
    expect(takesGuess(taskRow({ screen: 'unscreened', lines: null }))).toBe(true);
  });
});

describe('the bites on request', () => {
  it('are none when the pack has none', () => {
    expect(biteRows(taskRow())).toBeNull();
    expect(biteRows(taskRow({ screen: 'unscreened', lines: null }))).toBeNull();
  });

  it('are the three in order, with their minutes, and the last one opens the catch', () => {
    expect(biteRows(taskRow({ lines, bitesCaught: [0] }))).toEqual([
      { place: 0, text: bites[0]?.text, minutes: 1, ticked: true, opensCatch: false },
      { place: 1, text: bites[1]?.text, minutes: 3, ticked: false, opensCatch: false },
      { place: 2, text: bites[2]?.text, minutes: 1, ticked: false, opensCatch: true },
    ]);
  });

  it('say the catch of whichever bite is the only one left', () => {
    const rows = biteRows(taskRow({ lines, bitesCaught: [0, 2] })) ?? [];
    expect(rows.map((row) => row.opensCatch)).toEqual([false, true, false]);
  });

  it('put a line the person left for this sitting first, untimed', () => {
    const nextStart = { text: 'Find the thread from March', writtenOn: '2026-10-05' as const };
    const rows = biteRows(taskRow({ lines, nextStart })) ?? [];
    expect(rows[0]).toMatchObject({ text: nextStart.text, minutes: null });
    expect(rows.slice(1).map((row) => row.text)).toEqual([bites[1]?.text, bites[2]?.text]);
  });

  it('are noted by how many are down, and by the catch opening once all are', () => {
    expect(noteOf([])).toEqual({ key: 'bites.note.first' });
    expect(noteOf([1])).toEqual({ key: 'bites.note.down', count: 1 });
    expect(noteOf([0, 1])).toEqual({ key: 'bites.note.down', count: 2 });
    expect(noteOf([0, 1, 2])).toEqual({ key: 'bites.note.opening' });
  });
});

describe('when a length would end', () => {
  const at = Date.parse('2026-10-06T14:32:00.000Z');

  it('is the clock time that many minutes on, where the person is', () => {
    expect(endsAtClock(at, 10, 'Europe/London')).toBe('15:42');
    expect(endsAtClock(at, 25, 'Asia/Saigon')).toBe('21:57');
  });

  it('moves with the length, and drops a leading nought', () => {
    expect(endsAtClock(at, 50, 'Europe/London')).toBe('16:22');
    expect(endsAtClock(at, 10, 'America/New_York')).toBe('10:42');
    expect(endsAtClock(Date.parse('2026-10-06T07:55:00.000Z'), 10, 'Europe/London')).toBe('9:05');
  });
});
