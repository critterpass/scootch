import type { Unlocked } from '@scootch/domain';

import type { PlusMemory } from '../data/plus-memory';
import { unlockedFor } from '../features/plus/entitlement';
import { PLANS, type PlanId } from '../features/plus/products';
import {
  FREE_CUSTOMER,
  type CustomerState,
  type Offerings,
  type PurchasesPort,
} from '../features/plus/purchases-port';

export type PlanPrices = Readonly<Partial<Record<PlanId, string>>>;

export interface PlusState {
  /** False until the last known state has been read from the phone. */
  readonly loaded: boolean;
  /** The last thing the store said about this customer. */
  readonly customer: CustomerState;
  /** What that unlocks, through the domain's one function. */
  readonly unlocked: Unlocked;
  /** The store's own price text for each plan, as last seen. Never a number of the app's. */
  readonly prices: PlanPrices;
}

export interface PlusStore {
  readonly getState: () => PlusState;
  readonly subscribe: (listener: () => void) => () => void;
  /** Reads the last known state from the phone. The app calls it once, before the first refresh. */
  readonly load: () => Promise<void>;
  /**
   * Asks the store. An answer replaces the last known state; a failure of any kind leaves it as
   * it was, so a lost connection never takes Plus away. Resolves to whether the store answered.
   */
  readonly refresh: () => Promise<boolean>;
  /** Takes a state the store has just reported, as after a purchase or a restore. */
  readonly accept: (customer: CustomerState) => Promise<void>;
  readonly rememberPrices: (offerings: Offerings) => Promise<void>;
}

const isInstant = (value: unknown): value is number | null =>
  value === null || (typeof value === 'number' && Number.isFinite(value));

/** A stored customer, checked field by field. Anything unreadable counts as nothing stored. */
export function customerFromStored(value: unknown): CustomerState | null {
  if (typeof value !== 'object' || value === null) return null;
  const stored = value as Record<string, unknown>;
  const { activePlan, lapse, ownedItems, trialEndsAt, renewsAt, endsAt } = stored;
  if (activePlan !== null && !PLANS.includes(activePlan as PlanId)) return null;
  if (lapse !== null && lapse !== 'expired' && lapse !== 'refunded') return null;
  if (!isInstant(trialEndsAt) || !isInstant(renewsAt) || !isInstant(endsAt)) return null;
  if (typeof stored['inTrial'] !== 'boolean' || typeof stored['willRenew'] !== 'boolean') {
    return null;
  }
  if (!Array.isArray(ownedItems) || ownedItems.some((item) => typeof item !== 'string')) {
    return null;
  }
  return {
    activePlan: activePlan as PlanId | null,
    inTrial: stored['inTrial'],
    trialEndsAt,
    renewsAt,
    endsAt,
    willRenew: stored['willRenew'],
    lapse,
    ownedItems: ownedItems as string[],
  };
}

function pricesFromStored(value: unknown): PlanPrices {
  if (typeof value !== 'object' || value === null) return {};
  const stored = value as Record<string, unknown>;
  const prices: Partial<Record<PlanId, string>> = {};
  for (const plan of PLANS) {
    const text = stored[plan];
    if (typeof text === 'string' && text !== '') prices[plan] = text;
  }
  return prices;
}

/**
 * The one source of what this phone has bought. It holds the store's last answer, keeps it on the
 * phone so the app is right with no connection, and derives what is unlocked from it.
 */
export function createPlusStore(deps: {
  readonly port: PurchasesPort;
  readonly memory: PlusMemory;
}): PlusStore {
  const { port, memory } = deps;
  const listeners = new Set<() => void>();
  let state: PlusState = {
    loaded: false,
    customer: FREE_CUSTOMER,
    unlocked: unlockedFor(FREE_CUSTOMER),
    prices: {},
  };
  const set = (changes: Partial<PlusState>) => {
    state = { ...state, ...changes };
    for (const listener of listeners) listener();
  };
  const accept = async (customer: CustomerState) => {
    set({ customer, unlocked: unlockedFor(customer) });
    await memory.write('customer', customer).catch(() => undefined);
  };
  port.onCustomerChange((customer) => void accept(customer));

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    load: async () => {
      const customer = customerFromStored(await memory.read('customer').catch(() => null));
      const prices = pricesFromStored(await memory.read('prices').catch(() => null));
      const known = customer ?? state.customer;
      set({ loaded: true, customer: known, unlocked: unlockedFor(known), prices });
    },
    refresh: async () => {
      let answer: CustomerState;
      try {
        answer = await port.customer();
      } catch {
        return false;
      }
      await accept(answer);
      return true;
    },
    accept,
    rememberPrices: async (offerings) => {
      const prices: Partial<Record<PlanId, string>> = { ...state.prices };
      for (const plan of PLANS) {
        const offer = offerings.plans[plan];
        if (offer) prices[plan] = offer.priceText;
      }
      set({ prices });
      await memory.write('prices', prices).catch(() => undefined);
    },
  };
}
