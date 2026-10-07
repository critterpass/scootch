import {
  TABLE_MAX_NUDGES,
  TABLE_MAX_SEATS,
  type SessionMinutes,
  type TableSeat,
  type TableServerMessage,
} from '@scootch/domain';

import type { ConnectionStatus, SeatMode, TableConnection } from '../../api/table-socket';

/** Something that just happened at the table, shown until it is dismissed. */
export type TableNotice =
  | { readonly kind: 'nudged'; readonly from: string }
  /** A fourth nudge was tapped: it is explained here and never sent. */
  | { readonly kind: 'nudge_limit'; readonly to: string }
  /** Someone took a seat. At a friends' table everyone is a friend, or came by a friend's link. */
  | { readonly kind: 'sat'; readonly userId: string; readonly name: string | null }
  /** A seat emptied; `done` when they had said they were finished. */
  | { readonly kind: 'left'; readonly name: string | null; readonly done: boolean };

export interface TableState {
  readonly tableId: string | null;
  readonly status: ConnectionStatus | 'idle';
  readonly you: string | null;
  readonly seats: readonly TableSeat[];
  /** How many the table seats, fixed when it opened. */
  readonly capacity: number;
  /** When the table's session ends, on the server's clock; `null` with none running. */
  readonly endsAt: number | null;
  readonly minutes: SessionMinutes | null;
  /** The server's clock minus this phone's, so a countdown can be read on the phone's clock. */
  readonly clockAhead: number;
  readonly nudgesLeft: number;
  readonly hidden: boolean;
  /** Nudges are not shown or felt at this table, by the person's own choice here. */
  readonly nudgesMuted: boolean;
  readonly notice: TableNotice | null;
}

export const NO_TABLE: TableState = {
  tableId: null,
  status: 'idle',
  you: null,
  seats: [],
  capacity: TABLE_MAX_SEATS,
  endsAt: null,
  minutes: null,
  clockAhead: 0,
  nudgesLeft: TABLE_MAX_NUDGES,
  hidden: false,
  nudgesMuted: false,
  notice: null,
};

export interface TableStoreDeps {
  readonly connect: (
    tableId: string,
    handlers: {
      seat: () => SeatMode;
      onMessage: (message: TableServerMessage) => void;
      onStatus: (status: ConnectionStatus) => void;
    },
  ) => TableConnection;
  /** One haptic for a received nudge, through the effects runner and the person's switches. */
  readonly nudgeHaptic: () => void;
  readonly now: () => number;
}

export interface TableStore {
  readonly getState: () => TableState;
  readonly subscribe: (listener: () => void) => () => void;
  /** Connects to a table the person has a seat at. `workMode` is an id, or none. */
  readonly sit: (tableId: string, workMode: SeatMode['workMode']) => void;
  /** The task changed, or the label was hidden or shown: the seat says so. */
  readonly setMode: (mode: Partial<SeatMode>) => void;
  /** False when it was refused here (the limit) or could not be sent. */
  readonly nudge: (to: string) => boolean;
  readonly start: (minutes: SessionMinutes) => boolean;
  /** The person's thing is done and they are staying a while. False when it could not be sent. */
  readonly done: () => boolean;
  /** Nudges on or off at this table only; the next table starts with them on. */
  readonly muteNudges: (muted: boolean) => void;
  /** The person's standing choice, for every table: off, no nudge is shown or felt. */
  readonly allowNudges: (allowed: boolean) => void;
  readonly leave: () => void;
  readonly wake: () => void;
  readonly dismissNotice: () => void;
}

/**
 * The table as the screens read it, over one connection. It holds presence and the shared timer
 * only: the person's own session lives in the day store and is never touched from here, so a
 * dropped line cannot stop or change it.
 */
export function createTableStore(deps: TableStoreDeps): TableStore {
  let state = NO_TABLE;
  let connection: TableConnection | null = null;
  let mode: SeatMode = { workMode: null, hidden: false };
  let nudgesAllowed = true;
  const listeners = new Set<() => void>();
  const set = (changes: Partial<TableState>) => {
    state = { ...state, ...changes };
    for (const listener of listeners) listener();
  };

  const onMessage = (message: TableServerMessage) => {
    if (message.type === 'state') {
      const gone = state.seats.find(
        (seat) =>
          seat.userId !== message.you && !message.seats.some((one) => one.userId === seat.userId),
      );
      // The first snapshot is the table as it was found: nobody in it has just arrived.
      const came =
        state.you === null
          ? undefined
          : message.seats.find(
              (seat) =>
                seat.userId !== message.you &&
                !state.seats.some((one) => one.userId === seat.userId),
            );
      const mine = message.seats.find((seat) => seat.userId === message.you);
      const finished =
        gone !== undefined &&
        (gone.done === true ||
          message.left?.some((one) => one.userId === gone.userId && one.done) === true);
      set({
        you: message.you,
        seats: message.seats,
        capacity: message.capacity ?? state.capacity,
        endsAt: message.endsAt,
        minutes: message.minutes,
        clockAhead: message.serverNow - deps.now(),
        nudgesLeft: mine?.nudgesLeft ?? state.nudgesLeft,
        ...(gone
          ? { notice: { kind: 'left', name: gone.name ?? null, done: finished } }
          : came
            ? { notice: { kind: 'sat', userId: came.userId, name: came.name ?? null } }
            : {}),
      });
    } else if (message.type === 'nudged') {
      // Muted, the wave is dropped here: the sender is told nothing either way.
      if (!nudgesAllowed || state.nudgesMuted) return;
      deps.nudgeHaptic();
      set({ notice: { kind: 'nudged', from: message.from } });
    } else if (message.type === 'nudge_sent') {
      set({ nudgesLeft: message.nudgesLeft });
    } else if (message.type === 'session_ended') {
      set({ endsAt: null });
    } else if (message.type === 'error' && message.code === 'nudge_limit') {
      set({ nudgesLeft: 0 });
    }
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    sit(tableId, workMode) {
      if (state.tableId === tableId && connection) return;
      connection?.stop();
      mode = { workMode, hidden: state.hidden };
      state = { ...NO_TABLE, hidden: state.hidden, tableId, status: 'connecting' };
      connection = deps.connect(tableId, {
        seat: () => mode,
        onMessage,
        onStatus: (status) => set({ status }),
      });
      set({});
      connection.start();
    },
    setMode(changes) {
      const next = { ...mode, ...changes };
      if (next.workMode === mode.workMode && next.hidden === mode.hidden) return;
      mode = next;
      set({ hidden: mode.hidden });
      // A dropped line announces the seat again when it reconnects.
      connection?.send({ type: 'mode', workMode: mode.workMode, hidden: mode.hidden });
    },
    nudge(to) {
      if (state.nudgesLeft <= 0) {
        set({ notice: { kind: 'nudge_limit', to } });
        return false;
      }
      if (!connection?.send({ type: 'nudge', to })) return false;
      set({ nudgesLeft: state.nudgesLeft - 1 });
      return true;
    },
    start: (minutes) => connection?.send({ type: 'start', minutes }) ?? false,
    done: () => connection?.send({ type: 'done' }) ?? false,
    muteNudges: (muted) => set({ nudgesMuted: muted }),
    allowNudges(allowed) {
      nudgesAllowed = allowed;
    },
    leave() {
      connection?.leave();
      connection = null;
      set({ ...NO_TABLE, hidden: state.hidden });
    },
    wake: () => connection?.wake(),
    dismissNotice: () => set({ notice: null }),
  };
}
