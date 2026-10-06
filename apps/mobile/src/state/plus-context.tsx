import { createContext, useContext, useSyncExternalStore } from 'react';

import type { SettingsRow } from '@scootch/domain';

import type { PlusMemory } from '../data/plus-memory';
import { unlockedFor } from '../features/plus/entitlement';
import type { OfferFacts } from '../features/plus/offer-rules';
import {
  FREE_CUSTOMER,
  unavailablePurchases,
  type PurchasesPort,
} from '../features/plus/purchases-port';

import type { PlusState, PlusStore } from './plus-store';

/** Everything a Plus screen needs: the store's port, what the phone knows, and its memory. */
export interface PlusRuntime {
  readonly port: PurchasesPort;
  readonly store: PlusStore;
  readonly memory: PlusMemory;
  /** The zone the person reads a clock in. */
  readonly timeZone: () => string;
  readonly now: () => number;
  /** What the first offer needs to know when the world opens; `null` where nothing is known. */
  readonly offerFacts: () => Promise<(OfferFacts & Pick<SettingsRow, 'attitude'>) | null>;
}

const FREE_STATE: PlusState = {
  loaded: true,
  customer: FREE_CUSTOMER,
  unlocked: unlockedFor(FREE_CUSTOMER),
  prices: {},
};

/** Outside the app's provider (a registry capture, a test) every phone is the free one. */
const NO_RUNTIME: PlusRuntime = {
  port: unavailablePurchases,
  store: {
    getState: () => FREE_STATE,
    subscribe: () => () => undefined,
    load: () => Promise.resolve(),
    refresh: () => Promise.resolve(false),
    accept: () => Promise.resolve(),
    rememberPrices: () => Promise.resolve(),
  },
  memory: { read: () => Promise.resolve(null), write: () => Promise.resolve() },
  timeZone: () => 'UTC',
  now: () => Date.now(),
  offerFacts: () => Promise.resolve(null),
};

export const PlusContext = createContext<PlusRuntime>(NO_RUNTIME);

export function usePlusRuntime(): PlusRuntime {
  return useContext(PlusContext);
}

/** What this phone has bought and what that unlocks, kept up to date. */
export function usePlusState(): PlusState {
  const { store } = useContext(PlusContext);
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
