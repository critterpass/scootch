import { TABLES_MANAGING, togetherState } from '../../features/table/registry/together-state';

/** Settings, Tables: the account, what a seat shows, friends, and signing out. */
export const tableSettings = togetherState({
  id: 'table-settings',
  design: { ...TABLES_MANAGING, screen: 'Tables' },
  capture: 'tables-settings',
});
