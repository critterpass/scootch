import { KEEPSAKES_BOARD, keepState } from '../../features/reveal/registry/keep-state';

/** The week's record with two bars, waiting for the third day. */
export const recordBuilding = keepState({
  id: 'record-building',
  design: { board: KEEPSAKES_BOARD, section: "03 The week's song", screen: 'Building' },
  capture: { screen: 'record', bars: 2 },
});
