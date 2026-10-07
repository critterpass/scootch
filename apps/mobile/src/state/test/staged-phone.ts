import type {
  TaskCreateNameResponse,
  TaskCreatePackResponse,
  TaskCreateStartResponse,
} from '@scootch/domain';

import linesFixture from '../../../../../packages/voice/fixtures/task.create_lines.en.json';
import startFixture from '../../../../../packages/voice/fixtures/task.create_start.en.json';
import type { Judged, TaskLinesAnswer } from '../../api/scootch-api';
import { createStagedTaskClient } from '../../api/staged-task-client';
import { openRepositories } from '../../data/repositories';
import { openTestDatabase, type TestDatabase } from '../../data/test/open-test-database';
import { createEffectsRunner } from '../../effects/effects-runner';
import { ALL_ON, fakeDevice, fakeTime } from '../../effects/test/fake-adapters';
import { createDayStore, type DayStore } from '../day-store';

// 10:00 on 6 October in London, the day and zone of the recorded task call.
export const MORNING = Date.parse('2026-10-06T09:00:00.000Z');
export const recordedStart = startFixture.response as TaskCreateStartResponse;
export const recordedLines = linesFixture.response as Required<TaskLinesAnswer>;
export const ramble = startFixture.request.text;

/** The server at the network boundary: what each stage answers, and how often it was asked. */
export interface StagedServer {
  online: boolean;
  start: TaskCreateStartResponse & Judged;
  /** Stage one, when the test decides when it answers; `start` at once when unset. */
  startStage?: () => Promise<TaskCreateStartResponse & Judged>;
  /** Stage two: answers when the test lets it, or fails. */
  lines: () => Promise<TaskLinesAnswer>;
  /** Stage two, name first. A server without the route fails it, which is the default here. */
  name: () => Promise<TaskCreateNameResponse>;
  pack: (treat: string | null) => Promise<TaskCreatePackResponse>;
  startCalls: number;
  lineCalls: number;
  nameCalls: number;
  packCalls: number;
}

export function stagedServer(changes: Partial<StagedServer> = {}): StagedServer {
  return {
    online: true,
    start: recordedStart,
    lines: () => Promise.resolve(recordedLines),
    name: () => Promise.reject(new Error('no name route')),
    pack: () => Promise.reject(new Error('no pack route')),
    startCalls: 0,
    lineCalls: 0,
    nameCalls: 0,
    packCalls: 0,
    ...changes,
  };
}

/** A phone on fakes whose task call is the staged one: a real database, a clock moved by hand. */
export async function stagedPhone(
  server: StagedServer,
  database?: TestDatabase,
  at = MORNING,
  phone: {
    readonly timeZone?: string;
    readonly plus?: boolean;
    readonly onFailure?: (error: unknown) => void;
  } = {},
) {
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
  const store: DayStore = createDayStore({
    repositories: openRepositories(data.db),
    clock: time.clock,
    timeZone: () => phone.timeZone ?? 'Europe/London',
    nextId: () => `id-${at}-${(ids += 1)}`,
    tasks: createStagedTaskClient({
      taskCreateStart: () => {
        server.startCalls += 1;
        return server.startStage ? server.startStage() : Promise.resolve(server.start);
      },
      taskCreateLines: () => {
        server.lineCalls += 1;
        return server.lines();
      },
      taskCreateName: () => {
        server.nameCalls += 1;
        return server.name();
      },
      taskCreatePack: (_continuation, treat) => {
        server.packCalls += 1;
        return server.pack(treat ?? null);
      },
    }),
    online: () => Promise.resolve(server.online),
    runner,
    phoneLanguage: () => 'en',
    plus: () => phone.plus ?? false,
    timers: time.timers,
    ...(phone.onFailure ? { onFailure: phone.onFailure } : {}),
  });
  await store.start();
  const say = (text = ramble, source: 'ramble' | 'typed' = 'ramble') =>
    store.dispatch({ type: 'text_submitted', text, source, energy: 'medium' });
  const task = () => {
    const { today } = store.getState();
    if (!('task' in today)) throw new Error(`no task today: ${today.kind}`);
    return today.task;
  };
  /** Resolves once the store's state passes the check. */
  const until = (check: () => boolean) =>
    new Promise<void>((done) => {
      if (check()) return done();
      const stop = store.subscribe(() => {
        if (!check()) return;
        stop();
        done();
      });
    });
  return { data, time, device, store, say, task, until };
}
