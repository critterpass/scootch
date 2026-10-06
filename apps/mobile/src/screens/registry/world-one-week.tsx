import { KEEPSAKES_BOARD, keepState } from '../../features/reveal/registry/keep-state';

/** The world after a week. */
export const worldOneWeek = keepState({
  id: 'world-one-week',
  design: { board: KEEPSAKES_BOARD, section: '02 The world', screen: 'One week' },
  capture: { screen: 'world', pieces: 7 },
});
