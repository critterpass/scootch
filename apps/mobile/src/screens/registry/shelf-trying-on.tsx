import {
  LIFETIME_SHELF_MANAGE,
  PLUS_BOARD,
  plusState,
} from '../../features/plus/registry/plus-state';

/** The shelf with one ink in focus, tried on before it is bought. */
export const shelfTryingOn = plusState({
  id: 'shelf-trying-on',
  design: {
    board: PLUS_BOARD,
    section: LIFETIME_SHELF_MANAGE,
    screen: 'The shelf · inks, outfits, worlds',
  },
  capture: { screen: 'shelf', owned: false },
});
