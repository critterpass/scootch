import { DAY_MS } from '@phusclass/domain';
import { StyleSheet, View } from 'react-native';

import { useLanguage } from '../../i18n/i18n-provider';
import { FIXTURE_NAME, FIXTURE_NOW } from '../desk/class-fixtures';
import { DeskFixture } from '../desk/desk-fixture';
import { lineFor } from '../desk/his-line';

import { PLAN_PRODUCTS } from './products';
import { FREE_CUSTOMER, type CustomerState, type Offerings } from './purchases-port';
import type { ReceiptStage } from './receipt-model';
import { ReceiptView } from './receipt-view';
import { ScholarshipView } from './scholarship-view';
import { TuitionNoticeView } from './tuition-notice';

/**
 * Tuition for the registry's captures: the store's answer as it would come in each language (the
 * prices are the store's text, written here as App Store Connect sets them), on the fixed Monday
 * of the classroom fixtures. Nothing here is used by the app.
 */
export const FIXTURE_ZONE = 'Asia/Ho_Chi_Minh';

const WEEK = { unit: 'WEEK', count: 1 } as const;

function offeringsIn(language: 'en' | 'vi', winBack = false): Offerings {
  const vnd = language === 'vi';
  return {
    plans: {
      yearly: {
        plan: 'yearly',
        productId: PLAN_PRODUCTS.yearly,
        priceText: vnd ? '499.000 ₫' : '$39.99',
        price: vnd ? 499_000 : 39.99,
        perMonthText: vnd ? '41.583 ₫' : '$3.33',
        trial: winBack ? null : { id: '', period: WEEK },
        winBack: winBack
          ? { id: 'phusclass.winback.month', period: { unit: 'MONTH', count: 1 } }
          : null,
      },
      monthly: {
        plan: 'monthly',
        productId: PLAN_PRODUCTS.monthly,
        priceText: vnd ? '79.000 ₫' : '$6.99',
        price: vnd ? 79_000 : 6.99,
        perMonthText: null,
        trial: winBack ? null : { id: '', period: WEEK },
        winBack: null,
      },
    },
  };
}

const CUSTOMERS: Readonly<Record<ReceiptStage, CustomerState>> = {
  offer: FREE_CUSTOMER,
  pending: FREE_CUSTOMER,
  failed: FREE_CUSTOMER,
  trial: {
    ...FREE_CUSTOMER,
    activePlan: 'yearly',
    inTrial: true,
    trialEndsAt: FIXTURE_NOW + 7 * DAY_MS,
    renewsAt: FIXTURE_NOW + 7 * DAY_MS,
    willRenew: true,
  },
  paid: {
    ...FREE_CUSTOMER,
    activePlan: 'yearly',
    renewsAt: FIXTURE_NOW + 365 * DAY_MS,
    willRenew: true,
  },
  scholarship: {
    ...FREE_CUSTOMER,
    scholarship: true,
    scholarshipEndsAt: FIXTURE_NOW + 365 * DAY_MS,
  },
};

const noop = () => undefined;

/** The receipt at one stage. `winBack` is someone whose tuition lapsed, offered the free month. */
export function ReceiptFixture({
  stage,
  plan = 'yearly',
  winBack = false,
}: {
  readonly stage: ReceiptStage;
  readonly plan?: 'yearly' | 'monthly';
  readonly winBack?: boolean;
}) {
  const { language } = useLanguage();
  const offerings = offeringsIn(language, winBack);
  return (
    <ReceiptView
      stage={stage}
      plan={plan}
      offerings={offerings}
      customer={winBack ? { ...FREE_CUSTOMER, lapse: 'expired' } : CUSTOMERS[stage]}
      now={FIXTURE_NOW}
      timeZone={FIXTURE_ZONE}
      name={FIXTURE_NAME}
      available
      busy={false}
      line={winBack ? (lineFor(language, 'winBack', 'fixture')?.text ?? null) : null}
      onPick={noop}
      onPrimary={noop}
      onClose={noop}
      onRestore={noop}
      onManage={noop}
      onScholarship={noop}
      onLink={noop}
    />
  );
}

/** The receipt on a phone with no store: the plans cannot be listed and nothing can be bought. */
export function ReceiptUnavailableFixture() {
  return (
    <ReceiptView
      stage="offer"
      plan="yearly"
      offerings={null}
      customer={FREE_CUSTOMER}
      now={FIXTURE_NOW}
      timeZone={FIXTURE_ZONE}
      name={FIXTURE_NAME}
      available={false}
      busy={false}
      line={null}
      onPick={noop}
      onPrimary={noop}
      onClose={noop}
      onRestore={noop}
      onManage={noop}
      onScholarship={noop}
      onLink={noop}
    />
  );
}

/** "Can't pay right now?", asking (with a note typed, for the long-text capture) or granted. */
export function ScholarshipFixture({
  state,
  note,
}: {
  readonly state: 'asking' | 'failed' | 'granted';
  readonly note?: string;
}) {
  const { language } = useLanguage();
  return (
    <ScholarshipView
      state={state}
      name={FIXTURE_NAME}
      now={FIXTURE_NOW}
      timeZone={FIXTURE_ZONE}
      line={
        state === 'granted'
          ? (lineFor(language, 'scholarshipGranted', 'fixture')?.text ?? null)
          : null
      }
      {...(note !== undefined ? { initialNote: note } : {})}
      onAsk={noop}
      onBack={noop}
    />
  );
}

/** Recess with the tuition notice pinned on the chalkboard. */
export function RecessNoticeFixture() {
  return (
    <View style={styles.fill}>
      <DeskFixture which="recess" />
      <TuitionNoticeView />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
