import { useRouter } from 'expo-router';
import { useState } from 'react';

import { localDateTime } from '@scootch/domain';

import { useLanguage } from '../../i18n/i18n-provider';
import { usePlusRuntime, usePlusState } from '../../state/plus-context';

import { throughAppleSheet } from './apple-sheet';
import { trialDayOf } from './charge-reminders';
import { longDate } from './dates';
import { unlockedFor } from './entitlement';
import { ManageScreen, type ManageModel } from './manage-screen';
import { PLUS_CANCELLED, PLUS_LAST_DAY, PLUS_SHEET, SHELF_ROUTE } from './routes';

/** The manage page on the real phone. It is reached from Settings, and from a purchase. */
export function ManageContainer() {
  const router = useRouter();
  const { language } = useLanguage();
  const runtime = usePlusRuntime();
  const { customer, prices } = usePlusState();
  const [notice, setNotice] = useState<ManageModel['notice']>(null);
  const { port, store } = runtime;
  const timeZone = runtime.timeZone();
  const next = customer.trialEndsAt ?? customer.renewsAt ?? customer.endsAt;
  const lastTrialDay =
    trialDayOf(customer, localDateTime(runtime.now(), timeZone).date, timeZone) === 'last_day';

  const apple = (onRenewalOff: () => void) =>
    void throughAppleSheet(port, store).then((result) => {
      if (result === 'unavailable') setNotice('unavailable');
      if (result === 'renewal_off') onRenewalOff();
    });
  return (
    <ManageScreen
      model={{
        customer,
        price: customer.activePlan ? (prices[customer.activePlan] ?? null) : null,
        date: next === null ? null : longDate(next, language, timeZone),
        lastTrialDay,
        notice,
      }}
      actions={{
        close: () => (router.canGoBack() ? router.back() : router.replace('/')),
        seePlus: () => router.push(PLUS_SHEET),
        changePlan: () =>
          lastTrialDay ? router.push(PLUS_LAST_DAY) : apple(() => router.push(PLUS_CANCELLED)),
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
        cancel: () => apple(() => router.push(PLUS_CANCELLED)),
        openShelf: () => router.push(SHELF_ROUTE),
      }}
    />
  );
}
