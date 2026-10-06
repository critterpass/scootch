import { SCOOTCH_BOARD, keepState } from '../../features/reveal/registry/keep-state';

/** The bar a finished day adds to the week's song. */
export const revealSongBar = keepState({
  id: 'reveal-song-bar',
  design: {
    board: SCOOTCH_BOARD,
    section: '05 Hold to finish and rewards',
    screen: 'Song bar added',
  },
  capture: { screen: 'reveal', step: 'bar' },
});
