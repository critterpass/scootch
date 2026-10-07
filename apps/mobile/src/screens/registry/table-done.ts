import { TABLES_AROUND, togetherState } from '../../features/table/registry/together-state';

/** Finished and still seated: how long they sat, the next thing, or leaving quietly. */
export const tableDone = togetherState({
  id: 'table-done',
  design: { ...TABLES_AROUND, screen: 'Done at a table' },
  capture: 'done-at-table',
});
