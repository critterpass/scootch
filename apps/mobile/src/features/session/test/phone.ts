import type { SessionEvent, TaskCreateResponse } from '@scootch/domain';

import { createTaskClient } from '../../../api/task-client';
import { openRepositories } from '../../../data/repositories';
import { openTestDatabase, type TestDatabase } from '../../../data/test/open-test-database';
import { createEffectsRunner } from '../../../effects/effects-runner';
import { ALL_ON, fakeDevice, fakeTime } from '../../../effects/test/fake-adapters';
import { createDayStore, type DayStore } from '../../../state/day-store';

// 10:00 on 6 October in London, the day and zone of the recorded task call.
export const MORNING = Date.parse('2026-10-06T09:00:00.000Z');

/**
 * A phone on fakes: a real in-memory database that outlives the app, a clock moved by hand, and an
 * app process that can be started on the same database again, as after a kill.
 */
export async function phone(answer: TaskCreateResponse, database?: TestDatabase, at = MORNING) {
  const data = database ?? (await openTestDatabase());
  const time = fakeTime(at);
  const device = fakeDevice();
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
      taskCreate: () => Promise.resolve(answer),
    }),
    online: () => Promise.resolve(true),
    runner,
    phoneLanguage: () => 'en',
    plus: () => false,
    timers: time.timers,
  });
  await store.start();
  const session = (event: SessionEvent) => store.dispatch({ type: 'session', event });
  /** Types the one thing, sets a session for it and starts. */
  const begin = async (text: string, minutes: number, treat: string | null = null) => {
    await store.dispatch({ type: 'text_submitted', text, source: 'typed', energy: 'medium' });
    await store.dispatch({ type: 'session_set', minutes, treat });
    await session({ type: 'started' });
  };
  return { data, time, device, store, runner, repositories, session, begin };
}
