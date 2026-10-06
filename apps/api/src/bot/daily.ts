import { alert, type AlertOutcome } from './alert';
import { newDevicesBetween } from './devices';
import { formatUsd, priceNote, spendBetween, totalOf } from './spend';
import { sendMessage, type BotContext } from './telegram';
import { dayLabel, dayStart } from './time';

/**
 * The most the models may cost in one of the founder's days, in US dollars, before the bot raises
 * an alert. It is measured with the placeholder prices in `spend.ts`.
 */
export const dailySpendCapUsd = 5;

/** Yesterday in numbers: new devices, model calls and what they cost. */
export async function digestText({ env, now }: Pick<BotContext, 'env' | 'now'>): Promise<string> {
  const from = dayStart(now, 1);
  const to = dayStart(now);
  const [devices, spend] = await Promise.all([
    newDevicesBetween(env.DB, from, to),
    spendBetween(env.DB, from, to),
  ]);
  const total = totalOf(spend);
  return [
    `Daily digest for ${dayLabel(from)}`,
    `New devices: ${devices.text}`,
    `Model calls: ${total.calls}`,
    `Model spend: ${formatUsd(total.usd)} (${priceNote})`,
    'Errors: not counted. Nothing records them.',
  ].join('\n');
}

/** Raises the spend alert when yesterday's model spend went over the cap. */
export async function checkSpendCap(context: BotContext): Promise<AlertOutcome | 'under_cap'> {
  const from = dayStart(context.now, 1);
  const spent = totalOf(await spendBetween(context.env.DB, from, dayStart(context.now))).usd;
  if (spent <= dailySpendCapUsd) return 'under_cap';
  return alert(context, 'spend_over_cap', {
    day: dayLabel(from),
    spent: formatUsd(spent),
    cap: formatUsd(dailySpendCapUsd),
  });
}

/** What the morning Cron Trigger runs: the digest, then the spend check. */
export async function runDailyJobs(context: BotContext): Promise<void> {
  await sendMessage(context, await digestText(context));
  await checkSpendCap(context);
}
