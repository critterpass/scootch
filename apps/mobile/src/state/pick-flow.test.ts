import { describe, expect, it } from '@jest/globals';

import type { TaskLinesAnswer } from '../api/scootch-api';

import { MONSTER_SIZE_STEPS } from './smaller';
import { recordedLines, recordedStart, stagedPhone, stagedServer } from './test/staged-phone';

if (recordedStart.verdict !== 'pass') throw new Error('the recorded first stage is a pass');
const start = recordedStart;

describe('the staged task call', () => {
  it('shows the one thing from stage one, and takes the pick, before stage two has answered', async () => {
    let answer: (lines: TaskLinesAnswer) => void = () => undefined;
    const server = stagedServer({
      lines: () => new Promise<TaskLinesAnswer>((resolve) => (answer = resolve)),
    });
    const app = await stagedPhone(server);
    const sent = app.say();

    await app.until(
      () => app.store.getState().taskCall === 'idle' && 'task' in app.store.getState().today,
    );
    const offered = app.store.getState();
    expect(app.task().text).toBe(start.oneThing.text);
    expect(offered.pick).toMatchObject({ kind: 'offered' });
    expect(offered.pick.kind === 'offered' && offered.pick.reveal?.phrases).toContain(
      start.oneThing.text,
    );
    expect(offered.monster).toBeNull();
    expect(offered.taskCall).toBe('idle');

    // The pick does not wait for the monster's words: the hatch starts with them still on the way.
    void app.store.dispatch({ type: 'one_thing_picked' });
    await app.until(() => app.store.getState().pick.kind === 'hatching');
    expect(app.store.getState().monster).toBeNull();
    expect(server.lineCalls).toBe(1);

    answer(recordedLines);
    await sent;
    expect(app.store.getState().monster).toMatchObject({ name: recordedLines.monster.name });
    // The cue's own words ride with the stored lines, so a cue saved later can use them.
    expect(app.task().lines).toEqual({
      ...recordedLines.lines,
      cueNotification: recordedLines.cueNotification,
    });
    expect(server.startCalls).toBe(1);
    expect(server.lineCalls).toBe(1);
  });

  it('leaves a usable task with a plain monster name when stage two fails', async () => {
    const app = await stagedPhone(stagedServer({ lines: () => Promise.reject(new Error('down')) }));
    await app.say();

    const { monster, monsterPending } = app.store.getState();
    expect(monster?.name).toMatch(/\S, \S/);
    expect(monster?.name).not.toBe(recordedLines.monster.name);
    expect(monsterPending).toBe(false);
    expect(app.task()).toMatchObject({ text: start.oneThing.text, screen: 'pass', lines: null });

    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'monster_met' });
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    expect(app.store.getState().today.kind).toBe('in_session');
  });

  it('takes a name that arrives without the line pack', async () => {
    const app = await stagedPhone(
      stagedServer({ lines: () => Promise.resolve({ monster: recordedLines.monster }) }),
    );
    await app.say();
    expect(app.store.getState().monster?.name).toBe(recordedLines.monster.name);
    expect(app.task().lines).toBeNull();
  });

  it('falls back with no connection: the typed text as the one thing, nothing else on offer', async () => {
    const server = stagedServer({ online: false });
    const app = await stagedPhone(server);
    await app.say('email the dentist about tuesday', 'typed');

    expect(server.startCalls).toBe(0);
    expect(app.task()).toMatchObject({ text: 'email the dentist about tuesday', lines: null });
    expect(app.store.getState()).toMatchObject({
      monster: null,
      pick: { kind: 'offered', reveal: null },
    });
    // No monster, so there is no hatch: the pick lands on the set task.
    await app.store.dispatch({ type: 'one_thing_picked' });
    expect(app.store.getState().pick).toEqual({ kind: 'none' });
  });
});

describe('the drawer', () => {
  it('opens only on the pull, whatever else happens to it', async () => {
    const app = await stagedPhone(stagedServer());
    const open = () => app.store.getState().drawer.open;
    await app.say();
    expect(open()).toBe(false);
    await app.store.dispatch({ type: 'pick_for_me' });
    for (const type of [
      'things_parked',
      'deadline_heard',
      'item_returned',
      'app_opened',
    ] as const) {
      await app.store.dispatch({ type: 'drawer', event: { type } });
    }
    expect(open()).toBe(false);

    await app.store.dispatch({ type: 'drawer', event: { type: 'pulled' } });
    expect(open()).toBe(true);

    // Swapping in closes it, and the thing it replaced is parked in its place.
    const before = app.task().text;
    const [item] = app.store.getState().drawer.items;
    if (!item) throw new Error('nothing was parked');
    await app.store.dispatch({ type: 'drawer_item_swapped_in', itemId: item.id });
    expect(open()).toBe(false);
    expect(app.task()).toMatchObject({ text: item.text, source: 'drawer' });
    expect(app.store.getState().drawer.items.map((one) => one.text)).toContain(before);
  });

  it('swaps a heard date in for today, or leaves it parked for its day', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say();
    const [deadline] = start.deadlines;
    if (!deadline) throw new Error('the recorded call heard a date');
    expect(app.store.getState().heardDeadlines).toEqual(start.deadlines);
    const parkedDated = app.store
      .getState()
      .drawer.items.find((item) => item.text === deadline.text);
    expect(parkedDated?.returnOn).not.toBeNull();

    await app.store.dispatch({ type: 'deadline_answered', text: deadline.text, choice: 'today' });
    expect(app.store.getState().heardDeadlines).toEqual([]);
    expect(app.task()).toMatchObject({ text: deadline.text, dueDate: deadline.dueDate });
  });
});

describe('the ask only gets smaller', () => {
  it('makes the task and its monster smaller on "too big", and never bigger', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say();
    await app.store.dispatch({ type: 'one_thing_picked' });
    const original = app.task().text;
    const size = () => app.store.getState().monster?.spec.size ?? Number.NaN;
    const sizes = [size()];
    const texts = [original];

    for (let tap = 0; tap < MONSTER_SIZE_STEPS.length + 2; tap += 1) {
      await app.store.dispatch({ type: 'too_big' });
      sizes.push(size());
      texts.push(app.task().text);
      expect(app.task().shrinkCount).toBe(tap + 1);
    }
    // Each tap takes the next of the task's own smaller steps, none of them twice; with none
    // left the words stay as small as they got, and never go back to the bigger ask.
    const { tinyNextStep, tinierNextSteps = [] } = recordedLines.lines;
    const steps = [tinyNextStep, ...tinierNextSteps];
    expect(steps).toHaveLength(3);
    expect(texts.slice(1, 4)).toEqual(steps);
    expect(texts.slice(4).every((text) => text === steps.at(-1))).toBe(true);
    expect(texts.slice(1)).not.toContain(original);
    expect(sizes[1]).toBeLessThan(sizes[0] ?? 0);
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
    expect(sizes.at(-1)).toBeCloseTo((sizes[0] ?? 0) * (MONSTER_SIZE_STEPS.at(-1) ?? 1), 5);
    expect(app.store.getState().pick).toEqual({ kind: 'hatching', shrunk: true });
  });
});
