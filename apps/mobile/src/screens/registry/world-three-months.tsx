import { KEEPSAKES_BOARD, keepState } from '../../features/reveal/registry/keep-state';

/** The world at three hundred pieces. */
export const worldThreeMonths = keepState({
  id: 'world-three-months',
  design: { board: KEEPSAKES_BOARD, section: '02 The world', screen: 'Three months' },
  capture: { screen: 'world', pieces: 300 },
});
