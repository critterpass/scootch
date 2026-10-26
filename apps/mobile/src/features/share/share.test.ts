import { describe, expect, it } from '@jest/globals';

import { DAY_MS, MINUTE_MS, momentAt, newTask, type Task } from '@phusclass/domain/board';
import { checkClassLine, linePacks } from '@phusclass/voice/class';

import { writeSetting } from '../../data/settings-repository';
import { openMigratedDatabase } from '../../data/test-database';
import { createBoardStore } from '../../state/board-store';

import { cardCopy, TAPE_END, TAPE_START, waitedWords } from './share-copy';
import { loadShareOffer, STUDENT_NAME_SETTING } from './share-offer';
import { formatsFor, isCrisisDay, shareGuard, type ShareSubject } from './share-rules';

const morning = '2026-10-27T09:00:00Z';

/** A board on a real migrated database, with a clock the test moves by hand. */
async function classAt(start: string) {
  const db = await openMigratedDatabase();
  let at = Date.parse(start);
  let id = 0;
  const clock = () => momentAt(at, 'UTC', 4);
  const store = createBoardStore({ db, clock, newId: () => `task-${(id += 1)}` });
  await store.load();
  return {
    db,
    store,
    clock,
    wait: (minutes: number) => {
      at += minutes * MINUTE_MS;
      store.tick();
    },
    /** Starts the task on the desk, works on it, finishes it and returns its id. */
    finishDesk: async (minutes: number) => {
      const id = store.getSnapshot().desk?.task.id;
      await store.start();
      at += minutes * MINUTE_MS;
      await store.finish();
      return id ?? '';
    },
  };
}

describe('the share guard', () => {
  const done = { care: 'none', status: 'done' } as const;

  it('shares a plain finished task', () => {
    expect(shareGuard({ task: done, crisisDay: false })).toEqual({ allowed: true });
  });

  it('never offers a serious or crisis task', () => {
    for (const care of ['serious', 'crisis'] as const) {
      expect(shareGuard({ task: { ...done, care }, crisisDay: false })).toEqual({
        allowed: false,
        why: 'heavy task',
      });
    }
  });

  it('shares nothing at all on a crisis day, however plain the task', () => {
    expect(shareGuard({ task: done, crisisDay: true })).toEqual({
      allowed: false,
      why: 'crisis day',
    });
  });

  it('has nothing to share for a task that is not finished', () => {
    expect(shareGuard({ task: null, crisisDay: false })).toMatchObject({ why: 'not finished' });
    expect(shareGuard({ task: { care: 'none', status: 'desk' }, crisisDay: false })).toMatchObject({
      why: 'not finished',
    });
  });
});

describe('a crisis day', () => {
  const now = momentAt(Date.parse(morning), 'UTC', 4);
  const task = (over: Partial<Task>): Task => ({
    ...newTask({ id: 'a', text: 'Call the bank', at: now.at - 3 * DAY_MS }),
    ...over,
  });

  it('is the day the crisis screen was shown, even once it is closed', () => {
    expect(isCrisisDay({ tasks: [], crisisShownOn: now.day, now })).toBe(true);
    expect(isCrisisDay({ tasks: [], crisisShownOn: '2026-10-26', now })).toBe(false);
  });

  it('lasts while a crisis task is open, or was touched today', () => {
    expect(isCrisisDay({ tasks: [task({ care: 'crisis' })], crisisShownOn: null, now })).toBe(true);
    const finishedLastWeek = task({
      care: 'crisis',
      status: 'done',
      lastTouched: now.at - 2 * DAY_MS,
    });
    expect(isCrisisDay({ tasks: [finishedLastWeek], crisisShownOn: null, now })).toBe(false);
    expect(isCrisisDay({ tasks: [task({ care: 'serious' })], crisisShownOn: null, now })).toBe(
      false,
    );
  });
});

describe('what a finish is offered as', () => {
  it('offers the giấy khen only when the finish earned one', () => {
    expect(formatsFor({ giayKhen: false })).toEqual(['paper', 'note', 'desk']);
    expect(formatsFor({ giayKhen: true })).toEqual(['paper', 'certificate', 'note', 'desk']);
  });

  it('offers a finished task from the logbook, with the name from roll call', async () => {
    const { db, store, wait, clock, finishDesk } = await classAt(morning);
    await store.say('email the dentist');
    wait(9 * 24 * 60);
    await writeSetting(db, STUDENT_NAME_SETTING, 'Trần Minh Anh');
    const id = await finishDesk(11);

    const offer = await loadShareOffer(db, id, clock());

    expect(offer).toMatchObject({
      kind: 'ready',
      formats: ['paper', 'note', 'desk'],
      subject: {
        taskId: id,
        task: 'Email the dentist',
        waitedDays: 9,
        periodMinutes: expect.any(Number),
        name: 'Trần Minh Anh',
      },
    });
    if (offer.kind === 'ready') expect(offer.subject.carvings).toHaveLength(1);
  });

  it('offers nothing for a serious task', async () => {
    const { db, store, clock, finishDesk } = await classAt(morning);
    await store.say("arrange dad's funeral");
    const id = await finishDesk(20);

    expect(await loadShareOffer(db, id, clock())).toEqual({ kind: 'blocked', why: 'heavy task' });
  });

  it('offers nothing on a crisis day, and the next day the finish can be shared', async () => {
    const { db, store, clock, wait, finishDesk } = await classAt(morning);
    await store.say('call the bank');
    const id = await finishDesk(10);
    await store.say('I want to end my life');
    await store.closeCrisis();

    expect(await loadShareOffer(db, id, clock())).toEqual({ kind: 'blocked', why: 'crisis day' });

    // The crisis task is still on the board the next day, so that day is a crisis day too; once it
    // is erased and a day has turned, the earlier finish can be shared again.
    const crisis = store.getSnapshot().board.find(({ task }) => task.care === 'crisis');
    expect(crisis).toBeDefined();
    if (crisis !== undefined) await store.erase(crisis.task.id);
    wait(2 * 24 * 60);
    expect(await loadShareOffer(db, id, clock())).toMatchObject({ kind: 'ready' });
  });

  it('has nothing for a task that is not in the logbook', async () => {
    const { db, clock } = await classAt(morning);
    expect(await loadShareOffer(db, 'nobody', clock())).toEqual({
      kind: 'blocked',
      why: 'not finished',
    });
  });
});

describe('the words on the cards', () => {
  const subject: ShareSubject = {
    taskId: 'task-1',
    task: 'Email the dentist.',
    doneAt: Date.parse('2026-10-26T10:42:00Z'),
    day: '2026-10-26',
    periodMinutes: 11,
    comment: 'good',
    giayKhen: false,
    waitedDays: 9,
    name: 'Trần Minh Anh',
    carvings: [],
  };

  it('writes the test paper from the logbook entry', () => {
    const en = cardCopy(subject, 'en', false);
    expect(en.paper).toMatchObject({
      task: 'Email the dentist',
      work: ['It waited 9 days.', 'It took 11 minutes.'],
      comment: 'Good.',
      ten: false,
    });
    const vi = cardCopy(subject, 'vi', false);
    expect(vi.paper.work).toEqual(['Đã chờ 9 ngày.', 'Làm trong 11 phút.']);
    expect(vi.paper.comment).toBe(linePacks.vi.commentGood[0]);
  });

  it('draws the circled 10 with no words, and gives a tick no comment', () => {
    expect(cardCopy({ ...subject, comment: 'ten' }, 'en', false).paper).toMatchObject({
      comment: null,
      ten: true,
    });
    const tick = cardCopy({ ...subject, comment: null, periodMinutes: null }, 'en', false);
    expect(tick.paper).toMatchObject({
      comment: null,
      ten: false,
      work: ['It waited 9 days.', 'Done.'],
    });
  });

  it('writes the note home in his words, which pass his checks in both languages', () => {
    for (const language of ['en', 'vi'] as const) {
      const copy = cardCopy(subject, language, false);
      const waited = waitedWords(9, language);
      expect(copy.note.body).toContain('Trần Minh Anh');
      expect(copy.note.body).toContain('Email the dentist');
      expect(copy.note.body).toContain(waited);
      const own = copy.note.body
        .replace('Trần Minh Anh', '{name}')
        .replace('Email the dentist', '{task}')
        .replace(waited, '{waited}');
      // Two of his lines, one after the other: together they may run past one line's length.
      const reasons = checkClassLine(own, language).reasons.filter((r) => r !== 'too_long');
      expect(reasons).toEqual([]);
    }
    expect(waitedWords(9, 'en')).toBe('nine days');
    expect(waitedWords(1, 'en')).toBe('one day');
    expect(waitedWords(23, 'vi')).toBe('23 ngày');
    expect(waitedWords(9, 'vi')).toBe('chín ngày');
  });

  it('writes a task set and done the same day without counting', () => {
    const same = cardCopy({ ...subject, waitedDays: 0 }, 'en', false);
    expect(same.paper.work[0]).toBe('Set and done the same day.');
    expect(same.note.body).not.toMatch(/\d|zero/);
  });

  it('tapes over the task everywhere it is written, and nowhere else', () => {
    const copy = cardCopy(subject, 'en', true);
    const taped = `${TAPE_START}Email the dentist${TAPE_END}`;
    expect(copy.paper.task).toBe(taped);
    expect(copy.certificate.task).toBe(taped);
    expect(copy.note.body).toContain(taped);
    expect(copy.note.body.replace(taped, '')).not.toContain('Email the dentist');
  });

  it('writes the card for someone who gave no name', () => {
    const copy = cardCopy({ ...subject, name: null }, 'en', false);
    expect(copy.desk.title).toBe('My desk');
    expect(copy.note.body).toContain('my student');
  });
});
