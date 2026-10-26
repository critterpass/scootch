import { describe, expect, it } from '@jest/globals';

import { DAY_MS, instantOfLocal } from '@phusclass/domain';
import { linePacks } from '@phusclass/voice/class';

import type { LocalNotification, NotificationScheduler } from '../../effects/adapters';

import { CHARGE_NOTE_PREFIX, plannedChargeNote, syncChargeNote } from './charge-notes';
import { PLAN_PRODUCTS } from './products';
import { FREE_CUSTOMER, type CustomerState, type Offerings } from './purchases-port';
import { receiptSteps, stageOf, yearSaving } from './receipt-model';
import {
  customerFromStore,
  isEnrolled,
  type StoreCustomer,
  type StoreEntitlement,
} from './revenuecat-customer';
import { afterPeriod, chargeDaysFor, noteBeforeCharge, receiptDay } from './tuition-dates';

const SAIGON = 'Asia/Ho_Chi_Minh';
const LONDON = 'Europe/London';
/** Tuesday 27 October 2026, ten in the morning in Saigon. */
const now = instantOfLocal('2026-10-27', '10:00', SAIGON);
const WEEK = { unit: 'WEEK', count: 1 } as const;

const offerings: Offerings = {
  plans: {
    yearly: {
      plan: 'yearly',
      productId: PLAN_PRODUCTS.yearly,
      priceText: '$39.99',
      price: 39.99,
      perMonthText: '$3.33',
      trial: { id: '', period: WEEK },
      winBack: null,
    },
    monthly: {
      plan: 'monthly',
      productId: PLAN_PRODUCTS.monthly,
      priceText: '$6.99',
      price: 6.99,
      perMonthText: null,
      trial: { id: '', period: WEEK },
      winBack: null,
    },
  },
};

describe('the free week on the receipt', () => {
  it('shows today, his note two days before the charge, and the charge a week on', () => {
    expect(chargeDaysFor(now, WEEK, SAIGON)).toEqual({
      today: '2026-10-27',
      note: '2026-11-01',
      charge: '2026-11-03',
      chargeAt: now + 7 * DAY_MS,
    });
  });

  it('takes its length from the real offer, not from a week written into the app', () => {
    expect(chargeDaysFor(now, { unit: 'DAY', count: 3 }, SAIGON)).toMatchObject({
      note: '2026-10-28',
      charge: '2026-10-30',
    });
    expect(chargeDaysFor(now, { unit: 'MONTH', count: 1 }, SAIGON)).toMatchObject({
      note: '2026-11-25',
      charge: '2026-11-27',
    });
  });

  it('counts months by the calendar, and a long month into a short one lands on its last day', () => {
    const jan31 = instantOfLocal('2027-01-31', '09:30', LONDON);
    expect(afterPeriod(jan31, { unit: 'MONTH', count: 1 }, LONDON)).toBe(
      instantOfLocal('2027-02-28', '09:30', LONDON),
    );
    expect(afterPeriod(jan31, { unit: 'YEAR', count: 1 }, LONDON)).toBe(
      instantOfLocal('2028-01-31', '09:30', LONDON),
    );
  });

  it('lists the three days, with the price of the plan picked', () => {
    const steps = (plan: 'yearly' | 'monthly') =>
      receiptSteps({
        stage: 'offer',
        plan,
        offerings,
        customer: FREE_CUSTOMER,
        now,
        timeZone: SAIGON,
      });
    expect(steps('yearly')).toEqual([
      { kind: 'opensFree', day: '2026-10-27' },
      { kind: 'note', day: '2026-11-01' },
      { kind: 'firstCharge', day: '2026-11-03', price: '$39.99' },
    ]);
    expect(steps('monthly').at(-1)).toEqual({
      kind: 'firstCharge',
      day: '2026-11-03',
      price: '$6.99',
    });
  });

  it('starts the win-back month instead of the trial for someone whose tuition lapsed', () => {
    const lapsed: Offerings = {
      plans: {
        ...offerings.plans,
        yearly: {
          ...offerings.plans.yearly!,
          trial: null,
          winBack: { id: 'winback.month', period: { unit: 'MONTH', count: 1 } },
        },
      },
    };
    expect(
      receiptSteps({
        stage: 'offer',
        plan: 'yearly',
        offerings: lapsed,
        customer: { ...FREE_CUSTOMER, lapse: 'expired' },
        now,
        timeZone: SAIGON,
      }),
    ).toEqual([
      { kind: 'opensFree', day: '2026-10-27' },
      { kind: 'note', day: '2026-11-25' },
      { kind: 'firstCharge', day: '2026-11-27', price: '$39.99' },
    ]);
  });

  it('with no free week on offer, is paid today and renews a whole plan on', () => {
    const noTrial: Offerings = {
      plans: { yearly: { ...offerings.plans.yearly!, trial: null } },
    };
    expect(
      receiptSteps({
        stage: 'offer',
        plan: 'yearly',
        offerings: noTrial,
        customer: FREE_CUSTOMER,
        now,
        timeZone: SAIGON,
      }),
    ).toEqual([
      { kind: 'opensPaid', day: '2026-10-27' },
      { kind: 'note', day: '2027-10-25' },
      { kind: 'renews', day: '2027-10-27', price: '$39.99' },
    ]);
  });

  it('writes a receipt day short, with the year only when it is another year', () => {
    expect(receiptDay('2026-11-03', '2026-10-27', 'en')).toBe('3 NOV');
    expect(receiptDay('2027-10-27', '2026-10-27', 'en')).toBe('27 OCT 2027');
  });

  it('prices the school year against twelve months', () => {
    expect(yearSaving(offerings)).toBe(52);
    expect(yearSaving({ plans: { yearly: offerings.plans.yearly! } })).toBeNull();
  });
});

function entitlement(over: Partial<StoreEntitlement>): StoreEntitlement {
  return {
    isActive: true,
    willRenew: true,
    periodType: 'NORMAL',
    store: 'APP_STORE',
    productIdentifier: PLAN_PRODUCTS.yearly,
    expirationDateMillis: now + 300 * DAY_MS,
    ...over,
  };
}

function storeWith(active: StoreEntitlement | null, all = active): StoreCustomer {
  return {
    entitlements: {
      active: active === null ? {} : { tuition: active },
      all: all === null ? {} : { tuition: all },
    },
  };
}

describe('tuition as RevenueCat reports it', () => {
  it('reads a free week, its charge day and its renewal', () => {
    const trial = entitlement({
      periodType: 'TRIAL',
      productIdentifier: PLAN_PRODUCTS.monthly,
      expirationDateMillis: now + 7 * DAY_MS,
    });
    const customer = customerFromStore(storeWith(trial));
    expect(customer).toEqual({
      ...FREE_CUSTOMER,
      activePlan: 'monthly',
      inTrial: true,
      trialEndsAt: now + 7 * DAY_MS,
      renewsAt: now + 7 * DAY_MS,
      willRenew: true,
    });
    expect(isEnrolled(customer)).toBe(true);
    expect(stageOf(customer)).toBe('trial');
  });

  it('reads a paid year that will not renew as ending, with nothing to charge', () => {
    const customer = customerFromStore(storeWith(entitlement({ willRenew: false })));
    expect(customer).toMatchObject({
      activePlan: 'yearly',
      renewsAt: null,
      endsAt: now + 300 * DAY_MS,
    });
    expect(stageOf(customer)).toBe('paid');
  });

  it('reads a promotional grant as the scholarship: enrolled, never charged', () => {
    const customer = customerFromStore(
      storeWith(entitlement({ store: 'PROMOTIONAL', willRenew: false })),
    );
    expect(customer).toEqual({
      ...FREE_CUSTOMER,
      scholarship: true,
      scholarshipEndsAt: now + 300 * DAY_MS,
    });
    expect(isEnrolled(customer)).toBe(true);
    expect(stageOf(customer)).toBe('scholarship');
  });

  it('reads tuition that ran out as lapsed, and a scholarship that ran out as never paid', () => {
    const ran = entitlement({ isActive: false, expirationDateMillis: now - DAY_MS });
    expect(customerFromStore(storeWith(null, ran))).toEqual({ ...FREE_CUSTOMER, lapse: 'expired' });
    expect(customerFromStore(storeWith(null, { ...ran, store: 'PROMOTIONAL' }))).toEqual(
      FREE_CUSTOMER,
    );
    expect(isEnrolled(FREE_CUSTOMER)).toBe(false);
  });

  it('takes no other entitlement for tuition', () => {
    const other: StoreCustomer = {
      entitlements: { active: { studio: entitlement({}) }, all: { studio: entitlement({}) } },
    };
    expect(customerFromStore(other)).toEqual(FREE_CUSTOMER);
  });
});

describe('his note before every charge', () => {
  const trial: CustomerState = {
    ...FREE_CUSTOMER,
    activePlan: 'yearly',
    inTrial: true,
    trialEndsAt: now + 7 * DAY_MS,
    renewsAt: now + 7 * DAY_MS,
    willRenew: true,
  };
  const prices = { yearly: '499.000 ₫', monthly: '79.000 ₫' };

  it('goes out at nine, two days before the trial ends, in his words with the day and price', () => {
    const note = plannedChargeNote({
      customer: trial,
      now,
      timeZone: SAIGON,
      language: 'en',
      prices,
    });
    expect(note?.at).toBe(instantOfLocal('2026-11-01', '09:00', SAIGON));
    expect(note?.id).toBe(`${CHARGE_NOTE_PREFIX}${now + 7 * DAY_MS}`);
    expect(note?.text).toContain('Tuesday 3 November');
    expect(note?.text).toContain('499.000 ₫');
    const written = linePacks.en.tuitionChargeReminder.map((line) =>
      line.replace('{date}', 'Tuesday 3 November').replace('{price}', '499.000 ₫'),
    );
    expect(written).toContain(note?.text);
  });

  it('goes out before every renewal, in Vietnamese too', () => {
    const renewsAt = instantOfLocal('2026-12-27', '10:00', SAIGON);
    const monthly: CustomerState = {
      ...FREE_CUSTOMER,
      activePlan: 'monthly',
      renewsAt,
      willRenew: true,
    };
    const note = plannedChargeNote({
      customer: monthly,
      now,
      timeZone: SAIGON,
      language: 'vi',
      prices,
    });
    expect(note?.at).toBe(instantOfLocal('2026-12-25', '09:00', SAIGON));
    expect(note?.text).toContain('79.000 ₫');
    expect(note?.at).toBe(noteBeforeCharge(renewsAt, SAIGON));
  });

  it('is not planned when nothing will be charged, its time has gone, or the price is unknown', () => {
    const plan = (customer: CustomerState, at = now, known = prices) =>
      plannedChargeNote({ customer, now: at, timeZone: SAIGON, language: 'en', prices: known });
    expect(plan({ ...trial, willRenew: false })).toBeNull();
    expect(
      plan({ ...FREE_CUSTOMER, scholarship: true, scholarshipEndsAt: now + DAY_MS }),
    ).toBeNull();
    expect(plan(FREE_CUSTOMER)).toBeNull();
    expect(plan(trial, now + 6 * DAY_MS)).toBeNull();
    expect(
      plan(trial, now, { monthly: '$6.99', yearly: undefined as unknown as string }),
    ).toBeNull();
  });

  it('replaces an older note with the planned one, and leaves his notes home alone', async () => {
    const scheduled = new Map<string, LocalNotification>([
      ['tuition-charge-1', { id: 'tuition-charge-1', at: 1, text: 'old' }],
      ['note-home-1', { id: 'note-home-1', at: 1, text: 'home' }],
    ]);
    const scheduler: NotificationScheduler = {
      scheduledIds: () => Promise.resolve([...scheduled.keys()]),
      schedule: (one) => Promise.resolve(void scheduled.set(one.id, one)),
      cancel: (id) => Promise.resolve(void scheduled.delete(id)),
    };
    const planned = plannedChargeNote({
      customer: trial,
      now,
      timeZone: SAIGON,
      language: 'en',
      prices,
    });
    await syncChargeNote(scheduler, planned);
    expect([...scheduled.keys()].sort()).toEqual(['note-home-1', planned!.id].sort());
    await syncChargeNote(scheduler, null);
    expect([...scheduled.keys()]).toEqual(['note-home-1']);
  });
});
