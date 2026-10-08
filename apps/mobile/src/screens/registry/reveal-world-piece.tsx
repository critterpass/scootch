import { SCOOTCH_BOARD, keepState } from '../../features/reveal/registry/keep-state';

/** The piece a finish adds to the world. */
export const revealWorldPiece = keepState({
  id: 'reveal-world-piece',
  design: {
    board: SCOOTCH_BOARD,
    section: '05 The catch and rewards',
    screen: 'New world piece',
  },
  capture: { screen: 'reveal', step: 'piece' },
});
