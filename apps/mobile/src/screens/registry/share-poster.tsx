import {
  KEEPSAKES_BOARD,
  keepState,
  MADE_TO_SHARE,
} from '../../features/reveal/registry/keep-state';

/** The share panel on the month's poster. */
export const sharePoster = keepState({
  id: 'share-poster',
  design: {
    board: KEEPSAKES_BOARD,
    section: MADE_TO_SHARE,
    screen: 'Poster · month, wrapped',
  },
  capture: { screen: 'share', format: 'poster' },
});
