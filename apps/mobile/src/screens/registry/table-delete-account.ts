import { TABLES_MANAGING, togetherState } from '../../features/table/registry/together-state';

/** The question before the table account goes: what stays first, then what goes. */
export const tableDeleteAccount = togetherState({
  id: 'table-delete-account',
  design: { ...TABLES_MANAGING, screen: 'Delete table account' },
  capture: 'tables-delete-account',
});
