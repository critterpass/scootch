import { PLUS_BOARD, plusState, WHERE_IT_LIVES } from '../../features/plus/registry/plus-state';

/** The record shelf with three kept records. */
export const plusRecordShelf = plusState({
  id: 'plus-record-shelf',
  design: { board: PLUS_BOARD, section: WHERE_IT_LIVES, screen: 'Locked controls · free and Plus' },
  capture: { screen: 'record-shelf', records: 3 },
});
