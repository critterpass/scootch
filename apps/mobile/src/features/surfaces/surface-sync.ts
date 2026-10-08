import {
  DAY_ROLLOVER_HOUR,
  addDays,
  instantFromIso,
  instantOfLocal,
  localDateTime,
  isoWeekOf,
  type CardFinish,
} from '@scootch/domain';

import type { Repositories } from '../../data/repositories';
import type { DayStore } from '../../state/day-store';
import type { DayState } from '../../state/day-types';
import { takeClipLink } from '../arrive/arrive-rules';
import type { FriendsTablesSeen } from '../table/friends-tables-seen';

import { readHunt } from './hunt-store';

import { finishedThings } from '../world/landmarks';

import { shareMonsterImages } from './monster-image';
import { createPendingActions } from './pending-actions';
import { createSharedIn } from './shared-in';
import {
  SHARED_KEYS,
  type MonsterPainter,
  type SharedFiles,
  type SharedStore,
  type WorldPainter,
} from './surface-ports';
import { buildSurfaceSnapshot, type WaitingThing } from './surface-snapshot';
import { shareWorldImages } from './world-image';

export interface SurfaceSyncDeps {
  readonly store: DayStore;
  readonly repositories: Pick<Repositories, 'recordBars' | 'worldPieces' | 'tasks' | 'monsters'>;
  readonly shared: SharedStore;
  readonly files: SharedFiles;
  readonly painter: MonsterPainter;
  readonly worldPainter: WorldPainter;
  /** The open tables friends were last seen at, or `null` before anything was asked. */
  readonly friendsTables?: () => FriendsTablesSeen | null;
  /** The table the phone is seated at: a wave to one seat, and giving the seat up. */
  readonly table?: { readonly wave: (seatId: string) => void; readonly leave: () => void };
  /** Opens one of the app's own routes, as a link to it does. */
  readonly openRoute?: (route: `/m/${string}`) => void;
  /** Takes back a notification a surface set, by its id. */
  readonly cancelNotification: (id: string) => Promise<void>;
  readonly plus: () => boolean;
  /** The worn ink's accent as a hex colour; `null` for tomato. */
  readonly accent: () => string | null;
  /** The finish the person wears. */
  readonly finish: () => CardFinish;
  readonly now: () => number;
  readonly timeZone: () => string;
}

const TIMED: readonly string[] = ['running', 'stuck', 'holding'];
/** The phases of a session a hunt record can still be about. */
const HOLDS_HUNT: readonly string[] = [...TIMED, 'time_up', 'not_finished'];
/** The actions today's store acts on. The others are about a hunt begun outside the app. */
const DAY_ACTIONS = ['start_session', 'brain_dump', 'park_thought', 'stuck'] as const;
type DayAction = (typeof DAY_ACTIONS)[number];
const isDayAction = (kind: string): kind is DayAction =>
  (DAY_ACTIONS as readonly string[]).includes(kind);

/** The id of the notification "Hunt at 9:00" sets (`targets/_shared/MorningHunt.swift`). */
export const morningHuntNotification = (taskId: string) => `morning-hunt-${taskId}`;

/** The thing a nine o'clock hunt is set for, or `null` when none is or the note cannot be read. */
function morningHuntTask(stored: string | null): string | null {
  if (stored === null) return null;
  try {
    const { taskId } = JSON.parse(stored) as { taskId?: unknown };
    return typeof taskId === 'string' ? taskId : null;
  } catch {
    return null;
  }
}

/** The parts of the day a surface shows. While none of them changes, nothing is written. */
function shownParts(
  state: DayState,
  plus: boolean,
  accent: string | null,
  finish: CardFinish,
  friends: FriendsTablesSeen | null,
): readonly unknown[] {
  const { settings } = state;
  return [
    state.today,
    state.monster,
    state.line,
    state.waitingForTomorrow,
    settings.attitude,
    settings.language,
    settings.wallpaper,
    friends,
    plus,
    accent,
    finish,
    state.localDate,
  ];
}

/**
 * Keeps the system surfaces in step with the day store: writes the shared snapshot (and the
 * monster's picture) whenever what a surface shows has changed, asks the system to draw the
 * widgets again, and hands the store what the controls and buttons asked for while the app was
 * away.
 */
export function createSurfaceSync(deps: SurfaceSyncDeps) {
  const { store, shared } = deps;
  const pending = createPendingActions(shared, deps.now);
  const sharedIn = createSharedIn(shared);
  let queue: Promise<void> = Promise.resolve();
  let lastParts: readonly unknown[] | null = null;
  let lastJson: string | null = null;

  async function write(): Promise<void> {
    const state = store.getState();
    if (!state.ready) return;
    const plus = deps.plus();
    const accent = deps.accent();
    const finish = deps.finish();
    const friends = deps.friendsTables?.() ?? null;
    const parts = shownParts(state, plus, accent, finish, friends);
    if (lastParts && parts.every((part, index) => part === lastParts?.[index])) return;
    lastParts = parts;

    const { today } = state;
    // A serious task and a crisis day have no monster on any surface, so none is kept there.
    const monster = today.kind === 'serious' || today.kind === 'crisis' ? null : state.monster;
    // Today's unfinished things with a monster may lurk; the snapshot decides which are shown.
    // One carried to tomorrow lurks from tomorrow, when a hunt on it can become today's session.
    const monsters = await deps.repositories.monsters.all();
    const caught = monsters.filter((one) => one.caughtAt !== null);
    const unfinished =
      today.kind === 'crisis'
        ? []
        : (await deps.repositories.tasks.where('localDate', state.localDate)).filter(
            (task) => task.status !== 'finished',
          );
    const waiting = unfinished.flatMap((task) => {
      const its = monsters.find((one) => one.taskId === task.id && one.caughtAt === null);
      return its ? [{ task, monster: its }] : [];
    });
    const latest = caught.reduce<(typeof caught)[number] | null>(
      (last, one) => (last === null || (one.caughtAt ?? '') > (last.caughtAt ?? '') ? one : last),
      null,
    );
    // The last catch keeps its picture: its card may still be on the Lock Screen.
    const images = await shareMonsterImages(
      [
        ...(monster ? [monster] : []),
        ...waiting.map((one) => one.monster),
        ...(latest && today.kind !== 'crisis' ? [latest] : []),
      ],
      deps.painter,
      deps.files,
    );
    // A nine o'clock hunt is for a thing that is still waiting. Once it is finished, let go or
    // the day has turned heavy, nothing is sent about it.
    const setForNine = morningHuntTask(shared.get(SHARED_KEYS.morningHunt));
    const stillWaiting = [
      ...unfinished,
      ...(state.waitingForTomorrow ? [state.waitingForTomorrow] : []),
    ];
    if (
      setForNine !== null &&
      (today.kind === 'crisis' || !stillWaiting.some((task) => task.id === setForNine))
    ) {
      shared.remove(SHARED_KEYS.morningHunt);
      await deps.cancelNotification(morningHuntNotification(setForNine)).catch(() => undefined);
    }
    const pieces = await deps.repositories.worldPieces.all();
    const world = await shareWorldImages(pieces, monsters, deps.worldPainter, deps.files);
    const { week } = isoWeekOf(state.localDate);
    const carried = today.kind === 'crisis' ? null : state.waitingForTomorrow;
    const live = state.session !== null && TIMED.includes(state.session.phase);
    const snapshot = buildSurfaceSnapshot({
      today,
      settings: state.settings,
      monster,
      monsterImage: monster ? (images.get(monster.id) ?? null) : null,
      shownLine: live ? (state.line?.text ?? null) : null,
      weekBars: (await deps.repositories.recordBars.where('week', week)).length,
      worldThings: finishedThings(pieces),
      plus,
      accent,
      localDate: state.localDate,
      waiting: waiting.map((one): WaitingThing => ({
        ...one,
        image: images.get(one.monster.id) ?? null,
      })),
      finish,
      shelf: caught.length,
      latestCatch:
        latest?.caughtAt != null
          ? { name: latest.name, caughtAt: instantFromIso(latest.caughtAt) }
          : null,
      caughtThisWeek: caught.filter(
        (one) =>
          isoWeekOf(localDateTime(instantFromIso(one.caughtAt ?? ''), deps.timeZone()).date)
            .week === week,
      ).length,
      worldImage: world.day,
      worldNightImage: world.night,
      scootchImage: world.scootch,
      wallpaper: state.settings.wallpaper,
      friendsTables: friends && {
        asOf: friends.at,
        tables: friends.tables.map((one) => ({
          tableId: one.tableId,
          friend: one.friends[0]?.displayName ?? null,
          others: Math.max(0, one.friends.length - 1),
          openSeats: one.openSeats,
        })),
      },
      carried: carried
        ? {
            task: carried,
            monster:
              monsters.find((one) => one.taskId === carried.id && one.caughtAt === null) ?? null,
          }
        : null,
      dayEndsAt: instantOfLocal(
        addDays(state.localDate, 1),
        `${String(DAY_ROLLOVER_HOUR).padStart(2, '0')}:00`,
        deps.timeZone(),
      ),
    });
    const json = JSON.stringify(snapshot);
    if (json === lastJson) return;
    shared.set(SHARED_KEYS.snapshot, json);
    shared.reloadSurfaces();
    lastJson = json;
  }

  /** The hunt record the Lock Screen's buttons move, or `null` when there is none to read. */
  const storedHunt = () => {
    try {
      return readHunt(shared.get(SHARED_KEYS.hunt));
    } catch {
      return null;
    }
  };

  /** What was asked about one thing under its notification, or on the nightstand. */
  async function aboutOneThing(kind: string, taskId: string, biteId: string | null) {
    if (kind === 'bite') {
      const place = Number(biteId?.split(':').pop());
      if (Number.isInteger(place)) await store.dispatch({ type: 'bite_ticked', taskId, place });
    } else if (kind === 'tomorrow') {
      await store.dispatch({ type: 'hunt_tomorrow', taskId });
    } else if (kind === 'turn_down') {
      await store.dispatch({ type: 'monster_turned_down', taskId });
    }
  }

  const sync = () => {
    queue = queue.then(write).catch(() => undefined);
    return queue;
  };

  return {
    /** Writes the snapshot now if it changed. Resolves when it is written. */
    sync,
    /** Does what an action under a notification asked, about the thing it names. */
    aboutOneThing,
    /** Follows the store until the returned function is called. */
    follow(): () => void {
      void sync();
      return store.subscribe(() => void sync());
    },
    /**
     * Called at launch and each time the app comes to the front: dispatches every pending action
     * once, in the order asked, and returns them. Opening Scootch in the middle of a session with
     * nothing asked for is a pick-up.
     */
    async opened() {
      if (!store.getState().ready) return [];
      // What was shared in from other apps is taken in first, in the order it was shared.
      for (const thing of sharedIn.take()) {
        await store.dispatch({ type: 'thing_shared_in', text: thing.text, when: thing.when });
      }
      // A monster's link the App Clip kept is opened once, as the link itself would be.
      const kept = takeClipLink(shared);
      if (kept !== null) deps.openRoute?.(kept);
      const actions = pending.take();
      for (const action of actions) {
        if (isDayAction(action.kind)) {
          await store.dispatch({ type: 'surface_action', action: action.kind });
        } else if (action.kind === 'leave_table') {
          deps.table?.leave();
        } else if (action.kind === 'wave') {
          if (action.seatId !== null) deps.table?.wave(action.seatId);
        } else if (action.taskId !== null) {
          await aboutOneThing(action.kind, action.taskId, action.biteId);
        }
      }
      // A hunt begun or moved outside the app is taken up before anything else is noticed.
      const hunt = storedHunt();
      if (hunt !== null) {
        await store.dispatch({ type: 'hunt_adopted', hunt });
        // A record nothing took up, with its clock started and no ending waiting on the Lock
        // Screen, was left behind (the app was killed mid-session, the day turned): it goes, so
        // it cannot be mistaken for a hunt that is on.
        const { session, today } = store.getState();
        const taken =
          session !== null &&
          HOLDS_HUNT.includes(session.phase) &&
          'task' in today &&
          today.task.id === hunt.taskId;
        const waiting = hunt.stoppedAt !== null || deps.now() < hunt.beginsAt;
        if (!taken && !waiting) {
          try {
            shared.remove(SHARED_KEYS.hunt);
          } catch {
            // Cleared the next time the app comes to the front.
          }
        }
      }
      if (actions.length === 0) await store.dispatch({ type: 'opened_mid_session' });
      return actions;
    },
  };
}

export type SurfaceSync = ReturnType<typeof createSurfaceSync>;
