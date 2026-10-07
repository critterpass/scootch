import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { DAY_MS, startRefused, type TaskCreateStartResponse } from '@scootch/domain';
import { languages, t } from '@scootch/i18n';
import { noTaskLine } from '@scootch/voice';

import crisisFixture from '../../../../../packages/voice/fixtures/task.create.crisis.en.json';
import seriousFixture from '../../../../../packages/voice/fixtures/task.create.serious.en.json';
import type { DayStore } from '../../state/day-store';
import { MORNING, stagedPhone, stagedServer } from '../../state/test/staged-phone';

import {
  RETURN_CHIPS,
  chargeNoteShows,
  holdsWords,
  homeStarts,
  stageOf,
  type Stage,
} from './one-screen-stage';

const stage = (store: DayStore, energyAsked = false): Stage =>
  stageOf({ ...store.getState(), energyAsked });

describe('the one screen, from the day', () => {
  it('walks an ordinary ramble through the one thing and the hatch to the set task', async () => {
    const app = await stagedPhone(stagedServer());
    expect(stage(app.store)).toMatchObject({
      kind: 'home',
      rested: false,
      startLeft: true,
      returning: false,
    });
    expect(app.store.getState().energyNeeded).toBe(true);
    expect(stage(app.store, true).kind).toBe('energy');

    await app.say();
    expect(app.store.getState().energyNeeded).toBe(false);
    expect(stage(app.store)).toMatchObject({ kind: 'one_thing', quiet: false, another: true });
    await app.store.dispatch({ type: 'one_thing_picked' });
    expect(stage(app.store)).toMatchObject({ kind: 'hatch', shrunk: false, canShrink: true });
    await app.store.dispatch({ type: 'monster_met' });
    expect(stage(app.store)).toMatchObject({ kind: 'task_set', quiet: false, carried: false });
  });

  it('is home again after a finish: resting, with the composer there for the next thing', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say('ring the bank', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    await app.store.dispatch({ type: 'session', event: { type: 'double_tapped' } });
    await app.store.dispatch({ type: 'session_closed' });

    expect(app.store.getState().today.kind).toBe('done_for_today');
    expect(stage(app.store)).toMatchObject({
      kind: 'home',
      rested: true,
      startLeft: true,
      returning: false,
      waiting: null,
    });
    // Words held for the battery question can still be answered for there.
    expect(stage(app.store, true).kind).toBe('energy');
  });

  it('puts a set task down from the task set: its words wait in the drawer and home is back', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say('ring the bank', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    expect(stage(app.store).kind).toBe('task_set');
    const words = app.task().originalText;

    await app.store.dispatch({ type: 'task_set_aside' });
    expect(stage(app.store)).toMatchObject({ kind: 'home', rested: false, startLeft: true });
    expect(app.store.getState().drawer.items.map((item) => item.text)).toContain(words);
    expect(app.data.count('tasks') + app.data.count('monsters')).toBe(0);
  });

  it('never shows the battery question beside a task: held words are let go of instead', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say();
    const shown = stage(app.store, true);
    expect(shown.kind).toBe('one_thing');
    expect(holdsWords(shown)).toBe(false);
    expect(holdsWords({ kind: 'energy' })).toBe(true);
  });

  it('gives a serious task plain words: no reveal, no hatch and no monster at any step', async () => {
    const server = stagedServer({ start: seriousFixture.response as TaskCreateStartResponse });
    const app = await stagedPhone(server);
    await app.say(seriousFixture.request.text);

    // It is not offered or revealed: its own quiet screen is shown at once.
    const offered = stage(app.store);
    expect(offered).toMatchObject({ kind: 'task_set', quiet: true, monster: null });
    expect(server.lineCalls).toBe(0);
    // Its only words are the plain pack the call wrote for it.
    expect(app.task().lines).toEqual(seriousFixture.response.lines);

    await app.store.dispatch({ type: 'one_thing_picked' });
    expect(stage(app.store)).toMatchObject({ kind: 'task_set', quiet: true, monster: null });
    await app.store.dispatch({ type: 'too_big' });
    expect(stage(app.store).kind).toBe('task_set');
    expect(app.store.getState().monster).toBeNull();
    expect(app.data.count('monsters')).toBe(0);
  });

  it('shows nothing of its own on a crisis day', async () => {
    const server = stagedServer({ start: crisisFixture.response as TaskCreateStartResponse });
    const app = await stagedPhone(server);
    await app.say('writing letters and finding a home for the cat');
    expect(stage(app.store)).toEqual({ kind: 'care' });
    expect(stage(app.store, true)).toEqual({ kind: 'care' });
    expect(app.data.count('tasks')).toBe(0);
  });

  it('brings yesterday’s task back a size smaller, and sets it aside when it is put down', async () => {
    const first = await stagedPhone(stagedServer());
    await first.say();
    await first.store.dispatch({ type: 'session_set', minutes: 10 });
    await first.store.dispatch({ type: 'session', event: { type: 'started' } });
    first.time.advanceTo(MORNING + 10 * 60_000);
    await first.store.dispatch({ type: 'session', event: { type: 'not_finished' } });
    await first.store.dispatch({ type: 'session', event: { type: 'chose_carry_on' } });

    const next = await stagedPhone(stagedServer(), first.data, MORNING + DAY_MS);
    const shown = stage(next.store);
    expect(shown).toMatchObject({ kind: 'task_set', carried: true });
    expect(shown.kind === 'task_set' && shown.monster?.sizeFactor).toBeLessThan(1);

    const carried = next.task().originalText;
    await next.store.dispatch({ type: 'task_set_aside' });
    expect(stage(next.store).kind).toBe('home');
    expect(next.store.getState().drawer.items.map((item) => item.text)).toContain(carried);
  });
});

describe('back after a long while', () => {
  /** Every word the return state can show: Scootch's line at each attitude, and the chips. */
  const words = languages.flatMap((language) => [
    ...(['soft', 'cheeky', 'unhinged'] as const).map((attitude) =>
      noTaskLine(language, attitude, 'waiting'),
    ),
    ...RETURN_CHIPS.map((chip) => t(language, chip.label)),
    t(language, 'morning.chip.hint'),
  ]);

  it('asks for the smallest thing and holds nothing that counts the time away', async () => {
    const first = await stagedPhone(stagedServer());
    await first.say();
    const back = await stagedPhone(stagedServer(), first.data, MORNING + 30 * DAY_MS);

    const shown = stage(back.store);
    expect(shown).toMatchObject({ kind: 'home', returning: true });
    expect(JSON.stringify({ shown, morning: back.store.getState().morning })).not.toMatch(
      /30|days?|away|gap|since/i,
    );
  });

  it('says no number and none of the words that are never said', () => {
    for (const said of words) {
      expect(said).not.toMatch(/\d/);
      expect(said).not.toMatch(
        /\b(failed|lazy|behind|missed|again|finally|streak|days?|weeks?)\b/i,
      );
      expect(said).not.toMatch(/\b(ngày|tuần|tháng|bỏ lỡ|lười|chuỗi)\b/i);
    }
  });
});

describe('the trial-ends-tomorrow note', () => {
  it('sits on home, and never beside a task or a pick', () => {
    expect(chargeNoteShows('composer')).toBe(true);
    expect(chargeNoteShows('task_set')).toBe(false);
    expect(chargeNoteShows('panel')).toBe(false);
    expect(chargeNoteShows('quiet')).toBe(false);
    // The session's screens are their own route and never draw it.
    const session = readdirSync(path.resolve(__dirname, '../session'), { recursive: true })
      .map(String)
      .filter((file) => /\.tsx$/.test(file))
      .map((file) => readFileSync(path.resolve(__dirname, '../session', file), 'utf8'));
    expect(session.length).toBeGreaterThan(8);
    expect(session.filter((source) => /ChargeNote|trialEndsTomorrow/.test(source))).toEqual([]);
  });
});

describe('the composer on home, with no start left today', () => {
  it('stays open while a start is left, whoever is asking', () => {
    for (const plus of [false, true]) {
      for (const selling of [false, true]) {
        expect(homeStarts({ startLeft: true, plus, selling })).toBe('open');
      }
    }
  });

  it('locks only for a free phone on a day where selling is allowed', () => {
    expect(homeStarts({ startLeft: false, plus: false, selling: true })).toBe('locked');
  });

  it('is spent, and leads nowhere, on Plus and beside anything heavy', () => {
    expect(homeStarts({ startLeft: false, plus: true, selling: true })).toBe('spent');
    expect(homeStarts({ startLeft: false, plus: true, selling: false })).toBe('spent');
    expect(homeStarts({ startLeft: false, plus: false, selling: false })).toBe('spent');
  });
});

describe('Start, with no start left today', () => {
  it('is refused for a task that has not been started, and for nothing else', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say('ring the bank', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    const { today } = app.store.getState();
    if (today.kind !== 'task_set') throw new Error('a task is set');
    expect(startRefused(today)).toBe(false);
    expect(startRefused({ ...today, startsLeft: 0 })).toBe(true);
    // A task already started today has used its start and may be picked up.
    const started = { ...today.task, status: 'started' as const };
    expect(startRefused({ ...today, task: started, startsLeft: 0 })).toBe(false);
    expect(startRefused({ kind: 'nothing_yet', startsLeft: 0 })).toBe(false);
  });
});
