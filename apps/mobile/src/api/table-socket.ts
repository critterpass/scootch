import {
  TABLE_CLOSE_CODES,
  TABLE_PING,
  TABLE_PONG,
  tableServerMessageSchema,
  type SessionMinutes,
  type TableServerMessage,
  type WorkMode,
} from '@scootch/domain';

import type { Timers } from '../effects/adapters';

/**
 * Everything a phone can say to its table: a length, an account id, a work mode id and a switch.
 * No member has a field for words, so task text cannot be put on the socket.
 */
export type TableSend =
  | { readonly type: 'start'; readonly minutes: SessionMinutes }
  | { readonly type: 'nudge'; readonly to: string }
  | { readonly type: 'mode'; readonly workMode: WorkMode | null; readonly hidden: boolean }
  | { readonly type: 'leave' };

/** The seat as a connection announces it: a work mode id (or none) and the hide switch. */
export interface SeatMode {
  readonly workMode: WorkMode | null;
  readonly hidden: boolean;
}

/** The part of a WebSocket the manager uses. The app passes the platform's; tests pass a fake. */
export interface SocketLike {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code?: number }) => void) | null;
  onerror: (() => void) | null;
  send(data: string): void;
  close(code?: number): void;
}

export type SocketFactory = (url: string, headers: Readonly<Record<string, string>>) => SocketLike;

/**
 * - `reconnecting`: the line dropped; the seat is held and the manager is trying again.
 * - `replaced`: the same person sat down on another device. Final.
 * - `removed`: no seat here any more (the table closed, or the seat was taken away). Final.
 * - `left`: the person left. Final.
 */
export type ConnectionStatus =
  'connecting' | 'online' | 'reconnecting' | 'replaced' | 'removed' | 'left';

export interface TableConnectionOptions {
  readonly baseUrl: string;
  readonly tableId: string;
  /** The device's bearer token, as the HTTP client stored it. */
  readonly token: () => Promise<string | null>;
  readonly open: SocketFactory;
  readonly timers: Timers;
  readonly seat: () => SeatMode;
  readonly onMessage: (message: TableServerMessage) => void;
  readonly onStatus: (status: ConnectionStatus) => void;
}

export interface TableConnection {
  start(): void;
  /** False when the message could not be put on an open socket. */
  send(message: TableSend): boolean;
  /** Gives the seat up at once and ends the connection for good. */
  leave(): void;
  /** The app is in front again: a dropped line is tried at once instead of after its wait. */
  wake(): void;
  /** Ends the connection without giving the seat up (the screen went away). */
  stop(): void;
}

const FIRST_RETRY_MS = 1_000;
const LONGEST_RETRY_MS = 30_000;
const PING_EVERY_MS = 20_000;
const PONG_WITHIN_MS = 10_000;

/** The table's WebSocket address. The query carries a work mode id and the hide switch only. */
export function tableSocketUrl(baseUrl: string, tableId: string, seat: SeatMode): string {
  const query = [
    ...(seat.workMode === null ? [] : [`mode=${seat.workMode}`]),
    ...(seat.hidden ? ['hidden=1'] : []),
  ].join('&');
  const address = `${baseUrl.replace(/^http/, 'ws')}/v1/tables/${tableId}/ws`;
  return query === '' ? address : `${address}?${query}`;
}

/**
 * One WebSocket to one table. A dropped line is tried again with a growing wait, and the server
 * gives the same seat back because a seat belongs to a person. `replaced`, a removed seat and
 * leaving are final: nothing is tried again after them.
 */
export function createTableConnection(options: TableConnectionOptions): TableConnection {
  let socket: SocketLike | null = null;
  let status: ConnectionStatus = 'connecting';
  let attempt = 0;
  let generation = 0;
  let cancelRetry: (() => void) | null = null;
  let cancelPing: (() => void) | null = null;
  let cancelPong: (() => void) | null = null;

  const final = () => status === 'replaced' || status === 'removed' || status === 'left';
  const setStatus = (next: ConnectionStatus) => {
    if (status === next) return;
    status = next;
    options.onStatus(next);
  };
  const clearTimers = () => {
    cancelRetry?.();
    cancelPing?.();
    cancelPong?.();
    cancelRetry = cancelPing = cancelPong = null;
  };
  const drop = () => {
    const old = socket;
    socket = null;
    if (!old) return;
    old.onopen = old.onmessage = old.onclose = old.onerror = null;
    try {
      old.close();
    } catch {
      // Already closed.
    }
  };
  const finish = (how: 'replaced' | 'removed' | 'left') => {
    setStatus(how);
    clearTimers();
    drop();
  };

  const retry = () => {
    if (final()) return;
    clearTimers();
    drop();
    setStatus('reconnecting');
    const wait = Math.min(LONGEST_RETRY_MS, FIRST_RETRY_MS * 2 ** attempt);
    attempt += 1;
    cancelRetry = options.timers.set(wait, connect);
  };

  const ping = () => {
    cancelPing = options.timers.set(PING_EVERY_MS, () => {
      try {
        socket?.send(TABLE_PING);
      } catch {
        return retry();
      }
      // A line that has gone quiet without closing is treated as dropped.
      cancelPong = options.timers.set(PONG_WITHIN_MS, retry);
    });
  };

  function connect(): void {
    if (final()) return;
    const mine = (generation += 1);
    void options
      .token()
      .catch(() => null)
      .then((token) => {
        if (mine !== generation || final()) return;
        if (token === null) return retry();
        const url = tableSocketUrl(options.baseUrl, options.tableId, options.seat());
        const opened = options.open(url, { Authorization: `Bearer ${token}` });
        socket = opened;
        opened.onopen = () => {
          attempt = 0;
          setStatus('online');
          ping();
        };
        opened.onmessage = (event) => {
          if (event.data === TABLE_PONG) {
            cancelPong?.();
            cancelPong = null;
            return ping();
          }
          if (typeof event.data !== 'string') return;
          let json: unknown;
          try {
            json = JSON.parse(event.data);
          } catch {
            return;
          }
          const parsed = tableServerMessageSchema.safeParse(json);
          if (!parsed.success) return;
          const message = parsed.data;
          // Final at once: the close that follows may never arrive.
          if (message.type === 'replaced') finish('replaced');
          const gone =
            message.type === 'error' &&
            (message.code === 'not_seated' || message.code === 'seat_removed');
          if (gone) finish('removed');
          options.onMessage(message);
        };
        opened.onclose = (event) => {
          if (event.code === TABLE_CLOSE_CODES.replaced) return finish('replaced');
          if (event.code === TABLE_CLOSE_CODES.notSeated) return finish('removed');
          retry();
        };
        opened.onerror = () => retry();
      });
  }

  return {
    start: connect,
    send(message) {
      if (status !== 'online' || !socket) return false;
      try {
        socket.send(JSON.stringify(message));
        return true;
      } catch {
        return false;
      }
    },
    leave() {
      if (final()) return;
      try {
        if (status === 'online')
          socket?.send(JSON.stringify({ type: 'leave' } satisfies TableSend));
      } catch {
        // The seat is freed by the server's own clock instead.
      }
      finish('left');
    },
    wake() {
      if (final() || status === 'online') return;
      attempt = 0;
      clearTimers();
      drop();
      connect();
    },
    stop() {
      generation += 1;
      clearTimers();
      drop();
    },
  };
}
