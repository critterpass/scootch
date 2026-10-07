import { describe, expect, it } from '@jest/globals';

import type { TodayState } from '@scootch/domain';

import { defaultSettings } from '../../data/repositories/settings';

import { buildSurfaceSnapshot, type SurfaceSnapshotInput } from './surface-snapshot';
import { JOKES, PLAIN, monsterRow, seriousTask, sessionRow, taskRow } from './test/rows';
import sample from './test/snapshot-in-session.json';

const DAY_END = Date.parse('2026-10-07T03:00:00.000Z');

function snapshot(today: TodayState, changes: Partial<SurfaceSnapshotInput> = {}) {
  return buildSurfaceSnapshot({
    today,
    settings: defaultSettings('en'),
    monster: monsterRow(),
    monsterImage: 'surface-monster-00c0ffee.png',
    shownLine: null,
    weekBars: 3,
    worldThings: 8,
    plus: false,
    dayEndsAt: DAY_END,
    ...changes,
  });
}

describe('the shared snapshot', () => {
  it('has nothing of a task before one is set', () => {
    const made = snapshot({ kind: 'nothing_yet', startsLeft: 1 }, { monster: null });
    expect(made).toMatchObject({ state: 'nothing_yet', task: null, monsterName: null });
    expect(made.sessionEndsAt).toBeNull();
    expect(made.line).toBeTruthy();
  });

  it('carries the one thing, its monster and its hatch line once a task is set', () => {
    const made = snapshot({ kind: 'task_set', task: taskRow(), startsLeft: 1 });
    expect(made).toMatchObject({
      state: 'task_set',
      task: 'Email the dentist',
      monsterName: 'Molar',
      monsterImage: 'surface-monster-00c0ffee.png',
      line: JOKES.hatch,
      sessionEndsAt: null,
      sessionLines: [],
    });
  });

  it('carries the end of a running session and the lines it turns to, as the sample Swift decodes', () => {
    const today: TodayState = { kind: 'in_session', task: taskRow(), session: sessionRow() };
    const made = snapshot(today);
    expect(JSON.parse(JSON.stringify(made))).toEqual(sample);
    expect(made.sessionLines.every((line) => line.at > (made.sessionStartedAt ?? 0))).toBe(true);
    expect(made.sessionLines.every((line) => line.at < (made.sessionEndsAt ?? 0))).toBe(true);
  });

  it('carries the worn ink for the surfaces to tint with, and nothing for tomato', () => {
    const today: TodayState = { kind: 'nothing_yet', startsLeft: 1 };
    expect(snapshot(today).accent).toBeNull();
    expect(snapshot(today, { accent: '#34506E' }).accent).toBe('#34506E');
    // A crisis day keeps the person's own colours and nothing else of the day.
    expect(snapshot({ kind: 'crisis' }, { accent: '#34506E' }).accent).toBe(
      '#34506E',
    );
  });

  it('shows the line the screen is showing while a session runs', () => {
    const today: TodayState = { kind: 'in_session', task: taskRow(), session: sessionRow() };
    expect(snapshot(today, { shownLine: JOKES.twoMinutesLeft }).line).toBe(JOKES.twoMinutesLeft);
  });

  it('is done for today with no task', () => {
    const made = snapshot({ kind: 'done_for_today', startsLeft: 0 }, { monster: null });
    expect(made).toMatchObject({ state: 'done', task: null, monsterName: null, weekBars: 3 });
  });

  it('gives a serious task no monster and only its plain words, set or running', () => {
    const jokes = Object.values(JOKES).flat();
    for (const session of [null, sessionRow()]) {
      const made = snapshot({ kind: 'serious', task: seriousTask(), session });
      expect(made.state).toBe('serious');
      expect(made.task).toBe('Open the hospital letter');
      expect(made.monsterName).toBeNull();
      expect(made.monsterImage).toBeNull();
      const said = [made.line, ...made.sessionLines.map((line) => line.text)];
      for (const text of said) {
        expect(jokes).not.toContain(text);
        expect([...Object.values(PLAIN).flat(), null]).toContain(text);
      }
      expect(made.sessionEndsAt === null).toBe(session === null);
    }
  });

  it('carries no task text, monster, line or session on a crisis day', () => {
    const made = snapshot({ kind: 'crisis' });
    expect(made).toMatchObject({
      state: 'crisis',
      task: null,
      monsterName: null,
      monsterImage: null,
      line: null,
      sessionStartedAt: null,
      sessionEndsAt: null,
      sessionLines: [],
    });
    expect(JSON.stringify(made)).not.toContain('dentist');
  });
});
