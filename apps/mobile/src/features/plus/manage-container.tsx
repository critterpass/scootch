import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { localDateTime } from '@scootch/domain';

import { openRepositories } from '../../data/repositories';
import { useLanguage } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { usePlusRuntime, usePlusState } from '../../state/plus-context';
import { showsSelling } from '../../state/shows-comedy';
import { useTogether } from '../../state/together-context';
import { finishesOwned } from '../studio/rules';

import { throughAppleSheet } from './apple-sheet';
import { trialDayOf } from './charge-reminders';
import { longDate } from './dates';
import { unlockedFor } from './entitlement';
import { ManageScreen, type ManageModel } from './manage-screen';
import { nextPlanDate } from './plan-line';
import { PLUS_CANCELLED, PLUS_LAST_DAY, PLUS_SHEET } from './routes';

/** Your card on the real phone. It is reached from Settings, and from a restore. */
export function ManageContainer() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { language } = useLanguage();
  const day = useToday();
  const runtime = usePlusRuntime();
  const { customer, prices, look, member } = usePlusState();
  const { api } = useTogether();
  const [notice, setNotice] = useState<ManageModel['notice']>(null);
  const [caught, setCaught] = useState(0);
  const [name, setName] = useState<string | null>(null);
  const { port, store } = runtime;
  const timeZone = runtime.timeZone();
  const today = localDateTime(runtime.now(), timeZone).date;
  const next = nextPlanDate(customer);
  const lastTrialDay = trialDayOf(customer, today, timeZone) === 'last_day';

  useEffect(() => {
    let current = true;
    void openRepositories(db)
      .monsters.all()
      .then((monsters) => {
        if (current) setCaught(monsters.filter((monster) => monster.caughtOn !== null).length);
      })
      .catch(() => undefined);
    // The name is the account's, when the phone is signed in for tables; otherwise there is none.
    void api
      .me()
      .then((account) => {
        if (current) setName(account?.displayName ?? null);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [db, api]);

  const month = (instant: number) =>
    new Intl.DateTimeFormat(language, { month: 'short', timeZone }).format(instant);
  const year = (instant: number) =>
    new Intl.DateTimeFormat(language, { year: 'numeric', timeZone }).format(instant);
  return (
    <ManageScreen
      model={{
        customer,
        price: customer.activePlan ? (prices[customer.activePlan] ?? null) : null,
        date: next === null ? null : longDate(next, language, timeZone),
        lastTrialDay,
        notice,
        look,
        member,
        since:
          member.since === null ? null : { month: month(member.since), year: year(member.since) },
        thisYear: today.slice(0, 4),
        name,
        caught,
        finishesOwned: finishesOwned(customer.ownedItems),
        // Nothing sells near something heavy: on such a day the way to the sheet rests.
        selling: showsSelling(day),
      }}
      actions={{
        close: () => (router.canGoBack() ? router.back() : router.replace('/')),
        seePlus: () => router.push(PLUS_SHEET),
        manage: () => {
          if (lastTrialDay) return router.push(PLUS_LAST_DAY);
          void throughAppleSheet(port, store).then((result) => {
            if (result === 'unavailable') setNotice('unavailable');
            if (result === 'renewal_off') router.push(PLUS_CANCELLED);
          });
        },
        restore: () => {
          setNotice(null);
          void port
            .restore()
            .then(async (restored) => {
              await store.accept(restored);
              setNotice(unlockedFor(restored).plus ? 'restore_done' : 'restore_none');
            })
            .catch(() => setNotice(port.available ? 'restore_failed' : 'unavailable'));
        },
      }}
    />
  );
}
