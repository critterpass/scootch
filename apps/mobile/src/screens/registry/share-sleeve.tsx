import {
  KEEPSAKES_BOARD,
  keepState,
  MADE_TO_SHARE,
} from '../../features/reveal/registry/keep-state';

/** The composer on the week's record in its sleeve. */
export const shareSleeve = keepState({
  id: 'share-sleeve',
  design: {
    board: KEEPSAKES_BOARD,
    section: MADE_TO_SHARE,
    screen: 'Song · record sleeve · velvet',
  },
  capture: { screen: 'share', format: 'sleeve' },
});
