import { describe, expect, it } from '@jest/globals';

import { durationSeconds, peak } from '@scootch/sound';

import { fixtureBars, fixtureMonsters, fixtureTask } from '../reveal/registry/keep-fixtures';

import { barSound, litInstruments, weekClip, weekTrack } from './record-audio';
import { weekShareOffered, weekView } from './record-week';

const monsters = fixtureMonsters(7);
const tasks = new Map(monsters.map((monster, index) => [monster.taskId, fixtureTask(index)]));

function view(barCount: number, todayPosition: number | null, weekRecords = []) {
  return weekView({
    week: '2026-W41',
    bars: fixtureBars(barCount),
    monsters,
    tasks,
    weekRecords,
    todayPosition,
  });
}

describe("the week's record", () => {
  it('lists a partial week: two bars, their instruments and tasks, and the day it waits for', () => {
    const week = view(2, 3);
    expect(week.barCount).toBe(2);
    expect(week.full).toBe(false);
    expect(week.rows.map((row) => [row.position, row.instrument])).toEqual([
      [1, 'keys'],
      [2, 'bassline'],
    ]);
    expect(week.rows.map((row) => row.taskText)).toEqual([
      'Email the dentist about Thursday',
      'Reply to Sam',
    ]);
    expect(week.waitingFor).toEqual({ position: 3, instrument: 'marimba' });
    expect(week.name).toBeNull();
    expect(week.weekNumber).toBe(41);
  });

  it('lists a full week as a full band that waits for nothing', () => {
    const week = view(7, 7);
    expect(week.barCount).toBe(7);
    expect(week.full).toBe(true);
    expect(week.rows.map((row) => row.instrument)).toEqual([
      'keys',
      'bassline',
      'marimba',
      'drums',
      'whistle',
      'bells',
      'choir',
    ]);
    expect(week.waitingFor).toBeNull();
  });

  it('lists only what was earned: a day with no bar has no row', () => {
    const bars = fixtureBars(5).filter((bar) => bar.position !== 2 && bar.position !== 4);
    const week = weekView({
      week: '2026-W41',
      bars,
      monsters,
      tasks,
      weekRecords: [],
      todayPosition: 6,
    });
    expect(week.rows.map((row) => row.position)).toEqual([1, 3, 5]);
    expect(week.waitingFor?.position).toBe(6);
  });

  it('uses the stored name and liner note when the week has them', () => {
    const stored = [
      { week: '2026-W41', name: 'Molar and the Bin Bags', linerNote: 'A note.', sentence: null },
    ];
    expect(view(2, 3, stored as never)).toMatchObject({
      name: 'Molar and the Bin Bags',
      linerNote: 'A note.',
    });
  });

  it('names no task on a serious day, and offers no sharing for a week of only those', () => {
    const quiet = fixtureBars(1).map((bar) => ({ ...bar, monsterId: null }));
    const week = weekView({
      week: '2026-W41',
      bars: quiet,
      monsters,
      tasks,
      weekRecords: [],
      todayPosition: 1,
    });
    expect(week.rows[0]).toMatchObject({ monster: null, taskText: null });
    expect(weekShareOffered(week)).toBe(false);
    expect(weekShareOffered(view(2, 3))).toBe(true);
  });
});

// Composing audio is real work, and CI runners are slower than a laptop.
const AUDIO_BUDGET_MS = 60_000;

describe("the record's audio", () => {
  it(
    'plays a week of one bar: a smaller band, and real sound',
    () => {
      const track = weekTrack(view(1, 1).rows);
      expect(track.bars.map((bar) => bar.instrument)).toEqual(['keys']);
      expect(track.left.length).toBeGreaterThan(0);
      expect(peak(track)).toBeGreaterThan(0.01);
      expect(litInstruments(track, 0.1)).toEqual(['keys']);

      const bar = barSound(view(1, 1).rows[0]!);
      expect(bar.left.length).toBeGreaterThan(0);
      expect(peak(bar)).toBeGreaterThan(0.01);

      const shared = weekClip(track);
      expect(durationSeconds(shared)).toBeCloseTo(15, 3);
      expect(peak(shared)).toBeGreaterThan(0.01);
    },
    AUDIO_BUDGET_MS,
  );

  it('lights each row as its instrument joins, then the whole band', () => {
    const track = { sections: weekTrackSections() };
    expect(litInstruments(track, 0)).toEqual(['keys']);
    expect(litInstruments(track, 2)).toEqual(['bassline']);
    expect(litInstruments(track, 4)).toEqual(['keys', 'bassline']);
    expect(litInstruments(track, -1)).toEqual([]);
  });
});

function weekTrackSections() {
  return [
    { kind: 'entrance', startSeconds: 0, instruments: ['keys'] },
    { kind: 'entrance', startSeconds: 1.76, instruments: ['keys', 'bassline'] },
    { kind: 'together', startSeconds: 3.52, instruments: ['keys', 'bassline'] },
    { kind: 'ending', startSeconds: 5.28, instruments: ['keys', 'bassline'] },
  ] as const;
}

describe('what a day of the week caught', () => {
  it('lists everything caught that day in the order it was caught, and nothing from other days', () => {
    const [first, second] = monsters;
    if (!first?.caughtOn || !second) throw new Error('the fixtures are caught');
    // A second thing caught on the first monster's day, later than it.
    const later = {
      ...second,
      id: 'later-the-same-day',
      caughtOn: first.caughtOn,
      caughtAt: `${first.caughtOn}T23:00:00.000Z`,
    };
    const week = weekView({
      week: '2026-W41',
      bars: fixtureBars(2),
      monsters: [later, ...monsters],
      tasks,
      weekRecords: [],
      todayPosition: 3,
    });
    const day = week.rows.find((row) => row.monster?.id === first.id);
    expect(day?.caught.map((one) => one.id)).toEqual([first.id, later.id]);
    expect(day?.caught[0]).toMatchObject({ name: first.name, taskText: day?.taskText });
    for (const row of week.rows) {
      expect(row.caught.every((one) => one.id !== second.id || row.monster?.id === second.id)).toBe(
        true,
      );
    }
  });
});
