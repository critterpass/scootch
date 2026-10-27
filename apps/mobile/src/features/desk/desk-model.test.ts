import { describe, expect, it } from '@jest/globals';

import { MINUTE_MS, momentAt } from '@phusclass/domain/board';

import { openMigratedDatabase } from '../../data/test-database';
import { createBoardStore } from '../../state/board-store';
import { careActions } from '../care/care-actions';
import { memory } from '../care/care-memory';
import { careModeOf } from '../care/care-mode';

import { deskModel, withSlipOut } from './desk-model';

/** A board on a real database, a clock moved by hand, and the desk as the screen reads it. */
async function deskAt(start: string, name: string | null = 'Trần Minh Anh') {
  let at = Date.parse(start);
  let id = 0;
  const db = await openMigratedDatabase();
  memory.forget();
  const store = createBoardStore({
    db,
    clock: () => momentAt(at, 'UTC', 4),
    newId: () => `id-${(id += 1)}`,
  });
  await store.load();
  return {
    store,
    care: careActions(store, db),
    /** The desk as the screen draws it, with the care `useCareView` reads. */
    desk: (language: 'en' | 'vi' = 'en') =>
      deskModel({
        snapshot: store.getSnapshot(),
        language,
        name,
        care: careModeOf(store.getSnapshot(), memory.get()),
      }),
    wait: (minutes: number) => {
      at += minutes * MINUTE_MS;
      store.tick();
    },
  };
}

const morning = '2026-10-27T09:00:00Z';

describe('the fuse and his pressure', () => {
  it('burns the fuse over two minutes while his pose climbs the ladder', async () => {
    const { store, desk, wait } = await deskAt(morning);
    await store.say('Email the dentist to move Thursday');
    await store.screened('id-1', 'none');

    expect(desk()).toMatchObject({ mood: 'calm', pressure: 0, fuse: { left: 1 }, pulse: 'none' });
    wait(1);
    expect(desk().fuse?.left).toBeCloseTo(0.5);
    expect(desk().line?.moment).toBe('pressure0');

    wait(1);
    expect(desk()).toMatchObject({ mood: 'over', pressure: 1, fuse: { left: 0 } });
    wait(3);
    expect(desk()).toMatchObject({ mood: 'crossed', pressure: 2 });
    wait(5);
    expect(desk()).toMatchObject({ mood: 'ruler', pressure: 3, chalkThrow: false });
  });

  it('shouts the full name at 4, with the chalk thrown, and goes silent at 5', async () => {
    const { store, desk, wait } = await deskAt(morning);
    await store.say('Email the dentist');
    wait(20);
    expect(desk()).toMatchObject({ mood: 'name', pressure: 4, chalkThrow: true, glare: false });
    expect(desk().line?.text).toContain('TRẦN. MINH. ANH');
    expect(desk('vi').line?.text).toContain('TRẦN. MINH. ANH');

    wait(20);
    expect(desk()).toMatchObject({ mood: 'stare', pressure: 5, chalkThrow: false, glare: true });
    expect(desk().line?.text).toBe('...');
  });

  it('keeps Start still and the chalk in his hand while the late slip is out', async () => {
    const { store, desk, wait } = await deskAt(morning);
    await store.say('Email the dentist');
    wait(20);
    expect(desk()).toMatchObject({ pressure: 4, pulse: 'nudge', chalkThrow: true });

    expect(withSlipOut(desk(), 'en')).toMatchObject({
      mood: 'peer',
      pressure: 4,
      pulse: 'none',
      chalkThrow: false,
    });
  });

  it('keeps tapping the ruler at 4 when no name was given at roll call', async () => {
    const { store, desk, wait } = await deskAt(morning, null);
    await store.say('Email the dentist');
    wait(20);
    expect(desk().line?.moment).toBe('pressure3');
    expect(desk().chalkThrow).toBe(true);
  });

  it('says nothing about what an unscreened task is, only about the wait', async () => {
    const { store, desk, wait } = await deskAt(morning);
    await store.say('Email the dentist');
    for (const minutes of [0, 3, 3, 4, 10, 20]) {
      wait(minutes);
      expect(desk().line?.text ?? '').not.toContain('Email the dentist');
      expect(desk('vi').line?.text ?? '').not.toContain('Email the dentist');
    }
  });

  it('says why he picked it first, then waits', async () => {
    const { store, desk, wait } = await deskAt(morning);
    await store.say('Call the bank today');
    expect(desk().line?.moment).toBe('pickDueToday');
    wait(0.5);
    expect(desk().line?.moment).toBe('pressure0');
  });
});

describe('a heavy task on the desk', () => {
  it('has no fuse, pressure, thrown chalk, happening or late slip, and he is quiet', async () => {
    const { store, desk, wait } = await deskAt(morning);
    await store.say('Call the hospital about Dad’s results');
    wait(60);
    const model = desk();
    expect(model).toMatchObject({
      heavy: true,
      mood: 'serious',
      pressure: 0,
      fuse: null,
      pulse: 'none',
      chalkThrow: false,
      glare: false,
      canSlip: false,
      happening: null,
      chalk: { quiet: true, next: [], more: 0 },
    });
    expect(model.line?.moment).toBe('seriousCompany');
    expect(model.task?.tallies).toBe(0);
  });
});

describe('after the crisis screen is closed', () => {
  it('keeps plain company: no fuse, pressure, tally, chalk, happening, slip or joke', async () => {
    const { store, care, desk, wait } = await deskAt(morning);
    await store.say('Email the dentist. Buy stamps.');
    const dentist = store.getSnapshot().desk!.task.id;
    expect(store.getSnapshot().desk?.task.text).toBe('Email the dentist');
    await store.screened(dentist, 'none');
    await store.slip('Too tired', false);
    await store.swap(dentist);
    wait(20);
    expect(desk()).toMatchObject({ pressure: 4, chalkThrow: true, canSlip: true });
    expect(desk().task?.tallies).toBe(1);

    await store.say('I keep thinking about how to kill myself');
    await care.closeCrisis();
    wait(30);

    const model = desk();
    expect(model).toMatchObject({
      plain: true,
      heavy: false,
      pressure: 0,
      fuse: null,
      pulse: 'none',
      chalkThrow: false,
      glare: false,
      canSlip: false,
      happening: null,
      stillYours: null,
      task: { title: 'Email the dentist', tallies: 0, frontRow: false },
    });
    expect(model.line?.moment).toBe('crisisCompany');
    expect(desk('vi').line?.moment).toBe('crisisCompany');
    expect(model.chalk.main).toBe('Email the dentist');
  });

  it('keeps plain company on an empty desk, with nothing suspicious said', async () => {
    const { store, care, desk } = await deskAt(morning);
    await store.say('I want to end my life');
    await care.closeCrisis();
    for (const ranked of store.getSnapshot().board) await store.erase(ranked.task.id);
    expect(desk()).toMatchObject({ phase: 'empty', plain: true });
    expect(desk().line?.moment).toBe('crisisCompany');
  });
});

describe('the chalkboard and the empty desk', () => {
  it('shows today’s task, the next two and how many more', async () => {
    const { store, desk } = await deskAt(morning);
    await store.say(
      'Email the dentist. Renew passport. Tax receipts. Reply to Minh. Fix the bike light.',
    );
    const { chalk } = desk();
    expect(chalk.main).toBe(store.getSnapshot().desk?.task.text);
    expect(chalk.next).toHaveLength(2);
    expect(chalk.more).toBe(2);
  });

  it('is suspicious of an empty board', async () => {
    const { desk } = await deskAt(morning);
    expect(desk()).toMatchObject({ phase: 'empty', task: null, canSlip: false, fuse: null });
    expect(desk().line?.moment).toBe('emptyDesk');
  });
});
