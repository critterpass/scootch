import type { BotCommand } from '../command';
import {
  formatUsd,
  priceNote,
  spendBetween,
  totalOf,
  totalsBy,
  unpricedModels,
  type SpendLine,
} from '../spend';
import { dayStart, monthStart } from '../time';

function section(title: string, lines: readonly SpendLine[]): string[] {
  const total = totalOf(lines);
  const heading = `${title}: ${formatUsd(total.usd)} (${total.calls} calls)`;
  if (lines.length === 0) return [heading];
  const list = (key: 'route' | 'model') =>
    totalsBy(lines, key).map((item) => `  ${item.name}: ${formatUsd(item.usd)} (${item.calls})`);
  return [heading, ' By route', ...list('route'), ' By model', ...list('model')];
}

export const costsCommand: BotCommand = {
  name: 'costs',
  usage: '/costs',
  summary: 'model spend today and this month, by route and by model',
  run: async ({ env, now }) => {
    const [today, month] = await Promise.all([
      spendBetween(env.DB, dayStart(now), now),
      spendBetween(env.DB, monthStart(now), now),
    ]);
    const unpriced = unpricedModels(month);
    return [
      `Model spend (${priceNote})`,
      ...section('Today', today),
      ...section('This month', month),
      ...(unpriced.length === 0 ? [] : [`No price for: ${unpriced.join(', ')} (counted as $0)`]),
    ].join('\n');
  },
};
