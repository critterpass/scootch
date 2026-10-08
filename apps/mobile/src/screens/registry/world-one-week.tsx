import { KEEPSAKES_BOARD, keepState, THE_WORLD } from '../../features/reveal/registry/keep-state';

/** The world after a week. */
export const worldOneWeek = keepState({
  id: 'world-one-week',
  design: { board: KEEPSAKES_BOARD, section: THE_WORLD, screen: 'One week' },
  capture: { screen: 'world', pieces: 7 },
});
