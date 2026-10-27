import { describe, expect, it } from '@jest/globals';

import { DAY_MS, MINUTE_MS, momentAt } from '@phusclass/domain/board';

import { openMigratedDatabase, type TestDatabase } from '../data/test-database';

import { createBoardStore, type BoardStore } from './board-store';

/** A board on a real migrated database, with a clock the test moves by hand. */
async function boardAt(start: string, db?: TestDatabase) {
  const database = db ?? (await openMigratedDatabase());
  let at = Date.parse(start);
  let id = 0;
  const store = createBoardStore({
    db: database,
    clock: () => momentAt(at, 'UTC', 4),
    newId: () => `id-${(id += 1)}`,
  });
  await store.load();
  return {
    store,
    db: database,
    view: () => store.getSnapshot(),
    /** Moves the clock on and takes a new reading. */
    wait: (minutes: number) => {
      at += minutes * MINUTE_MS;
      store.tick();
    },
  };
}

const morning = '2026-10-27T09:00:00Z';

function deskText(store: BoardStore): string | undefined {
  return store.getSnapshot().desk?.task.text;
}

describe('saying things', () => {
  it('puts every task heard on the board, and his pick on the empty desk', async () => {
    const { store, view } = await boardAt(morning);
    expect(view().phase).toBe('empty');

    const heard = await store.say(
      'I need to buy milk and email the landlord by Friday, the dentist at three',
    );

    expect(heard.map((task) => task.text)).toEqual([
      'Buy milk',
      'Email the landlord',
      'The dentist',
    ]);
    expect(view().phase).toBe('waiting');
    // A time today makes it due today, so it comes first.
    expect(view().desk).toMatchObject({ reason: 'due today', task: { text: 'The dentist' } });
    expect(view().board.map(({ task }) => task.text)).toEqual([
      'The dentist',
      'Buy milk',
      'Email the landlord',
    ]);
    expect(view().chalkboard).toMatchObject({ today: { text: 'The dentist' }, more: 0 });
    expect(view().minutesFree).toBe(345);
  });
});

describe('the desk', () => {
  it('burns the fuse and raises the pressure as the clock runs, and the drum stops both', async () => {
    const { store, view, wait } = await boardAt(morning);
    await store.say('call the bank');
    expect(view().desk).toMatchObject({ pressure: 0, fuse: { burnt: 0 } });

    wait(1);
    expect(view().desk?.fuse?.burnt).toBe(0.5);
    wait(5);
    expect(view().desk).toMatchObject({ pressure: 2, fuse: { burnt: 1 } });
    await store.openDesk();
    expect(view().desk).toMatchObject({ pressure: 2, fuse: { burnt: 0 } });

    const session = await store.start();
    expect(session?.minutes).toBe(10);
    expect(view()).toMatchObject({ phase: 'running', desk: { pressure: 0, fuse: null } });
    wait(10);
    expect(view().phase).toBe('time up');
  });

  it('finishes with a comment and a carving, offers recess, and brings the next task after it', async () => {
    const { store, view, wait } = await boardAt(morning);
    await store.say('call the bank. buy stamps.');
    await store.start();
    wait(10);

    const finish = await store.finish();

    expect(finish?.comment).toBe('good');
    expect(view()).toMatchObject({ phase: 'finished', recessOffered: true, desk: null });
    expect(view().logbook).toMatchObject([{ text: 'Call the bank', periodMinutes: 10 }]);
    expect(view().carvings).toHaveLength(1);

    await store.takeRecess();
    expect(view()).toMatchObject({ phase: 'recess', recess: { leftMs: 5 * MINUTE_MS } });
    wait(5);
    expect(view().phase).toBe('finished');
    await store.next();
    expect(deskText(store)).toBe('Buy stamps');
  });

  it('ends class in time to get ready for a time heard today', async () => {
    const { store } = await boardAt('2026-10-27T14:30:00Z');
    await store.say('the dentist at three');

    expect((await store.start(25))?.minutes).toBe(15);
  });

  it('gives a period the length set in settings, kept through a restart', async () => {
    const { store, view, db } = await boardAt(morning);
    expect(view().periodLength).toBe(10);
    await store.setPeriodLength(25);
    await store.say('call the bank');

    expect((await store.start())?.minutes).toBe(25);
    const again = await boardAt('2026-10-27T09:01:00Z', db);
    expect(again.view().periodLength).toBe(25);
    // A length the settings do not offer is ten minutes.
    await again.store.setPeriodLength(7);
    expect(again.view().periodLength).toBe(10);
  });

  it('keeps a pop quiz at fifteen minutes whatever length is set, and has none in plain company', async () => {
    // The happening is fixed by the task and when it came to the desk: find a pop-quiz morning.
    const sitting = async (minute: number) => {
      const c = await boardAt(new Date(Date.parse(morning) + minute * MINUTE_MS).toISOString());
      await c.store.setPeriodLength(25);
      await c.store.say('call the bank');
      return c;
    };
    let minute = 0;
    while (minute < 24 * 60 && (await sitting(minute)).view().desk?.happening !== 'pop quiz') {
      minute += 1;
    }
    expect(minute).toBeLessThan(24 * 60);

    const quiz = await sitting(minute);
    expect(await quiz.store.start()).toMatchObject({ minutes: 15, happening: 'pop quiz' });
    const plain = await sitting(minute);
    expect(await plain.store.start(undefined, { plain: true })).toMatchObject({
      minutes: 25,
      happening: null,
    });
  });

  it('keeps the drum on unless it is turned off', async () => {
    const { store, view, db } = await boardAt(morning);
    expect(view().drum).toBe(true);
    await store.setDrum(false);
    expect((await boardAt(morning, db)).view().drum).toBe(false);
  });

  it('allows a swap, and the task that was there goes back unchanged', async () => {
    const { store, view } = await boardAt(morning);
    await store.say('call the bank. buy stamps.');
    const stamps = view().board.find(({ task }) => task.text === 'Buy stamps')!.task;

    await store.swap(stamps.id);

    expect(view().desk).toMatchObject({ reason: 'swapped', task: { text: 'Buy stamps' } });
    expect(view().board.find(({ task }) => task.text === 'Call the bank')?.task.status).toBe(
      'board',
    );
  });
});

describe('not yet, and late slips', () => {
  it('gives partial credit three ways', async () => {
    const { store, view, wait } = await boardAt(morning);
    await store.say('write the essay. call the bank.');
    await store.start();
    wait(10);

    await store.partial('another period');
    expect(view()).toMatchObject({ phase: 'running', session: { minutes: 10 } });
    wait(10);
    await store.partial('back on board', 'start from the intro');
    const essay = view().board.find(({ task }) => task.text === 'Write the essay')!.task;
    expect(essay).toMatchObject({ status: 'board', partialNote: 'start from the intro' });
    // The task that just came off is not put straight back.
    expect(deskText(store)).toBe('Call the bank');

    await store.start();
    await store.partial('erase');
    expect(view().board.map(({ task }) => task.text)).toEqual(['Write the essay']);
  });

  it('grades a slip, accepts a real reason, and gives the front row at the fifth tally', async () => {
    const { store, view } = await boardAt(morning);
    await store.say('do the taxes');
    const taxes = view().desk!.task.id;

    expect(await store.slip('real hospital visit', true)).toBe('accepted');
    const outcomes = [];
    for (let slip = 0; slip < 5; slip += 1) {
      await store.swap(taxes);
      outcomes.push(await store.slip('later', false));
    }

    expect(outcomes).toEqual(['graded', 'graded', 'graded', 'graded', 'front row']);
    await store.swap(taxes);
    expect(view().desk).toMatchObject({ tallies: 5, frontRow: true, pressure: 2 });
  });
});

describe('care', () => {
  it('opens the crisis screen for a crisis phrase, hides the board, and brings it back plain', async () => {
    const { store, view } = await boardAt(morning);
    await store.say('call the bank');

    await store.say("I can't do this any more, I want to kill myself");

    expect(view()).toMatchObject({ phase: 'crisis', desk: null, board: [], heavyToday: true });
    await store.closeCrisis();
    expect(view().phase).toBe('waiting');
    const flagged = view().board.filter(({ task }) => task.care === 'crisis');
    expect(flagged.length).toBeGreaterThan(0);
  });

  it('opens the crisis screen when the server calls a crisis, and keeps it through a restart', async () => {
    const { store, view, db } = await boardAt(morning);
    await store.say('call the bank. sort my things out before I go');
    const task = view().board.find(
      ({ task: one }) => one.text === 'Sort my things out before I go',
    );
    expect(view().phase).toBe('waiting');

    await store.raiseCrisis(task!.task.id);

    expect(view()).toMatchObject({ phase: 'crisis', desk: null, board: [], heavyToday: true });
    const again = await boardAt('2026-10-27T09:05:00Z', db);
    expect(again.view().phase).toBe('crisis');
    await again.store.closeCrisis();
    const flagged = again.view().board.find(({ task: one }) => one.id === task!.task.id)?.task;
    expect(flagged).toMatchObject({ care: 'crisis', screened: true });
    expect(again.view().tuitionNotice).toBe(false);
  });

  it('keeps a heavy task free of the fuse, pressure, tallies and happenings', async () => {
    const { store, view, wait } = await boardAt(morning);
    await store.say("arrange dad's funeral");

    expect(view().desk).toMatchObject({ heavy: true, fuse: null, happening: null, pressure: 0 });
    wait(60);
    expect(view().desk?.pressure).toBe(0);
    expect(await store.slip('not today', false)).toBe('quiet');
    expect(view().board[0]?.task.slips).toEqual([]);
  });

  it('ends the crisis screen with the day, which turns at four in the morning', async () => {
    const { store, view, wait } = await boardAt('2026-10-27T22:00:00Z');
    await store.say('I want to end my life');
    wait(5 * 60);
    expect(view()).toMatchObject({ phase: 'crisis', now: { day: '2026-10-27' } });
    wait(60);
    expect(view().now.day).toBe('2026-10-28');
    expect(view().phase).not.toBe('crisis');
  });
});

describe('the board over days', () => {
  it('keeps everything through a restart', async () => {
    const first = await boardAt(morning);
    await first.store.say('call the bank. buy stamps.');
    await first.store.start();
    first.wait(10);
    await first.store.finish();

    const again = await boardAt('2026-10-27T09:30:00Z', first.db);

    expect(again.view().logbook).toEqual(first.view().logbook);
    expect(again.view().carvings).toEqual(first.view().carvings);
    expect(again.view().desk?.task.text).toBe('Buy stamps');
  });

  it('asks "Still yours?" once about a task untouched for two weeks', async () => {
    const { store, view, wait } = await boardAt(morning);
    await store.say('call the bank. sort the attic.');
    const attic = view().board.find(({ task }) => task.text === 'Sort the attic')!.task;
    wait((15 * DAY_MS) / MINUTE_MS);

    expect(view().stillYours?.id).toBe(attic.id);
    await store.stillYoursAsked(attic.id);
    expect(view().stillYours).toBeNull();
    await store.answerStillYours(attic.id, 'no');
    expect(view().board.map(({ task }) => task.text)).toEqual(['Call the bank']);
  });

  it('remarks on a long board once a day', async () => {
    const { store, view } = await boardAt(morning);
    await store.say(Array.from({ length: 13 }, (_, n) => `call person ${n + 1}.`).join(' '));

    expect(view().longBoard).toBe(true);
    await store.longBoardRemarked();
    expect(view().longBoard).toBe(false);
  });

  it('pins the tuition notice at the recess after the third finish, and not on a heavy day', async () => {
    const { store, view, wait } = await boardAt(morning);
    await store.say('one task to call. buy two things. email three people.');
    for (let finish = 0; finish < 3; finish += 1) {
      await store.next();
      await store.start();
      wait(10);
      await store.finish();
      await store.takeRecess();
      expect(view().tuitionNotice).toBe(finish === 2);
    }
    await store.tuitionPinned();
    expect(view().tuitionNotice).toBe(false);

    const heavy = await boardAt(morning);
    await heavy.store.say("call the bank. buy stamps. post the letter. arrange dad's funeral.");
    for (let finish = 0; finish < 3; finish += 1) {
      await heavy.store.next();
      expect(heavy.view().desk?.heavy).toBe(false);
      await heavy.store.start();
      heavy.wait(10);
      await heavy.store.finish();
      await heavy.store.takeRecess();
    }
    expect(heavy.view()).toMatchObject({ phase: 'recess', heavyToday: true, tuitionNotice: false });
  });

  it('erases and ticks quietly, and the desk takes the next pick', async () => {
    const { store, view } = await boardAt(morning);
    await store.say('call the bank. buy stamps. post the letter.');

    await store.erase(view().desk!.task.id);
    expect(deskText(store)).toBe('Buy stamps');
    await store.tickOff(view().desk!.task.id);
    expect(deskText(store)).toBe('Post the letter');
    expect(view().logbook).toMatchObject([
      { text: 'Buy stamps', periodMinutes: null, comment: null },
    ]);
    expect(view().carvings).toEqual([]);
  });
});
