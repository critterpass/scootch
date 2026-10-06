import { TABLES_ROOM, togetherState } from '../../features/table/registry/together-state';

/** A seat emptied: a plain caption, and the seat is open. */
export const tableSomeoneLeft = togetherState({
  id: 'table-someone-left',
  design: { ...TABLES_ROOM, screen: 'Someone leaves' },
  capture: 'someone-left',
});
