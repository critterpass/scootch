import type { SessionEvent, TaskCreatePass } from '@scootch/domain';

import passFixture from '../../../../../../packages/voice/fixtures/task.create.en.json';
import { createTaskClient } from '../../../api/task-client';
import { plusMemory } from '../../../data/plus-memory';
import { openRepositories } from '../../../data/repositories';
import { openTestDatabase, type TestDatabase } from '../../../data/test/open-test-database';
import { createEffectsRunner } from '../../../effects/effects-runner';
import { ALL_ON, fakeDevice, fakeTime } from '../../../effects/test/fake-adapters';
import { createDayStore, type DayStore } from '../../../state/day-store';
import { createPlusStore } from '../../../state/plus-store';

import { fakePurchases, type FakeStore } from './fake-purchases';

// 10:00 on 6 October in London, the day and zone of the recorded task call.
export const MORNING = Date.parse('2026-10-06T09:00:00.000Z');
const pass = passFixture.response as TaskCreatePass;

/**
 * A phone on fakes with a store: a real in-memory database, a clock moved by hand, a fake App
 * Store, and the day store reading its daily limit from what that store last said.
 */
export async function plusPhone(shop: FakeStore, database?: TestDatabase, at = MORNING) {
  const data = database ?? (await openTestDatabase());
  const time = fakeTime(at);
  const device = fakeDevice();
  const port = fakePurchases(shop);
  const memory = plusMemory(data.db);
  const plus = createPlusStore({ port, memory });
  await plus.load();
  await plus.refresh();

  let ids = 0;
  const runner = createEffectsRunner({
    clock: time.clock,
    timers: time.timers,
    cues: device.cues,
    haptics: device.haptics,
    notifications: device.notifications,
    liveActivity: device.liveActivity,
    screen: {
      showLine: (slot, text) => store.screen.showLine(slot, text),
      showBurst: (burst) => store.screen.showBurst(burst),
      handOverTreat: (treat) => store.screen.handOverTreat(treat),
      showParkedThoughts: (thoughts) => store.screen.showParkedThoughts(thoughts),
    },
    switches: () => ALL_ON,
    onClock: () => void store.dispatch({ type: 'session', event: { type: 'clock' } }),
  });
  const repositories = openRepositories(data.db);
  const store: DayStore = createDayStore({
    repositories,
    clock: time.clock,
    timeZone: () => 'Europe/London',
    nextId: () => `id-${at}-${(ids += 1)}`,
    tasks: createTaskClient({
      screenInput: () => Promise.reject(new Error('not used')),
      taskCreate: () => Promise.resolve(pass),
    }),
    online: () => Promise.resolve(true),
    runner,
    phoneLanguage: () => 'en',
    plus: () => plus.getState().unlocked.plus,
  });
  plus.subscribe(() => void store.dispatch({ type: 'entitlement_changed' }));
  await store.start();
  const session = (event: SessionEvent) => store.dispatch({ type: 'session', event });
  /** Types a thing, starts ten minutes on it and finishes it. */
  const finishOne = async (text: string) => {
    await store.dispatch({ type: 'text_submitted', text, source: 'typed', energy: 'medium' });
    await store.dispatch({ type: 'session_set', minutes: 10, treat: null });
    await session({ type: 'started' });
    await session({ type: 'double_tapped' });
    await store.dispatch({ type: 'session_closed' });
  };
  return { data, time, device, port, memory, plus, store, repositories, session, finishOne };
}
