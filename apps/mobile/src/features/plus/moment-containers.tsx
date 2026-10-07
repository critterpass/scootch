import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { localDateTime } from '@scootch/domain';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useKeepsakes } from '../../state/keepsakes';
import { useLighthouse } from '../world/use-lighthouse';
import { plusLine } from '../../state/lines';
import type { NoTaskSlot } from '@scootch/voice';
import { usePlusRuntime, usePlusState } from '../../state/plus-context';

import { throughAppleSheet } from './apple-sheet';
import { longDate } from './dates';
import { useKeptWeeks } from './kept-records';
import { LastDay, RenewalOff } from './moments';
import { nextPlanDate, planLine } from './plan-line';
import { RecordShelf } from './record-shelf';
import { PLUS_RENEWAL_OFF, STUDIO_ROUTE } from './routes';
import { Welcome } from './welcome';
import { goHome } from '../navigation/go-home';

function useMoment() {
  const router = useRouter();
  const { language } = useLanguage();
  const day = useToday();
  const { settings } = day;
  const runtime = usePlusRuntime();
  const plus = usePlusState();
  return {
    router,
    language,
    runtime,
    plus,
    attitude: settings.attitude,
    /** The moment's spoken line; none on a day with something heavy in it. */
    said: (slot: NoTaskSlot) => plusLine(slot, { language, attitude: settings.attitude }, day),
    timeZone: runtime.timeZone(),
    close: () => goHome(router),
  };
}

/**
 * The welcome after a purchase. The dates are the store's own, said once; on a phone that holds
 * no plan (the route opened by hand) there is nothing to welcome, and it goes home.
 */
export function WelcomeContainer() {
  const moment = useMoment();
  const t = useT();
  const { customer } = moment.plus;
  // The lighthouse lands in the world as the moment is shown, for someone who owns lifetime.
  const lighthouse = useLighthouse();
  const plan = customer.activePlan;
  const { router } = moment;
  useEffect(() => {
    if (plan === null) goHome(router);
  }, [plan, router]);
  if (plan === null) return null;
  const next = nextPlanDate(customer);
  const date = next === null ? null : longDate(next, moment.language, moment.timeZone);
  return (
    <Welcome
      attitude={moment.attitude}
      said={moment.said(plan === 'lifetime' ? 'lifetime' : 'plusWelcome')}
      print={[t(`plus.plan.${plan}`), planLine(customer, date, t)]
        .filter((part) => part !== '')
        .join(' · ')}
      number={moment.plus.member.number}
      year={localDateTime(moment.runtime.now(), moment.timeZone).date.slice(0, 4)}
      landmark={lighthouse.owned}
      pickFinish={() => router.push(STUDIO_ROUTE)}
      done={moment.close}
    />
  );
}

/** The trial's last day. Changing plan and stopping are Apple's sheet; keeping changes nothing. */
export function LastDayContainer() {
  const moment = useMoment();
  const { port, store } = moment.runtime;
  const throughApple = () =>
    void throughAppleSheet(port, store).then((result) =>
      result === 'renewal_off' ? moment.router.replace(PLUS_RENEWAL_OFF) : moment.close(),
    );
  return (
    <LastDay
      attitude={moment.attitude}
      said={moment.said('trialLastDay')}
      yearlyPrice={moment.plus.prices.yearly ?? null}
      monthlyPrice={moment.plus.prices.monthly ?? null}
      keepYearly={moment.close}
      switchToMonthly={throughApple}
      stop={throughApple}
      close={moment.close}
    />
  );
}

/** "Renewal off, confirmed", and the gracious word after a cancel: both read from the store. */
export function RenewalOffContainer() {
  const moment = useMoment();
  const { after } = useLocalSearchParams<{ after?: string }>();
  const cancelled = after === 'cancel';
  const { endsAt } = moment.plus.customer;
  const { port, store } = moment.runtime;
  return (
    <RenewalOff
      after={cancelled ? 'cancelled' : 'renewal_off'}
      attitude={moment.attitude}
      said={moment.said(cancelled ? 'plusCancelled' : 'renewalOff')}
      until={endsAt === null ? null : longDate(endsAt, moment.language, moment.timeZone)}
      manage={() => void throughAppleSheet(port, store).then(moment.close)}
      close={moment.close}
    />
  );
}

/** The record shelf on the real phone: the kept weeks, named from the phone's own tables. */
export function RecordShelfContainer() {
  const router = useRouter();
  const t = useT();
  const { weeks } = useKeptWeeks();
  const { keepsakes } = useKeepsakes();
  const records = [...weeks].reverse().map((week) => ({
    week,
    name:
      keepsakes?.weekRecords.find((record) => record.week === week)?.name ??
      t('record.week', { number: Number(week.slice(-2)) }),
    bars: keepsakes?.bars.filter((bar) => bar.week === week).length ?? 0,
  }));
  return <RecordShelf records={records} close={() => router.dismissTo('/record')} />;
}
