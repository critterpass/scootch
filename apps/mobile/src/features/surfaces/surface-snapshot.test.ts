import { describe, expect, it } from '@jest/globals';

import type { TodayState } from '@scootch/domain';

import { defaultSettings } from '../../data/repositories/settings';

import {
  buildSurfaceSnapshot,
  type SurfaceSnapshotInput,
  type WaitingThing,
} from './surface-snapshot';
import { JOKES, PLAIN, monsterRow, seriousTask, sessionRow, taskRow } from './test/rows';
import sample from './test/snapshot-in-session.json';

const DAY_END = Date.parse('2026-10-07T03:00:00.000Z');
/** A waiting thing first mentioned on `since`, with its own monster. */
function waitingThing(id: string, name: string, since: string, task = {}): WaitingThing {
  return {
    task: taskRow({ id, text: `Thing ${id}`, firstMentionedOn: since, ...task }),
    monster: monsterRow({ id: `monster-${id}`, taskId: id, name }),
    image: `surface-monster-${id}.png`,
  };
}

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
    localDate: '2026-10-06',
    waiting: [],
    finish: 'holo',
    shelf: 42,
    latestCatch: null,
    caughtThisWeek: 3,
    worldImage: 'surface-world-0badf00d.png',
    worldNightImage: 'surface-world-0badf00d-asleep.png',
    carried: null,
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
    const made = snapshot(today, {
      waiting: [waitingThing('task-2', 'Receipt Goblin', '2026-09-28')],
      latestCatch: { name: 'Odd Sock', caughtAt: 1791290000000 },
    });
    expect(JSON.parse(JSON.stringify(made))).toEqual(sample);
    expect(made.sessionLines.every((line) => line.at > (made.sessionStartedAt ?? 0))).toBe(true);
    expect(made.sessionLines.every((line) => line.at < (made.sessionEndsAt ?? 0))).toBe(true);
  });

  it('carries the worn ink for the surfaces to tint with, and nothing for tomato', () => {
    const today: TodayState = { kind: 'nothing_yet', startsLeft: 1 };
    expect(snapshot(today).accent).toBeNull();
    expect(snapshot(today, { accent: '#34506E' }).accent).toBe('#34506E');
    // A crisis day keeps the person's own colours and nothing else of the day.
    expect(snapshot({ kind: 'crisis' }, { accent: '#34506E' }).accent).toBe('#34506E');
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

  it('carries no lurker and no latest catch on a crisis day', () => {
    const made = snapshot(
      { kind: 'crisis' },
      {
        waiting: [waitingThing('t2', 'Odd Sock', '2026-10-01')],
        latestCatch: { name: 'Odd Sock', caughtAt: DAY_END },
      },
    );
    expect(made.lurkers).toEqual([]);
    expect(made.latestCatch).toBeNull();
    expect(JSON.stringify(made)).not.toContain('Odd Sock');
  });
});

describe("tomorrow's one thing", () => {
  const resting: TodayState = { kind: 'done_for_today', startsLeft: 0 };
  const carried = (task = {}) => ({
    task: taskRow({ localDate: '2026-10-07', carriedOver: true, ...task }),
    monster: monsterRow(),
  });

  it('is nothing when no thing was carried on', () => {
    expect(snapshot(resting).tomorrow).toBeNull();
  });

  it("carries the thing, its monster's name, Scootch's line and the words for nine", () => {
    expect(snapshot(resting, { carried: carried() }).tomorrow).toEqual({
      taskId: 'task-1',
      task: 'Email the dentist',
      monsterName: 'Molar',
      line: "Molar's asleep too. Probably.",
      morning: JOKES.start,
    });
  });

  it('is plain words alone for a serious thing, which is never named at nine', () => {
    const serious = { screen: 'serious' as const, text: 'Open the hospital letter', lines: PLAIN };
    for (const seriousOverridden of [false, true]) {
      const made = snapshot(resting, { carried: carried({ ...serious, seriousOverridden }) });
      expect(made.tomorrow).toMatchObject({
        task: 'Open the hospital letter',
        monsterName: null,
        line: null,
      });
      expect(made.tomorrow?.morning).not.toContain('hospital');
    }
    const quiet = snapshot(resting, { carried: carried(serious) }).tomorrow;
    expect(Object.values(JOKES).flat()).not.toContain(quiet?.morning);
  });

  it('has no monster to name before one has hatched', () => {
    const made = snapshot(resting, { carried: { ...carried(), monster: null } });
    expect(made.tomorrow).toMatchObject({ monsterName: null, line: null });
  });

  it('is not carried on a crisis day', () => {
    const made = snapshot({ kind: 'crisis' }, { carried: carried() });
    expect(made.tomorrow).toBeNull();
    expect(JSON.stringify(made)).not.toContain('dentist');
  });

  it('carries the world by day and asleep, and the catches of this week', () => {
    expect(snapshot(resting)).toMatchObject({
      caughtThisWeek: 3,
      worldImage: 'surface-world-0badf00d.png',
      worldNightImage: 'surface-world-0badf00d-asleep.png',
    });
  });
});

describe('lurkers in the snapshot', () => {
  const today: TodayState = { kind: 'nothing_yet', startsLeft: 1 };

  it('lists the waiting monsters oldest first with the day each is on and its size', () => {
    const made = snapshot(today, {
      localDate: '2026-10-07',
      waiting: [
        waitingThing('a', 'Molar', '2026-10-05'),
        waitingThing('b', 'Receipt Goblin', '2026-09-29'),
        waitingThing('c', 'Odd Sock', '2026-10-07'),
      ],
    });
    expect(made.lurkers.map((one) => [one.name, one.day])).toEqual([
      ['Receipt Goblin', 9],
      ['Molar', 3],
      ['Odd Sock', 1],
    ]);
    expect(made.lurkers[0]).toMatchObject({
      taskId: 'b',
      task: 'Thing b',
      size: 1,
      image: 'surface-monster-b.png',
    });
    expect(made.lurkers[2]?.size).toBeCloseTo(0.4);
  });

  it('shows four at most', () => {
    const waiting = ['a', 'b', 'c', 'd', 'e'].map((id, index) =>
      waitingThing(id, `M${id}`, `2026-10-0${index + 1}`),
    );
    const made = snapshot(today, { waiting });
    expect(made.lurkers.map((one) => one.taskId)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('never shows a serious thing as a lurker, even after "it is fine, be funny"', () => {
    const made = snapshot(today, {
      waiting: [
        waitingThing('s', 'Never', '2026-09-01', { screen: 'serious', lines: PLAIN }),
        waitingThing('o', 'Nor This', '2026-09-01', {
          screen: 'serious',
          seriousOverridden: true,
          lines: PLAIN,
        }),
        waitingThing('u', 'Not Yet', '2026-09-01', { screen: 'unscreened', lines: null }),
        waitingThing('a', 'Molar', '2026-10-06'),
      ],
    });
    expect(made.lurkers.map((one) => one.name)).toEqual(['Molar']);
  });

  it('leaves out a thing that is finished and a monster that is caught', () => {
    const caught = waitingThing('c', 'Caught', '2026-10-01');
    const made = snapshot(today, {
      waiting: [
        waitingThing('f', 'Finished', '2026-10-01', { status: 'finished' }),
        { ...caught, monster: { ...caught.monster, caughtAt: '2026-10-06T10:00:00.000Z' } },
      ],
    });
    expect(made.lurkers).toEqual([]);
  });

  it("gives each lurker its own task's words for every state of a hunt", () => {
    const made = snapshot(today, { waiting: [waitingThing('a', 'Molar', '2026-10-06')] });
    expect(made.lurkers[0]?.lines).toEqual({
      start: JOKES.start,
      working: JOKES.working,
      stuck: JOKES.tinyNextStep,
      firstLine: null,
      lastMinutes: JOKES.twoMinutesLeft,
      overtime: JOKES.timeUp,
      caught: JOKES.caught,
      stoppedEarly: JOKES.notFinished,
    });
  });
});

describe("the one thing's words for a hunt", () => {
  it('offers the smaller step as the first line when the task has one', () => {
    const lines = { ...JOKES, tinierNextSteps: ['Type "Hi".'] };
    const made = snapshot({ kind: 'task_set', task: taskRow({ lines }), startsLeft: 1 });
    expect(made.taskId).toBe('task-1');
    expect(made.taskLines).toMatchObject({ stuck: JOKES.tinyNextStep, firstLine: 'Type "Hi".' });
  });

  it('are only plain words for a serious task', () => {
    const made = snapshot({ kind: 'serious', task: seriousTask(), session: null });
    const said = Object.values(made.taskLines ?? {}).flat();
    const plain: readonly (string | null)[] = [...Object.values(PLAIN).flat(), null];
    for (const text of said) expect(plain).toContain(text);
    expect(made.taskLines?.stuck).toBe(PLAIN.tinyNextStep);
  });

  it('carries the worn finish, the shelf and the latest catch', () => {
    const latestCatch = { name: 'Odd Sock', caughtAt: DAY_END - 7_200_000 };
    const made = snapshot({ kind: 'done_for_today', startsLeft: 0 }, { latestCatch });
    expect(made).toMatchObject({ finish: 'holo', shelf: 42, latestCatch, bites: [] });
  });

  it("carries the bites of each lurker's monster, with the ones already gone", () => {
    const bites = [
      { text: "Find the dentist's email.", minutes: 1 },
      { text: 'Write two lines.', minutes: 4 },
      { text: 'Hit send.', minutes: 1 },
    ];
    const task = { lines: { ...JOKES, bites }, bitesCaught: [0] };
    const made = snapshot(
      { kind: 'nothing_yet', startsLeft: 1 },
      {
        waiting: [
          waitingThing('a', 'Molar', '2026-10-06', task),
          waitingThing('b', 'Odd Sock', '2026-10-06'),
        ],
      },
    );
    expect(made.bites).toEqual([
      { id: 'a:0', taskId: 'a', text: bites[0]?.text, minutes: 1, caught: true },
      { id: 'a:1', taskId: 'a', text: 'Write two lines.', minutes: 4, caught: false },
      { id: 'a:2', taskId: 'a', text: 'Hit send.', minutes: 1, caught: false },
    ]);
  });
});
