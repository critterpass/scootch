import { TABLES_ROOM, togetherState } from '../../features/table/registry/together-state';

/** Alone at a table: the seats are saved, and the invite is offered again. */
export const tableWaitingAlone = togetherState({
  id: 'table-waiting-alone',
  design: { ...TABLES_ROOM, screen: 'Waiting alone' },
  capture: 'waiting-alone',
});
