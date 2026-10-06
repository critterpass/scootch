import { beforeAll, describe, expect, it } from 'vitest';

import { alert } from '../src/bot/alert';
import { checkSpendCap, dailySpendCapUsd, runDailyJobs } from '../src/bot/daily';

import { addDevice, addUsage, botEnv, telegram } from './bot-support';

// The Cron Trigger's moment: 08:00 on 7 October in Asia/Ho_Chi_Minh. Yesterday there ran from
// 17:00 UTC on the 5th to 17:00 UTC on the 6th.
const morning = new Date('2026-10-07T01:00:00.000Z');
const minute = 60 * 1000;
const hour = 60 * minute;

const later = (ms: number) => new Date(morning.getTime() + ms);

beforeAll(async () => {
  await addDevice('e5'.repeat(32), 'vi', '2026-10-06T03:00:00.000Z');
  await addDevice('f6'.repeat(32), 'en', '2026-10-06T04:00:00.000Z');
  await addDevice('a7'.repeat(32), 'en', '2026-10-06T18:00:00.000Z'); // today, not yesterday
  await addDevice('b8'.repeat(32), 'vi', '2026-10-05T16:00:00.000Z'); // the day before

  const million = 1_000_000;
  await addUsage({
    route: 'task.create',
    model: 'deepseek-v4-pro',
    input: 2 * million,
    output: 2 * million,
    at: '2026-10-06T05:00:00.000Z',
  });
  await addUsage({
    route: 'screen.input',
    model: 'jev-1.13.0',
    input: million,
    output: 0,
    at: '2026-10-06T06:00:00.000Z',
  });
  // Today's first call: small, and not part of yesterday.
  await addUsage({
    route: 'screen.input',
    model: 'jev-1.13.0',
    input: million,
    output: 0,
    at: '2026-10-06T17:30:00.000Z',
  });
});

describe('the morning cron', () => {
  it('sends yesterday’s digest, then one alert when yesterday’s spend went over the cap', async () => {
    const chat = telegram();
    const env = botEnv();

    await runDailyJobs({ env, now: morning, fetch: chat.fetch });

    expect(dailySpendCapUsd).toBe(5);
    expect(chat.texts()).toEqual([
      [
        '[dev] Daily digest for 2026-10-06',
        'New devices: 2 (en 1, vi 1)',
        'Model calls: 2',
        'Model spend: $6.2000 (placeholder prices, to be confirmed)',
        'Errors: not counted. Nothing records them.',
      ].join('\n'),
      [
        "[dev] Alert: Model spend over the day's cap",
        'day: 2026-10-06',
        'spent: $6.2000',
        'cap: $5.0000',
      ].join('\n'),
    ]);

    // A second check the same morning stays quiet.
    expect(await checkSpendCap({ env, now: later(hour), fetch: chat.fetch })).toBe('cooling_down');
    expect(chat.sent).toHaveLength(2);
  });

  it('raises no alert for a day under the cap', async () => {
    const chat = telegram();

    // A day on, "yesterday" is 7 October: one small call.
    const outcome = await checkSpendCap({
      env: botEnv(),
      now: later(24 * hour),
      fetch: chat.fetch,
    });

    expect(outcome).toBe('under_cap');
    expect(chat.sent).toHaveLength(0);
  });
});

describe('an alert', () => {
  it('is sent once per cooldown for its kind, and other kinds are not held back', async () => {
    const chat = telegram();
    const at = (ms: number) => ({ env: botEnv(), now: later(ms), fetch: chat.fetch });

    expect(await alert(at(0), 'error_spike', { errors: 40, minutes: 5 })).toBe('sent');
    expect(await alert(at(minute), 'error_spike', { errors: 55, minutes: 5 })).toBe('cooling_down');
    expect(await alert(at(29 * minute), 'error_spike', { errors: 90, minutes: 5 })).toBe(
      'cooling_down',
    );
    expect(await alert(at(2 * minute), 'model_fallback_streak', { route: 'screen.input' })).toBe(
      'sent',
    );
    expect(await alert(at(31 * minute), 'error_spike', { errors: 12, minutes: 5 })).toBe('sent');

    expect(chat.texts()).toEqual([
      '[dev] Alert: Error spike\nerrors: 40\nminutes: 5',
      '[dev] Alert: Model falling back\nroute: screen.input',
      '[dev] Alert: Error spike\nerrors: 12\nminutes: 5',
    ]);
  });

  it('does not start its cooldown when Telegram refused the message', async () => {
    const refusing = telegram({ status: 500 });
    const chat = telegram();
    const env = botEnv();
    const facts = { commit: 'abc1234' };

    expect(await alert({ env, now: morning, fetch: refusing.fetch }, 'deploy_failed', facts)).toBe(
      'not_sent',
    );
    expect(await alert({ env, now: later(1000), fetch: chat.fetch }, 'deploy_failed', facts)).toBe(
      'sent',
    );
  });
});
