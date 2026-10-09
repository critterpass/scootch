import { describe, expect, it } from '@jest/globals';

import type { StartCue } from '@scootch/domain';

import { openRepositories } from '../data/repositories';

import { stagedPhone, stagedServer } from './test/staged-phone';

type Phone = Awaited<ReturnType<typeof stagedPhone>>;

const LUNCH: StartCue = { kind: 'moment', moment: 'lunch' };
const bites = [
  { text: 'Find the number.', minutes: 1 },
  { text: 'Write what to ask.', minutes: 3 },
  { text: 'Ring.', minutes: 1 },
];

async function taskSet(app: Phone): Promise<void> {
  await app.say('ring the bank', 'typed');
  await app.store.dispatch({ type: 'one_thing_picked' });
  await app.store.dispatch({ type: 'monster_met' });
}

/** A set thing whose pack has its three bites, on a phone opened again on the same data. */
async function withBites(): Promise<Phone> {
  const first = await stagedPhone(stagedServer());
  await taskSet(first);
  const { lines } = first.task();
  if (lines === null || !('hatch' in lines)) throw new Error('the task has its lines');
  await openRepositories(first.data.db).tasks.put({ ...first.task(), lines: { ...lines, bites } });
  return stagedPhone(stagedServer(), first.data);
}

const tapStart = (app: Phone) =>
  app.store.dispatch({ type: 'surface_action', action: 'start_session' });

describe('the length chosen on the wheel', () => {
  it('is kept with a saved cue, and the tap on its message starts at that length', async () => {
    const app = await stagedPhone(stagedServer());
    await taskSet(app);
    await app.store.dispatch({ type: 'cue_saved', cue: LUNCH, minutes: 25 });
    expect(app.task().chosenMinutes).toBe(25);

    // Opened again from the message: the length was stored, not held by the screen.
    const again = await stagedPhone(stagedServer(), app.data);
    await tapStart(again);
    expect(again.store.getState().session).toMatchObject({
      phase: 'running',
      ask: { minutes: 25 },
    });
  });

  it('is kept with a bite ticked on the set task, and the last bite from a message uses it', async () => {
    const app = await withBites();
    const taskId = app.task().id;
    await app.store.dispatch({ type: 'bite_ticked', taskId, place: 0, minutes: 15 });
    expect(app.task().chosenMinutes).toBe(15);
    // The other two come from under a notification, which knows no length.
    await app.store.dispatch({ type: 'bite_ticked', taskId, place: 1 });
    await app.store.dispatch({ type: 'bite_ticked', taskId, place: 2 });
    expect(app.store.getState().session).toMatchObject({ phase: 'running', ask: { minutes: 15 } });
  });

  it('is ten minutes when none was kept', async () => {
    const app = await stagedPhone(stagedServer());
    await taskSet(app);
    await app.store.dispatch({ type: 'cue_saved', cue: LUNCH });
    expect(app.task().chosenMinutes ?? null).toBeNull();
    await tapStart(app);
    expect(app.store.getState().session).toMatchObject({ phase: 'running', ask: { minutes: 10 } });
  });
});
