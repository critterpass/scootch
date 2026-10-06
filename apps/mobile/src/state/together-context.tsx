import { createContext, useContext, useSyncExternalStore } from 'react';

import type { PurchaseState } from '@scootch/domain';

import type { HttpClient } from '../api/http-client';
import { createTableConnection, type SocketFactory, type SocketLike } from '../api/table-socket';
import { createTogetherApi, type TogetherApi } from '../api/together-api';
import type { Timers } from '../effects/adapters';
import type { EffectsRunner } from '../effects/effects-runner';
import {
  createTableStore,
  NO_TABLE,
  type TableState,
  type TableStore,
} from '../features/table/table-store';

/** Everything the "together" screens need: the routes they call and the one table connection. */
export interface TogetherRuntime {
  readonly api: TogetherApi;
  readonly table: TableStore;
  /** The purchase state the phone reports when it opens or joins a table. */
  readonly purchaseState: () => PurchaseState;
}

export interface TogetherRuntimeDeps {
  readonly http: HttpClient;
  readonly baseUrl: string;
  readonly token: () => Promise<string | null>;
  readonly open: SocketFactory;
  readonly timers: Timers;
  readonly runner: Pick<EffectsRunner, 'run'>;
  readonly purchase: () => PurchaseState;
  readonly now: () => number;
}

/** The platform's WebSocket, with the device's bearer token as a header. Native builds only. */
export const nativeSocket: SocketFactory = (url, headers) =>
  new (WebSocket as unknown as HeaderSocket)(url, null, { headers: { ...headers } });

// React Native's WebSocket takes request headers as a third argument; the web's type has none.
type HeaderSocket = new (
  url: string,
  protocols: null,
  options: { headers: Record<string, string> },
) => SocketLike;

// A nudge is felt, never spoken: the runner is given nothing to say.
const NOTHING_TO_SAY = { title: '', liveLine: '', lineFor: () => null };

export function createTogetherRuntime(deps: TogetherRuntimeDeps): TogetherRuntime {
  const table = createTableStore({
    connect: (tableId, handlers) =>
      createTableConnection({
        baseUrl: deps.baseUrl,
        tableId,
        token: deps.token,
        open: deps.open,
        timers: deps.timers,
        ...handlers,
      }),
    nudgeHaptic: () => deps.runner.run([{ kind: 'haptic', pattern: 'nudge' }], NOTHING_TO_SAY),
    now: deps.now,
  });
  return { api: createTogetherApi(deps.http), table, purchaseState: deps.purchase };
}

const unavailable = () => Promise.reject(new Error('No connection to the together routes here'));

/** Outside the app's provider (a registry capture, a test) nobody is at a table. */
const NO_RUNTIME: TogetherRuntime = {
  api: new Proxy({} as TogetherApi, { get: () => unavailable }),
  table: {
    getState: () => NO_TABLE,
    subscribe: () => () => undefined,
    sit: () => undefined,
    setMode: () => undefined,
    nudge: () => false,
    start: () => false,
    leave: () => undefined,
    wake: () => undefined,
    dismissNotice: () => undefined,
  },
  purchaseState: () => 'free',
};

export const TogetherContext = createContext<TogetherRuntime>(NO_RUNTIME);

export function useTogether(): TogetherRuntime {
  return useContext(TogetherContext);
}

/** The table the person is at, kept up to date; `tableId` is `null` when they are at none. */
export function useTableState(): TableState {
  const { table } = useContext(TogetherContext);
  return useSyncExternalStore(table.subscribe, table.getState, table.getState);
}
