import { KEEPSAKES_BOARD, keepState, THE_SONG } from '../../features/reveal/registry/keep-state';

/** The week's record with two bars, waiting for the third day. */
export const recordBuilding = keepState({
  id: 'record-building',
  design: { board: KEEPSAKES_BOARD, section: THE_SONG, screen: 'Building' },
  capture: { screen: 'record', bars: 2 },
});
