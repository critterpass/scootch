import { TABLES_MANAGING, togetherState } from '../../features/table/registry/together-state';

/** The friends page: who is at a table now, remove, block, the haunt switch and a friend link. */
export const friendsList = togetherState({
  id: 'friends-list',
  design: { ...TABLES_MANAGING, screen: 'Friends' },
  capture: 'friends',
});
