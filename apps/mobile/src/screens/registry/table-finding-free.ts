import { TABLES_ROOM, togetherState } from '../../features/table/registry/together-state';

/** "Sit with someone" on the free app: "Open a table" is the quiet locked control; joining by link is free. */
export const tableFindingFree = togetherState({
  id: 'table-finding-free',
  design: { ...TABLES_ROOM, screen: 'Finding a table' },
  capture: 'lobby-free',
});
