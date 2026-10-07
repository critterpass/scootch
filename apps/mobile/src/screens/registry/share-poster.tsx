import { keepState, MATERIALS_BOARD } from '../../features/reveal/registry/keep-state';

/** The share panel on the month's poster. */
export const sharePoster = keepState({
  id: 'share-poster',
  design: {
    board: MATERIALS_BOARD,
    section: '04 Made to share',
    screen: 'Poster · month, wrapped',
  },
  capture: { screen: 'share', format: 'poster' },
});
