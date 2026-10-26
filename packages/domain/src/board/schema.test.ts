import { describe, expect, it } from 'vitest';

import { lateSlip } from './slips';
import { finishTask, startPeriod } from './period';
import {
  BOARD_SCHEMA,
  carvingFromRow,
  carvingToRow,
  logbookRowOf,
  taskFromRows,
  taskToRow,
  type SlipRow,
} from './schema';
import type { Task } from './task';
import { aTask, onDesk, when } from './testing';

const now = when('2026-10-27', '10:00');

function slipRows(task: Task): SlipRow[] {
  return task.slips.map((slip, index) => ({
    id: index + 1,
    task_id: task.id,
    reason: slip.reason,
    accepted: slip.accepted ? 1 : 0,
    at: slip.at,
  }));
}

describe('the board tables', () => {
  it('names every table the app keeps', () => {
    const tables = BOARD_SCHEMA.map((sql) => /CREATE TABLE IF NOT EXISTS (\w+)/.exec(sql)?.[1])
      .filter((name) => name !== undefined)
      .sort();

    expect(tables).toEqual(['carvings', 'kv', 'logbook', 'sessions', 'settings', 'slips', 'tasks']);
  });

  it('keeps a task whole through its rows, on the board, on the desk and done', () => {
    const waiting = lateSlip(
      aTask(now, { daysOld: 2, heardTime: { day: now.day, at: '15:00' }, dueDate: '2026-10-30' }),
      { reason: 'bus', accepted: false },
      now.at,
    ).task;
    const running = startPeriod(onDesk(now, { tallies: 1, accepted: 1 }), now.at + 1000);
    const finished = finishTask(running, when('2026-10-27', '10:30'), 10).task;

    for (const task of [waiting, running, finished]) {
      const back = taskFromRows(taskToRow(task), [...slipRows(task)].reverse(), logbookRowOf(task));
      expect(back).toEqual(task);
    }
  });

  it('keeps a carving whole', () => {
    const carving = { taskId: 'a', kind: 'heart' as const, x: 0.25, y: 0.5, turn: -12, at: now.at };

    expect(carvingFromRow(carvingToRow(carving))).toEqual(carving);
  });
});
