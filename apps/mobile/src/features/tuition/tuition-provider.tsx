import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { appHttp } from '../../api/app-http';
import { readKv, writeKv } from '../../data/kv-repository';
import { nativeNotifications } from '../../effects/native-adapters';
import { useLanguage } from '../../i18n/i18n-provider';
import { useBoardStore } from '../../state/board-provider';
import { setSurfaceTuition } from '../surfaces/surface-inputs';

import { plannedChargeNote, syncChargeNote } from './charge-notes';
import type { PlanId } from './products';
import {
  FREE_CUSTOMER,
  type CustomerState,
  type Offerings,
  type PurchaseOutcome,
  type PurchasesPort,
} from './purchases-port';
import { isEnrolled } from './revenuecat-customer';
import { revenueCatPurchases } from './revenuecat-port';
import { askScholarship } from './scholarship-client';

const PRICES_KEY = 'tuition.prices';

/** Tuition as the screens see it. */
export interface Tuition {
  /** False until the store has answered once (or has been found missing). */
  readonly ready: boolean;
  /** False on a phone where nothing can be bought: no store, or none set up for this build. */
  readonly available: boolean;
  readonly customer: CustomerState;
  readonly enrolled: boolean;
  /** The plans with their prices; `null` until they are loaded, or when they cannot be. */
  readonly offerings: Offerings | null;
  readonly loadOfferings: () => Promise<void>;
  readonly purchase: (plan: PlanId, winBack?: string) => Promise<PurchaseOutcome>;
  readonly restore: () => Promise<CustomerState | null>;
  readonly manage: () => Promise<void>;
  /** Asks the server for the scholarship, then reads tuition again from the store. */
  readonly askScholarship: () => Promise<'granted' | 'failed'>;
}

const TuitionContext = createContext<Tuition | null>(null);

/** Tuition for a screen; the registry hands its states in through `TuitionFixture`. */
export function useTuition(): Tuition {
  const tuition = useContext(TuitionContext);
  if (tuition === null) throw new Error('useTuition needs a TuitionProvider above it');
  return tuition;
}

/** Shows its children with tuition as given: the registry's captures of every receipt stage. */
export function TuitionFixture({
  value,
  children,
}: {
  readonly value: Tuition;
  readonly children: ReactNode;
}) {
  return <TuitionContext.Provider value={value}>{children}</TuitionContext.Provider>;
}

/**
 * Reads tuition from RevenueCat at launch and whenever the store reports a change, tells the
 * board store whether the student is enrolled (which keeps the tuition notice off the board for
 * them), and keeps his note before the next charge scheduled. Nothing here ever shows an offer.
 */
export function TuitionProvider({ children }: { readonly children: ReactNode }) {
  const db = useSQLiteContext();
  const board = useBoardStore();
  const { language } = useLanguage();
  const languageRef = useRef(language);
  languageRef.current = language;

  const port = useMemo<PurchasesPort>(
    () =>
      revenueCatPurchases(process.env['EXPO_PUBLIC_REVENUECAT_IOS_KEY'], {
        db,
        http: appHttp(() => languageRef.current),
      }),
    [db],
  );
  const [customer, setCustomer] = useState<CustomerState>(FREE_CUSTOMER);
  const [ready, setReady] = useState(false);
  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [prices, setPrices] = useState<Partial<Record<PlanId, string>>>({});

  // The last prices seen, so his note can name the amount before the receipt is opened.
  useEffect(() => {
    void readKv(db, PRICES_KEY)
      .then((kept) => {
        if (kept !== null) setPrices(JSON.parse(kept) as Partial<Record<PlanId, string>>);
      })
      .catch(() => undefined);
  }, [db]);

  useEffect(() => {
    if (!port.available) {
      setReady(true);
      return undefined;
    }
    let current = true;
    void port
      .customer()
      .then((found) => {
        if (current) setCustomer(found);
      })
      .catch(() => undefined)
      .finally(() => {
        if (current) setReady(true);
      });
    const stop = port.onCustomerChange(setCustomer);
    return () => {
      current = false;
      stop();
    };
  }, [port]);

  const enrolled = isEnrolled(customer);
  useEffect(() => {
    void board.setEnrolled(enrolled);
    // The tuition widgets open, or keep their quiet lock.
    setSurfaceTuition(enrolled);
  }, [board, enrolled]);

  useEffect(() => {
    if (!ready) return;
    const note = plannedChargeNote({
      customer,
      now: Date.now(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language,
      prices,
    });
    void syncChargeNote(nativeNotifications, note).catch(() => undefined);
  }, [ready, customer, language, prices]);

  const loadOfferings = useCallback(async () => {
    try {
      const found = await port.offerings();
      setOfferings(found);
      const seen: Partial<Record<PlanId, string>> = {};
      for (const offer of Object.values(found.plans)) seen[offer.plan] = offer.priceText;
      setPrices(seen);
      await writeKv(db, PRICES_KEY, JSON.stringify(seen), Date.now());
    } catch {
      setOfferings(null);
    }
  }, [port, db]);

  const value = useMemo<Tuition>(
    () => ({
      ready,
      available: port.available,
      customer,
      enrolled,
      offerings,
      loadOfferings,
      purchase: async (plan, winBack) => {
        const productId = offerings?.plans[plan]?.productId;
        if (productId === undefined) return { kind: 'failed' };
        const outcome = await port
          .purchase(productId, winBack)
          .catch((): PurchaseOutcome => ({ kind: 'failed' }));
        if (outcome.kind === 'purchased') setCustomer(outcome.customer);
        return outcome;
      },
      restore: async () => {
        try {
          const found = await port.restore();
          setCustomer(found);
          return found;
        } catch {
          return null;
        }
      },
      manage: async () => {
        await port.manageSubscriptions().catch(() => undefined);
        const found = await port.customer().catch(() => null);
        if (found !== null) setCustomer(found);
      },
      askScholarship: async () => {
        try {
          // The grant is made to the id the store knows this phone by.
          await port.linked();
          await askScholarship(appHttp(() => languageRef.current));
          setCustomer(await port.customer(true));
          return 'granted';
        } catch {
          return 'failed';
        }
      },
    }),
    [ready, port, customer, enrolled, offerings, loadOfferings],
  );

  return <TuitionContext.Provider value={value}>{children}</TuitionContext.Provider>;
}
