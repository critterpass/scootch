import { instantFromIso, type SettingsRow } from '@scootch/domain';

import { plusMemory } from '../data/plus-memory';
import type { Repositories } from '../data/repositories';
import type { SqlDatabase } from '../data/table';
import type { Clock, NotificationScheduler } from '../effects/adapters';
import { plannedChargeReminders, syncChargeReminders } from '../features/plus/charge-reminders';
import type { OfferFacts } from '../features/plus/offer-rules';
import type { PurchasesPort } from '../features/plus/purchases-port';

import type { DayState } from './day-types';
import type { PlusRuntime } from './plus-context';
import { createPlusStore } from './plus-store';
import { showsSelling } from './shows-comedy';

export interface PlusRuntimeDeps {
  readonly db: SqlDatabase;
  readonly port: PurchasesPort;
  readonly clock: Clock;
  readonly notifications: NotificationScheduler;
  readonly timeZone: () => string;
  /** The person's language and attitude, for the words of a reminder. */
  readonly voice: () => Pick<SettingsRow, 'language' | 'attitude'>;
  readonly offerFacts: PlusRuntime['offerFacts'];
  /** Asks the server for this phone's member number. Rejects when it cannot be reached. */
  readonly memberNumber: () => Promise<number>;
}

/** What the first offer needs, read from the phone's own tables and today's state. */
export async function readOfferFacts(
  repositories: Pick<Repositories, 'monsters' | 'tasks'>,
  day: Pick<DayState, 'today' | 'settings' | 'heavyToday'>,
): Promise<OfferFacts & Pick<SettingsRow, 'attitude'>> {
  const [monsters, tasks] = await Promise.all([
    repositories.monsters.all(),
    repositories.tasks.all(),
  ]);
  const finishes = tasks.flatMap((task) =>
    task.finishedAt === null ? [] : [instantFromIso(task.finishedAt)],
  );
  const { today, settings } = day;
  return {
    catches: monsters.filter((monster) => monster.caughtOn !== null).length,
    lastFinishAt: finishes.length > 0 ? Math.max(...finishes) : null,
    firstLaunchDone: settings.firstLaunchDoneAt !== null,
    sessionRunning:
      today.kind === 'in_session' || (today.kind === 'serious' && today.session !== null),
    selling: showsSelling(day),
    attitude: settings.attitude,
  };
}

export interface RunningPlus extends PlusRuntime {
  /** Reads the last known state, then asks the store. Called once at launch. */
  start(): Promise<void>;
  /** Asks the store again and brings the charge reminders in line. Called on every foreground. */
  refresh(): Promise<void>;
  /** Brings the charge reminders in line with what is known now. */
  syncReminders(): Promise<void>;
}

/** Plus on a phone: the store's port, its last known state, and the charge reminders. */
export function createPlusRuntime(deps: PlusRuntimeDeps): RunningPlus {
  const memory = plusMemory(deps.db);
  const store = createPlusStore({ port: deps.port, memory });
  let queue: Promise<void> = Promise.resolve();

  const syncReminders = () => {
    queue = queue
      .then(() => {
        const { customer, prices } = store.getState();
        const planned = plannedChargeReminders({
          customer,
          prices,
          timeZone: deps.timeZone(),
          ...deps.voice(),
        });
        return syncChargeReminders(deps.notifications, planned, deps.clock.now());
      })
      .catch(() => undefined);
    return queue;
  };
  /**
   * Keeps the member card's facts once Plus is on: the day it was first seen here, and the number
   * the server hands out. A phone with no connection keeps asking on later refreshes; a phone
   * without Plus never asks.
   */
  const keepMember = async () => {
    const { unlocked, member } = store.getState();
    if (!unlocked.plus) return;
    if (member.since === null) await store.rememberMember({ ...member, since: deps.clock.now() });
    if (member.number !== null) return;
    try {
      const number = await deps.memberNumber();
      await store.rememberMember({ ...store.getState().member, number });
    } catch {
      // Asked again at the next refresh.
    }
  };
  const refresh = async () => {
    await store.refresh();
    await keepMember();
    await syncReminders();
  };

  return {
    port: deps.port,
    store,
    memory,
    timeZone: deps.timeZone,
    now: () => deps.clock.now(),
    offerFacts: deps.offerFacts,
    start: async () => {
      await store.load();
      await refresh();
    },
    refresh,
    syncReminders,
  };
}
