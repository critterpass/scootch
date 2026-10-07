import { TABLES_ROOM, togetherState } from '../../features/table/registry/together-state';

/** "Sit with someone": a friend's table to sit down at, a table for two to open, four seats as the quiet locked control. */
export const tableFindingFree = togetherState({
  id: 'table-finding-free',
  design: { ...TABLES_ROOM, screen: 'Finding a table' },
  capture: 'lobby-free',
});
