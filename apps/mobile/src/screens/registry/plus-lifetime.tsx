import {
  LIFETIME_SHELF_MANAGE,
  PLUS_BOARD,
  plusState,
} from '../../features/plus/registry/plus-state';

/** The lifetime moment: the one-of-one card and the lighthouse. */
export const plusLifetime = plusState({
  id: 'plus-lifetime',
  design: {
    board: PLUS_BOARD,
    section: LIFETIME_SHELF_MANAGE,
    screen: 'Lifetime · purchase moment',
  },
  capture: { screen: 'lifetime' },
});
