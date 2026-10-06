import { TABLES_ROOM, togetherState } from '../../features/table/registry/together-state';

/** Four critters, each with a name and one or two words. */
export const tableFull = togetherState({
  id: 'table-full',
  design: { ...TABLES_ROOM, screen: 'Full table' },
  capture: 'full-table',
});
