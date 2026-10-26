import {
  fillDesk,
  minutesFree,
  type Clock,
  type PickReason,
  type Task,
} from '@phusclass/domain/board';

import type { ModelSplit } from '@phusclass/domain/hearing';

import { careGate, type CareGateResult } from '../api/care-gate';
import type { DataDatabase } from '../data/data-database';
import { writeKv } from '../data/kv-repository';
import { endSession } from '../data/sessions-repository';
import { writeTasks } from '../data/tasks-repository';

import { viewOf, type BoardSnapshot, type BoardState } from './board-view';

export type BoardStoreDeps = {
  readonly db: DataDatabase;
  /** Gives "now" with the day rolling over at four in the morning. */
  readonly clock: Clock;
  readonly newId: () => string;
  /** The phone's care gate; the real one unless a test needs another. */
  readonly gate?: (text: string) => CareGateResult;
  /** How `3/4` reads: day first unless the region writes the month first. */
  readonly dayFirst?: boolean;
  /** The on-device model's split of a ramble, tried first and never waited on for long. */
  readonly split?: ModelSplit;
};

/** Keys the store keeps in `kv` and `settings`. */
export const KEYS = {
  finishes: 'board.finishes',
  longBoard: 'board.long-remarked-on',
  tuitionPinned: 'tuition.notice-pinned-at',
  crisisShown: 'care.crisis-shown-on',
  crisisOpen: 'care.crisis-open-on',
  birthday: 'phu.birthday',
} as const;

export type SessionOutcome = 'done' | 'another period' | 'back on board' | 'erase' | 'slipped';

const initial: BoardState = {
  ready: false,
  tasks: [],
  carvings: [],
  session: null,
  deskReason: null,
  lastFinish: null,
  lastSlip: null,
  recess: null,
  recessOffered: false,
  finishes: 0,
  longBoardRemarkedOn: null,
  tuitionPinnedAt: null,
  enrolled: false,
  crisisOpenOn: null,
  crisisShownOn: null,
  birthday: null,
  celsius: null,
};

/** What every action works through: the state, the queue and the writes they share. */
export type BoardCore = ReturnType<typeof createCore>;

export function createCore(deps: BoardStoreDeps) {
  let state: BoardState = initial;
  let snapshot: BoardSnapshot = viewOf(state, deps.clock());
  const listeners = new Set<() => void>();
  let queue: Promise<unknown> = Promise.resolve();

  const core = {
    deps,
    gate: deps.gate ?? careGate,
    get state(): BoardState {
      return state;
    },
    set state(next: BoardState) {
      state = next;
    },
    get snapshot(): BoardSnapshot {
      return snapshot;
    },
    listeners,

    /** Reads the clock again and tells every screen. */
    emit(): void {
      snapshot = viewOf(state, deps.clock());
      for (const listener of listeners) listener();
    },

    /** Runs one action after the last, then publishes, whether it worked or not. */
    act<T>(work: () => Promise<T>): Promise<T> {
      const run = queue.then(work).finally(() => core.emit());
      queue = run.catch(() => undefined);
      return run;
    },

    task(id: string): Task | undefined {
      return state.tasks.find((one) => one.id === id);
    },

    desk(): Task | undefined {
      return state.tasks.find((one) => one.status === 'desk');
    },

    /** Keeps changed tasks in memory and writes them. New tasks are added at the end. */
    async save(changed: readonly Task[]): Promise<void> {
      const byId = new Map(changed.map((one) => [one.id, one]));
      const known = new Set(state.tasks.map((one) => one.id));
      state = {
        ...state,
        tasks: [
          ...state.tasks.map((one) => byId.get(one.id) ?? one),
          ...changed.filter((one) => !known.has(one.id)),
        ],
      };
      await writeTasks(deps.db, changed);
    },

    /** Puts his pick on an empty desk, leaving out a task that has just come off it. */
    async refill(leaveOut?: string): Promise<PickReason | null> {
      const now = deps.clock();
      const pool = state.tasks.filter((one) => one.id !== leaveOut);
      const { tasks, picked } = fillDesk(pool, { now, freeMinutes: minutesFree(pool, now) });
      if (picked === null) return null;
      state = { ...state, deskReason: picked.reason };
      await core.save(tasks.filter((one) => one.id === picked.task.id));
      return picked.reason;
    },

    async endOpenSession(outcome: SessionOutcome): Promise<void> {
      if (state.session === null) return;
      await endSession(deps.db, state.session.id, deps.clock().at, outcome);
      state = { ...state, session: null };
    },

    async writeKv(key: string, value: string): Promise<void> {
      await writeKv(deps.db, key, value, deps.clock().at);
    },
  };
  return core;
}
