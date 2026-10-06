import { describe, expect, it } from '@jest/globals';

import { DAY_MS, HOUR_MS } from '@scootch/domain';
import { noTaskLine } from '@scootch/voice';

import { fakeDevice } from '../../effects/test/fake-adapters';

import {
  CHARGE_REMINDER_PREFIX,
  plannedChargeReminders,
  syncChargeReminders,
  trialDayOf,
  type ChargeReminderInput,
} from './charge-reminders';
import type { CustomerState } from './purchases-port';
import { CUSTOMERS, FAKE_PRICES } from './test/fake-purchases';

const ZONE = 'Europe/London';
// The store's dates. British summer time: 09:00 local is 08:00 UTC.
const TRIAL_ENDS = Date.parse('2026-10-13T15:30:00.000Z');
const RENEWS = Date.parse('2027-10-13T15:30:00.000Z');
const trial: CustomerState = { ...CUSTOMERS.trial, trialEndsAt: TRIAL_ENDS, renewsAt: TRIAL_ENDS };
const yearly: CustomerState = { ...CUSTOMERS.yearly, renewsAt: RENEWS };

const plan = (customer: CustomerState, changes: Partial<ChargeReminderInput> = {}) =>
  plannedChargeReminders({
    customer,
    timeZone: ZONE,
    language: 'en',
    attitude: 'cheeky',
    prices: FAKE_PRICES,
    ...changes,
  });

describe('charge reminders', () => {
  it('announces a trial the day before its charge, at nine on the wall clock', () => {
    expect(plan(trial)).toEqual([
      {
        id: `${CHARGE_REMINDER_PREFIX}trial_ends-${TRIAL_ENDS}`,
        at: Date.parse('2026-10-12T08:00:00.000Z'),
        text: noTaskLine('en', 'cheeky', 'trialEndsTomorrow'),
      },
    ]);
  });

  it('announces a yearly renewal three days before, with the store day and the store price', () => {
    const [reminder] = plan(yearly);
    expect(reminder?.at).toBe(Date.parse('2027-10-10T08:00:00.000Z'));
    expect(reminder?.text).toContain('Wednesday');
    expect(reminder?.text).toContain(FAKE_PRICES.yearly);
    // With no price known the reminder still goes out, and names none.
    expect(plan(yearly, { prices: {} })[0]?.text).not.toMatch(/¤|\d/);
  });

  it('announces a monthly renewal the day before', () => {
    const monthly: CustomerState = { ...CUSTOMERS.monthly, renewsAt: RENEWS };
    expect(plan(monthly)[0]?.at).toBe(Date.parse('2027-10-12T08:00:00.000Z'));
  });

  it('plans nothing when renewal is off, for a lifetime purchase or on the free app', () => {
    expect(plan({ ...trial, willRenew: false, renewsAt: null, endsAt: TRIAL_ENDS })).toEqual([]);
    expect(plan(CUSTOMERS.yearlyRenewalOff)).toEqual([]);
    expect(plan(CUSTOMERS.lifetime)).toEqual([]);
    expect(plan(CUSTOMERS.free)).toEqual([]);
    expect(plan(CUSTOMERS.expired)).toEqual([]);
  });

  it("is scheduled from the store's dates, whatever the phone's clock says", async () => {
    const planned = plan(trial);
    // Two phones, one with its clock a week slow and one a day fast: the same reminder.
    for (const phoneNow of [TRIAL_ENDS - 14 * DAY_MS, TRIAL_ENDS - 2 * DAY_MS]) {
      const device = fakeDevice();
      await syncChargeReminders(device.notifications, planned, phoneNow);
      expect(device.scheduled()).toEqual(planned);
    }
    // One whose time has gone by is dropped rather than sent late.
    const late = fakeDevice();
    await syncChargeReminders(late.notifications, planned, TRIAL_ENDS - HOUR_MS);
    expect(late.scheduled()).toEqual([]);
  });

  it('is rescheduled when the store moves the date, and removed when renewal goes off', async () => {
    const device = fakeDevice();
    const now = TRIAL_ENDS - 6 * DAY_MS;
    await device.notifications.schedule({ id: 'day-plan-0', at: now + HOUR_MS, text: 'a nudge' });
    await syncChargeReminders(device.notifications, plan(trial), now);

    // The trial converts: the store's next date is the renewal a year on.
    await syncChargeReminders(device.notifications, plan(yearly), now);
    expect(device.scheduled().map((one) => one.id)).toEqual([
      'day-plan-0',
      `${CHARGE_REMINDER_PREFIX}renewal-${RENEWS}`,
    ]);

    await syncChargeReminders(device.notifications, plan(CUSTOMERS.yearlyRenewalOff), now);
    expect(device.scheduled().map((one) => one.id)).toEqual(['day-plan-0']);
  });

  it('knows the day before and the last day of a trial from the store date', () => {
    expect(trialDayOf(trial, '2026-10-11', ZONE)).toBeNull();
    expect(trialDayOf(trial, '2026-10-12', ZONE)).toBe('day_before');
    expect(trialDayOf(trial, '2026-10-13', ZONE)).toBe('last_day');
    expect(trialDayOf({ ...trial, willRenew: false }, '2026-10-12', ZONE)).toBeNull();
    expect(trialDayOf(yearly, '2027-10-12', ZONE)).toBeNull();
  });
});
