import type { BotCommand } from '../command';
import { newDevicesBetween } from '../devices';
import { dayStart } from '../time';

export const funnelCommand: BotCommand = {
  name: 'funnel',
  usage: '/funnel',
  summary: 'devices registered today, in the last 7 days and in total, by language',
  run: async ({ env, now }) => {
    // A registration stamped this very millisecond still counts.
    const until = new Date(now.getTime() + 1);
    const [today, week, all] = await Promise.all([
      newDevicesBetween(env.DB, dayStart(now), until),
      newDevicesBetween(env.DB, dayStart(now, 6), until),
      newDevicesBetween(env.DB, null, until),
    ]);
    return [
      'Devices registered',
      `Today: ${today.text}`,
      `Last 7 days: ${week.text}`,
      `Total: ${all.text}`,
      'No data yet for the later steps: first catch, day seven, trial, paid. Nothing records them.',
    ].join('\n');
  },
};
