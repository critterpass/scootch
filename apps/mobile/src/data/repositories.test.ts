import { describe, expect, it } from '@jest/globals';

import {
  DAY_MS,
  carvingToRow,
  finishTask,
  lateSlip,
  logbookRowOf,
  momentAt,
  newTask,
  startPeriod,
  swapOntoDesk,
  taskToRow,
  type Carving,
  type Task,
} from '@phusclass/domain/board';

import { addCarving, readCarvings } from './carvings-repository';
import { readKv, readKvNumber, writeKv } from './kv-repository';
import { readLogbook } from './logbook-repository';
import { endSession, readOpenSession, readSessionsFor, startSession } from './sessions-repository';
import { readSetting, writeSetting } from './settings-repository';
import { readSlips } from './slips-repository';
import { readTasks, writeTask, writeTasks } from './tasks-repository';
import { openMigratedDatabase } from './test-database';

const now = momentAt(Date.parse('2026-10-27T09:00:00Z'), 'UTC', 4);

function said(id: string, text = `Task ${id}`): Task {
  return newTask({ id, text, at: now.at });
}

describe('the board tables, as migrated', () => {
  it('have exactly the columns the board rows carry', async () => {
    const db = await openMigratedDatabase();
    const columns = (table: string) => db.column(`SELECT name FROM pragma_table_info('${table}')`);
    const done = finishTask(
      startPeriod(swapOntoDesk([said('a')], 'a', now.at)[0]!, now.at),
      now,
      10,
    );

    expect(columns('tasks')).toEqual(Object.keys(taskToRow(said('a'))));
    expect(columns('logbook')).toEqual(Object.keys(logbookRowOf(done.task) ?? {}));
    expect(columns('carvings')).toEqual(Object.keys(carvingToRow(done.carving)));
    expect(columns('slips')).toEqual(['id', 'task_id', 'reason', 'accepted', 'at']);
    expect(columns('sessions')).toEqual([
      'id',
      'task_id',
      'started_at',
      'minutes',
      'inside_fuse',
      'happening',
      'ended_at',
      'outcome',
    ]);
    expect(columns('kv')).toEqual(['key', 'value', 'updated_at']);
    expect(columns('settings')).toEqual(['key', 'value']);
  });
});

describe('the tasks repository', () => {
  it('reads back every task whole: on the board, on the desk with slips, and done', async () => {
    const db = await openMigratedDatabase();
    const waiting = {
      ...said('w'),
      dueDate: '2026-10-30',
      heardTime: { day: now.day, at: '15:00' },
    };
    const [desk] = swapOntoDesk([said('d')], 'd', now.at);
    const slipped = lateSlip(desk!, { reason: 'bus', accepted: false }, now.at + 1).task;
    const excused = lateSlip(slipped, { reason: 'hospital', accepted: true }, now.at + 2).task;
    const done = finishTask(
      startPeriod(swapOntoDesk([said('f')], 'f', now.at)[0]!, now.at),
      now,
      10,
    ).task;

    await writeTasks(db, [waiting, excused, done]);

    // Said at the same moment, they come back in id order.
    expect(await readTasks(db, now.at)).toEqual([excused, done, waiting]);
    expect(await readLogbook(db)).toEqual([logbookRowOf(done)]);
  });

  it('adds only the slips it has not stored, so writing twice never doubles them', async () => {
    const db = await openMigratedDatabase();
    const once = lateSlip(said('s'), { reason: 'rain', accepted: false }, now.at).task;
    await writeTask(db, once);
    await writeTask(db, once);
    const twice = lateSlip(once, { reason: 'tired', accepted: false }, now.at + 1).task;
    await writeTask(db, twice);

    expect((await readSlips(db, ['s'])).map((slip) => slip.reason)).toEqual(['rain', 'tired']);
  });

  it('leaves out tasks erased more than two days ago, and keeps recent ones', async () => {
    const db = await openMigratedDatabase();
    await writeTasks(db, [
      { ...said('old'), status: 'erased', lastTouched: now.at - 3 * DAY_MS },
      { ...said('recent'), status: 'erased', lastTouched: now.at - DAY_MS },
      said('open'),
    ]);

    expect((await readTasks(db, now.at)).map((task) => task.id)).toEqual(['open', 'recent']);
  });

  it('rolls a whole write back when one task cannot be written', async () => {
    const db = await openMigratedDatabase();
    const broken = { ...said('bad'), status: 'lost' } as unknown as Task;

    await expect(writeTasks(db, [said('fine'), broken])).rejects.toThrow();
    expect(await readTasks(db, now.at)).toEqual([]);
  });
});

describe('sessions, carvings, settings and kv', () => {
  it('keep a period from the drum to its ending, ending it only once', async () => {
    const db = await openMigratedDatabase();
    await writeTask(db, said('t'));
    const period = {
      id: 'p1',
      task_id: 't',
      started_at: now.at,
      minutes: 15,
      inside_fuse: 1 as const,
      happening: 'pop quiz' as const,
    };
    await startSession(db, period);

    expect(await readOpenSession(db)).toEqual({ ...period, ended_at: null, outcome: null });
    await endSession(db, 'p1', now.at + 1000, 'done');
    await endSession(db, 'p1', now.at + 2000, 'slipped');
    expect(await readOpenSession(db)).toBeNull();
    expect(await readSessionsFor(db, 't')).toEqual([
      { ...period, ended_at: now.at + 1000, outcome: 'done' },
    ]);
  });

  it('never change or lose a carving', async () => {
    const db = await openMigratedDatabase();
    const heart: Carving = { taskId: 'a', kind: 'heart', x: 0.2, y: 0.4, turn: 12, at: now.at };
    await addCarving(db, heart);
    await addCarving(db, { ...heart, kind: 'carved ten' });
    await addCarving(db, { ...heart, taskId: 'b', at: now.at + 1 });

    expect(await readCarvings(db)).toEqual([heart, { ...heart, taskId: 'b', at: now.at + 1 }]);
  });

  it('keep settings as JSON and the board’s own values as text', async () => {
    const db = await openMigratedDatabase();
    await writeSetting(db, 'phu.birthday', '03-14');
    expect(await readSetting(db, 'phu.birthday')).toBe('03-14');
    await writeSetting(db, 'phu.birthday', null);
    expect(await readSetting(db, 'phu.birthday')).toBeNull();

    expect(await readKvNumber(db, 'board.finishes', 0)).toBe(0);
    await writeKv(db, 'board.finishes', '3', now.at);
    await writeKv(db, 'board.finishes', '4', now.at + 1);
    expect(await readKvNumber(db, 'board.finishes', 0)).toBe(4);
    expect(await readKv(db, 'nothing')).toBeNull();
  });
});
