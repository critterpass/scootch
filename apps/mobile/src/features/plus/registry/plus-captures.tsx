import { View } from 'react-native';

import { DAY_MS } from '@scootch/domain';
import { spacing } from '@scootch/tokens';
import { noTaskLine } from '@scootch/voice';

import { useLanguage, useT } from '../../../i18n/i18n-provider';
import { PlusContext, type PlusRuntime } from '../../../state/plus-context';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { OneScreenView } from '../../one-screen/one-screen-view';
import { fixtureMonster, fixtureTask } from '../../reveal/registry/keep-fixtures';
import { ShelfScreen } from '../../shelf/shelf-screen';
import { shelfItem, SHELF_OPENS_ON, type ShelfItem } from '../../shelf/catalogue';
import { cardDataFor } from '../../zoo/zoo-cards';
import { ZooScreen } from '../../zoo/zoo-screen';
import { longDate, shortDay } from '../dates';
import { unlockedFor } from '../entitlement';
import { OfferCard } from '../first-offer';
import { lifetimeCard } from '../lifetime-card';
import { ManageScreen } from '../manage-screen';
import { LifetimeMoment } from '../lifetime-moment';
import { LastDay, RenewalOff, TrialStarted } from '../moments';
import { OneMore } from '../one-more';
import { PlusSheet } from '../plus-sheet';
import { unavailablePurchases, type CustomerState } from '../purchases-port';
import { RecordShelf } from '../record-shelf';
import { sheetLineSlot } from '../sheet-model';
import { CUSTOMERS, FAKE_OFFERINGS, FAKE_PRICES } from '../test/fake-purchases';

import type { PlusCapture } from './plus-state';

/** Actions that do nothing: a capture is looked at, not used. */
const nothing = () => undefined;
const ZONE = 'Europe/London';
/** The morning every capture is taken on, and the store dates that follow from it. */
const NOW = Date.parse('2026-10-06T09:00:00.000Z');
const TRIAL_ENDS = NOW + 7 * DAY_MS;
const SHELF_PRICE = '¤S.ss';

/** A phone whose store last said `customer`, with nothing behind it. */
function runtimeFor(customer: CustomerState, now: number): PlusRuntime {
  const state = { loaded: true, customer, unlocked: unlockedFor(customer), prices: FAKE_PRICES };
  return {
    port: unavailablePurchases,
    store: {
      getState: () => state,
      subscribe: () => nothing,
      load: () => Promise.resolve(),
      refresh: () => Promise.resolve(false),
      accept: () => Promise.resolve(),
      rememberPrices: () => Promise.resolve(),
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
    case 'one-more':
      return (
        <OneScreenView
          mood="asleep"
          attitude="cheeky"
          line={said('doneForToday')}
          offline={false}
          onWorld={nothing}
          shown={{
            kind: 'done',
            under: (
              <OneMore
                plus={capture.plus}
                left={capture.left}
                onLocked={nothing}
                onMore={nothing}
              />
            ),
          }}
        />
      );
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
            shown={{ kind: 'done' }}
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
    case 'trial-started':
      return (
        <TrialStarted
          {...moment}
          said={said('trialStarted')}
          remindOn={shortDay(TRIAL_ENDS - DAY_MS, language, ZONE)}
          chargeOn={shortDay(TRIAL_ENDS, language, ZONE)}
          price={FAKE_PRICES.yearly}
        />
      );
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
    case 'lifetime':
      return (
        <LifetimeMoment
          {...moment}
          said={said('lifetime')}
          language={language}
          card={lifetimeCard(
            {
              name: t('plus.lifetime.cardName'),
              title: t('plus.lifetime.cardTitle'),
              flavour: t('plus.lifetime.flavour'),
            },
            '2026-10-06',
          )}
          landmark
          openWorld={nothing}
        />
      );
    case 'manage': {
      const customer = CUSTOMERS[capture.customer];
      const next = customer.trialEndsAt ?? customer.renewsAt ?? customer.endsAt;
      return (
        <ManageScreen
          model={{
            customer,
            price: customer.activePlan ? FAKE_PRICES[customer.activePlan] : null,
            date: next === null ? null : longDate(next, language, ZONE),
            lastTrialDay: false,
            notice: null,
          }}
          actions={{
            close: nothing,
            seePlus: nothing,
            changePlan: nothing,
            restore: nothing,
            cancel: nothing,
            openShelf: nothing,
          }}
        />
      );
    }
    case 'finishes': {
      const monster = fixtureMonster(1);
      return (
        <ZooScreen
          model={{
            cards: [monster],
            language,
            plus: capture.plus,
            sort: null,
            open: { card: cardDataFor(monster, fixtureTask(1, language)), shareOffered: false },
          }}
          actions={{
            close: nothing,
            openCard: nothing,
            closeCard: nothing,
            nextSort: nothing,
            shareCard: nothing,
            openPlus: nothing,
            setFinish: nothing,
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
    case 'shelf': {
      const focus = shelfItem(SHELF_OPENS_ON) as ShelfItem;
      return (
        <ShelfScreen
          model={{
            kind: 'inks',
            focus,
            wearing: capture.owned ? focus.id : 'standard',
            owned: capture.owned,
            price: SHELF_PRICE,
            busy: false,
            notice: null,
          }}
          actions={{
            close: nothing,
            showKind: nothing,
            focus: nothing,
            buy: nothing,
            wear: nothing,
            takeOff: nothing,
          }}
        />
      );
    }
  }
}
