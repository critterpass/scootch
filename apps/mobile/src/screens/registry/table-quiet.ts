import { TABLES_AROUND, togetherState } from '../../features/table/registry/together-state';

/** No friend is at a table: said plainly, with a table to open and the way on alone. */
export const tableQuiet = togetherState({
  id: 'table-quiet',
  design: { ...TABLES_AROUND, screen: 'Tables are quiet' },
  capture: 'lobby-quiet',
});
