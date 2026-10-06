import { SCOOTCH_BOARD, keepState } from '../../features/reveal/registry/keep-state';

/** A surprise drop, with its two answers. */
export const revealSurpriseDrop = keepState({
  id: 'reveal-surprise-drop',
  design: {
    board: SCOOTCH_BOARD,
    section: '05 Hold to finish and rewards',
    screen: 'Surprise drop',
  },
  capture: { screen: 'reveal', step: 'drop' },
});
