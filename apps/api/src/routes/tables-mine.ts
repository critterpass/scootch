import { requireAccount } from '../accounts/accounts';
import { myTableResponseSchema, type MyTableResponse } from '../contracts';
import type { RouteDefinition } from '../route';
import { capacityOf } from '../tables/table-state';
import { tablesOf } from '../tables/table-rows';
import { tableStub } from '../tables/tables';

/**
 * Where the caller holds a seat, with the table's clock, so an app that was closed can go back
 * to its table and its session. `table` is null with no seat anywhere.
 */
export const tablesMineRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/tables/mine',
  access: 'device',
  handle: async (c) => {
    const account = await requireAccount(c);
    let found: MyTableResponse['table'] = null;
    for (const tableId of await tablesOf(c.env.DB, account.id)) {
      const table = await tableStub(c.env, tableId).stored();
      if (!table?.seats.some((seat) => seat.accountId === account.id)) continue;
      found = {
        tableId,
        capacity: capacityOf(table),
        endsAt: table.endsAt,
        minutes: table.minutes,
        serverNow: Date.now(),
      };
    }
    return c.json(myTableResponseSchema.parse({ table: found }));
  },
};
