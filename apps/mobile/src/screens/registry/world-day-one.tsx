import { KEEPSAKES_BOARD, keepState, THE_WORLD } from '../../features/reveal/registry/keep-state';

/** The world with its first piece. */
export const worldDayOne = keepState({
  id: 'world-day-one',
  design: { board: KEEPSAKES_BOARD, section: THE_WORLD, screen: 'Day one' },
  capture: { screen: 'world', pieces: 1 },
});
