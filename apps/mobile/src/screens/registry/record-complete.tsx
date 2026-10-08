import { KEEPSAKES_BOARD, keepState, THE_SONG } from '../../features/reveal/registry/keep-state';

/** The week's record with all seven bars. */
export const recordComplete = keepState({
  id: 'record-complete',
  design: { board: KEEPSAKES_BOARD, section: THE_SONG, screen: 'Complete · live' },
  capture: { screen: 'record', bars: 7 },
});
