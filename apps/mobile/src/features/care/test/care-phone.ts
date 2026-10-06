import type { SessionEvent, TaskCreateRequest, TaskCreateResponse } from '@scootch/domain';

import { createTaskClient } from '../../../api/task-client';
import { openRepositories } from '../../../data/repositories';
import { openTestDatabase } from '../../../data/test/open-test-database';
import { createEffectsRunner } from '../../../effects/effects-runner';
import { ALL_ON, fakeDevice, fakeTime } from '../../../effects/test/fake-adapters';
import { createDayStore, type DayStore } from '../../../state/day-store';

// 10:00 on 6 October in London, the day and zone of the recorded task calls.
export const MORNING = Date.parse('2026-10-06T09:00:00.000Z');

/** The server at the network boundary: what the task call answers, and what it was asked. */
export interface CareServer {
  online: boolean;
  /** What the task call answers; `null` makes it fail. */
  answer: TaskCreateResponse | null;
  readonly requests: TaskCreateRequest[];
}

export function careServer(answer: TaskCreateResponse | null, online = true): CareServer {
  return { online, answer, requests: [] };
}

/** A phone on fakes: a real in-memory database, a clock moved by hand, and recorded device calls. */
export async function carePhone(server: CareServer) {
  const data = await openTestDatabase();
  const time = fakeTime(MORNING);
  const device = fakeDevice();
  let ids = 0;
  let finishes = 0;
  const runner = createEffectsRunner({
    clock: time.clock,
    timers: time.timers,
    cues: device.cues,
    haptics: device.haptics,
    notifications: device.notifications,
    liveActivity: device.liveActivity,
    screen: {
      showLine: (slot, text) => {
        device.screen.showLine(slot, text);
        store.screen.showLine(slot, text);
      },
      showBurst: (burst) => {
        device.screen.showBurst(burst);
        store.screen.showBurst(burst);
      },
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
    nextId: () => `id-${(ids += 1)}`,
    tasks: createTaskClient({
      screenInput: () => Promise.reject(new Error('not used')),
      taskCreate: (request) => {
        server.requests.push(request);
        return server.answer ? Promise.resolve(server.answer) : Promise.reject(new Error('down'));
      },
    }),
    online: () => Promise.resolve(server.online),
    runner,
    phoneLanguage: () => 'en',
    plus: () => false,
    onFinished: () => {
      finishes += 1;
    },
  });
  await store.start();
  const session = (event: SessionEvent) => store.dispatch({ type: 'session', event });
  const type = (text: string) =>
    store.dispatch({ type: 'text_submitted', text, source: 'typed', energy: 'medium' });
  /** Sets a session for today's one thing and starts it. */
  const sit = async (minutes = 10) => {
    await store.dispatch({ type: 'session_set', minutes, treat: null });
    await session({ type: 'started' });
  };
  return {
    data,
    time,
    device,
    store,
    runner,
    repositories,
    session,
    type,
    sit,
    finishes: () => finishes,
  };
}
