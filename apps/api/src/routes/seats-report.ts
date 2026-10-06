import { z } from 'zod';

import { requireAccount } from '../accounts/accounts';
import { accountIdPattern, tableIdPattern } from '../accounts/ids';
import { readBody, type RouteDefinition } from '../route';
import { reportReasons, reportSeat } from '../tables/seat-controls';

/** A reason from the fixed list and two ids. A report carries no words of the reporter's. */
const reportRequestSchema = z.strictObject({
  tableId: z.string().regex(tableIdPattern),
  accountId: z.string().regex(accountIdPattern),
  reason: z.enum(reportReasons),
  alsoLeave: z.boolean().default(false),
});

/**
 * Reports a person at the caller's table to the founder. The answer is the same whatever
 * happens next, and the reported person is never told there was a report or who made it.
 */
export const seatsReportRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/seats/report',
  access: 'device',
  handle: async (c) => {
    const report = await readBody(c, reportRequestSchema);
    await reportSeat({ env: c.env, now: new Date() }, await requireAccount(c), report);
    return c.json({ reported: true });
  },
};
