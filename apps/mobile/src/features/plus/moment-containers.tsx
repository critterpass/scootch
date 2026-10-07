import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { chargeReminders, localDateTime, type IsoDate } from '@scootch/domain';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useKeepsakes } from '../../state/keepsakes';
import { useLighthouse } from '../world/use-lighthouse';
import { plusLine } from '../../state/lines';
import type { NoTaskSlot } from '@scootch/voice';
import { usePlusRuntime, usePlusState } from '../../state/plus-context';

import { throughAppleSheet } from './apple-sheet';
import { longDate, shortDay } from './dates';
import { subscriptionOf } from './entitlement';
import { useKeptWeeks } from './kept-records';
import { lifetimeCard } from './lifetime-card';
import { LifetimeMoment } from './lifetime-moment';
import { LastDay, RenewalOff, TrialStarted } from './moments';
import { RecordShelf } from './record-shelf';
import { PLUS_RENEWAL_OFF } from './routes';

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
    close: () => router.replace('/'),
  };
}

/** The trial-started confirmation, with both dates read from the store's own. */
export function TrialStartedContainer() {
  const moment = useMoment();
  const { customer, prices } = moment.plus;
  const subscription = subscriptionOf(customer);
  const reminder = subscription ? chargeReminders(subscription, moment.timeZone)[0] : undefined;
  const day = (instant: number | undefined) =>
    instant === undefined ? '' : shortDay(instant, moment.language, moment.timeZone);
  return (
    <TrialStarted
      attitude={moment.attitude}
      said={moment.said('trialStarted')}
      remindOn={day(reminder?.remindAt)}
      chargeOn={day(reminder?.chargeAt ?? customer.trialEndsAt ?? undefined)}
      price={prices.yearly ?? null}
      close={moment.close}
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

/** The lifetime moment. The card is minted once, on the day it is first shown. */
export function LifetimeContainer() {
  const moment = useMoment();
  const t = useT();
  const { memory } = moment.runtime;
  // The lighthouse lands in the world as the moment is shown, for someone who owns lifetime.
  const lighthouse = useLighthouse();
  const [mintedOn, setMintedOn] = useState<IsoDate | null>(null);
  useEffect(() => {
    let current = true;
    void memory
      .read('lifetimeMarkedOn')
      .then(async (stored) => {
        const today = localDateTime(moment.runtime.now(), moment.timeZone).date;
        const day = typeof stored === 'string' ? stored : today;
        if (typeof stored !== 'string') await memory.write('lifetimeMarkedOn', day);
        if (current) setMintedOn(day);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [memory, moment.runtime, moment.timeZone]);
  if (mintedOn === null) return null;
  return (
    <LifetimeMoment
      attitude={moment.attitude}
      said={moment.said('lifetime')}
      language={moment.language}
      card={lifetimeCard(
        {
          name: t('plus.lifetime.cardName'),
          title: t('plus.lifetime.cardTitle'),
          flavour: t('plus.lifetime.flavour'),
        },
        mintedOn,
      )}
      landmark={lighthouse.owned}
      openWorld={() => moment.router.replace('/world')}
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
