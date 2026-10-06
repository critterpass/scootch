import type { PlusStore } from '../../state/plus-store';

import { unlockedFor } from './entitlement';
import { PLANS, PRESELECTED_PLAN, type PlanId } from './products';
import type { CustomerState, Offerings, PlanOffer, PurchasesPort } from './purchases-port';

export type SheetNotice = 'failed' | 'restore_none' | 'restore_failed';

export interface SheetState {
  /** `loading` while the store's prices are fetched; `unavailable` when nothing can be bought. */
  readonly phase: 'loading' | 'unavailable' | 'ready';
  readonly offerings: Offerings | null;
  readonly plan: PlanId;
  /** A purchase or a restore is with the store. */
  readonly busy: boolean;
  /** One plain line under the action. A purchase the person cancelled leaves none. */
  readonly notice: SheetNotice | null;
  /** Set once Plus has been bought or restored here: the sheet is over. */
  readonly done: { readonly plan: PlanId | null; readonly customer: CustomerState } | null;
}

export interface SheetController {
  readonly getState: () => SheetState;
  readonly subscribe: (listener: () => void) => () => void;
  /** Fetches the store's plans and prices. */
  readonly open: () => Promise<void>;
  readonly choose: (plan: PlanId) => void;
  readonly buy: () => Promise<void>;
  readonly restore: () => Promise<void>;
}

export function offerOf(state: SheetState): PlanOffer | null {
  return state.offerings?.plans[state.plan] ?? null;
}

/** The sheet's behaviour, with no screen: what it shows and what each tap does at the store. */
export function createSheetController(deps: {
  readonly port: PurchasesPort;
  readonly store: PlusStore;
  /** Shelf items to price along with the plans. */
  readonly itemProductIds?: readonly string[];
}): SheetController {
  const { port, store } = deps;
  const listeners = new Set<() => void>();
  let state: SheetState = {
    phase: port.available ? 'loading' : 'unavailable',
    offerings: null,
    plan: PRESELECTED_PLAN,
    busy: false,
    notice: null,
    done: null,
  };
  const set = (changes: Partial<SheetState>) => {
    state = { ...state, ...changes };
    for (const listener of listeners) listener();
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    open: async () => {
      if (!port.available) return set({ phase: 'unavailable' });
      set({ phase: 'loading', notice: null });
      try {
        const offerings = await port.offerings(deps.itemProductIds ?? []);
        await store.rememberPrices(offerings);
        const plan = offerings.plans[PRESELECTED_PLAN]
          ? PRESELECTED_PLAN
          : (PLANS.find((one) => offerings.plans[one]) ?? PRESELECTED_PLAN);
        set({ phase: 'ready', offerings, plan });
      } catch {
        set({ phase: 'unavailable' });
      }
    },
    choose: (plan) => {
      if (state.busy || !state.offerings?.plans[plan]) return;
      set({ plan, notice: null });
    },
    buy: async () => {
      const offer = offerOf(state);
      if (state.phase !== 'ready' || state.busy || !offer) return;
      set({ busy: true, notice: null });
      let outcome: Awaited<ReturnType<PurchasesPort['purchase']>>;
      try {
        outcome = await port.purchase(offer.productId);
      } catch {
        outcome = { kind: 'failed' };
      }
      if (outcome.kind === 'purchased') {
        await store.accept(outcome.customer);
        return set({ busy: false, done: { plan: offer.plan, customer: outcome.customer } });
      }
      // Closing the store's sheet is a choice, not an error: back to the sheet, and nothing is said.
      set({ busy: false, notice: outcome.kind === 'failed' ? 'failed' : null });
    },
    restore: async () => {
      if (state.busy) return;
      set({ busy: true, notice: null });
      try {
        const customer = await port.restore();
        await store.accept(customer);
        if (unlockedFor(customer).plus) {
          return set({ busy: false, done: { plan: customer.activePlan, customer } });
        }
        set({ busy: false, notice: 'restore_none' });
      } catch {
        set({ busy: false, notice: 'restore_failed' });
      }
    },
  };
}
