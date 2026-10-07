import { describe, expect, it } from '@jest/globals';

import { FREE_STARTS_PER_DAY, type TaskCreateStartResponse } from '@scootch/domain';

import type { Judged } from '../api/scootch-api';
import { composerReducer, initialComposer } from '../features/composer/composer-machine';

import { TASK_PATIENCE_MS } from './task-flow';
import { MORNING, recordedStart, stagedPhone, stagedServer } from './test/staged-phone';

/** A server whose first stage answers only when the test says so. */
function slowServer() {
  const waiting: ((start: TaskCreateStartResponse & Judged) => void)[] = [];
  const server = stagedServer({
    startStage: () => new Promise((resolve) => waiting.push(resolve)),
  });
  return { server, answer: () => waiting.splice(0).forEach((resolve) => resolve(recordedStart)) };
}

/** Lets what is already under way reach its next wait. */
const flush = () => new Promise<void>((done) => setImmediate(done));

describe('waiting for the model', () => {
  it('holds nothing else up: the drawer and settings answer while Scootch is thinking', async () => {
    const { server, answer } = slowServer();
    const app = await stagedPhone(server);
    const sent = app.say();
    await app.until(() => app.store.getState().taskCall === 'waiting');

    await app.store.dispatch({ type: 'drawer', event: { type: 'pulled' } });
    expect(app.store.getState().drawer.open).toBe(true);
    await app.store.dispatch({ type: 'settings_changed', changes: { haptics: false } });
    expect(app.store.getState().settings.haptics).toBe(false);
    expect(app.store.getState().taskCall).toBe('waiting');

    // The answer still lands, in its turn.
    answer();
    await sent;
    expect(app.task().text).toBe(recordedStart.verdict === 'pass' && recordedStart.oneThing.text);
    expect(app.store.getState().taskCall).toBe('idle');
  });

  it('applies events in the order they were sent', async () => {
    const app = await stagedPhone(stagedServer());
    const order: string[] = [];
    app.store.subscribe(() => order.push(app.store.getState().settings.attitude));
    void app.store.dispatch({ type: 'settings_changed', changes: { attitude: 'soft' } });
    void app.store.dispatch({ type: 'settings_changed', changes: { attitude: 'unhinged' } });
    await app.store.dispatch({ type: 'settings_changed', changes: { attitude: 'cheeky' } });
    expect(order.filter((one, index) => one !== order[index - 1])).toEqual([
      'soft',
      'unhinged',
      'cheeky',
    ]);
  });

  it('cancels: the words go back to the composer, nothing is set, and a late answer is dropped', async () => {
    const { server, answer } = slowServer();
    const app = await stagedPhone(server);
    const sent = app.say('ring the dentist and also sort the tax', 'typed');
    await app.until(() => app.store.getState().taskCall === 'waiting');

    await app.store.dispatch({ type: 'task_call_cancelled' });
    await sent;
    expect(app.store.getState()).toMatchObject({
      taskCall: 'idle',
      returnedText: 'ring the dentist and also sort the tax',
      today: { kind: 'nothing_yet', startsLeft: FREE_STARTS_PER_DAY },
    });

    answer();
    await app.store.dispatch({ type: 'returned_text_taken' });
    expect(app.store.getState().today.kind).toBe('nothing_yet');
    expect(app.store.getState().returnedText).toBeNull();
    expect(app.data.count('tasks') + app.data.count('drawer_items')).toBe(0);
    expect(app.time.armed()).toEqual([]);
  });

  it('starts the day without the model once the wait runs out, and drops what comes after', async () => {
    const { server, answer } = slowServer();
    const app = await stagedPhone(server);
    const sent = app.say('ring the dentist', 'typed');
    await app.until(() => app.store.getState().taskCall === 'waiting');
    expect(TASK_PATIENCE_MS).toBeLessThanOrEqual(10_000);
    await flush();

    app.time.advanceTo(MORNING + TASK_PATIENCE_MS - 1);
    expect(app.store.getState().taskCall).toBe('waiting');
    app.time.advanceTo(MORNING + TASK_PATIENCE_MS);
    await app.until(() => app.store.getState().taskCall === 'idle');
    expect(app.task()).toMatchObject({ text: 'ring the dentist', screen: 'unscreened' });
    expect(app.store.getState()).toMatchObject({ modelDown: true, pick: { kind: 'offered' } });

    // The session can start at once; the first answer, arriving late, changes nothing.
    answer();
    await sent;
    const picked = app.store.dispatch({ type: 'one_thing_picked' });
    await flush();
    answer();
    await picked;
    expect(app.data.count('tasks')).toBe(1);
    expect(app.task().text).toBe('ring the dentist');
  });

  it('drops the answer when the person took something from the drawer meanwhile', async () => {
    const first = await stagedPhone(stagedServer());
    await first.say();
    await first.store.dispatch({ type: 'carried_task_set_aside' });
    const [parked] = first.store.getState().drawer.items;
    if (!parked) throw new Error('the recorded call parks something');

    const { server, answer } = slowServer();
    const app = await stagedPhone(server, first.data);
    const sent = app.say('something new entirely', 'typed');
    await app.until(() => app.store.getState().taskCall === 'waiting');
    const swapped = app.store.dispatch({ type: 'drawer_item_swapped_in', itemId: parked.id });
    await sent;
    await flush();
    answer();
    await swapped;
    expect(app.task().text).toBe(parked.text);
    expect(app.data.count('tasks')).toBe(1);
    expect(app.store.getState().taskCall).toBe('idle');
  });
});

describe('the composer after a cancelled wait', () => {
  it('has the words back in the field, whether they were typed or spoken', () => {
    const sending = { ...initialComposer('ready'), phase: 'sending' as const };
    const { state } = composerReducer(sending, { type: 'text_returned', text: 'ring the dentist' });
    expect(state).toMatchObject({ phase: 'idle', mode: 'typing', text: 'ring the dentist' });
    // The send that was under way reports in afterwards and changes nothing.
    expect(composerReducer(state, { type: 'sent' }).state).toBe(state);
  });
});
