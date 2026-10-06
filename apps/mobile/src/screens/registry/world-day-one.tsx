import { KEEPSAKES_BOARD, keepState } from '../../features/reveal/registry/keep-state';

/** The world with its first piece. */
export const worldDayOne = keepState({
  id: 'world-day-one',
  design: { board: KEEPSAKES_BOARD, section: '02 The world', screen: 'Day one' },
  capture: { screen: 'world', pieces: 1 },
});
