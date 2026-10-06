import { drawerItemRowSchema, type DrawerItemRow } from '@scootch/domain';

import { createTable, type SqlDatabase, type Table } from '../table';

/** Parked things. */
export function drawerItemsRepository(db: SqlDatabase): Table<DrawerItemRow> {
  return createTable(db, {
    name: 'drawer_items',
    schema: drawerItemRowSchema,
    key: 'id',
  });
}
