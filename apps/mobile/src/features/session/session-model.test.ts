import { describe, expect, it } from '@jest/globals';

import { MINUTE_MS, momentAt } from '@phusclass/domain/board';

import { openMigratedDatabase, type TestDatabase } from '../../data/test-database';
import { createBoardStore } from '../../state/board-store';

import { clockText, sessionClock } from './session-model';

/** The phone's clock, moved by hand, shared by every launch of the app on one database. */
function phone(start: string) {
  let at = Date.parse(start);
  let id = 0;
  return {
    clock: () => momentAt(at, 'UTC', 4),
    newId: () => `id-${(id += 1)}`,
    pass: (minutes: number) => {
      at += minutes * MINUTE_MS;
    },
  };
}

async function launch(db: TestDatabase, device: ReturnType<typeof phone>) {
  const store = createBoardStore({ db, clock: device.clock, newId: device.newId });
  await store.load();
  return store;
}

describe('a running period', () => {
  it('keeps counting while the app is away, and the drum is due when it comes back', async () => {
    const db = await openMigratedDatabase();
    const device = phone('2026-10-27T09:00:00Z');
    const first = await launch(db, device);
    await first.say('Email the dentist');
    await first.start();
    expect(sessionClock(first.getSnapshot())).toMatchObject({
      left: '10:00',
      minutes: 10,
      timeUp: false,
      inTime: true,
    });

    // Locked in a pocket for four minutes: nothing ticks, the clock still moves.
    device.pass(4);
    first.tick();
    expect(sessionClock(first.getSnapshot())).toMatchObject({ left: '6:00', timeUp: false });

    // Closed and opened again: the period is read back from the phone's database.
    device.pass(3.5);
    const second = await launch(db, device);
    expect(second.getSnapshot().phase).toBe('running');
    expect(sessionClock(second.getSnapshot())).toMatchObject({ left: '2:30', tookMinutes: 8 });

    device.pass(5);
    second.tick();
    expect(second.getSnapshot().phase).toBe('time up');
    expect(sessionClock(second.getSnapshot())).toMatchObject({
      left: '0:00',
      timeUp: true,
      gone: 1,
    });
  });

  it('is fifteen minutes on a pop-quiz day, and a start after the fuse is not in time', async () => {
    const db = await openMigratedDatabase();
    const device = phone('2026-10-27T09:00:00Z');
    const store = await launch(db, device);
    await store.say('Email the dentist');
    device.pass(3);
    store.tick();
    const happening = store.getSnapshot().desk?.happening;
    await store.start();
    const clock = sessionClock(store.getSnapshot());
    expect(clock?.minutes).toBe(happening === 'pop quiz' ? 15 : 10);
    expect(clock?.inTime).toBe(false);
  });
});

describe('clockText', () => {
  it('rounds up to the second and never shows below zero', () => {
    expect(clockText(599_001)).toBe('10:00');
    expect(clockText(61_000)).toBe('1:01');
    expect(clockText(-5)).toBe('0:00');
  });
});
