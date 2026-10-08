import { MINUTE_MS, showsOthersHunting, type SettingsRow } from '@scootch/domain';

import type { HuntingApi } from '../api/hunting-api';
import type { Timers } from '../effects/adapters';

import type { DayState } from './day-types';
import { UNDER_WAY } from './session-flow';

/** Under this many the line is absent: a small number reads as loneliness. */
export const HUNTING_FLOOR = 20;
/** How often the count is read while a session runs. */
export const HUNTING_REFRESH_MS = MINUTE_MS;

/**
 * The count as it is written: its first three figures, the rest rounded away. Under a thousand it
 * is the number itself (214), then to the nearest ten (1,238 reads 1,240), then to the nearest
 * hundred (12,384 reads 12,400), and so on.
 */
export function roundedHunting(count: number): number {
  if (count < 1000) return Math.round(count);
  const step = 10 ** (Math.floor(Math.log10(count)) - 2);
  return Math.round(count / step) * step;
}

export interface ShownHuntingInput {
  /** What the server last answered; `null` with no connection or no answer. */
  readonly count: number | null;
  /** A serious task, as its session says. */
  readonly serious: boolean;
  /** A table has its own company. */
  readonly atTable: boolean;
  readonly settings: Pick<SettingsRow, 'othersHunting'>;
}

/** The number the session's footer shows, or `null` for no line at all. Never a small number. */
export function shownHunting(input: ShownHuntingInput): number | null {
  const { count } = input;
  if (count === null || input.serious || input.atTable) return null;
  if (!showsOthersHunting(input.settings) || count < HUNTING_FLOOR) return null;
  return roundedHunting(count);
}

type Day = Pick<DayState, 'session' | 'today' | 'settings'>;

function underWay({ session }: Day): boolean {
  return session !== null && UNDER_WAY.includes(session.phase);
}

function serious({ session }: Day): boolean {
  return session !== null && session.phase !== 'let_go' && session.tone === 'quiet';
}

/** Whether this session may be counted at all: never a serious task, a crisis day, or switched off. */
function counted(day: Day): boolean {
  return !serious(day) && day.today.kind !== 'crisis' && showsOthersHunting(day.settings);
}

/**
 * The beat a change of the day asks for, given what the server was last told: `true` when a
 * counted session got under way, `false` once it is over by any ending (or stops being counted),
 * `null` when nothing needs saying. A session that is never counted sends no beat at all.
 */
export function beatFor(told: boolean, day: Day): boolean | null {
  const hunting = underWay(day) && counted(day);
  return hunting === told ? null : hunting;
}

export interface HuntingWatchDeps {
  readonly store: { getState(): Day; subscribe(listener: () => void): () => void };
  readonly table: {
    getState(): { readonly tableId: string | null };
    subscribe(listener: () => void): () => void;
  };
  readonly api: HuntingApi;
  readonly timers: Timers;
  /** Told the number to show, or `null` for no line, whenever it changes. */
  readonly show: (count: number | null) => void;
}

/**
 * Keeps the server told that a session is on, and the footer told how many others are in one.
 * It only listens: the session never waits for a beat or a count, a failure of either is
 * swallowed here, and nothing is kept to be sent again. Returns the function that stops it.
 */
export function watchHunting({ store, table, api, timers, show }: HuntingWatchDeps): () => void {
  let told = false;
  let last: number | null = null;
  let shown: number | null = null;
  let turn = 0;
  let cancel: (() => void) | null = null;

  const publish = () => {
    const day = store.getState();
    const next = shownHunting({
      count: underWay(day) && counted(day) ? last : null,
      serious: serious(day),
      atTable: table.getState().tableId !== null,
      settings: day.settings,
    });
    if (next === shown) return;
    shown = next;
    show(next);
  };
  const stop = () => {
    turn += 1;
    cancel?.();
    cancel = null;
    last = null;
  };
  const read = () => {
    stop();
    const day = store.getState();
    if (!underWay(day)) return publish();
    const mine = turn;
    cancel = timers.set(HUNTING_REFRESH_MS, read);
    // Not asked where the line cannot be shown: the answer would only be thrown away.
    if (!counted(day) || table.getState().tableId !== null) return publish();
    void api
      .count()
      .catch(() => null)
      .then((count) => {
        if (mine !== turn) return;
        last = count;
        publish();
      });
    return undefined;
  };

  const onDay = () => {
    const day = store.getState();
    const beat = beatFor(told, day);
    if (beat !== null) {
      told = beat;
      // Best effort: a beat that fails is forgotten, never queued, and the session goes on.
      const sent = api.beat(beat).catch(() => undefined);
      // The first count is read once the beat has landed, so it has this phone in it.
      if (beat) void sent.then(read);
    }
    if (!underWay(day)) stop();
    publish();
  };
  const offDay = store.subscribe(onDay);
  const offTable = table.subscribe(publish);
  // A session already under way when the watch begins (the app opened into one) is picked up.
  onDay();

  return () => {
    offDay();
    offTable();
    stop();
    publish();
  };
}

/** The number the footer shows now, for whoever draws it. `null` until a watch says otherwise. */
function createShownStore() {
  let value: number | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: number | null) {
      if (next === value) return;
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
export const othersHuntingShown = createShownStore();
