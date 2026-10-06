import { describe, expect, it } from '@jest/globals';

import { DAY_MS, type TaskCreateStartResponse } from '@scootch/domain';
import { languages, t } from '@scootch/i18n';
import { noTaskLine } from '@scootch/voice';

import crisisFixture from '../../../../../packages/voice/fixtures/task.create.crisis.en.json';
import seriousFixture from '../../../../../packages/voice/fixtures/task.create.serious.en.json';
import type { DayStore } from '../../state/day-store';
import { MORNING, stagedPhone, stagedServer } from '../../state/test/staged-phone';

import { RETURN_CHIPS, stageOf, type Stage } from './one-screen-stage';

const stage = (store: DayStore, energyAsked = false): Stage =>
  stageOf({ ...store.getState(), energyAsked });

describe('the one screen, from the day', () => {
  it('walks an ordinary ramble through the one thing and the hatch to the set task', async () => {
    const app = await stagedPhone(stagedServer());
    expect(stage(app.store)).toMatchObject({ kind: 'composer', returning: false });
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

  it('gives a serious task plain words: no reveal, no hatch and no monster at any step', async () => {
    const server = stagedServer({ start: seriousFixture.response as TaskCreateStartResponse });
    const app = await stagedPhone(server);
    await app.say(seriousFixture.request.text);

    const offered = stage(app.store);
    expect(offered).toMatchObject({ kind: 'one_thing', quiet: true, reveal: null });
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

  it('brings yesterday’s task back a size smaller, and sets it aside on "Something else"', async () => {
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
    await next.store.dispatch({ type: 'carried_task_set_aside' });
    expect(stage(next.store).kind).toBe('composer');
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
    expect(shown).toMatchObject({ kind: 'composer', returning: true });
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
