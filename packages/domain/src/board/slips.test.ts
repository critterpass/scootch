import { describe, expect, it } from 'vitest';

import { erase } from './actions';
import { LONG_BOARD_OVER, longBoardRemark } from './long-board';
import { addDays } from './moment';
import { lateSlip } from './slips';
import { isFrontRow, talliesOf } from './task';
import { aTask, onDesk, when } from './testing';

const now = when('2026-10-27', '10:00');

describe('a late slip', () => {
  it('is graded, sends the task back on the board and adds a tally', () => {
    const { task, outcome } = lateSlip(
      onDesk(now),
      { reason: ' too tired ', accepted: false },
      now.at,
    );

    expect(outcome).toBe('graded');
    expect(task).toMatchObject({ status: 'board', desk: null, lastTouched: now.at });
    expect(task.slips).toEqual([{ reason: 'too tired', accepted: false, at: now.at }]);
    expect(talliesOf(task)).toBe(1);
  });

  it('with a real reason is accepted and adds no tally', () => {
    const { task, outcome } = lateSlip(onDesk(now), { reason: 'hospital', accepted: true }, now.at);

    expect(outcome).toBe('accepted');
    expect(talliesOf(task)).toBe(0);
    expect(task.slips).toHaveLength(1);
  });

  it('earns the front row on the fifth tally, once, and nothing else changes', () => {
    let task = onDesk(now, { tallies: 3, accepted: 2 });
    const outcomes: string[] = [];
    for (let slip = 0; slip < 3; slip += 1) {
      const result = lateSlip(task, { reason: 'later', accepted: false }, now.at + slip);
      outcomes.push(result.outcome);
      task = result.task;
    }

    expect(outcomes).toEqual(['graded', 'front row', 'graded']);
    expect(talliesOf(task)).toBe(6);
    expect(isFrontRow(task)).toBe(true);
    expect(task.status).toBe('board');
  });

  it('is never recorded on a serious or crisis task', () => {
    for (const care of ['serious', 'crisis'] as const) {
      const { task, outcome } = lateSlip(
        onDesk(now, {}, care),
        { reason: 'not today', accepted: false },
        now.at,
      );
      expect(outcome).toBe('quiet');
      expect(task.slips).toEqual([]);
      expect(task.status).toBe('board');
    }
  });

  it('never shows tallies or the front row on a heavy task, whatever it carried before', () => {
    const carried = aTask(now, { tallies: 6, care: 'serious' });

    expect(talliesOf(carried)).toBe(0);
    expect(isFrontRow(carried)).toBe(false);
  });
});

describe('erasing', () => {
  it('rubs the task off quietly: no outcome, no slip', () => {
    const task = erase(onDesk(now), now.at);

    expect(task).toMatchObject({ status: 'erased', desk: null, slips: [] });
  });
});

describe('the long board', () => {
  const board = (count: number, over = {}) => Array.from({ length: count }, () => aTask(now, over));

  it(`is remarked on when more than ${LONG_BOARD_OVER} tasks are open, once a day`, () => {
    expect(longBoardRemark(board(LONG_BOARD_OVER), now.day, null)).toBeNull();
    expect(longBoardRemark(board(LONG_BOARD_OVER + 1), now.day, null)).toBe('long board');
    expect(longBoardRemark(board(20), now.day, now.day)).toBeNull();
    expect(longBoardRemark(board(20), now.day, addDays(now.day, -1))).toBe('long board');
  });

  it('counts only open tasks', () => {
    const tasks = [...board(LONG_BOARD_OVER), ...board(5, { status: 'done' })];

    expect(longBoardRemark(tasks, now.day, null)).toBeNull();
  });

  it('says nothing while a crisis task is on the board or a heavy task is on the desk', () => {
    const many = board(LONG_BOARD_OVER + 3);

    expect(longBoardRemark([...many, aTask(now, { care: 'crisis' })], now.day, null)).toBeNull();
    expect(longBoardRemark([...many, onDesk(now, {}, 'serious')], now.day, null)).toBeNull();
    expect(longBoardRemark([...many, aTask(now, { care: 'serious' })], now.day, null)).toBe(
      'long board',
    );
  });
});
