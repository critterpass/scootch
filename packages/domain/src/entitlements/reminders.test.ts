import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { daysBetween, instantFromIso, isoFromInstant, localDateTime } from '../day';

import {
  MONTHLY_REMINDER_DAYS_BEFORE,
  TRIAL_REMINDER_DAYS_BEFORE,
  YEARLY_REMINDER_DAYS_BEFORE,
  chargeReminders,
  type StoreSubscription,
} from './reminders';

const at = (iso: string) => instantFromIso(iso);

function trial(endsAt: string): StoreSubscription {
  return { plan: 'yearly', trialEndsAt: at(endsAt), renewsAt: at(endsAt), willRenew: true };
}
function renewal(plan: 'monthly' | 'yearly', renewsAt: string): StoreSubscription {
  return { plan, trialEndsAt: null, renewsAt: at(renewsAt), willRenew: true };
}

describe('reminders before a charge', () => {
  it.each<[string, StoreSubscription, string, 'trial_ends' | 'renewal', string]>([
    [
      "the design's trial: ends Tuesday 13 October, reminded Monday at nine",
      trial('2026-10-13T09:41:00+01:00'),
      'Europe/London',
      'trial_ends',
      '2026-10-12T08:00:00.000Z',
    ],
    [
      "the design's year: renews 13 October 2027, reminded three days before",
      renewal('yearly', '2027-10-13T09:41:00+01:00'),
      'Europe/London',
      'renewal',
      '2027-10-10T08:00:00.000Z',
    ],
    [
      'a monthly charge is announced the day before',
      renewal('monthly', '2026-11-13T09:41:00Z'),
      'Europe/London',
      'renewal',
      '2026-11-12T09:00:00.000Z',
    ],
    // Across a month end, a leap day and a year end.
    [
      'trial ends 1 March: reminded 28 February',
      trial('2026-03-01T10:00:00Z'),
      'Europe/London',
      'trial_ends',
      '2026-02-28T09:00:00.000Z',
    ],
    [
      'trial ends 1 March in a leap year: reminded 29 February',
      trial('2028-03-01T10:00:00Z'),
      'Europe/London',
      'trial_ends',
      '2028-02-29T09:00:00.000Z',
    ],
    [
      'year renews 2 January: reminded 30 December',
      renewal('yearly', '2027-01-02T10:00:00Z'),
      'Europe/London',
      'renewal',
      '2026-12-30T09:00:00.000Z',
    ],
    // New York springs forward on 8 March 2026; nine in the morning is 14:00 UTC before, 13:00 after.
    [
      'trial ends the day after the clocks go forward',
      trial('2026-03-09T12:00:00-04:00'),
      'America/New_York',
      'trial_ends',
      '2026-03-08T13:00:00.000Z',
    ],
    [
      'year renews just after the clocks go forward',
      renewal('yearly', '2026-03-10T12:00:00-04:00'),
      'America/New_York',
      'renewal',
      '2026-03-07T14:00:00.000Z',
    ],
    // London falls back on 25 October 2026.
    [
      'trial ends the day after the clocks go back',
      trial('2026-10-26T10:00:00Z'),
      'Europe/London',
      'trial_ends',
      '2026-10-25T09:00:00.000Z',
    ],
    [
      'year renews just after the clocks go back',
      renewal('yearly', '2026-10-27T10:00:00Z'),
      'Europe/London',
      'renewal',
      '2026-10-24T08:00:00.000Z',
    ],
    // The store's instant is the 13th in UTC and already the 14th in Ho Chi Minh City.
    [
      'the day is counted on the wall clock the user reads',
      trial('2026-10-13T23:30:00Z'),
      'Asia/Ho_Chi_Minh',
      'trial_ends',
      '2026-10-13T02:00:00.000Z',
    ],
  ])('%s', (_name, subscription, timeZone, kind, remindAt) => {
    const reminders = chargeReminders(subscription, timeZone);
    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.kind).toBe(kind);
    expect(isoFromInstant(reminders[0]?.remindAt ?? 0)).toBe(remindAt);
    expect(reminders[0]?.chargeAt).toBe(subscription.trialEndsAt ?? subscription.renewsAt);
  });

  it('announces nothing when nothing will be charged', () => {
    const off = { ...renewal('yearly', '2027-10-13T09:41:00Z'), willRenew: false };
    expect(chargeReminders(off, 'Europe/London')).toEqual([]);
    expect(
      chargeReminders({ ...trial('2026-10-13T09:41:00Z'), willRenew: false }, 'Europe/London'),
    ).toEqual([]);
    expect(
      chargeReminders(
        { plan: 'monthly', trialEndsAt: null, renewsAt: null, willRenew: true },
        'Europe/London',
      ),
    ).toEqual([]);
  });
});

const zone = fc.constantFrom(
  'Asia/Ho_Chi_Minh',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'Pacific/Auckland',
  'Asia/Kathmandu',
);
const storeDate = fc.integer({ min: at('2026-01-01T00:00:00Z'), max: at('2030-12-31T00:00:00Z') });
const anySubscription: fc.Arbitrary<StoreSubscription> = fc.record({
  plan: fc.constantFrom('monthly' as const, 'yearly' as const),
  trialEndsAt: fc.option(storeDate, { nil: null }),
  renewsAt: fc.option(storeDate, { nil: null }),
  willRenew: fc.boolean(),
});

describe('reminder properties', { timeout: 60_000 }, () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("depend only on the store's dates: any phone clock gives the same instants", () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    fc.assert(
      fc.property(
        anySubscription,
        zone,
        fc.integer({ min: 0, max: at('2100-01-01T00:00:00Z') }),
        fc.integer({ min: 0, max: at('2100-01-01T00:00:00Z') }),
        (subscription, timeZone, onePhoneClock, anotherPhoneClock) => {
          vi.setSystemTime(onePhoneClock);
          const one = chargeReminders(subscription, timeZone);
          vi.setSystemTime(anotherPhoneClock);
          expect(chargeReminders(subscription, timeZone)).toStrictEqual(one);
        },
      ),
    );
  });

  it('always come before the charge, the right number of calendar days ahead, at nine', () => {
    fc.assert(
      fc.property(anySubscription, zone, (subscription, timeZone) => {
        for (const reminder of chargeReminders(subscription, timeZone)) {
          expect(reminder.remindAt).toBeLessThan(reminder.chargeAt);
          const remind = localDateTime(reminder.remindAt, timeZone);
          const charge = localDateTime(reminder.chargeAt, timeZone);
          const lead =
            reminder.kind === 'trial_ends'
              ? TRIAL_REMINDER_DAYS_BEFORE
              : subscription.plan === 'yearly'
                ? YEARLY_REMINDER_DAYS_BEFORE
                : MONTHLY_REMINDER_DAYS_BEFORE;
          expect(daysBetween(remind.date, charge.date)).toBe(lead);
          expect([remind.hour, remind.minute]).toEqual([9, 0]);
        }
      }),
    );
  });

  it('are at most one, and none once renewal is off', () => {
    fc.assert(
      fc.property(anySubscription, zone, (subscription, timeZone) => {
        const reminders = chargeReminders(subscription, timeZone);
        expect(reminders.length).toBeLessThanOrEqual(1);
        if (!subscription.willRenew) expect(reminders).toEqual([]);
      }),
    );
  });
});
