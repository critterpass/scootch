import {
  KEEPSAKES_BOARD,
  keepState,
  MADE_TO_SHARE,
} from '../../features/reveal/registry/keep-state';

/** The composer on a postcard of the world. */
export const sharePostcard = keepState({
  id: 'share-postcard',
  design: { board: KEEPSAKES_BOARD, section: MADE_TO_SHARE, screen: 'World · postcard · paper' },
  capture: { screen: 'share', format: 'postcard' },
});
