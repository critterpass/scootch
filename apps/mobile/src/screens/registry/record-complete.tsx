import { KEEPSAKES_BOARD, keepState } from '../../features/reveal/registry/keep-state';

/** The week's record with all seven bars. */
export const recordComplete = keepState({
  id: 'record-complete',
  design: { board: KEEPSAKES_BOARD, section: "03 The week's song", screen: 'Complete · live' },
  capture: { screen: 'record', bars: 7 },
});
