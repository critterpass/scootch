import { View } from 'react-native';

import { DAY_MS } from '@scootch/domain';
import { spacing } from '@scootch/tokens';
import { noTaskLine } from '@scootch/voice';

import { useLanguage, useT } from '../../../i18n/i18n-provider';
import { PlusContext, type PlusRuntime } from '../../../state/plus-context';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { initialComposer } from '../../composer/composer-machine';
import { OneScreenView } from '../../one-screen/one-screen-view';
import { itemOf } from '../../studio/catalogue';
import { PLAIN_LOOK, withPart } from '../../studio/look';
import { finishesOwned } from '../../studio/rules';
import { StudioScreen } from '../../studio/studio-screen';
import { longDate } from '../dates';
import { unlockedFor } from '../entitlement';
import { OfferCard } from '../first-offer';
import { ManageScreen } from '../manage-screen';
import { NO_MEMBER } from '../member';
import { LastDay, RenewalOff } from '../moments';
import { nextPlanDate, planLine } from '../plan-line';
import { PlusSheet } from '../plus-sheet';
import { unavailablePurchases, type CustomerState } from '../purchases-port';
import { RecordShelf } from '../record-shelf';
import { sheetLineSlot } from '../sheet-model';
import { CUSTOMERS, FAKE_OFFERINGS, FAKE_PRICES } from '../test/fake-purchases';
import { Welcome } from '../welcome';

import type { PlusCapture } from './plus-state';

/** Actions that do nothing: a capture is looked at, not used. */
const nothing = () => undefined;
const ZONE = 'Europe/London';
/** The morning every capture is taken on, and the store dates that follow from it. */
const NOW = Date.parse('2026-10-06T09:00:00.000Z');
const TRIAL_ENDS = NOW + 7 * DAY_MS;
const STUDIO_PRICE = '¤S.ss';
/** The member every capture shows: the number the board prints, joined on the capture's morning. */
const MEMBER = { number: 42, since: NOW } as const;
const YEAR = '2026';

/** A phone whose store last said `customer`, with nothing behind it. */
function runtimeFor(customer: CustomerState, now: number): PlusRuntime {
  const state = {
    loaded: true,
    customer,
    unlocked: unlockedFor(customer),
    prices: FAKE_PRICES,
    look: PLAIN_LOOK,
    member: NO_MEMBER,
  };
  return {
    port: unavailablePurchases,
    store: {
      getState: () => state,
      subscribe: () => nothing,
      load: () => Promise.resolve(),
      refresh: () => Promise.resolve(false),
      accept: () => Promise.resolve(),
      rememberPrices: () => Promise.resolve(),
      wear: () => Promise.resolve(),
      rememberMember: () => Promise.resolve(),
    },
    memory: { read: () => Promise.resolve(null), write: () => Promise.resolve() },
    timeZone: () => ZONE,
    now: () => now,
    offerFacts: () => Promise.resolve(null),
  };
}

export function Captured({ capture }: { readonly capture: PlusCapture }) {
  const { language } = useLanguage();
  const t = useT();
  const { palette } = useScreenStyle();
  const said = (slot: Parameters<typeof noTaskLine>[2], attitude = 'cheeky' as const) =>
    noTaskLine(language, attitude, slot);
  const moment = { attitude: 'cheeky', close: nothing } as const;

  switch (capture.screen) {
    case 'sheet': {
      const { phase } = capture;
      return (
        <PlusSheet
          attitude={capture.attitude}
          said={
            capture.heavyDay
              ? null
              : noTaskLine(
                  language,
                  capture.attitude,
                  sheetLineSlot(capture.oneMore ? 'one_more' : 'asked'),
                )
          }
          year={YEAR}
          state={{
            phase: phase === 'loading' || phase === 'unavailable' ? phase : 'ready',
            offerings: phase === 'loading' || phase === 'unavailable' ? null : FAKE_OFFERINGS,
            plan: capture.plan,
            busy: phase === 'purchasing',
            notice: phase === 'failed' ? 'failed' : null,
            done: null,
          }}
          actions={{
            close: nothing,
            choose: nothing,
            buy: nothing,
            restore: nothing,
            openTerms: nothing,
            openPrivacy: nothing,
          }}
        />
      );
    }
    case 'charge-note':
      // The day before the trial's charge: the plain note under the waiting ask.
      return (
        <PlusContext.Provider value={runtimeFor(CUSTOMERS.trial, TRIAL_ENDS - DAY_MS)}>
          <OneScreenView
            mood="asleep"
            attitude="cheeky"
            line={said('doneForToday')}
            offline={false}
            onWorld={nothing}
            shown={{
              kind: 'composer',
              warmUp: null,
              notificationsOff: false,
              home: { waiting: null, startsNote: null },
              composer: {
                state: initialComposer('ready'),
                level: 0,
                onEvent: nothing,
                thinking: false,
                notUnderstood: false,
                screenReader: false,
                onOpenSettings: nothing,
              },
            }}
          />
        </PlusContext.Provider>
      );
    case 'offer':
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            padding: spacing.lg,
            backgroundColor: palette.page,
          }}
        >
          <OfferCard
            attitude="cheeky"
            said={said('plusOffer')}
            onTell={nothing}
            onDismiss={nothing}
          />
        </View>
      );
    case 'welcome': {
      const customer = CUSTOMERS[capture.customer];
      const next = nextPlanDate(customer);
      const plan = customer.activePlan ?? 'yearly';
      return (
        <Welcome
          attitude="cheeky"
          said={said(plan === 'lifetime' ? 'lifetime' : 'plusWelcome')}
          print={[
            t(`plus.plan.${plan}`),
            planLine(customer, next === null ? null : longDate(next, language, ZONE), t),
          ].join(' · ')}
          number={MEMBER.number}
          year={YEAR}
          landmark={plan === 'lifetime'}
          pickFinish={nothing}
          done={nothing}
        />
      );
    }
    case 'last-day':
      return (
        <LastDay
          {...moment}
          said={said('trialLastDay')}
          yearlyPrice={FAKE_PRICES.yearly}
          monthlyPrice={FAKE_PRICES.monthly}
          keepYearly={nothing}
          switchToMonthly={nothing}
          stop={nothing}
        />
      );
    case 'renewal-off':
      return (
        <RenewalOff
          {...moment}
          after={capture.after}
          said={said(capture.after === 'cancelled' ? 'plusCancelled' : 'renewalOff')}
          until={longDate(NOW + 365 * DAY_MS, language, ZONE)}
          manage={nothing}
        />
      );
    case 'manage': {
      const customer = CUSTOMERS[capture.customer];
      const next = nextPlanDate(customer);
      const member = customer.activePlan === null ? NO_MEMBER : MEMBER;
      return (
        <ManageScreen
          model={{
            customer,
            price: customer.activePlan ? FAKE_PRICES[customer.activePlan] : null,
            date: next === null ? null : longDate(next, language, ZONE),
            lastTrialDay: false,
            notice: null,
            look:
              customer.activePlan === null ? PLAIN_LOOK : withPart(PLAIN_LOOK, 'finish', 'holo'),
            member,
            since:
              member.since === null
                ? null
                : {
                    month: new Intl.DateTimeFormat(language, {
                      month: 'short',
                      timeZone: ZONE,
                    }).format(member.since),
                    year: YEAR,
                  },
            thisYear: YEAR,
            name: null,
            caught: customer.activePlan === null ? 3 : 42,
            finishesOwned: finishesOwned(customer.ownedItems),
            selling: true,
          }}
          actions={{
            close: nothing,
            seePlus: nothing,
            manage: nothing,
            restore: nothing,
            openStudio: nothing,
          }}
        />
      );
    }
    case 'record-shelf':
      return (
        <RecordShelf
          close={nothing}
          records={Array.from({ length: capture.records }, (_, index) => ({
            week: `2026-W${41 - index}`,
            name: t('record.week', { number: 41 - index }),
            bars: 7 - index * 2,
          }))}
        />
      );
    case 'studio': {
      const focus = itemOf(capture.tab, capture.trying);
      return (
        <StudioScreen
          model={{
            tab: capture.tab,
            trying: withPart(PLAIN_LOOK, capture.tab, focus.id),
            focus,
            action: capture.worn ? 'wearing' : 'buy',
            price: capture.worn ? null : STUDIO_PRICE,
            held: capture.worn ? 'owned' : null,
            number: null,
            busy: false,
            notice: null,
          }}
          actions={{
            close: nothing,
            showTab: nothing,
            tryOn: nothing,
            buy: nothing,
            wear: nothing,
            takeOff: nothing,
          }}
        />
      );
    }
  }
}
