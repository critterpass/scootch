import { createApp } from './app';
import { runDailyJobs } from './bot/daily';
import type { Bindings } from './env';
import * as routes from './routes/index.generated';

// The Durable Object class `wrangler.jsonc` binds as TABLE.
export { TableObject } from './tables/table-object';

const app = createApp(Object.values(routes));

export default {
  fetch: app.fetch,
  // The one Cron Trigger in `wrangler.jsonc`: the operations bot's morning digest and spend check.
  scheduled: (controller, env, ctx) => {
    ctx.waitUntil(runDailyJobs({ env, now: new Date(controller.scheduledTime) }));
  },
} satisfies ExportedHandler<Bindings>;
