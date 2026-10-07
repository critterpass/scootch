import { KEEPSAKES_BOARD, keepState } from '../../features/reveal/registry/keep-state';

/** The world after three months, with as many things in it as the board draws. */
export const worldThreeMonths = keepState({
  id: 'world-three-months',
  design: { board: KEEPSAKES_BOARD, section: '02 The world', screen: 'Three months' },
  capture: { screen: 'world', pieces: 71 },
});
