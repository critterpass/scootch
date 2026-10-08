import {
  KEEPSAKES_BOARD,
  keepState,
  MADE_TO_SHARE,
} from '../../features/reveal/registry/keep-state';

/** The composer on the wanted poster of a monster that is still wild. */
export const shareWanted = keepState({
  id: 'share-wanted',
  design: { board: KEEPSAKES_BOARD, section: MADE_TO_SHARE, screen: 'Monster · wanted · riso' },
  capture: { screen: 'share', format: 'wanted' },
});
