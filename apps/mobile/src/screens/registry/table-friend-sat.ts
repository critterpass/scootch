import { TABLES_AROUND, togetherState } from '../../features/table/registry/together-state';

/** Someone sat down: said once, by name. */
export const tableFriendSat = togetherState({
  id: 'table-friend-sat',
  design: { ...TABLES_AROUND, screen: 'A friend sits down' },
  capture: 'friend-sat',
});
